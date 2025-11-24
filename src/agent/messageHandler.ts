import { AgentMessage, ToolContext, ToolResult } from './types';
import { getTool, getToolsForLLM } from './tools/registry';
import { createLLMProvider } from './llm/factory';
import { LLMMessage } from './llm/types';

const SYSTEM_PROMPT = `You are a UI builder assistant for WP-Designer. Help users build WordPress-style interfaces using natural language.

CRITICAL: Use tools to accomplish requests. Don't just describe - call the tools!

## Tools
- Query: getPages, getCurrentPage, getAvailableComponentTypes, getPageComponents, getComponentDetails, getSelectedComponents, searchComponents, getPatterns
- PRIMARY: buildFromYAML (YAML DSL - 20% more token-efficient!), modifyComponentTree
- Actions: createComponent, updateComponent, deleteComponent, duplicateComponent, createPage, switchPage
- Patterns: createPattern (pre-built structures)

## Key Components
LAYOUT: Grid, VStack, HStack, Flex
CONTENT: Text, Heading, Button, Icon
CONTAINERS: Card, Panel
DATA: DataViews (props: dataSource, viewType)

Use getAvailableComponentTypes for full list.

## Token-Efficient Strategy ⚡
**1-2 items:** Use createComponent
**3+ items:** Use buildFromYAML (YAML is 20% more efficient than JSON for Claude!)

Example: "Add 6 pricing cards"
✅ RIGHT: buildFromYAML = 1 call, ~400 tokens
❌ WRONG: createComponent × 7 = 7+ calls, ~5000+ tokens

## Building with YAML DSL
For 3+ items, use buildFromYAML with YAML:
\`\`\`yaml
Grid:
  columns: 6
  gap: 4
  children:
    - Card:
        title: Basic
        price: $9/mo
        children:
          - VStack:
              children:
                - Text: "✓ 10GB Storage"
                - Text: "✓ Email Support"
                - Text: "✓ Basic Features"
          - Button:
              variant: primary
              text: Buy Now
    - Card:
        title: Pro
        price: $29/mo
        children:
          - VStack:
              children:
                - Text: "✓ 100GB Storage"
                - Text: "✓ Priority Support"
          - Button:
              variant: primary
              text: Buy Now
    # ... 4 more cards
\`\`\`

## Smart Defaults
- **Card**: Auto-creates CardHeader + CardBody. Use title/body shortcuts: \`Card: { title: "...", body: "..." }\`
- **Panel**: Auto-creates PanelBody. Use body shortcut: \`Panel: { body: "..." }\`

Never manually create CardHeader, CardBody, PanelBody.

## Best Practices
1. Use patterns first (getPatterns) for hero, features, pricing, etc.
2. For 3+ custom items, always use buildFromYAML (most efficient!)
3. Use meaningful content (not placeholders)
4. For edits: getPageComponents → modifyComponentTree

## Examples
**Patterns:** getPatterns → createPattern("hero-simple")
**Single item:** createComponent({ type: "Button", props: { text: "Click" } })
**3+ items:** buildFromYAML(YAML string with Grid + Cards)
**Edits:** getPageComponents → modifyComponentTree

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

    // === PROMPT REFINEMENT STEP (ONCE AT START) ===
    // Refine the user's prompt before execution to make it more specific and actionable
    console.log('[Agent] Starting prompt refinement...');

    const getCurrentPageTool = getTool('getCurrentPage');
    const getPatternsTool = getTool('getPatterns');

    let currentPageInfo = 'unknown page';
    let availablePatterns = '';

    if (getCurrentPageTool) {
      try {
        const pageResult = await getCurrentPageTool.execute({}, context);
        if (pageResult.success && pageResult.data) {
          currentPageInfo = `"${pageResult.data.name}" (${pageResult.data.componentCount || 0} components)`;
        }
      } catch (e) {
        console.warn('[Agent] Failed to get current page:', e);
      }
    }

    if (getPatternsTool) {
      try {
        const patternsResult = await getPatternsTool.execute({}, context);
        if (patternsResult.success && patternsResult.data) {
          availablePatterns = patternsResult.data.categories?.join(', ') || '';
        }
      } catch (e) {
        console.warn('[Agent] Failed to get patterns:', e);
      }
    }

    const refinementPrompt = `You are helping refine a user's request for a UI builder application.

