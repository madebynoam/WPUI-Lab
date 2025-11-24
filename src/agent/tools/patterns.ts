import { AgentTool, ToolContext, ToolResult } from '../types';
import { patterns, assignIds } from '../../patterns';
import { ComponentNode } from '../../types';

// Get available patterns
export const getPatternsTool: AgentTool = {
  name: 'getPatterns',
  description: 'Get list of available pre-built patterns that can be inserted into the page. Patterns are ready-made component structures like contact forms, hero sections, etc. Use includeFullTree:true to get the full ComponentNode tree for customization before insertion.',
  category: 'context',
  parameters: {
    category: {
      type: 'string',
      description: 'Optional category to filter patterns (e.g., "Forms", "Heroes", "Testimonials")',
      required: false,
    },
    id: {
      type: 'string',
      description: 'Optional pattern ID to get a specific pattern',
      required: false,
    },
    includeFullTree: {
      type: 'boolean',
      description: 'If true, includes the full ComponentNode tree structure (without IDs) that can be modified and inserted via modifyComponentTree. Use this when you need to customize pattern content before insertion.',
      required: false,
    },
  },
  execute: async (params: { category?: string; id?: string; includeFullTree?: boolean }, _context: ToolContext): Promise<ToolResult> => {
    let filteredPatterns = patterns;

    // Filter by ID if provided
    if (params.id) {
      const pattern = patterns.find(p => p.id === params.id);
      if (!pattern) {
        return {
          success: false,
          message: `Pattern with ID "${params.id}" not found`,
          error: 'Pattern not found',
        };
      }

      return {
        success: true,
        message: `Found pattern "${pattern.name}"`,
        data: {
          id: pattern.id,
          name: pattern.name,
          description: pattern.description,
          category: pattern.category,
          structure: describeStructure(pattern.tree),
          ...(params.includeFullTree ? { tree: pattern.tree } : {}),
        },
      };
    }

    // Filter by category if provided
    if (params.category) {
      filteredPatterns = patterns.filter(p =>
        p.category.toLowerCase() === params.category!.toLowerCase()
      );
    }

    // Group patterns by category
    const byCategory = filteredPatterns.reduce((acc, pattern) => {
      if (!acc[pattern.category]) {
        acc[pattern.category] = [];
      }
      acc[pattern.category].push({
        id: pattern.id,
        name: pattern.name,
        description: pattern.description,
        structure: describeStructure(pattern.tree),
        ...(params.includeFullTree ? { tree: pattern.tree } : {}),
      });
      return acc;
    }, {} as Record<string, any[]>);

    const patternsList = filteredPatterns.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      structure: describeStructure(p.tree),
      ...(params.includeFullTree ? { tree: p.tree } : {}),
    }));

    return {
      success: true,
      message: params.category
        ? `Found ${filteredPatterns.length} pattern(s) in category "${params.category}": ${filteredPatterns.map(p => p.name).join(', ')}`
        : `Found ${filteredPatterns.length} pattern(s) across ${Object.keys(byCategory).length} categories`,
      data: {
        patterns: patternsList,
        byCategory,
        categories: Object.keys(byCategory),
      },
    };
  },
};

// Helper to describe pattern structure in a readable way
function describeStructure(node: any, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  const props = node.props ? ` (${Object.entries(node.props).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})` : '';
  let result = `${indent}${node.type}${props}`;

  if (node.children && node.children.length > 0) {
    result += '\n' + node.children.map((child: any) => describeStructure(child, depth + 1)).join('\n');
  }

  return result;
}

// Create a pattern
export const createPatternTool: AgentTool = {
  name: 'createPattern',
  description: 'Insert a pre-built pattern into the page. This creates an entire component structure in one operation (e.g., a complete contact form with all fields).',
  category: 'action',
  parameters: {
    patternId: {
      type: 'string',
      description: 'ID of the pattern to create (use getPatterns to see available patterns)',
      required: true,
    },
    parentId: {
      type: 'string',
      description: 'ID of parent component to add this pattern to. If not provided, adds to root.',
      required: false,
    },
    index: {
      type: 'number',
      description: 'Position index within parent. If not provided, adds at end.',
      required: false,
    },
  },
  execute: async (
    params: { patternId: string; parentId?: string; index?: number },
    context: ToolContext
  ): Promise<ToolResult> => {
    // Find the pattern
    const pattern = patterns.find(p => p.id === params.patternId);
    if (!pattern) {
      return {
        success: false,
        message: `Pattern "${params.patternId}" not found. Use getPatterns to see available patterns.`,
        error: 'Pattern not found',
      };
    }

    try {
      // Assign IDs to the pattern tree
      const componentTree: ComponentNode = assignIds(pattern.tree);

      // Add to tree
      context.addComponent(componentTree, params.parentId, params.index);

      return {
        success: true,
        message: `Created pattern "${pattern.name}"${params.parentId ? ' and added to parent' : ' at root'}`,
        data: {
          patternId: pattern.id,
          patternName: pattern.name,
          rootId: componentTree.id,
          rootType: componentTree.type,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create pattern: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};
