// LLM Provider abstraction types

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string; // For tool responses
  tool_call_id?: string; // For tool responses
  tool_calls?: LLMToolCall[]; // For assistant messages with tool calls
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface LLMResponse {
  content: string | null;
  tool_calls?: LLMToolCall[];
  finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

export interface LLMChatOptions {
  messages: LLMMessage[];
  tools?: LLMTool[];
  temperature?: number;
  max_tokens?: number;
  tool_choice?: 'auto' | 'required' | 'none';
  signal?: AbortSignal;
}

export interface LLMProvider {
  name: string;
  chat(options: LLMChatOptions): Promise<LLMResponse>;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}
