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

      console.log('[ContentAgent] Context sent to LLM:\n', contextInfo);

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
      console.log('[ContentAgent] Tool calls:', toolCalls.length);

      let result: ContentAgentResult = {
        success: false,
        message: 'No action taken',
        duration: Date.now() - startTime,
        cost: this.estimateCost(systemPrompt + userMessage, response.content || ''),
      };

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolInput = JSON.parse(toolCall.function.arguments);

        console.log(`[ContentAgent] Executing tool: ${toolName}`, toolInput);

        if (toolName === 'updateText') {
          result = await this.updateText(toolInput, context);
        } else if (toolName === 'updateMultiple') {
          result = await this.updateMultiple(toolInput, context);
        }
      }

      // If no tool calls, return LLM message
      if (toolCalls.length === 0 && response.content) {
        console.log('[ContentAgent] No tool calls, returning message:', response.content);
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

CRITICAL WORKFLOW:
1. ALWAYS check the "Current context" section first to see what's selected
2. Verify if the selected component matches what the user is asking about
3. If the selection is correct, extract component IDs from the context and use tools
4. If the selection is wrong or unclear, politely ask the user to select the correct component first

RULES:
- The context shows the selected component and ALL its children with their IDs and text content
- Use component IDs from context - NEVER ask the user for IDs!
- For batch updates (like "change titles to X, Y, Z"), use updateMultiple with all IDs from context
- If you can't find the components the user is referring to in the context, ask them to select the parent container first

Examples:

User: "change the title of the pricing cards to Base, Pro, Advanced and Shopping"
Context: Selected Grid with 4 Card children, each with Heading components
→ Extract the 4 Heading IDs from context, call updateMultiple with new titles

User: "make this more casual"
Context: Selected VStack with Text components
→ Find text components in context, update their text to casual tone

User: "update prices to $9, $16, $32, $56"
Context: Selected Grid, but no price components visible
→ "Could you select the pricing cards container? I'll be able to update the prices once you select the grid with the cards."

User: "change the card titles"
Context: Nothing selected or wrong component selected
→ "Could you select the parent container with the cards? That way I can see all the cards and update their titles."`;
  }

  private buildContext(context: ToolContext): string {
    if (context.selectedNodeIds.length === 0) {
      return 'SELECTION: Nothing selected\n\nThe user hasn\'t selected any component. Ask them to select the parent container first.';
    }

    const selectedId = context.selectedNodeIds[0];
    const selectedNode = context.getNodeById(selectedId);

    if (!selectedNode) {
      return 'SELECTION: Nothing selected\n\nThe user hasn\'t selected any component. Ask them to select the parent container first.';
    }

    // Build a rich context including children
    const contextParts: string[] = [];
    const nodeName = selectedNode.name || selectedNode.type;
    contextParts.push(`SELECTION: ${nodeName} (ID: ${selectedId})`);
    contextParts.push('');

    // If selected node has children, include them with their structure
    if (selectedNode.children && selectedNode.children.length > 0) {
      contextParts.push('CHILDREN:');
      this.buildChildrenContext(selectedNode.children, contextParts, 0);
    } else {
      contextParts.push('No children');
    }

    return contextParts.join('\n');
  }

  private buildChildrenContext(children: any[], parts: string[], depth: number): void {
    const indent = '  '.repeat(depth + 1);

    for (const child of children) {
      const name = child.name || child.type;
      const textContent = this.extractTextContent(child);
      const displayText = textContent ? ` [text: "${textContent}"]` : '';

      parts.push(`${indent}- ${name} (${child.id})${displayText}`);

      // Recursively include grandchildren (but limit depth to avoid token spam)
      // Pricing cards are nested: Grid > Card > CardHeader > VStack > Heading (5 levels)
      if (child.children && child.children.length > 0 && depth < 5) {
        this.buildChildrenContext(child.children, parts, depth + 1);
      }
    }
  }

  private extractTextContent(node: any): string | null {
    // Extract text from common text-containing components
    if (node.props?.children && typeof node.props.children === 'string') {
      return node.props.children;
    }
    if (node.props?.text && typeof node.props.text === 'string') {
      return node.props.text;
    }
    if (node.props?.content && typeof node.props.content === 'string') {
      return node.props.content;
    }
    return null;
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
