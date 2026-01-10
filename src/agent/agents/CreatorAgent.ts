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
import { DECOMPOSER_PROMPT } from '../prompts/decomposer';

export class CreatorAgent extends BaseAgent {
  name = 'CreatorAgent';
  capabilities = ['component_creation', 'section_templates', 'table_creation'];

  // Tool names this agent needs (real tools will be injected)
  requiredTools = ['buildFromMarkup', 'section_create', 'table_create', 'design_getHeuristics'];

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

  async canHandle(userMessage: string, _memory: MemoryStore): Promise<boolean> {
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

  /**
   * Decompose complex requests into sub-requests
   *
   * Uses LLM to split requests like "pricing and testimonials" into ["pricing", "testimonials"]
   *
   * @param userMessage - The user's request
   * @returns Array of sub-requests (single-item array if request is simple)
   */
  private async decompose(userMessage: string, signal?: AbortSignal, originalContext?: string): Promise<string[]> {
    try {
      // Build user message with optional context for domain-aware decomposition
      const contextNote = originalContext
        ? `\n\nOriginal full request for context: ${originalContext}\n\nCurrent instruction to decompose:`
        : '';

      const response = await this.callLLM({
        messages: [
          {
            role: 'system',
            content: DECOMPOSER_PROMPT,
          },
          {
            role: 'user',
            content: `${contextNote}\n${userMessage}`,
          },
        ],
        temperature: 0.3,  // Low variance for consistent decomposition
        max_tokens: 300,   // Short response (just JSON array)
        signal,
      });

      const content = response.content?.trim();

      if (!content) {
        return [userMessage];
      }

      // Parse JSON array response
      try {
        const subRequests = JSON.parse(content);

        if (Array.isArray(subRequests) && subRequests.length > 0) {
          return subRequests;
        }
      } catch {
        // Failed to parse decomposition JSON - using original request
      }

      // Fallback: return original request
      return [userMessage];

    } catch {
      // Decomposition error - falling back to original request
      return [userMessage];
    }
  }

  /**
   * Get original user request from memory as fallback context
   *
   * This provides domain context when the agent instruction is too minimal.
   */
  private getOriginalContext(memory: MemoryStore): string {
    const originalRequest = memory.search({ action: 'user_request' });
    if (originalRequest.length > 0 && originalRequest[0].details?.fullMessage) {
      return originalRequest[0].details.fullMessage;
    }
    return '';
  }

  async execute(
    userMessage: string,
    context: ToolContext,
    memory: MemoryStore,
    onMessage?: (message: AgentProgressMessage) => void,
    signal?: AbortSignal
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
      // NOTE: Don't include page ID in context - it's NEVER used as parentId
      // This prevents LLM confusion about when to use page IDs
      const pageContext = recentPage.length > 0
        ? `Working on page: ${recentPage[0].details.name}`
        : `Working on current page`;

      // Build selection context - tell LLM about currently selected component
      let selectionContext = '';
      if (context.selectedNodeIds && context.selectedNodeIds.length > 0) {
        const selectedId = context.selectedNodeIds[0];
        const selectedNode = context.getNodeById(selectedId);
        if (selectedNode) {
          selectionContext = `\n\nCURRENTLY SELECTED: ${selectedNode.type} (id: "${selectedId}")
When user says "selected", "the selected", or "this" - use parentId: "${selectedId}"`;
        }
      }

      // Get original user request for additional domain context
      const originalContext = this.getOriginalContext(memory);
      const contextNote = originalContext
        ? `\n\nOriginal user request context: ${originalContext}`
        : '';

      if (recentPage.length > 0) {
        this.emit('progress', `Found page: ${recentPage[0].details.name}`);
      }

      // Decompose request into sub-requests
      this.emit('progress', 'Decomposing request...');
      const subRequests = await this.decompose(userMessage, signal, originalContext);

      if (subRequests.length > 1) {
        this.emit('progress', `Split into ${subRequests.length} sub-requests`);
      }

      // Execute each sub-request separately
      for (let i = 0; i < subRequests.length; i++) {
        const subRequest = subRequests[i];
        const isMultiple = subRequests.length > 1;

        if (isMultiple) {
          this.emit('progress', `[${i + 1}/${subRequests.length}] Creating: ${subRequest}`);
        } else {
          this.emit('progress', 'Preparing to create components...');
        }

        const messages = [
          {
            role: 'system',
            content: CREATOR_AGENT_PROMPT,
          },
          {
            role: 'user',
            content: `${pageContext}${selectionContext}${contextNote}\n\nUser request: ${subRequest}`,
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
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { required, ...rest } = param as Record<string, unknown>;
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
          messages: messages as never[],
          tools: toolSchemas,
          temperature: 0.1,  // Low temperature for deterministic layout decisions
          max_tokens: 1500,  // Smaller per sub-request (not generating everything at once)
          signal,
        });

        if (response.tool_calls && response.tool_calls.length > 0) {
          // Two-phase pattern for design_getHeuristics
          let designHeuristics: string | null = null;
          let actionToolExecuted = false;

          // Execute all tool calls
          for (const toolCall of response.tool_calls) {
            const tool = this.tools.find(t => t.name === toolCall.function.name);
            if (!tool) continue;

            const args = JSON.parse(toolCall.function.arguments);

            this.emit('progress', `Executing ${tool.name}...`);

            const result = await tool.execute(args, context);

            if (!result.success) {
              this.emit('error', result.error || 'Tool execution failed');
              return {
                ...this.createErrorResult(result.error || 'Tool execution failed'),
                duration: Date.now() - startTime,
              };
            }

            // Check if this is design_getHeuristics or an action tool
            if (toolCall.function.name === 'design_getHeuristics') {
              designHeuristics = result.message;
              this.emit('progress', 'Design heuristics retrieved');
            } else {
              // This is an action tool (buildFromMarkup, table_create, etc.)
              actionToolExecuted = true;
              this.emit('success', result.message);

              // Write to memory only for action tools
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
                  subRequest,  // Track which sub-request this came from
                },
              });
              memoryEntriesCreated++;
            }
          }

          // If agent ONLY called design_getHeuristics, make a second LLM call
          if (designHeuristics && !actionToolExecuted) {
            this.emit('progress', 'Generating markup with design heuristics...');

            // Format tools for OpenAI (same as initial call)
            const toolSchemas = this.tools.map(tool => ({
              type: 'function',
              function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                  type: 'object',
                  properties: Object.fromEntries(
                    Object.entries(tool.parameters || {}).map(([key, param]) => {
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { required, ...rest } = param as Record<string, unknown>;
                      return [key, rest];
                    })
                  ),
                  required: Object.keys(tool.parameters || {}).filter(
                    key => tool.parameters?.[key].required
                  ),
                },
              },
            }));

