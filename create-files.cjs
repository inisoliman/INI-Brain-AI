const fs = require('fs');
const path = require('path');
const files = new Map();
function add(file, content){ files.set(file, content.trimStart()); }
add('package.json', `{
  "name": "project-brain-ai",
  "displayName": "Project Brain AI",
  "description": "Autonomous project scanner, local brain knowledge base, and multi-agent AI workflow for VS Code.",
  "version": "1.0.0",
  "publisher": "local",
  "license": "MIT",
  "engines": { "vscode": "^1.90.0" },
  "categories": ["Other", "AI", "Machine Learning"],
  "activationEvents": [
    "onStartupFinished",
    "onCommand:projectBrain.scanProject",
    "onCommand:projectBrain.rebuildBrain",
    "onCommand:projectBrain.askAI",
    "onCommand:projectBrain.generateProject",
    "onCommand:projectBrain.autoMode",
    "onCommand:projectBrain.openSettings"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      { "command": "projectBrain.scanProject", "title": "Project Brain: Scan Project" },
      { "command": "projectBrain.rebuildBrain", "title": "Project Brain: Rebuild Brain" },
      { "command": "projectBrain.askAI", "title": "Project Brain: Ask AI" },
      { "command": "projectBrain.generateProject", "title": "Project Brain: Generate Project" },
      { "command": "projectBrain.autoMode", "title": "Project Brain: Auto Mode" },
      { "command": "projectBrain.openSettings", "title": "Project Brain: Settings" }
    ],
    "viewsContainers": {
      "activitybar": [{ "id": "projectBrain", "title": "Project Brain AI", "icon": "resources/brain.svg" }]
    },
    "views": { "projectBrain": [{ "id": "projectBrain.sidebar", "name": "Brain" }] },
    "configuration": {
      "title": "Project Brain AI",
      "properties": {
        "projectBrain.apiBaseUrl": { "type": "string", "default": "https://api.puter.com/puterai/openai/v1/", "description": "OpenAI-compatible API base URL." },
        "projectBrain.modelName": { "type": "string", "default": "anthropic/claude-3-5-sonnet", "description": "Model name used by Project Brain AI." },
        "projectBrain.maxContextFiles": { "type": "number", "default": 12, "minimum": 1, "maximum": 50, "description": "Maximum relevant files injected into AI context." }
      }
    }
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package --no-dependencies",
    "vscode:prepublish": "npm run compile"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "@types/vscode": "^1.90.0",
    "@vscode/vsce": "^2.32.0",
    "typescript": "^5.5.3"
  }
}`);
add('tsconfig.json', `{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"]
}`);
add('.vscodeignore', `src/**
.vscode/**
.brain/**
*.map
tsconfig.json
create-files.cjs`);
add('README.md', `# Project Brain AI

Project Brain AI is a production-ready local VS Code extension that scans projects, builds a hidden \`.brain\` knowledge base, injects smart context, and runs a Planner → Executor → Reviewer AI workflow through an OpenAI-compatible endpoint.

## Local install

\`\`\`bash
npm install
npm run compile
npx vsce package --no-dependencies
code --install-extension project-brain-ai-1.0.0.vsix
\`\`\`

## Commands

- Project Brain: Scan Project
- Project Brain: Rebuild Brain
- Project Brain: Ask AI
- Project Brain: Generate Project
- Project Brain: Auto Mode
- Project Brain: Settings

API key is stored securely via VS Code SecretStorage.`);
add('resources/brain.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#8b5cf6" d="M9 2a4 4 0 0 0-4 4v1a4 4 0 0 0-2 7.46V16a4 4 0 0 0 5.5 3.71A4 4 0 0 0 16 18h1a4 4 0 0 0 2-7.46V9a4 4 0 0 0-5.5-3.71A4 4 0 0 0 9 2Z"/></svg>`);
add('src/types.ts', `export type BrainStatus = 'Ready' | 'Scanning' | 'AI Working' | 'Error';
export interface FileRecord { path: string; language: string; size: number; hash: string; modifiedAt: number; imports: string[]; exports: string[]; summary?: string; }
export interface DependencyGraph { generatedAt: string; edges: Record<string, string[]>; unresolved: Record<string, string[]>; }
export interface ProjectMap { generatedAt: string; root: string; totalFiles: number; languages: Record<string, number>; coreFiles: string[]; }
export interface BrainData { projectMap: ProjectMap; fileIndex: Record<string, FileRecord>; dependencies: DependencyGraph; architecture: string; aiContext: string; }
export interface CodeChange { path: string; content: string; action: 'create' | 'update'; }`);
add('src/utils/pathUtils.ts', `import * as path from 'path';
export const DEFAULT_IGNORES = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.brain', 'vendor', '__pycache__']);
export function normalizePath(p: string): string { return p.split(path.sep).join('/'); }
export function isIgnoredSegment(segment: string): boolean { return DEFAULT_IGNORES.has(segment); }
export function isTextLike(file: string): boolean { return /\\.(ts|tsx|js|jsx|mjs|cjs|json|php|py|java|cs|go|rs|rb|html|css|scss|md|yml|yaml|xml|vue|svelte)$/i.test(file); }
export function detectLanguage(file: string): string { const ext = path.extname(file).toLowerCase(); const map: Record<string, string> = { '.ts':'TypeScript','.tsx':'TypeScript React','.js':'JavaScript','.jsx':'JavaScript React','.mjs':'JavaScript','.cjs':'JavaScript','.php':'PHP','.py':'Python','.json':'JSON','.md':'Markdown','.html':'HTML','.css':'CSS','.scss':'SCSS','.java':'Java','.cs':'C#','.go':'Go','.rs':'Rust','.rb':'Ruby','.vue':'Vue','.svelte':'Svelte','.yml':'YAML','.yaml':'YAML','.xml':'XML' }; return map[ext] || 'Text'; }`);
add('src/scanner/projectScanner.ts', `import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { FileRecord } from '../types';
import { detectLanguage, isIgnoredSegment, isTextLike, normalizePath } from '../utils/pathUtils';

export class ProjectScanner {
  constructor(private readonly root: string) {}
  async scan(existing: Record<string, FileRecord> = {}): Promise<Record<string, FileRecord>> {
    const files = await this.walk(this.root); const next: Record<string, FileRecord> = {};
    await Promise.all(files.map(async abs => { const rel = normalizePath(path.relative(this.root, abs)); const stat = await fs.stat(abs); const content = await fs.readFile(abs, 'utf8'); const hash = createHash('sha256').update(content).digest('hex'); const old = existing[rel]; next[rel] = old && old.hash === hash ? old : this.analyzeFile(rel, content, stat.size, hash, stat.mtimeMs); }));
    return next;
  }
  async scanSingle(absPath: string, existing?: FileRecord): Promise<FileRecord | undefined> {
    if (!absPath.startsWith(this.root) || !isTextLike(absPath)) return undefined;
    const rel = normalizePath(path.relative(this.root, absPath)); const content = await fs.readFile(absPath, 'utf8'); const stat = await fs.stat(absPath); const hash = createHash('sha256').update(content).digest('hex');
    if (existing?.hash === hash) return existing; return this.analyzeFile(rel, content, stat.size, hash, stat.mtimeMs);
  }
  private analyzeFile(rel: string, content: string, size: number, hash: string, modifiedAt: number): FileRecord { return { path: rel, language: detectLanguage(rel), size, hash, modifiedAt, imports: this.extractImports(content), exports: this.extractExports(content), summary: this.summarize(content) }; }
  private async walk(dir: string): Promise<string[]> { const out: string[] = []; let entries: import('fs').Dirent[]; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; } for (const e of entries) { if (isIgnoredSegment(e.name)) continue; const abs = path.join(dir, e.name); if (e.isDirectory()) out.push(...await this.walk(abs)); else if (e.isFile() && isTextLike(abs)) out.push(abs); } return out; }
  private extractImports(content: string): string[] { const found = new Set<string>(); const patterns = [/import\\s+(?:[^'\"]+from\\s+)?['\"]([^'\"]+)['\"]/g, /require\\(['\"]([^'\"]+)['\"]\\)/g, /from\\s+['\"]([^'\"]+)['\"]/g, /include(?:_once)?\\s+["']([^"']+)["']/g, /require(?:_once)?\\s+["']([^"']+)["']/g]; for (const re of patterns) for (const m of content.matchAll(re)) if (m[1]) found.add(m[1]); return [...found].slice(0, 200); }
  private extractExports(content: string): string[] { const found = new Set<string>(); for (const m of content.matchAll(/export\\s+(?:default\\s+)?(?:class|function|const|let|var|interface|type)\\s+([A-Za-z0-9_$]+)/g)) found.add(m[1]); for (const m of content.matchAll(/module\\.exports\\.([A-Za-z0-9_$]+)/g)) found.add(m[1]); return [...found].slice(0, 200); }
  private summarize(content: string): string { const cleaned = content.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean).slice(0, 30).join('\\n'); return cleaned.length > 1600 ? cleaned.slice(0, 1600) + '\\n…' : cleaned; }
}
export function getWorkspaceRoot(): string { const folder = vscode.workspace.workspaceFolders?.[0]; if (!folder) throw new Error('افتح مجلد مشروع أولاً لاستخدام Project Brain AI.'); return folder.uri.fsPath; }`);
add('src/brain/brainStore.ts', `import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainData, DependencyGraph, FileRecord, ProjectMap } from '../types';
export class BrainStore { readonly brainDir: string; constructor(private readonly root: string) { this.brainDir = path.join(root, '.brain'); } async ensure(): Promise<void> { await fs.mkdir(this.brainDir, { recursive: true }); } async readFileIndex(): Promise<Record<string, FileRecord>> { return this.readJson('file_index.json', {}); } async readBrain(): Promise<BrainData> { return { projectMap: await this.readJson('project_map.json', this.emptyProjectMap()), fileIndex: await this.readFileIndex(), dependencies: await this.readJson<DependencyGraph>('dependencies.json', { generatedAt: new Date(0).toISOString(), edges: {}, unresolved: {} }), architecture: await this.readText('architecture.md', ''), aiContext: await this.readText('ai_context.md', '') }; } async writeAll(data: BrainData): Promise<void> { await this.ensure(); await Promise.all([this.writeJson('project_map.json', data.projectMap), this.writeJson('file_index.json', data.fileIndex), this.writeJson('dependencies.json', data.dependencies), this.writeText('architecture.md', data.architecture), this.writeText('ai_context.md', data.aiContext)]); } private emptyProjectMap(): ProjectMap { return { generatedAt: new Date(0).toISOString(), root: this.root, totalFiles: 0, languages: {}, coreFiles: [] }; } private async readJson<T>(name: string, fallback: T): Promise<T> { try { return JSON.parse(await fs.readFile(path.join(this.brainDir, name), 'utf8')) as T; } catch { return fallback; } } private async readText(name: string, fallback: string): Promise<string> { try { return await fs.readFile(path.join(this.brainDir, name), 'utf8'); } catch { return fallback; } } private async writeJson(name: string, value: unknown): Promise<void> { await fs.writeFile(path.join(this.brainDir, name), JSON.stringify(value, null, 2), 'utf8'); } private async writeText(name: string, value: string): Promise<void> { await fs.writeFile(path.join(this.brainDir, name), value, 'utf8'); } }
export function buildProjectMap(root: string, index: Record<string, FileRecord>): ProjectMap { const languages: Record<string, number> = {}; const records = Object.values(index); for (const r of records) languages[r.language] = (languages[r.language] || 0) + 1; const coreFiles = records.filter(r => /(^|\\/)(package\\.json|tsconfig\\.json|composer\\.json|pyproject\\.toml|requirements\\.txt|src\\/.*\\.(ts|js|php|py))$/i.test(r.path)).sort((a,b)=>b.modifiedAt-a.modifiedAt).slice(0, 40).map(r=>r.path); return { generatedAt: new Date().toISOString(), root, totalFiles: records.length, languages, coreFiles }; }
export function buildDependencyGraph(index: Record<string, FileRecord>): DependencyGraph { const paths = new Set(Object.keys(index)); const edges: Record<string,string[]> = {}; const unresolved: Record<string,string[]> = {}; for (const [file, rec] of Object.entries(index)) { edges[file] = []; unresolved[file] = []; for (const imp of rec.imports) { const resolved = resolveImport(file, imp, paths); if (resolved) edges[file].push(resolved); else unresolved[file].push(imp); } if (!unresolved[file].length) delete unresolved[file]; } return { generatedAt: new Date().toISOString(), edges, unresolved }; }
function resolveImport(from: string, imp: string, paths: Set<string>): string | undefined { if (!imp.startsWith('.')) return undefined; const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), imp)); return [base, \`${'${base}'}.ts\`, \`${'${base}'}.tsx\`, \`${'${base}'}.js\`, \`${'${base}'}.jsx\`, \`${'${base}'}.php\`, \`${'${base}'}.py\`, \`${'${base}'}/index.ts\`, \`${'${base}'}/index.js\`].find(v => paths.has(v)); }
export function buildArchitectureMarkdown(map: ProjectMap, deps: DependencyGraph): string { const topDeps = Object.entries(deps.edges).sort((a,b)=>b[1].length-a[1].length).slice(0,20).map(([f,d])=>\`- ${'${f}'}: ${'${d.length}'} internal dependencies\`).join('\\n'); return \`# Architecture\\n\\nGenerated: ${'${map.generatedAt}'}\\n\\n## Project Overview\\n- Root: ${'${map.root}'}\\n- Total indexed files: ${'${map.totalFiles}'}\\n\\n## Languages\\n${'${Object.entries(map.languages).map(([k,v])=>`- ${k}: ${v}`).join(\'\\n\') || \'- No files indexed\'}'}\\n\\n## Core Files\\n${'${map.coreFiles.map(f=>`- ${f}`).join(\'\\n\') || \'- None\'}'}\\n\\n## Dependency Hotspots\\n${'${topDeps || \'- None\'}'}\\n\`; }
export function buildAiContext(map: ProjectMap, index: Record<string, FileRecord>): string { const recent = Object.values(index).sort((a,b)=>b.modifiedAt-a.modifiedAt).slice(0,20); return \`# AI Context\\n\\nProject has ${'${map.totalFiles}'} indexed files. Primary languages: ${'${Object.entries(map.languages).map(([k,v])=>`${k} (${v})`).join(\', \')}'}\\n\\n${'${recent.map(r=>`### ${r.path}\\nLanguage: ${r.language}\\nExports: ${r.exports.join(\', \') || \'none\'}\\nImports: ${r.imports.slice(0,10).join(\', \') || \'none\'}\\nSummary:\\n${r.summary || \'\'}`).join(\'\\n\\n\')}'}\\n\`; }`);
add('src/brain/brainManager.ts', `import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainData, FileRecord } from '../types';
import { ProjectScanner } from '../scanner/projectScanner';
import { BrainStore, buildAiContext, buildArchitectureMarkdown, buildDependencyGraph, buildProjectMap } from './brainStore';
export class BrainManager { readonly store: BrainStore; private scanner: ProjectScanner; constructor(private readonly root: string) { this.store = new BrainStore(root); this.scanner = new ProjectScanner(root); } async scanIncremental(): Promise<BrainData> { const existing = await this.store.readFileIndex(); return this.persist(await this.scanner.scan(existing)); } async rebuild(): Promise<BrainData> { return this.persist(await this.scanner.scan({})); } async updateFile(absPath: string): Promise<BrainData> { const index = await this.store.readFileIndex(); const rel = path.relative(this.root, absPath).split(path.sep).join('/'); const record = await this.scanner.scanSingle(absPath, index[rel]); if (record) index[record.path] = record; return this.persist(index); } async removeFile(absPath: string): Promise<BrainData> { const index = await this.store.readFileIndex(); const rel = path.relative(this.root, absPath).split(path.sep).join('/'); delete index[rel]; return this.persist(index); } async getBrain(): Promise<BrainData> { await this.store.ensure(); return this.store.readBrain(); } async isWorkspaceEmpty(): Promise<boolean> { const entries = await fs.readdir(this.root).catch(()=>[]); return entries.filter(e => e !== '.brain' && e !== '.git').length === 0; } private async persist(index: Record<string, FileRecord>): Promise<BrainData> { const projectMap = buildProjectMap(this.root, index); const dependencies = buildDependencyGraph(index); const data: BrainData = { projectMap, fileIndex: index, dependencies, architecture: buildArchitectureMarkdown(projectMap, dependencies), aiContext: buildAiContext(projectMap, index) }; await this.store.writeAll(data); return data; } }`);
add('src/brain/fileWatcher.ts', `import * as vscode from 'vscode';
import { BrainManager } from './brainManager';
export class BrainFileWatcher implements vscode.Disposable { private watcher?: vscode.FileSystemWatcher; private timer?: NodeJS.Timeout; private pending = new Map<string, 'change'|'delete'>(); constructor(private readonly manager: BrainManager, private readonly onDidUpdate: () => void, private readonly onError: (e: unknown) => void) {} start(): void { this.watcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false); this.watcher.onDidCreate(uri => this.queue(uri.fsPath, 'change')); this.watcher.onDidChange(uri => this.queue(uri.fsPath, 'change')); this.watcher.onDidDelete(uri => this.queue(uri.fsPath, 'delete')); } private queue(file: string, kind: 'change'|'delete'): void { if (/[\\/](node_modules|\\.git|\\.brain)[\\/]/.test(file)) return; this.pending.set(file, kind); if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => void this.flush(), 700); } private async flush(): Promise<void> { const batch = [...this.pending.entries()]; this.pending.clear(); try { for (const [file, kind] of batch) kind === 'delete' ? await this.manager.removeFile(file) : await this.manager.updateFile(file); this.onDidUpdate(); } catch (e) { this.onError(e); } } dispose(): void { this.watcher?.dispose(); if (this.timer) clearTimeout(this.timer); } }`);
add('src/storage/settingsService.ts', `import * as vscode from 'vscode';
export interface AiSettings { apiBaseUrl: string; apiKey?: string; modelName: string; }
export class SettingsService { private static readonly KEY = 'projectBrain.apiKey'; constructor(private readonly context: vscode.ExtensionContext) {} async get(): Promise<AiSettings> { const cfg = vscode.workspace.getConfiguration('projectBrain'); return { apiBaseUrl: cfg.get('apiBaseUrl', 'https://api.puter.com/puterai/openai/v1/'), apiKey: await this.context.secrets.get(SettingsService.KEY), modelName: cfg.get('modelName', 'anthropic/claude-3-5-sonnet') }; } async setApiKey(value: string): Promise<void> { await this.context.secrets.store(SettingsService.KEY, value); } async setConfig(apiBaseUrl: string, modelName: string): Promise<void> { const cfg = vscode.workspace.getConfiguration('projectBrain'); await cfg.update('apiBaseUrl', apiBaseUrl, vscode.ConfigurationTarget.Workspace); await cfg.update('modelName', modelName, vscode.ConfigurationTarget.Workspace); } }`);
add('src/ai/llmClient.ts', `import { AiSettings } from '../storage/settingsService';
export class LlmClient { constructor(private readonly settings: AiSettings) {} async chat(system: string, user: string): Promise<string> { if (!this.settings.apiKey) throw new Error('API Key غير مضبوط. افتح Project Brain: Settings أولاً.'); const url = new URL('chat/completions', this.settings.apiBaseUrl.endsWith('/') ? this.settings.apiBaseUrl : this.settings.apiBaseUrl + '/').toString(); const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: \`Bearer ${'${this.settings.apiKey}'}\` }, body: JSON.stringify({ model: this.settings.modelName, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2 }) }); if (!res.ok) throw new Error(\`AI API failed ${'${res.status}'}: ${'${await res.text()}'}\`); const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }; return json.choices?.[0]?.message?.content?.trim() || ''; } }`);
add('src/ai/contextBuilder.ts', `import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainData, FileRecord } from '../types';
export class ContextBuilder { constructor(private readonly root: string) {} async build(brain: BrainData, request: string, maxFiles: number): Promise<string> { const records = this.rank(Object.values(brain.fileIndex), request).slice(0, maxFiles); const chunks: string[] = [\`## Project Map\\n${'${JSON.stringify(brain.projectMap, null, 2)}'}\`, \`## Architecture\\n${'${brain.architecture}'}\`, \`## AI Context\\n${'${brain.aiContext.slice(0, 6000)}'}\`]; for (const r of records) chunks.push(\`## Relevant File: ${'${r.path}'}\\n${'${await this.fileSnippet(r)}'}\`); return chunks.join('\\n\\n---\\n\\n'); } private rank(records: FileRecord[], request: string): FileRecord[] { const q = request.toLowerCase().split(/\\W+/).filter(Boolean); return records.map(r => ({ r, score: (Date.now()-r.modifiedAt < 86400000 ? 5 : 0) + (/(package\\.json|tsconfig|src\\/|extension\\.ts)/.test(r.path) ? 4 : 0) + q.reduce((s,w)=>s+((r.path.toLowerCase().includes(w)||r.summary?.toLowerCase().includes(w))?2:0),0) })).sort((a,b)=>b.score-a.score).map(x=>x.r); } private async fileSnippet(r: FileRecord): Promise<string> { const abs = path.join(this.root, r.path); const content = await fs.readFile(abs, 'utf8').catch(()=>r.summary || ''); return content.length > 9000 ? content.slice(0, 4500) + '\\n/* … middle omitted for token budget … */\\n' + content.slice(-3500) : content; } }`);
add('src/ai/agents.ts', `import { LlmClient } from './llmClient';
export class PlannerAgent { constructor(private llm: LlmClient) {} run(request: string, context: string): Promise<string> { return this.llm.chat('You are Planner Agent. Create a precise structured plan, risks, files, and tests.', \`REQUEST:\\n${'${request}'}\\n\\nCONTEXT:\\n${'${context}'}\`); } }
export class ExecutorAgent { constructor(private llm: LlmClient) {} run(request: string, plan: string, context: string): Promise<string> { return this.llm.chat('You are Executor Agent. Produce complete production-ready code. If file writes are needed, return a fenced JSON block: {"changes":[{"path":"...","action":"create|update","content":"..."}]}', \`REQUEST:\\n${'${request}'}\\n\\nPLAN:\\n${'${plan}'}\\n\\nCONTEXT:\\n${'${context}'}\`); } }
export class ReviewerAgent { constructor(private llm: LlmClient) {} run(request: string, plan: string, execution: string, context: string): Promise<string> { return this.llm.chat('You are Reviewer Agent. Review bugs, security, edge cases, and return final improved answer. Preserve valid JSON changes if needed.', \`REQUEST:\\n${'${request}'}\\n\\nPLAN:\\n${'${plan}'}\\n\\nEXECUTION:\\n${'${execution}'}\\n\\nCONTEXT:\\n${'${context}'}\`); } }`);
add('src/ai/orchestrator.ts', `import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainManager } from '../brain/brainManager';
import { SettingsService } from '../storage/settingsService';
import { CodeChange } from '../types';
import { ContextBuilder } from './contextBuilder';
import { LlmClient } from './llmClient';
import { PlannerAgent, ExecutorAgent, ReviewerAgent } from './agents';
export class AiOrchestrator { constructor(private readonly root: string, private readonly brain: BrainManager, private readonly settings: SettingsService) {} async run(request: string): Promise<string> { const cfg = vscode.workspace.getConfiguration('projectBrain'); const brainData = await this.brain.getBrain(); const context = await new ContextBuilder(this.root).build(brainData, request, cfg.get('maxContextFiles', 12)); const llm = new LlmClient(await this.settings.get()); const plan = await new PlannerAgent(llm).run(request, context); const execution = await new ExecutorAgent(llm).run(request, plan, context); const review = await new ReviewerAgent(llm).run(request, plan, execution, context); return \`# Planner Agent\\n${'${plan}'}\\n\\n# Executor Agent\\n${'${execution}'}\\n\\n# Reviewer Agent\\n${'${review}'}\`; } async autoMode(request: string): Promise<string> { const output = await this.run(request); const changes = this.extractChanges(output); for (const c of changes) { const target = path.resolve(this.root, c.path); if (!target.startsWith(this.root)) throw new Error(\`Refusing to write outside workspace: ${'${c.path}'}\`); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, c.content, 'utf8'); } if (changes.length) await this.brain.scanIncremental(); return \`${'${output}'}\\n\\n# Auto Mode Applied Changes\\n${'${changes.length ? changes.map(c=>`- ${c.action}: ${c.path}`).join(\'\\n\') : \'No machine-readable changes block found; no files were modified.\'}'}\`; } private extractChanges(text: string): CodeChange[] { const matches = [...text.matchAll(/\`\`\`json\\s*([\\s\\S]*?)\`\`\`/gi)].reverse(); for (const match of matches) { try { const parsed = JSON.parse(match[1]) as { changes?: CodeChange[] }; if (Array.isArray(parsed.changes)) return parsed.changes.filter(c => c && c.path && typeof c.content === 'string' && (c.action === 'create' || c.action === 'update')); } catch {} } return []; } }`);
add('src/ui/settingsPanel.ts', `import * as vscode from 'vscode';
import { SettingsService } from '../storage/settingsService';
export class SettingsPanel { static async show(context: vscode.ExtensionContext, settings: SettingsService): Promise<void> { const panel = vscode.window.createWebviewPanel('projectBrainSettings', 'Project Brain AI Settings', vscode.ViewColumn.One, { enableScripts: true }); const current = await settings.get(); panel.webview.html = this.html(current.apiBaseUrl, current.modelName, Boolean(current.apiKey)); panel.webview.onDidReceiveMessage(async msg => { if (msg.type === 'save') { await settings.setConfig(String(msg.apiBaseUrl || ''), String(msg.modelName || '')); if (msg.apiKey) await settings.setApiKey(String(msg.apiKey)); vscode.window.showInformationMessage('Project Brain AI settings saved securely.'); panel.dispose(); } }, undefined, context.subscriptions); } private static html(base: string, model: string, hasKey: boolean): string { return \`<!doctype html><html><body><h2>Project Brain AI Settings</h2><label>API Base URL</label><input id="base" style="width:100%" value="${'${esc(base)}'}"><label>API Key ${'${hasKey ? \'(saved)\' : \'\'}'}</label><input id="key" type="password" style="width:100%"><label>Model Name</label><input id="model" style="width:100%" value="${'${esc(model)}'}"><button id="save">Save</button><script>const vscode=acquireVsCodeApi();document.getElementById('save').onclick=()=>vscode.postMessage({type:'save',apiBaseUrl:document.getElementById('base').value,apiKey:document.getElementById('key').value,modelName:document.getElementById('model').value});</script></body></html>\`; } }
function esc(s: string): string { return s.replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]!)); }`);
add('src/ui/sidebarProvider.ts', `import * as vscode from 'vscode';
import { BrainStatus } from '../types';
export class SidebarProvider implements vscode.WebviewViewProvider { private view?: vscode.WebviewView; private status: BrainStatus = 'Ready'; private lines: string[] = []; resolveWebviewView(view: vscode.WebviewView): void { this.view = view; view.webview.options = { enableScripts: true }; view.webview.html = this.html(); view.webview.onDidReceiveMessage(msg => { if (msg.command) void vscode.commands.executeCommand(msg.command); }); } setStatus(status: BrainStatus): void { this.status = status; this.refresh(); } log(line: string): void { this.lines.unshift(\`[${'${new Date().toLocaleTimeString()}'}] ${'${line}'}\`); this.lines = this.lines.slice(0, 80); this.refresh(); } private refresh(): void { if (this.view) this.view.webview.html = this.html(); } private html(): string { const btn = (label: string, command: string) => \`<button onclick="vscode.postMessage({command:'${'${command}'}'})">${'${label}'}</button>\`; return \`<!doctype html><html><body><style>body{font-family:var(--vscode-font-family);padding:10px}button{display:block;width:100%;margin:6px 0}.status{font-weight:bold}.console{white-space:pre-wrap;font-size:12px;border-top:1px solid #555;margin-top:10px;padding-top:8px}</style><script>const vscode=acquireVsCodeApi()</script><h3>🧠 Project Brain AI</h3><p>Status: <span class="status">${'${this.status}'}</span></p>${'${btn(\'Scan\',\'projectBrain.scanProject\')}${btn(\'Ask AI\',\'projectBrain.askAI\')}${btn(\'Auto Mode\',\'projectBrain.autoMode\')}${btn(\'Settings\',\'projectBrain.openSettings\')}'}<div class="console">${'${this.lines.map(escapeHtml).join(\'\\n\')}'}</div></body></html>\`; } }
function escapeHtml(s: string): string { return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)); }`);
add('src/extension.ts', `import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainManager } from './brain/brainManager';
import { BrainFileWatcher } from './brain/fileWatcher';
import { getWorkspaceRoot } from './scanner/projectScanner';
import { AiOrchestrator } from './ai/orchestrator';
import { SettingsService } from './storage/settingsService';
import { SettingsPanel } from './ui/settingsPanel';
import { SidebarProvider } from './ui/sidebarProvider';
let output: vscode.OutputChannel;
export async function activate(context: vscode.ExtensionContext): Promise<void> { output = vscode.window.createOutputChannel('Project Brain AI'); context.subscriptions.push(output); const sidebar = new SidebarProvider(); context.subscriptions.push(vscode.window.registerWebviewViewProvider('projectBrain.sidebar', sidebar)); const settings = new SettingsService(context); let root: string | undefined; let brain: BrainManager | undefined; let orchestrator: AiOrchestrator | undefined; try { root = getWorkspaceRoot(); brain = new BrainManager(root); orchestrator = new AiOrchestrator(root, brain, settings); const watcher = new BrainFileWatcher(brain, () => sidebar.log('Brain updated incrementally.'), e => logError(sidebar, e)); watcher.start(); context.subscriptions.push(watcher); } catch (e) { sidebar.log(String(e)); } const requireBrain = () => { if (!root || !brain || !orchestrator) throw new Error('افتح مجلد مشروع أولاً.'); return { root, brain, orchestrator }; }; context.subscriptions.push(vscode.commands.registerCommand('projectBrain.scanProject', () => runWithStatus(sidebar, 'Scanning', async () => { const { brain } = requireBrain(); const data = await brain.scanIncremental(); sidebar.log(\`Scanned ${'${data.projectMap.totalFiles}'} files.\`); vscode.window.showInformationMessage('Project Brain scan completed.'); })), vscode.commands.registerCommand('projectBrain.rebuildBrain', () => runWithStatus(sidebar, 'Scanning', async () => { const { brain } = requireBrain(); const data = await brain.rebuild(); sidebar.log(\`Rebuilt brain: ${'${data.projectMap.totalFiles}'} files.\`); })), vscode.commands.registerCommand('projectBrain.askAI', () => runWithStatus(sidebar, 'AI Working', async () => { const { orchestrator } = requireBrain(); const request = await vscode.window.showInputBox({ prompt: 'What do you want to ask Project Brain AI?' }); if (!request) return; const answer = await orchestrator.run(request); output.clear(); output.appendLine(answer); output.show(true); sidebar.log('AI answer generated.'); })), vscode.commands.registerCommand('projectBrain.autoMode', () => runWithStatus(sidebar, 'AI Working', async () => { const { orchestrator } = requireBrain(); const request = await vscode.window.showInputBox({ prompt: 'Describe the change. Auto Mode may modify files.' }); if (!request) return; const ok = await vscode.window.showWarningMessage('Auto Mode will apply AI-generated file changes. Continue?', { modal: true }, 'Continue'); if (ok !== 'Continue') return; const answer = await orchestrator.autoMode(request); output.clear(); output.appendLine(answer); output.show(true); sidebar.log('Auto Mode completed.'); })), vscode.commands.registerCommand('projectBrain.generateProject', () => runWithStatus(sidebar, 'AI Working', async () => { const ctx = requireBrain(); await generateProject(ctx.root, ctx.orchestrator, sidebar); })), vscode.commands.registerCommand('projectBrain.openSettings', () => SettingsPanel.show(context, settings))); sidebar.log('Project Brain AI activated.'); }
async function generateProject(root: string, orchestrator: AiOrchestrator, sidebar: SidebarProvider): Promise<void> { const reqPath = path.join(root, 'project_request.md'); try { await fs.access(reqPath); } catch { await fs.writeFile(reqPath, '# Project Request\\n\\nDescribe the project you want Project Brain AI to generate.\\n', 'utf8'); vscode.window.showInformationMessage('Created project_request.md. Fill it, then run Generate Project again.'); return; } const request = await fs.readFile(reqPath, 'utf8'); const answer = await orchestrator.autoMode(\`Generate a new project from project_request.md. Return JSON changes block with complete files.\\n\\n${'${request}'}\`); output.clear(); output.appendLine(answer); output.show(true); sidebar.log('Project generation attempted.'); }
async function runWithStatus(sidebar: SidebarProvider, status: 'Scanning'|'AI Working', fn: () => Promise<void>): Promise<void> { try { sidebar.setStatus(status); await fn(); sidebar.setStatus('Ready'); } catch (e) { sidebar.setStatus('Error'); logError(sidebar, e); vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e)); } }
function logError(sidebar: SidebarProvider, e: unknown): void { const msg = e instanceof Error ? (e.stack || e.message) : String(e); output?.appendLine(msg); sidebar.log(\`Error: ${'${e instanceof Error ? e.message : String(e)}'}\`); }
export function deactivate(): void {}`);
for (const [file, content] of files) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, 'utf8'); }
console.log(`Created ${files.size} files`);
