import { AgentTool, ToolContext, ToolResult } from "../types";
import { normalizeComponentNodes } from "../../utils/normalizeComponent";
import { getAgentComponentList } from "../../config/availableComponents";
import { parseMarkupWithRepair } from "../utils/repairMarkup";
import { generateId } from "../../utils/idGenerator";
import { ComponentNode } from "../../types";

// Conditionally import componentRegistry
let componentRegistry: Record<string, any> = {};
try {
  if (typeof window !== 'undefined') {
    componentRegistry = require('@/componentRegistry').componentRegistry;
  } else {
    // Node.js environment - use mock registry
    componentRegistry = require('@/componentRegistry/index.node').componentRegistry;
  }
} catch (e) {
  console.log('[actions] Failed to load componentRegistry:', e);
}

// Import table templates for Table node processing
import { TABLE_TEMPLATES } from './tableCreate';

/**
 * Process Table nodes in the parsed tree, replacing them with Grid+DataViews structure
 * This allows <Table template="..." /> syntax in buildFromMarkup
 */
function processTableNodes(nodes: ComponentNode[]): ComponentNode[] {
  return nodes.map(node => processTableNode(node));
}

function processTableNode(node: ComponentNode): ComponentNode {
  // If this is a Table node, replace it with Grid+DataViews
  if (node.type === 'Table') {
    console.log('[buildFromMarkup] Processing Table node with props:', node.props);

    const template = node.props.template || 'users'; // Default to users if no template specified
    const viewType = node.props.viewType || 'table';
    const itemsPerPage = node.props.itemsPerPage || 10;

    // Get template data
    let tableColumns: Array<{ id: string; label: string }>;
    let tableData: Array<any>;

    if (template === 'custom') {
      if (!node.props.columns || !node.props.data) {
        console.error('[buildFromMarkup] Custom table template requires columns and data props');
        tableColumns = [];
        tableData = [];
      } else {
        tableColumns = node.props.columns;
        tableData = node.props.data;
      }
    } else {
      const templateData = TABLE_TEMPLATES[template as keyof typeof TABLE_TEMPLATES];
      if (!templateData) {
        console.error(`[buildFromMarkup] Unknown table template: ${template}`);
        tableColumns = [];
        tableData = [];
      } else {
        tableColumns = templateData.columns;
        tableData = templateData.sampleData;
      }
    }

    // Create DataViews node
    const dataViewsNode: ComponentNode = {
      id: generateId(),
      type: 'DataViews',
      name: '',
      props: {
        dataSource: 'custom',
        data: tableData,
        columns: tableColumns,
        viewType,
        itemsPerPage,
        gridColumnSpan: 12,  // Full width in 12-column grid
      },
      children: [],
      interactions: [],
    };

    // Wrap in Grid container (12-column system)
    const gridNode: ComponentNode = {
      id: generateId(),
      type: 'Grid',
      name: '',
      props: {
        columns: 12,
      },
      children: [dataViewsNode],
      interactions: [],
    };

    console.log('[buildFromMarkup] Replaced Table with Grid+DataViews');
    return gridNode;
  }

  // Recursively process children
  if (node.children && node.children.length > 0) {
    return {
      ...node,
      children: node.children.map(child => processTableNode(child)),
    };
  }

  return node;
}

// DEPRECATED TOOLS REMOVED:
// - createComponentTool: Replaced by smart tools (component_update, buildFromMarkup)
// - batchCreateComponentsTool: Replaced by buildFromMarkup
// - updateComponentTool: Replaced by component_update
// - deleteComponentTool: Replaced by component_delete

