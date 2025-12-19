import { AgentTool, ToolContext, ToolResult } from '../types';
import { ComponentNode } from '../../types';
import { ROOT_GRID_ID } from '@/utils/treeHelpers';

// Conditionally import componentRegistry
let componentRegistry: Record<string, any> = {};
try {
  if (typeof window !== 'undefined') {
    componentRegistry = require('@/componentRegistry').componentRegistry;
  } else {
    componentRegistry = require('@/componentRegistry/index.node').componentRegistry;
  }
} catch (e) {
  console.log('[treeManipulation] Failed to load componentRegistry:', e);
}

// Generate comprehensive schema documentation for the agent
function generateSchemaDocumentation(): string {
  const availableComponents = Object.keys(componentRegistry).map(type => {
    const def = componentRegistry[type];
    return `  - ${type}: ${def.description || def.name} ${def.acceptsChildren ? '(container)' : '(leaf)'}`;
  }).join('\n');

  return `
# Component Tree Structure

The component tree is an array of ComponentNode objects with the following structure:

\`\`\`typescript
interface ComponentNode {
  id: string;                        // Unique identifier (use generateId() for new nodes)
  type: string;                      // Component type (see available types below)
  name?: string;                     // Optional display name
  props: Record<string, any>;        // Component properties
  children?: ComponentNode[];        // Child nodes (only for container components)
  interactions?: Interaction[];      // Event handlers and interactions
}
\`\`\`

## Available Component Types

${availableComponents}

## Important Rules

1. **Root Node**: Tree must start with VStack node with id="${ROOT_GRID_ID}"
2. **Text Components**: Text and Heading components store their content in props.children (NOT as child nodes)
3. **Container Components**: Components marked as (container) can have children array
4. **Leaf Components**: Components marked as (leaf) cannot have children
5. **IDs**: Every node must have a unique ID. Use \`id: \`node-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\` for new nodes
6. **Props**: Every node must have a props object (can be empty: {})

## Common Operations

### Add a component
\`\`\`javascript
// Find parent in tree
const parent = tree[0].children.find(n => n.type === 'Grid');

// Create new component
const newButton = {
  id: \`node-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
  type: 'Button',
  props: { text: 'Click Me', variant: 'primary' },
  children: [],
  interactions: []
};

// Add to parent's children
parent.children.push(newButton);
\`\`\`

### Update component props
\`\`\`javascript
// Find component by ID
const findById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const button = findById(tree, 'button-123');
button.props.text = 'Updated Text';
button.props.variant = 'secondary';
\`\`\`

### Remove a component
\`\`\`javascript
// Remove from parent's children array
const removeFromTree = (nodes, idToRemove) => {
  return nodes.filter(node => {
    if (node.id === idToRemove) return false;
    if (node.children) {
      node.children = removeFromTree(node.children, idToRemove);
    }
    return true;
  });
};

const updatedTree = removeFromTree(tree, 'component-to-remove');
\`\`\`

### Create a Card with content
\`\`\`javascript
const newCard = {
  id: \`node-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
  type: 'Card',
  props: {},
  children: [
    {
      id: \`node-\${Date.now() + 1}-\${Math.random().toString(36).substr(2, 9)}\`,
      type: 'CardHeader',
      props: {},
      children: [
        {
          id: \`node-\${Date.now() + 2}-\${Math.random().toString(36).substr(2, 9)}\`,
          type: 'Heading',
          props: { level: 3, children: 'Card Title' }, // Content in props.children!
          children: []
        }
      ]
    },
    {
      id: \`node-\${Date.now() + 3}-\${Math.random().toString(36).substr(2, 9)}\`,
      type: 'CardBody',
      props: {},
      children: [
        {
          id: \`node-\${Date.now() + 4}-\${Math.random().toString(36).substr(2, 9)}\`,
          type: 'Text',
          props: { children: 'Card content goes here' }, // Content in props.children!
          children: []
        }
      ]
    }
  ],
  interactions: []
};
\`\`\`

### Bulk update multiple components
\`\`\`javascript
// Update all buttons to have primary variant
const updateAll = (nodes, type, propsToUpdate) => {
  nodes.forEach(node => {
    if (node.type === type) {
      Object.assign(node.props, propsToUpdate);
    }
    if (node.children) {
      updateAll(node.children, type, propsToUpdate);
    }
  });
};

updateAll(tree, 'Button', { variant: 'primary' });
\`\`\`

## Pro Tips

1. **Atomic Operations**: Do multiple changes in a single modification - it's more efficient
2. **Deep Cloning**: When modifying, make sure to preserve the entire tree structure
3. **Validation**: The system will validate your tree - check console for detailed error messages
4. **Context Matters**: For Text/Heading, "props.children" is the actual text content
`.trim();
}

/**
 * Single tool that replaces all 13 action tools
 * Allows agent to manipulate tree structure directly
 */
export const modifyComponentTreeTool: AgentTool = {
  name: 'modifyComponentTree',
  description: 'Modify the component tree structure directly. This is the PRIMARY tool for all tree modifications (add, remove, update components). Provides full flexibility to manipulate tree JSON.',
  category: 'action',
  parameters: {
    modifiedTree: {
      type: 'object',
      description: 'The complete modified component tree array. Must include root VStack node.',
      required: true,
    },
  },
  execute: async (
    params: { modifiedTree: ComponentNode[] },
    context: ToolContext
  ): Promise<ToolResult> => {
    try {
      // Provide current tree and documentation to agent if modifiedTree is a special "GET_INFO" request
      if ((params.modifiedTree as any) === 'GET_SCHEMA_INFO') {
        return {
          success: true,
          message: 'Schema documentation and current tree',
          data: {
            currentTree: context.tree,
            schemaDocumentation: generateSchemaDocumentation(),
            availableComponents: Object.keys(componentRegistry),
            rootNodeId: ROOT_GRID_ID,
          },
        };
      }

      const { modifiedTree } = params;

      // Validate basic structure
      if (!Array.isArray(modifiedTree)) {
        return {
          success: false,
          message: 'modifiedTree must be an array of ComponentNode objects',
          error: 'Invalid parameter type',
        };
      }

      if (modifiedTree.length === 0) {
        return {
          success: false,
          message: 'modifiedTree cannot be empty',
          error: 'Empty tree',
        };
      }

      // Apply the tree through setTree (which goes through reducer with validation)
      try {
        context.setTree(modifiedTree);

        return {
          success: true,
          message: 'Component tree updated successfully',
          data: {
            nodeCount: countNodes(modifiedTree),
            rootType: modifiedTree[0]?.type,
          },
        };
      } catch (validationError) {
        // Validation errors from reducer
        return {
          success: false,
          message: `Tree validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`,
          error: String(validationError),
          data: {
            hint: 'Check console for detailed validation errors. Common issues: missing required fields, invalid component types, Text/Heading with children array instead of props.children',
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to modify tree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  },
};

// Helper to count total nodes in tree
function countNodes(tree: ComponentNode[]): number {
  let count = 0;
  function traverse(nodes: ComponentNode[]) {
    nodes.forEach(node => {
      count++;
      if (node.children) {
        traverse(node.children);
      }
    });
  }
  traverse(tree);
  return count;
}
