import { ComponentNode } from '../types';

export interface FlattenedNode extends ComponentNode {
  depth: number;
  parentId: string | null;
  index: number;
}

export interface TreeItems {
  [id: string]: ComponentNode & { children?: string[] };
}

/**
 * Flatten a tree structure into an array with depth information
 */
export function flattenTree(
  items: ComponentNode[],
  parentId: string | null = null,
  depth = 0
): FlattenedNode[] {
  return items.reduce<FlattenedNode[]>((acc, item, index) => {
    const flattenedNode: FlattenedNode = {
      ...item,
      depth,
      parentId,
      index,
    };

    return [
      ...acc,
      flattenedNode,
      ...(item.children ? flattenTree(item.children, item.id, depth + 1) : []),
    ];
  }, []);
}

/**
 * Build a tree structure from flattened items (Figma-style: no root constraint)
 * Returns array of top-level nodes - can be any components, not limited to single root
 */
export function buildTree(flattenedItems: FlattenedNode[]): ComponentNode[] {
  const nodes: { [id: string]: ComponentNode } = {};
  const rootNodes: ComponentNode[] = [];

  // First pass: create all nodes with empty children arrays
  flattenedItems.forEach((item) => {
    const node: ComponentNode = {
      id: item.id,
      type: item.type,
      props: item.props,
      children: [],
      interactions: item.interactions,
      name: item.name,
      collapsed: item.collapsed,
    };

    nodes[item.id] = node;
  });

  // Second pass: build parent-child relationships
  flattenedItems.forEach((item) => {
    const node = nodes[item.id];
    if (!node) return;

    // If parentId is null/undefined, this is a top-level node
    if (!item.parentId) {
      rootNodes.push(node);
    } else {
      // Has a parent - add to parent's children
      const parent = nodes[item.parentId];
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      } else {
        // Parent doesn't exist - treat as top-level
        console.warn(`[buildTree] Parent ${item.parentId} not found for node ${item.id}, treating as top-level`);
        rootNodes.push(node);
      }
    }
  });

  return rootNodes;
}

/**
 * Calculate the projected drop position including depth
 */
export interface Projection {
  depth: number;
  maxDepth: number;
  minDepth: number;
  parentId: string | null;
}

export function getProjection(
  items: FlattenedNode[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentationWidth: number
): Projection | null {
  const overItemIndex = items.findIndex((item) => item.id === overId);
  const activeItemIndex = items.findIndex((item) => item.id === activeId);

  if (activeItemIndex === -1 || overItemIndex === -1) {
    return null;
  }

  const activeItem = items[activeItemIndex];
  const overItem = items[overItemIndex];

  // Calculate depth based on horizontal drag offset
  const offsetDepth = Math.round(dragOffset / indentationWidth);
  const projectedDepth = overItem.depth + offsetDepth;

  // Find the maximum depth we can nest to (based on over item)
  const maxDepth = getMaxDepth(overItem);

  // Find the minimum depth (cannot be less than 0)
  const minDepth = 0;

  // Clamp the depth
  const depth = Math.min(Math.max(projectedDepth, minDepth), maxDepth);

  // Find parent based on depth
  const parentId = getParentId();

  function getParentId(): string | null {
    if (depth === 0) {
      return null;
    }

    if (depth === overItem.depth) {
      return overItem.parentId;
    }

    if (depth > overItem.depth) {
      return overId;
    }

    // depth < overItem.depth - need to find ancestor at correct depth
    for (let i = overItemIndex - 1; i >= 0; i--) {
      if (items[i].depth === depth - 1) {
        return items[i].id;
      }
    }

    return null;
  }

  function getMaxDepth(overItem: FlattenedNode): number {
    // Can be a child of the over item
    return overItem.depth + 1;
  }

  return {
    depth,
    maxDepth,
    minDepth,
    parentId,
  };
}

/**
 * Count the number of children for a node (recursive)
 */
export function getChildCount(items: ComponentNode[], id: string): number {
  const item = items.find((item) => item.id === id);

  if (!item || !item.children) {
    return 0;
  }

  let count = item.children.length;

  item.children.forEach((child) => {
    count += getChildCount(items, child.id);
  });

  return count;
}

/**
 * Remove all descendants of items being dragged (prevents flashing)
 * Matches dnd-kit SortableTree example implementation
 */
export function removeChildrenOf(
  items: FlattenedNode[],
  ids: string[]
): FlattenedNode[] {
  const excludeParentIds = [...ids];

  return items.filter((item) => {
    if (item.parentId && excludeParentIds.includes(item.parentId)) {
      if (item.children && item.children.length) {
        excludeParentIds.push(item.id);
      }
      return false;
    }

    return true;
  });
}

/**
 * Find an item by ID in the flattened array
 */
export function findItem(items: FlattenedNode[], itemId: string): FlattenedNode | undefined {
  return items.find((item) => item.id === itemId);
}

/**
 * Get all descendant IDs of a node
 */
export function getDescendantIds(items: ComponentNode[], id: string): string[] {
  const item = items.find((item) => item.id === id);
  const ids: string[] = [];

  if (!item || !item.children) {
    return ids;
  }

  item.children.forEach((child) => {
    ids.push(child.id);
    ids.push(...getDescendantIds(items, child.id));
  });

  return ids;
}
