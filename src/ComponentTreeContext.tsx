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

  const reorderComponent = (activeId: string, overId: string) => {
    if (activeId === overId) return;

    const findNodeAndParent = (
      nodes: ComponentNode[],
      id: string,
      parent: ComponentNode[] | null = null
    ): { node: ComponentNode; parent: ComponentNode[] | null; index: number } | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          return { node: nodes[i], parent, index: i };
        }
        if (nodes[i].children) {
          const found = findNodeAndParent(nodes[i].children!, id, nodes[i].children!);
          if (found) return found;
        }
      }
      return null;
    };

    const activeInfo = findNodeAndParent(tree, activeId, tree);
    const overInfo = findNodeAndParent(tree, overId, tree);

    if (!activeInfo || !overInfo) return;

    // Only allow reordering within the same parent
    if (activeInfo.parent !== overInfo.parent) return;

    const parentArray = activeInfo.parent || tree;
    const newParentArray = [...parentArray];

    // Remove active item
    const [removed] = newParentArray.splice(activeInfo.index, 1);

    // Find new index for over item (may have changed after removal)
    const newOverIndex = newParentArray.findIndex((n) => n.id === overId);

    // Insert at new position
    newParentArray.splice(newOverIndex, 0, removed);

    // Update the tree
    if (activeInfo.parent === null) {
      setTree(newParentArray);
    } else {
      const updateTree = (nodes: ComponentNode[]): ComponentNode[] => {
        return nodes.map((node) => {
          if (node.children === activeInfo.parent) {
            return { ...node, children: newParentArray };
          }
          if (node.children) {
            return { ...node, children: updateTree(node.children) };
          }
          return node;
        });
      };
      setTree(updateTree(tree));
    }
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
