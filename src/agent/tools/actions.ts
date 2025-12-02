import { AgentTool, ToolContext, ToolResult } from '../types';
import { ComponentNode, PatternNode } from '../../types';
import { componentRegistry } from '../../componentRegistry';
import { ROOT_VSTACK_ID } from '../../ComponentTreeContext';
import { normalizeComponentNodes } from '../../utils/normalizeComponent';
import * as yaml from 'js-yaml';

// Generate unique ID for components
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Convert PatternNode to ComponentNode with IDs
function patternNodesToComponentNodes(patternNodes: PatternNode[]): ComponentNode[] {
  const nodes = patternNodes.map(patternNode => ({
    id: generateId(),
    type: patternNode.type,
    name: patternNode.name || '',
    props: { ...patternNode.props },
    children: patternNode.children ? patternNodesToComponentNodes(patternNode.children) : [],
    interactions: [],
  }));

  // Normalize all nodes to ensure consistent data structure
  return normalizeComponentNodes(nodes);
}

// Create a new component
export const createComponentTool: AgentTool = {
  name: 'createComponent',
  description: 'Create a SINGLE component. For 3+ components, use buildFromYAML instead (much more efficient). IMPORTANT: Always use the "content" parameter for Card and Panel components to set custom text instead of generic placeholders!',
  category: 'action',
  parameters: {
    type: {
      type: 'string',
      description: 'Component type (e.g., "Button", "Text", "VStack", etc.)',
      required: true,
    },
    props: {
      type: 'object',
      description: 'Component properties',
      required: false,
      default: {},
    },
    content: {
      type: 'object',
      description: 'REQUIRED for Card and Panel components! Sets custom text content instead of generic defaults like "Card Title". For Card: { title: string, body: string }. For Panel: { body: string }. DO NOT create Cards or Panels without this parameter!',
      required: false,
    },
    parentId: {
      type: 'string',
      description: 'ID of parent component to add this component to. If not provided, adds to root.',
      required: false,
    },
    index: {
      type: 'number',
      description: 'Position index within parent. If not provided, adds at end.',
      required: false,
    },
  },
  execute: async (
    params: { type: string; props?: any; content?: any; parentId?: string; index?: number },
    context: ToolContext
  ): Promise<ToolResult> => {
    // Validate component type
    const definition = componentRegistry[params.type];
    if (!definition) {
      return {
        success: false,
        message: `Unknown component type: "${params.type}". Use getAvailableComponentTypes to see available types.`,
        error: 'Invalid component type',
      };
    }

    // ENFORCE content parameter for Card and Panel
    if ((params.type === 'Card' || params.type === 'Panel') && !params.content) {
      return {
        success: false,
        message: `ERROR: The "content" parameter is REQUIRED for ${params.type} components to set custom text. Without it, you'll create generic placeholders like "Card Title". Please provide: ${params.type === 'Card' ? '{ title: "Your Title", body: "Your content" }' : '{ body: "Your content" }'}`,
        error: 'Missing required content parameter',
      };
    }

    // Convert defaultChildren from PatternNode[] to ComponentNode[]
    let children = definition.defaultChildren
      ? patternNodesToComponentNodes(definition.defaultChildren)
      : [];

    console.log('[createComponent] Initial children:', JSON.stringify(children, null, 2));
    console.log('[createComponent] Content param:', params.content);

    // Apply content customization for smart components using immutable updates
    if (params.content) {
      if (params.type === 'Card') {
        // Customize Card content using immutable pattern
        children = children.map(child => {
          if (child.type === 'CardHeader' && params.content.title) {
            return {
              ...child,
              children: child.children?.map(grandchild =>
                grandchild.type === 'Heading'
                  ? { ...grandchild, props: { ...grandchild.props, children: params.content.title } }
                  : grandchild
              ),
            };
          }
          if (child.type === 'CardBody' && params.content.body) {
            return {
              ...child,
              children: child.children?.map(grandchild =>
                grandchild.type === 'Text'
                  ? { ...grandchild, props: { ...grandchild.props, children: params.content.body } }
                  : grandchild
              ),
            };
          }
          return child;
        });
      } else if (params.type === 'Panel') {
        // Customize Panel content using immutable pattern
        children = children.map(child => {
          if (child.type === 'PanelBody' && params.content.body) {
            return {
              ...child,
              children: child.children?.map(grandchild =>
                grandchild.type === 'Text'
                  ? { ...grandchild, props: { ...grandchild.props, children: params.content.body } }
                  : grandchild
              ),
            };
          }
          return child;
        });
      }
    }

    console.log('[createComponent] Customized children:', JSON.stringify(children, null, 2));

    // Create new component node
    const newComponent: ComponentNode = {
      id: generateId(),
      type: params.type,
      name: '',
      props: { ...definition.defaultProps, ...(params.props || {}) },
      children,
      interactions: [],
    };

    console.log('[createComponent] Final component node:', JSON.stringify(newComponent, null, 2));

    try {
      // Add the fully constructed component with customized children
      context.addComponent(newComponent, params.parentId, params.index);

      console.log('[createComponent] Successfully added component to context');

      return {
        success: true,
        message: `Created ${definition.name}${params.parentId ? ' and added to parent' : ' at root'}`,
        data: {
          id: newComponent.id,
          type: newComponent.type,
          displayName: definition.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Batch create multiple components in a single operation
export const batchCreateComponentsTool: AgentTool = {
  name: 'batchCreateComponents',
  description: 'DEPRECATED: Use buildFromYAML instead! buildFromYAML is more reliable and token-efficient for bulk operations. This tool has known bugs with content handling.',
  category: 'action',
  parameters: {
    components: {
      type: 'array',
      description: 'Array of component definitions to create. Each item should be an object with: type (string), props (object), content (object for Cards/Panels), children (array for nested components), parentId (string, optional), index (number, optional)',
      required: true,
      items: {
        type: 'object',
      },
    },
  },
  execute: async (params: any, context: ToolContext): Promise<ToolResult> => {
    console.log('[batchCreateComponents] Received params:', JSON.stringify(params, null, 2));

    if (!params.components || !Array.isArray(params.components)) {
      return {
        success: false,
        message: 'components parameter must be an array',
      };
    }

    const results: any[] = [];
    const errors: string[] = [];

    // Process each component
    for (let i = 0; i < params.components.length; i++) {
      const compDef = params.components[i];

      try {
        const definition = componentRegistry[compDef.type as keyof typeof componentRegistry];
        if (!definition) {
          errors.push(`Component ${i}: Unknown type "${compDef.type}"`);
          continue;
        }

        // Generate ID for this component
        const newComponent: ComponentNode = {
          id: generateId(),
          type: compDef.type,
          name: compDef.name || '',
          props: { ...compDef.props },
          children: [],
          interactions: [],
        };

        // Handle content parameter for Card/Panel
        if (compDef.content && (compDef.type === 'Card' || compDef.type === 'Panel')) {
          if (compDef.type === 'Card' && definition.defaultChildren) {
            const cardHeader = definition.defaultChildren.find((c: PatternNode) => c.type === 'CardHeader');
            const cardBody = definition.defaultChildren.find((c: PatternNode) => c.type === 'CardBody');

            if (cardHeader && compDef.content.title) {
              const headerChild = cardHeader.children?.[0];
              if (headerChild) {
                (headerChild.props as any).children = compDef.content.title;
              }
            }

            if (cardBody && compDef.content.body) {
              const bodyChild = cardBody.children?.[0];
              if (bodyChild) {
                (bodyChild.props as any).children = compDef.content.body;
              }
            }
          }

          if (compDef.type === 'Panel' && definition.defaultChildren && compDef.content.body) {
            const panelBody = definition.defaultChildren.find((c: PatternNode) => c.type === 'PanelBody');
            if (panelBody) {
              const bodyChild = panelBody.children?.[0];
              if (bodyChild) {
                (bodyChild.props as any).children = compDef.content.body;
              }
            }
          }
        }

        // Add default children
        if (definition.defaultChildren) {
          const defaultChildrenNodes = patternNodesToComponentNodes(definition.defaultChildren);
          newComponent.children = defaultChildrenNodes;
        }

        // Add custom children if provided
        if (compDef.children && Array.isArray(compDef.children)) {
          const customChildren = patternNodesToComponentNodes(compDef.children);
          if (!newComponent.children) {
            newComponent.children = [];
          }
          newComponent.children.push(...customChildren);
        }

        // Add to tree
        context.addComponent(newComponent, compDef.parentId, compDef.index);

        results.push({
          id: newComponent.id,
          type: newComponent.type,
          displayName: definition.name,
        });

      } catch (error) {
        errors.push(`Component ${i} (${compDef.type}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return {
        success: false,
        message: 'Failed to create all components',
        error: errors.join('; '),
      };
    }

    return {
      success: true,
      message: `Created ${results.length} component${results.length !== 1 ? 's' : ''}${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
      data: {
        created: results,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  },
};

// Update an existing component
export const updateComponentTool: AgentTool = {
  name: 'updateComponent',
  description: 'Update properties of an existing component',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'ID of the component to update',
      required: true,
    },
    props: {
      type: 'object',
      description: 'Properties to update',
      required: false,
    },
    name: {
      type: 'string',
      description: 'New name for the component',
      required: false,
    },
  },
  execute: async (
    params: { componentId: string; props?: any; name?: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    // Check component exists
    const component = context.getNodeById(params.componentId);
    if (!component) {
      return {
        success: false,
        message: `Component with ID "${params.componentId}" not found`,
        error: 'Component not found',
      };
    }

    try {
      // Update props if provided
      if (params.props) {
        context.updateComponentProps(params.componentId, params.props);
      }

      // Update name if provided
      if (params.name !== undefined) {
        context.updateComponentName(params.componentId, params.name);
      }

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Updated ${component.name || definition?.name || component.type}`,
        data: {
          id: params.componentId,
          updatedProps: params.props,
          updatedName: params.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Delete a component
export const deleteComponentTool: AgentTool = {
  name: 'deleteComponent',
  description: 'Delete a component from the tree',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'ID of the component to delete',
      required: true,
    },
  },
  execute: async (params: { componentId: string }, context: ToolContext): Promise<ToolResult> => {
    // Don't allow deleting root
    if (params.componentId === ROOT_VSTACK_ID) {
      return {
        success: false,
        message: 'Cannot delete root component',
        error: 'Invalid operation',
      };
    }

    const component = context.getNodeById(params.componentId);
    if (!component) {
      return {
        success: false,
        message: `Component with ID "${params.componentId}" not found`,
        error: 'Component not found',
      };
    }

    try {
      const definition = componentRegistry[component.type];
      const componentName = component.name || definition?.name || component.type;

      context.removeComponent(params.componentId);

      return {
        success: true,
        message: `Deleted ${componentName}`,
        data: {
          id: params.componentId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Duplicate a component
export const duplicateComponentTool: AgentTool = {
  name: 'duplicateComponent',
  description: 'Duplicate an existing component in its current location',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'ID of the component to duplicate',
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

    try {
      context.duplicateComponent(params.componentId);

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Duplicated ${component.name || definition?.name || component.type}`,
        data: {
          originalId: params.componentId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to duplicate component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Add interaction to component
export const addInteractionTool: AgentTool = {
  name: 'addInteraction',
  description: 'Add an interaction (like onClick) to a component',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'ID of the component to add interaction to',
      required: true,
    },
    action: {
      type: 'string',
      description: 'Type of interaction action (e.g., "navigate", "setPlayMode")',
      required: true,
    },
    target: {
      type: 'string',
      description: 'Target for the interaction (e.g., page ID for navigation)',
      required: false,
    },
  },
  execute: async (
    params: { componentId: string; action: string; target?: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    const component = context.getNodeById(params.componentId);
    if (!component) {
      return {
        success: false,
        message: `Component with ID "${params.componentId}" not found`,
        error: 'Component not found',
      };
    }

    try {
      const interaction = {
        id: generateId(),
        event: 'onClick',
        action: params.action,
        target: params.target,
      };

      context.addInteraction(params.componentId, interaction);

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Added ${params.action} interaction to ${component.name || definition?.name || component.type}`,
        data: {
          componentId: params.componentId,
          interactionId: interaction.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Create new page
export const createPageTool: AgentTool = {
  name: 'createPage',
  description: 'Create a new page in the application and automatically switch to it',
  category: 'action',
  parameters: {
    name: {
      type: 'string',
      description: 'Name of the new page',
      required: true,
    },
  },
  execute: async (params: { name: string }, context: ToolContext): Promise<ToolResult> => {
    try {
      context.createPage(params.name, '');

      return {
        success: true,
        message: `Created new page "${params.name}" and switched to it`,
        data: {
          name: params.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create page: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Switch to a different page
export const switchPageTool: AgentTool = {
  name: 'switchPage',
  description: 'Switch to a different page',
  category: 'action',
  parameters: {
    pageId: {
      type: 'string',
      description: 'ID of the page to switch to',
      required: true,
    },
  },
  execute: async (params: { pageId: string }, context: ToolContext): Promise<ToolResult> => {
    const page = context.pages.find(p => p.id === params.pageId);
    if (!page) {
      return {
        success: false,
        message: `Page with ID "${params.pageId}" not found`,
        error: 'Page not found',
      };
    }

    try {
      context.setCurrentPage(params.pageId);

      return {
        success: true,
        message: `Switched to page "${page.name}"`,
        data: {
          pageId: params.pageId,
          pageName: page.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to switch page: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Update multiple components at once
export const updateMultipleComponentsTool: AgentTool = {
  name: 'updateMultipleComponents',
  description: 'Update properties of multiple components at once (bulk operation)',
  category: 'action',
  parameters: {
    componentIds: {
      type: 'array',
      description: 'Array of component IDs to update',
      required: true,
      items: {
        type: 'string',
      },
    },
    props: {
      type: 'object',
      description: 'Properties to apply to all components',
      required: true,
    },
  },
  execute: async (
    params: { componentIds: string[]; props: any },
    context: ToolContext
  ): Promise<ToolResult> => {
    if (!Array.isArray(params.componentIds) || params.componentIds.length === 0) {
      return {
        success: false,
        message: 'componentIds must be a non-empty array',
        error: 'Invalid parameters',
      };
    }

    try {
      context.updateMultipleComponentProps(params.componentIds, params.props);

      return {
        success: true,
        message: `Updated ${params.componentIds.length} component(s)`,
        data: {
          componentIds: params.componentIds,
          updatedProps: params.props,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update components: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Copy a component to clipboard
export const copyComponentTool: AgentTool = {
  name: 'copyComponent',
  description: 'Copy a component to clipboard for later pasting',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'ID of the component to copy',
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

    try {
      context.copyComponent(params.componentId);

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Copied ${component.name || definition?.name || component.type} to clipboard`,
        data: {
          componentId: params.componentId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to copy component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Paste component from clipboard
export const pasteComponentTool: AgentTool = {
  name: 'pasteComponent',
  description: 'Paste previously copied component from clipboard',
  category: 'action',
  parameters: {
    parentId: {
      type: 'string',
      description: 'ID of parent component to paste into. If not provided, pastes at root.',
      required: false,
    },
  },
  execute: async (params: { parentId?: string }, context: ToolContext): Promise<ToolResult> => {
    try {
      context.pasteComponent();

      return {
        success: true,
        message: `Pasted component${params.parentId ? ' into parent' : ' at root'}`,
        data: {
          parentId: params.parentId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to paste component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Remove interaction from component
export const removeInteractionTool: AgentTool = {
  name: 'removeInteraction',
  description: 'Remove an interaction from a component',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'ID of the component',
      required: true,
    },
    interactionId: {
      type: 'string',
      description: 'ID of the interaction to remove',
      required: true,
    },
  },
  execute: async (
    params: { componentId: string; interactionId: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    const component = context.getNodeById(params.componentId);
    if (!component) {
      return {
        success: false,
        message: `Component with ID "${params.componentId}" not found`,
        error: 'Component not found',
      };
    }

    try {
      context.removeInteraction(params.componentId, params.interactionId);

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Removed interaction from ${component.name || definition?.name || component.type}`,
        data: {
          componentId: params.componentId,
          interactionId: params.interactionId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to remove interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Update existing interaction
export const updateInteractionTool: AgentTool = {
  name: 'updateInteraction',
  description: 'Update an existing interaction on a component',
  category: 'action',
  parameters: {
    componentId: {
      type: 'string',
      description: 'ID of the component',
      required: true,
    },
    interactionId: {
      type: 'string',
      description: 'ID of the interaction to update',
      required: true,
    },
    action: {
      type: 'string',
      description: 'New action type (e.g., "navigate", "setPlayMode")',
      required: false,
    },
    target: {
      type: 'string',
      description: 'New target for the interaction',
      required: false,
    },
  },
  execute: async (
    params: { componentId: string; interactionId: string; action?: string; target?: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    const component = context.getNodeById(params.componentId);
    if (!component) {
      return {
        success: false,
        message: `Component with ID "${params.componentId}" not found`,
        error: 'Component not found',
      };
    }

    try {
      const updates: any = {};
      if (params.action) updates.action = params.action;
      if (params.target !== undefined) updates.target = params.target;

      context.updateInteraction(params.componentId, params.interactionId, updates);

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Updated interaction on ${component.name || definition?.name || component.type}`,
        data: {
          componentId: params.componentId,
          interactionId: params.interactionId,
          updates,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Update page theme
export const updatePageThemeTool: AgentTool = {
  name: 'updatePageTheme',
  description: 'Update the theme (colors) of a page',
  category: 'action',
  parameters: {
    pageId: {
      type: 'string',
      description: 'ID of the page to update. If not provided, updates current page.',
      required: false,
    },
    primaryColor: {
      type: 'string',
      description: 'Primary color (hex code, e.g., "#3858e9")',
      required: false,
    },
    backgroundColor: {
      type: 'string',
      description: 'Background color (hex code, e.g., "#ffffff")',
      required: false,
    },
  },
  execute: async (
    params: { pageId?: string; primaryColor?: string; backgroundColor?: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    const pageId = params.pageId || context.currentPageId;
    const page = context.pages.find(p => p.id === pageId);

    if (!page) {
      return {
        success: false,
        message: `Page with ID "${pageId}" not found`,
        error: 'Page not found',
      };
    }

    try {
      const theme: any = {};
      if (params.primaryColor) theme.primaryColor = params.primaryColor;
      if (params.backgroundColor) theme.backgroundColor = params.backgroundColor;

      context.updatePageTheme(pageId, theme);

      return {
        success: true,
        message: `Updated theme for page "${page.name}"`,
        data: {
          pageId,
          theme,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update page theme: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Build component tree from YAML DSL (token-efficient bulk operations)
export const buildFromYAMLTool: AgentTool = {
  name: 'buildFromYAML',
  description: '🎯 PRIMARY TOOL for creating multiple components! Use this for ANY bulk operation (3+ items). YAML is 20% more token-efficient and more reliable than other tools. Pass YAML as the "yaml" parameter. Example: {yaml: "Grid:\\n  columns: 3\\n  children:\\n    - Card:\\n        title: Spring Special\\n        children:\\n          - Text: 20% off!\\n          - Button:\\n              text: Shop Now"}',
  category: 'action',
  parameters: {
    yaml: {
      type: 'string',
      description: 'YAML string defining component tree. Use natural YAML syntax with component names as keys.',
      required: true,
    },
    parentId: {
      type: 'string',
      description: 'Parent component ID (optional, defaults to root)',
      required: false,
    },
  },
  execute: async (params: any, context: ToolContext): Promise<ToolResult> => {
    console.log('[buildFromYAML] Received YAML:', params.yaml);

    // Validate yaml parameter
    if (!params.yaml || typeof params.yaml !== 'string') {
      return {
        success: false,
        message: 'Missing required "yaml" parameter. Pass YAML string as: {yaml: "Grid:\\n  columns: 3..."}',
        error: `The yaml parameter is required but received: ${typeof params.yaml}`,
      };
    }

    try {
      // Parse YAML
      const parsed = yaml.load(params.yaml);
      console.log('[buildFromYAML] Parsed YAML:', JSON.stringify(parsed, null, 2));

      if (!parsed) {
        return {
          success: false,
          message: 'Empty YAML input',
          error: 'YAML string is empty or invalid',
        };
      }

      // Convert YAML structure to component nodes
      const parseComponent = (data: any): PatternNode => {
        // Handle different YAML structures
        if (typeof data === 'string') {
          // Simple text node
          return {
            type: 'Text',
            props: { children: data },
          };
        }

        if (Array.isArray(data)) {
          // Array of components - wrap in VStack
          return {
            type: 'VStack',
            props: {},
            children: data.map(parseComponent),
          };
        }

        if (typeof data === 'object') {
          // Find the component type (first key)
          const keys = Object.keys(data);
          if (keys.length === 0) {
            throw new Error('Empty component object');
          }

          const componentType = keys[0];
          const componentData = data[componentType];

          // Check if component exists
          const definition = componentRegistry[componentType as keyof typeof componentRegistry];
          if (!definition) {
            throw new Error(`Unknown component type: "${componentType}"`);
          }

          const node: PatternNode = {
            type: componentType,
            props: {},
          };

          if (componentData) {
            if (typeof componentData === 'string') {
              // Shorthand: Card: "Text content"
              node.props = { children: componentData };
            } else if (typeof componentData === 'object' && !Array.isArray(componentData)) {
              // Extract props and children
              const { children, title, price, body, ...otherProps } = componentData;

              // Set all props (including title if present)
              node.props = { ...otherProps };
              if (title !== undefined) node.props.title = title;
              if (price !== undefined) node.props.price = price;
              if (body !== undefined) node.props.body = body;

              // Parse children
              if (children) {
                node.children = Array.isArray(children) ? children.map(parseComponent) : [parseComponent(children)];
              }
            } else if (Array.isArray(componentData)) {
              // Array of children
              node.children = componentData.map(parseComponent);
            }
          }

          return node;
        }

        throw new Error(`Unsupported YAML structure: ${typeof data}`);
      };

      // Parse the root component(s)
      let rootComponents: PatternNode[];
      if (Array.isArray(parsed)) {
        rootComponents = parsed.map(parseComponent);
      } else {
        rootComponents = [parseComponent(parsed)];
      }

      console.log('[buildFromYAML] Root components:', JSON.stringify(rootComponents, null, 2));

      // Convert PatternNodes to ComponentNodes with IDs and default children
      const createComponentNode = (pattern: PatternNode): ComponentNode => {
        const definition = componentRegistry[pattern.type as keyof typeof componentRegistry];
        if (!definition) {
          throw new Error(`Unknown component type: "${pattern.type}"`);
        }

        const node: ComponentNode = {
          id: generateId(),
          type: pattern.type,
          name: pattern.name || '',
          props: { ...pattern.props },
          children: [],
          interactions: [],
        };

        // Handle Card/Panel content shortcuts from YAML
        if (pattern.type === 'Card' && pattern.props.title && pattern.children && pattern.children.length > 0) {
          // Card with BOTH title and custom children - wrap children in CardHeader + CardBody
          const cardHeader: ComponentNode = {
            id: generateId(),
            type: 'CardHeader',
            name: '',
            props: {},
            children: [{
              id: generateId(),
              type: 'Heading',
              name: '',
              props: { children: pattern.props.title, level: 3 },
              children: [],
              interactions: [],
            }],
            interactions: [],
          };

          const cardBody: ComponentNode = {
            id: generateId(),
            type: 'CardBody',
            name: '',
            props: {},
            children: pattern.children.map(createComponentNode),
            interactions: [],
          };

          node.children = [cardHeader, cardBody];
          // Remove title from props since we used it
          delete node.props.title;
        } else if (pattern.type === 'Card' && pattern.props.title && pattern.props.body) {
          // Card with title/body shortcuts - use default children and customize
          if (definition.defaultChildren) {
            const defaultChildrenNodes = patternNodesToComponentNodes(definition.defaultChildren);

            const cardHeader = defaultChildrenNodes.find(c => c.type === 'CardHeader');
            if (cardHeader && cardHeader.children) {
              const heading = cardHeader.children.find(c => c.type === 'Heading');
              if (heading) heading.props.children = pattern.props.title;
            }

            const cardBody = defaultChildrenNodes.find(c => c.type === 'CardBody');
            if (cardBody && cardBody.children) {
              const text = cardBody.children.find(c => c.type === 'Text');
              if (text) text.props.children = pattern.props.body;
            }

            node.children = defaultChildrenNodes;
            delete node.props.title;
            delete node.props.body;
          }
        } else if (pattern.type === 'Panel' && pattern.props.body) {
          // Panel with body shortcut
          if (definition.defaultChildren) {
            const defaultChildrenNodes = patternNodesToComponentNodes(definition.defaultChildren);
            const panelBody = defaultChildrenNodes.find(c => c.type === 'PanelBody');
            if (panelBody && panelBody.children) {
              const text = panelBody.children.find(c => c.type === 'Text');
              if (text) text.props.children = pattern.props.body;
            }
            node.children = defaultChildrenNodes;
            delete node.props.body;
          }
        } else if (pattern.children && pattern.children.length > 0) {
          // Custom children provided
          const customChildren = pattern.children.map(createComponentNode);
          node.children = customChildren;
        } else if (definition.defaultChildren) {
          // No custom children - use defaults
          const defaultChildrenNodes = patternNodesToComponentNodes(definition.defaultChildren);
          node.children = defaultChildrenNodes;
        }

        return node;
      };

      // Create component nodes from patterns
      const componentNodes = rootComponents.map(createComponentNode);

      // Normalize all nodes
      const normalizedNodes = normalizeComponentNodes(componentNodes);

      console.log('[buildFromYAML] Created component nodes:', normalizedNodes.length);

      // Insert all nodes
      for (const node of normalizedNodes) {
        context.addComponent(node, params.parentId, undefined);
      }

      return {
        success: true,
        message: `Created ${normalizedNodes.length} component(s) from YAML`,
        data: {
          components: normalizedNodes.map(n => ({
            id: n.id,
            type: n.type,
          })),
        },
      };

    } catch (error) {
      console.error('[buildFromYAML] Error:', error);
      return {
        success: false,
        message: `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};
