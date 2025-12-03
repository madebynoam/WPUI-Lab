import { LLMProvider, LLMChatOptions, LLMResponse } from "./types";

/**
 * Next.js Proxy Provider
 *
 * Proxies LLM requests through the Next.js API route instead of calling
 * the LLM APIs directly. This keeps API keys secure on the server.
 */
export class NextJSProxyProvider implements LLMProvider {
  name = "nextjs-proxy";
  private provider: string;
  private model: string;

  constructor(provider: string, model: string) {
    this.provider = provider;
    this.model = model;
  }

  async chat(options: LLMChatOptions): Promise<LLMResponse> {
    const {
      messages,
      tools,
      temperature,
      max_tokens,
      tool_choice,
      signal,
    } = options;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        tools,
        temperature,
        max_tokens,
        tool_choice,
        provider: this.provider,
        model: this.model,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Failed to communicate with server' }));
      throw new Error(
        error.error || `API proxy error: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  }
}
