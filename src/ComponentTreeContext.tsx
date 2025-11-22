import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { ComponentNode, Page, HistoryState, Interaction } from './types';
import { componentRegistry } from './componentRegistry';

const STORAGE_KEY = 'wp-designer-pages';

interface ComponentTreeContextType {
  // Current page's tree
  tree: ComponentNode[];
  selectedNodeIds: string[];
  setTree: (tree: ComponentNode[]) => void;
  setSelectedNodeIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  toggleNodeSelection: (id: string, multiSelect?: boolean, rangeSelect?: boolean, allNodes?: ComponentNode[]) => void;
  addComponent: (componentType: string, parentId?: string) => void;
  removeComponent: (id: string) => void;
  updateComponentProps: (id: string, props: Record<string, any>) => void;
  updateMultipleComponentProps: (ids: string[], props: Record<string, any>) => void;
  updateComponentName: (id: string, name: string) => void;
  duplicateComponent: (id: string) => void;
  moveComponent: (id: string, direction: 'up' | 'down') => void;
  reorderComponent: (activeId: string, overId: string, position?: 'before' | 'after' | 'inside') => void;
  resetTree: () => void;
  getNodeById: (id: string) => ComponentNode | null;
  getParentById: (id: string) => ComponentNode | null;
  gridLinesVisible: Set<string>;
  toggleGridLines: (id: string) => void;

  // Copy/Paste management
  clipboard: ComponentNode | null;
  copyComponent: (id: string) => void;
  pasteComponent: (parentId?: string) => void;
  canPaste: boolean;

  // Pages management
  pages: Page[];
  currentPageId: string;
  setCurrentPage: (pageId: string) => void;
  addPage: (name?: string) => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  duplicatePage: (pageId: string) => void;
  updatePageTheme: (pageId: string, theme: { primaryColor?: string; backgroundColor?: string }) => void;

  // History management
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Play mode
  isPlayMode: boolean;
  setPlayMode: (isPlay: boolean) => void;

  // Interactions
  addInteraction: (nodeId: string, interaction: Omit<Interaction, 'id'>) => void;
  removeInteraction: (nodeId: string, interactionId: string) => void;
  updateInteraction: (nodeId: string, interactionId: string, interaction: Omit<Interaction, 'id'>) => void;
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
  theme: {
    primaryColor: '#3858e9',
    backgroundColor: '#ffffff',
  },
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

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([ROOT_VSTACK_ID]);
  const [gridLinesVisible, setGridLinesVisible] = useState<Set<string>>(new Set());
  const [isPlayMode, setPlayMode] = useState<boolean>(false);

  // Copy/Paste management
  const [clipboard, setClipboard] = useState<ComponentNode | null>(null);

  // History management
  const MAX_HISTORY_SIZE = 50;
  const isRestoring = useRef(false);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [history, setHistory] = useState<{
    past: HistoryState[];
    present: HistoryState;
    future: HistoryState[];
  }>(() => ({
    past: [],
    present: { pages, currentPageId },
    future: [],
  }));

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

