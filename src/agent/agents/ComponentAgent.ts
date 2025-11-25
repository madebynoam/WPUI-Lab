/**
 * Component Agent - Creates and modifies UI components
 *
 * Uses Claude Haiku 4.5 for reliable, fast component generation
 * Has access to 50+ pre-built patterns for instant insertion
 */

import { createLLMProvider } from '../llm/factory';
import { ToolContext } from '../types';
import { patterns, assignIds } from '../../patterns/';
import { ComponentNode } from '../../types';

interface ComponentAgentResult {
  success: boolean;
  message: string;
  componentId?: string;
  error?: string;
  duration: number;
  cost: number;
}

/**
 * Component Agent - Handles component creation and modification
 */
export class ComponentAgent {
  private llm: ReturnType<typeof createLLMProvider>;

  constructor(apiKey: string) {
    this.llm = createLLMProvider({
      provider: 'anthropic',
      apiKey,
      model: 'claude-haiku-4-5', // Haiku 4.5 for speed + reliability
    });
  }

  /**
   * Handle component-related requests
   */
  async handle(
    userMessage: string,
    context: ToolContext,
    signal?: AbortSignal
  ): Promise<ComponentAgentResult> {
    const startTime = Date.now();

    console.log('[ComponentAgent] Handling:', userMessage);

    try {
      // Build system prompt with available patterns
      const systemPrompt = this.buildSystemPrompt();

      // Build focused context
      const contextInfo = this.buildContext(context);

      // Call LLM with tool definitions
      const response = await this.llm.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `${userMessage}\n\nCurrent context:\n${contextInfo}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000, // Increased for large component trees (e.g., 12 cards)
        signal,
        tools: this.getTools(),
      });

      // Debug logging
      console.log('[ComponentAgent] LLM response:', {
        content: response.content,
        tool_calls: response.tool_calls,
        finish_reason: response.finish_reason,
      });

      // Check if response was truncated
      if (response.finish_reason === 'length') {
        console.warn('[ComponentAgent] Response was truncated (hit token limit)');
        return {
          success: false,
          message: 'Request too complex - response was truncated. Try creating fewer components (e.g., 3-4 cards instead of 12), or use a simpler structure.',
          error: 'Response truncated',
          duration: Date.now() - startTime,
          cost: this.estimateCost(systemPrompt + userMessage, response.content || ''),
        };
      }

      // Execute tool calls
      const toolCalls = response.tool_calls || [];
      let result: ComponentAgentResult = {
        success: false,
        message: 'No action taken',
        duration: Date.now() - startTime,
        cost: this.estimateCost(systemPrompt + userMessage, response.content || ''),
      };

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;

        // Parse tool arguments with error handling
        let toolInput: any;
        try {
          toolInput = JSON.parse(toolCall.function.arguments);
        } catch (error) {
          console.error('[ComponentAgent] Failed to parse tool arguments:', toolCall.function.arguments);
          result = {
            success: false,
            message: `Failed to parse tool arguments. The response may have been truncated. Try a simpler request.`,
            error: 'JSON parse error',
            duration: Date.now() - startTime,
            cost: this.estimateCost(systemPrompt + userMessage, response.content || ''),
          };
          continue;
        }

        if (toolName === 'insertPattern') {
          result = await this.insertPattern(toolInput, context);
        } else if (toolName === 'createComponent') {
          result = await this.createComponent(toolInput, context);
        } else if (toolName === 'modifyComponent') {
          result = await this.modifyComponent(toolInput, context);
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
        message: `Component agent error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
        duration: Date.now() - startTime,
        cost: 0,
      };
    }
  }

  /**
   * Build system prompt with available patterns
   */
  private buildSystemPrompt(): string {
    const patternList = patterns
      .map((p) => `- ${p.id}: ${p.description}`)
      .join('\n');

    return `You are a UI component creation expert. You have access to 50+ pre-built patterns.

Available patterns:
${patternList}

Available component types:
- Layout: VStack, HStack, Grid, Box, Divider
- Typography: Heading (level 1-6), Text
- Interactive: Button, Link
- Forms: Input, Textarea, Select, Checkbox, FormControl, FormLabel
- Data: DataViews, Badge
- Containers: Card, CardHeader, CardBody

Tools:
1. insertPattern(patternId, parentId?, index?): Insert a pre-built pattern
2. createComponent(tree): Create custom component from tree structure
3. modifyComponent(componentId, updates): Update existing component

CRITICAL - Tree Structure Format:
Every node MUST have exactly these three fields:
{
  type: string,        // Component type (e.g., "Card", "Button", "VStack")
  props: object,       // Properties object (can be empty {})
  children: array      // Children array (can be empty [])
}

Example of correct structure:
{
  type: "Grid",
  props: {columns: 3, gap: 4},
  children: [
    {
      type: "Card",
      props: {},
      children: [
        {type: "Heading", props: {level: 3, content: "Premium Plan"}, children: []},
        {type: "Text", props: {content: "Perfect for teams"}, children: []},
        {type: "Button", props: {label: "Get Started"}, children: []}
      ]
    }
  ]
}

Instructions:
1. If user request matches a pattern name/description, use insertPattern()
2. For custom requests, use createComponent() with proper tree structure
3. ALWAYS ensure every node has type, props, and children fields
4. Use empty [] for children if the component has no children (e.g., Button, Text)
5. Always include realistic placeholder content (not "Item 1", "Item 2")
6. For modifications, use modifyComponent()
7. Confirm what you created

Examples:
"add a contact form" → insertPattern({patternId: "contact-form"})
"add a kanban board" → insertPattern({patternId: "crud-kanban-view"})
"create 3 pricing cards" → createComponent({tree: {type: "Grid", props: {columns: 3}, children: [...]}})`;
  }

  /**
   * Build focused context for the agent
   */
  private buildContext(context: ToolContext): string {
    const selectedInfo =
      context.selectedNodeIds.length > 0
        ? `Selected components: ${context.selectedNodeIds.join(', ')}`
        : 'No selection';

    const pageInfo = `Current page: ${context.currentPageId}`;

    return `${pageInfo}\n${selectedInfo}`;
  }

  /**
   * Get tool definitions for LLM
   */
  private getTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'insertPattern',
          description: 'Insert a pre-built pattern/template',
          parameters: {
            type: 'object',
            properties: {
              patternId: {
                type: 'string',
                description: 'ID of the pattern to insert',
              },
              parentId: {
                type: 'string',
                description: 'Optional parent component ID',
              },
              index: {
                type: 'number',
                description: 'Optional index in parent children array',
              },
            },
            required: ['patternId'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'createComponent',
          description: 'Create a custom component from tree structure',
          parameters: {
            type: 'object',
            properties: {
              tree: {
                type: 'object',
                description: 'Component tree structure (type, props, children)',
              },
            },
            required: ['tree'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'modifyComponent',
          description: 'Modify an existing component',
          parameters: {
            type: 'object',
            properties: {
              componentId: {
                type: 'string',
                description: 'ID of component to modify',
              },
              updates: {
                type: 'object',
                description: 'Updates to apply (props, children, etc.)',
              },
            },
            required: ['componentId', 'updates'],
          },
        },
      },
    ];
  }

  /**
   * Insert a pattern
   */
  private async insertPattern(
    params: any,
    context: ToolContext
  ): Promise<ComponentAgentResult> {
    const { patternId, parentId, index } = params;

    const pattern = patterns.find((p) => p.id === patternId);
    if (!pattern) {
      return {
        success: false,
        message: `Pattern "${patternId}" not found`,
        error: 'Pattern not found',
        duration: 0,
        cost: 0,
      };
    }

    const componentTree: ComponentNode = assignIds(pattern.tree);
    context.addComponent(componentTree, parentId, index);

    return {
      success: true,
      message: `Created ${pattern.name}`,
      componentId: componentTree.id,
      duration: 0,
      cost: 0,
    };
  }

  /**
   * Create a custom component
   */
  private async createComponent(
    params: any,
    context: ToolContext
  ): Promise<ComponentAgentResult> {
    const { tree } = params;

    // Debug logging
    console.log('[ComponentAgent] createComponent params:', params);
    console.log('[ComponentAgent] tree type:', typeof tree);
    console.log('[ComponentAgent] tree value:', tree);

    // Validate tree structure before processing
    const validation = this.validateTreeStructure(tree);
    if (!validation.valid) {
      console.error('[ComponentAgent] Validation failed:', validation.error);
      console.error('[ComponentAgent] Invalid tree:', tree);

      const treeStr = tree ? JSON.stringify(tree).substring(0, 200) : 'undefined';
      return {
        success: false,
        message: `Invalid component structure: ${validation.error}. Received: ${treeStr}`,
        error: validation.error,
        duration: 0,
        cost: 0,
      };
    }

    const componentTree: ComponentNode = assignIds(tree);
    context.addComponent(componentTree);

    return {
      success: true,
      message: `Created custom ${tree.type}`,
      componentId: componentTree.id,
      duration: 0,
      cost: 0,
    };
  }

  /**
   * Modify an existing component
   */
  private async modifyComponent(
    params: any,
    context: ToolContext
  ): Promise<ComponentAgentResult> {
    const { componentId, updates } = params;

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

    if (updates.props) {
      context.updateComponentProps(componentId, updates.props);
    }

    return {
      success: true,
      message: `Modified component`,
      componentId,
      duration: 0,
      cost: 0,
    };
  }

  /**
   * Validate tree structure before processing
   */
  private validateTreeStructure(node: any): { valid: boolean; error?: string } {
    if (!node || typeof node !== 'object') {
      return { valid: false, error: 'Node must be an object' };
    }

    if (!node.type || typeof node.type !== 'string') {
      return { valid: false, error: 'Node must have a "type" field (string)' };
    }

    if (!node.props || typeof node.props !== 'object') {
      return { valid: false, error: 'Node must have a "props" field (object)' };
    }

    if (!Array.isArray(node.children)) {
      return { valid: false, error: 'Node must have a "children" field (array, can be empty [])' };
    }

    // Recursively validate children
    for (const child of node.children) {
      if (child) {
        const childValidation = this.validateTreeStructure(child);
        if (!childValidation.valid) {
          return childValidation;
        }
      }
    }

    return { valid: true };
  }

  /**
   * Estimate cost (rough approximation for Haiku)
   */
  private estimateCost(input: string, output: string): number {
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);
    // Haiku pricing: ~$0.25/1M input, ~$1.25/1M output
    return (inputTokens * 0.25 + outputTokens * 1.25) / 1000000;
  }
}
