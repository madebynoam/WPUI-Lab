import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ComponentNode } from './types';

interface ComponentTreeContextType {
  tree: ComponentNode[];
  selectedNodeId: string | null;
  setTree: (tree: ComponentNode[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  addComponent: (componentType: string, parentId?: string) => void;
  removeComponent: (id: string) => void;
  updateComponentProps: (id: string, props: Record<string, any>) => void;
  getNodeById: (id: string) => ComponentNode | null;
}

const ComponentTreeContext = createContext<ComponentTreeContextType | undefined>(undefined);

export const ComponentTreeProvider = ({ children }: { children: ReactNode }) => {
  const [tree, setTree] = useState<ComponentNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
