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

      // Call LLM - provider will handle model-specific parameter constraints
      const chatOptions: any = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
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

        if (toolName === 'createTable') {
          result = await this.createTable(toolInput, context);
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

Tool:
- createTable(topic, columns, rows): Create table with realistic data

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
"users table with 10 rows" → {
  columns: [{id: "id", label: "ID"}, {id: "name", label: "Name"}, ...],
  data: [{id: 1, name: "Sarah Martinez", email: "sarah@example.com", ...}, ...]
}

"products with prices" → Include id, name, price, category, stock fields`;
  }

  private getTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'createTable',
          description: 'Create a table with realistic data',
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

  private estimateCost(input: string, output: string): number {
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);
    return (inputTokens * 0.25 + outputTokens * 1.25) / 1000000;
  }
}
