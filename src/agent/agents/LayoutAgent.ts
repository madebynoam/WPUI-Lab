/**
 * Layout Agent - Arranges and positions components
 *
 * Uses Claude Haiku 4.5 for layout decisions
 */

import { createLLMProvider } from '../llm/factory';
import { ToolContext } from '../types';
import { assignIds } from '../../patterns/';
import { ComponentNode } from '../../types';

interface LayoutAgentResult {
  success: boolean;
  message: string;
  error?: string;
  duration: number;
  cost: number;
}

/**
 * Layout Agent - Handles component layout and arrangement
 */
export class LayoutAgent {
  private llm: ReturnType<typeof createLLMProvider>;

  constructor(apiKey: string) {
    this.llm = createLLMProvider({
      provider: 'anthropic',
      apiKey,
      model: 'claude-haiku-4-5', // Haiku 4.5
    });
  }

  /**
   * Handle layout-related requests
   */
  async handle(
    userMessage: string,
    context: ToolContext,
    signal?: AbortSignal
  ): Promise<LayoutAgentResult> {
    const startTime = Date.now();

    console.log('[LayoutAgent] Handling:', userMessage);

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
        temperature: 0.3,
        max_tokens: 1000,
        signal,
        tools: this.getTools(),
      });

      // Execute tool calls
      const toolCalls = response.tool_calls || [];
      let result: LayoutAgentResult = {
        success: false,
        message: 'No action taken',
        duration: Date.now() - startTime,
        cost: this.estimateCost(systemPrompt + userMessage, response.content || ''),
      };

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolInput = JSON.parse(toolCall.function.arguments);

        if (toolName === 'wrapInContainer') {
          result = await this.wrapInContainer(toolInput, context);
        } else if (toolName === 'updateLayout') {
          result = await this.updateLayout(toolInput, context);
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
        message: `Layout agent error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
        duration: Date.now() - startTime,
        cost: 0,
      };
    }
  }

  private buildSystemPrompt(): string {
    return `You are a layout expert. Arrange components using flex and grid layouts.

Tools:
- wrapInContainer(componentIds, containerType, props): Wrap components in VStack/HStack/Grid
- updateLayout(componentId, layoutProps): Update spacing, alignment, gaps

Container types:
- VStack: Vertical stack (column layout)
- HStack: Horizontal stack (row layout)
- Grid: Grid layout with columns

Layout props:
- spacing: 0-8 (0=none, 2=tight, 4=normal, 6=loose, 8=very loose)
- gap: 0-8 (for Grid)
- columns: 1-12 (for Grid)
- alignItems: "start" | "center" | "end" | "stretch"
- justifyContent: "start" | "center" | "end" | "space-between" | "space-around"
- padding: 0-8

Instructions:
1. Use Grid for multi-column layouts (2, 3, 4 columns)
2. Use HStack for horizontal arrangements
3. Use VStack for vertical stacking
4. Set appropriate spacing (2-4 for tight, 6-8 for loose)
5. Use center alignment for hero sections and CTAs
6. Use space-between for navigation bars

Examples:
"arrange in 3 columns" → wrapInContainer({componentIds: [...], containerType: "Grid", props: {columns: 3, gap: 4}})
"center this" → updateLayout({componentId: "...", layoutProps: {alignItems: "center", justifyContent: "center"}})
"add more spacing" → updateLayout({componentId: "...", layoutProps: {spacing: 8}})`;
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
          name: 'wrapInContainer',
          description: 'Wrap components in a container (VStack/HStack/Grid)',
          parameters: {
            type: 'object',
            properties: {
              componentIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'IDs of components to wrap',
              },
              containerType: {
                type: 'string',
                enum: ['VStack', 'HStack', 'Grid'],
                description: 'Type of container',
              },
              props: {
                type: 'object',
                description: 'Container props (spacing, gap, columns, etc.)',
              },
            },
            required: ['componentIds', 'containerType', 'props'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'updateLayout',
          description: 'Update layout properties of a component',
          parameters: {
            type: 'object',
            properties: {
              componentId: {
                type: 'string',
                description: 'ID of component to update',
              },
              layoutProps: {
                type: 'object',
                description: 'Layout props to update',
              },
            },
            required: ['componentId', 'layoutProps'],
          },
        },
      },
    ];
  }

  private async wrapInContainer(
    params: any,
    context: ToolContext
  ): Promise<LayoutAgentResult> {
    const { componentIds, containerType, props } = params;

    // Get the components
    const components = componentIds
      .map((id: string) => context.getNodeById(id))
      .filter(Boolean);

    if (components.length === 0) {
      return {
        success: false,
        message: 'No components found',
        error: 'Components not found',
        duration: 0,
        cost: 0,
      };
    }

    // Create container
    const container: ComponentNode = assignIds({
      type: containerType,
      props: props || {},
      children: components,
    });

    // Remove original components and add container
    for (const id of componentIds) {
      context.removeComponent(id);
    }
    context.addComponent(container);

    return {
      success: true,
      message: `Wrapped ${componentIds.length} component(s) in ${containerType}`,
      duration: 0,
      cost: 0,
    };
  }

  private async updateLayout(
    params: any,
    context: ToolContext
  ): Promise<LayoutAgentResult> {
    const { componentId, layoutProps } = params;

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

    context.updateComponentProps(componentId, layoutProps);

    return {
      success: true,
      message: `Updated layout properties`,
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
