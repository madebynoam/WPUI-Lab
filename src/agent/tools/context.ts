import { AgentTool, ToolContext, ToolResult } from '../types';
import { componentRegistry } from '../../componentRegistry';
import { ROOT_VSTACK_ID } from '../../ComponentTreeContext';

// Get list of all pages
export const getPagesTool: AgentTool = {
  name: 'getPages',
  description: 'Get list of all pages in the application with their IDs, names, and routes',
  category: 'context',
  execute: async (_params: {}, context: ToolContext): Promise<ToolResult> => {
    const pages = context.pages.map(p => ({
      id: p.id,
      name: p.name,
      isCurrent: p.id === context.currentPageId,
    }));

    return {
      success: true,
      message: `Found ${pages.length} page(s): ${pages.map(p => `"${p.name}"${p.isCurrent ? ' [current]' : ''}`).join(', ')}`,
      data: pages,
    };
  },
};

// Get current page details
export const getCurrentPageTool: AgentTool = {
  name: 'getCurrentPage',
  description: 'Get details about the currently active page',
  category: 'context',
  execute: async (_params: {}, context: ToolContext): Promise<ToolResult> => {
    const currentPage = context.pages.find(p => p.id === context.currentPageId);

    if (!currentPage) {
      return {
        success: false,
        message: 'Could not find current page',
        error: 'Current page not found',
      };
    }

    return {
      success: true,
      message: `Current page is "${currentPage.name}"`,
      data: currentPage,
    };
  },
};

// Get available component types
export const getAvailableComponentTypesTool: AgentTool = {
  name: 'getAvailableComponentTypes',
  description: 'Get list of all available component types that can be created',
  category: 'context',
  execute: async (_params: {}, _context: ToolContext): Promise<ToolResult> => {
    const componentTypes = Object.entries(componentRegistry).map(([type, def]) => ({
      type,
      displayName: def.name,
      acceptsChildren: def.acceptsChildren,
      description: def.description || `A ${def.name} component`,
    }));

    return {
      success: true,
      message: `Available component types: ${componentTypes.map(c => c.displayName).join(', ')}`,
      data: {
        all: componentTypes,
      },
    };
  },
};

// Get component tree for a specific page
export const getPageComponentsTool: AgentTool = {
  name: 'getPageComponents',
  description: 'Get the component tree structure for a specific page',
  category: 'context',
  parameters: {
    pageId: {
      type: 'string',
      description: 'ID of the page to get components for. If not provided, uses current page.',
      required: false,
    },
  },
  execute: async (params: { pageId?: string }, context: ToolContext): Promise<ToolResult> => {
    const pageId = params.pageId || context.currentPageId;
    const page = context.pages.find(p => p.id === pageId);

    if (!page) {
      return {
        success: false,
        message: `Page with ID "${pageId}" not found`,
        error: 'Page not found',
      };
    }

    // Get root VStack for this page
    const rootVStack = context.tree.find(n => n.id === ROOT_VSTACK_ID);

    if (!rootVStack) {
      return {
        success: false,
        message: 'Could not find page root',
        error: 'Root component not found',
      };
    }

    // Count components
    const countComponents = (nodes: typeof context.tree): number => {
      return nodes.reduce((count, node) => {
        return count + 1 + (node.children ? countComponents(node.children) : 0);
      }, 0);
    };

    const componentCount = countComponents(rootVStack.children || []);

    // Create simplified tree structure
    const simplifyTree = (nodes: typeof context.tree): any[] => {
      return nodes.map(node => ({
        id: node.id,
        type: node.type,
        name: node.name,
        props: node.props,
        hasChildren: (node.children?.length || 0) > 0,
        childCount: node.children?.length || 0,
        children: node.children ? simplifyTree(node.children) : [],
      }));
    };

    const simplified = simplifyTree(rootVStack.children || []);

    return {
      success: true,
      message: `Page "${page.name}" has ${componentCount} component(s)`,
      data: {
        page,
        componentCount,
        components: simplified,
      },
    };
  },
};

// Get details about a specific component
export const getComponentDetailsTool: AgentTool = {
  name: 'getComponentDetails',
  description: 'Get detailed information about a specific component by ID',
  category: 'context',
  parameters: {
    componentId: {
      type: 'string',
      description: 'ID of the component to get details for',
      required: true,
    },
  },
  execute: async (params: { componentId: string }, context: ToolContext): Promise<ToolResult> => {
    const component = context.getNodeById(params.componentId);

    if (!component) {
      return {
        success: false,
        message: `Component with ID "${params.componentId}" not found`,
        error: 'Component not found',
      };
    }

    const definition = componentRegistry[component.type];

    return {
      success: true,
      message: `Found ${component.name || component.type} component`,
      data: {
        id: component.id,
        type: component.type,
        displayName: definition?.name || component.type,
        name: component.name,
        props: component.props,
        interactions: component.interactions,
        hasChildren: (component.children?.length || 0) > 0,
        childrenCount: component.children?.length || 0,
      },
    };
  },
};

// Get currently selected components
export const getSelectedComponentsTool: AgentTool = {
  name: 'getSelectedComponents',
  description: 'Get list of currently selected components',
  category: 'context',
  execute: async (_params: {}, context: ToolContext): Promise<ToolResult> => {
    if (context.selectedNodeIds.length === 0) {
      return {
        success: true,
        message: 'No components currently selected',
        data: [],
      };
    }

    const selected = context.selectedNodeIds
      .map(id => context.getNodeById(id))
      .filter(Boolean)
      .map(node => ({
        id: node!.id,
        type: node!.type,
        name: node!.name,
        displayName: componentRegistry[node!.type]?.name || node!.type,
      }));

    return {
      success: true,
      message: `${selected.length} component(s) selected: ${selected.map(s => s.name || s.displayName).join(', ')}`,
      data: selected,
    };
  },
};

// Search for components
export const searchComponentsTool: AgentTool = {
  name: 'searchComponents',
  description: 'Search for components by name, type, or other criteria',
  category: 'context',
  parameters: {
    query: {
      type: 'string',
      description: 'Search query (searches in name and type)',
      required: true,
    },
    pageId: {
      type: 'string',
      description: 'Optional page ID to limit search to specific page',
      required: false,
    },
  },
  execute: async (params: { query: string; pageId?: string }, context: ToolContext): Promise<ToolResult> => {
    const query = params.query.toLowerCase();

    // Search recursively through tree
    const searchInTree = (nodes: typeof context.tree): any[] => {
      const results: any[] = [];

      for (const node of nodes) {
        const matches =
          (node.name && node.name.toLowerCase().includes(query)) ||
          node.type.toLowerCase().includes(query);

        if (matches) {
          results.push({
            id: node.id,
            type: node.type,
            name: node.name,
            displayName: componentRegistry[node.type]?.name || node.type,
          });
        }

        if (node.children) {
          results.push(...searchInTree(node.children));
        }
      }

      return results;
    };

    const results = searchInTree(context.tree);

    return {
      success: true,
      message: results.length > 0
        ? `Found ${results.length} component(s) matching "${params.query}": ${results.map(r => r.name || r.displayName).join(', ')}`
        : `No components found matching "${params.query}"`,
      data: results,
    };
  },
};
