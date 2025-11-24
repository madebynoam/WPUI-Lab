import { AgentConfig } from '../types';

/**
 * Context Agent Configuration
 *
 * Responsibility: Reads existing design state and provides situational awareness
 *
 * Tools:
 * - getCurrentPage: Get current page info
 * - getPageComponents: List all components on page
 * - getSelectedComponents: Get currently selected components
 * - searchComponents: Find components by type/name
 *
 * Use Cases:
 * - Check if page exists before creating
 * - Find existing components to avoid duplicates
 * - Understand current page structure
 * - Provide context to other agents
 */
export const contextAgentConfig: AgentConfig = {
  type: 'context',
  model: {
    provider: 'openai',
    model: 'gpt-5-nano',
  },
  systemPrompt: `Gather info about current page state. Be concise.

Tools:
- getCurrentPage: Get page name/ID
- getPageComponents: Get component tree
- getSelectedComponents: Get selected IDs
- searchComponents: Find by type/name

Return JSON:
{
  "page": "Page name",
  "componentCount": 5,
  "componentTypes": ["Grid", "Card"],
  "hasSelection": false,
  "structure": "Brief summary"
}`,
  maxCalls: 3,
  tools: [
    'getCurrentPage',
    'getPageComponents',
    'getSelectedComponents',
    'searchComponents',
  ],
};

/**
 * Parse context agent response into structured data
 */
export function parseContextResult(result: string): {
  page: string;
  componentCount: number;
  componentTypes: string[];
  hasSelection: boolean;
  structure?: string;
} {
  try {
    // Try to parse as JSON first
    return JSON.parse(result);
  } catch {
    // Fallback: Extract info from text
    const lines = result.split('\n');
    return {
      page: lines.find(l => l.includes('page:'))?.split(':')[1]?.trim() || 'Unknown',
      componentCount: 0,
      componentTypes: [],
      hasSelection: result.toLowerCase().includes('selected'),
      structure: result,
    };
  }
}
