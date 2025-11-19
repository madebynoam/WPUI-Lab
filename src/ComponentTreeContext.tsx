import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ComponentNode, Page } from './types';

const STORAGE_KEY = 'wp-designer-pages';

interface ComponentTreeContextType {
  // Current page's tree
  tree: ComponentNode[];
  selectedNodeId: string | null;
  setTree: (tree: ComponentNode[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  addComponent: (componentType: string, parentId?: string) => void;
  removeComponent: (id: string) => void;
  updateComponentProps: (id: string, props: Record<string, any>) => void;
  updateComponentName: (id: string, name: string) => void;
  duplicateComponent: (id: string) => void;
  moveComponent: (id: string, direction: 'up' | 'down') => void;
  reorderComponent: (activeId: string, overId: string, position?: 'before' | 'after' | 'inside') => void;
  resetTree: () => void;
  getNodeById: (id: string) => ComponentNode | null;
  gridLinesVisible: Set<string>;
  toggleGridLines: (id: string) => void;

  // Pages management
  pages: Page[];
  currentPageId: string;
  setCurrentPage: (pageId: string) => void;
  addPage: (name?: string) => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  duplicatePage: (pageId: string) => void;
}

const ComponentTreeContext = createContext<ComponentTreeContextType | undefined>(undefined);

const ROOT_VSTACK_ID = 'root-vstack';

const createInitialPage = (id: string, name: string): Page => ({
  id,
  name,
  tree: [{
    id: ROOT_VSTACK_ID,
    type: 'VStack',
    props: { spacing: 4 },
    children: [{
      id: `grid-${Date.now()}`,
      type: 'Grid',
      props: { columns: 12, gap: 4 },
      children: [],
    }],
  }],
});

export const ComponentTreeProvider = ({ children }: { children: ReactNode }) => {
  const [pages, setPagesState] = useState<Page[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Check if it's the new pages format
        if (Array.isArray(data.pages) && data.pages.length > 0) {
          return data.pages;
        }
      } catch (e) {
        console.error('Failed to parse saved pages:', e);
      }
    }

    // Try to migrate from old storage key
    const oldSaved = localStorage.getItem('wp-designer-tree');
    if (oldSaved) {
      try {
        const oldTree = JSON.parse(oldSaved);
        if (Array.isArray(oldTree) && oldTree.length > 0) {
          // Check if tree already has root VStack
          if (oldTree[0].id === ROOT_VSTACK_ID) {
            return [{
              id: 'page-1',
              name: 'Page 1',
              tree: oldTree,
            }];
          } else {
            // Wrap existing components in root VStack
            return [{
              id: 'page-1',
              name: 'Page 1',
              tree: [{
                id: ROOT_VSTACK_ID,
                type: 'VStack',
                props: { spacing: 4 },
                children: oldTree,
              }],
            }];
          }
        }
      } catch (e) {
        console.error('Failed to migrate old tree:', e);
      }
    }

    // Initialize with one default page
    return [createInitialPage('page-1', 'Page 1')];
  });

  const [currentPageId, setCurrentPageId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.currentPageId) {
          return data.currentPageId;
        }
      } catch (e) {}
    }
    return 'page-1';
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(ROOT_VSTACK_ID);
  const [gridLinesVisible, setGridLinesVisible] = useState<Set<string>>(new Set());

  // Get current page's tree
  const currentPage = pages.find(p => p.id === currentPageId) || pages[0];
  let tree = currentPage?.tree || [];

  // Ensure every page has a root VStack
  if (tree.length === 0 || tree[0].id !== ROOT_VSTACK_ID) {
    console.warn('Page missing root VStack, fixing...');
    const fixedTree = [{
      id: ROOT_VSTACK_ID,
      type: 'VStack',
      props: { spacing: 4 },
      children: tree.length > 0 ? tree : [],
    }];
    // Update the page with the fixed tree
    setPagesState(pages.map(page =>
      page.id === currentPageId ? { ...page, tree: fixedTree } : page
    ));
    tree = fixedTree;
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, currentPageId }));
  }, [pages, currentPageId]);

  const setTree = (newTree: ComponentNode[]) => {
    setPagesState(pages.map(page =>
      page.id === currentPageId ? { ...page, tree: newTree } : page
    ));
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
    // Prevent deletion of root VStack
    if (id === ROOT_VSTACK_ID) return;

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
      setSelectedNodeId(ROOT_VSTACK_ID);
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

  const updateComponentName = (id: string, name: string) => {
    const updateNode = (nodes: ComponentNode[]): ComponentNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, name: name || undefined };
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
    // Reset to a single clean default page
    const defaultPage = createInitialPage('page-1', 'Page 1');
    setPagesState([defaultPage]);
    setCurrentPageId(defaultPage.id);
    setSelectedNodeId(ROOT_VSTACK_ID);
    setGridLinesVisible(new Set());
    localStorage.removeItem(STORAGE_KEY);
  };

  const toggleGridLines = (id: string) => {
    setGridLinesVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Page management functions
  const setCurrentPage = (pageId: string) => {
    setCurrentPageId(pageId);
    setSelectedNodeId(ROOT_VSTACK_ID);
    setGridLinesVisible(new Set());
  };

  const addPage = (name?: string) => {
    const newPageNumber = pages.length + 1;
    const newPage = createInitialPage(
      `page-${Date.now()}`,
      name || `Page ${newPageNumber}`
    );
    setPagesState([...pages, newPage]);
    setCurrentPageId(newPage.id);
    setSelectedNodeId(ROOT_VSTACK_ID);
  };

  const deletePage = (pageId: string) => {
    // Don't allow deleting the last page
    if (pages.length === 1) return;

    const newPages = pages.filter(p => p.id !== pageId);
    setPagesState(newPages);

    // If deleting current page, switch to first page
    if (pageId === currentPageId) {
      setCurrentPageId(newPages[0].id);
      setSelectedNodeId(ROOT_VSTACK_ID);
    }
  };

  const renamePage = (pageId: string, name: string) => {
    setPagesState(pages.map(page =>
      page.id === pageId ? { ...page, name } : page
    ));
  };

  const duplicatePage = (pageId: string) => {
    const pageToDuplicate = pages.find(p => p.id === pageId);
    if (!pageToDuplicate) return;

    // Deep clone the tree with new IDs
    const deepCloneTree = (node: ComponentNode): ComponentNode => ({
      ...node,
      id: node.id === ROOT_VSTACK_ID ? ROOT_VSTACK_ID : generateId(),
      children: node.children?.map(deepCloneTree),
    });

    const clonedTree = pageToDuplicate.tree.map(deepCloneTree);

    // Create new page with cloned tree
    const newPage: Page = {
      id: `page-${Date.now()}`,
      name: `${pageToDuplicate.name} Copy`,
      tree: clonedTree,
    };

    setPagesState([...pages, newPage]);
    setCurrentPageId(newPage.id);
    setSelectedNodeId(ROOT_VSTACK_ID);
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
        updateComponentName,
        duplicateComponent,
        moveComponent,
        reorderComponent,
        resetTree,
        getNodeById: (id) => getNodeById(id),
        gridLinesVisible,
        toggleGridLines,
        pages,
        currentPageId,
        setCurrentPage,
        addPage,
        deletePage,
        renamePage,
        duplicatePage,
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

export { ROOT_VSTACK_ID };
