/**
 * Agent Configuration
 *
 * Centralized configuration for all AI agents and orchestrators.
 * Change models here to affect all agents at once.
 */

export interface AgentModelConfig {
  provider: 'anthropic' | 'openai';
  model: string;
}

/**
 * Agent Model Configuration
 *
 * Configure which model each agent should use.
 * All agents currently use Claude Haiku 4.5 for optimal cost/performance.
 */
export const AGENT_MODELS = {
  // Orchestrators
  orchestrator: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
  } as AgentModelConfig,

  // Specialized Agents
  component: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
  } as AgentModelConfig,

  content: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
  } as AgentModelConfig,

  data: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
  } as AgentModelConfig,

  layout: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
  } as AgentModelConfig,

  page: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
  } as AgentModelConfig,
} as const;

/**
 * Available Models
 *
 * Reference guide for available models and their characteristics.
 */
export const AVAILABLE_MODELS = {
  // Anthropic Models
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    description: 'Most capable, highest cost ($3/MTok input, $15/MTok output)',
    bestFor: 'Complex reasoning, long context, critical tasks',
    pricing: { input: 0.003, output: 0.015 },
  },
  'claude-haiku-4-5': {
    provider: 'anthropic',
    description: 'Fast and affordable ($1/MTok input, $5/MTok output)',
    bestFor: 'Standard tasks, agents, fast responses',
    pricing: { input: 0.001, output: 0.005 },
  },
} as const;

/**
 * Get model configuration for a specific agent type
 */
export function getAgentModel(agentType: keyof typeof AGENT_MODELS): AgentModelConfig {
  return AGENT_MODELS[agentType];
}

/**
 * Get all agent configurations
 */
export function getAllAgentModels() {
  return AGENT_MODELS;
}
