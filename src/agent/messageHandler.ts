import { AgentMessage, ToolContext, ToolResult } from './types';
import { getTool, getToolsForLLM } from './tools/registry';
import { createLLMProvider } from './llm/factory';
import { LLMMessage } from './llm/types';
import { getAgentModel, AVAILABLE_MODELS } from './agentConfig';
import { getAgentComponentSummary } from '../config/availableComponents';

// Token estimation utility (rough estimate: 4 chars ≈ 1 token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Humanize tool names for progress messages
function humanizeToolName(toolName: string, toolArgs?: any): string {
  const humanized: Record<string, string> = {
    context_getProject: 'Getting project context...',
    context_searchComponents: 'Searching components...',
    component_update: 'Updating component...',
    component_delete: 'Deleting component...',
    component_move: 'Moving component...',
    section_create: `Creating ${toolArgs?.template || ''} section...`,
    buildFromYAML: 'Building components...',
    modifyComponentTree: 'Modifying layout...',
    duplicateComponent: 'Duplicating component...',
    copyComponent: 'Copying component...',
    pasteComponent: 'Pasting component...',
    addInteraction: 'Adding interaction...',
    removeInteraction: 'Removing interaction...',
    updateInteraction: 'Updating interaction...',
    createPage: `Creating page "${toolArgs?.name || ''}"...`,
    switchPage: 'Switching page...',
    updatePageTheme: 'Updating theme...',
  };

  return humanized[toolName] || `Running ${toolName}...`;
}

// Get pricing for the current model from centralized config
function getModelPricing(modelName: string) {
  const modelConfig = AVAILABLE_MODELS[modelName as keyof typeof AVAILABLE_MODELS];
  if (modelConfig?.pricing) {
    return modelConfig.pricing;
  }
  // Default fallback pricing
  return { input: 0.001, output: 0.005 };
}

const SYSTEM_PROMPT = `You are a UI builder assistant for WP-Designer.

CRITICAL WORKFLOW:
1. ALWAYS call context_getProject FIRST to see what's selected and get page context
2. If user says "change the button" and a Button is SELECTED, use its componentId directly - DO NOT ask which one
3. If nothing is selected and multiple components match, THEN use disambiguation

SELECTION PRIORITY:
- Selected component = user wants to edit THIS specific component
- Use the selected component's ID directly in component_update
- Only search/disambiguate when nothing is selected

TOOL USAGE:
- For bulk creation (3+ components): Use buildFromYAML or section_create
- For single updates: Use component_update with selected componentId
- For searches: Use context_searchComponents

BUILDYAML SYNTAX:
buildFromYAML({
  yaml: "Grid:\\n  columns: 3\\n  children:\\n    - Card:\\n        title: Starter\\n        children:\\n          - Text: $9/mo\\n          - Button:\\n              text: Buy Now"
})

${getAgentComponentSummary()}

Be conversational and friendly!`;

