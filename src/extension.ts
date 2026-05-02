import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainManager } from './brain/brainManager';
import { BrainFileWatcher } from './brain/fileWatcher';
import { getWorkspaceRoot } from './scanner/projectScanner';
import { AiOrchestrator } from './ai/orchestrator';
import { SettingsService } from './storage/settingsService';
import { SettingsPanel } from './ui/settingsPanel';
import { SidebarProvider } from './ui/sidebarProvider';
import { AgentGuideGenerator } from './brain/agentGuide';

let output: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  output = vscode.window.createOutputChannel('INI Brain AI');
  context.subscriptions.push(output);

  const sidebar = new SidebarProvider();
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('projectBrain.sidebar', sidebar));

  const settings = new SettingsService(context);
  let root: string | undefined;
  let brain: BrainManager | undefined;
  let orchestrator: AiOrchestrator | undefined;
  let agentGuide: AgentGuideGenerator | undefined;

  try {
    root = getWorkspaceRoot();
    brain = new BrainManager(root);
    orchestrator = new AiOrchestrator(root, brain, settings);
    agentGuide = new AgentGuideGenerator(root);
    const watcher = new BrainFileWatcher(brain, () => sidebar.log('Brain updated incrementally.'), e => logError(sidebar, e));
    watcher.start();
    context.subscriptions.push(watcher);
  } catch (e) {
    sidebar.log(String(e));
  }

  const requireBrain = () => {
    if (!root || !brain || !orchestrator || !agentGuide) throw new Error('افتح مجلد مشروع أولاً.');
    return { root, brain, orchestrator, agentGuide };
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('projectBrain.scanProject', () => runWithStatus(sidebar, 'Scanning', async () => {
      const { brain } = requireBrain();
      const data = await brain.scanIncremental();
      const stats = brain.getScanStats();
      await agentGuide!.generate(data);
      const message = `Scanned ${data.projectMap.totalFiles} files. Discovered: ${stats.discoveredFiles}, skipped large: ${stats.skippedLargeFiles}, unreadable: ${stats.skippedUnreadableFiles}. Agent guide updated.`;
      sidebar.log(message);
      output.appendLine(message);
      vscode.window.showInformationMessage('Project Brain scan completed.');
    })),
    vscode.commands.registerCommand('projectBrain.rebuildBrain', () => runWithStatus(sidebar, 'Scanning', async () => {
      const { brain } = requireBrain();
      const data = await brain.rebuild();
      await agentGuide!.generate(data);
      const stats = brain.getScanStats();
      sidebar.log(`Rebuilt brain: ${data.projectMap.totalFiles} files. Skipped large: ${stats.skippedLargeFiles}. Agent guide updated.`);
    })),
    vscode.commands.registerCommand('projectBrain.askAI', () => runWithStatus(sidebar, 'AI Working', async () => {
      const { orchestrator } = requireBrain();
      const request = await vscode.window.showInputBox({ prompt: 'What do you want to ask INI Brain AI?' });
      if (!request) return;
      sidebar.log('Sending question to AI...');
      output.clear();
      output.appendLine('# INI Brain AI');
      output.appendLine('Thinking... Please wait.');
      output.show(true);
      const answer = await orchestrator.run(request);
      output.clear();
      output.appendLine('# INI Brain AI Answer');
      output.appendLine('');
      output.appendLine(answer.finalText);
      output.appendLine('\n# Context Summary');
      output.appendLine(`Selected files: ${answer.contextSummary.selectedFiles.length}`);
      output.appendLine(`Context size: ${answer.contextSummary.totalBytes} bytes`);
      output.show(true);
      sidebar.log('AI answer generated. Check the Output panel: INI Brain AI.');
      vscode.window.showInformationMessage('INI Brain AI answer is ready in the Output panel.');
    })),
    vscode.commands.registerCommand('projectBrain.autoMode', () => runWithStatus(sidebar, 'AI Working', async () => {
      const { orchestrator } = requireBrain();
      const request = await vscode.window.showInputBox({ prompt: 'Describe the change. Auto Mode may modify files.' });
      if (!request) return;
      const ok = await vscode.window.showWarningMessage('Auto Mode will apply AI-generated file changes. Continue?', { modal: true }, 'Continue');
      if (ok !== 'Continue') return;
      const answer = await orchestrator.autoMode(request);
      output.clear();
      output.appendLine(answer);
      output.show(true);
      sidebar.log('Auto Mode completed.');
    })),
    vscode.commands.registerCommand('projectBrain.generateProject', () => runWithStatus(sidebar, 'AI Working', async () => {
      const ctx = requireBrain();
      await generateProject(ctx.root, ctx.orchestrator, sidebar);
    })),
    vscode.commands.registerCommand('projectBrain.generateAgentGuide', () => runWithStatus(sidebar, 'Scanning', async () => {
      const { brain, agentGuide } = requireBrain();
      const data = await brain.scanIncremental();
      const result = await agentGuide.generate(data);
      sidebar.log(`Agent guide generated: ${result.agentsPath}, ${result.compactContextPath}`);
      vscode.window.showInformationMessage('INI Brain AI agent guide generated: AGENTS.md and .brain context files.');
    })),
    vscode.commands.registerCommand('projectBrain.copyContextForCline', () => runWithStatus(sidebar, 'Ready', async () => {
      const { brain, agentGuide } = requireBrain();
      const data = await brain.getBrain();
      const text = await agentGuide.buildClineClipboardText(data);
      await vscode.env.clipboard.writeText(text);
      sidebar.log('Compact context copied for Cline.');
      vscode.window.showInformationMessage('INI Brain AI context copied. Paste it into Cline before your prompt.');
    })),
    vscode.commands.registerCommand('projectBrain.openSettings', () => SettingsPanel.show(context, settings))
  );

  sidebar.log('INI Brain AI activated.');
  if (root && brain && agentGuide) void maybePromptProjectInitialization(root, brain, agentGuide, sidebar);
}

