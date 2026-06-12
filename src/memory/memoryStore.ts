import * as fs from 'fs/promises';
import * as path from 'path';

export type MemoryKind = 'fact' | 'decision' | 'preference' | 'bug' | 'workflow' | 'session' | 'note';

export interface MemoryEntry {
  id: string;
  kind: MemoryKind;
  content: string;
  files: string[];
  concepts: string[];
  importance: number;
  source: 'manual' | 'ai' | 'cline' | 'system';
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  lastAccessedAt?: string;
}


export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
  matches: string[];
}

export interface ProjectMemoryProfile {
  generatedAt: string;
  totalMemories: number;
  topConcepts: Array<{ concept: string; count: number }>;
  topFiles: Array<{ file: string; count: number }>;
  recentMemories: MemoryEntry[];
  importantDecisions: MemoryEntry[];
}

interface MemoryFile {
  version: 1;
  generatedAt: string;
  memories: MemoryEntry[];
}

const MEMORY_VERSION = 1;
const DEFAULT_IMPORTANCE = 5;

export class MemoryStore {
  private readonly brainDir: string;
  private readonly memoriesPath: string;

  constructor(private readonly root: string) {
    this.brainDir = path.join(root, '.brain');
    this.memoriesPath = path.join(this.brainDir, 'memories.json');
  }

  async save(input: {
    content: string;
    kind?: MemoryKind;
    files?: string[];
    concepts?: string[];
    importance?: number;
    source?: MemoryEntry['source'];
  }): Promise<MemoryEntry> {
    const content = input.content.trim();
    if (!content) throw new Error('Memory content is required.');

    const data = await this.readAll();
    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      id: this.generateId(),
      kind: input.kind || 'note',
      content,
      files: normalizeList(input.files),
      concepts: normalizeList(input.concepts),
      importance: clampImportance(input.importance),
      source: input.source || 'manual',
      createdAt: now,
      updatedAt: now,
      accessCount: 0
    };

