import { LLMProvider, LLMConfig } from './types';
import { NextJSProxyProvider } from './nextjs-proxy';

const isBrowser = typeof window !== 'undefined';

export async function createLLMProvider(config: LLMConfig): Promise<LLMProvider> {
  if (!config.model) {
    throw new Error('Model is required in LLM configuration');
  }

  // In browser: use Next.js proxy to keep API keys secure
  // In Node.js: use direct API calls (for eval runner)
  if (isBrowser) {
    return new NextJSProxyProvider(config.provider, config.model);
  } else {
    // Dynamic import for Node.js-only module (ESM compatible)
    const { DirectProvider } = await import('./direct-provider');
    return new DirectProvider(config.provider, config.model);
  }
}
