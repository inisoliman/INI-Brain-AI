import * as vscode from 'vscode';

export interface AiSettings {
  apiBaseUrl: string;
  apiKey?: string;
  modelName: string;
  hasApiKey: boolean;
}

export class SettingsService {
  private static readonly KEY = 'projectBrain.apiKey';

  constructor(private readonly context: vscode.ExtensionContext) {}

  async get(): Promise<AiSettings> {
    const cfg = vscode.workspace.getConfiguration('projectBrain');
    const apiKey = await this.context.secrets.get(SettingsService.KEY);
    return {
      apiBaseUrl: cfg.get('apiBaseUrl', 'https://api.puter.com/puterai/openai/v1/'),
      apiKey,
      hasApiKey: Boolean(apiKey),
      modelName: cfg.get('modelName', 'anthropic/claude-3-5-sonnet')
    };
  }

  async save(apiBaseUrl: string, modelName: string, apiKey?: string): Promise<void> {
    this.validate(apiBaseUrl, modelName);
    const cfg = vscode.workspace.getConfiguration('projectBrain');
    await cfg.update('apiBaseUrl', apiBaseUrl.trim(), vscode.ConfigurationTarget.Workspace);
    await cfg.update('modelName', modelName.trim(), vscode.ConfigurationTarget.Workspace);
    if (apiKey && apiKey.trim()) await this.context.secrets.store(SettingsService.KEY, apiKey.trim());
  }

  async clearApiKey(): Promise<void> {
    await this.context.secrets.delete(SettingsService.KEY);
  }

  private validate(apiBaseUrl: string, modelName: string): void {
    const base = apiBaseUrl.trim();
    if (!base) throw new Error('API Base URL مطلوب.');
    try {
      const parsed = new URL(base);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
    } catch {
      throw new Error('API Base URL غير صالح. استخدم رابط http أو https.');
    }
    if (!modelName.trim()) throw new Error('Model Name مطلوب.');
  }
}
