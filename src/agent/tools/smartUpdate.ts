/**
 * Smart Component Update Tool with Disambiguation
 * Based on Anthropic's principles:
 * - "Consolidate functionality" (find + update in one tool)
 * - "Prompt-engineer error messages" (helpful guidance for disambiguation)
 */

import { AgentTool, ToolContext, ToolResult } from '../types';
import { buildDisplayName, getContentPreview, findClosestMatch } from '../utils/semanticIds';

interface ComponentSelector {
  type?: string;
  containing?: string;
  in?: string;
  index?: number;
}

/**
 * component_update - Smart update with automatic disambiguation
 * Handles "change the button label" gracefully when there are 5 buttons
 */
export const component_update: AgentTool = {
  name: 'component_update',
  description: 'Update component content or props with smart selection. If multiple components match your criteria, returns options for disambiguation. Much better than separate search + update calls!',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'Specific component ID (if known). If not provided, use selector instead.',
      required: false,
    },
    selector: {
      type: 'object',
      description: 'Search criteria to find component: { type: "Button", containing: "Sign Up", in: "hero", index: 0 }',
      required: false,
    },
    text: {
      type: 'string',
      description: 'New text content for the component (will update the "children" prop)',
      required: false,
    },
    props: {
      type: 'object',
      description: 'Props to update on the component (e.g., { variant: "primary", size: "large" })',
      required: false,
    },
    disambiguate: {
      type: 'boolean',
      description: 'If true and multiple matches found, returns options for user to choose. Default: true',
      required: false,
      default: true,
    },
  },
  execute: async (
    params: {
      componentId?: string;
      selector?: ComponentSelector;
      text?: string;
      props?: Record<string, any>;
      disambiguate?: boolean;
    },
    context: ToolContext
  ): Promise<ToolResult> => {
    // Validate inputs
    if (!params.componentId && !params.selector) {
      return {
        success: false,
        message: 'Please provide either componentId or selector to identify the component to update',
        error: 'Missing component identifier',
      };
    }

    // Direct ID update (fast path)
    if (params.componentId) {
      const node = context.getNodeById(params.componentId);

      if (!node) {
        // Try to find closest match for helpful error message
        const allNodes = flattenTree(context.tree);
        const candidates = allNodes.map(n => ({
          id: n.id,
          type: n.type,
          displayName: buildDisplayName(n.type, { content: getContentPreview(n.props) || undefined }),
        }));

        const closest = findClosestMatch(params.componentId, candidates);

        return {
          success: false,
          message: `Component "${params.componentId}" not found.${closest ? ` Did you mean "${closest.displayName}" (${closest.id})?` : ''}\n\nTip: Use context_searchComponents to find component IDs, or use selector parameter instead.`,
          error: 'Component not found',
          ...(closest ? { suggestions: [closest] } : {}),
        };
      }

      // Apply updates
      return applyUpdates(node, { text: params.text, props: params.props }, context);
    }

    // Selector-based search
    const matches = searchComponents(params.selector!, context);

    if (matches.length === 0) {
      const criteria: string[] = [];
      if (params.selector!.type) criteria.push(`type "${params.selector!.type}"`);
      if (params.selector!.containing) criteria.push(`containing "${params.selector!.containing}"`);
      if (params.selector!.in) criteria.push(`in "${params.selector!.in}"`);

      return {
        success: false,
        message: `No components found matching ${criteria.join(' and ')}.\n\nTip: Use context_searchComponents to see all components, or try broader search criteria.`,
        error: 'No matches found',
      };
    }

    // Single match - perfect!
    if (matches.length === 1) {
      return applyUpdates(matches[0], { text: params.text, props: params.props }, context);
    }

    // Multiple matches - disambiguation needed
    if (params.disambiguate !== false) {
      const options = matches.map((node, i) => ({
        id: node.id,
        displayName: buildDisplayName(node.type, {
          content: getContentPreview(node.props) || undefined,
          index: i,
        }),
        preview: getContentPreview(node.props)?.substring(0, 50) || null,
      }));

      return {
        success: false,
        requiresDisambiguation: true,
        message: `Found ${matches.length} components matching your criteria. Which one?\n\n${options.map((opt, i) => `${i + 1}. ${opt.displayName}${opt.preview ? ` - "${opt.preview}"` : ''}`).join('\n')}\n\nPlease be more specific (e.g., add "in hero section" or "containing Sign Up"), or call again with the specific componentId.`,
        data: {
          options,
          count: matches.length,
        },
      };
    }

    // Auto-select first match if disambiguation disabled
    return applyUpdates(matches[0], { text: params.text, props: params.props }, context);
  },
};

