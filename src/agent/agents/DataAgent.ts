/**
 * Data Agent - Generates realistic table data
 *
 * Uses Claude Haiku 4.5 for fast data generation
 */

import { createLLMProvider } from '../llm/factory';
import { ToolContext } from '../types';
import { assignIds } from '../../patterns/';
import { ComponentNode } from '../../types';
import { getAgentModel } from '../agentConfig';

interface DataAgentResult {
  success: boolean;
  message: string;
  error?: string;
  duration: number;
  cost: number;
}

/**
 * Data Agent - Handles table data generation
 */
export class DataAgent {
  private llm: ReturnType<typeof createLLMProvider>;
  private config: ReturnType<typeof getAgentModel>;

  constructor(apiKey?: string) {
    this.config = getAgentModel('data');
    // API key is optional - uses Next.js proxy when not provided
    this.llm = createLLMProvider({
      provider: this.config.provider,
      apiKey,
      model: this.config.model,
    });
  }

  /**
   * Handle data generation requests
   */
  async handle(
    userMessage: string,
    context: ToolContext,
    signal?: AbortSignal
  ): Promise<DataAgentResult> {
    const startTime = Date.now();

    console.log('[DataAgent] Handling:', userMessage);

    try {
      const systemPrompt = this.buildSystemPrompt();
      const contextInfo = this.buildContext(context);

      console.log('[DataAgent] Context sent to LLM:\n', contextInfo);

      // Call LLM - provider will handle model-specific parameter constraints
      const chatOptions: any = {
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `${userMessage}\n\nCurrent context:\n${contextInfo}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
        signal,
        tools: this.getTools(),
      };

      const response = await this.llm.chat(chatOptions);

      // Execute tool calls
      const toolCalls = response.tool_calls || [];
      let result: DataAgentResult = {
        success: false,
        message: 'No action taken',
        duration: Date.now() - startTime,
        cost: this.estimateCost(systemPrompt + userMessage, response.content || ''),
      };

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolInput = JSON.parse(toolCall.function.arguments);

        console.log('[DataAgent] Tool call:', toolName, 'with params:', toolInput);

        if (toolName === 'createTable') {
          result = await this.createTable(toolInput, context);
        } else if (toolName === 'updateTable') {
          result = await this.updateTable(toolInput, context);
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
        message: `Data agent error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
        duration: Date.now() - startTime,
        cost: 0,
      };
    }
  }

  private buildSystemPrompt(): string {
    return `You are a data generator for tables.

Tools:
- createTable(topic, columns, rows): Create NEW table with realistic data
- updateTable(componentId, topic, columns, rows): UPDATE EXISTING table with new data

CRITICAL WORKFLOW:
1. ALWAYS check the "Current context" section first to see what's selected
2. If a DataViews component is selected AND user wants to change its data → use updateTable with the component ID
3. If nothing is selected OR user wants a new table → use createTable
4. NEVER ask for component IDs - extract them from the context!

Instructions:
1. Generate realistic, varied data (NOT generic "Item 1", "Item 2", "Item 3")
2. Use appropriate data types:
   - Numbers: integers or decimals as appropriate
   - Dates: realistic dates in YYYY-MM-DD format
   - Statuses: Active/Inactive, Published/Draft, etc.
   - Emails: realistic format (not test@test.com)
3. Always include an "id" column (sequential: 1, 2, 3...)
4. Use proper field names (camelCase or snake_case)
5. Return structure: {columns: [{id, label}], data: [{id, field1, field2}]}

Examples:
"users table with 10 rows" (nothing selected) → createTable with users data

"change this to show domains and expiry dates" (DataViews selected) → updateTable with selected component ID

"products with prices" → Include id, name, price, category, stock fields`;
  }

  private buildContext(context: ToolContext): string {
    if (context.selectedNodeIds.length === 0) {
      return 'SELECTION: Nothing selected\n\nNo component is selected. Use createTable to create a new table.';
    }

    const selectedId = context.selectedNodeIds[0];
    const selectedNode = context.getNodeById(selectedId);

    if (!selectedNode) {
      return 'SELECTION: Nothing selected\n\nNo component is selected. Use createTable to create a new table.';
    }

    const nodeName = selectedNode.name || selectedNode.type;
    const contextParts: string[] = [];
    contextParts.push(`SELECTION: ${nodeName} (ID: ${selectedId})`);

    // If it's a DataViews component, show current data structure
    if (selectedNode.type === 'DataViews') {
      contextParts.push('');
      contextParts.push('This is a DataViews component. Use updateTable to change its data.');

      if (selectedNode.props?.columns) {
        contextParts.push(`Current columns: ${selectedNode.props.columns.length}`);
      }
      if (selectedNode.props?.data) {
        contextParts.push(`Current rows: ${selectedNode.props.data.length}`);
      }
    } else {
      contextParts.push('');
      contextParts.push('This is NOT a DataViews component. Use createTable to create a new table.');
    }

    return contextParts.join('\n');
  }

  private getTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'createTable',
          description: 'Create a NEW table with realistic data',
          parameters: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Topic/type of data (e.g., "users", "products")',
              },
              columns: {
                type: 'array',
                description: 'Column definitions',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' },
                  },
                  required: ['id', 'label'],
                },
              },
              rows: {
                type: 'array',
                description: 'Row data',
                items: {
                  type: 'object',
                  description: 'Row object with column values',
                },
              },
            },
            required: ['topic', 'columns', 'rows'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'updateTable',
          description: 'Update an EXISTING table with new data',
          parameters: {
            type: 'object',
            properties: {
              componentId: {
                type: 'string',
                description: 'ID of the existing DataViews component to update',
              },
              topic: {
                type: 'string',
                description: 'Topic/type of data (e.g., "users", "products")',
              },
              columns: {
                type: 'array',
                description: 'Column definitions',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' },
                  },
                  required: ['id', 'label'],
                },
              },
              rows: {
                type: 'array',
                description: 'Row data',
                items: {
                  type: 'object',
                  description: 'Row object with column values',
                },
              },
            },
            required: ['componentId', 'topic', 'columns', 'rows'],
          },
        },
      },
    ];
  }

  private async createTable(
    params: any,
    context: ToolContext
  ): Promise<DataAgentResult> {
    const { topic, columns, rows } = params;

    // Create DataViews component with generated data
    const tableComponent: ComponentNode = assignIds({
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: rows,
        columns: columns,
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    });

    context.addComponent(tableComponent);

    return {
      success: true,
      message: `Created ${topic} table with ${rows.length} rows`,
      duration: 0,
      cost: 0,
    };
  }

  private async updateTable(
    params: any,
    context: ToolContext
  ): Promise<DataAgentResult> {
    const { componentId, topic, columns, rows } = params;

    // Validate required parameters
    if (!componentId) {
      return {
        success: false,
        message: 'Missing componentId for table update',
        duration: 0,
        cost: 0,
      };
    }

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return {
        success: false,
        message: 'Missing or invalid columns for table update',
        duration: 0,
        cost: 0,
      };
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return {
        success: false,
        message: 'Missing or invalid rows for table update',
        duration: 0,
        cost: 0,
      };
    }

    // Update existing DataViews component with new data
    context.updateComponentProps(componentId, {
      dataSource: 'custom',
      data: rows,
      columns: columns,
      viewType: 'table',
      itemsPerPage: 10,
    });

    return {
      success: true,
      message: `Updated ${topic} table with ${rows.length} rows`,
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
