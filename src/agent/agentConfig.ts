/**
 * Agent Configuration
 *
 * Centralized configuration for the v2.0 single-agent system.
 * Change model here to switch between Anthropic and OpenAI providers.
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
    GPT_4O_MINI: "gpt-4o-mini",
    GPT_4O: "gpt-4o",
    GPT_5: "gpt-5.1",
    GPT_5_MINI: "gpt-5-mini",
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
 * Model Capabilities
 * Defines what parameters each model supports
 */
export interface ModelCapabilities {
  supportsCustomTemperature: boolean;
  defaultTemperature?: number;
  supportsMaxTokens: boolean;
  maxTokensParam?: "max_tokens" | "max_completion_tokens";
}

/**
 * Agent Model Configuration
 *
 * Configure which model the v2.0 single-agent system should use.
 * Currently using OpenAI GPT-4o-mini for cost optimization.
 *
 * To switch models:
 * - Anthropic Claude Sonnet 4.5: Most capable, expensive ($3/$15 per MTok)
 * - Anthropic Claude Haiku 4.5: Fast and affordable ($1/$5 per MTok)
 * - OpenAI GPT-4o-mini: Good balance ($0.15/$0.60 per MTok) ← Current
 * - OpenAI GPT-4o: Most capable OpenAI ($2.50/$10.00 per MTok)
 */
export const AGENT_MODELS = {
  // Main agent for v2.0 single-agent system
  agent: {
    provider: Providers.OPENAI,
    model: Models.OpenAI.GPT_5,
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
    capabilities: {
      supportsCustomTemperature: true,
      supportsMaxTokens: true,
      maxTokensParam: "max_tokens" as const,
    },
  },
  [Models.Anthropic.CLAUDE_HAIKU_4_5]: {
    provider: Providers.ANTHROPIC,
    description: "Fast and affordable ($1/MTok input, $5/MTok output)",
    bestFor: "Standard tasks, agents, fast responses",
    pricing: { input: 0.001, output: 0.005 },
    capabilities: {
      supportsCustomTemperature: true,
      supportsMaxTokens: true,
      maxTokensParam: "max_tokens" as const,
    },
  },

  // OpenAI Models
  [Models.OpenAI.GPT_4O_MINI]: {
    provider: Providers.OPENAI,
    description:
      "Fast and very affordable ($0.15/MTok input, $0.60/MTok output)",
    bestFor: "Standard tasks, agents, good balance of speed and cost",
    pricing: { input: 0.00015, output: 0.0006 },
    capabilities: {
      supportsCustomTemperature: true,
      supportsMaxTokens: true,
      maxTokensParam: "max_completion_tokens" as const,
    },
  },
  [Models.OpenAI.GPT_4O]: {
    provider: Providers.OPENAI,
    description:
      "Most capable OpenAI model ($2.50/MTok input, $10.00/MTok output)",
    bestFor: "Complex reasoning, multimodal tasks, high accuracy",
    pricing: { input: 0.0025, output: 0.01 },
    capabilities: {
      supportsCustomTemperature: true,
      supportsMaxTokens: true,
      maxTokensParam: "max_completion_tokens" as const,
    },
  },
  [Models.OpenAI.GPT_5]: {
    provider: Providers.OPENAI,
    description:
      "Next-gen reasoning model ($1.25/MTok input, $10.00/MTok output)",
    bestFor: "Complex reasoning, advanced tasks, highest accuracy",
    pricing: { input: 0.00125, output: 0.01 },
    capabilities: {
      supportsCustomTemperature: true,
      supportsMaxTokens: true,
      maxTokensParam: "max_completion_tokens" as const,
    },
  },
  [Models.OpenAI.GPT_5_MINI]: {
    provider: Providers.OPENAI,
    description:
      "Next-gen affordable model ($0.25/MTok input, $2.00/MTok output)",
    bestFor: "Standard tasks, agents, excellent speed-to-cost ratio",
    pricing: { input: 0.00025, output: 0.002 },
    capabilities: {
      supportsCustomTemperature: true,
      supportsMaxTokens: true,
      maxTokensParam: "max_completion_tokens" as const,
    },
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

/**
 * Get model capabilities for a specific model
 */
export function getModelCapabilities(modelName: string): ModelCapabilities {
  const modelConfig =
    AVAILABLE_MODELS[modelName as keyof typeof AVAILABLE_MODELS];

  if (!modelConfig?.capabilities) {
    // Default to safe capabilities if model not found
    console.warn(
      `[AgentConfig] Model "${modelName}" not found, using default capabilities`
    );
    return {
      supportsCustomTemperature: true,
      supportsMaxTokens: true,
      maxTokensParam: "max_tokens",
    };
  }

  return modelConfig.capabilities;
}