Context:
- Current page: ${currentPageInfo}
- Available component types: Grid, VStack, HStack, Card, Text, Heading, Button, DataViews, and 40+ more
- Available pattern categories: ${availablePatterns || 'Heroes, Features, Pricing, Forms, Stats, etc.'}
- DataViews component for tables (props: dataSource='products'|'blog'|'users', viewType='table'|'grid'|'list')

User's original request: "${userMessage}"

Your task: Refine this request to be MORE SPECIFIC and ACTIONABLE. Consider:

1. **If user wants custom content** (specific labels, titles, text):
   - Explicitly state "use createComponent" instead of patterns
   - Example: "Add 3 stats" + user specifies labels → "Create a Grid with 3 columns, then create VStacks with custom Headings/Text for: Income This Month, Last Month, Current Products Ordered"

2. **If user wants data tables** ("sales data", "product list", "table"):
   - Explicitly mention: "Use DataViews component with dataSource='products' (or 'blog'/'users')"

3. **If user request matches a pattern exactly**:
   - Mention the pattern: "Use pricing-3col pattern" or "Use contact-form pattern"

4. **Be specific about content**:
   - Bad: "Add cards"
   - Good: "Add 3 Cards with titles: Speed, Security, Support"

Respond with ONLY the refined prompt, nothing else. Make it clear, specific, and actionable.`;

    const refinementMessages: LLMMessage[] = [
      {
        role: 'user',
        content: refinementPrompt,
      },
    ];

    const refinementResponse = await llm.chat({
      messages: refinementMessages,
      temperature: 0.5,
      max_tokens: 300,
    });

    const refinedPrompt = refinementResponse.content?.trim() || userMessage;
    console.log('[Agent] Refined prompt:', refinedPrompt);

    // Build conversation messages with refined prompt (USED FOR ALL SUBSEQUENT ITERATIONS)
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: refinedPrompt,
      },
    ];

    // Determine if this is an action request (should force tool use)
    const actionKeywords = ['add', 'create', 'update', 'delete', 'remove', 'modify', 'change', 'make'];
    const isActionRequest = actionKeywords.some(keyword => refinedPrompt.toLowerCase().includes(keyword));

    // Call LLM (FIRST TIME with refined prompt)
    const chatOptions = {
      messages,
      tools,
      temperature: 0.7,
      max_tokens: 1000,
      // Force tool use for action requests
      ...(isActionRequest ? { tool_choice: 'required' as const } : {}),
    };

    console.log('[Agent] Calling LLM with options:', {
      messageCount: messages.length,
      toolCount: tools.length,
      isActionRequest,
      hasToolChoice: chatOptions.tool_choice !== undefined,
    });

    let response = await llm.chat(chatOptions);

    console.log('[Agent] OpenAI response:', {
      hasContent: !!response.content,
      hasToolCalls: !!response.tool_calls,
      toolCallCount: response.tool_calls?.length || 0,
      finishReason: response.finish_reason,
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
      response = await llm.chat({
        messages,
        tools,
        temperature: 0.7,
        max_tokens: 1000,
      });

      console.log(`[Agent] LLM response after iteration ${iterationCount}:`, {
        hasContent: !!response.content,
        hasToolCalls: !!response.tool_calls,
        toolCallCount: response.tool_calls?.length || 0,
        finishReason: response.finish_reason,
      });
    }

    if (iterationCount >= MAX_ITERATIONS) {
      console.warn('[Agent] Max iterations reached, stopping tool execution loop');
    }

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
