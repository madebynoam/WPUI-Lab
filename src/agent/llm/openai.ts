import { LLMProvider, LLMChatOptions, LLMResponse } from "./types";
import { getModelCapabilities } from "../agentConfig";

export class OpenAIProvider implements LLMProvider {
  name = "openai";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-5-nano") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(options: LLMChatOptions): Promise<LLMResponse> {
    const {
      messages,
      tools,
      temperature = 0.7,
      max_tokens = 1000,
      tool_choice,
      signal,
    } = options;

    const requestBody: any = {
      model: this.model,
      messages,
    };

    // Get model capabilities to determine what parameters to send
    const capabilities = getModelCapabilities(this.model);

    // Only set temperature if the model supports custom temperature
    if (capabilities.supportsCustomTemperature) {
      requestBody.temperature = temperature;
    }

    // Only set max tokens if the model supports it
    if (capabilities.supportsMaxTokens) {
      const tokenParam = capabilities.maxTokensParam || 'max_completion_tokens';
      requestBody[tokenParam] = max_tokens;
    }

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = tool_choice || "auto";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.status}`
      );
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      tool_calls: choice.message.tool_calls,
      finish_reason: choice.finish_reason,
    };
  }
}
