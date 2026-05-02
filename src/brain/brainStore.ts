import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainData, DependencyGraph, FileRecord, ProjectMap } from '../types';

interface BrainMetadata {
  version: 1;
  generatedAt: string;
  lastFullScanAt?: string;
  totalFiles: number;
  hashes: Record<string, string>;
}

const BRAIN_VERSION = 1;

export class BrainStore {
  readonly brainDir: string;

  constructor(private readonly root: string) {
    this.brainDir = path.join(root, '.brain');
  }

  async ensure(): Promise<void> {
    await fs.mkdir(this.brainDir, { recursive: true });
  }

  async readFileIndex(): Promise<Record<string, FileRecord>> {
    return this.readJson('file_index.json', {});
  }

  async readBrain(): Promise<BrainData> {
    await this.ensure();
    return {
      projectMap: await this.readJson('project_map.json', this.emptyProjectMap()),
      fileIndex: await this.readFileIndex(),
      dependencies: await this.readJson<DependencyGraph>('dependencies.json', {
        generatedAt: new Date(0).toISOString(),
        edges: {},
        unresolved: {}
      }),
      architecture: await this.readText('architecture.md', ''),
      aiContext: await this.readText('ai_context.md', '')
    };
  }

  async writeAll(data: BrainData, fullScan = false): Promise<void> {
    await this.ensure();
    const metadata = this.buildMetadata(data.fileIndex, fullScan);

    // Atomic writes prevent corrupted .brain files if VS Code closes during an update.
    await Promise.all([
      this.writeJsonAtomic('project_map.json', data.projectMap),
      this.writeJsonAtomic('file_index.json', data.fileIndex),
      this.writeJsonAtomic('dependencies.json', data.dependencies),
      this.writeTextAtomic('architecture.md', data.architecture),
      this.writeTextAtomic('ai_context.md', data.aiContext),
      this.writeJsonAtomic('metadata.json', metadata)
    ]);
  }

  async validateBrainFiles(): Promise<string[]> {
    await this.ensure();
    const required = ['project_map.json', 'file_index.json', 'dependencies.json', 'architecture.md', 'ai_context.md'];
    const missing: string[] = [];
    for (const file of required) {
      try { await fs.access(path.join(this.brainDir, file)); } catch { missing.push(file); }
    }
    return missing;
  }

  private buildMetadata(index: Record<string, FileRecord>, fullScan: boolean): BrainMetadata {
    const now = new Date().toISOString();
    return {
      version: BRAIN_VERSION,
      generatedAt: now,
      lastFullScanAt: fullScan ? now : undefined,
      totalFiles: Object.keys(index).length,
      hashes: Object.fromEntries(Object.entries(index).map(([file, record]) => [file, record.hash]))
    };
  }

  private emptyProjectMap(): ProjectMap {
    return { generatedAt: new Date(0).toISOString(), root: this.root, totalFiles: 0, languages: {}, coreFiles: [] };
  }

  private async readJson<T>(name: string, fallback: T): Promise<T> {
    try { return JSON.parse(await fs.readFile(path.join(this.brainDir, name), 'utf8')) as T; } catch { return fallback; }
  }

  private async readText(name: string, fallback: string): Promise<string> {
    try { return await fs.readFile(path.join(this.brainDir, name), 'utf8'); } catch { return fallback; }
  }

  private async writeJsonAtomic(name: string, value: unknown): Promise<void> {
    await this.writeTextAtomic(name, JSON.stringify(value, null, 2));
  }

  private async writeTextAtomic(name: string, value: string): Promise<void> {
    const target = path.join(this.brainDir, name);
    const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, value, 'utf8');
    await fs.rename(tmp, target);
  }
}

export function buildProjectMap(root: string, index: Record<string, FileRecord>): ProjectMap {
  const languages: Record<string, number> = {};
  const records = Object.values(index);
  for (const r of records) languages[r.language] = (languages[r.language] || 0) + 1;

  const coreFiles = records
    .filter(r => isCoreFile(r.path))
    .sort((a, b) => scoreCoreFile(b) - scoreCoreFile(a))
    .slice(0, 60)
    .map(r => r.path);

  return { generatedAt: new Date().toISOString(), root, totalFiles: records.length, languages, coreFiles };
}

