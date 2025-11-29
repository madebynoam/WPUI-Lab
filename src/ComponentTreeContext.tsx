import { createContext, useContext, ReactNode, useEffect, useReducer, useMemo } from 'react';
import { ComponentNode, Page, Interaction, PatternNode } from './types';
import { componentRegistry } from './componentRegistry';
import { componentTreeReducer, ComponentTreeState } from './ComponentTreeReducer';
import { ROOT_VSTACK_ID, getCurrentTree, findNodeById, findParent, generateId } from './utils/treeHelpers';
import { normalizeComponentNode, normalizeComponentNodes } from './utils/normalizeComponent';

const STORAGE_KEY = 'wp-designer-pages';

interface ComponentTreeContextType {
  // Current page's tree
  tree: ComponentNode[];
  selectedNodeIds: string[];
  setTree: (tree: ComponentNode[]) => void;
  setSelectedNodeIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  toggleNodeSelection: (id: string, multiSelect?: boolean, rangeSelect?: boolean, allNodes?: ComponentNode[]) => void;

  /**
   * Create a new component by type name from the component registry.
   * @param componentType - The string name of the component type (e.g., "Button", "Text", "Card")
   * @param parentId - Optional parent component ID to add to (defaults to root)
   */
  addComponent: (componentType: string, parentId?: string) => void;

  /**
   * Insert an existing ComponentNode into the tree.
   * Use this for patterns or pre-constructed component trees.
   * @param node - The ComponentNode to insert (will be normalized before insertion)
   * @param parentId - Optional parent component ID to add to (defaults to root)
   * @param index - Optional position index within parent's children
   */
  insertComponent: (node: ComponentNode, parentId?: string, index?: number) => void;

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
  createPageWithId: (name?: string) => string;
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

const createInitialPage = (id: string, name: string): Page => ({
  id,
  name,
  tree: [{
    id: ROOT_VSTACK_ID,
    type: 'VStack',
    props: { spacing: 4 },
    children: [],
  }],
  theme: {
    primaryColor: '#3858e9',
    backgroundColor: '#ffffff',
  },
});

// Initialize state from localStorage
function initializeState(): ComponentTreeState {
  const saved = localStorage.getItem(STORAGE_KEY);
  console.log('[ComponentTreeContext] Loading from localStorage:', saved ? `Found ${saved.length} chars` : 'No data');

  let pages: Page[] = [createInitialPage('page-1', 'Page 1')];
  let currentPageId = 'page-1';

  if (saved) {
    try {
      const data = JSON.parse(saved);
      console.log('[ComponentTreeContext] Parsed data:', {
        hasPages: !!data.pages,
        pagesLength: data.pages?.length,
        pageNames: data.pages?.map((p: Page) => p.name),
      });

      if (Array.isArray(data.pages) && data.pages.length > 0) {
        console.log('[ComponentTreeContext] Loading pages from localStorage:', data.pages.length);
        pages = data.pages;
        currentPageId = data.currentPageId || pages[0].id;
      }
    } catch (e) {
      console.error('Failed to parse saved pages:', e);
    }
  }

  // Try to migrate from old storage key
  if (pages.length === 1 && pages[0].id === 'page-1') {
    const oldTree = localStorage.getItem('wp-designer-tree');
    if (oldTree) {
      try {
        const parsedTree = JSON.parse(oldTree);
        console.log('[ComponentTreeContext] Migrating from old storage format');
        pages = [{
          ...pages[0],
          tree: parsedTree,
        }];
      } catch (e) {
        console.error('Failed to migrate old tree:', e);
      }
    }
  }

  return {
    pages,
    currentPageId,
    selectedNodeIds: [ROOT_VSTACK_ID],
    gridLinesVisible: new Set(),
    clipboard: null,
    isPlayMode: false,
    history: {
      past: [],
      present: {
        pages: JSON.parse(JSON.stringify(pages)),
        currentPageId,
      },
      future: [],
    },
  };
}

// Helper: Convert PatternNode to ComponentNode with IDs
function patternNodesToComponentNodes(patternNodes: PatternNode[]): ComponentNode[] {
  const nodes = patternNodes.map(patternNode => ({
    id: generateId(),
    type: patternNode.type,
    name: patternNode.name || '',
    props: { ...patternNode.props },
    children: patternNode.children ? patternNodesToComponentNodes(patternNode.children) : [],
    interactions: [],
  }));

  // Normalize all nodes to ensure consistent data structure
  return normalizeComponentNodes(nodes);
}

export const ComponentTreeProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(componentTreeReducer, undefined, initializeState);

