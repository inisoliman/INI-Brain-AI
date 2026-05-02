import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainData, FileRecord } from '../types';

export interface ContextBuildResult {
  context: string;
  selectedFiles: string[];
  totalBytes: number;
}

export class ContextBuilder {
  constructor(private readonly root: string) {}

  async build(brain: BrainData, request: string, maxFiles: number): Promise<ContextBuildResult> {
    const ranked = this.rank(Object.values(brain.fileIndex), request);
    const selected = ranked.slice(0, maxFiles);
    const selectedFiles: string[] = [];
    const chunks: string[] = [];
    let totalBytes = 0;

    chunks.push(`## Request\n${request}`);
    chunks.push(`## Project Map\n${JSON.stringify(brain.projectMap, null, 2)}`);
    chunks.push(`## Architecture Snapshot\n${brain.architecture}`);
    chunks.push(`## AI Memory\n${brain.aiContext.slice(0, 8000)}`);

    for (const record of selected) {
      const snippet = await this.fileSnippet(record);
      selectedFiles.push(record.path);
      totalBytes += Buffer.byteLength(snippet, 'utf8');
      chunks.push(`## Relevant File: ${record.path}\nLanguage: ${record.language}\nExports: ${record.exports.join(', ') || 'none'}\nImports: ${record.imports.slice(0, 20).join(', ') || 'none'}\nSummary:\n${record.summary || ''}\n\nSnippet:\n${snippet}`);
    }

    chunks.push(`## Context Rules\n- Prefer minimal diffs.\n- Keep changes compatible with the existing workspace.\n- If files must be written, return a fenced JSON block with {\"changes\": [{\"path\",\"action\",\"content\"}]}.`);

    return { context: chunks.join('\n\n---\n\n'), selectedFiles, totalBytes };
  }

  private rank(records: FileRecord[], request: string): FileRecord[] {
    const query = request.toLowerCase().split(/\W+/).filter(Boolean);
    return records
      .map(record => ({
        record,
        score: this.scoreRecord(record, query)
      }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.record);
  }

  private scoreRecord(record: FileRecord, query: string[]): number {
    let score = 0;
    if (Date.now() - record.modifiedAt < 86_400_000) score += 8;
    if (/(^|\/)(package\.json|tsconfig\.json|composer\.json|pyproject\.toml|requirements\.txt|src\/|app\/|extension\.ts)$/i.test(record.path)) score += 12;
    if (/\.d\.ts$/i.test(record.path)) score += 4;
    if (record.exports.length) score += Math.min(record.exports.length, 10);
    if (record.imports.length) score += Math.min(record.imports.length, 6);

    const text = `${record.path} ${record.summary || ''} ${record.exports.join(' ')} ${record.imports.join(' ')}`.toLowerCase();
    for (const term of query) {
      if (text.includes(term)) score += 3;
    }
    return score;
  }

  private async fileSnippet(record: FileRecord): Promise<string> {
    const abs = path.join(this.root, record.path);
    const content = await fs.readFile(abs, 'utf8').catch(() => record.summary || '');
    const maxChars = 10_000;
    if (content.length <= maxChars) return content;
    return `${content.slice(0, 5000)}\n/* ... middle omitted for token budget ... */\n${content.slice(-3000)}`;
  }
}
