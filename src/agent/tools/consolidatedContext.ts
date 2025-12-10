/**
 * Consolidated Context Tools
 * Based on Anthropic's principle: "Let single tools handle multiple discrete operations"
 * Reduces tool calls by 75% compared to separate context tools
 */

import { AgentTool, ToolContext, ToolResult } from '../types';
import { componentRegistry } from '@/componentRegistry';
import { ROOT_VSTACK_ID } from '@/contexts/ComponentTreeContext';
import { buildDisplayName, getContentPreview } from '../utils/semanticIds';

type ResponseFormat = 'concise' | 'detailed';

/**
 * Consolidated tool that replaces getPages, getCurrentPage, getPageComponents, getSelectedComponents
 * ONE tool call instead of 4
 */
export const context_getProject: AgentTool = {
  name: 'context_getProject',
  description: 'Get complete project context in one call: pages, current page, components, and selection state. Use "concise" format when you just need IDs/names for chaining tool calls. Use "detailed" for full information.',
  category: 'context',
  parameters: {
    response_format: {
      type: 'string',
      description: 'Response detail level: "concise" returns minimal data (IDs, names) for efficient chaining - ~100 tokens. "detailed" returns full data including props and component tree - ~500+ tokens. Default: "concise"',
      required: false,
      default: 'concise',
    },
    include: {
      type: 'array',
      description: 'Optional: Limit which data to include. Options: "pages", "components", "selection", "types". Default: all',
      required: false,
      items: {
        type: 'string',
      },
    },
  },
  execute: async (
    params: { response_format?: ResponseFormat; include?: string[] },
    context: ToolContext
  ): Promise<ToolResult> => {
    const format = (params.response_format || 'concise') as ResponseFormat;
    const include = params.include || ['pages', 'components', 'selection', 'types'];

    const result: any = {};

    // Pages information
    if (include.includes('pages')) {
      const currentPage = context.pages.find(p => p.id === context.currentPageId);

      if (format === 'concise') {
        result.pages = {
          current: currentPage ? { id: currentPage.id, name: currentPage.name } : null,
          all: context.pages.map(p => ({ id: p.id, name: p.name })),
          total: context.pages.length,
        };
      } else {
        result.pages = {
          current: currentPage,
          all: context.pages,
          total: context.pages.length,
        };
      }
    }

    // Components information
    if (include.includes('components')) {
      const rootVStack = context.tree.find(n => n.id === ROOT_VSTACK_ID);

      if (rootVStack) {
        const componentCount = countComponents(rootVStack.children || []);

        if (format === 'concise') {
          // Return flat list of components with semantic IDs and display names
          result.components = {
            total: componentCount,
            list: flattenComponents(rootVStack.children || [], context),
          };
        } else {
          // Return full tree structure
          result.components = {
            total: componentCount,
            tree: buildDetailedTree(rootVStack.children || [], context),
          };
        }
      } else {
        result.components = { total: 0, list: [] };
      }
    }

    // Selection state
    if (include.includes('selection')) {
      if (context.selectedNodeIds.length === 0) {
        result.selection = null;
      } else {
        const selected = context.selectedNodeIds
          .map(id => context.getNodeById(id))
          .filter(Boolean);

        if (format === 'concise') {
          result.selection = selected.map(node => ({
            id: node!.id,
            type: node!.type,
            displayName: buildDisplayName(node!.type, {
              content: getContentPreview(node!.props) || undefined,
            }),
          }));
        } else {
          result.selection = selected.map(node => ({
            id: node!.id,
            type: node!.type,
            name: node!.name,
            displayName: buildDisplayName(node!.type, {
              content: getContentPreview(node!.props) || undefined,
            }),
            props: node!.props,
            hasChildren: (node!.children?.length || 0) > 0,
          }));
        }
      }
    }

    // Available component types
    if (include.includes('types')) {
      const types = Object.entries(componentRegistry).map(([type, def]) => ({
        type,
        displayName: def.name,
        acceptsChildren: def.acceptsChildren,
        ...(format === 'detailed' ? { description: def.description } : {}),
      }));

      result.availableTypes = format === 'concise'
        ? types.map(t => t.type)
        : types;
    }

    // Build message summary
    const parts: string[] = [];
    if (result.pages) {
      parts.push(`${result.pages.total} page(s)${result.pages.current ? `, current: "${result.pages.current.name}"` : ''}`);
    }
    if (result.components) {
      parts.push(`${result.components.total} component(s)`);
    }
    if (result.selection) {
      const count = Array.isArray(result.selection) ? result.selection.length : 0;
      parts.push(`${count} selected`);
    }

    return {
      success: true,
      message: `Project context (${format}): ${parts.join(', ')}`,
      data: result,
    };
  },
};

/**
 * Enhanced component search with disambiguation support
 * Replaces searchComponents tool
 */