/**
 * component_delete - Smart delete with disambiguation
 */
export const component_delete: AgentTool = {
  name: 'component_delete',
  description: 'Delete component(s) with smart selection and disambiguation. Supports bulk delete with confirmation.',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'Specific component ID to delete. If not provided, use selector.',
      required: false,
    },
    selector: {
      type: 'object',
      description: 'Search criteria to find component(s) to delete',
      required: false,
    },
    confirm: {
      type: 'boolean',
      description: 'Required to be true for bulk deletes (>1 component). Safety check.',
      required: false,
      default: false,
    },
  },
  execute: async (
    params: {
      componentId?: string;
      selector?: ComponentSelector;
      confirm?: boolean;
    },
    context: ToolContext
  ): Promise<ToolResult> => {
    // Validate inputs
    if (!params.componentId && !params.selector) {
      return {
        success: false,
        message: 'Please provide either componentId or selector',
        error: 'Missing component identifier',
      };
    }

    // Direct ID delete
    if (params.componentId) {
      const node = context.getNodeById(params.componentId);

      if (!node) {
        return {
          success: false,
          message: `Component "${params.componentId}" not found`,
          error: 'Component not found',
        };
      }

      context.removeComponent(params.componentId);

      return {
        success: true,
        message: `Deleted ${node.type} component`,
      };
    }

    // Selector-based delete
    const matches = searchComponents(params.selector!, context);

    if (matches.length === 0) {
      return {
        success: false,
        message: 'No components found matching criteria',
        error: 'No matches found',
      };
    }

    // Bulk delete requires confirmation
    if (matches.length > 1 && !params.confirm) {
      return {
        success: false,
        requiresConfirmation: true,
        message: `Found ${matches.length} components to delete. Set confirm=true to proceed.\n\nComponents:\n${matches.map((n, i) => `${i + 1}. ${buildDisplayName(n.type, { content: getContentPreview(n.props) || undefined })}`).join('\n')}`,
        data: {
          count: matches.length,
        },
      };
    }

    // Delete all matches
    for (const node of matches) {
      context.removeComponent(node.id);
    }

    return {
      success: true,
      message: `Deleted ${matches.length} component(s)`,
    };
  },
};

/**
 * component_move - Smart move with disambiguation
 */
export const component_move: AgentTool = {
  name: 'component_move',
  description: 'Move component to a new parent with smart selection.',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'Component ID to move',
      required: false,
    },
    selector: {
      type: 'object',
      description: 'Search criteria to find component to move',
      required: false,
    },
    to: {
      type: 'object',
      description: '{ parentId: "...", position: "start"|"end"|number }',
      required: true,
    },
  },
  execute: async (
    params: {
      componentId?: string;
      selector?: ComponentSelector;
      to: { parentId: string; position?: 'start' | 'end' | number };
    },
    context: ToolContext
  ): Promise<ToolResult> => {
    // Find component to move
    let nodeToMove;

    if (params.componentId) {
      nodeToMove = context.getNodeById(params.componentId);
    } else if (params.selector) {
      const matches = searchComponents(params.selector, context);
      if (matches.length === 0) {
        return {
          success: false,
          message: 'No components found matching criteria',
          error: 'No matches found',
        };
      }
      if (matches.length > 1) {
        return {
          success: false,
          requiresDisambiguation: true,
          message: `Found ${matches.length} components. Please be more specific.`,
        };
      }
      nodeToMove = matches[0];
    }

    if (!nodeToMove) {
      return {
        success: false,
        message: 'Component not found',
        error: 'Component not found',
      };
    }

    // Validate target parent
    const targetParent = context.getNodeById(params.to.parentId);
    if (!targetParent) {
      return {
        success: false,
        message: `Target parent "${params.to.parentId}" not found`,
        error: 'Target parent not found',
      };
    }

    // Move component (remove from old location and add to new)
    context.removeComponent(nodeToMove.id);
    const position = typeof params.to.position === 'number'
      ? params.to.position
      : params.to.position === 'start'
      ? 0
      : undefined; // 'end' or undefined = append

    context.addComponent(nodeToMove, params.to.parentId, position);

    return {
      success: true,
      message: `Moved ${nodeToMove.type} to ${targetParent.type}`,
    };
  },
};

