import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ComponentNode } from './types';

const STORAGE_KEY = 'wp-designer-tree';

interface ComponentTreeContextType {
  tree: ComponentNode[];
  selectedNodeId: string | null;
  setTree: (tree: ComponentNode[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  addComponent: (componentType: string, parentId?: string) => void;
  removeComponent: (id: string) => void;
  updateComponentProps: (id: string, props: Record<string, any>) => void;
  duplicateComponent: (id: string) => void;
  moveComponent: (id: string, direction: 'up' | 'down') => void;
  reorderComponent: (activeId: string, overId: string) => void;
  resetTree: () => void;
  getNodeById: (id: string) => ComponentNode | null;
}

const ComponentTreeContext = createContext<ComponentTreeContextType | undefined>(undefined);

export const ComponentTreeProvider = ({ children }: { children: ReactNode }) => {
  const [tree, setTreeState] = useState<ComponentNode[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  }, [tree]);

  const setTree = (newTree: ComponentNode[]) => {
    setTreeState(newTree);
  };

  const generateId = () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getNodeById = (id: string, nodes: ComponentNode[] = tree): ComponentNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = getNodeById(id, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const addComponent = (componentType: string, parentId?: string) => {
    const newNode: ComponentNode = {
      id: generateId(),
      type: componentType,
      props: {},
      children: [],
    };

    if (!parentId) {
      setTree([...tree, newNode]);
    } else {
      const addToParent = (nodes: ComponentNode[]): ComponentNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            return {
              ...node,
              children: [...(node.children || []), newNode],
            };
          }
          if (node.children) {
            return {
              ...node,
              children: addToParent(node.children),
            };
          }
          return node;
        });
      };
      setTree(addToParent(tree));
    }
    setSelectedNodeId(newNode.id);
  };

  const removeComponent = (id: string) => {
    const removeFromTree = (nodes: ComponentNode[]): ComponentNode[] => {
      return nodes.filter(node => {
        if (node.id === id) return false;
        if (node.children) {
          node.children = removeFromTree(node.children);
        }
        return true;
      });
    };
    setTree(removeFromTree(tree));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  const updateComponentProps = (id: string, props: Record<string, any>) => {
    const updateNode = (nodes: ComponentNode[]): ComponentNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, props: { ...node.props, ...props } };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setTree(updateNode(tree));
  };

  const duplicateComponent = (id: string) => {
    const deepClone = (node: ComponentNode): ComponentNode => ({
      ...node,
      id: generateId(),
      children: node.children?.map(deepClone),
    });

    const duplicate = (nodes: ComponentNode[], parentArray: ComponentNode[]): ComponentNode[] => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          const cloned = deepClone(nodes[i]);
          parentArray.splice(i + 1, 0, cloned);
          setSelectedNodeId(cloned.id);
          return parentArray;
        }
        if (nodes[i].children) {
          nodes[i].children = duplicate(nodes[i].children!, nodes[i].children!);
        }
      }
      return parentArray;
    };

    setTree([...duplicate(tree, [...tree])]);
  };

  const moveComponent = (id: string, direction: 'up' | 'down') => {
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
      return nodes.map(node => ({
        ...node,
        children: node.children ? move(node.children) : node.children,
      }));
    };
    setTree(move(tree));
  };

  const reorderComponent = (
    activeId: string,
    overId: string,
    position?: 'before' | 'after' | 'inside'
  ) => {
    if (activeId === overId && position !== 'inside') return;

    const findNodeAndParent = (
      nodes: ComponentNode[],
      id: string,
      parentId: string | null = null
    ): { node: ComponentNode; parentId: string | null; parentArray: ComponentNode[]; index: number } | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          return { node: nodes[i], parentId, parentArray: nodes, index: i };
        }
        if (nodes[i].children) {
          const found = findNodeAndParent(nodes[i].children!, id, nodes[i].id);
          if (found) return found;
        }
      }
      return null;
    };

    const activeInfo = findNodeAndParent(tree, activeId);
    const overInfo = findNodeAndParent(tree, overId);

    if (!activeInfo || !overInfo) return;

    // Prevent dropping a parent into its own child
    const isDescendant = (parentId: string, childId: string): boolean => {
      const node = getNodeById(parentId);
      if (!node || !node.children) return false;
      for (const child of node.children) {
        if (child.id === childId || isDescendant(child.id, childId)) return true;
      }
      return false;
    };

    if (isDescendant(activeId, overId)) return;

    // Clone the tree for manipulation
    let newTree = JSON.parse(JSON.stringify(tree)) as ComponentNode[];

    // Remove the active node from its current position
    const removeNode = (nodes: ComponentNode[], id: string): ComponentNode | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          return nodes.splice(i, 1)[0];
        }
        if (nodes[i].children) {
          const removed = removeNode(nodes[i].children!, id);
          if (removed) return removed;
        }
      }
      return null;
    };

    const movedNode = removeNode(newTree, activeId);
    if (!movedNode) return;

    // Insert the node at the new position
    const insertNode = (nodes: ComponentNode[], targetId: string, node: ComponentNode, pos: 'before' | 'after' | 'inside'): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === targetId) {
          if (pos === 'inside') {
            if (!nodes[i].children) nodes[i].children = [];
            nodes[i].children!.push(node);
          } else if (pos === 'before') {
            nodes.splice(i, 0, node);
          } else {
            nodes.splice(i + 1, 0, node);
          }
          return true;
        }
        if (nodes[i].children) {
          if (insertNode(nodes[i].children!, targetId, node, pos)) return true;
        }
      }
      return false;
    };

    const actualPosition = position || 'after';
    insertNode(newTree, overId, movedNode, actualPosition);

    setTree(newTree);
  };

  const resetTree = () => {
    setTree([]);
    setSelectedNodeId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ComponentTreeContext.Provider
      value={{
        tree,
        selectedNodeId,
        setTree,
        setSelectedNodeId,
        addComponent,
        removeComponent,
        updateComponentProps,
        duplicateComponent,
        moveComponent,
        reorderComponent,
        resetTree,
        getNodeById: (id) => getNodeById(id),
      }}
    >
      {children}
    </ComponentTreeContext.Provider>
  );
};

export const useComponentTree = () => {
  const context = useContext(ComponentTreeContext);
  if (!context) {
    throw new Error('useComponentTree must be used within ComponentTreeProvider');
  }
  return context;
};
