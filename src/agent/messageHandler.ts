import { AgentMessage, ToolContext, ToolResult } from './types';
import { getTool, getToolsForLLM } from './tools/registry';
import { createLLMProvider } from './llm/factory';
import { LLMMessage, LLMToolCall } from './llm/types';

const SYSTEM_PROMPT = `You are a helpful UI builder assistant for WP-Designer. You help users build and modify their WordPress-style interfaces using natural language.

IMPORTANT: You MUST use the provided tools to accomplish user requests. Do not just describe what you will do - actually call the tools!

Available tools:
- Query tools: getPages, getCurrentPage, getAvailableComponentTypes, getPageComponents, getComponentDetails, getSelectedComponents, searchComponents, getPatterns
- Action tools: createComponent, updateComponent, deleteComponent, duplicateComponent, addInteraction, createPage, switchPage, createPattern

When a user asks you to do something:
1. ALWAYS call the appropriate tools to accomplish the request
2. For creating common structures (forms, heroes, etc.): Check available patterns first with getPatterns, then use createPattern
3. For creating individual components: Use createComponent with the component type and props
4. For modifying: Use updateComponent or other action tools
5. For queries: Use the query tools to get information
6. NEVER just say you will do something - actually do it by calling tools!

Examples:
User: "Add a form with name and email"
Your response: [Call getPatterns to see available form patterns, then call createPattern with "contact-form"]
Then confirm: "I've added a contact form to your page"

User: "Add a button"
Your response: [Call createComponent tool with type: "Button"]
Then confirm: "I've added a button to your page"

Be conversational and friendly, but ALWAYS use tools when the user asks you to do something!`;

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
