import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainData, FileRecord } from '../types';
import { ProjectScanner, ScanStats } from '../scanner/projectScanner';
import { BrainStore, buildAiContext, buildArchitectureMarkdown, buildDependencyGraph, buildProjectMap } from './brainStore';

export class BrainManager {
  readonly store: BrainStore;
  private scanner: ProjectScanner;

  constructor(private readonly root: string) {
    this.store = new BrainStore(root);
    this.scanner = new ProjectScanner(root);
  }

  getScanStats(): ScanStats {
    return this.scanner.getStats();
  }

  async scanIncremental(): Promise<BrainData> {
    const existing = await this.store.readFileIndex();
    return this.persist(await this.scanner.scan(existing), false);
  }

  async rebuild(): Promise<BrainData> {
    return this.persist(await this.scanner.scan({}), true);
  }

  async updateFile(absPath: string): Promise<BrainData> {
    const index = await this.store.readFileIndex();
    const rel = path.relative(this.root, absPath).split(path.sep).join('/');
    const record = await this.scanner.scanSingle(absPath, index[rel]);
    if (record) index[record.path] = record;
    return this.persist(index);
  }

  async removeFile(absPath: string): Promise<BrainData> {
    const index = await this.store.readFileIndex();
    const rel = path.relative(this.root, absPath).split(path.sep).join('/');
    delete index[rel];
    return this.persist(index);
  }

  /**
   * H4 fix: apply a whole batch of file watcher changes against a single
   * in-memory index, then persist ONCE. Previously each changed file triggered
   * a full project_map + dependency graph + architecture rebuild + disk write.
   */
  async applyBatch(changes: Array<{ absPath: string; kind: 'change' | 'delete' }>): Promise<BrainData | undefined> {
    if (changes.length === 0) return undefined;
    const index = await this.store.readFileIndex();
    let mutated = false;

    for (const { absPath, kind } of changes) {
      const rel = path.relative(this.root, absPath).split(path.sep).join('/');
      if (kind === 'delete') {
        if (index[rel]) { delete index[rel]; mutated = true; }
      } else {
        const record = await this.scanner.scanSingle(absPath, index[rel]);
        if (record) { index[record.path] = record; mutated = true; }
      }
    }

    if (!mutated) return undefined;
    return this.persist(index);
  }


  async getBrain(): Promise<BrainData> {
    await this.store.ensure();
    return this.store.readBrain();
  }

  async isWorkspaceEmpty(): Promise<boolean> {
    const entries = await fs.readdir(this.root).catch(() => []);
    return entries.filter(e => e !== '.brain' && e !== '.git').length === 0;
  }

  private async persist(index: Record<string, FileRecord>, fullScan = false): Promise<BrainData> {
    const projectMap = buildProjectMap(this.root, index);
    const dependencies = buildDependencyGraph(index);
    const data: BrainData = {
      projectMap,
      fileIndex: index,
      dependencies,
      architecture: buildArchitectureMarkdown(projectMap, dependencies),
      aiContext: buildAiContext(projectMap, index)
    };
    await this.store.writeAll(data, fullScan);
    return data;
  }
}
