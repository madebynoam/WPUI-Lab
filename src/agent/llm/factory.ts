import { LLMProvider, LLMConfig } from './types';
import { OpenAIProvider } from './openai';

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model);

    case 'anthropic':
      // TODO: Implement AnthropicProvider when needed
      throw new Error('Anthropic provider not yet implemented');

    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}
