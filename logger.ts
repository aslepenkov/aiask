import fs from 'node:fs/promises';
import path from 'node:path';
import { getLogDir } from './config.js';

export async function log(input: string, output: string, enabled = true): Promise<void> {
  if (!enabled) return;
  const logDir = getLogDir();
  await fs.mkdir(logDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(logDir, `${date}.log`);

  await fs.appendFile(
    file,
    `${new Date().toISOString()}\nINPUT: ${input}\nOUTPUT: ${output}\n---\n`
  );
}
