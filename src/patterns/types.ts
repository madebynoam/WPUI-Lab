import { ComponentNode, PatternNode } from '../types';
import { generateId } from '../utils/idGenerator';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  category: string;
  tree: PatternNode;
}

// Helper to assign IDs to pattern trees
export const assignIds = (node: PatternNode): ComponentNode => ({
  ...node,
  id: generateId(),
  children: node.children?.filter(Boolean).map(assignIds),
});
