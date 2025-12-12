/**
 * Page Agent
 *
 * Specialist agent for page management:
 * - Create new pages
 * - Switch between pages
 * - Delete pages
 */

import { BaseAgent } from './BaseAgent';
import { AgentResult, LLMProvider, AgentProgressMessage } from './types';
import { ToolContext, AgentTool } from '../types';
import { MemoryStore } from '../memory/MemoryStore';
import { PAGE_AGENT_PROMPT } from '../prompts/pageAgent';

export class PageAgent extends BaseAgent {
  name = 'PageAgent';
  capabilities = ['page_creation', 'page_switching', 'page_deletion'];

  // Tool names this agent needs (real tools will be injected)
  requiredTools = ['createPage', 'switchPage'];

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

  /**
   * Check if this agent can handle the request
   */
  async canHandle(userMessage: string, memory: MemoryStore): Promise<boolean> {
    const lowerMessage = userMessage.toLowerCase();

    // Strong page indicators
    const strongPageKeywords = [
      'create page',
      'new page',
      'add page',
      'create a page',   // Added: handles "Create a page" without type
      'create an page',
      'switch to',
      'go to',
      'navigate to',
      'delete page',
      'remove page',
      'page called',
      'page named',
    ];

    // Check for strong page keywords
    const hasStrongPageKeyword = strongPageKeywords.some(keyword => lowerMessage.includes(keyword));
    if (hasStrongPageKeyword) return true;

    // Check for "create a/an [page type]" pattern
    const createPagePattern = /create\s+(a|an)\s+(new\s+)?(dashboard|about|home|pricing|contact|blog|settings|profile)\s+page/;
    if (createPagePattern.test(lowerMessage)) return true;

    // Check for standalone page type names at end (e.g., "Create a dashboard")
    const standalonePagePattern = /\b(dashboard|about|home|contact|blog|settings|profile)(\s+page)?$/;
    if (standalonePagePattern.test(lowerMessage) && /create|new|add/.test(lowerMessage)) return true;

    // Check for delete/remove page patterns (e.g., "Delete the pricing page")
    const deletePagePattern = /(delete|remove)\s+(the\s+)?[\w\s]*page/;
    if (deletePagePattern.test(lowerMessage)) return true;

    // Don't match generic messages like "Add X to this page" - those are component operations
    // Only match explicit page management operations
    return false;
  }

  /**
   * Execute the agent
   */
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
      this.emit('progress', 'Analyzing page operation...');

      // Build context message about existing pages
      const existingPagesContext = context.pages.length > 0
        ? `Existing pages: ${context.pages.map(p => `"${p.name}" (id: ${p.id})`).join(', ')}`
        : 'No existing pages';

      const currentPageContext = context.currentPageId
        ? `Currently on page: ${context.pages.find(p => p.id === context.currentPageId)?.name || 'Unknown'}`
        : 'No current page';

      // Prepare messages for LLM
      const messages = [
        {
          role: 'system',
          content: PAGE_AGENT_PROMPT,
        },
        {
          role: 'user',
          content: `${existingPagesContext}\n${currentPageContext}\n\nUser request: ${userMessage}`,
        },
      ];

      // Prepare tools for LLM
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

      // Call LLM
      const response = await this.callLLM({
        messages: messages as any,
        tools: toolSchemas,
        max_tokens: 1000,
      });

      // Handle tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          const tool = this.tools.find(t => t.name === toolCall.function.name);
          if (!tool) continue;

          const args = JSON.parse(toolCall.function.arguments);

          this.emit('progress', `Executing ${tool.name}...`);

          // Execute the tool
          const result = await tool.execute(args, context);

          if (result.success) {
            this.emit('success', result.message);

            // Write to memory based on tool
            if (toolCall.function.name === 'createPage') {
              this.writeMemory({
                action: 'page_created',
                entityId: result.data?.pageId || args.pageId,
                entityType: 'Page',
                details: { name: args.name },
              });
              memoryEntriesCreated++;

              // Auto-switch to newly created page
              context.setCurrentPage(result.data?.pageId);
            } else if (toolCall.function.name === 'switchPage') {
              this.writeMemory({
                action: 'page_switched',
                entityId: args.pageId,
                entityType: 'Page',
                details: { previousPageId: context.currentPageId },
              });
              memoryEntriesCreated++;
            } else if (toolCall.function.name === 'deletePage') {
              this.writeMemory({
                action: 'page_deleted',
                entityId: args.pageId,
                entityType: 'Page',
                details: {},
              });
              memoryEntriesCreated++;
            }
          } else {
            this.emit('error', result.error || 'Tool execution failed');
            return {
              ...this.createErrorResult(result.error || 'Tool execution failed'),
              duration: Date.now() - startTime,
            };
          }
        }
      } else if (response.content) {
        // LLM decided not to use tools (e.g., page already exists)
        this.emit('progress', response.content);

        // Check if we should use existing page
        if (response.content.toLowerCase().includes('already exists')) {
          const existingPage = context.pages.find(p =>
            response.content?.toLowerCase().includes(p.name.toLowerCase())
          );

          if (existingPage && existingPage.id !== context.currentPageId) {
            context.setCurrentPage(existingPage.id);
            this.writeMemory({
              action: 'page_switched',
              entityId: existingPage.id,
              entityType: 'Page',
              details: { reason: 'used_existing', previousPageId: context.currentPageId },
            });
            memoryEntriesCreated++;
            this.emit('success', `Switched to existing ${existingPage.name} page`);
          }
        }
      }

      const result = this.createSuccessResult(
        'Page operation completed',
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
}
