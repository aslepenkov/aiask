import fs from 'node:fs/promises';
import { CAPIClient } from '@vscode/copilot-api';
import type { AIProvider } from './types.js';
import type { Config } from '../config.js';
import { getDataDir, getTokenFilePath } from '../config.js';

const CLIENT_ID = '01ab8ac9400c4e429b23';
const CLIENT_CONFIG = {
  machineId: 'cli',
  sessionId: 'cli-session',
  vscodeVersion: 'cli-vscode',
  buildType: 'prod' as const,
  name: 'AiAsk',
  version: '1.0.0'
};

export class CopilotProvider implements AIProvider {
  private async authenticate(): Promise<string> {
    console.log('Starting GitHub authentication...');
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        scope: 'repo'
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub auth failed: ${response.status}`);
    }

    const {
      device_code,
      user_code,
      verification_uri,
      interval = 5
    } = (await response.json()) as any;

    console.log(`\nOpen: ${verification_uri}`);
    console.log(`Code: ${user_code}\n`);

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, interval * 1000));

      const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        }
      );

      const data = (await tokenResponse.json()) as any;

      if (data.access_token) {
        await fs.mkdir(getDataDir(), { recursive: true });
        await fs.writeFile(getTokenFilePath(), data.access_token, { mode: 0o600 });
        console.log('Authentication successful.\n');
        return data.access_token;
      }

      if (data.error !== 'authorization_pending') {
        throw new Error(`GitHub auth error: ${data.error}`);
      }
    }

    throw new Error('Authentication timeout');
  }

  private async getGithubToken(): Promise<string> {
    try {
      return (await fs.readFile(getTokenFilePath(), 'utf8')).trim();
    } catch {
      return this.authenticate();
    }
  }

  private async getCopilotToken(githubToken: string): Promise<string> {
    const client = new CAPIClient(CLIENT_CONFIG, 'I accept terms', {
      fetch: async (url: string, options: any) =>
        fetch(url, {
          ...options,
          headers: { ...options?.headers, Authorization: `Bearer ${githubToken}` }
        }) as any
    });

    const response = await client.makeRequest<any>(
      { headers: { Authorization: `token ${githubToken}` } },
      { type: 'CopilotToken' }
    );

    const data = await response.json();
    if (!data.token) {
      throw new Error('Failed to obtain Copilot token');
    }

    return data.token;
  }

  async ask(prompt: string, config: Config): Promise<string> {
    const githubToken = await this.getGithubToken();
    const copilotToken = await this.getCopilotToken(githubToken);

    const client = new CAPIClient(CLIENT_CONFIG, 'I accept terms', {
      fetch: async (url: string, options: any) =>
        fetch(url, {
          ...options,
          headers: { ...options?.headers, Authorization: `Bearer ${copilotToken}` }
        }) as any
    });

    const response = await client.makeRequest<any>(
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: config.systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      },
      { type: 'ChatCompletions' }
    );

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? 'No response';
  }
}
