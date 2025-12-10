/**
 * Creator Agent
 *
 * Specialist agent for component creation:
 * - buildFromMarkup (JSX-like syntax)
 * - section_create (templates)
 * - table_create (DataViews)
 */

import { BaseAgent } from './BaseAgent';
import { AgentResult, LLMProvider, AgentProgressMessage } from './types';
import { ToolContext, AgentTool } from '../types';
import { MemoryStore } from '../memory/MemoryStore';
import { CREATOR_AGENT_PROMPT } from '../prompts/creatorAgent';

export class CreatorAgent extends BaseAgent {
  name = 'CreatorAgent';
  capabilities = ['component_creation', 'section_templates', 'table_creation'];

  // Tool names this agent needs (real tools will be injected)
  requiredTools = ['buildFromMarkup', 'section_create', 'table_create'];

  tools: AgentTool[] = []; // Will be populated with real tools from registry

  constructor(llm: LLMProvider, memory: MemoryStore) {
    super(llm, memory);
  }

  /**
   * Set real tools from registry (called by orchestrator)
   */
  setTools(tools: AgentTool[]) {
    this.tools = tools;
  }

  async canHandle(userMessage: string, memory: MemoryStore): Promise<boolean> {
    const lowerMessage = userMessage.toLowerCase();

    const creationKeywords = [
      'add',
      'create',
      'build',
      'insert',
      // Note: 'make' removed - too ambiguous, conflicts with UpdateAgent ('make it primary')
    ];

    const componentKeywords = [
      'card', 'button', 'grid', 'table', 'heading', 'text',
      'pricing', 'hero', 'feature', 'testimonial', 'footer',
      'section', 'component', 'element',
      'form', 'contact', 'login', 'signup', 'search', 'input',
    ];

    const hasCreation = creationKeywords.some(kw => lowerMessage.includes(kw));
    const hasComponent = componentKeywords.some(kw => lowerMessage.includes(kw));

    // Exclude page operations
    const isPageOperation = lowerMessage.includes('page') &&
      (lowerMessage.includes('create page') || lowerMessage.includes('new page'));

    return hasCreation && hasComponent && !isPageOperation;
  }

  async execute(
    userMessage: string,
    context: ToolContext,
    memory: MemoryStore,
    onMessage?: (message: AgentProgressMessage) => void
  ): Promise<AgentResult> {
    const startTime = Date.now();
    this.onMessage = onMessage;
    this.memory = memory;
    this.resetTokens();

    let memoryEntriesCreated = 0;

    try {
      this.emit('progress', 'Analyzing component creation request...');

      // Check memory for active page
      this.emit('progress', 'Searching for active page...');
      const recentPage = memory.search({ action: 'page_created', latest: true });
      const pageContext = recentPage.length > 0
        ? `Recently created page: ${recentPage[0].details.name} (${recentPage[0].entityId})`
        : `Current page: ${context.currentPageId}`;

      if (recentPage.length > 0) {
        this.emit('progress', `Found page ${recentPage[0].entityId}`);
      }

      this.emit('progress', 'Preparing to create components...');

      const messages = [
        {
          role: 'system',
          content: CREATOR_AGENT_PROMPT,
        },
        {
          role: 'user',
          content: `${pageContext}\n\nUser request: ${userMessage}`,
        },
      ];

      const toolSchemas = this.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: Object.fromEntries(
              Object.entries(tool.parameters || {}).map(([key, param]) => {
                const { required, ...rest } = param as any;
                return [key, rest];
              })
            ),
            required: Object.keys(tool.parameters || {}).filter(
              key => tool.parameters?.[key].required
            ),
          },
        },
      }));

      const response = await this.callLLM({
        messages: messages as any,
        tools: toolSchemas,
        max_tokens: 1000,
      });

      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          const tool = this.tools.find(t => t.name === toolCall.function.name);
          if (!tool) continue;

          const args = JSON.parse(toolCall.function.arguments);

          this.emit('progress', `Executing ${tool.name}...`);

          const result = await tool.execute(args, context);

          if (result.success) {
            this.emit('success', result.message);

            // Write to memory
            const entityType = this.getEntityType(toolCall.function.name, args);
            const componentCount = this.estimateComponentCount(args);

            this.writeMemory({
              action: 'component_created',
              entityId: result.data?.componentIds || result.data?.componentId || 'unknown',
              entityType,
              details: {
                ...result.data,  // Spread first
                method: toolCall.function.name,
                template: args.template,
                count: componentCount,  // Override with accurate count
              },
            });
            memoryEntriesCreated++;
          } else {
            this.emit('error', result.error || 'Tool execution failed');
            return {
              ...this.createErrorResult(result.error || 'Tool execution failed'),
              duration: Date.now() - startTime,
            };
          }
        }
      } else if (response.content) {
        this.emit('progress', response.content);
      }

      const result = this.createSuccessResult(
        'Component creation completed',
        {},
        memoryEntriesCreated
      );

      result.duration = Date.now() - startTime;
      return result;
    } catch (error: any) {
      this.emit('error', error.message);
      const result = this.createErrorResult(error.message);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  private getEntityType(toolName: string, args: any): string {
    if (toolName === 'table_create') return 'DataViews';
    if (toolName === 'section_create') {
      const templateMap: Record<string, string> = {
        pricing: 'Card',
        hero: 'VStack',
        features: 'Grid',
      };
      return templateMap[args.template] || 'Component';
    }
    // For buildFromMarkup, try to detect from markup
    if (args.markup) {
      if (args.markup.includes('<Card')) return 'Card';
      if (args.markup.includes('<Button')) return 'Button';
      if (args.markup.includes('<Grid')) return 'Grid';
    }
    return 'Component';
  }

  private estimateComponentCount(args: any): number {
    if (args.template === 'pricing') return 3;
    if (args.markup) {
      // Count only leaf components (Card, Button, Text, etc.), not containers (Grid, VStack, HStack)
      const containerPattern = /<(Grid|VStack|HStack|CardHeader|CardBody|CardFooter)/g;
      const leafPattern = /<(Card|Button|Text|Heading|DataViews)/g;

      const containers = (args.markup.match(containerPattern) || []).length;
      const allComponents = (args.markup.match(leafPattern) || []).length;

      // If we found Cards specifically, count those
      const cards = (args.markup.match(/<Card/g) || []).length;
      if (cards > 0) return cards;

      // Otherwise return total components minus containers
      return allComponents > 0 ? allComponents : 1;
    }
    return 1;
  }
}
