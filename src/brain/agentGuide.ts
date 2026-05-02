import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainData, FileRecord } from '../types';

export interface AgentGuideResult {
  agentsPath: string;
  agentContextPath: string;
  compactContextPath: string;
  decisionsPath: string;
  tasksPath: string;
}

export class AgentGuideGenerator {
  constructor(private readonly root: string) {}

  async generate(data: BrainData): Promise<AgentGuideResult> {
    const brainDir = path.join(this.root, '.brain');
    await fs.mkdir(brainDir, { recursive: true });

    const agentsPath = path.join(this.root, 'AGENTS.md');
    const agentContextPath = path.join(brainDir, 'agent_context.md');
    const compactContextPath = path.join(brainDir, 'compact_context.md');
    const decisionsPath = path.join(brainDir, 'decisions.md');
    const tasksPath = path.join(brainDir, 'tasks.md');

    await Promise.all([
      this.writeAgentsFile(agentsPath, data),
      fs.writeFile(agentContextPath, this.buildAgentContext(data), 'utf8'),
      fs.writeFile(compactContextPath, this.buildCompactContext(data), 'utf8'),
      this.writeIfMissing(decisionsPath, this.initialDecisions(data)),
      this.writeIfMissing(tasksPath, this.initialTasks(data))
    ]);

    return {
      agentsPath: 'AGENTS.md',
      agentContextPath: '.brain/agent_context.md',
      compactContextPath: '.brain/compact_context.md',
      decisionsPath: '.brain/decisions.md',
      tasksPath: '.brain/tasks.md'
    };
  }

  async buildClineClipboardText(data: BrainData): Promise<string> {
    return [
      '# INI Brain AI Context for Cline',
      '',
      'Please use this project memory before making changes.',
      '',
      'Read these files first if available:',
      '- AGENTS.md',
      '- .brain/compact_context.md',
      '- .brain/architecture.md',
      '- .brain/decisions.md',
      '- .brain/tasks.md',
      '',
      'Follow this workflow:',
      '1. Planner: understand the request and identify impacted files.',
      '2. Executor: make minimal, compatible changes following existing patterns.',
      '3. Reviewer: verify correctness, safety, and consistency.',
      '',
      'Hard rules:',
      '- Do not write secrets/API keys to files.',
      '- Do not modify .git or .brain/backups.',
      '- Prefer small diffs and preserve architecture unless explicitly asked.',
      '- Update AGENTS.md or .brain/tasks.md when important project decisions change.',
      '',
      this.buildCompactContext(data)
    ].join('\n');
  }

