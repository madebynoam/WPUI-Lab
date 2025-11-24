import { AgentMessage, ToolContext, ToolResult } from './types';
import { getTool, getToolsForLLM } from './tools/registry';
import { createLLMProvider } from './llm/factory';
import { LLMMessage } from './llm/types';

// Token estimation utility (rough estimate: 4 chars ≈ 1 token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Pricing for Claude Sonnet 4.5
const PRICE_PER_1K_INPUT = 0.001; // $1 per million tokens
const PRICE_PER_1K_OUTPUT = 0.005; // $5 per million tokens

const SYSTEM_PROMPT = `You are a UI builder assistant for WP-Designer.

CRITICAL: Use buildFromYAML to build UIs. Pass YAML as the "yaml" parameter!

Example:
buildFromYAML({
  yaml: "Grid:\\n  columns: 3\\n  children:\\n    - Card:\\n        title: Starter\\n        children:\\n          - Text: $9/mo\\n          - Button:\\n              text: Buy Now\\n    - Card:\\n        title: Pro\\n        children:\\n          - Text: $29/mo\\n          - Button:\\n              text: Buy Now\\n    - Card:\\n        title: Enterprise\\n        children:\\n          - Text: $99/mo\\n          - Button:\\n              text: Buy Now"
})

Available components: Grid, VStack, HStack, Card, Panel, Text, Heading, Button, Icon, DataViews

Cards auto-create CardHeader/CardBody. Use shortcuts: Card: { title: "Title", children: [...] }

DataViews displays tables/grids with sorting and pagination. Just provide data:
DataViews:
  data:
    - {id: 1, name: "Item 1", price: "$10"}
    - {id: 2, name: "Item 2", price: "$20"}
  columns:
    - {id: name, label: "Name"}
    - {id: price, label: "Price"}

Be conversational and friendly!`;

