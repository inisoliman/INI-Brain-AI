import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainManager } from '../brain/brainManager';
import { SettingsService } from '../storage/settingsService';
import { CodeChange } from '../types';
import { ContextBuilder } from './contextBuilder';
import { LlmClient } from './llmClient';
import { PlannerAgent, ExecutorAgent, ReviewerAgent, AgentTranscript } from './agents';

export interface AiRunResult {
  request: string;
  contextSummary: { selectedFiles: string[]; totalBytes: number };
  transcript: AgentTranscript;
  finalText: string;
}

export interface AppliedChange {
  path: string;
  action: CodeChange['action'];
  backupPath?: string;
}

export class AiOrchestrator {
  constructor(private readonly root: string, private readonly brain: BrainManager, private readonly settings: SettingsService) {}

  async run(request: string): Promise<AiRunResult> {
    const cfg = vscode.workspace.getConfiguration('projectBrain');
    const brainData = await this.brain.getBrain();
    const built = await new ContextBuilder(this.root).build(brainData, request, cfg.get('maxContextFiles', 12));
    const llm = new LlmClient(await this.settings.get());

    const planner = await new PlannerAgent(llm).run(request, built.context);
    const executor = await new ExecutorAgent(llm).run(request, planner, built.context);
    const reviewer = await new ReviewerAgent(llm).run(request, planner, executor, built.context);

    const finalText = ['# Planner Agent', planner, '', '# Executor Agent', executor, '', '# Reviewer Agent', reviewer].join('\n');
    return { request, contextSummary: { selectedFiles: built.selectedFiles, totalBytes: built.totalBytes }, transcript: { planner, executor, reviewer }, finalText };
  }

  /**
   * Returns the proposed change set without applying anything, so the UI can
   * present a preview/confirmation (H2) before any file is written.
   */
  async planAutoMode(request: string): Promise<{ result: AiRunResult; changes: CodeChange[] }> {
    const result = await this.run(request);
    const changes = this.extractChanges(result.finalText);
    return { result, changes };
  }

  /** Apply an already-reviewed change set and return a human-readable report. */
  async applyAutoModeChanges(result: AiRunResult, changes: CodeChange[]): Promise<string> {
    const applied: AppliedChange[] = [];
    for (const change of changes) {
      applied.push(await this.applyChange(change));
    }
    if (applied.length) {
      await this.pruneBackups();
      await this.brain.scanIncremental();
    }
    return this.formatAutoModeReport(result, applied);
  }

  async autoMode(request: string): Promise<string> {
    const result = await this.run(request);
    const changes = this.extractChanges(result.finalText);
    const applied: AppliedChange[] = [];

    for (const change of changes) {
      applied.push(await this.applyChange(change));
    }

    if (applied.length) {
      await this.pruneBackups();
      await this.brain.scanIncremental();
    }
    return this.formatAutoModeReport(result, applied);
  }

  private formatAutoModeReport(result: AiRunResult, applied: AppliedChange[]): string {


    return [
      result.finalText,
      '',
      '# Auto Mode Applied Changes',
      applied.length ? applied.map(c => `- ${c.action}: ${c.path}${c.backupPath ? ` (backup: ${c.backupPath})` : ''}`).join('\n') : 'No machine-readable changes block found; no files were modified.',
      '',
      '# Context Summary',
      `Selected files: ${result.contextSummary.selectedFiles.length}`,
      `Context size: ${result.contextSummary.totalBytes} bytes`
    ].join('\n');
  }

  private async applyChange(change: CodeChange): Promise<AppliedChange> {
    const target = this.safeResolve(change.path);
    const backupPath = await this.backupIfExists(target, change.path);

    if (change.action === 'delete') {
      await fs.rm(target, { force: true, recursive: false });
      return { path: change.path, action: change.action, backupPath };
    }

    if (typeof change.content !== 'string') throw new Error(`Missing content for ${change.action}: ${change.path}`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, change.content, 'utf8');
    return { path: change.path, action: change.action, backupPath };
  }

  private safeResolve(relativePath: string): string {
    if (!relativePath || path.isAbsolute(relativePath)) throw new Error(`Invalid relative path: ${relativePath}`);
    const target = path.resolve(this.root, relativePath);
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`;
    if (target !== this.root && !target.startsWith(rootWithSep)) throw new Error(`Refusing to write outside workspace: ${relativePath}`);
    if (target.includes(`${path.sep}.git${path.sep}`) || target.includes(`${path.sep}.brain${path.sep}`)) throw new Error(`Refusing to modify protected path: ${relativePath}`);
    return target;
  }

  private async backupIfExists(target: string, relativePath: string): Promise<string | undefined> {
    try {
      const stat = await fs.stat(target);
      if (!stat.isFile()) return undefined;
      const backupRel = path.posix.join('.brain', 'backups', `${Date.now()}-${relativePath.split(/[\\/]/).join('__')}`);
      const backupAbs = path.join(this.root, backupRel);
      await fs.mkdir(path.dirname(backupAbs), { recursive: true });
      await fs.copyFile(target, backupAbs);
      return backupRel;
    } catch {
      return undefined;
    }
  }

  /** M6 fix: keep only the newest N Auto Mode backups in .brain/backups. */
  private async pruneBackups(): Promise<void> {
    const retention = vscode.workspace.getConfiguration('projectBrain').get<number>('backupRetention', 50);
    if (!retention || retention <= 0) return;
    const dir = path.join(this.root, '.brain', 'backups');
    let entries: string[] = [];
    try { entries = await fs.readdir(dir); } catch { return; }
    if (entries.length <= retention) return;
    // Names are prefixed with Date.now(); lexicographic sort ~= chronological.
    const toDelete = entries.sort().slice(0, entries.length - retention);
    await Promise.all(toDelete.map(name => fs.rm(path.join(dir, name), { force: true }).catch(() => undefined)));
  }

  private extractChanges(text: string): CodeChange[] {

    const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)];
    for (const match of blocks) {
      try {
        const parsed = JSON.parse(match[1]) as { changes?: CodeChange[] };
        if (Array.isArray(parsed.changes)) {
          return parsed.changes.filter(change =>
            change &&
            typeof change.path === 'string' &&
            (change.action === 'create' || change.action === 'update' || change.action === 'delete') &&
            (change.action === 'delete' || typeof change.content === 'string')
          );
        }
      } catch {
        // try next block
      }
    }
    return [];
  }
}
