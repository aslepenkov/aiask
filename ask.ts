#!/usr/bin/env node

import fs from 'node:fs/promises';
import { getDataDir, getEnvPath, getConfig } from './config.js';
import { log } from './logger.js';
import { getProvider } from './providers/index.js';

export async function getModel(): Promise<string> {
  return getConfig().model;
}

export async function setModel(model: string): Promise<void> {
  await fs.mkdir(getDataDir(), { recursive: true });

  let content = '';
  try {
    content = await fs.readFile(getEnvPath(), 'utf8');
  } catch {}

  const lines = content
    .split('\n')
    .filter(line => !/^\s*(?:export\s+)?(NIM_MODEL|AIASK_MODEL)\s*=/.test(line));

  lines.push(`NIM_MODEL=${model}`);

  await fs.writeFile(getEnvPath(), lines.join('\n'), 'utf8');
  process.env.NIM_MODEL = model;
  process.env.AIASK_MODEL = model;
}

export async function handleCli(args: string[]): Promise<void> {
  const config = getConfig();

  if (args[0] === 'model') {
    if (!args[1]) {
      console.log(await getModel());
      return;
    }
    await setModel(args[1]);
    console.log(`Model successfully set to: ${args[1]}`);
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

  const prompt = args.join(' ');
  console.log(`\nAsking: ${prompt}\n`);

  const provider = getProvider(config.provider);
  const answer = await provider.ask(prompt, config);

  console.log(answer);
  await log(prompt, answer, config.logging);
}

async function main(): Promise<void> {
  await handleCli(process.argv.slice(2));
}

if (process.env.NODE_ENV !== 'test') {
  main().catch(error => {
    console.error(`\nError: ${error.message}`);
    process.exitCode = 1;
  });
}
