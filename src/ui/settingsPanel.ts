import * as vscode from 'vscode';
import { SettingsService } from '../storage/settingsService';

export class SettingsPanel {
  static async show(context: vscode.ExtensionContext, settings: SettingsService): Promise<void> {
    const panel = vscode.window.createWebviewPanel('projectBrainSettings', 'INI Brain AI Settings', vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true
    });

    const current = await settings.get();
    panel.webview.html = this.html(panel.webview, current.apiBaseUrl, current.modelName, current.hasApiKey);

    panel.webview.onDidReceiveMessage(async msg => {
      try {
        if (msg.type === 'save') {
          await settings.save(String(msg.apiBaseUrl || ''), String(msg.modelName || ''), String(msg.apiKey || ''));
          vscode.window.showInformationMessage('INI Brain AI settings saved securely.');
          panel.webview.postMessage({ type: 'saved' });
        }
        if (msg.type === 'clearKey') {
          await settings.clearApiKey();
          vscode.window.showInformationMessage('INI Brain AI API key removed from SecretStorage.');
          panel.webview.html = this.html(panel.webview, String(msg.apiBaseUrl || ''), String(msg.modelName || ''), false);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(message);
        panel.webview.postMessage({ type: 'error', message });
      }
    }, undefined, context.subscriptions);
  }

  private static html(webview: vscode.Webview, base: string, model: string, hasKey: boolean): string {
    const nonce = getNonce();
    const csp = `default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';`;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>INI Brain AI Settings</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 24px; max-width: 820px; }
  label { display:block; margin-top: 16px; font-weight: 600; }
  input { box-sizing: border-box; width: 100%; padding: 8px; margin-top: 6px; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); }
  button { margin-top: 18px; margin-right: 8px; padding: 8px 14px; cursor: pointer; }
  .primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; }
  .danger { background: var(--vscode-inputValidation-errorBackground); color: var(--vscode-foreground); border: 1px solid var(--vscode-inputValidation-errorBorder); }
  .hint { opacity: 0.85; font-size: 12px; }
  .status { margin-top: 14px; }
</style>
</head>
<body>
  <h1>🧠 INI Brain AI Settings</h1>
  <p class="hint">API Key is stored only in VS Code SecretStorage. It is never written to workspace settings or .brain files.</p>

  <label for="base">API Base URL</label>
  <input id="base" value="${esc(base)}" placeholder="https://api.puter.com/puterai/openai/v1/">

  <label for="key">API Key ${hasKey ? '(saved securely)' : '(not set)'}</label>
  <input id="key" type="password" placeholder="Paste a new key only if you want to replace the saved one">
  <p class="hint">Leave blank to keep the existing key.</p>

  <label for="model">Model Name</label>
  <input id="model" value="${esc(model)}" placeholder="anthropic/claude-3-5-sonnet">

  <button id="save" class="primary">Save Settings</button>
  <button id="clear" class="danger">Clear API Key</button>
  <div id="status" class="status"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const base = document.getElementById('base');
    const key = document.getElementById('key');
    const model = document.getElementById('model');
    const status = document.getElementById('status');
    document.getElementById('save').addEventListener('click', () => {
      vscode.postMessage({ type: 'save', apiBaseUrl: base.value, apiKey: key.value, modelName: model.value });
    });
    document.getElementById('clear').addEventListener('click', () => {
      vscode.postMessage({ type: 'clearKey', apiBaseUrl: base.value, modelName: model.value });
    });
    window.addEventListener('message', event => {
      if (event.data.type === 'saved') status.textContent = 'Saved successfully.';
      if (event.data.type === 'error') status.textContent = event.data.message;
    });
  </script>
</body>
</html>`;
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  return nonce;
}