  private async writeAgentsFile(file: string, data: BrainData): Promise<void> {
    const generated = this.buildAgentsGeneratedSection(data);
    const start = '<!-- INI:BRAIN:START -->';
    const end = '<!-- INI:BRAIN:END -->';
    const block = `${start}\n${generated}\n${end}`;

    let current = '';
    try { current = await fs.readFile(file, 'utf8'); } catch {}

    if (current.includes(start) && current.includes(end)) {
      const next = current.replace(new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`), block);
      await fs.writeFile(file, next, 'utf8');
      return;
    }

    const manualHeader = current.trim()
      ? `${current.trim()}\n\n---\n\n`
      : '# AI Agent Operating Guide\n\nThis file is maintained by INI Brain AI. Add manual project rules above the generated block if needed.\n\n';

    await fs.writeFile(file, `${manualHeader}${block}\n`, 'utf8');
  }

  private buildAgentsGeneratedSection(data: BrainData): string {
    const map = data.projectMap;
    const topFiles = this.topRecords(data, 15);
    return [
      '# INI Brain AI Generated Agent Guide',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Workspace: ${map.root}`,
      `Indexed files: ${map.totalFiles}`,
      '',
      '## Project Summary',
      `Primary languages: ${this.languages(map.languages)}.`,
      `Core files: ${map.coreFiles.slice(0, 20).join(', ') || 'none detected'}.`,
      '',
      '## Architecture Snapshot',
      data.architecture.trim() || 'No architecture snapshot yet. Run Scan Project first.',
      '',
      '## Important Files for Agents',
      topFiles.map(r => `- ${r.path} (${r.language}) exports: ${r.exports.slice(0, 8).join(', ') || 'none'}`).join('\n') || '- None',
      '',
      '## Agent Workflow',
      '### Planner Agent',
      '- Understand the user request and inspect AGENTS.md/.brain context first.',
      '- Identify impacted files and risks before editing.',
      '- Prefer a small plan with explicit success criteria.',
      '',
      '### Executor Agent',
      '- Implement minimal compatible changes following existing code style.',
      '- Keep domain boundaries and existing architecture intact.',
      '- Never write secrets/API keys into repository files.',
      '',
      '### Reviewer Agent',
      '- Check whether the requested behavior is actually satisfied.',
      '- Look for regressions, unsafe writes, missing tests/build failures, and architecture drift.',
      '- Summarize changes and remaining risks.',
      '',
      '## Non-Negotiable Rules',
      '- Do not modify `.git/` or `.brain/backups/`.',
      '- Do not expose API keys, tokens, or credentials.',
      '- Prefer incremental changes over rewrites.',
      '- Update `.brain/tasks.md` for notable pending work.',
      '- Update `.brain/decisions.md` for important architecture decisions.',
      '',
      '## Token-Saving Instructions for AI Agents',
      '- Start by reading this file and `.brain/compact_context.md`.',
      '- Only open full source files that are directly relevant to the request.',
      '- Use `.brain/architecture.md` for project map and hotspots.',
      '- Ask for clarification when requirements are ambiguous.'
    ].join('\n');
  }

  private buildAgentContext(data: BrainData): string {
    return [
      '# Agent Context',
      '',
      'This file is optimized for AI coding agents that need durable project memory.',
      '',
      '## Project Map',
      JSON.stringify(data.projectMap, null, 2),
      '',
      '## Architecture',
      data.architecture,
      '',
      '## AI Context',
      data.aiContext
    ].join('\n');
  }

  private buildCompactContext(data: BrainData): string {
    const map = data.projectMap;
    const records = this.topRecords(data, 25);
    return [
      '# Compact Project Context',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Files: ${map.totalFiles}`,
      `Languages: ${this.languages(map.languages)}`,
      `Core files: ${map.coreFiles.slice(0, 25).join(', ') || 'none'}`,
      '',
      '## Key File Summaries',
      records.map(formatCompactRecord).join('\n\n') || '- None',
      '',
      '## Agent Reminder',
      'Use Planner → Executor → Reviewer. Prefer minimal diffs. Preserve architecture. Never write secrets.'
    ].join('\n');
  }

  private initialDecisions(data: BrainData): string {
    return [
      '# Project Decisions',
      '',
      'Record durable architecture/product decisions here so future AI agents do not need re-explanation.',
      '',
      `- ${new Date().toISOString()}: INI Brain AI initialized project memory for ${data.projectMap.totalFiles} indexed files.`
    ].join('\n');
  }

  private initialTasks(data: BrainData): string {
    return [
      '# Project Tasks and Continuity Log',
      '',
      'Use this file to keep long-running AI work resumable across sessions.',
      '',
      '## Current Status',
      `- Last memory generation: ${new Date().toISOString()}`,
      `- Indexed files: ${data.projectMap.totalFiles}`,
      '',
      '## Pending Tasks',
      '- [ ] Add project-specific tasks here.'
    ].join('\n');
  }

  private async writeIfMissing(file: string, content: string): Promise<void> {
    try { await fs.access(file); } catch { await fs.writeFile(file, content, 'utf8'); }
  }

  private topRecords(data: BrainData, count: number): FileRecord[] {
    const core = new Set(data.projectMap.coreFiles);
    return Object.values(data.fileIndex)
      .sort((a, b) => scoreRecord(b, core) - scoreRecord(a, core))
      .slice(0, count);
  }

  private languages(languages: Record<string, number>): string {
    return Object.entries(languages).map(([k, v]) => `${k} (${v})`).join(', ') || 'none';
  }
}

function scoreRecord(record: FileRecord, core: Set<string>): number {
  let score = 0;
  if (core.has(record.path)) score += 100;
  if (/(^|\/)(package\.json|tsconfig\.json|composer\.json|pyproject\.toml|requirements\.txt)$/i.test(record.path)) score += 50;
  score += Math.min(record.exports.length, 20);
  score += Math.min(record.imports.length, 10);
  score += record.modifiedAt / 1_000_000_000_000;
  return score;
}

function formatCompactRecord(record: FileRecord): string {
  return [
    `### ${record.path}`,
    `Language: ${record.language}`,
    `Exports: ${record.exports.slice(0, 10).join(', ') || 'none'}`,
    `Imports: ${record.imports.slice(0, 10).join(', ') || 'none'}`,
    `Summary: ${(record.summary || '').replace(/\s+/g, ' ').slice(0, 700) || 'none'}`
  ].join('\n');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
