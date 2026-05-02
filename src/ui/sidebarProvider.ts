import * as vscode from 'vscode';
import { BrainStatus } from '../types';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private status: BrainStatus = 'Ready';
  private lines: string[] = [];

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.html();
    view.webview.onDidReceiveMessage(msg => {
      if (msg.command === 'clearConsole') {
        this.lines = [];
        this.refresh();
        return;
      }
      if (msg.command === 'refresh') {
        this.refresh();
        return;
      }
      if (msg.command) void vscode.commands.executeCommand(msg.command);
    });
  }

  setStatus(status: BrainStatus): void {
    this.status = status;
    this.refresh();
  }

  log(line: string): void {
    this.lines.unshift(`[${new Date().toLocaleTimeString()}] ${line}`);
    this.lines = this.lines.slice(0, 100);
    this.refresh();
  }

  clear(): void {
    this.lines = [];
    this.refresh();
  }

  private refresh(): void {
    if (this.view) this.view.webview.html = this.html();
  }

  private html(): string {
    const nonce = getNonce();
    const statusClass = this.status.toLowerCase().replace(/\s+/g, '-');
    const buttons = [
      ['Scan Project', 'projectBrain.scanProject', 'primary'],
      ['Rebuild Brain', 'projectBrain.rebuildBrain', 'secondary'],
      ['Ask AI', 'projectBrain.askAI', 'secondary'],
      ['Auto Mode', 'projectBrain.autoMode', 'secondary'],
      ['Generate Project', 'projectBrain.generateProject', 'primary'],
      ['Agent Guide', 'projectBrain.generateAgentGuide', 'secondary'],
      ['Copy for Cline', 'projectBrain.copyContextForCline', 'secondary'],
      ['Settings', 'projectBrain.openSettings', 'secondary']
    ].map(([label, command, kind]) => `<button class="btn ${kind}" data-command="${command}">${label}</button>`).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: light dark; }
    body { font-family: var(--vscode-font-family); padding: 12px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .title { display: flex; flex-direction: column; gap: 4px; }
    h2 { margin: 0; font-size: 15px; }
    .subtitle { font-size: 12px; opacity: 0.8; }
    .status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 4px 10px; border-radius: 999px; border: 1px solid transparent; }
    .status::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; display: inline-block; }
    .status.ready { color: #16a34a; background: rgba(22,163,74,0.12); }
    .status.scanning { color: #f59e0b; background: rgba(245,158,11,0.12); }
    .status.ai-working { color: #7c3aed; background: rgba(124,58,237,0.12); }
    .status.error { color: #ef4444; background: rgba(239,68,68,0.12); }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
    .btn { padding: 8px 10px; border-radius: 6px; border: 1px solid var(--vscode-button-border, transparent); cursor: pointer; font-size: 12px; }
    .btn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .btn.secondary { background: var(--vscode-button-secondaryBackground, transparent); color: var(--vscode-button-secondaryForeground, var(--vscode-foreground)); }
    .toolbar { display: flex; gap: 8px; margin-top: 10px; }
    .toolbar .btn { flex: 1; }
    .console { margin-top: 12px; border-top: 1px solid var(--vscode-panel-border); padding-top: 10px; }
    .console-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
    .console-title { font-size: 12px; font-weight: 600; opacity: 0.85; }
    .log { white-space: pre-wrap; font-size: 12px; line-height: 1.45; max-height: 420px; overflow-y: auto; padding: 8px; border: 1px solid var(--vscode-panel-border); border-radius: 8px; background: var(--vscode-editor-background); }
    .empty { opacity: 0.7; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <h2>🧠 INI Brain AI</h2>
      <div class="subtitle">Autonomous project understanding and evolution</div>
    </div>
    <div class="status ${statusClass}">${this.status}</div>
  </div>

  <div class="actions">
    ${buttons}
  </div>

  <div class="toolbar">
    <button class="btn secondary" data-command="refresh">Refresh</button>
    <button class="btn secondary" data-command="clearConsole">Clear Console</button>
  </div>

  <div class="console">
    <div class="console-header">
      <div class="console-title">Output Console</div>
      <div class="subtitle">${this.lines.length} entries</div>
    </div>
    <div class="log">${this.lines.length ? this.lines.map(escapeHtml).join('\n') : '<span class="empty">No logs yet. Run Scan or Ask AI to get started.</span>'}</div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('button[data-command]').forEach(button => {
      button.addEventListener('click', () => {
        const command = button.getAttribute('data-command');
        if (command) vscode.postMessage({ command });
      });
    });
  </script>
</body>
</html>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  return nonce;
}
