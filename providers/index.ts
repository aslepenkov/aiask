import type { AIProvider } from './types.js';
import { NimProvider } from './nim.js';
import { CopilotProvider } from './copilot.js';

export * from './types.js';
export { NimProvider, CopilotProvider };

const providers: Record<string, () => AIProvider> = {
  nim: () => new NimProvider(),
  copilot: () => new CopilotProvider()
};

export function getProvider(name: string): AIProvider {
  const key = name.toLowerCase();
  const factory = providers[key];
  if (!factory) {
    throw new Error(`Unsupported AI provider: ${name}`);
  }
  return factory();
}
