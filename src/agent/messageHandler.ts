import { AgentMessage, ToolContext, ToolResult } from './types';
import { getTool, getToolsForLLM } from './tools/registry';
import { createLLMProvider } from './llm/factory';
import { LLMMessage } from './llm/types';

const SYSTEM_PROMPT = `You are a helpful UI builder assistant for WP-Designer. You help users build and modify their WordPress-style interfaces using natural language.

IMPORTANT: You MUST use the provided tools to accomplish user requests. Do not just describe what you will do - actually call the tools!

Available tools:
- Query tools: getPages, getCurrentPage, getAvailableComponentTypes, getPageComponents, getComponentDetails, getSelectedComponents, searchComponents, getPatterns
- PRIMARY tree modification tool: modifyComponentTree - Use this for ALL direct component tree edits (add, update, delete, reorder)
- Legacy action tools: createComponent, updateComponent, updateMultipleComponents, deleteComponent, duplicateComponent, addInteraction, createPage, switchPage
- Pattern tools: createPattern - Use this for inserting pre-built component structures

## Tool Selection Strategy

When a user requests changes, follow this decision tree:

1. **Pre-built Structures** - Check for patterns FIRST if the request matches these:
   - "hero", "banner", "landing" → Use pattern: hero-simple or hero-cta
   - "features", "benefits", "services" (with count 2-4) → Use pattern: feature-cards-2col, feature-cards-3col, or feature-cards-4col
   - "pricing", "plans", "tiers" → Use pattern: pricing-2col or pricing-3col
   - "form", "contact", "signup", "subscribe" → Use pattern: contact-form or newsletter-signup
   - "testimonial", "review", "quote" → Use pattern: testimonial-cards
   - "call to action", "cta", "signup banner" → Use pattern: cta-banner or cta-centered
   - "stats", "numbers", "metrics" → Use pattern: stats-4col
   ACTION: Use createPattern tool

2. **Complex Multi-Step Edits** - For requests involving multiple operations or complex transformations:
   - Adding/updating/deleting multiple components at once
   - Reordering components within a container
   - Bulk property updates across multiple components
   - Restructuring the component hierarchy
   - Any atomic operation that needs to happen in one transaction
   ACTION: Use modifyComponentTree tool
   WORKFLOW:
   a. Call getPageComponents to get current tree structure
   b. Transform the tree JSON to make your changes
   c. Call modifyComponentTree with the modified tree
   d. The tool provides comprehensive ComponentNode schema documentation

3. **Simple Single-Component Operations** - For straightforward single-component edits:
   - Adding one component with basic props
   - Updating properties on one component
   - Deleting one component
   ACTION: Use legacy tools (createComponent, updateComponent, deleteComponent) OR modifyComponentTree

## Smart Component Defaults

The following components automatically create child components with sample content:

- **Card**: Auto-creates CardHeader (with Heading) + CardBody (with Text)
  - When creating a Card, it comes pre-populated with a title and content
  - Users don't need to manually add CardHeader/CardBody
  - **Use the content parameter to customize:** createComponent(type: "Card", content: { title: "...", body: "..." })

- **Panel**: Auto-creates PanelBody (with Text)
  - When creating a Panel, it comes with a collapsible section and content
  - **Use the content parameter to customize:** createComponent(type: "Panel", content: { body: "..." })

This means:
- Never manually create CardHeader, CardBody, PanelBody, PanelRow, FlexItem, or FlexBlock
- Just create Card or Panel, and they'll have the right structure automatically
- **ALWAYS use the content parameter when creating Cards or Panels** to set custom text
- This is much better than using generic defaults!

## Component Creation Best Practices

When creating components:
1. **Use meaningful sample content** - Don't create empty components
   - Button: Set descriptive text like "Learn More", "Get Started", "Contact Us"
   - Text: Add sample paragraph text relevant to context
   - Heading: Add descriptive titles like "Welcome", "Our Services", "Contact Us"
   - Card: Will auto-generate with "Card Title" heading and sample text, but you can customize

2. **Create multiple items with variety** - When asked for "3 cards":
   - Give each card unique, contextually relevant content
   - Vary the text to show different features/benefits/services
   - Example: "Fast Performance", "Easy to Use", "24/7 Support"

3. **Consider layout** - Use appropriate container components:
   - Multiple horizontal items: HStack or Grid
   - Multiple vertical items: VStack
   - Grid layouts: Grid with appropriate columns prop

## Examples

**Using Patterns:**
User: "Add 3 feature cards"
Your response: [Call getPatterns, find "feature-cards-3col", call createPattern with "feature-cards-3col"]
Then confirm: "I've added a 3-column feature card section to your page"

User: "Add a hero section"
Your response: [Call getPatterns, find hero patterns, call createPattern with "hero-simple" or "hero-cta"]
Then confirm: "I've added a hero section to your page"

**Using modifyComponentTree for Complex Edits:**
User: "Add 3 buttons with different colors - one red, one blue, one green"
Your response:
1. [Call getPageComponents to get current tree]
2. [Transform tree: add 3 Button nodes with different backgroundColor props]
3. [Call modifyComponentTree with modified tree]
Then confirm: "I've added 3 colored buttons to your page"

User: "Move the last card to the first position"
Your response:
1. [Call getPageComponents to get current tree]
2. [Transform tree: reorder children array to move last card to index 0]
3. [Call modifyComponentTree with modified tree]
Then confirm: "I've moved the card to the first position"

User: "Change all Text components to use fontSize 18"
Your response:
1. [Call getPageComponents to get current tree]
2. [Transform tree: update props.fontSize on all Text nodes]
3. [Call modifyComponentTree with modified tree]
Then confirm: "I've updated all text to use font size 18"

**Using Legacy Tools for Simple Operations:**
User: "Add a button"
Your response: [Call createComponent with type: "Button", props: { text: "Click Me" }]
Then confirm: "I've added a button to your page"

User: "Add a card for Upcoming Events"
Your response: [Call createComponent with type: "Card", content: { title: "Upcoming Events", body: "Check out what's happening this week." }]
Then confirm: "I've added an Upcoming Events card to your page"

## Important Reminders

1. ALWAYS use tools - never just describe actions
2. Check patterns first for common structures (hero, features, pricing, etc.)
3. Use modifyComponentTree for complex multi-step edits and bulk operations
4. For modifyComponentTree: Always call getPageComponents first to get current tree structure
5. Create components with meaningful sample content (not generic placeholders)
6. Cards and Panels auto-create their structure - don't manually add CardHeader/CardBody/PanelBody
7. The modifyComponentTree tool includes comprehensive schema documentation - read it!
8. Be conversational and friendly!`;

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
          text: 'Please add your OpenAI API key to use the AI assistant. You can get one at https://platform.openai.com/api-keys',
        },
      ],
      timestamp: Date.now(),
      archived: false,
      showIcon: true,
    };
  }

  try {
    // Create LLM provider
    const llm = createLLMProvider({
      provider: 'openai',
      apiKey,
      model: 'gpt-4o-mini',
    });

    // Get tools in LLM format
    const tools = getToolsForLLM();

    // Build conversation messages
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

    // Call LLM
    const chatOptions = {
      messages,
      tools,
      temperature: 0.7,
      max_tokens: 1000,
      // Force tool use for action requests
      ...(isActionRequest ? { tool_choice: 'required' as const } : {}),
    };

    console.log('[Agent] Calling OpenAI with options:', {
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

    // === REFLECTION STEP ===
    // TODO: Fix malformed try-catch block - commented out temporarily
    /*
    // After executing actions, critique the result and fix issues if needed
    console.log('[Agent] Checking reflection conditions:', { isActionRequest, iterationCount });

    if (isActionRequest && iterationCount > 0) {
      console.log('[Agent] Starting reflection step...');

      try {
        // Get current page components for review
        const getPageComponentsTool = getTool('getPageComponents');
        if (getPageComponentsTool) {
          const componentsResult = await getPageComponentsTool.execute({}, context);

          // Create critic prompt
          const criticPrompt = `Review the components that were just created/modified:

${JSON.stringify(componentsResult.data, null, 2)}

Check for these common issues:
1. Generic placeholder text (like "Card Title", "Lorem ipsum", "Click Me", "Text content") in the ACTUAL CONTENT (props.children)
2. Empty or missing content in Cards, Text, or Headings
3. Poor layout choices (too many nested containers, incorrect spacing)
4. Components that don't match the user's request

IMPORTANT:
- For Text components: The actual text is in props.children, NOT the component name
- For Heading components: The heading text is in props.children, NOT the component name
- For Card components: Check the Heading inside CardHeader and Text inside CardBody

If you find ANY issues, respond with a JSON object:
{
  "hasIssues": true,
  "issues": ["description of issue 1", "description of issue 2"],
  "suggestedFixes": "Use updateComponent to change props.children for Text/Heading components, or use updateComponent on the nested Heading/Text inside Cards"
}

If everything looks good (meaningful content, appropriate layout, matches request), respond with:
{
  "hasIssues": false
}`;

          // Add critic message
          messages.push({
            role: 'user',
            content: criticPrompt,
          });

          // Get critique
          const critiqueResponse = await llm.chat({
            messages,
            temperature: 0.3, // Lower temperature for consistent critique
            max_tokens: 500,
          });

          console.log('[Agent] Critique response:', critiqueResponse.content);

          // Parse critique
          try {
            const critique = JSON.parse(critiqueResponse.content || '{}');

            if (critique.hasIssues) {
              console.log('[Agent] Issues found, attempting fixes:', critique.issues);

              // Add assistant's critique to messages
              messages.push({
                role: 'assistant',
                content: critiqueResponse.content || '',
              });

              // Ask agent to fix the issues
              messages.push({
                role: 'user',
                content: `Please fix these issues: ${critique.issues.join(', ')}. ${critique.suggestedFixes}`,
              });

              // Allow up to 2 fix iterations
              let fixIterations = 0;
              const MAX_FIX_ITERATIONS = 2;

              let fixResponse = await llm.chat({
                messages,
                tools,
                temperature: 0.7,
                max_tokens: 1000,
                tool_choice: 'required' as const,
              });

              while (fixResponse.tool_calls && fixResponse.tool_calls.length > 0 && fixIterations < MAX_FIX_ITERATIONS) {
                fixIterations++;
                console.log(`[Agent] Fix iteration ${fixIterations}`);

                // Add assistant message with tool calls
                messages.push({
                  role: 'assistant',
                  content: fixResponse.content || '',
                  tool_calls: fixResponse.tool_calls,
                });

                // Execute fix tools
                for (const toolCall of fixResponse.tool_calls) {
                  const toolName = toolCall.function.name;
                  const toolArgs = JSON.parse(toolCall.function.arguments);

                  const tool = getTool(toolName);
                  if (tool) {
                    try {
                      const result = await tool.execute(toolArgs, context);
                      messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result),
                      });
                    } catch (error) {
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
                }

                // Get final response after fixes
                fixResponse = await llm.chat({
                  messages,
                  tools,
                  temperature: 0.7,
                  max_tokens: 1000,
                });
              }

              // Update response with fixed version
              response = fixResponse;
              console.log('[Agent] Reflection fixes applied');
            } else {
              console.log('[Agent] No issues found in reflection');
            }
          } catch (parseError) {
            console.warn('[Agent] Failed to parse critique, skipping reflection fixes:', parseError);
          }
        } else {
          console.warn('[Agent] getPageComponents tool not found, skipping reflection');
        }
    } catch (reflectionError) {
      console.error('[Agent] Error in reflection step:', reflectionError);
    }
  } else {
    console.log('[Agent] Skipping reflection - conditions not met');
  }
  */

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
