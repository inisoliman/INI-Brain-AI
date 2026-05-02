import * as vscode from 'vscode';
import { isIgnoredPath, isTextLike } from '../utils/pathUtils';
import { BrainManager } from './brainManager';

export class BrainFileWatcher implements vscode.Disposable {
  private watcher?: vscode.FileSystemWatcher;
  private timer?: NodeJS.Timeout;
  private pending = new Map<string, 'change' | 'delete'>();

  constructor(
    private readonly manager: BrainManager,
    private readonly onDidUpdate: () => void,
    private readonly onError: (e: unknown) => void
  ) {}

  start(): void {
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);
    this.watcher.onDidCreate(uri => this.queue(uri.fsPath, 'change'));
    this.watcher.onDidChange(uri => this.queue(uri.fsPath, 'change'));
    this.watcher.onDidDelete(uri => this.queue(uri.fsPath, 'delete'));
  }

  private queue(file: string, kind: 'change' | 'delete'): void {
    if (isIgnoredPath(file) || (kind !== 'delete' && !isTextLike(file))) return;
    this.pending.set(file, kind);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 800);
  }

  private async flush(): Promise<void> {
    const batch = [...this.pending.entries()];
    this.pending.clear();
    try {
      for (const [file, kind] of batch) {
        if (kind === 'delete') await this.manager.removeFile(file);
        else await this.manager.updateFile(file);
      }
      this.onDidUpdate();
    } catch (e) {
      this.onError(e);
    }
  }

  dispose(): void {
    this.watcher?.dispose();
    if (this.timer) clearTimeout(this.timer);
  }
}
