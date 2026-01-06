/**
 * Design Heuristics Tool
 *
 * Provides on-demand design guidance to the Creator Agent. Returns context-relevant
 * design heuristics that teach the agent HOW to make good design decisions, not
 * WHAT specific patterns to copy.
 *
 * This keeps the system prompt minimal while providing professional design guidance
 * only when needed, minimizing token usage.
 */

import { AgentTool, ToolContext, ToolResult } from '../../types';
import { getRelevantHeuristics } from './designHeuristics';

export const design_getHeuristics: AgentTool = {
  name: 'design_getHeuristics',
  description: 'Get design heuristics for making professional design decisions. Call this BEFORE generating markup when you need guidance on spacing, hierarchy, composition, or component usage. Provides universal design rules that apply to any component combination.',
  category: 'context',
  parameters: {
    context: {
      type: 'string',
      description: 'Brief description of what you\'re designing. Examples: "card with pricing tiers", "dashboard metric cards", "navigation header", "form with input fields", "testimonial cards in grid"',
      required: true,
    },
  },
  execute: async (params: { context: string }, _context: ToolContext): Promise<ToolResult> => {
    const { context: designContext } = params;

    if (!designContext || typeof designContext !== 'string') {
      return {
        success: false,
        message: 'Please provide a context description of what you\'re designing',
      };
    }

    try {
      // Get relevant heuristics based on context
      const heuristics = getRelevantHeuristics(designContext);

      return {
        success: true,
        message: heuristics,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to retrieve design heuristics: ${error.message}`,
      };
    }
  }
};