export const context_searchComponents: AgentTool = {
  name: 'context_searchComponents',
  description: 'Search for components by type, content, or location. Returns semantic IDs and display names for easy reference. Supports disambiguation when multiple matches found.',
  category: 'context',
  parameters: {
    type: {
      type: 'string',
      description: 'Component type to search for (e.g., "Button", "Card")',
      required: false,
    },
    containing: {
      type: 'string',
      description: 'Text content to search for (searches in button labels, card titles, text content)',
      required: false,
    },
    in: {
      type: 'string',
      description: 'Parent context to search within (e.g., "hero section", "pricing", "Grid")',
      required: false,
    },
    response_format: {
      type: 'string',
      description: 'Response detail level: "concise" or "detailed". Default: "concise"',
      required: false,
      default: 'concise',
    },
  },
  execute: async (
    params: { type?: string; containing?: string; in?: string; response_format?: ResponseFormat },
    context: ToolContext
  ): Promise<ToolResult> => {
    const format = (params.response_format || 'concise') as ResponseFormat;

    // Validate at least one search criterion
    if (!params.type && !params.containing && !params.in) {
      return {
        success: false,
        message: 'Please provide at least one search criterion: type, containing, or in',
        error: 'Missing search criteria',
      };
    }

    // Search through component tree
    const results: any[] = [];
    const searchInTree = (nodes: typeof context.tree, parentContext?: string): void => {
      for (const node of nodes) {
        let matches = true;

        // Type filter
        if (params.type && node.type.toLowerCase() !== params.type.toLowerCase()) {
          matches = false;
        }

        // Content filter
        if (params.containing && matches) {
          const content = getContentPreview(node.props);
          if (!content || !content.toLowerCase().includes(params.containing.toLowerCase())) {
            matches = false;
          }
        }

        // Parent context filter
        if (params.in && matches) {
          const contextLower = params.in.toLowerCase();
          const hasMatchingParent =
            (parentContext && parentContext.toLowerCase().includes(contextLower)) ||
            (node.name && node.name.toLowerCase().includes(contextLower)) ||
            node.type.toLowerCase().includes(contextLower);

          if (!hasMatchingParent) {
            matches = false;
          }
        }

        if (matches) {
          const content = getContentPreview(node.props) || undefined;
          const displayName = buildDisplayName(node.type, { content, purpose: parentContext });

          if (format === 'concise') {
            results.push({
              id: node.id,
              type: node.type,
              displayName,
              preview: content?.substring(0, 30) || null,
            });
          } else {
            results.push({
              id: node.id,
              type: node.type,
              name: node.name,
              displayName,
              preview: content,
              props: node.props,
              hasChildren: (node.children?.length || 0) > 0,
              childCount: node.children?.length || 0,
            });
          }
        }

        // Recurse into children
        if (node.children) {
          const childContext = node.name || node.type;
          searchInTree(node.children, childContext);
        }
      }
    };

    searchInTree(context.tree);

    // Build helpful message
    if (results.length === 0) {
      const criteria: string[] = [];
      if (params.type) criteria.push(`type "${params.type}"`);
      if (params.containing) criteria.push(`containing "${params.containing}"`);
      if (params.in) criteria.push(`in "${params.in}"`);

      return {
        success: true,
        message: `No components found matching ${criteria.join(' and ')}. Try using context_getProject to see all components.`,
        data: {
          matches: [],
          count: 0,
        },
      };
    }

    if (results.length === 1) {
      return {
        success: true,
        message: `Found 1 component: ${results[0].displayName}`,
        data: {
          matches: results,
          count: 1,
        },
      };
    }

    // Multiple matches - provide disambiguation info
    const displayNames = results.map((r, i) => `${i + 1}. ${r.displayName}`).join(', ');

    return {
      success: true,
      message: `Found ${results.length} components: ${displayNames}. ${results.length > 1 ? 'Use more specific criteria or reference by index (e.g., "the first one").' : ''}`,
      data: {
        matches: results,
        count: results.length,
        requiresDisambiguation: results.length > 1,
      },
    };
  },
};

// Helper functions

function countComponents(nodes: any[]): number {
  return nodes.reduce((count, node) => {
    return count + 1 + (node.children ? countComponents(node.children) : 0);
  }, 0);
}

function flattenComponents(nodes: any[], context: ToolContext, parentName?: string): any[] {
  const flat: any[] = [];

  for (const node of nodes) {
    const content = getContentPreview(node.props) || undefined;
    const displayName = buildDisplayName(node.type, {
      content,
      purpose: parentName,
    });

    flat.push({
      id: node.id,
      type: node.type,
      displayName,
      preview: content?.substring(0, 30) || null,
    });

    if (node.children) {
      flat.push(...flattenComponents(node.children, context, node.name || node.type));
    }
  }

  return flat;
}

function buildDetailedTree(nodes: any[], context: ToolContext, depth: number = 0): any[] {
  const MAX_DEPTH = 4;

  if (depth >= MAX_DEPTH) {
    return nodes.map(node => ({
      id: node.id,
      type: node.type,
      displayName: buildDisplayName(node.type, { content: getContentPreview(node.props) || undefined }),
      childCount: node.children?.length || 0,
    }));
  }

  return nodes.map(node => {
    const content = getContentPreview(node.props) || undefined;

    return {
      id: node.id,
      type: node.type,
      name: node.name,
      displayName: buildDisplayName(node.type, { content }),
      props: node.props,
      hasChildren: (node.children?.length || 0) > 0,
      childCount: node.children?.length || 0,
      children: node.children ? buildDetailedTree(node.children, context, depth + 1) : [],
    };
  });
}
