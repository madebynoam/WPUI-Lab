import { createLLMProvider } from '../llm/factory';
import { LLMMessage } from '../llm/types';
import { getTool } from '../tools/registry';
import {
  AgentExecutorOptions,
  AgentResult,
  MODEL_PRICING,
} from './types';

// Token estimation utility (4 chars ≈ 1 token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Execute an agent with tool calling support
 *
 * This is the core execution engine for individual agents.
 * It handles:
 * - LLM initialization
 * - Tool calling loop
 * - Token tracking
 * - Cost calculation
 * - Error handling
 */
export async function executeAgent(
  options: AgentExecutorOptions
): Promise<AgentResult> {
  const { task, config, context, apiKey, previousResults = [], signal, onProgress } = options;

  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let callCount = 0;

  try {
    // Create LLM provider
    const llm = createLLMProvider({
      provider: config.model.provider,
      apiKey,
      model: config.model.model,
    });

    // Get allowed tools for this agent
    const allowedToolNames = config.tools;
    const tools = allowedToolNames.map(name => {
      const tool = getTool(name);
      if (!tool) {
        console.warn(`[AgentExecutor] Tool not found: ${name}`);
        return null;
      }

      // Handle tools with no parameters
      const parameters = tool.parameters || {};

      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: Object.entries(parameters).reduce((acc, [key, param]: [string, any]) => {
              acc[key] = {
                type: param.type,
                description: param.description,
                ...(param.required ? {} : { optional: true }),
              };
              return acc;
            }, {} as Record<string, any>),
            required: Object.entries(parameters)
              .filter(([_, param]: [string, any]) => param.required)
              .map(([key]) => key),
          },
        },
      };
    }).filter(Boolean);

    // Build context from previous results
    const contextSummary = previousResults.length > 0
      ? `\n\nPrevious agent results:\n${previousResults.map(r =>
          `- ${r.agentType}: ${r.message}`
        ).join('\n')}`
      : '';

    // Build messages
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: config.systemPrompt + contextSummary,
      },
      {
        role: 'user',
        content: task.description + (task.input ? `\n\nInput: ${JSON.stringify(task.input)}` : ''),
      },
    ];

    // Estimate initial tokens
    const systemTokens = estimateTokens(config.systemPrompt + contextSummary);
    const userTokens = estimateTokens(messages[1].content);
    const toolsTokens = estimateTokens(JSON.stringify(tools));
    totalInputTokens += systemTokens + userTokens + toolsTokens;

    console.log(`[AgentExecutor] Starting ${config.type} agent for task: ${task.id}`);
    console.log(`[AgentExecutor] Allowed tools: ${allowedToolNames.join(', ')}`);
    console.log(`[AgentExecutor] Initial input tokens: ${totalInputTokens}`);

    // Determine if we should force tool use
    // Builder agents MUST use tools, so force it
    const forceToolUse = config.type === 'builder' && tools.length > 0;

    // Call LLM
    onProgress?.(`${config.type} agent: analyzing...`);
    let response = await llm.chat({
      messages,
      tools: tools as any,
      temperature: 0.7,
      max_tokens: 1000,
      ...(forceToolUse ? { tool_choice: 'required' } : {}),
      signal,
    });

    // Estimate output tokens
    let outputTokens = estimateTokens(response.content || '') +
      estimateTokens(JSON.stringify(response.tool_calls || []));
    totalOutputTokens += outputTokens;

    console.log(`[AgentExecutor] Initial response: ${response.tool_calls?.length || 0} tool calls`);
    console.log(`[AgentExecutor] Response content:`, response.content);
    console.log(`[AgentExecutor] Response finish_reason:`, response.finish_reason);

    // Remove system message after first call (token optimization)
    const systemIndex = messages.findIndex(m => m.role === 'system');
    if (systemIndex !== -1) {
      messages.splice(systemIndex, 1);
    }

    // Tool calling loop
    let iterationCount = 0;
    while (response.tool_calls && response.tool_calls.length > 0 && iterationCount < config.maxCalls) {
      iterationCount++;
      callCount += response.tool_calls.length;

      console.log(`[AgentExecutor] Iteration ${iterationCount}: ${response.tool_calls.length} tool calls`);

      // Add assistant message
      messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls,
      });

      // Execute tools
      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[AgentExecutor] Executing tool: ${toolName}`);
        onProgress?.(`${config.type} agent: ${toolName}...`);

        // Get the tool
        const tool = getTool(toolName);
        if (!tool) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error: `Unknown tool: ${toolName}`,
            }),
          });
          continue;
        }

        // Execute tool
        try {
          const result = await tool.execute(toolArgs, context);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          console.error(`[AgentExecutor] Tool execution error:`, error);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          });
        }
      }

      // Estimate tokens for iteration
      const iterationInputTokens = estimateTokens(JSON.stringify(messages)) + toolsTokens;
      totalInputTokens += iterationInputTokens;

      // Call LLM again
      response = await llm.chat({
        messages,
        tools: tools as any,
        temperature: 0.7,
        max_tokens: 1000,
        signal,
      });

      // Estimate output tokens
      outputTokens = estimateTokens(response.content || '') +
        estimateTokens(JSON.stringify(response.tool_calls || []));
      totalOutputTokens += outputTokens;
    }

    if (iterationCount >= config.maxCalls) {
      console.warn(`[AgentExecutor] Max calls reached for ${config.type} agent`);
    }

    // Calculate cost
    const pricing = MODEL_PRICING[config.model.model];
    const inputCost = (totalInputTokens / 1000) * pricing.input;
    const outputCost = (totalOutputTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    const duration = Date.now() - startTime;

    console.log(`[AgentExecutor] ${config.type} agent completed:`, {
      callCount,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cost: `$${totalCost.toFixed(4)}`,
      duration: `${duration}ms`,
    });

    // Return result
    return {
      taskId: task.id,
      agentType: config.type,
      success: true,
      message: response.content || 'Completed',
      data: response.content,
      callCount,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cost: totalCost,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[AgentExecutor] ${config.type} agent error:`, error);

    return {
      taskId: task.id,
      agentType: config.type,
      success: false,
      message: 'Agent execution failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      callCount,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cost: 0,
      duration,
    };
  }
}
