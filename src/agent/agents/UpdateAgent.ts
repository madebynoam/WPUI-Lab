/**
 * Update Agent
 *
 * Specialist agent for component modifications:
 * - Update component props
 * - Move components
 * - Delete components
 */

import { BaseAgent } from './BaseAgent';
import { AgentResult, LLMProvider, AgentProgressMessage } from './types';
import { ToolContext, AgentTool } from '../types';
import { MemoryStore } from '../memory/MemoryStore';
import { UPDATE_AGENT_PROMPT } from '../prompts/updateAgent';

export class UpdateAgent extends BaseAgent {
  name = 'UpdateAgent';
  capabilities = ['component_update', 'component_move', 'component_delete'];

  // Tool names this agent needs (real tools will be injected)
  requiredTools = ['component_update', 'component_delete', 'component_move'];

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

    const updateKeywords = ['change', 'update', 'modify', 'edit', 'set', 'make'];
    const deleteKeywords = ['delete', 'remove'];
    const moveKeywords = ['move'];

    const hasUpdate = updateKeywords.some(kw => lowerMessage.includes(kw));
    const hasDelete = deleteKeywords.some(kw => lowerMessage.includes(kw));
    const hasMove = moveKeywords.some(kw => lowerMessage.includes(kw));

    // Exclude creation requests
    const isCreation = lowerMessage.includes('add') ||
      lowerMessage.includes('create') ||
      lowerMessage.includes('build');

    // Exclude page operations (should be handled by PageAgent)
    const isPageOperation = lowerMessage.includes('page') &&
      (lowerMessage.includes('delete') || lowerMessage.includes('remove'));

    return (hasUpdate || hasDelete || hasMove) && !isCreation && !isPageOperation;
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
      this.emit('progress', 'Analyzing update request...');

      // Check memory for recently created components
      const recentComponents = memory.search({ action: 'component_created' });
      const componentContext = recentComponents.length > 0
        ? `Recently created: ${recentComponents.slice(-3).map(c => `${c.entityType} (${c.entityId})`).join(', ')}`
        : 'No recent components in memory';

      const messages = [
        {
          role: 'system',
          content: UPDATE_AGENT_PROMPT,
        },
        {
          role: 'user',
          content: `${componentContext}\n\nUser request: ${userMessage}`,
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
        signal,
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
            if (toolCall.function.name === 'component_update') {
              this.writeMemory({
                action: 'component_updated',
                entityId: args.componentId || args.selector?.id || result.data?.componentId || 'unknown',
                entityType: result.data?.type || 'Component',
                details: { changes: args.props || args.text },
              });
              memoryEntriesCreated++;
            } else if (toolCall.function.name === 'component_move') {
              this.writeMemory({
                action: 'component_moved',
                entityId: args.componentId,
                details: {
                  from: result.data?.previousParentId,
                  to: args.to?.parentId,
                  position: args.to?.position,
                },
              });
              memoryEntriesCreated++;
            } else if (toolCall.function.name === 'component_delete') {
              this.writeMemory({
                action: 'component_deleted',
                entityId: args.componentId,
                entityType: result.data?.type || 'Component',
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
        this.emit('progress', response.content);
      }

      const result = this.createSuccessResult(
        'Component update completed',
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
