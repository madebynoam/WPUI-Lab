import { ComponentNode, PatternNode } from '../types';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  category: string;
  tree: PatternNode;
}

// Helper to generate unique IDs for pattern nodes
const generateId = () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to assign IDs to pattern trees
export const assignIds = (node: PatternNode): ComponentNode => ({
  ...node,
  id: generateId(),
  children: node.children?.filter(Boolean).map(assignIds),
});
