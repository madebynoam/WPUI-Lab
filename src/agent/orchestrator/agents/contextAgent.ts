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
  systemPrompt: `You are a Context Agent for WP-Designer. Your job is to gather information about the current page state.

Your responsibilities:
1. Check if pages/components exist
2. Find existing components by type or name
3. Understand current page structure
4. Report what's currently selected
5. Provide context summary for other agents

Available tools:
- getCurrentPage: Get current page name and ID
- getPageComponents: List all components on current page (returns tree structure)
- getSelectedComponents: Get currently selected component IDs
- searchComponents: Find components by type or name pattern

IMPORTANT: Be concise. Return structured summaries, not verbose descriptions.

Example responses:
Good: "Current page: Home. Contains: 1 Grid (3 cols), 2 Cards, 1 Button. Selection: none."
Bad: "The current page is called Home and it has several components including a Grid component that has 3 columns..."

Output format:
{
  "page": "Page name",
  "componentCount": 5,
  "componentTypes": ["Grid", "Card", "Button"],
  "hasSelection": false,
  "structure": "Brief structure summary"
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