// Helper functions

function searchComponents(selector: ComponentSelector, context: ToolContext): any[] {
  const matches: any[] = [];

  const searchInTree = (nodes: typeof context.tree, parentContext?: string): void => {
    for (const node of nodes) {
      let isMatch = true;

      // Type filter
      if (selector.type && node.type.toLowerCase() !== selector.type.toLowerCase()) {
        isMatch = false;
      }

      // Content filter
      if (selector.containing && isMatch) {
        const content = getContentPreview(node.props);
        if (!content || !content.toLowerCase().includes(selector.containing.toLowerCase())) {
          isMatch = false;
        }
      }

      // Parent context filter
      if (selector.in && isMatch) {
        const contextLower = selector.in.toLowerCase();
        const hasMatchingParent =
          (parentContext && parentContext.toLowerCase().includes(contextLower)) ||
          (node.name && node.name.toLowerCase().includes(contextLower)) ||
          node.type.toLowerCase().includes(contextLower);

        if (!hasMatchingParent) {
          isMatch = false;
        }
      }

      if (isMatch) {
        matches.push(node);
      }

      // Recurse
      if (node.children) {
        searchInTree(node.children, node.name || node.type);
      }
    }
  };

  searchInTree(context.tree);

  // Apply index filter if specified
  if (selector.index !== undefined && selector.index >= 0 && selector.index < matches.length) {
    return [matches[selector.index]];
  }

  return matches;
}

function applyUpdates(
  node: any,
  updates: { text?: string; props?: Record<string, any> } | undefined,
  context: ToolContext
): ToolResult {
  const displayName = buildDisplayName(node.type, { content: getContentPreview(node.props) || undefined });

  // Validate updates parameter
  if (!updates || (typeof updates !== 'object')) {
    return {
      success: false,
      message: `Invalid updates parameter. Expected an object with "text" and/or "props" properties.`,
      error: 'Invalid updates parameter',
    };
  }

  // Apply text update
  if (updates.text) {
    // Button components use 'text' prop, others use 'children'
    const propName = node.type === 'Button' ? 'text' : 'children';
    context.updateComponentProps(node.id, { [propName]: updates.text });
  }

  // Apply prop updates
  if (updates.props) {
    context.updateComponentProps(node.id, updates.props);
  }

  // Check if any updates were actually applied
  if (!updates.text && !updates.props) {
    return {
      success: false,
      message: `No updates provided. Please specify either "text" or "props" to update.`,
      error: 'No updates provided',
    };
  }

  return {
    success: true,
    message: `Updated ${displayName}${updates.text ? ` text to "${updates.text}"` : ''}${updates.props ? ` props: ${Object.keys(updates.props).join(', ')}` : ''}`,
  };
}

function flattenTree(nodes: any[]): any[] {
  const flat: any[] = [];

  for (const node of nodes) {
    flat.push(node);
    if (node.children) {
      flat.push(...flattenTree(node.children));
    }
  }

  return flat;
}
