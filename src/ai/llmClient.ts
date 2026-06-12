import { AiSettings } from '../storage/settingsService';

export class LlmClient {
  constructor(private readonly settings: AiSettings) {}

  async chat(system: string, user: string): Promise<string> {
    if (!this.settings.apiKey) throw new Error('API Key غير مضبوط. افتح INI Brain: Settings أولاً.');

    const base = this.settings.apiBaseUrl.endsWith('/') ? this.settings.apiBaseUrl : this.settings.apiBaseUrl + '/';
    const url = new URL('chat/completions', base).toString();

    // H3 fix: bound the request with an AbortController + configurable timeout so a
    // hung provider cannot block the command indefinitely.
    const timeoutMs = this.settings.requestTimeoutMs && this.settings.requestTimeoutMs > 0 ? this.settings.requestTimeoutMs : 120_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.settings.apiKey}` },
        body: JSON.stringify({
          model: this.settings.modelName,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.2
        }),
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`AI API failed ${res.status}: ${await res.text()}`);
      const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content?.trim() || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`AI request timed out after ${Math.round(timeoutMs / 1000)}s. Increase projectBrain.requestTimeoutMs or check your provider.`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