// Duplicate a component
export const duplicateComponentTool: AgentTool = {
  name: "duplicateComponent",
  description: "Duplicate an existing component in its current location",
  category: "action",
  parameters: {
    componentId: {
      type: "string",
      description: "ID of the component to duplicate",
      required: true,
    },
  },
  execute: async (
    params: { componentId: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    const component = context.getNodeById(params.componentId);
    if (!component) {
      return {
        success: false,
        message: `Component with ID "${params.componentId}" not found`,
        error: "Component not found",
      };
    }

    try {
      context.duplicateComponent(params.componentId);

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Duplicated ${
          component.name || definition?.name || component.type
        }`,
        data: {
          originalId: params.componentId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to duplicate component: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};

// Add interaction to component
export const addInteractionTool: AgentTool = {
  name: "addInteraction",
  description: "Add an interaction (like onClick) to a component",
  category: "action",
  parameters: {
    componentId: {
      type: "string",
      description: "ID of the component to add interaction to",
      required: true,
    },
    action: {
      type: "string",
      description:
        'Type of interaction action (e.g., "navigate", "setPlayMode")',
      required: true,
    },
    target: {
      type: "string",
      description: "Target for the interaction (e.g., page ID for navigation)",
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
        error: "Component not found",
      };
    }

    try {
      const interaction = {
        id: generateId(),
        event: "onClick",
        action: params.action,
        target: params.target,
      };

      context.addInteraction(params.componentId, interaction);

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Added ${params.action} interaction to ${
          component.name || definition?.name || component.type
        }`,
        data: {
          componentId: params.componentId,
          interactionId: interaction.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add interaction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};

// Create new page
export const createPageTool: AgentTool = {
  name: "createPage",
  description:
    "Create a new page in the application and automatically switch to it",
  category: "action",
  parameters: {
    name: {
      type: "string",
      description: "Name of the new page",
      required: true,
    },
  },
  execute: async (
    params: { name: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    try {
      const pageId = context.createPage(params.name, "");

      return {
        success: true,
        message: `Created new page "${params.name}" and switched to it`,
        data: {
          name: params.name,
          pageId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create page: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};

// Switch to a different page
export const switchPageTool: AgentTool = {
  name: "switchPage",
  description: "Switch to a different page",
  category: "action",
  parameters: {
    pageId: {
      type: "string",
      description: "ID of the page to switch to",
      required: true,
    },
  },
  execute: async (
    params: { pageId: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    const page = context.pages.find((p) => p.id === params.pageId);
    if (!page) {
      return {
        success: false,
        message: `Page with ID "${params.pageId}" not found`,
        error: "Page not found",
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
        message: `Failed to switch page: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};

// DEPRECATED: updateMultipleComponentsTool - Replaced by component_update with better smart matching

// Copy a component to clipboard
export const copyComponentTool: AgentTool = {
  name: "copyComponent",
  description: "Copy a component to clipboard for later pasting",
  category: "action",
  parameters: {
    componentId: {
      type: "string",
      description: "ID of the component to copy",
      required: true,
    },
  },
  execute: async (
    params: { componentId: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    const component = context.getNodeById(params.componentId);
    if (!component) {
      return {
        success: false,
        message: `Component with ID "${params.componentId}" not found`,
        error: "Component not found",
      };
    }

    try {
      context.copyComponent(params.componentId);

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Copied ${
          component.name || definition?.name || component.type
        } to clipboard`,
        data: {
          componentId: params.componentId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to copy component: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};

// Paste component from clipboard
export const pasteComponentTool: AgentTool = {
  name: "pasteComponent",
  description: "Paste previously copied component from clipboard",
  category: "action",
  parameters: {
    parentId: {
      type: "string",
      description:
        "ID of parent component to paste into. If not provided, pastes at root.",
      required: false,
    },
  },
  execute: async (
    params: { parentId?: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    try {
      context.pasteComponent();

      return {
        success: true,
        message: `Pasted component${
          params.parentId ? " into parent" : " at root"
        }`,
        data: {
          parentId: params.parentId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to paste component: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};

// Remove interaction from component
export const removeInteractionTool: AgentTool = {
  name: "removeInteraction",
  description: "Remove an interaction from a component",
  category: "action",
  parameters: {
    componentId: {
      type: "string",
      description: "ID of the component",
      required: true,
    },
    interactionId: {
      type: "string",
      description: "ID of the interaction to remove",
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
        error: "Component not found",
      };
    }

    try {
      context.removeInteraction(params.componentId, params.interactionId);

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Removed interaction from ${
          component.name || definition?.name || component.type
        }`,
        data: {
          componentId: params.componentId,
          interactionId: params.interactionId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to remove interaction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};

// Update existing interaction
export const updateInteractionTool: AgentTool = {
  name: "updateInteraction",
  description: "Update an existing interaction on a component",
  category: "action",
  parameters: {
    componentId: {
      type: "string",
      description: "ID of the component",
      required: true,
    },
    interactionId: {
      type: "string",
      description: "ID of the interaction to update",
      required: true,
    },
    action: {
      type: "string",
      description: 'New action type (e.g., "navigate", "setPlayMode")',
      required: false,
    },
    target: {
      type: "string",
      description: "New target for the interaction",
      required: false,
    },
  },
  execute: async (
    params: {
      componentId: string;
      interactionId: string;
      action?: string;
      target?: string;
    },
    context: ToolContext
  ): Promise<ToolResult> => {
    const component = context.getNodeById(params.componentId);
    if (!component) {
      return {
        success: false,
        message: `Component with ID "${params.componentId}" not found`,
        error: "Component not found",
      };
    }

    try {
      const updates: any = {};
      if (params.action) updates.action = params.action;
      if (params.target !== undefined) updates.target = params.target;

      context.updateInteraction(
        params.componentId,
        params.interactionId,
        updates
      );

      const definition = componentRegistry[component.type];
      return {
        success: true,
        message: `Updated interaction on ${
          component.name || definition?.name || component.type
        }`,
        data: {
          componentId: params.componentId,
          interactionId: params.interactionId,
          updates,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update interaction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};

// Update page theme
export const updatePageThemeTool: AgentTool = {
  name: "updatePageTheme",
  description: "Update the theme (colors) of a page",
  category: "action",
  parameters: {
    pageId: {
      type: "string",
      description:
        "ID of the page to update. If not provided, updates current page.",
      required: false,
    },
    primaryColor: {
      type: "string",
      description: 'Primary color (hex code, e.g., "#3858e9")',
      required: false,
    },
    backgroundColor: {
      type: "string",
      description: 'Background color (hex code, e.g., "#ffffff")',
      required: false,
    },
  },
  execute: async (
    params: {
      pageId?: string;
      primaryColor?: string;
      backgroundColor?: string;
    },
    context: ToolContext
  ): Promise<ToolResult> => {
    const pageId = params.pageId || context.currentPageId;
    const page = context.pages.find((p) => p.id === pageId);

    if (!page) {
      return {
        success: false,
        message: `Page with ID "${pageId}" not found`,
        error: "Page not found",
      };
    }

    try {
      const theme: any = {};
      if (params.primaryColor) theme.primaryColor = params.primaryColor;
      if (params.backgroundColor)
        theme.backgroundColor = params.backgroundColor;

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
        message: `Failed to update page theme: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};

// Build component tree from JSX markup (token-efficient bulk operations)
export const buildFromMarkupTool: AgentTool = {
  name: "buildFromMarkup",
  description: `🎯 PRIMARY TOOL for creating one or multiple components! Use this for ANY bulk operation. Use JSX-like markup for natural HTML/JSX-style syntax. Supports automatic repair if markup has errors. Pass markup as the "markup" parameter.

Example:
{
  markup: \`<Grid columns={3} gap={4}>
  <Card>
    <CardHeader>
      <Heading level={3}>Spring Special</Heading>
    </CardHeader>
    <CardBody>
      <Text>20% off!</Text>
    </CardBody>
    <CardFooter>
      <Button variant="primary">Shop Now</Button>
    </CardFooter>
  </Card>
</Grid>\`
}

VALID COMPONENT TYPES (${getAgentComponentList().length} total):
${getAgentComponentList().join(", ")}

IMPORTANT: Types like "Container", "Section", "Div" do NOT exist. Only use the components listed above.`,
  category: "action",
  parameters: {
    markup: {
      type: "string",
      description:
        "JSX-like markup defining component tree. Use HTML/JSX syntax with self-closing tags for components without children.",
      required: true,
    },
    parentId: {
      type: "string",
      description: "Parent component ID (optional, defaults to root)",
      required: false,
    },
  },
  execute: async (params: any, context: ToolContext): Promise<ToolResult> => {
    console.log("[buildFromMarkup] Received markup:", params.markup);
    console.log("[buildFromMarkup] Received parentId:", params.parentId);

    // Validate markup parameter
    if (!params.markup || typeof params.markup !== "string") {
      return {
        success: false,
        message:
          'Missing required "markup" parameter. Pass JSX markup as: {markup: "<Grid columns={3}>...</Grid>"}',
        error: `The markup parameter is required but received: ${typeof params.markup}`,
      };
    }

    // CRITICAL VALIDATION: Reject page IDs as parentId (common LLM mistake)
    // This prevents regression where LLM passes page ID instead of component ID
    if (params.parentId && params.parentId.startsWith('page-')) {
      console.error("[buildFromMarkup] INVALID parentId - Page IDs are not valid parent IDs!");
      console.error("[buildFromMarkup] Received:", params.parentId);
      console.error("[buildFromMarkup] Auto-correcting to undefined (will use root-vstack)");

      // Auto-correct instead of failing - this is more helpful
      params.parentId = undefined;
    }

    try {
      // Parse markup with repair loop
      const result = await parseMarkupWithRepair(params.markup);

      if (!result.success || !result.nodes) {
        return {
          success: false,
          message: `Failed to parse markup: ${result.error}`,
          error: result.error || "Parse error",
        };
      }

      console.log(
        "[buildFromMarkup] Created component nodes:",
        result.nodes.length
      );

      // Process Table nodes - replace with Grid+DataViews structure
      const processedNodes = processTableNodes(result.nodes);

      // Normalize all nodes
      const normalizedNodes = normalizeComponentNodes(processedNodes);

      // Insert all nodes
      for (const node of normalizedNodes) {
        context.addComponent(node, params.parentId, undefined);
      }

      return {
        success: true,
        message: `Created ${normalizedNodes.length} component(s) from markup${
          result.attempts > 0
            ? ` (repaired in ${
                result.attempts
              } attempts, cost: $${result.cost.toFixed(6)})`
            : ""
        }`,
        data: {
          components: normalizedNodes.map((n) => ({
            id: n.id,
            type: n.type,
          })),
          repairAttempts: result.attempts,
          repairCost: result.cost,
        },
      };
    } catch (error) {
      console.error("[buildFromMarkup] Error:", error);
      return {
        success: false,
        message: `Failed to parse markup: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        error: String(error),
      };
    }
  },
};
