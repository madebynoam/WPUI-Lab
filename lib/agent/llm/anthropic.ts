import {
  LLMProvider,
  LLMChatOptions,
  LLMResponse,
  LLMMessage,
  LLMToolCall,
} from "./types";
import { getModelCapabilities } from "../agentConfig";

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "claude-haiku-4-5") {
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

    // Extract system message (Claude requires it as a separate parameter)
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Convert messages to Claude format
    const claudeMessages = conversationMessages.map((msg) => {
      if (msg.role === "tool") {
        // Claude expects tool results in a specific format
        return {
          role: "user" as const,
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: msg.tool_call_id!,
              content: msg.content,
            },
          ],
        };
      }

      if (msg.role === "assistant" && msg.tool_calls) {
        // Convert OpenAI tool_calls format to Claude tool_use format
        const content: any[] = [];

        // Add text content if present
        if (msg.content) {
          content.push({
            type: "text",
            text: msg.content,
          });
        }

        // Add tool uses
        msg.tool_calls.forEach((toolCall) => {
          content.push({
            type: "tool_use",
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
          });
        });

        return {
          role: "assistant" as const,
          content,
        };
      }

      // Regular message
      return {
        role: msg.role as "user" | "assistant",
        content: msg.content,
      };
    });

    const requestBody: any = {
      model: this.model,
      messages: claudeMessages,
    };

    // Get model capabilities to determine what parameters to send
    const capabilities = getModelCapabilities(this.model);

    // Only set temperature if the model supports custom temperature
    if (capabilities.supportsCustomTemperature) {
      requestBody.temperature = temperature;
    }

    // Only set max tokens if the model supports it
    if (capabilities.supportsMaxTokens) {
      const tokenParam = capabilities.maxTokensParam || 'max_tokens';
      requestBody[tokenParam] = max_tokens;
    }

    // Add system message if present
    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));

      // Map tool_choice
      if (tool_choice === "required") {
        requestBody.tool_choice = { type: "any" };
      } else if (tool_choice === "none") {
        requestBody.tool_choice = { type: "auto" };
      } else {
        requestBody.tool_choice = { type: "auto" };
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        error.error?.message || `Anthropic API error: ${response.status}`
      );
    }

    const data = await response.json();

    // Convert Claude response to our standard format
    let content = "";
    const tool_calls: LLMToolCall[] = [];

    // Process content blocks
    for (const block of data.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        tool_calls.push({
          id: block.id,
          type: "function",
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        });
      }
    }

    // Map stop_reason to finish_reason
    let finish_reason: "stop" | "tool_calls" | "length" | "content_filter";
    if (data.stop_reason === "end_turn") {
      finish_reason = "stop";
    } else if (data.stop_reason === "tool_use") {
      finish_reason = "tool_calls";
    } else if (data.stop_reason === "max_tokens") {
      finish_reason = "length";
    } else {
      finish_reason = "stop";
    }

    return {
      content: content || null,
      tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
      finish_reason,
    };
  }
}
