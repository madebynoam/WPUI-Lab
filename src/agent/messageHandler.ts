import { AgentMessage, ToolContext, ToolResult } from './types';
import { getTool, getToolsForLLM, convertToolToLLM } from './tools/registry';
import { createLLMProvider } from './llm/factory';
import { LLMMessage } from './llm/types';
import { getAgentModel, AVAILABLE_MODELS, getModelCapabilities } from './agentConfig';
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
    table_create: `Creating ${toolArgs?.template || ''} table...`,
    buildFromMarkup: 'Building components...',
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

COMMUNICATION STYLE:
- Be VERBOSE and explain each step you're taking
- When calling a tool, briefly explain what you're doing and why
- Examples:
  * "Let me check what's on the page..." (before context_getProject)
  * "I see you have X selected. I'll update it now..." (before component_update)
  * "Creating a users table with sample data..." (before table_create)
  * "Building your components..." (before buildFromMarkup)
- After tools succeed, confirm what was done in a friendly way
- Make the user feel informed about the process

CRITICAL WORKFLOW:
1. ALWAYS call context_getProject FIRST to see what's selected and get page context
2. If user says "change the button" and a Button is SELECTED, use its componentId directly - DO NOT ask which one
3. If nothing is selected and multiple components match, THEN use disambiguation

SELECTION PRIORITY:
- Selected component = user wants to edit THIS specific component
- Use the selected component's ID directly in component_update
- Only search/disambiguate when nothing is selected

CRITICAL - ADDING COMPONENTS:
- When user says "add X" and something is SELECTED → Create X INSIDE the selected component
  * Pass the selected componentId as parentId to buildFromMarkup, table_create, section_create, etc.
  * Example: CardBody is selected + "add a table" → table_create({template: "users", parentId: cardBodyId})
- When nothing is selected → Create at root level (no parentId)

TOOL USAGE:
- For bulk creation (3+ components): Use buildFromMarkup or section_create
- For tables/data display: Use table_create (NEVER manually create DataViews)
- For single updates: Use component_update with selected componentId
- For searches: Use context_searchComponents
- For complex UIs (dashboards, landing pages, multi-section layouts): Use buildFromMarkup with nested components
- CRITICAL: When a tool returns success=true, the operation is COMPLETE:
  * Do NOT verify with context_getProject or context_searchComponents
  * Do NOT try to duplicate/copy the created component
  * Do NOT create additional components to wrap it
  * STOP and respond to the user immediately
  * The success message is the source of truth

HANDLING COMPLEX REQUESTS:
- User asks for "dashboard", "landing page", "stats page" → Create it using buildFromMarkup or section_create
- Break complex UIs into sections: use Grid for columns, VStack for vertical stacking
- Stats/metrics: Grid with Cards showing numbers and labels
- Tables: Use table_create with appropriate template
- NEVER say "I don't know how to respond" - you can ALWAYS create UI!

TABLES & DATA:
- User says "add a table" or "create a users table" → Use table_create tool ONCE and STOP
- table_create has templates: users, orders, products, tasks, invoices, transactions, tickets, inventory, leads
- Example: table_create({template: "users"}) creates a complete users table
- CRITICAL: table_create is a COMPLETE operation - do NOT:
  * Try to copy/duplicate the table after creation
  * Try to verify with context_getProject
  * Try to create additional markup
  * The success message means it's DONE - respond to user and STOP
- NEVER manually create DataViews components - always use table_create instead

MARKUP SYNTAX (JSX-like):
buildFromMarkup({
  markup: "<Grid columns={3} gap={4}>\\n  <Card>\\n    <CardHeader>\\n      <Heading level={3}>Starter</Heading>\\n    </CardHeader>\\n    <CardBody>\\n      <Text>$9/mo</Text>\\n      <Button variant=\\"primary\\">Buy Now</Button>\\n    </CardBody>\\n  </Card>\\n</Grid>"
})