async function maybePromptProjectInitialization(root: string, brain: BrainManager, agentGuide: AgentGuideGenerator, sidebar: SidebarProvider): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('projectBrain');
  if (!cfg.get('showOnboardingPrompt', true)) return;

  const hasBrain = await fileExists(path.join(root, '.brain', 'metadata.json'));
  const hasAgents = await fileExists(path.join(root, 'AGENTS.md'));
  if (hasBrain && hasAgents) return;

  const choice = await vscode.window.showInformationMessage(
    'INI Brain AI: This workspace is not fully initialized. Scan now and generate an AI agent guide?',
    'Scan + Agent Guide',
    'Later'
  );
  if (choice !== 'Scan + Agent Guide') return;

  try {
    sidebar.setStatus('Scanning');
    const data = await brain.scanIncremental();
    await agentGuide.generate(data);
    sidebar.setStatus('Ready');
    sidebar.log('Workspace initialized with AGENTS.md and .brain agent context.');
    vscode.window.showInformationMessage('INI Brain AI initialized this workspace for AI agents.');
  } catch (e) {
    sidebar.setStatus('Error');
    logError(sidebar, e);
  }
}

async function fileExists(file: string): Promise<boolean> {
  try { await fs.access(file); return true; } catch { return false; }
}

async function generateProject(root: string, orchestrator: AiOrchestrator, sidebar: SidebarProvider): Promise<void> {
  const reqPath = path.join(root, 'project_request.md');
  try {
    await fs.access(reqPath);
  } catch {
    await fs.writeFile(reqPath, '# Project Request\n\nDescribe the project you want INI Brain AI to generate.\n', 'utf8');
    vscode.window.showInformationMessage('Created project_request.md. Fill it, then run Generate Project again.');
    return;
  }
  const request = await fs.readFile(reqPath, 'utf8');
  const answer = await orchestrator.autoMode(`Generate a new project from project_request.md. Return JSON changes block with complete files.\n\n${request}`);
  output.clear();
  output.appendLine(answer);
  output.show(true);
  sidebar.log('Project generation attempted.');
}

async function runWithStatus(sidebar: SidebarProvider, status: 'Ready' | 'Scanning' | 'AI Working', fn: () => Promise<void>): Promise<void> {
  try {
    sidebar.setStatus(status);
    await fn();
    sidebar.setStatus('Ready');
  } catch (e) {
    sidebar.setStatus('Error');
    logError(sidebar, e);
    vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

function logError(sidebar: SidebarProvider, e: unknown): void {
  const msg = e instanceof Error ? (e.stack || e.message) : String(e);
  output?.appendLine(msg);
  sidebar.log(`Error: ${e instanceof Error ? e.message : String(e)}`);
}

export function deactivate(): void {}


