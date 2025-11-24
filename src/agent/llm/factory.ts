import { LLMProvider, LLMConfig } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model);

    case 'anthropic':
      return new AnthropicProvider(config.apiKey, config.model);

    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}
