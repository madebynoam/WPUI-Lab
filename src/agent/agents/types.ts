/**
 * Agent System Types
 *
 * Defines interfaces and contracts for all specialist agents
 */

import { ToolContext, AgentTool } from '../types';
import { MemoryStore } from '../memory/MemoryStore';

/**
 * Message that agents can emit for UI feedback
 */
export interface AgentProgressMessage {
  agent: string;
  type: 'progress' | 'success' | 'error';
  message: string;
  timestamp: number;
  metadata?: any;
}

/**
 * Result returned by agent execution
 */
export interface AgentResult {
  success: boolean;
  message: string;
  memoryEntriesCreated: number;
  tokensUsed: number;
  cost: number;
  duration: number;
  error?: string;
  data?: any;
}

/**
 * Agent interface that all specialist agents must implement
 */
export interface Agent {
  /**
   * Agent name (e.g., 'PageAgent', 'CreatorAgent')
   */
  name: string;

  /**
   * Capabilities this agent can handle
   */
  capabilities: string[];

  /**
   * Tools available to this agent (3-5 specialized tools)
   */
  tools: AgentTool[];

  /**
   * Check if this agent can handle the given request
   */
  canHandle(userMessage: string, memory: MemoryStore): Promise<boolean>;

  /**
   * Execute the agent's task
   */
  execute(
    userMessage: string,
    context: ToolContext,
    memory: MemoryStore,
    onMessage?: (message: AgentProgressMessage) => void,
    signal?: AbortSignal
  ): Promise<AgentResult>;

  /**
   * Validate the result against user intent (optional)
   */
  validate?(result: AgentResult, userMessage: string): Promise<ValidationResult>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  issues?: string[];
  suggestions?: string[];
}

/**
 * LLM Provider interface
 */
export interface LLMProvider {
  chat(params: {
    messages: Array<{ role: string; content: string; tool_calls?: any }>;
    tools?: any[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
    signal?: AbortSignal;
  }): Promise<{
    content: string | null; // Match actual LLM provider type
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
    finish_reason: string;
  }>;
}