    data.memories.unshift(entry);
    data.generatedAt = now;
    await this.writeAll(data);
    return entry;
  }

  async list(limit = 50): Promise<MemoryEntry[]> {
    const data = await this.readAll();
    return data.memories
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, Math.max(1, limit));
  }

  async search(query: string, limit = 10): Promise<MemorySearchResult[]> {
    const terms = tokenize(query);
    if (terms.length === 0) return [];

    const data = await this.readAll();
    const results = data.memories
      .map(entry => ({ entry, ...scoreEntry(entry, terms) }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));

    if (results.length > 0) {
      // C2 fix: bump access metadata without touching `updatedAt` (which drives list() ordering).
      const accessed = new Set(results.map(result => result.entry.id));
      const now = new Date().toISOString();
      data.memories = data.memories.map(entry => accessed.has(entry.id)
        ? { ...entry, accessCount: entry.accessCount + 1, lastAccessedAt: now }
        : entry);
      await this.writeAll(data);
    }

    return results;
  }


  async buildProfile(): Promise<ProjectMemoryProfile> {
    const data = await this.readAll();
    const topConcepts = countTop(data.memories.flatMap(memory => memory.concepts));
    const topFiles = countTop(data.memories.flatMap(memory => memory.files)).map(item => ({ file: item.concept, count: item.count }));
    const recentMemories = data.memories
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
    const importantDecisions = data.memories
      .filter(memory => memory.kind === 'decision' || memory.importance >= 8)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 8);

    return {
      generatedAt: new Date().toISOString(),
      totalMemories: data.memories.length,
      topConcepts,
      topFiles,
      recentMemories,
      importantDecisions
    };
  }

  async buildContext(query: string, budgetChars = 5000): Promise<string> {
    const profile = await this.buildProfile();
    const results = await this.search(query, 8);
    const chunks = [
      '<ini-brain-memory>',
      `Project memories: ${profile.totalMemories}`,
      profile.topConcepts.length ? `Top concepts: ${profile.topConcepts.map(x => `${x.concept} (${x.count})`).join(', ')}` : '',
      profile.importantDecisions.length ? `Important decisions:\n${profile.importantDecisions.map(formatMemoryLine).join('\n')}` : '',
      results.length ? `Relevant memories for "${query}":\n${results.map(result => `${formatMemoryLine(result.entry)} [score=${result.score}]`).join('\n')}` : '',
      '</ini-brain-memory>'
    ].filter(Boolean);

    const text = chunks.join('\n');
    return text.length <= budgetChars ? text : `${text.slice(0, budgetChars)}\n<!-- memory context truncated -->`;
  }

  private async readAll(): Promise<MemoryFile> {
    await fs.mkdir(this.brainDir, { recursive: true });
    try {
      const parsed = JSON.parse(await fs.readFile(this.memoriesPath, 'utf8')) as Partial<MemoryFile>;
      return {
        version: MEMORY_VERSION,
        generatedAt: parsed.generatedAt || new Date(0).toISOString(),
        memories: Array.isArray(parsed.memories) ? parsed.memories.map(normalizeEntry).filter(Boolean) as MemoryEntry[] : []
      };
    } catch {
      return { version: MEMORY_VERSION, generatedAt: new Date(0).toISOString(), memories: [] };
    }
  }

  private async writeAll(data: MemoryFile): Promise<void> {
    await fs.mkdir(this.brainDir, { recursive: true });
    // C1 fix: re-read the on-disk file and merge by id so concurrent writers
    // (the extension + the standalone MCP process) never silently drop each
    // other's memories. The in-memory `data` is treated as authoritative for
    // ids it knows about; unknown ids found on disk are preserved.
    const merged = await this.mergeWithDisk(data);
    const tmp = `${this.memoriesPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await fs.writeFile(tmp, JSON.stringify(merged, null, 2), 'utf8');
    await fs.rename(tmp, this.memoriesPath);
  }

  private async mergeWithDisk(data: MemoryFile): Promise<MemoryFile> {
    let onDisk: MemoryEntry[] = [];
    try {
      const parsed = JSON.parse(await fs.readFile(this.memoriesPath, 'utf8')) as Partial<MemoryFile>;
      onDisk = Array.isArray(parsed.memories) ? parsed.memories.map(normalizeEntry).filter(Boolean) as MemoryEntry[] : [];
    } catch {
      onDisk = [];
    }

    const byId = new Map<string, MemoryEntry>();
    // Disk entries first so in-memory edits override them, but unknown disk ids survive.
    for (const entry of onDisk) byId.set(entry.id, entry);
    for (const entry of data.memories) {
      const prev = byId.get(entry.id);
      byId.set(entry.id, prev ? mergeEntries(prev, entry) : entry);
    }

    const memories = [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return { version: MEMORY_VERSION, generatedAt: new Date().toISOString(), memories };
  }


  private generateId(): string {
    return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function parseCsvList(value: string | undefined): string[] {
  return normalizeList(value ? value.split(',') : []);
}

export function formatMemoryLine(entry: MemoryEntry): string {
  const meta = [entry.kind, `importance:${entry.importance}`, ...entry.files.slice(0, 3)].filter(Boolean).join(' | ');
  return `- (${meta}) ${entry.content.replace(/\s+/g, ' ').trim()}`;
}

function normalizeEntry(value: unknown): MemoryEntry | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const entry = value as Partial<MemoryEntry>;
  if (!entry.id || !entry.content) return undefined;
  const now = new Date().toISOString();
  return {
    id: String(entry.id),
    kind: isMemoryKind(entry.kind) ? entry.kind : 'note',
    content: String(entry.content),
    files: normalizeList(entry.files),
    concepts: normalizeList(entry.concepts),
    importance: clampImportance(entry.importance),
    source: isSource(entry.source) ? entry.source : 'manual',
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || entry.createdAt || now,
    accessCount: Number.isFinite(entry.accessCount) ? Number(entry.accessCount) : 0,
    lastAccessedAt: typeof entry.lastAccessedAt === 'string' ? entry.lastAccessedAt : undefined
  };
}

/**
 * Merge two versions of the same memory id (one from disk, one in-memory).
 * Keeps the newest editable content but never loses access counters.
 */
function mergeEntries(a: MemoryEntry, b: MemoryEntry): MemoryEntry {
  const newer = new Date(b.updatedAt).getTime() >= new Date(a.updatedAt).getTime() ? b : a;
  const lastAccessTimes = [a.lastAccessedAt, b.lastAccessedAt].filter(Boolean) as string[];
  return {
    ...newer,
    accessCount: Math.max(a.accessCount, b.accessCount),
    lastAccessedAt: lastAccessTimes.length
      ? lastAccessTimes.sort((x, y) => new Date(y).getTime() - new Date(x).getTime())[0]
      : undefined
  };
}


function scoreEntry(entry: MemoryEntry, terms: string[]): { score: number; matches: string[] } {
  const fields = {
    content: entry.content.toLowerCase(),
    files: entry.files.join(' ').toLowerCase(),
    concepts: entry.concepts.join(' ').toLowerCase(),
    kind: entry.kind.toLowerCase()
  };
  let score = entry.importance + Math.min(entry.accessCount, 10);
  const matches: string[] = [];

  for (const term of terms) {
    if (fields.content.includes(term)) { score += 8; matches.push(term); }
    if (fields.files.includes(term)) { score += 6; matches.push(`file:${term}`); }
    if (fields.concepts.includes(term)) { score += 7; matches.push(`concept:${term}`); }
    if (fields.kind.includes(term)) { score += 4; matches.push(`kind:${term}`); }
  }

  const ageMs = Date.now() - new Date(entry.createdAt).getTime();
  if (ageMs < 7 * 86_400_000) score += 5;
  if (matches.length === 0) score = 0;
  return { score, matches: [...new Set(matches)] };
}

function tokenize(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[^\p{L}\p{N}_./-]+/u).map(x => x.trim()).filter(x => x.length >= 2))];
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => String(item).trim()).filter(Boolean))].slice(0, 30);
}

function clampImportance(value: unknown): number {
  const n = Number(value ?? DEFAULT_IMPORTANCE);
  if (!Number.isFinite(n)) return DEFAULT_IMPORTANCE;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function countTop(items: string[]): Array<{ concept: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([concept, count]) => ({ concept, count }));
}

function isMemoryKind(value: unknown): value is MemoryKind {
  return typeof value === 'string' && ['fact', 'decision', 'preference', 'bug', 'workflow', 'session', 'note'].includes(value);
}

function isSource(value: unknown): value is MemoryEntry['source'] {
  return typeof value === 'string' && ['manual', 'ai', 'cline', 'system'].includes(value);
}