  // History management functions
  const saveToHistory = useCallback((newState: HistoryState) => {
    if (isRestoring.current) return;

    setHistory(prev => {
      let newPast = [...prev.past, prev.present];

      // Limit history size
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast = newPast.slice(newPast.length - MAX_HISTORY_SIZE);
      }

      return {
        past: newPast,
        present: newState,
        future: [], // Clear future on new action
      };
    });
  }, [MAX_HISTORY_SIZE]);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);

      isRestoring.current = true;
      setPagesState(previous.pages);
      setCurrentPageId(previous.currentPageId);
      setSelectedNodeIds([ROOT_VSTACK_ID]);
      setGridLinesVisible(new Set());
      isRestoring.current = false;

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      isRestoring.current = true;
      setPagesState(next.pages);
      setCurrentPageId(next.currentPageId);
      setSelectedNodeIds([ROOT_VSTACK_ID]);
      setGridLinesVisible(new Set());
      isRestoring.current = false;

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory({
      past: [],
      present: { pages, currentPageId },
      future: [],
    });
  }, [pages, currentPageId]);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Wrapper functions with history tracking
  const setPagesWithHistory = useCallback((newPages: Page[] | ((prev: Page[]) => Page[]), operationType: string = 'unknown') => {
    if (isRestoring.current) {
      setPagesState(newPages);
      return;
    }

    // Compute the actual new pages value
    const actualNewPages = typeof newPages === 'function' ? newPages(pages) : newPages;

    // Create the new state to save
    const newState: HistoryState = {
      pages: JSON.parse(JSON.stringify(actualNewPages)),
      currentPageId,
    };

    // Debounced operations
    const debouncedOps = ['updateComponentProps', 'updateComponentName', 'renamePage'];
    if (debouncedOps.includes(operationType)) {
      // Clear existing timer
      const existingTimer = debounceTimers.current.get(operationType);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer - capture the state now to save it later
      const stateToSave = newState;
      const timer = setTimeout(() => {
        saveToHistory(stateToSave);
        debounceTimers.current.delete(operationType);
      }, 500);

      debounceTimers.current.set(operationType, timer);
    } else {
      // Immediate save for structural changes
      saveToHistory(newState);
    }

    setPagesState(actualNewPages);
  }, [saveToHistory, pages, currentPageId]);

  const setCurrentPageIdWithHistory = useCallback((pageId: string) => {
    if (isRestoring.current) {
      setCurrentPageId(pageId);
      return;
    }

    // Create the new state to save
    const newState: HistoryState = {
      pages: JSON.parse(JSON.stringify(pages)),
      currentPageId: pageId,
    };

    saveToHistory(newState);
    setCurrentPageId(pageId);
  }, [saveToHistory, pages]);

  const setTree = (newTree: ComponentNode[]) => {
    setPagesWithHistory(pages.map(page =>
      page.id === currentPageId ? { ...page, tree: newTree } : page
    ), 'setTree');
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

  const getParentById = (id: string, nodes: ComponentNode[] = tree): ComponentNode | null => {
    for (const node of nodes) {
      if (node.children?.some(child => child.id === id)) return node;
      if (node.children) {
        const found = getParentById(id, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleNodeSelection = useCallback((id: string, multiSelect: boolean = false, rangeSelect: boolean = false, allNodes: ComponentNode[] = tree) => {
    setSelectedNodeIds(prev => {
      if (rangeSelect && prev.length > 0) {
        // Range selection: select all nodes between last selected and clicked node
        const flatNodes: ComponentNode[] = [];
        const flatten = (nodes: ComponentNode[]) => {
          nodes.forEach(node => {
            flatNodes.push(node);
            if (node.children) {
              flatten(node.children);
            }
          });
        };
        flatten(allNodes);

        const lastSelectedIndex = flatNodes.findIndex(n => n.id === prev[prev.length - 1]);
        const clickedIndex = flatNodes.findIndex(n => n.id === id);

        if (lastSelectedIndex !== -1 && clickedIndex !== -1) {
          const start = Math.min(lastSelectedIndex, clickedIndex);
          const end = Math.max(lastSelectedIndex, clickedIndex);
          const rangeIds = flatNodes.slice(start, end + 1).map(n => n.id);
          // Combine with existing selection, removing duplicates
          const combined = [...new Set([...prev, ...rangeIds])];
          return combined;
        }
        // Fallback to regular multi-select if range can't be determined
        return prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id];
      } else if (multiSelect) {
        // Toggle: if already selected, remove it; otherwise add it
        if (prev.includes(id)) {
          const filtered = prev.filter(selectedId => selectedId !== id);
          // Always keep at least one selected (prefer ROOT_VSTACK_ID)
          return filtered.length > 0 ? filtered : [ROOT_VSTACK_ID];
        } else {
          return [...prev, id];
        }
      } else {
        // Single select: replace selection
        return [id];
      }
    });
  }, [tree]);

  const addComponent = (componentType: string, parentId?: string) => {
    // Get default props from component registry
    const componentDef = componentRegistry[componentType];
    const defaultProps = componentDef?.defaultProps || {};

    // Set default gridColumnSpan for all new components
    const props: Record<string, any> = {
      ...defaultProps,
      gridColumnSpan: 12,
    };

    // Set default dataSource for DataViews to 'blog'
    if (componentType === 'DataViews') {
      props.dataSource = 'blog';
    }

    const newNode: ComponentNode = {
      id: generateId(),
      type: componentType,
      props,
      children: [],
    };

    // Add CardBody as default child for Card component
    if (componentType === 'Card') {
      const cardBodyNode: ComponentNode = {
        id: generateId(),
        type: 'CardBody',
        props: {},
        children: [],
      };
      newNode.children = [cardBodyNode];
    }

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
    setSelectedNodeIds([newNode.id]);
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
    setSelectedNodeIds(prev => {
      const filtered = prev.filter(selectedId => selectedId !== id);
      return filtered.length > 0 ? filtered : [ROOT_VSTACK_ID];
    });
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

  const updateMultipleComponentProps = (ids: string[], props: Record<string, any>) => {
    const idsSet = new Set(ids);
    const updateNode = (nodes: ComponentNode[]): ComponentNode[] => {
      return nodes.map(node => {
        if (idsSet.has(node.id)) {
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
          setSelectedNodeIds([cloned.id]);
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

  const deepClone = (node: ComponentNode): ComponentNode => ({
    ...node,
    id: generateId(),
    children: node.children?.map(deepClone),
  });

  const copyComponent = (id: string) => {
    const node = getNodeById(id);
    if (node) {
      setClipboard(deepClone(node));
    }
  };

  const pasteComponent = (parentId?: string) => {
    if (!clipboard) return;

    const targetParentId = parentId || selectedNodeIds[0] || ROOT_VSTACK_ID;
    const targetNode = getNodeById(targetParentId);

    // If target is not a container, find its parent
    let actualParentId = targetParentId;
    if (targetNode && !componentRegistry[targetNode.type]?.acceptsChildren && targetParentId !== ROOT_VSTACK_ID) {
      const parent = getParentById(targetParentId);
      if (parent) {
        actualParentId = parent.id;
      }
    }

    // Clone the clipboard content
    const cloned = deepClone(clipboard);

    // Insert into parent
    const insertIntoParent = (nodes: ComponentNode[]): ComponentNode[] => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === actualParentId) {
          if (!nodes[i].children) {
            nodes[i].children = [];
          }
          nodes[i].children!.push(cloned);
          setSelectedNodeIds([cloned.id]);
          return nodes;
        }
        if (nodes[i].children) {
          nodes[i].children = insertIntoParent(nodes[i].children);
        }
      }
      return nodes;
    };

    setTree([...insertIntoParent([...tree])]);
  };

  const resetTree = () => {
    // Reset to a single clean default page
    const defaultPage = createInitialPage('page-1', 'Page 1');
    setPagesWithHistory([defaultPage], 'resetTree');
    setCurrentPageIdWithHistory(defaultPage.id);
    setSelectedNodeIds([ROOT_VSTACK_ID]);
    setGridLinesVisible(new Set());
    localStorage.removeItem(STORAGE_KEY);
    clearHistory();
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

  // Interaction management functions
  const addInteraction = (nodeId: string, interaction: Omit<Interaction, 'id'>) => {
    const newInteraction: Interaction = {
      id: `interaction-${Date.now()}`,
      ...interaction,
    };

    const updateNode = (node: ComponentNode): ComponentNode => {
      if (node.id === nodeId) {
        return {
          ...node,
          interactions: [...(node.interactions || []), newInteraction],
        };
      }
      return {
        ...node,
        children: node.children?.map(updateNode),
      };
    };

    setTree(tree.map(updateNode));
  };

  const removeInteraction = (nodeId: string, interactionId: string) => {
    const updateNode = (node: ComponentNode): ComponentNode => {
      if (node.id === nodeId) {
        return {
          ...node,
          interactions: (node.interactions || []).filter(i => i.id !== interactionId),
        };
      }
      return {
        ...node,
        children: node.children?.map(updateNode),
      };
    };

    setTree(tree.map(updateNode));
  };

  const updateInteraction = (nodeId: string, interactionId: string, interaction: Omit<Interaction, 'id'>) => {
    const updateNode = (node: ComponentNode): ComponentNode => {
      if (node.id === nodeId) {
        return {
          ...node,
          interactions: (node.interactions || []).map(i =>
            i.id === interactionId ? { ...i, ...interaction } : i
          ),
        };
      }
      return {
        ...node,
        children: node.children?.map(updateNode),
      };
    };

    setTree(tree.map(updateNode));
  };

  // Page management functions
  const setCurrentPage = (pageId: string) => {
    setCurrentPageIdWithHistory(pageId);
    setSelectedNodeIds([ROOT_VSTACK_ID]);
    setGridLinesVisible(new Set());
  };

  const addPage = (name?: string) => {
    const newPageNumber = pages.length + 1;
    const newPage = createInitialPage(
      `page-${Date.now()}`,
      name || `Page ${newPageNumber}`
    );
    setPagesWithHistory([...pages, newPage], 'addPage');
    setCurrentPageIdWithHistory(newPage.id);
    setSelectedNodeIds([ROOT_VSTACK_ID]);
    setGridLinesVisible(new Set());
  };

  const deletePage = (pageId: string) => {
    // Don't allow deleting the last page
    if (pages.length === 1) return;

    const newPages = pages.filter(p => p.id !== pageId);
    setPagesWithHistory(newPages, 'deletePage');

    // If deleting current page, switch to first page
    if (pageId === currentPageId) {
      setCurrentPageIdWithHistory(newPages[0].id);
      setSelectedNodeIds([ROOT_VSTACK_ID]);
    }
  };

  const renamePage = (pageId: string, name: string) => {
    setPagesWithHistory(pages.map(page =>
      page.id === pageId ? { ...page, name } : page
    ), 'renamePage');
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
      theme: pageToDuplicate.theme,
    };

    setPagesWithHistory([...pages, newPage], 'duplicatePage');
    setCurrentPageIdWithHistory(newPage.id);
    setSelectedNodeIds([ROOT_VSTACK_ID]);
    setGridLinesVisible(new Set());
  };

  const updatePageTheme = (pageId: string, theme: { primaryColor?: string; backgroundColor?: string }) => {
    setPagesWithHistory(pages.map(page =>
      page.id === pageId ? { ...page, theme: { ...page.theme, ...theme } } : page
    ), 'updatePageTheme');
  };

  return (
    <ComponentTreeContext.Provider
      value={{
        tree,
        selectedNodeIds,
        setTree,
        setSelectedNodeIds,
        toggleNodeSelection,
        addComponent,
        removeComponent,
        updateComponentProps,
        updateMultipleComponentProps,
        updateComponentName,
        duplicateComponent,
        moveComponent,
        reorderComponent,
        resetTree,
        getNodeById: (id) => getNodeById(id),
        getParentById: (id) => getParentById(id),
        gridLinesVisible,
        toggleGridLines,
        clipboard,
        copyComponent,
        pasteComponent,
        canPaste: clipboard !== null,
        pages,
        currentPageId,
        setCurrentPage,
        addPage,
        deletePage,
        renamePage,
        duplicatePage,
        updatePageTheme,
        canUndo,
        canRedo,
        undo,
        redo,
        clearHistory,
        isPlayMode,
        setPlayMode,
        addInteraction,
        removeInteraction,
        updateInteraction,
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