  // Get current tree for convenience
  const tree = useMemo(
    () => getCurrentTree(state.pages, state.currentPageId),
    [state.pages, state.currentPageId]
  );

  // Save to localStorage whenever state changes
  useEffect(() => {
    const dataToSave = { pages: state.pages, currentPageId: state.currentPageId };
    console.log('[ComponentTreeContext] Saving to localStorage:', {
      pageCount: state.pages.length,
      pageNames: state.pages.map(p => p.name),
      currentPageId: state.currentPageId,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('[ComponentTreeContext] Saved successfully');
  }, [state.pages, state.currentPageId]);

  // ===== Tree Operations =====

  const setTree = (newTree: ComponentNode[]) => {
    dispatch({ type: 'SET_TREE', payload: { tree: newTree } });
  };

  const setSelectedNodeIds = (ids: string[] | ((prev: string[]) => string[])) => {
    const newIds = typeof ids === 'function' ? ids(state.selectedNodeIds) : ids;
    dispatch({ type: 'SET_SELECTED_NODE_IDS', payload: { ids: newIds } });
  };

  const toggleNodeSelection = (
    id: string,
    multiSelect?: boolean,
    rangeSelect?: boolean,
    allNodes?: ComponentNode[]
  ) => {
    dispatch({
      type: 'TOGGLE_NODE_SELECTION',
      payload: { id, multiSelect, rangeSelect, allNodes },
    });
  };

  const addComponent = (componentType: string, parentId?: string) => {
    const definition = componentRegistry[componentType];
    if (!definition) return;

    // Convert defaultChildren from PatternNode[] to ComponentNode[]
    const children = definition.defaultChildren
      ? patternNodesToComponentNodes(definition.defaultChildren)
      : [];

    const newNode: ComponentNode = {
      id: generateId(),
      type: componentType,
      name: '',
      props: { ...definition.defaultProps },
      children,
      interactions: [],
    };

    // Normalize before dispatching to ensure consistent data structure
    const normalizedNode = normalizeComponentNode(newNode);

    dispatch({
      type: 'INSERT_COMPONENT',
      payload: { node: normalizedNode, parentId },
    });
  };

  const insertComponent = (node: ComponentNode, parentId?: string, index?: number) => {
    console.log('[insertComponent] Received node:', JSON.stringify(node, null, 2));
    console.log('[insertComponent] Parent ID:', parentId, 'Index:', index);

    // Normalize before dispatching to ensure consistent data structure
    const normalizedNode = normalizeComponentNode(node);
    console.log('[insertComponent] Normalized node:', JSON.stringify(normalizedNode, null, 2));

    dispatch({
      type: 'INSERT_COMPONENT',
      payload: { node: normalizedNode, parentId, index },
    });

    console.log('[insertComponent] Dispatched INSERT_COMPONENT action');
  };

  const removeComponent = (id: string) => {
    dispatch({ type: 'REMOVE_COMPONENT', payload: { id } });
  };

  const updateComponentProps = (id: string, props: Record<string, any>) => {
    dispatch({ type: 'UPDATE_COMPONENT_PROPS', payload: { id, props } });
  };

  const updateMultipleComponentProps = (ids: string[], props: Record<string, any>) => {
    dispatch({ type: 'UPDATE_MULTIPLE_COMPONENT_PROPS', payload: { ids, props } });
  };

  const updateComponentName = (id: string, name: string) => {
    dispatch({ type: 'UPDATE_COMPONENT_NAME', payload: { id, name } });
  };

  const duplicateComponent = (id: string) => {
    dispatch({ type: 'DUPLICATE_COMPONENT', payload: { id } });
  };

  const moveComponent = (id: string, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_COMPONENT', payload: { id, direction } });
  };

  const reorderComponent = (
    activeId: string,
    overId: string,
    position?: 'before' | 'after' | 'inside'
  ) => {
    dispatch({ type: 'REORDER_COMPONENT', payload: { activeId, overId, position } });
  };

  const resetTree = () => {
    const defaultPage = createInitialPage('page-1', 'Page 1');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('wp-designer-agent-messages');
    dispatch({ type: 'RESET_TREE', payload: { defaultPage } });
  };

  const getNodeById = (id: string): ComponentNode | null => {
    return findNodeById(tree, id);
  };

  const getParentById = (id: string): ComponentNode | null => {
    return findParent(tree, id);
  };

  const toggleGridLines = (id: string) => {
    dispatch({ type: 'TOGGLE_GRID_LINES', payload: { id } });
  };

  // ===== Copy/Paste =====

  const copyComponent = (id: string) => {
    const node = getNodeById(id);
    if (node) {
      dispatch({ type: 'COPY_COMPONENT', payload: { node } });
    }
  };

  const pasteComponent = (parentId?: string) => {
    dispatch({ type: 'PASTE_COMPONENT', payload: { parentId } });
  };

  // ===== Pages Management =====

  const setCurrentPage = (pageId: string) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: { pageId } });
  };

  const addPage = (name?: string) => {
    const newPageNumber = state.pages.length + 1;
    const newPage = createInitialPage(
      `page-${Date.now()}`,
      name || `Page ${newPageNumber}`
    );
    console.log('[ComponentTreeContext] addPage called:', {
      newPageName: newPage.name,
      newPageId: newPage.id,
      currentPagesCount: state.pages.length,
    });
    dispatch({ type: 'ADD_PAGE', payload: { page: newPage } });
    console.log('[ComponentTreeContext] addPage completed');
  };

  const createPageWithId = (name?: string): string => {
    const newPageNumber = state.pages.length + 1;
    const newPage = createInitialPage(
      `page-${Date.now()}`,
      name || `Page ${newPageNumber}`
    );
    dispatch({ type: 'ADD_PAGE', payload: { page: newPage } });
    return newPage.id;
  };

  const deletePage = (pageId: string) => {
    dispatch({ type: 'DELETE_PAGE', payload: { pageId } });
  };

  const renamePage = (pageId: string, name: string) => {
    dispatch({ type: 'RENAME_PAGE', payload: { pageId, name } });
  };

  const duplicatePage = (pageId: string) => {
    dispatch({ type: 'DUPLICATE_PAGE', payload: { pageId } });
  };

  const updatePageTheme = (
    pageId: string,
    theme: { primaryColor?: string; backgroundColor?: string }
  ) => {
    dispatch({ type: 'UPDATE_PAGE_THEME', payload: { pageId, theme } });
  };

  // ===== History =====

  const undo = () => {
    dispatch({ type: 'UNDO' });
  };

  const redo = () => {
    dispatch({ type: 'REDO' });
  };

  const clearHistory = () => {
    dispatch({ type: 'CLEAR_HISTORY' });
  };

  // ===== Play Mode =====

  const setPlayMode = (isPlay: boolean) => {
    dispatch({ type: 'SET_PLAY_MODE', payload: { isPlay } });
  };

  // ===== Interactions =====

  const addInteraction = (nodeId: string, interaction: Omit<Interaction, 'id'>) => {
    const interactionWithId = {
      ...interaction,
      id: generateId(),
    };
    dispatch({ type: 'ADD_INTERACTION', payload: { nodeId, interaction: interactionWithId } });
  };

  const removeInteraction = (nodeId: string, interactionId: string) => {
    dispatch({ type: 'REMOVE_INTERACTION', payload: { nodeId, interactionId } });
  };

  const updateInteraction = (
    nodeId: string,
    interactionId: string,
    interaction: Omit<Interaction, 'id'>
  ) => {
    dispatch({ type: 'UPDATE_INTERACTION', payload: { nodeId, interactionId, interaction } });
  };

  // ===== Context Value =====

  const value: ComponentTreeContextType = {
    tree,
    selectedNodeIds: state.selectedNodeIds,
    setTree,
    setSelectedNodeIds,
    toggleNodeSelection,
    addComponent,
    insertComponent,
    removeComponent,
    updateComponentProps,
    updateMultipleComponentProps,
    updateComponentName,
    duplicateComponent,
    moveComponent,
    reorderComponent,
    resetTree,
    getNodeById,
    getParentById,
    gridLinesVisible: state.gridLinesVisible,
    toggleGridLines,
    clipboard: state.clipboard,
    copyComponent,
    pasteComponent,
    canPaste: state.clipboard !== null,
    pages: state.pages,
    currentPageId: state.currentPageId,
    setCurrentPage,
    addPage,
    createPageWithId,
    deletePage,
    renamePage,
    duplicatePage,
    updatePageTheme,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    undo,
    redo,
    clearHistory,
    isPlayMode: state.isPlayMode,
    setPlayMode,
    addInteraction,
    removeInteraction,
    updateInteraction,
  };

  return (
    <ComponentTreeContext.Provider value={value}>
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
