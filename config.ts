import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface Config {
  provider: string;
  model: string;
  systemPrompt: string;
  logging: boolean;
}

export function getDataDir(): string {
  return (
    process.env.DATA_DIR ??
    process.env.AIASK_DATA_DIR ??
    path.join(os.homedir(), '.aiask')
  );
}

export function getEnvPath(): string {
  return path.join(getDataDir(), '.env');
}

export function getTokenFilePath(): string {
  return path.join(getDataDir(), 'token');
}

export function getLogDir(): string {
  return path.join(getDataDir(), 'logs');
}

export const DATA_DIR = getDataDir();
export const ENV_PATH = getEnvPath();
export const TOKEN_FILE = getTokenFilePath();
export const LOG_DIR = getLogDir();

export function loadEnv(): void {
  try {
    const content = fs.readFileSync(getEnvPath(), 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*(?:export\s+)?([^#=\s]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();

      if (!/^['"].*['"]$/.test(value)) {
        value = value.split('#')[0].trim();
      }

      if (/^['"].*['"]$/.test(value)) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    // Config file is optional
  }
}

export function getConfig(): Config {
  loadEnv();

  const provider = (
    process.env.AIASK_PROVIDER ||
    process.env.PROVIDER ||
    (process.env.NIM_TOKEN || process.env.nim_token ? 'nim' : 'copilot')
  ).toLowerCase();

  const model =
    process.env.AIASK_MODEL ||
    process.env.NIM_MODEL ||
    process.env.nim_model ||
    (provider === 'nim' ? 'meta/llama-3.1-8b-instruct' : 'gpt-4');

  const systemPrompt =
    process.env.AIASK_SYSTEM_PROMPT ||
    process.env.SYSTEM_PROMPT ||
    'Answer shortly as an engineer would.';

  const logEnv = process.env.AIASK_LOGGING ?? process.env.LOGGING;
  const logging = logEnv ? logEnv.toLowerCase() !== 'false' && logEnv !== '0' : true;

  return { provider, model, systemPrompt, logging };
}