export async function handleUserMessage(
  userMessage: string,
  context: ToolContext,
  claudeApiKey?: string,
  openaiApiKey?: string,
  onProgress?: (update: any) => void,
  signal?: AbortSignal,
  conversationHistory?: AgentMessage[]
): Promise<AgentMessage> {
  // API keys are now handled server-side via Next.js API routes
  // No client-side validation needed


  try {
    // === v2.0 SINGLE-AGENT YAML DSL ===
    console.log('[Agent] Using v2.0 single-agent YAML DSL');

    // Create LLM provider using centralized config
    const config = getAgentModel('agent');
    const llm = createLLMProvider({
      provider: config.provider,
      apiKey: claudeApiKey!,
      model: config.model,
    });

    // Get pricing for current model
    const pricing = getModelPricing(config.model);

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

    // Build chat options - provider will handle model-specific parameter constraints
    const chatOptions: any = {
      messages,
      tools,
      max_tokens: 1000,
      temperature: 0.7,
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

        // Send progress message before executing tool
        onProgress?.({
          phase: 'executing',
          message: humanizeToolName(toolName, toolArgs),
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

          // Send progress message with tool result
          if (result.success && result.message) {
            onProgress?.({
              phase: 'executing',
              message: result.message,
            });
          }

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

      // Call LLM - provider will handle model-specific parameter constraints
      response = await llm.chat({
        messages,
        tools,
        max_tokens: 1000,
        temperature: 0.7,
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

    // Calculate estimated cost using current model's pricing
    const estimatedInputCost = (totalInputTokens / 1000) * pricing.input;
    const estimatedOutputCost = (totalOutputTokens / 1000) * pricing.output;
    const totalEstimatedCost = estimatedInputCost + estimatedOutputCost;

    console.log('[Agent] 💰 Request Summary:', {
      totalIterations: iterationCount + 1,
      estimatedInputTokens: totalInputTokens,
      estimatedOutputTokens: totalOutputTokens,
      totalEstimatedTokens: totalInputTokens + totalOutputTokens,
      estimatedInputCost: `$${estimatedInputCost.toFixed(4)}`,
      estimatedOutputCost: `$${estimatedOutputCost.toFixed(4)}`,
      totalEstimatedCost: `$${totalEstimatedCost.toFixed(4)}`,
      model: config.model,
      pricing: `$${pricing.input}/1K input, $${pricing.output}/1K output`,
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

// Contextual suggestions map by component type
const CONTEXTUAL_SUGGESTIONS: Record<string, Array<{id: string, label: string, prompt: string}>> = {
  DataViews: [
    {
      id: 'change-datasource',
      label: 'Change table data',
      prompt: 'Change this table to show active subscriptions with columns for customer name, plan type, monthly revenue, start date, and status',
    },
    {
      id: 'switch-to-grid',
      label: 'Switch to grid view',
      prompt: 'Change this table to a grid view layout',
    },
  ],
  Button: [
    {
      id: 'change-button-text',
      label: 'Change button text',
      prompt: 'Change this button text to "Get Started"',
    },
    {
      id: 'add-button-action',
      label: 'Add click action',
      prompt: 'Make this button navigate to the pricing page when clicked',
    },
  ],
  Card: [
    {
      id: 'change-card-title',
      label: 'Change card title',
      prompt: 'Change the card title to "Premium Plan"',
    },
    {
      id: 'add-card-content',
      label: 'Add content to card',
      prompt: 'Add a description and pricing details to this card',
    },
  ],
  CardHeader: [
    {
      id: 'change-header-title',
      label: 'Change header title',
      prompt: 'Change the header text to "Dashboard Overview"',
    },
  ],
  Heading: [
    {
      id: 'change-heading-text',
      label: 'Change heading text',
      prompt: 'Change this heading to "Welcome to Our Platform"',
    },
    {
      id: 'change-heading-level',
      label: 'Change heading level',
      prompt: 'Make this a level 1 heading',
    },
  ],
  Text: [
    {
      id: 'change-text-content',
      label: 'Change text content',
      prompt: 'Change this text to "Learn more about our features"',
    },
  ],
  Modal: [
    {
      id: 'change-modal-title',
      label: 'Change modal title',
      prompt: 'Change the modal title to "Confirm Action"',
    },
    {
      id: 'add-modal-content',
      label: 'Add content to modal',
      prompt: 'Add a confirmation message and action buttons to this modal',
    },
  ],
  Popover: [
    {
      id: 'change-popover-content',
      label: 'Change popover content',
      prompt: 'Update the popover to show help text about this feature',
    },
  ],
  VStack: [
    {
      id: 'change-spacing',
      label: 'Change spacing',
      prompt: 'Increase the spacing between items in this stack',
    },
    {
      id: 'change-alignment',
      label: 'Change alignment',
      prompt: 'Center-align all items in this stack',
    },
  ],
  HStack: [
    {
      id: 'change-spacing',
      label: 'Change spacing',
      prompt: 'Increase the spacing between items in this stack',
    },
    {
      id: 'change-alignment',
      label: 'Change alignment',
      prompt: 'Center-align all items in this stack',
    },
  ],
  Grid: [
    {
      id: 'change-grid-columns',
      label: 'Change grid columns',
      prompt: 'Change this grid to have 3 columns',
    },
    {
      id: 'change-grid-gap',
      label: 'Change grid spacing',
      prompt: 'Increase the gap between grid items',
    },
  ],
  Flex: [
    {
      id: 'change-flex-direction',
      label: 'Change flex direction',
      prompt: 'Switch this to a horizontal layout',
    },
    {
      id: 'change-flex-alignment',
      label: 'Change alignment',
      prompt: 'Center-align items in this flex container',
    },
  ],
};

// Component types that should NOT show the "Add a new page" suggestion
const CONTEXT_SPECIFIC_COMPONENTS = Object.keys(CONTEXTUAL_SUGGESTIONS);

// Generate suggestions based on context
export function generateSuggestions(context: ToolContext) {
  const suggestions = [];

  // If something is selected, offer contextual actions
  if (context.selectedNodeIds.length > 0) {
    const selectedNode = context.getNodeById(context.selectedNodeIds[0]);
    const componentType = selectedNode?.type;

    // Check if this component has contextual suggestions
    if (componentType && CONTEXTUAL_SUGGESTIONS[componentType]) {
      // Add contextual suggestions for this component type
      suggestions.push(...CONTEXTUAL_SUGGESTIONS[componentType]);
    } else {
      // For components without specific suggestions, show generic "Add a new page"
      suggestions.push({
        id: 'add-page',
        label: 'Add a new page',
        prompt: 'Add a new page titled pricing and add pricing cards to it',
      });
    }

    // Always show "Delete selected" when something is selected
    suggestions.push({
      id: 'delete',
      label: 'Delete selected',
      prompt: 'Please remove the currently selected component from the page for me',
    });
  } else {
    // Nothing selected - show only "Add a new page"
    suggestions.push({
      id: 'add-page',
      label: 'Add a new page',
      prompt: 'Add a new page titled pricing and add pricing cards to it',
    });
  }

  return suggestions;
}
