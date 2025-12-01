import { ComponentNode, Page } from '../types';

export const ROOT_VSTACK_ID = 'root-vstack';

/**
 * Generate a unique ID for components
 */
export const generateId = (): string => {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get the current tree for a given page
 */
export const getCurrentTree = (pages: Page[], currentPageId: string): ComponentNode[] => {
  const currentPage = pages.find(p => p.id === currentPageId);
  return currentPage?.tree || [];
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

/**
 * Update a node in the tree using an updater function
 */
export const updateNodeInTree = (
  tree: ComponentNode[],
  id: string,
  updater: (node: ComponentNode) => ComponentNode
): ComponentNode[] => {
  return tree.map(node => {
    if (node.id === id) {
      return updater(node);
    }
    if (node.children) {
      return { ...node, children: updateNodeInTree(node.children, id, updater) };
    }
    return node;
  });
};

/**
 * Update multiple nodes in the tree
 */
export const updateMultipleNodesInTree = (
  tree: ComponentNode[],
  ids: string[],
  updater: (node: ComponentNode) => ComponentNode
): ComponentNode[] => {
  const idsSet = new Set(ids);
  return tree.map(node => {
    if (idsSet.has(node.id)) {
      return updater(node);
    }
    if (node.children) {
      return { ...node, children: updateMultipleNodesInTree(node.children, ids, updater) };
    }
    return node;
  });
};

/**
 * Insert a node into the tree
 */
export const insertNodeInTree = (
  tree: ComponentNode[],
  node: ComponentNode,
  parentId?: string,
  index?: number
): ComponentNode[] => {
  // Default to root VStack if no parentId specified
  // This ensures all components are children of root, never siblings
  const effectiveParentId = parentId || ROOT_VSTACK_ID;

  // Add to specific parent
  return tree.map(n => {
    if (n.id === effectiveParentId) {
      const updatedChildren = [...(n.children || [])];
      if (index !== undefined) {
        updatedChildren.splice(index, 0, node);
      } else {
        updatedChildren.push(node);
      }
      return { ...n, children: updatedChildren };
    }
    if (n.children) {
      return { ...n, children: insertNodeInTree(n.children, node, effectiveParentId, index) };
    }
    return n;
  });
};

/**
 * Remove a node from the tree
 */
export const removeNodeFromTree = (tree: ComponentNode[], id: string): ComponentNode[] => {
  if (id === ROOT_VSTACK_ID) return tree; // Prevent deletion of root

  return tree
    .filter(node => node.id !== id)
    .map(node => {
      if (node.children) {
        return { ...node, children: removeNodeFromTree(node.children, id) };
      }
      return node;
    });
};

/**
 * Deep clone a node with new IDs
 */
export const deepCloneNode = (node: ComponentNode): ComponentNode => {
  return {
    ...node,
    id: generateId(),
    children: node.children?.map(deepCloneNode),
  };
};

/**
 * Duplicate a node in the tree
 */
export const duplicateNodeInTree = (tree: ComponentNode[], id: string): { tree: ComponentNode[]; newNodeId: string | null } => {
  let newNodeId: string | null = null;

  const duplicate = (nodes: ComponentNode[]): ComponentNode[] => {
    const result: ComponentNode[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Add the current node
      result.push(node);

      // If this is the node to duplicate, add the clone right after it
      if (node.id === id) {
        const cloned = deepCloneNode(node);
        newNodeId = cloned.id;
        result.push(cloned);
      } else if (node.children) {
        // Recursively process children for other nodes
        const processedChildren = duplicate(node.children);
        // Only update if children changed (found the node to duplicate)
        if (processedChildren !== node.children) {
          result[result.length - 1] = { ...node, children: processedChildren };
        }
      }
    }

    return result;
  };

  const newTree = duplicate(tree);
  return { tree: newTree, newNodeId };
};

/**
 * Move a node up or down in its parent
 */
export const moveNodeInTree = (tree: ComponentNode[], id: string, direction: 'up' | 'down'): ComponentNode[] => {
  const move = (nodes: ComponentNode[]): ComponentNode[] => {
    const index = nodes.findIndex(n => n.id === id);
    if (index !== -1) {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < nodes.length) {
        const newNodes = [...nodes];
        [newNodes[index], newNodes[newIndex]] = [newNodes[newIndex], newNodes[index]];
        return newNodes;
      }
      return nodes;
    }

    return nodes.map(node => {
      if (node.children) {
        return { ...node, children: move(node.children) };
      }
      return node;
    });
  };

  return move(tree);
};

/**
 * Check if a node is a descendant of another node
 */
const isDescendant = (tree: ComponentNode[], ancestorId: string, descendantId: string): boolean => {
  const ancestor = findNodeById(tree, ancestorId);
  if (!ancestor || !ancestor.children) return false;

  const check = (nodes: ComponentNode[]): boolean => {
    for (const node of nodes) {
      if (node.id === descendantId) return true;
      if (node.children && check(node.children)) return true;
    }
    return false;
  };

  return check(ancestor.children);
};

/**
 * Reorder a node in the tree (drag and drop)
 */
export const reorderNodeInTree = (
  tree: ComponentNode[],
  activeId: string,
  overId: string,
  position?: 'before' | 'after' | 'inside'
): ComponentNode[] => {
  // Don't allow dropping onto self
  if (activeId === overId) return tree;

  // Don't allow dropping into own descendants
  if (position === 'inside' && isDescendant(tree, activeId, overId)) {
    console.warn('Cannot drop a node into its own descendant');
    return tree;
  }

  // For 'before' and 'after' positions, validate that items share the same parent
  // This prevents cross-container reordering
  if (position === 'before' || position === 'after') {
    const activeParent = findParent(tree, activeId);
    const overParent = findParent(tree, overId);

    // Both must have parents and they must be the same
    if (!activeParent || !overParent || activeParent.id !== overParent.id) {
      console.warn('Cannot reorder items from different parent containers:', {
        activeId,
        activeParent: activeParent?.id,
        overId,
        overParent: overParent?.id,
      });
      return tree;
    }
  }

  // Find and remove the active node
  const activeNode = findNodeById(tree, activeId);
  if (!activeNode) return tree;

  const treeWithoutActive = removeNodeFromTree(tree, activeId);

  // Find the over node and insert the active node
  const insertNode = (nodes: ComponentNode[]): ComponentNode[] => {
    // Check if overId is at this level
    const overIndex = nodes.findIndex(n => n.id === overId);

    if (overIndex !== -1) {
      // Found it at this level - perform the insertion
      const newNodes = [...nodes];
      if (position === 'before') {
        newNodes.splice(overIndex, 0, activeNode);
      } else if (position === 'after') {
        newNodes.splice(overIndex + 1, 0, activeNode);
      } else if (position === 'inside') {
        const overNode = newNodes[overIndex];
        newNodes[overIndex] = {
          ...overNode,
          children: [...(overNode.children || []), activeNode],
        };
      }
      return newNodes;
    }

    // Not found at this level - recursively search children
    return nodes.map(node => {
      if (node.children && node.children.length > 0) {
        const updatedChildren = insertNode(node.children);
        // Only update if children actually changed
        if (updatedChildren !== node.children) {
          return { ...node, children: updatedChildren };
        }
      }
      return node;
    });
  };

  const newTree = insertNode(treeWithoutActive);

  // If insertion failed (tree is unchanged), restore original tree
  if (JSON.stringify(newTree) === JSON.stringify(treeWithoutActive)) {
    console.warn('Failed to insert node, restoring original tree');
    return tree;
  }

  return newTree;
};

/**
 * Flatten tree to get all nodes in order
 */
export const flattenTree = (tree: ComponentNode[]): ComponentNode[] => {
  const result: ComponentNode[] = [];
  const traverse = (nodes: ComponentNode[]) => {
    for (const node of nodes) {
      result.push(node);
      if (node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(tree);
  return result;
};

/**
 * Update the tree for a specific page
 */
export const updateTreeForPage = (pages: Page[], pageId: string, newTree: ComponentNode[]): Page[] => {
  return pages.map(page =>
    page.id === pageId ? { ...page, tree: newTree } : page
  );
};

/**
 * Find the topmost container starting from a node (Figma-style selection)
 * Walks up the tree to find the highest "selectable" container before root
 * Returns the TOPMOST container found, not the immediate parent
 */
export const findTopMostContainer = (
  tree: ComponentNode[],
  nodeId: string,
  componentRegistry: Record<string, { acceptsChildren?: boolean }>
): ComponentNode | null => {
  const node = findNodeById(tree, nodeId);
  console.log('[findTopMostContainer] Starting from node:', node ? { id: node.id, type: node.type } : null);

  if (!node) return null;

  // If clicking root, select it
  if (node.id === ROOT_VSTACK_ID) {
    console.log('[findTopMostContainer] Node is root, returning root');
    return node;
  }

  // Walk up to find the TOPMOST container (keep walking until we hit root)
  let current: ComponentNode | null = node;
  let topContainer: ComponentNode | null = null;

  while (current) {
    const definition = componentRegistry[current.type];

    // Skip internal structure containers (CardHeader, CardBody, PanelBody, PanelRow)
    const isStructureContainer = [
      'CardHeader',
      'CardBody',
      'PanelBody',
      'PanelRow',
    ].includes(current.type);

    console.log('[findTopMostContainer] Checking node:', {
      id: current.id,
      type: current.type,
      acceptsChildren: definition?.acceptsChildren,
      isStructureContainer,
    });

    // If this is a container and not a structure container, it's a candidate
    // Keep updating topContainer as we walk up (last one wins)
    if (definition?.acceptsChildren && !isStructureContainer) {
      console.log('[findTopMostContainer] Found container:', { id: current.id, type: current.type });
      topContainer = current;
    }

    // Stop at root boundary
    const parent = findParent(tree, current.id);
    console.log('[findTopMostContainer] Parent:', parent ? { id: parent.id, type: parent.type } : null);

    if (!parent || parent.id === ROOT_VSTACK_ID) {
      console.log('[findTopMostContainer] Reached root boundary');
      break;
    }

    current = parent;
  }

  // Return the topmost container found, or the node itself if none found
  const result = topContainer || node;
  console.log('[findTopMostContainer] Returning topmost container:', { id: result.id, type: result.type });
  return result;
};

/**
 * Find the path from start node to target node (for drill-down)
 * Returns array of nodes from start to target, empty if no path exists
 */
export const findPathBetweenNodes = (
  tree: ComponentNode[],
  startId: string,
  targetId: string
): ComponentNode[] => {
  // If start and target are the same, return just that node
  if (startId === targetId) {
    const node = findNodeById(tree, targetId);
    return node ? [node] : [];
  }

  const startNode = findNodeById(tree, startId);
  if (!startNode) return [];

  // Check if target is a descendant of start
  const path: ComponentNode[] = [startNode];

  const findInChildren = (node: ComponentNode): boolean => {
    if (node.id === targetId) {
      return true;
    }

    if (node.children) {
      for (const child of node.children) {
        path.push(child);
        if (findInChildren(child)) {
          return true;
        }
        path.pop();
      }
    }

    return false;
  };

  const found = findInChildren(startNode);
  return found ? path : [];
};
