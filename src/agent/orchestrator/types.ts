import { ToolContext, ToolResult, LLMMessage } from '../types';

/**
 * Supported agent types for specialized tasks
 */
export type AgentType =
  | 'context'        // Reads existing design state
  | 'creation'       // Creates new components via YAML/direct creation
  | 'modifier'       // Modifies existing component properties
  | 'deletion'       // Deletes components safely
  | 'layout'         // Validates and enforces layout rules
  | 'copywriter'     // Generates text content
  | 'visual'         // Establishes visual hierarchy
  | 'design_system'  // Enforces brand consistency
  | 'accessibility'  // WCAG compliance checks
  | 'validation';    // Post-build quality checks

/**
 * Model configuration for agents
 */
export interface AgentModel {
  provider: 'anthropic' | 'openai';
  model: 'claude-haiku-4-5' | 'claude-sonnet-4-5';
}

/**
 * Task definition for agents to execute
 */
export interface AgentTask {
  id: string;
  type: AgentType;
  description: string;
  input?: any;                     // Optional input data
  dependencies?: string[];          // Task IDs this depends on
  context?: Record<string, any>;   // Additional context for agent
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  type: AgentType;
  model: AgentModel;
  systemPrompt: string;
  maxCalls: number;                // Max tool calls for this agent
  tools: string[];                 // Allowed tool names
}

/**
 * Result from an agent execution
 */
export interface AgentResult {
  taskId: string;
  agentType: AgentType;
  success: boolean;
  message: string;
  data?: any;                      // Structured data returned by agent
  error?: string;

  // Metrics
  callCount: number;               // Tool calls made
  inputTokens: number;
  outputTokens: number;
  cost: number;
  duration: number;                // Milliseconds
}

/**
 * Intent parsed from user message
 */
export interface UserIntent {
  action: 'create' | 'update' | 'delete' | 'query' | 'validate';
  target: string;                  // What to act on (e.g., "pricing cards", "contact form")
  quantity?: number;               // How many (e.g., 3 cards)
  context?: Record<string, any>;   // Additional context
  tone?: 'professional' | 'casual' | 'playful'; // For copywriter
  usesSelection?: boolean;         // NEW: True if referring to selected components
  needsClarity?: boolean;          // NEW: True if ambiguous which components to affect
}

/**
 * Task plan from orchestrator
 */
export interface TaskPlan {
  intent: UserIntent;
  tasks: AgentTask[];
  estimatedCalls: number;          // Estimated total tool calls
  estimatedCost: number;           // Estimated total cost
}

/**
 * Final orchestrator result
 */
export interface OrchestratorResult {
  success: boolean;
  message: string;                 // Friendly message to user
  agentResults: AgentResult[];

  // Aggregated metrics
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  totalDuration: number;

  // Breakdown by model
  modelBreakdown: {
    model: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }[];
}

/**
 * Agent executor options
 */
export interface AgentExecutorOptions {
  task: AgentTask;
  config: AgentConfig;
  context: ToolContext;
  apiKey: string;
  previousResults?: AgentResult[]; // Results from dependent tasks
  signal?: AbortSignal; // For stop button support
  onProgress?: (message: string) => void; // For detailed progress updates
}

/**
 * Token estimation function type
 */
export type TokenEstimator = (text: string) => number;

/**
 * Pricing configuration for models
 */
export interface ModelPricing {
  input: number;                   // Cost per 1K tokens
  output: number;                  // Cost per 1K tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-sonnet-4-5': {
    input: 0.003,   // $3.00 per MTok (EXPENSIVE - avoid)
    output: 0.015,  // $15.00 per MTok
  },
  'claude-haiku-4-5': {
    input: 0.001,   // $1.00 per MTok (orchestrator and agents)
    output: 0.005,  // $5.00 per MTok
  },
};

/**
 * Agent execution context (passed to agents)
 */
export interface AgentContext {
  toolContext: ToolContext;
  previousResults: AgentResult[];
  task: AgentTask;
}

/**
 * Progress update for UI
 */
export interface ProgressUpdate {
  phase: 'intent' | 'planning' | 'executing';
  agent?: string;
  current?: number;
  total?: number;
  message: string;
}
