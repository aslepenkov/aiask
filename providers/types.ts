import type { Config } from '../config.js';

export interface AIProvider {
  ask(prompt: string, config: Config): Promise<string>;
}