            // Make second LLM call with heuristics injected
            const followUpResponse = await this.callLLM({
              messages: [
                {
                  role: 'system',
                  content: CREATOR_AGENT_PROMPT,
                },
                {
                  role: 'user',
                  content: `${pageContext}${selectionContext}${contextNote}\n\nUser request: ${subRequest}`,
                },
                {
                  role: 'assistant',
                  content: "",
                  tool_calls: response.tool_calls,  // Original heuristics call
                },
                {
                  role: 'tool',
                  tool_call_id: response.tool_calls![0].id,
                  content: designHeuristics,  // Heuristics result
                },
              ],
              tools: toolSchemas,
              temperature: 0.1,  // Low temperature for deterministic layout decisions
              max_tokens: 2000,
              signal,
            });

            // Execute tools from follow-up response
            if (followUpResponse.tool_calls && followUpResponse.tool_calls.length > 0) {
              for (const toolCall of followUpResponse.tool_calls) {
                const tool = this.tools.find(t => t.name === toolCall.function.name);
                if (!tool) continue;

                const args = JSON.parse(toolCall.function.arguments);

                this.emit('progress', `Executing ${tool.name}...`);

                const result = await tool.execute(args, context);

                if (!result.success) {
                  this.emit('error', result.error || 'Tool execution failed');
                  return {
                    ...this.createErrorResult(result.error || 'Tool execution failed'),
                    duration: Date.now() - startTime,
                  };
                }

                this.emit('success', result.message);

                // Write to memory
                const entityType = this.getEntityType(toolCall.function.name, args);
                const componentCount = this.estimateComponentCount(args);

                this.writeMemory({
                  action: 'component_created',
                  entityId: result.data?.componentIds || result.data?.componentId || 'unknown',
                  entityType,
                  details: {
                    ...result.data,
                    method: toolCall.function.name,
                    template: args.template,
                    count: componentCount,
                    subRequest,
                  },
                });
                memoryEntriesCreated++;
              }
            }
          }
        } else if (response.content) {
          this.emit('progress', response.content);
        }
      }

      const result = this.createSuccessResult(
        subRequests.length > 1
          ? `Created ${subRequests.length} component groups`
          : 'Component creation completed',
        {},
        memoryEntriesCreated
      );

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', errorMessage);
      const result = this.createErrorResult(errorMessage);
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
      const leafPattern = /<(Card|Button|Text|Heading|DataViews)/g;
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
