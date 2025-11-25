/**
 * Content Agent - Generates and updates text content
 *
 * Uses Claude Haiku 4.5 for fast, high-quality copywriting
 */

import { createLLMProvider } from '../llm/factory';
import { ToolContext } from '../types';

interface ContentAgentResult {
  success: boolean;
  message: string;
  error?: string;
  duration: number;
  cost: number;
}

/**
 * Content Agent - Handles text content generation and updates
 */
export class ContentAgent {
  private llm: ReturnType<typeof createLLMProvider>;

  constructor(apiKey: string) {
    this.llm = createLLMProvider({
      provider: 'anthropic',
      apiKey,
      model: 'claude-haiku-4-5', // Haiku 4.5 for speed + quality
    });
  }

  /**
   * Handle content-related requests
   */
  async handle(
    userMessage: string,
    context: ToolContext,
    signal?: AbortSignal
  ): Promise<ContentAgentResult> {
    const startTime = Date.now();

    console.log('[ContentAgent] Handling:', userMessage);

    try {
      const systemPrompt = this.buildSystemPrompt();
      const contextInfo = this.buildContext(context);

      const response = await this.llm.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `${userMessage}\n\nCurrent context:\n${contextInfo}`,
          },
        ],
        temperature: 0.8, // Higher for creative writing
        max_tokens: 500,
        signal,
        tools: this.getTools(),
      });

      // Execute tool calls
      const toolCalls = response.tool_calls || [];
      let result: ContentAgentResult = {
        success: false,
        message: 'No action taken',
        duration: Date.now() - startTime,
        cost: this.estimateCost(systemPrompt + userMessage, response.content || ''),
      };

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolInput = JSON.parse(toolCall.function.arguments);

        if (toolName === 'updateText') {
          result = await this.updateText(toolInput, context);
        } else if (toolName === 'updateMultiple') {
          result = await this.updateMultiple(toolInput, context);
        }
      }

      // If no tool calls, return LLM message
      if (toolCalls.length === 0 && response.content) {
        result = {
          success: true,
          message: response.content,
          duration: Date.now() - startTime,
          cost: this.estimateCost(systemPrompt + userMessage, response.content),
        };
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Content agent error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
        duration: Date.now() - startTime,
        cost: 0,
      };
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert copywriter. Generate concise, engaging text.

Tools:
- updateText(componentId, text): Update text for a single component
- updateMultiple(updates): Update multiple text components at once

Instructions:
1. Match the tone to the request:
   - Professional: Clear, authoritative, business-focused
   - Casual: Friendly, conversational, approachable
   - Playful: Fun, energetic, creative
2. Keep content concise unless asked for longer
3. Use realistic, specific content (not generic placeholders like "Item 1")
4. For headlines: Make them compelling and action-oriented
5. For descriptions: Be clear and benefit-focused

Examples:
"write a headline for a fitness app" → "Transform Your Body in 90 Days"
"make this more casual" → Convert formal text to casual tone
"add a description about project management" → updateText with clear, benefit-focused description`;
  }

  private buildContext(context: ToolContext): string {
    if (context.selectedNodeIds.length === 0) {
      return 'No components selected';
    }

    const selectedComponents = context.selectedNodeIds
      .map((id) => {
        const node = context.getNodeById(id);
        return node ? `${node.type} (${id})` : null;
      })
      .filter(Boolean);

    return `Selected components:\n${selectedComponents.join('\n')}`;
  }

  private getTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'updateText',
          description: 'Update text content for a single component',
          parameters: {
            type: 'object',
            properties: {
              componentId: {
                type: 'string',
                description: 'ID of component to update',
              },
              text: {
                type: 'string',
                description: 'New text content',
              },
            },
            required: ['componentId', 'text'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'updateMultiple',
          description: 'Update text for multiple components',
          parameters: {
            type: 'object',
            properties: {
              updates: {
                type: 'array',
                description: 'Array of updates',
                items: {
                  type: 'object',
                  properties: {
                    componentId: { type: 'string' },
                    text: { type: 'string' },
                  },
                  required: ['componentId', 'text'],
                },
              },
            },
            required: ['updates'],
          },
        },
      },
    ];
  }

  private async updateText(
    params: any,
    context: ToolContext
  ): Promise<ContentAgentResult> {
    const { componentId, text } = params;

    const component = context.getNodeById(componentId);
    if (!component) {
      return {
        success: false,
        message: `Component "${componentId}" not found`,
        error: 'Component not found',
        duration: 0,
        cost: 0,
      };
    }

    // Update text based on component type
    if (component.type === 'Text' || component.type === 'Heading' || component.type === 'Button') {
      context.updateComponentProps(componentId, { children: text });
    } else if (component.props && 'content' in component.props) {
      context.updateComponentProps(componentId, { content: text });
    } else {
      context.updateComponentProps(componentId, { children: text });
    }

    return {
      success: true,
      message: `Updated text to: "${text}"`,
      duration: 0,
      cost: 0,
    };
  }

  private async updateMultiple(
    params: any,
    context: ToolContext
  ): Promise<ContentAgentResult> {
    const { updates } = params;

    for (const update of updates) {
      await this.updateText(update, context);
    }

    return {
      success: true,
      message: `Updated ${updates.length} component(s)`,
      duration: 0,
      cost: 0,
    };
  }

  private estimateCost(input: string, output: string): number {
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);
    return (inputTokens * 0.25 + outputTokens * 1.25) / 1000000;
  }
}
