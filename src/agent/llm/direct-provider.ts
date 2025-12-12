/**
 * Direct LLM Provider
 *
 * Calls OpenAI API directly (for Node.js environments like eval runner)
 * Only supports OpenAI provider for now.
 */

import { LLMProvider, LLMChatOptions, LLMResponse, LLMToolCall } from './types';
import { getModelCapabilities } from '../agentConfig';
import OpenAI from 'openai';

export class DirectProvider implements LLMProvider {
  name = 'direct-provider';
  private provider: string;
  private model: string;
  private openai: OpenAI;
  private maxTokensParam: 'max_tokens' | 'max_completion_tokens';

  constructor(provider: string, model: string) {
    this.provider = provider;
    this.model = model;

    // Only OpenAI supported for now
    if (provider !== 'openai') {
      throw new Error('DirectProvider only supports OpenAI provider for now. Got: ' + provider);
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for direct OpenAI calls');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Get model capabilities to use correct parameter names
    const capabilities = getModelCapabilities(model);
    this.maxTokensParam = capabilities.maxTokensParam || 'max_tokens';
  }

  async chat(options: LLMChatOptions): Promise<LLMResponse> {
    return this.chatOpenAI(options);
  }

  private async chatOpenAI(options: LLMChatOptions): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: this.model,
      messages: options.messages as OpenAI.Chat.ChatCompletionMessageParam[],
    };

    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
    }
    if (options.temperature) {
      params.temperature = options.temperature;
    }
    if (options.max_tokens) {
      // Use model-specific parameter name
      if (this.maxTokensParam === 'max_completion_tokens') {
        (params as any).max_completion_tokens = options.max_tokens;
      } else {
        params.max_tokens = options.max_tokens;
      }
    }
    if (options.tool_choice) {
      params.tool_choice = options.tool_choice;
    }

    const response = await this.openai.chat.completions.create(params);
    const choice = response.choices[0];

    return {
      content: choice.message.content,
      tool_calls: choice.message.tool_calls as LLMToolCall[] | undefined,
      finish_reason: choice.finish_reason as any,
    };
  }
}
