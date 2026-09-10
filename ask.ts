#!/usr/bin/env node

import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fetch } from 'undici';
import { CAPIClient } from '@vscode/copilot-api';

const DATA_DIR =
  process.env.AIASK_DATA_DIR ??
  path.join(os.homedir(), '.aiask');

const ENV_PATH = path.join(DATA_DIR, '.env');
const TOKEN_FILE = path.join(DATA_DIR, 'token');
const LOG_DIR = path.join(DATA_DIR, 'logs');

const CLIENT_ID = '01ab8ac9400c4e429b23';
const SYSTEM_PROMPT = 'Answer shortly as an engineer would.';

const CLIENT_CONFIG = {
  machineId: 'cli',
  sessionId: 'cli-session',
  vscodeVersion: 'cli-vscode',
  buildType: 'prod' as const,
  name: 'AiAsk',
  version: '1.0.0'
};

function loadEnv(): void {
  try {
    const content = readFileSync(ENV_PATH, 'utf8');

    for (const line of content.split('\n')) {
      const match = line.match(
        /^\s*(?:export\s+)?([^#=\s]+)\s*=\s*(.*)$/
      );

      if (!match) continue;

      const key = match[1];
      let value = match[2].trim();

      if (
        !(
          value.startsWith('"') && value.endsWith('"')
        ) &&
        !(
          value.startsWith("'") && value.endsWith("'")
        )
      ) {
        value = value.split('#')[0].trim();
      }

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    // Config is optional.
  }
}

async function log(input: string, output: string): Promise<void> {
  await fs.mkdir(LOG_DIR, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(LOG_DIR, `${date}.log`);

  await fs.appendFile(
    file,
    `${new Date().toISOString()}\nINPUT: ${input}\nOUTPUT: ${output}\n---\n`
  );
}

async function getGithubToken(): Promise<string> {
  try {
    return (await fs.readFile(TOKEN_FILE, 'utf8')).trim();
  } catch {
    return authenticate();
  }
}

async function authenticate(): Promise<string> {
  console.log('Starting GitHub authentication...');

  const response = await fetch(
    'https://github.com/login/device/code',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        scope: 'repo'
      })
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub auth failed: ${response.status}`);
  }

  const {
    device_code,
    user_code,
    verification_uri,
    interval = 5
  } = await response.json() as any;

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
          grant_type:
            'urn:ietf:params:oauth:grant-type:device_code'
        })
      }
    );

    const data = await tokenResponse.json() as any;

    if (data.access_token) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(TOKEN_FILE, data.access_token, {
        mode: 0o600
      });

      console.log('Authentication successful.\n');

      return data.access_token;
    }

    if (data.error !== 'authorization_pending') {
      throw new Error(`GitHub auth error: ${data.error}`);
    }
  }

  throw new Error('Authentication timeout');
}

async function getCopilotToken(
  githubToken: string
): Promise<string> {
  const client = new CAPIClient(
    CLIENT_CONFIG,
    'I accept terms',
    {
      fetch: async (url: string, options: any) => {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            Authorization: `Bearer ${githubToken}`
          }
        });

        return response as any;
      }
    }
  );

  const response = await client.makeRequest<any>(
    {
      headers: {
        Authorization: `token ${githubToken}`
      }
    },
    {
      type: 'CopilotToken'
    }
  );

  const data = await response.json();

  if (!data.token) {
    throw new Error('Failed to obtain Copilot token');
  }

  return data.token;
}

async function getModel(): Promise<string> {
  return (
    process.env.NIM_MODEL ||
    process.env.nim_model ||
    'meta/llama-3.1-8b-instruct'
  );
}

async function setModel(model: string): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  let content = '';

  try {
    content = await fs.readFile(ENV_PATH, 'utf8');
  } catch {}

  const lines = content
    .split('\n')
    .filter(line => !/^\s*(?:export\s+)?NIM_MODEL\s*=/.test(line));

  lines.push(`NIM_MODEL=${model}`);

  await fs.writeFile(
    ENV_PATH,
    lines.join('\n'),
    'utf8'
  );

  process.env.NIM_MODEL = model;
}

async function askNim(prompt: string): Promise<string> {
  const token =
    process.env.NIM_TOKEN ||
    process.env.nim_token;

  if (!token) {
    throw new Error('NIM_TOKEN is not configured');
  }

  const baseUrl =
    process.env.NIM_BASE_URL ||
    process.env.nim_base_url ||
    'https://integrate.api.nvidia.com/v1';

  const response = await fetch(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        model: await getModel(),
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `NIM API error ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json() as any;

  return data.choices?.[0]?.message?.content ?? 'No response';
}

async function askCopilot(prompt: string): Promise<string> {
  const githubToken = await getGithubToken();
  const copilotToken = await getCopilotToken(githubToken);

  const client = new CAPIClient(
    CLIENT_CONFIG,
    'I accept terms',
    {
      fetch: async (url: string, options: any) => {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            Authorization: `Bearer ${copilotToken}`
          }
        });

        return response as any;
      }
    }
  );

  const response = await client.makeRequest<any>(
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    },
    {
      type: 'ChatCompletions'
    }
  );

  const data = await response.json();

  return data.choices?.[0]?.message?.content ?? 'No response';
}

async function ask(prompt: string): Promise<void> {
  console.log(`\nAsking: ${prompt}\n`);

  const answer = process.env.NIM_TOKEN
    ? await askNim(prompt)
    : await askCopilot(prompt);

  console.log(answer);

  await log(prompt, answer);
}

async function main(): Promise<void> {
  loadEnv();

  const args = process.argv.slice(2);

  if (args[0] === 'model') {
    if (!args[1]) {
      console.log(await getModel());
      return;
    }

    await setModel(args[1]);
    console.log(`Model set to: ${args[1]}`);
    return;
  }

  if (!args.length) {
    console.log(`
Usage:
  aiask "your question"
  aiask model
  aiask model <model-name>
`);
    return;
  }

  await ask(args.join(' '));
}

main().catch(error => {
  console.error(`\nError: ${error.message}`);
  process.exitCode = 1;
});