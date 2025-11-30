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
    CLAUDE_SONNET_4_5: "claude-sonnet-4-5",
    CLAUDE_HAIKU_4_5: "claude-haiku-4-5",
  },
  OpenAI: {
    GPT_5_MINI: "gpt-5-mini",
    GPT_5_NANO: "gpt-5-nano",
  },
} as const;

/**
 * AI Providers
 */
export const Providers = {
  ANTHROPIC: "anthropic",
  OPENAI: "openai",
} as const;

export type Provider = typeof Providers.ANTHROPIC | typeof Providers.OPENAI;
export type AnthropicModel =
  (typeof Models.Anthropic)[keyof typeof Models.Anthropic];
export type OpenAIModel = (typeof Models.OpenAI)[keyof typeof Models.OpenAI];
export type Model = AnthropicModel | OpenAIModel;

export interface AgentModelConfig {
  provider: Provider;
  model: Model;
}

/**
 * Agent Model Configuration
 *
 * Configure which model each agent should use.
 * All agents currently use OpenAI models for cost optimization.
 */
export const AGENT_MODELS = {
  // Orchestrators
  orchestrator: {
    provider: Providers.OPENAI,
    model: Models.OpenAI.GPT_5_MINI,
  } as AgentModelConfig,

  // Specialized Agents
  component: {
    provider: Providers.OPENAI,
    model: Models.OpenAI.GPT_5_MINI,
  } as AgentModelConfig,

  content: {
    provider: Providers.OPENAI,
    model: Models.OpenAI.GPT_5_NANO,
  } as AgentModelConfig,

  data: {
    provider: Providers.OPENAI,
    model: Models.OpenAI.GPT_5_MINI,
  } as AgentModelConfig,

  layout: {
    provider: Providers.OPENAI,
    model: Models.OpenAI.GPT_5_NANO,
  } as AgentModelConfig,

  page: {
    provider: Providers.OPENAI,
    model: Models.OpenAI.GPT_5_NANO,
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
    description: "Most capable, highest cost ($3/MTok input, $15/MTok output)",
    bestFor: "Complex reasoning, long context, critical tasks",
    pricing: { input: 0.003, output: 0.015 },
  },
  [Models.Anthropic.CLAUDE_HAIKU_4_5]: {
    provider: Providers.ANTHROPIC,
    description: "Fast and affordable ($1/MTok input, $5/MTok output)",
    bestFor: "Standard tasks, agents, fast responses",
    pricing: { input: 0.001, output: 0.005 },
  },

  // OpenAI Models
  [Models.OpenAI.GPT_5_NANO]: {
    provider: Providers.OPENAI,
    description:
      "Ultra-fast and cheapest ($0.30/MTok input, $1.20/MTok output)",
    bestFor: "Simple tasks, high-volume operations, cost optimization",
    pricing: { input: 0.0003, output: 0.0012 },
  },
  [Models.OpenAI.GPT_5_MINI]: {
    provider: Providers.OPENAI,
    description:
      "Fast and very affordable ($0.40/MTok input, $1.60/MTok output)",
    bestFor: "Standard tasks, agents, good balance of speed and cost",
    pricing: { input: 0.0004, output: 0.0016 },
  },
  [Models.OpenAI.GPT_4O_MINI]: {
    provider: Providers.OPENAI,
    description:
      "Previous generation mini model ($0.15/MTok input, $0.60/MTok output)",
    bestFor: "Legacy compatibility, standard tasks",
    pricing: { input: 0.00015, output: 0.0006 },
  },
  [Models.OpenAI.GPT_4O]: {
    provider: Providers.OPENAI,
    description: "Full-size GPT-4o model ($2.50/MTok input, $10/MTok output)",
    bestFor: "Complex reasoning, multimodal tasks",
    pricing: { input: 0.0025, output: 0.01 },
  },
} as const;

/**
 * Get model configuration for a specific agent type
 */
export function getAgentModel(
  agentType: keyof typeof AGENT_MODELS
): AgentModelConfig {
  return AGENT_MODELS[agentType];
}

/**
 * Get all agent configurations
 */
export function getAllAgentModels() {
  return AGENT_MODELS;
}
