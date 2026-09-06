import type { AIProvider } from './types.js';
import type { Config } from '../config.js';

export class NimProvider implements AIProvider {
  async ask(prompt: string, config: Config): Promise<string> {
    const token = process.env.NIM_TOKEN || process.env.nim_token;
    if (!token) throw new Error('NIM_TOKEN is not configured');

    const baseUrl =
      process.env.NIM_BASE_URL ||
      process.env.nim_base_url ||
      'https://integrate.api.nvidia.com/v1';

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!res.ok) {
      throw new Error(`NIM API error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content ?? 'No response';
  }
}
