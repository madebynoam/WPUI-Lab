import { LLMProvider, LLMConfig } from './types';
import { NextJSProxyProvider } from './nextjs-proxy';

export function createLLMProvider(config: LLMConfig): LLMProvider {
  // Use Next.js proxy provider to keep API keys secure on server
  return new NextJSProxyProvider(config.provider);
}
