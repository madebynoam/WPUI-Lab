import { NextRequest, NextResponse } from 'next/server';
import { AnthropicProvider } from '@/agent/llm/anthropic';
import { OpenAIProvider } from '@/agent/llm/openai';
import type { LLMChatOptions } from '@/agent/llm/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, tools, temperature, max_tokens, tool_choice, provider: requestedProvider, model: requestedModel } = body as LLMChatOptions & { provider?: string; model?: string };

    // v3.0 agents always provide provider/model via NextJSProxyProvider
    const provider = requestedProvider || 'openai';
    const model = requestedModel || 'gpt-4o-mini';

    if (provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'Anthropic API key not configured' },
          { status: 500 }
        );
      }

      const anthropic = new AnthropicProvider(apiKey, model);
      const response = await anthropic.chat({
        messages,
        tools,
        temperature,
        max_tokens,
        tool_choice,
      });

      return NextResponse.json(response);

    } else if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 500 }
        );
      }

      const openai = new OpenAIProvider(apiKey, model);
      const response = await openai.chat({
        messages,
        tools,
        temperature,
        max_tokens,
        tool_choice,
      });

      return NextResponse.json(response);

    } else {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
