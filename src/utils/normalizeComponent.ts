import { ComponentNode } from '@/types';

// Conditionally import componentRegistry
let componentRegistry: Record<string, any> = {};
try {
  if (typeof window !== 'undefined') {
    componentRegistry = require('@/componentRegistry').componentRegistry;
  } else {
    componentRegistry = require('@/componentRegistry/index.node').componentRegistry;
  }
} catch (e) {
  console.log('[normalizeComponent] Failed to load componentRegistry:', e);
}

/**
 * Normalizes a component node to ensure consistent data structure.
 *
 * This function:
 * - Converts props.content → props.children for Text/Heading/Badge components
 * - Removes empty children arrays when they shouldn't exist
 * - Recursively normalizes all child nodes
 * - Validates component types exist in registry
 * - Ensures all required fields are present
 *
 * This is the single source of truth for data transformation,
 * ensuring all data entering the reducer is in a consistent format.
 */
export function normalizeComponentNode(node: ComponentNode): ComponentNode {
  // Validate component type exists in registry
  const definition = componentRegistry[node.type];
  if (!definition) {
    console.warn(`[normalizeComponent] Unknown component type: ${node.type}`);
    // Return node as-is if type is unknown (defensive)
    return node;
  }

  // Clone the node to avoid mutations and merge defaultProps
  const normalized: ComponentNode = {
    id: node.id,
    type: node.type,
    name: node.name || '',
    // Apply defaultProps first, then override with actual props
    props: { ...definition.defaultProps, ...node.props },
    children: node.children || [],
    interactions: node.interactions || [],
  };

  // DEFENSIVE: Ensure SelectControl has options as an array
  if (node.type === 'SelectControl') {
    if (!Array.isArray(normalized.props.options)) {
      normalized.props.options = [];
    }
  }

  // CRITICAL: Transform props.content → props.children for Text, Heading, and Badge
  if (node.type === 'Text' || node.type === 'Heading' || node.type === 'Badge') {
    const hasContent = 'content' in normalized.props && normalized.props.content;
    const hasValidChildren = Array.isArray(normalized.children) && normalized.children.length > 0;
    const hasChildrenProp = 'children' in normalized.props && normalized.props.children;

    // Priority: props.children (if valid) > props.content > single Text child > empty
    if (!hasChildrenProp && hasContent) {
      // Move content to children prop
      normalized.props.children = normalized.props.content;
      delete normalized.props.content;
    } else if (!hasChildrenProp && hasValidChildren && normalized.children && normalized.children.length === 1 && normalized.children[0].type === 'Text') {
      // buildFromYAML creates Heading → Text child structure
      // Flatten single Text child into props.children
      const textChild = normalized.children[0];
      if ('children' in textChild.props) {
        normalized.props.children = textChild.props.children;
      }
    } else if (hasChildrenProp) {
      // Already has children prop, just remove content if it exists
      delete normalized.props.content;
    }

    // Always clear children array for Text/Heading/Badge (they don't render child components)
    normalized.children = [];
  }

  // Recursively normalize all children
  if (Array.isArray(normalized.children) && normalized.children.length > 0) {
    normalized.children = normalized.children.map(child => normalizeComponentNode(child));
  }

  return normalized;
}

/**
 * Normalizes an array of component nodes
 */
export function normalizeComponentNodes(nodes: ComponentNode[]): ComponentNode[] {
  return nodes.map(node => normalizeComponentNode(node));
}
