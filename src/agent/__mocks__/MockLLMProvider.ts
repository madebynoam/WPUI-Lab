/**
 * Mock LLM Provider for Testing
 *
 * Simulates LLM responses without making actual API calls.
 * Zero cost, instant responses, full control over outputs.
 */

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface MockLLMResponse {
  content?: string;
  tool_calls?: ToolCall[];
  finish_reason: 'stop' | 'tool_calls';
}

export interface MockLLMOptions {
  responses?: MockLLMResponse[];
  delay?: number;
}

export class MockLLMProvider {
  private responses: MockLLMResponse[];
  private callIndex: number = 0;
  private delay: number;
  public calls: Array<{
    messages: any[];
    tools?: any[];
    model?: string;
    temperature?: number;
  }> = [];

  constructor(options: MockLLMOptions = {}) {
    this.responses = options.responses || [];
    this.delay = options.delay || 0;
  }

  /**
   * Set responses to return in sequence
   */
  setResponses(responses: MockLLMResponse[]): void {
    this.responses = responses;
    this.callIndex = 0;
  }

  /**
   * Add a single response to the queue
   */
  addResponse(response: MockLLMResponse): void {
    this.responses.push(response);
  }

  /**
   * Mock chat completion
   */
  async chat(params: {
    messages: any[];
    tools?: any[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<MockLLMResponse> {
    // Track the call
    this.calls.push({
      messages: params.messages,
      tools: params.tools,
      model: params.model,
      temperature: params.temperature,
    });

    // Simulate delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    // Return next response in queue
    if (this.callIndex < this.responses.length) {
      const response = this.responses[this.callIndex];
      this.callIndex++;
      return response;
    }

    // Default response if no more queued
    return {
      content: 'Mock response',
      finish_reason: 'stop',
    };
  }

  /**
   * Get call history
   */
  getCalls(): typeof this.calls {
    return this.calls;
  }

  /**
   * Get specific call
   */
  getCall(index: number): typeof this.calls[0] | undefined {
    return this.calls[index];
  }

  /**
   * Get last call
   */
  getLastCall(): typeof this.calls[0] | undefined {
    return this.calls[this.calls.length - 1];
  }

  /**
   * Reset call history
   */
  reset(): void {
    this.calls = [];
    this.callIndex = 0;
  }

  /**
   * Check if specific tool was called
   */
  wasToolCalled(toolName: string): boolean {
    return this.calls.some(call => {
      const response = this.responses[this.calls.indexOf(call)];
      return response?.tool_calls?.some(tc => tc.function.name === toolName);
    });
  }

  /**
   * Get all tool calls made
   */
  getAllToolCalls(): ToolCall[] {
    return this.responses
      .filter(r => r.tool_calls)
      .flatMap(r => r.tool_calls || []);
  }
}

/**
 * Helper: Create tool call response
 */
export function createToolCallResponse(
  toolName: string,
  args: any
): MockLLMResponse {
  return {
    tool_calls: [
      {
        id: `call-${Date.now()}`,
        type: 'function',
        function: {
          name: toolName,
          arguments: JSON.stringify(args),
        },
      },
    ],
    finish_reason: 'tool_calls',
  };
}

/**
 * Helper: Create text response
 */
export function createTextResponse(content: string): MockLLMResponse {
  return {
    content,
    finish_reason: 'stop',
  };
}

/**
 * Helper: Create multiple tool calls in one response
 */
export function createMultiToolResponse(
  tools: Array<{ name: string; args: any }>
): MockLLMResponse {
  return {
    tool_calls: tools.map((tool, index) => ({
      id: `call-${Date.now()}-${index}`,
      type: 'function' as const,
      function: {
        name: tool.name,
        arguments: JSON.stringify(tool.args),
      },
    })),
    finish_reason: 'tool_calls',
  };
}