export async function handleUserMessage(
  userMessage: string,
  context: ToolContext,
  apiKey?: string
): Promise<AgentMessage> {
  // If no API key, fall back to basic rule-based responses
  if (!apiKey || !apiKey.trim()) {
    return {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: [
        {
          type: 'text',
          text: 'Please add your Claude API key to use the AI assistant. You can get one at https://console.anthropic.com/',
        },
      ],
      timestamp: Date.now(),
      archived: false,
      showIcon: true,
    };
  }

  try {
    // Create LLM provider
    // ACTIVE: Claude Sonnet 4.5
    const llm = createLLMProvider({
      provider: 'anthropic',
      apiKey,
      model: 'claude-sonnet-4-5',
    });

    // FALLBACK: OpenAI (uncomment to switch back)
    // const llm = createLLMProvider({
    //   provider: 'openai',
    //   apiKey,
    //   model: 'gpt-4o-mini',
    // });

    // Get tools in LLM format
    const tools = getToolsForLLM();

    // === PROMPT REFINEMENT STEP (DISABLED FOR NOW) ===
    // Skipping refinement to reduce confusion - going straight to user's message
    // const getCurrentPageTool = getTool('getCurrentPage');
    // ... (refinement code commented out)

    // Build conversation messages with user's original message
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Determine if this is an action request (should force tool use)
    const actionKeywords = ['add', 'create', 'update', 'delete', 'remove', 'modify', 'change', 'make'];
    const isActionRequest = actionKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));

    // Call LLM with user's original message
    const chatOptions = {
      messages,
      tools,
      temperature: 0.7,
      max_tokens: 1000,
      // Force tool use for action requests
      ...(isActionRequest ? { tool_choice: 'required' as const } : {}),
    };

    // Token tracking
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Estimate input tokens for first call (system + user message + tool definitions)
    const systemPromptTokens = estimateTokens(SYSTEM_PROMPT);
    const userMessageTokens = estimateTokens(userMessage);
    const toolsTokens = estimateTokens(JSON.stringify(tools));
    const firstCallInputTokens = systemPromptTokens + userMessageTokens + toolsTokens;
    totalInputTokens += firstCallInputTokens;

    console.log('[Agent] Calling LLM with options:', {
      messageCount: messages.length,
      toolCount: tools.length,
      isActionRequest,
      hasToolChoice: chatOptions.tool_choice !== undefined,
      estimatedInputTokens: firstCallInputTokens,
    });

    let response = await llm.chat(chatOptions);

    // Estimate output tokens
    const firstOutputTokens = estimateTokens(response.content || '') +
      estimateTokens(JSON.stringify(response.tool_calls || []));
    totalOutputTokens += firstOutputTokens;

    console.log('[Agent] Response received:', {
      hasContent: !!response.content,
      hasToolCalls: !!response.tool_calls,
      toolCallCount: response.tool_calls?.length || 0,
      finishReason: response.finish_reason,
      estimatedOutputTokens: firstOutputTokens,
    });

    // TOKEN OPTIMIZATION: Remove system message after first call
    // Anthropic doesn't need system prompt repeated on every iteration
    // This saves ~1,700 tokens per iteration!
    const systemMessageIndex = messages.findIndex(m => m.role === 'system');
    if (systemMessageIndex !== -1) {
      messages.splice(systemMessageIndex, 1);
      console.log('[Agent] Removed system prompt from messages to save tokens');
    }

    // Agentic loop: Continue until no more tool calls
    let iterationCount = 0;
    const MAX_ITERATIONS = 10; // Prevent infinite loops

    while (response.tool_calls && response.tool_calls.length > 0 && iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      console.log(`[Agent] Tool execution iteration ${iterationCount}`);

      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log('[Agent] Executing tool:', {
          tool: toolName,
          args: toolArgs,
        });

        // Get the tool
        const tool = getTool(toolName);
        if (!tool) {
          // Tool not found
          console.warn('[Agent] Tool not found:', toolName);
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
          const result: ToolResult = await tool.execute(toolArgs, context);

          console.log('[Agent] Tool result:', {
            tool: toolName,
            success: result.success,
            message: result.message,
          });

          // Add tool result to conversation
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          console.error('[Agent] Tool execution error:', error);
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

      // TOKEN OPTIMIZATION: Prune old tool results to prevent unbounded growth
      // Keep only the last 3 assistant+tool result pairs (plus initial user message)
      // This prevents sending the same large tool results repeatedly
      const MAX_TOOL_HISTORY = 3;
      const userMessage = messages[0]; // Keep the initial user message

      // Find all assistant messages (which precede tool results)
      const assistantIndices: number[] = [];
      messages.forEach((msg, idx) => {
        if (msg.role === 'assistant' && idx > 0) {
          assistantIndices.push(idx);
        }
      });

      // If we have more than MAX_TOOL_HISTORY assistant messages, prune old ones
      if (assistantIndices.length > MAX_TOOL_HISTORY) {
        const numToPrune = assistantIndices.length - MAX_TOOL_HISTORY;
        const pruneUpToIndex = assistantIndices[numToPrune]; // Keep from this index onward

        // Keep user message + recent assistant+tool pairs
        const prunedMessages = [
          userMessage,
          ...messages.slice(pruneUpToIndex),
        ];

        messages.length = 0;
        messages.push(...prunedMessages);

        console.log(`[Agent] Pruned ${numToPrune} old tool interaction(s) to save tokens. Messages: ${messages.length}`);
      }

      // Call LLM again with tool results
      // Keep tools available so it can make more calls if needed
      // Estimate input tokens for iteration (messages + tools)
      const iterationInputTokens = estimateTokens(JSON.stringify(messages)) + toolsTokens;
      totalInputTokens += iterationInputTokens;

      response = await llm.chat({
        messages,
        tools,
        temperature: 0.7,
        max_tokens: 1000,
      });

      // Estimate output tokens for iteration
      const iterationOutputTokens = estimateTokens(response.content || '') +
        estimateTokens(JSON.stringify(response.tool_calls || []));
      totalOutputTokens += iterationOutputTokens;

      console.log(`[Agent] Response after iteration ${iterationCount}:`, {
        hasContent: !!response.content,
        hasToolCalls: !!response.tool_calls,
        toolCallCount: response.tool_calls?.length || 0,
        finishReason: response.finish_reason,
        estimatedInputTokens: iterationInputTokens,
        estimatedOutputTokens: iterationOutputTokens,
      });
    }

    if (iterationCount >= MAX_ITERATIONS) {
      console.warn('[Agent] Max iterations reached, stopping tool execution loop');
    }

    // Calculate estimated cost
    const estimatedInputCost = (totalInputTokens / 1000) * PRICE_PER_1K_INPUT;
    const estimatedOutputCost = (totalOutputTokens / 1000) * PRICE_PER_1K_OUTPUT;
    const totalEstimatedCost = estimatedInputCost + estimatedOutputCost;

    console.log('[Agent] 💰 Request Summary:', {
      totalIterations: iterationCount + 1,
      estimatedInputTokens: totalInputTokens,
      estimatedOutputTokens: totalOutputTokens,
      totalEstimatedTokens: totalInputTokens + totalOutputTokens,
      estimatedInputCost: `$${estimatedInputCost.toFixed(4)}`,
      estimatedOutputCost: `$${estimatedOutputCost.toFixed(4)}`,
      totalEstimatedCost: `$${totalEstimatedCost.toFixed(4)}`,
      pricing: 'Claude Sonnet 4.5: $1/1M input, $5/1M output',
    });

    // Return agent response
  return {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: [
        {
          type: 'text',
          text: response.content || 'I\'m not sure how to respond to that.',
        },
      ],
      timestamp: Date.now(),
      archived: false,
      showIcon: true,
    };
  } catch (error) {
    console.error('LLM error:', error);

    // Return error message
    return {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: [
        {
          type: 'text',
          text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key and try again.`,
        },
      ],
      timestamp: Date.now(),
      archived: false,
      showIcon: true,
    };
  }
}

// Generate suggestions based on context
export function generateSuggestions(context: ToolContext) {
  const suggestions = [
    {
      id: 'pages',
      label: 'Show my pages',
      prompt: 'What pages do I have?',
    },
  ];

  // If something is selected, offer to delete it
  if (context.selectedNodeIds.length > 0) {
    suggestions.push({
      id: 'delete',
      label: 'Delete selected',
      prompt: 'Delete the selected component',
    });
  }

  // Always offer to add common components
  suggestions.push({
    id: 'add-button',
    label: 'Add a button',
    prompt: 'Add a button to the current page',
  });

  return suggestions;
}
