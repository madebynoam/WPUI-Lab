import { ComponentNode } from '../types';

/**
 * Generate a unique ID for components
 */
export const generateId = (): string => {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Find the parent node of a given node ID in the tree
 */
export const findParent = (
  nodes: ComponentNode[],
  targetId: string,
  parent: ComponentNode | null = null
): ComponentNode | null => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return parent;
    }
    if (node.children) {
      const found = findParent(node.children, targetId, node);
      if (found !== null) return found;
    }
  }
  return null;
};

/**
 * Find a node by its ID in the tree
 */
export const findNodeById = (
  nodes: ComponentNode[],
  targetId: string
): ComponentNode | null => {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.children) {
      const found = findNodeById(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
};
