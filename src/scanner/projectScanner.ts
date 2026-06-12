import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { FileRecord } from '../types';
import { detectLanguage, isIgnoredPath, isIgnoredSegment, isTextLike, normalizePath } from '../utils/pathUtils';

const MAX_FILE_BYTES = 1024 * 1024 * 2; // 2MB keeps scans responsive on very large repositories.
const MAX_PARALLEL_READS = 24;
const MAX_INDEXED_FILES = 100_000;

export interface ScanStats {
  discoveredFiles: number;
  indexedFiles: number;
  skippedLargeFiles: number;
  skippedUnreadableFiles: number;
}

/**
 * ProjectScanner recursively indexes text/source files and extracts lightweight module relationships.
 * It is intentionally dependency-free and bounded by file-size/concurrency limits for large projects.
 */
export class ProjectScanner {
  private stats: ScanStats = { discoveredFiles: 0, indexedFiles: 0, skippedLargeFiles: 0, skippedUnreadableFiles: 0 };

  constructor(private readonly root: string) {}

  getStats(): ScanStats {
    return { ...this.stats };
  }

  async scan(existing: Record<string, FileRecord> = {}): Promise<Record<string, FileRecord>> {
    this.stats = { discoveredFiles: 0, indexedFiles: 0, skippedLargeFiles: 0, skippedUnreadableFiles: 0 };
    const files = await this.walk(this.root);
    const next: Record<string, FileRecord> = {};

    for (let i = 0; i < files.length; i += MAX_PARALLEL_READS) {
      const batch = files.slice(i, i + MAX_PARALLEL_READS);
      const records = await Promise.all(batch.map(abs => this.scanFile(abs, existing)));
      for (const record of records) {
        if (record) next[record.path] = record;
      }
    }

    this.stats.indexedFiles = Object.keys(next).length;
    return next;
  }

  async scanSingle(absPath: string, existing?: FileRecord): Promise<FileRecord | undefined> {
    if (!this.isCandidate(absPath)) return undefined;
    return this.scanFile(absPath, existing ? { [normalizePath(path.relative(this.root, absPath))]: existing } : {});
  }

  private async scanFile(abs: string, existing: Record<string, FileRecord>): Promise<FileRecord | undefined> {
    try {
      const stat = await fs.stat(abs);
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES) {
        if (stat.size > MAX_FILE_BYTES) this.stats.skippedLargeFiles += 1;
        return undefined;
      }

      const rel = normalizePath(path.relative(this.root, abs));
      const content = await fs.readFile(abs, 'utf8');
      const hash = createHash('sha256').update(content).digest('hex');
      const old = existing[rel];
      if (old && old.hash === hash && old.size === stat.size) return old;
      return this.analyzeFile(rel, content, stat.size, hash, stat.mtimeMs);
    } catch {
      this.stats.skippedUnreadableFiles += 1;
      return undefined;
    }
  }

  private analyzeFile(rel: string, content: string, size: number, hash: string, modifiedAt: number): FileRecord {
    return {
      path: rel,
      language: detectLanguage(rel),
      size,
      hash,
      modifiedAt,
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      summary: this.summarize(content)
    };
  }

  private async walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return out;
    }

    for (const e of entries) {
      if (isIgnoredSegment(e.name) || out.length >= MAX_INDEXED_FILES) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        out.push(...await this.walk(abs));
      } else if (e.isFile() && this.isCandidate(abs)) {
        this.stats.discoveredFiles += 1;
        out.push(abs);
      }
    }
    return out.slice(0, MAX_INDEXED_FILES);
  }

  private isCandidate(absPath: string): boolean {
    return this.isInsideRoot(absPath) && !isIgnoredPath(absPath) && isTextLike(absPath);
  }

  // H1 fix: a plain startsWith(root) wrongly matches sibling dirs like `root-backup`.
  // Require an exact match or a real path-separator boundary.
  private isInsideRoot(absPath: string): boolean {
    if (absPath === this.root) return true;
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`;
    return absPath.startsWith(rootWithSep);
  }


  private extractImports(content: string): string[] {
    const found = new Set<string>();
    const patterns = [
      /import\s+(?:[^'\"]+from\s+)?['\"]([^'\"]+)['\"]/g,
      /export\s+[^'\"]*from\s+['\"]([^'\"]+)['\"]/g,
      /require\(['\"]([^'\"]+)['\"]\)/g,
      /from\s+['\"]([^'\"]+)['\"]/g,
      /include(?:_once)?\s+["']([^"']+)["']/g,
      /require(?:_once)?\s+["']([^"']+)["']/g,
      /^\s*from\s+([A-Za-z0-9_.]+)\s+import\s+/gm,
      /^\s*import\s+([A-Za-z0-9_.]+)/gm
    ];

    for (const re of patterns) {
      for (const m of content.matchAll(re)) {
        if (m[1]) found.add(m[1]);
      }
    }
    return [...found].slice(0, 300);
  }

  private extractExports(content: string): string[] {
    const found = new Set<string>();
    const patterns = [
      /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+([A-Za-z0-9_$]+)/g,
      /module\.exports\.([A-Za-z0-9_$]+)/g,
      /^\s*def\s+([A-Za-z0-9_]+)\s*\(/gm,
      /^\s*class\s+([A-Za-z0-9_]+)\s*[:\(]/gm,
      /^\s*(?:public|private|protected)?\s*function\s+([A-Za-z0-9_]+)\s*\(/gm
    ];
    for (const re of patterns) {
      for (const m of content.matchAll(re)) {
        if (m[1]) found.add(m[1]);
      }
    }
    return [...found].slice(0, 300);
  }

  private summarize(content: string): string {
    const cleaned = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//') && !l.startsWith('#'))
      .slice(0, 40)
      .join('\n');
    return cleaned.length > 2200 ? `${cleaned.slice(0, 2200)}\n…` : cleaned;
  }
}

export function getWorkspaceRoot(): string {
  // Lazy-load vscode so scanner/brain modules can be tested with plain Node.js.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vscode = require('vscode') as typeof import('vscode');
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) throw new Error('افتح مجلد مشروع أولاً لاستخدام INI Brain AI.');
  return folder.uri.fsPath;
}

