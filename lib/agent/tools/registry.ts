import { AgentTool } from '../types';
import { LLMTool } from '../llm/types';

// Tool registry
const tools: Map<string, AgentTool> = new Map();

export function registerTool(tool: AgentTool): void {
  tools.set(tool.name, tool);
}

export function getTool(name: string): AgentTool | undefined {
  return tools.get(name);
}

export function getAllTools(): AgentTool[] {
  return Array.from(tools.values());
}

export function getToolsByCategory(category: 'context' | 'action'): AgentTool[] {
  return Array.from(tools.values()).filter(tool => tool.category === category);
}

export function getToolDescriptions(): string {
  return Array.from(tools.values())
    .map(tool => `${tool.name}: ${tool.description}`)
    .join('\n');
}

// Convert agent tools to LLM tool format (OpenAI function calling)
export function getToolsForLLM(): LLMTool[] {
  return Array.from(tools.values()).map(tool => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Convert parameters to OpenAI format
    if (tool.parameters) {
      for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
        properties[paramName] = {
          type: paramDef.type,
          description: paramDef.description,
        };

        if (paramDef.required) {
          required.push(paramName);
        }

        if (paramDef.default !== undefined) {
          properties[paramName].default = paramDef.default;
        }

        if (paramDef.items) {
          properties[paramName].items = paramDef.items;
        }
      }
    }

    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties,
          ...(required.length > 0 ? { required } : {}),
        },
      },
    };
  });
}