export function buildDependencyGraph(index: Record<string, FileRecord>): DependencyGraph {
  const paths = new Set(Object.keys(index));
  const edges: Record<string, string[]> = {};
  const unresolved: Record<string, string[]> = {};

  for (const [file, rec] of Object.entries(index)) {
    const resolvedEdges = new Set<string>();
    const unresolvedImports = new Set<string>();

    for (const imp of rec.imports) {
      const resolved = resolveImport(file, imp, paths);
      if (resolved) resolvedEdges.add(resolved);
      else unresolvedImports.add(imp);
    }

    edges[file] = [...resolvedEdges].sort();
    if (unresolvedImports.size) unresolved[file] = [...unresolvedImports].sort();
  }

  return { generatedAt: new Date().toISOString(), edges, unresolved };
}

function resolveImport(from: string, imp: string, paths: Set<string>): string | undefined {
  if (!imp.startsWith('.')) return undefined;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), imp));
  const variants = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`,
    `${base}.php`, `${base}.py`, `${base}.vue`, `${base}.svelte`,
    `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/index.jsx`, `${base}/__init__.py`
  ];
  return variants.find(v => paths.has(v));
}

export function buildArchitectureMarkdown(map: ProjectMap, deps: DependencyGraph): string {
  const incoming = computeIncomingDependencies(deps);
  const hotspots = Object.entries(incoming)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([file, count]) => `- ${file}: referenced by ${count} file(s)`)
    .join('\n');

  const outgoing = Object.entries(deps.edges)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 25)
    .map(([file, targets]) => `- ${file}: ${targets.length} internal import(s)`)
    .join('\n');

  return `# Architecture\n\nGenerated: ${map.generatedAt}\n\n## Project Overview\n- Root: ${map.root}\n- Total indexed files: ${map.totalFiles}\n\n## Languages\n${Object.entries(map.languages).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- No files indexed'}\n\n## Core Files\n${map.coreFiles.map(f => `- ${f}`).join('\n') || '- None'}\n\n## Dependency Hotspots (Incoming)\n${hotspots || '- None'}\n\n## Dependency Hotspots (Outgoing)\n${outgoing || '- None'}\n`;
}

export function buildAiContext(map: ProjectMap, index: Record<string, FileRecord>): string {
  const records = Object.values(index);
  const recent = records.sort((a, b) => b.modifiedAt - a.modifiedAt).slice(0, 30);
  const coreSet = new Set(map.coreFiles.slice(0, 30));
  const core = records.filter(r => coreSet.has(r.path));

  return `# AI Context\n\nProject has ${map.totalFiles} indexed files. Primary languages: ${Object.entries(map.languages).map(([k, v]) => `${k} (${v})`).join(', ') || 'none'}.\n\n## Core Files\n${core.map(formatRecordForContext).join('\n\n') || '- None'}\n\n## Recently Edited Files\n${recent.map(formatRecordForContext).join('\n\n') || '- None'}\n`;
}

function computeIncomingDependencies(deps: DependencyGraph): Record<string, number> {
  const incoming: Record<string, number> = {};
  for (const targets of Object.values(deps.edges)) {
    for (const target of targets) incoming[target] = (incoming[target] || 0) + 1;
  }
  return incoming;
}

function formatRecordForContext(r: FileRecord): string {
  return `### ${r.path}\nLanguage: ${r.language}\nSize: ${r.size} bytes\nHash: ${r.hash.slice(0, 12)}\nExports: ${r.exports.join(', ') || 'none'}\nImports: ${r.imports.slice(0, 15).join(', ') || 'none'}\nSummary:\n${r.summary || ''}`;
}

function isCoreFile(file: string): boolean {
  return /(^|\/)(package\.json|tsconfig\.json|composer\.json|pyproject\.toml|requirements\.txt|vite\.config\.|webpack\.config\.|src\/.*\.(ts|tsx|js|jsx|php|py)|app\/.*\.(ts|tsx|js|jsx|php|py))$/i.test(file);
}

function scoreCoreFile(record: FileRecord): number {
  let score = record.modifiedAt / 1_000_000_000;
  if (/(^|\/)package\.json$/i.test(record.path)) score += 100;
  if (/(^|\/)src\//i.test(record.path)) score += 20;
  if (record.exports.length) score += Math.min(record.exports.length, 20);
  return score;
}
