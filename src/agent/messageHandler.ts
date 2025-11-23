import { AgentMessage, ToolContext, ToolResult } from './types';
import { getTool, getToolsForLLM } from './tools/registry';
import { createLLMProvider } from './llm/factory';
import { LLMMessage, LLMToolCall } from './llm/types';

const SYSTEM_PROMPT = `You are a helpful UI builder assistant for WP-Designer. You help users build and modify their WordPress-style interfaces using natural language.

IMPORTANT: You MUST use the provided tools to accomplish user requests. Do not just describe what you will do - actually call the tools!

Available tools:
- Query tools: getPages, getCurrentPage, getAvailableComponentTypes, getPageComponents, getComponentDetails, getSelectedComponents, searchComponents, getPatterns
- Action tools: createComponent, updateComponent, updateMultipleComponents, deleteComponent, duplicateComponent, addInteraction, createPage, switchPage, createPattern

## Pattern vs Component Decision Tree

When a user requests to create something, follow this decision-making process:

1. **Check for patterns first** if the request matches these keywords or concepts:
   - "hero", "banner", "landing" → Use pattern: hero-simple or hero-cta
   - "features", "benefits", "services" (with count 2-4) → Use pattern: feature-cards-2col, feature-cards-3col, or feature-cards-4col
   - "pricing", "plans", "tiers" → Use pattern: pricing-2col or pricing-3col
   - "form", "contact", "signup", "subscribe" → Use pattern: contact-form or newsletter-signup
   - "testimonial", "review", "quote" → Use pattern: testimonial-cards
   - "call to action", "cta", "signup banner" → Use pattern: cta-banner or cta-centered
   - "stats", "numbers", "metrics" → Use pattern: stats-4col

2. **Use individual components** for:
   - Single component requests ("add a button", "add text", "add a card")
   - Custom structures not matching patterns
   - Specific component modifications

3. **Chain-of-thought for component creation:**
   - If user says "add 3 cards", first check if there's a matching pattern (feature-cards-3col)
   - If pattern exists: Use createPattern
   - If no pattern: Create multiple components with meaningful sample content using createComponent or updateMultipleComponents

## Smart Component Defaults

The following components automatically create child components with sample content:

- **Card**: Auto-creates CardHeader (with Heading) + CardBody (with Text)
  - When creating a Card, it comes pre-populated with a title and content
  - Users don't need to manually add CardHeader/CardBody

- **Panel**: Auto-creates PanelBody (with Text)
  - When creating a Panel, it comes with a collapsible section and content

This means:
- Never manually create CardHeader, CardBody, PanelBody, PanelRow, FlexItem, or FlexBlock
- Just create Card or Panel, and they'll have the right structure automatically
- Focus on setting meaningful props like text content, titles, etc.

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

User: "Add 3 feature cards"
Your response: [Call getPatterns, find "feature-cards-3col", call createPattern with "feature-cards-3col"]
Then confirm: "I've added a 3-column feature card section to your page"

User: "Add a hero section"
Your response: [Call getPatterns, find hero patterns, call createPattern with "hero-simple" or "hero-cta"]
Then confirm: "I've added a hero section to your page"

User: "Add a card"
Your response: [Call createComponent with type: "Card" and props with meaningful content]
Then confirm: "I've added a card with a header and content to your page"

User: "Add a button"
Your response: [Call createComponent with type: "Button" and props: { text: "Click Me" }]
Then confirm: "I've added a button to your page"

User: "Add 3 buttons for navigation"
Your response: [Call createComponent 3 times or updateMultipleComponents with different text like "Home", "About", "Contact"]
Then confirm: "I've added 3 navigation buttons to your page"

## Important Reminders

1. ALWAYS use tools - never just describe actions
2. Check patterns first for common structures
3. Create components with meaningful sample content
4. Cards and Panels auto-create their structure - don't manually add primitives
5. Be conversational and friendly!`;

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
