/**
 * Agent Configuration
 *
 * Centralized configuration for all AI agents and orchestrators.
 * Change models here to affect all agents at once.
 */

/**
 * Available AI Models
 */
export const Models = {
  Anthropic: {
    CLAUDE_SONNET_4_5: 'claude-sonnet-4-5',
    CLAUDE_HAIKU_4_5: 'claude-haiku-4-5',
  },
  OpenAI: {
    GPT_4O_MINI: 'gpt-4o-mini',
    GPT_4O: 'gpt-4o',
  },
} as const;

/**
 * AI Providers
 */
export const Providers = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
} as const;

export type Provider = typeof Providers.ANTHROPIC | typeof Providers.OPENAI;
export type AnthropicModel = typeof Models.Anthropic[keyof typeof Models.Anthropic];
export type OpenAIModel = typeof Models.OpenAI[keyof typeof Models.OpenAI];
export type Model = AnthropicModel | OpenAIModel;

export interface AgentModelConfig {
  provider: Provider;
  model: Model;
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
    provider: Providers.ANTHROPIC,
    model: Models.Anthropic.CLAUDE_HAIKU_4_5,
  } as AgentModelConfig,

  // Specialized Agents
  component: {
    provider: Providers.ANTHROPIC,
    model: Models.Anthropic.CLAUDE_HAIKU_4_5,
  } as AgentModelConfig,

  content: {
    provider: Providers.ANTHROPIC,
    model: Models.Anthropic.CLAUDE_HAIKU_4_5,
  } as AgentModelConfig,

  data: {
    provider: Providers.ANTHROPIC,
    model: Models.Anthropic.CLAUDE_HAIKU_4_5,
  } as AgentModelConfig,

  layout: {
    provider: Providers.ANTHROPIC,
    model: Models.Anthropic.CLAUDE_HAIKU_4_5,
  } as AgentModelConfig,

  page: {
    provider: Providers.ANTHROPIC,
    model: Models.Anthropic.CLAUDE_HAIKU_4_5,
  } as AgentModelConfig,
} as const;

/**
 * Available Models
 *
 * Reference guide for available models and their characteristics.
 */
export const AVAILABLE_MODELS = {
  // Anthropic Models
  [Models.Anthropic.CLAUDE_SONNET_4_5]: {
    provider: Providers.ANTHROPIC,
    description: 'Most capable, highest cost ($3/MTok input, $15/MTok output)',
    bestFor: 'Complex reasoning, long context, critical tasks',
    pricing: { input: 0.003, output: 0.015 },
  },
  [Models.Anthropic.CLAUDE_HAIKU_4_5]: {
    provider: Providers.ANTHROPIC,
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
