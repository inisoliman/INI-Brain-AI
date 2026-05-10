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
import { MemoryKind, MemoryStore, formatMemoryLine, parseCsvList } from './memory/memoryStore';

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
  let memory: MemoryStore | undefined;

  try {
    root = getWorkspaceRoot();
    brain = new BrainManager(root);
    orchestrator = new AiOrchestrator(root, brain, settings);
    agentGuide = new AgentGuideGenerator(root);
    memory = new MemoryStore(root);
    const watcher = new BrainFileWatcher(brain, () => sidebar.log('Brain updated incrementally.'), e => logError(sidebar, e));
    watcher.start();
    context.subscriptions.push(watcher);
  } catch (e) {
    sidebar.log(String(e));
  }

  const requireBrain = () => {
    if (!root || !brain || !orchestrator || !agentGuide || !memory) throw new Error('افتح مجلد مشروع أولاً.');
    return { root, brain, orchestrator, agentGuide, memory };
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
    vscode.commands.registerCommand('projectBrain.generateSkillsWorkflow', () => runWithStatus(sidebar, 'Scanning', async () => {
      const { brain, agentGuide } = requireBrain();
      const data = await brain.scanIncremental();
      const result = await agentGuide.generate(data);
      sidebar.log(`Skills and workflow generated: ${result.skillsIndexPath}, ${result.workflowPath}, ${result.qualityGatesPath}`);
      vscode.window.showInformationMessage('INI Brain AI generated Skills, Workflow, and Quality Gates.');
    })),
    vscode.commands.registerCommand('projectBrain.copyContextForCline', () => runWithStatus(sidebar, 'Ready', async () => {
      const { brain, agentGuide, memory } = requireBrain();
      const data = await brain.getBrain();
      const memoryContext = await memory.buildContext('project architecture decisions workflow bugs preferences', 4500);
      const text = await agentGuide.buildClineClipboardText(data, memoryContext);
      await vscode.env.clipboard.writeText(text);
      sidebar.log('Compact context copied for Cline.');
      vscode.window.showInformationMessage('INI Brain AI context copied. Paste it into Cline before your prompt.');
    })),
    vscode.commands.registerCommand('projectBrain.saveMemory', () => runWithStatus(sidebar, 'Ready', async () => {
      const { memory } = requireBrain();
      await saveMemory(memory, sidebar);
    })),
    vscode.commands.registerCommand('projectBrain.searchMemory', () => runWithStatus(sidebar, 'Ready', async () => {
      const { memory } = requireBrain();
      await searchMemory(memory, sidebar);
    })),
    vscode.commands.registerCommand('projectBrain.showMemoryProfile', () => runWithStatus(sidebar, 'Ready', async () => {
      const { memory } = requireBrain();
      await showMemoryProfile(memory, sidebar);
    })),
    vscode.commands.registerCommand('projectBrain.copyMcpConfigForCline', () => runWithStatus(sidebar, 'Ready', async () => {
      const { root } = requireBrain();
      await copyMcpConfigForCline(root, sidebar);
    })),
    vscode.commands.registerCommand('projectBrain.installMcpForCline', () => runWithStatus(sidebar, 'Ready', async () => {
      const { root } = requireBrain();
      await installMcpForCline(root, sidebar);
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

async function saveMemory(memory: MemoryStore, sidebar: SidebarProvider): Promise<void> {
  const content = await vscode.window.showInputBox({
    prompt: 'What should INI Brain remember?',
    placeHolder: 'Example: We chose MCP as the Cline integration layer.'
  });
  if (!content) return;

  const kindPick = await vscode.window.showQuickPick(
    ['fact', 'decision', 'preference', 'bug', 'workflow', 'session', 'note'] satisfies MemoryKind[],
    { placeHolder: 'Memory type' }
  );
  if (!kindPick) return;

  const files = parseCsvList(await vscode.window.showInputBox({
    prompt: 'Related files (comma separated, optional)',
    placeHolder: 'src/extension.ts, src/brain/agentGuide.ts'
  }));
  const concepts = parseCsvList(await vscode.window.showInputBox({
    prompt: 'Concepts/tags (comma separated, optional)',
    placeHolder: 'MCP, Cline, memory'
  }));
  const importanceRaw = await vscode.window.showInputBox({
    prompt: 'Importance from 1 to 10',
    value: '7',
    validateInput: value => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 1 && n <= 10 ? undefined : 'Enter a number from 1 to 10.';
    }
  });
  if (!importanceRaw) return;

  const entry = await memory.save({ content, kind: kindPick as MemoryKind, files, concepts, importance: Number(importanceRaw), source: 'manual' });
  sidebar.log(`Memory saved: ${entry.id}`);
  vscode.window.showInformationMessage(`INI Brain remembered: ${entry.kind}`);
}

async function searchMemory(memory: MemoryStore, sidebar: SidebarProvider): Promise<void> {
  const query = await vscode.window.showInputBox({ prompt: 'Search INI Brain memory', placeHolder: 'auth decisions, Cline MCP, known bugs...' });
  if (!query) return;
  const results = await memory.search(query, 12);
  output.clear();
  output.appendLine('# INI Brain Memory Search');
  output.appendLine(`Query: ${query}`);
  output.appendLine('');
  if (results.length === 0) {
    output.appendLine('No matching memories found.');
  } else {
    for (const result of results) {
      output.appendLine(`## ${result.entry.id} — score ${result.score}`);
      output.appendLine(formatMemoryLine(result.entry));
      output.appendLine(`Matches: ${result.matches.join(', ') || 'none'}`);
      output.appendLine('');
    }
  }
  output.show(true);
  sidebar.log(`Memory search returned ${results.length} result(s).`);
}

async function showMemoryProfile(memory: MemoryStore, sidebar: SidebarProvider): Promise<void> {
  const profile = await memory.buildProfile();
  output.clear();
  output.appendLine('# INI Brain Memory Profile');
  output.appendLine(`Generated: ${profile.generatedAt}`);
  output.appendLine(`Total memories: ${profile.totalMemories}`);
  output.appendLine('');
  output.appendLine('## Top Concepts');
  output.appendLine(profile.topConcepts.map(item => `- ${item.concept}: ${item.count}`).join('\n') || '- None');
  output.appendLine('');
  output.appendLine('## Top Files');
  output.appendLine(profile.topFiles.map(item => `- ${item.file}: ${item.count}`).join('\n') || '- None');
  output.appendLine('');
  output.appendLine('## Important Decisions');
  output.appendLine(profile.importantDecisions.map(formatMemoryLine).join('\n') || '- None');
  output.appendLine('');
  output.appendLine('## Recent Memories');
  output.appendLine(profile.recentMemories.map(formatMemoryLine).join('\n') || '- None');
  output.show(true);
  sidebar.log(`Memory profile shown. Total memories: ${profile.totalMemories}.`);
}

async function copyMcpConfigForCline(root: string, sidebar: SidebarProvider): Promise<void> {
  const config = { mcpServers: { 'ini-brain-ai': buildMcpServerConfig(root) } };
  await vscode.env.clipboard.writeText(JSON.stringify(config, null, 2));
  sidebar.log('Local MCP config copied for Cline.');
  vscode.window.showInformationMessage('INI Brain MCP config copied. Add it to Cline MCP settings after running npm run compile/package.');
}

async function installMcpForCline(root: string, sidebar: SidebarProvider): Promise<void> {
  const mcpSettingsPath = path.join(
    process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'),
    'Code',
    'User',
    'globalStorage',
    'saoudrizwan.claude-dev',
    'settings',
    'cline_mcp_settings.json'
  );

  const ok = await vscode.window.showWarningMessage(
    `Install/update INI Brain MCP in Cline settings?\n\n${mcpSettingsPath}`,
    { modal: true },
    'Install'
  );
  if (ok !== 'Install') return;

  await fs.mkdir(path.dirname(mcpSettingsPath), { recursive: true });
  const current = await readJsonFile<Record<string, unknown>>(mcpSettingsPath, {});
  const mcpServers = current.mcpServers && typeof current.mcpServers === 'object' && !Array.isArray(current.mcpServers)
    ? current.mcpServers as Record<string, unknown>
    : {};
  const next = {
    ...current,
    mcpServers: {
      ...mcpServers,
      'ini-brain-ai': buildMcpServerConfig(root)
    }
  };
  await fs.writeFile(mcpSettingsPath, JSON.stringify(next, null, 2), 'utf8');
  sidebar.log(`INI Brain MCP installed for Cline: ${mcpSettingsPath}`);
  vscode.window.showInformationMessage('INI Brain MCP installed for Cline. Reload Cline MCP servers or reload VS Code.');
}

function buildMcpServerConfig(root: string): Record<string, unknown> {
  return {
    command: 'node',
    args: [path.join(__dirname, 'mcp', 'iniBrainMcp.js')],
    env: { INI_BRAIN_WORKSPACE: root },
    disabled: false,
    autoApprove: []
  };
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; } catch { return fallback; }
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






