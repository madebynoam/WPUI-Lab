/**
 * Base Agent Class
 *
 * Provides shared functionality for all specialist agents:
 * - Message emission
 * - Token tracking
 * - Memory operations
 * - LLM call wrapper
 */

import { Agent, AgentProgressMessage, AgentResult, LLMProvider } from './types';
import { ToolContext, AgentTool } from '../types';
import { MemoryStore } from '../memory/MemoryStore';

export abstract class BaseAgent implements Agent {
  abstract name: string;
  abstract capabilities: string[];
  abstract tools: AgentTool[];

  protected llm: LLMProvider;
  protected memory: MemoryStore;
  protected onMessage?: (message: AgentProgressMessage) => void;

  // Token tracking (protected so subclasses can access)
  protected inputTokens: number = 0;
  protected outputTokens: number = 0;

  // Pricing (per million tokens)
  private readonly INPUT_COST_PER_M = 0.25; // GPT-5-Mini
  private readonly OUTPUT_COST_PER_M = 2.0;

  constructor(llm: LLMProvider, memory: MemoryStore) {
    this.llm = llm;
    this.memory = memory;
  }

  /**
   * Must be implemented by each agent
   */
  abstract canHandle(userMessage: string, memory: MemoryStore): Promise<boolean>;

  /**
   * Must be implemented by each agent
   */
  abstract execute(
    userMessage: string,
    context: ToolContext,
    memory: MemoryStore,
    onMessage?: (message: AgentProgressMessage) => void
  ): Promise<AgentResult>;

  /**
   * Emit a progress message to the UI
   */
  protected emit(type: 'progress' | 'success' | 'error', message: string, metadata?: any): void {
    const agentMessage: AgentProgressMessage = {
      agent: this.name,
      type,
      message,
      timestamp: Date.now(),
      metadata,
    };

    if (this.onMessage) {
      this.onMessage(agentMessage);
    }
  }

  /**
   * Estimate tokens for text (rough approximation: 4 chars ≈ 1 token)
   */
  protected estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Track input tokens
   */
  protected trackInputTokens(tokens: number): void {
    this.inputTokens += tokens;
  }

  /**
   * Track output tokens
   */
  protected trackOutputTokens(tokens: number): void {
    this.outputTokens += tokens;
  }

  /**
   * Calculate total cost
   */
  protected calculateCost(): number {
    const inputCost = (this.inputTokens / 1_000_000) * this.INPUT_COST_PER_M;
    const outputCost = (this.outputTokens / 1_000_000) * this.OUTPUT_COST_PER_M;
    return inputCost + outputCost;
  }

  /**
   * Get total tokens used
   */
  protected getTotalTokens(): number {
    return this.inputTokens + this.outputTokens;
  }

  /**
   * Reset token counters
   */
  protected resetTokens(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
  }

  /**
   * Call LLM with token tracking
   */
  protected async callLLM(params: {
    messages: Array<{ role: string; content: string; tool_calls?: any; tool_call_id?: string }>;
    tools?: any[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
    finish_reason: string;
  }> {
    // Track input tokens
    const inputText = params.messages.map(m => m.content).join('\n');
    this.trackInputTokens(this.estimateTokens(inputText));

    // Call LLM
    const response = await this.llm.chat(params);

    // Track output tokens
    if (response.content) {
      this.trackOutputTokens(this.estimateTokens(response.content));
    }

    return response;
  }

  /**
   * Write to memory with automatic agent attribution
   */
  protected writeMemory(entry: {
    action: any;
    entityId?: string | string[];
    entityType?: string;
    details: any;
    parentAction?: string;
  }) {
    return this.memory.write({
      agent: this.name,
      ...entry,
    });
  }

  /**
   * Search memory (convenience wrapper)
   */
  protected searchMemory(query: any) {
    return this.memory.search(query);
  }

  /**
   * Create success result
   */
  protected createSuccessResult(message: string, data?: any, memoryEntriesCreated: number = 0): AgentResult {
    return {
      success: true,
      message,
      memoryEntriesCreated,
      tokensUsed: this.getTotalTokens(),
      cost: this.calculateCost(),
      duration: 0, // Will be set by caller
      data,
    };
  }

  /**
   * Create error result
   */
  protected createErrorResult(error: string): AgentResult {
    return {
      success: false,
      message: error,
      memoryEntriesCreated: 0,
      tokensUsed: this.getTotalTokens(),
      cost: this.calculateCost(),
      duration: 0, // Will be set by caller
      error,
    };
  }
}