IMPORTANT CARD STRUCTURE:
- Card components MUST contain CardHeader, CardBody, and/or CardFooter as direct children
- NEVER put Heading, Text, Button, etc. directly in Card - wrap them in CardHeader/CardBody/CardFooter
- Example: <Card><CardHeader><Heading>Title</Heading></CardHeader><CardBody><Text>Content</Text></CardBody></Card>

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
    // === v2.0 SINGLE-AGENT JSX MARKUP ===
    console.log('[Agent] Using v2.0 single-agent JSX markup');

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

    // Get model capabilities to check if temperature is supported
    const capabilities = getModelCapabilities(config.model);

    // Build chat options - provider will handle model-specific parameter constraints
    const chatOptions: any = {
      messages,
      tools,
      max_tokens: 1000,
      // Only set temperature if the model supports it (reasoning models don't)
      ...(capabilities.supportsCustomTemperature ? { temperature: 0.2 } : {}),
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

      // Track if we executed an action tool successfully
      let executedActionTool = false;

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

          // Check if this was a successful action tool (creation/modification tools)
          const actionTools = ['buildFromMarkup', 'table_create', 'section_create', 'component_update', 'component_delete', 'createPage', 'duplicateComponent'];
          if (result.success && actionTools.includes(toolName)) {
            executedActionTool = true;
            console.log('[Agent] ✅ Action tool completed successfully - will stop tool execution loop');
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
      // If we executed an action tool successfully, DON'T offer tools again (forces LLM to respond and stop)
      // Otherwise, keep tools available for context tools like context_getProject
      const nextTools = executedActionTool ? undefined : tools;

      // Estimate input tokens for iteration (messages + tools if provided)
      const iterationInputTokens = estimateTokens(JSON.stringify(messages)) + (nextTools ? toolsTokens : 0);
      totalInputTokens += iterationInputTokens;

      console.log('[Agent] Calling LLM after tool execution:', {
        executedActionTool,
        toolsOffered: !!nextTools,
        messageCount: messages.length,
      });

      // Call LLM - provider will handle model-specific parameter constraints
      response = await llm.chat({
        messages,
        ...(nextTools ? { tools: nextTools } : {}),
        max_tokens: 1000,
        // Only set temperature if the model supports it (reasoning models don't)
        ...(capabilities.supportsCustomTemperature ? { temperature: 0.2 } : {}),
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

// ========== PHASE-BASED AGENT SYSTEM ==========

import { PLANNER_PROMPT } from './prompts/planner';
import { getBUILDER_PROMPT } from './prompts/builder';
import { getVERIFIER_PROMPT } from './prompts/verifier';

// Re-export prompts for use in AgentPanel
export { PLANNER_PROMPT, getBUILDER_PROMPT };

export interface PhaseResult {
  phase: 'planner' | 'builder' | 'verifier';
  prompt: string;
  output: any;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  success: boolean;
  error?: string;
}

export interface PhasedAgentResult {
  phases: PhaseResult[];
  totalCost: number;
  totalDuration: number;
  finalMessage: AgentMessage;
}

/**
 * Execute a single agent phase
 */
export async function executePhase(
  phaseName: 'planner' | 'builder' | 'verifier',
  prompt: string,
  userMessage: string,
  context: ToolContext,
  claudeApiKey: string | undefined,
  tools: any[],
  onProgress?: (update: any) => void
): Promise<PhaseResult> {
  const startTime = Date.now();

  try {
    // Create LLM provider
    const config = getAgentModel('agent');
    const llm = createLLMProvider({
      provider: config.provider,
      apiKey: claudeApiKey || '',
      model: config.model,
    });

    const pricing = getModelPricing(config.model);

    // Build messages
    const messages: LLMMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: userMessage },
    ];

    let totalInputTokens = estimateTokens(prompt) + estimateTokens(userMessage);
    let totalOutputTokens = 0;

    // Tool execution loop (same as main agent)
    let iterationCount = 0;
    const MAX_ITERATIONS = 10;

    while (iterationCount < MAX_ITERATIONS) {
      const response = await llm.chat({ messages, tools });

      const outputTokens = estimateTokens(response.content || '') + estimateTokens(JSON.stringify(response.tool_calls || []));
      totalOutputTokens += outputTokens;

      // If no tool calls, we're done
      if (!response.tool_calls || response.tool_calls.length === 0) {
        const duration = Date.now() - startTime;
        const cost = ((totalInputTokens / 1000) * pricing.input) + ((totalOutputTokens / 1000) * pricing.output);

        return {
          phase: phaseName,
          prompt,
          output: response.content,
          duration,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          cost,
          success: true,
        };
      }

      // Execute tool calls
      const toolResults: any[] = [];
      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        if (onProgress) {
          onProgress({
            phase: phaseName,
            message: humanizeToolName(toolName, toolArgs),
          });
        }

        const tool = getTool(toolName);
        if (!tool) {
          toolResults.push({
            tool_call_id: toolCall.id,
            content: `Tool "${toolName}" not found`,
          });
          continue;
        }

        const result = await tool.execute(toolArgs, context);
        toolResults.push({
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Add assistant message and tool results
      messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls,
      });

      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          content: result.content,
          tool_call_id: result.tool_call_id,
        });
      }

      const iterationInputTokens = estimateTokens(JSON.stringify(messages));
      totalInputTokens += iterationInputTokens;

      iterationCount++;
    }

    // Max iterations reached
    const duration = Date.now() - startTime;
    const cost = ((totalInputTokens / 1000) * pricing.input) + ((totalOutputTokens / 1000) * pricing.output);

    return {
      phase: phaseName,
      prompt,
      output: 'Max iterations reached',
      duration,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cost,
      success: false,
      error: 'Max iterations reached',
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      phase: phaseName,
      prompt,
      output: null,
      duration,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle user message using phase-based approach
 * This is the new phased agent system for debug mode
 */
export async function handleUserMessagePhased(
  userMessage: string,
  context: ToolContext,
  claudeApiKey: string,
  onProgress?: (update: any) => void
): Promise<PhasedAgentResult> {
  const phases: PhaseResult[] = [];
  let plan: any = null;

  // Phase 1: Planning
  if (onProgress) {
    onProgress({ phase: 'planner', message: 'Planning...' });
  }

  const contextTools = [getTool('context_getProject'), getTool('context_searchComponents')].filter(Boolean);
  const plannerResult = await executePhase(
    'planner',
    PLANNER_PROMPT,
    userMessage,
    context,
    claudeApiKey,
    contextTools.map(t => convertToolToLLM(t!)),
    onProgress
  );

  phases.push(plannerResult);

  // Try to parse plan from output
  try {
    const jsonMatch = plannerResult.output?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      plan = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[Phased Agent] Failed to parse plan:', e);
  }

  // Phase 2: Building
  if (plan && plannerResult.success) {
    if (onProgress) {
      onProgress({ phase: 'builder', message: 'Building...' });
    }

    const allTools = getToolsForLLM();
    const builderResult = await executePhase(
      'builder',
      getBUILDER_PROMPT(plan),
      `Execute this plan: ${JSON.stringify(plan)}`,
      context,
      claudeApiKey,
      allTools,
      onProgress
    );

    phases.push(builderResult);
  }

  // Calculate totals
  const totalCost = phases.reduce((sum, p) => sum + p.cost, 0);
  const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);

  // Create final message
  const lastPhase = phases[phases.length - 1];
  const finalMessage: AgentMessage = {
    id: `agent-${Date.now()}`,
    role: 'agent',
    content: [{
      type: 'text',
      text: lastPhase.output || 'Completed',
    }],
    timestamp: Date.now(),
    archived: false,
    showIcon: true,
  };

  return {
    phases,
    totalCost,
    totalDuration,
    finalMessage,
  };
}
