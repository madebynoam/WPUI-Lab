import { createContext, useContext, ReactNode, useReducer, useMemo, useCallback, useEffect } from 'react';
import { ComponentNode, Page, Project, Interaction, PatternNode } from '@/types';
import { componentRegistry } from '@/componentRegistry';
import { componentTreeReducerWithDirtyTracking, ComponentTreeState } from '@/ComponentTreeReducer';
import { ROOT_GRID_ID, getCurrentTree, findNodeById, findParent, calculateSmartGridSpan } from '@/utils/treeHelpers';
import { generateId } from '@/utils/idGenerator';
import { normalizeComponentNode, normalizeComponentNodes } from '@/utils/normalizeComponent';
import { migrateProject } from '@/utils/migrations';
// Cloud-only: Demo project no longer needed for initialization

// File version 3: Grid-first layout system
// Changed storage key to not load old projects with VStack/HStack layout complexity
// Cloud-only mode: No localStorage for project data
// Projects are loaded from cloud storage via useCloudProject hook

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
  groupComponents: (ids: string[]) => void;
  ungroupComponents: (id: string) => void;
  swapLayoutType: (id: string, newType: 'VStack' | 'HStack') => void;
  resetTree: () => void;
  getNodeById: (id: string) => ComponentNode | null;
  getParentById: (id: string) => ComponentNode | null;
  gridLinesVisible: Set<string>;
  toggleGridLines: (id: string) => void;
  toggleAllGridLines: () => void;

  // Copy/Paste management
  clipboard: ComponentNode | null;
  cutNodeId: string | null;
  copyComponent: (id: string) => void;
  cutComponent: (id: string) => void;
  pasteComponent: (parentId?: string) => void;
  canPaste: boolean;

  // Pages management (within current project)
  pages: Page[];
  currentPageId: string;
  selectedPageId: string | null;
  setCurrentPage: (pageId: string) => void;
  setSelectedPageId: (pageId: string | null) => void;
  selectPage: (pageId: string | null) => void;
  addPage: (name?: string) => void;
  createPageWithId: (name?: string) => string;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  duplicatePage: (pageId: string) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  updatePageTheme: (pageId: string, theme: { primaryColor?: string; backgroundColor?: string }) => void;
  updatePageCanvasPosition: (pageId: string, position: { x: number; y: number }) => void;
  updateAllPageCanvasPositions: (positions: Record<string, { x: number; y: number }>) => void;

  // Projects management
  projects: Project[];
  currentProjectId: string;
  createProject: (name: string) => void;
  setCurrentProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  renameProject: (projectId: string, name: string) => void;
  duplicateProject: (projectId: string) => void;
  importProject: (project: Project) => void;
  resetExampleProject: () => void;
  updateProjectTheme: (theme: { primaryColor?: string; backgroundColor?: string }) => void;
  updateProjectLayout: (layout: { maxWidth?: number; padding?: number; spacing?: number }) => void;
  updateProjectDescription: (description: string) => void;

  // History management
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Play mode
  isPlayMode: boolean;
  setPlayMode: (isPlay: boolean) => void;

  // Viewport preview
  viewportPreset: 'mobile' | 'tablet' | 'desktop' | 'full';
  setViewportPreset: (preset: 'mobile' | 'tablet' | 'desktop' | 'full') => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  showWires: boolean;
  setShowWires: (show: boolean) => void;
  requestedPropertiesTab: 'styles' | 'interactions' | null;
  setRequestedPropertiesTab: (tab: 'styles' | 'interactions' | null) => void;
  selectComponentOnPage: (pageId: string, componentId: string, openTab?: 'styles' | 'interactions') => void;

  // Agent execution state
  isAgentExecuting: boolean;
  setAgentExecuting: (isExecuting: boolean) => void;

  // Editing mode
  editingMode: 'selection' | 'text';
  setEditingMode: (mode: 'selection' | 'text') => void;

  // Interactions
  addInteraction: (nodeId: string, interaction: Omit<Interaction, 'id'>) => void;
  removeInteraction: (nodeId: string, interactionId: string) => void;
  updateInteraction: (nodeId: string, interactionId: string, interaction: Omit<Interaction, 'id'>) => void;

  // Global components
  globalComponents: ComponentNode[];
  editingGlobalComponentId: string | null;
  makeGlobalComponent: (nodeId: string, name: string) => void;
  insertGlobalComponentInstance: (globalComponentId: string, parentId?: string, index?: number) => void;
  updateGlobalComponent: (globalComponentId: string, node: ComponentNode) => void;
  deleteGlobalComponent: (globalComponentId: string) => void;
  detachGlobalComponentInstance: (nodeId: string) => void;
  setEditingGlobalComponent: (globalComponentId: string | null) => void;

  // Cloud save state
  isDirty: boolean;
  markSaved: () => void;
}

const ComponentTreeContext = createContext<ComponentTreeContextType | undefined>(undefined);

const createInitialPage = (id: string, name: string): Page => {
  // Create root Grid with basic props
  const rootGrid: ComponentNode = {
    id: ROOT_GRID_ID,
    type: 'Grid',
    props: {
      columns: 12,
      // Other props will be filled by normalization
    },
    children: [],
    interactions: [],
  };

  // Normalize to apply defaultProps (gap, etc.)
  const normalizedRootGrid = normalizeComponentNode(rootGrid);

  return {
    id,
    name,
    tree: [normalizedRootGrid],
    theme: {
      primaryColor: '#3858e9',
      backgroundColor: '#ffffff',
    },
  };
};

const createInitialProject = (id: string, name: string): Project => ({
  id,
  name,
  version: 3, // Tree structure version
  pages: [createInitialPage('page-1', 'Page 1')],
  currentPageId: 'page-1',
  globalComponents: [], // Reusable components
  createdAt: Date.now(),
  lastModified: Date.now(),
  theme: {
    primaryColor: '#3858e9',
    backgroundColor: '#ffffff',
  },
  layout: {
    maxWidth: 0, // 0 means no constraint (100% width)
    padding: 0,
    spacing: 6, // 6 * 4 = 24px gap in root Grid
  },
});

// Initialize state for cloud-only mode
// Projects are loaded from cloud storage, not localStorage
function initializeState(): ComponentTreeState {
  // Start with empty state - cloud project will be loaded via importProject
  const projects: Project[] = [];
  const currentProjectId = '';

  return {
    projects,
    currentProjectId,
    selectedNodeIds: [],
    selectedPageId: null,
    gridLinesVisible: new Set(),
    clipboard: null,
    cutNodeId: null,
    isPlayMode: false,
    isAgentExecuting: false,
    editingMode: 'selection',
    editingGlobalComponentId: null,
    viewportPreset: 'full', // Default to full width
    zoomLevel: 1.0, // Default to 100% zoom
    showWires: false, // Hide interaction wires by default
    requestedPropertiesTab: null, // Tab to open in properties panel (set by noodle click, etc.)
    isDirty: false,
    history: {
      past: [],
      present: {
        projects: [],
        currentProjectId: '',
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
  const [state, dispatch] = useReducer(componentTreeReducerWithDirtyTracking, undefined, initializeState);

  // Load viewport and zoom settings from sessionStorage when project changes
  useEffect(() => {
    if (typeof window !== 'undefined' && state.currentProjectId) {
      // Load viewport preset
      const storedPreset = sessionStorage.getItem(`viewport-preset-${state.currentProjectId}`);
      if (storedPreset && ['mobile', 'tablet', 'desktop', 'full'].includes(storedPreset)) {
        dispatch({ type: 'SET_VIEWPORT_PRESET', payload: { preset: storedPreset as any } });
      }

      // Load zoom level
      const storedZoom = sessionStorage.getItem(`zoom-level-${state.currentProjectId}`);
      if (storedZoom) {
        const zoomValue = parseFloat(storedZoom);
        if (!isNaN(zoomValue) && zoomValue >= 0.25 && zoomValue <= 2.0) {
          dispatch({ type: 'SET_ZOOM_LEVEL', payload: { level: zoomValue } });
        }
      }
    }
  }, [state.currentProjectId]);

  // Get current project
  const currentProject = useMemo(
    () => state.projects.find(p => p.id === state.currentProjectId),
    [state.projects, state.currentProjectId]
  );

  // Get current tree for convenience
  // When in isolation mode (editingGlobalComponentId), return the global component as the tree
  const tree = useMemo(
    () => {
      if (!currentProject) {
        return [];
      }

      // If editing a global component in isolation mode, return it as the tree
      if (state.editingGlobalComponentId) {
        const globalComponent = currentProject.globalComponents?.find(
          gc => gc.id === state.editingGlobalComponentId
        );
        return globalComponent ? [globalComponent] : [];
      }

      return getCurrentTree(currentProject.pages, currentProject.currentPageId);
    },
    [currentProject, state.editingGlobalComponentId]
  );

  // Get current pages and pageId from current project
  const pages = currentProject?.pages || [];
  const currentPageId = currentProject?.currentPageId || '';

  // Cloud-only mode: No localStorage save
  // Projects are saved to cloud storage via useCloudProject hook

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

    // Smart Grid insertion: if parent is a Grid, calculate smart gridColumnSpan
    const effectiveParentId = parentId || ROOT_GRID_ID;
    const parentNode = findNodeById(tree, effectiveParentId);

    if (parentNode && parentNode.type === 'Grid') {
      const { span, childrenToUpdate } = calculateSmartGridSpan(parentNode);

      // Apply smart span to new node
      newNode.props.gridColumnSpan = span;

      // Set default Grid child props to match PropertiesPanel defaults
      newNode.props.height = 'auto';          // Default to "Fit Content"
      // NOTE: Don't set gridColumnStart - let Grid auto-flow handle positioning

      // Update existing children if needed (e.g., rebalancing)
      if (childrenToUpdate.length > 0) {
        childrenToUpdate.forEach(({ id, gridColumnSpan }) => {
          dispatch({
            type: 'UPDATE_COMPONENT_PROPS',
            payload: { id, props: { gridColumnSpan } }
          });
        });
      }
    }

    // Normalize before dispatching to ensure consistent data structure
    const normalizedNode = normalizeComponentNode(newNode);

    dispatch({
      type: 'INSERT_COMPONENT',
      payload: { node: normalizedNode, parentId },
    });
  };

  const insertComponent = (node: ComponentNode, parentId?: string, index?: number) => {
    // Normalize before dispatching to ensure consistent data structure
    const normalizedNode = normalizeComponentNode(node);

    dispatch({
      type: 'INSERT_COMPONENT',
      payload: { node: normalizedNode, parentId, index },
    });
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

  const groupComponents = (ids: string[]) => {
    dispatch({ type: 'GROUP_COMPONENTS', payload: { ids } });
  };

  const ungroupComponents = (id: string) => {
    dispatch({ type: 'UNGROUP_COMPONENTS', payload: { id } });
  };

  const swapLayoutType = (id: string, newType: 'VStack' | 'HStack') => {
    dispatch({ type: 'SWAP_LAYOUT_TYPE', payload: { id, newType } });
  };

  const resetTree = () => {
    const defaultProject = createInitialProject('project-1', 'My First Project');
    // Clear agent messages from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wp-designer-agent-messages-v3');
    }
    dispatch({ type: 'RESET_TREE', payload: { defaultProject } });
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

  const toggleAllGridLines = () => {
    dispatch({ type: 'TOGGLE_ALL_GRID_LINES' });
  };

  // ===== Copy/Paste =====

  const copyComponent = (id: string) => {
    const node = getNodeById(id);
    if (node) {
      dispatch({ type: 'COPY_COMPONENT', payload: { node } });
    }
  };

  const cutComponent = (id: string) => {
    const node = getNodeById(id);
    if (node && id !== ROOT_GRID_ID) { // Don't allow cutting root
      dispatch({ type: 'CUT_COMPONENT', payload: { node, nodeId: id } });
    }
  };

  const pasteComponent = (parentId?: string) => {
    dispatch({ type: 'PASTE_COMPONENT', payload: { parentId } });
  };

  // ===== Pages Management =====

  const setCurrentPage = useCallback((pageId: string) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: { pageId } });
  }, [dispatch]);

  const setSelectedPageId = useCallback((pageId: string | null) => {
    dispatch({ type: 'SET_SELECTED_PAGE_ID', payload: { pageId } });
  }, [dispatch]);

  // Unified page selection - ensures both selectedPageId and currentPageId stay in sync
  const selectPage = useCallback((pageId: string | null) => {
    dispatch({ type: 'SET_SELECTED_PAGE_ID', payload: { pageId } });
    if (pageId) {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: { pageId } });
    }
  }, [dispatch]);

  const addPage = (name?: string) => {
    const newPageNumber = pages.length + 1;
    const newPage = createInitialPage(
      `page-${Date.now()}`,
      name || `Page ${newPageNumber}`
    );
    dispatch({ type: 'ADD_PAGE', payload: { page: newPage } });
  };

  const createPageWithId = (name?: string): string => {
    const newPageNumber = pages.length + 1;
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

  const reorderPages = (fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_PAGES', payload: { fromIndex, toIndex } });
  };

  const updatePageTheme = (
    pageId: string,
    theme: { primaryColor?: string; backgroundColor?: string }
  ) => {
    dispatch({ type: 'UPDATE_PAGE_THEME', payload: { pageId, theme } });
  };

  const updatePageCanvasPosition = (pageId: string, position: { x: number; y: number }) => {
    dispatch({ type: 'UPDATE_PAGE_CANVAS_POSITION', payload: { pageId, position } });
  };

  const updateAllPageCanvasPositions = (positions: Record<string, { x: number; y: number }>) => {
    dispatch({ type: 'UPDATE_ALL_PAGE_CANVAS_POSITIONS', payload: { positions } });
  };

  // ===== Projects Management =====

  const createProject = (name: string): string => {
    const newProject = createInitialProject(`project-${Date.now()}`, name);
    dispatch({ type: 'CREATE_PROJECT', payload: { project: newProject } });
    return newProject.id;
  };

  const setCurrentProject = useCallback((projectId: string) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: { projectId } });
  }, [dispatch]);

  const deleteProject = (projectId: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: { projectId } });
  };

  const renameProject = (projectId: string, name: string) => {
    dispatch({ type: 'RENAME_PROJECT', payload: { projectId, name } });
  };

  const duplicateProject = (projectId: string): string => {
    const newProjectId = `project-${Date.now()}`;
    dispatch({ type: 'DUPLICATE_PROJECT', payload: { projectId, newProjectId } });
    return newProjectId;
  };

  const importProject = useCallback((project: Project) => {
    // Migrate project to current schema (ensures backward compatibility)
    const migratedProject = migrateProject(project);

    // Add project to projects array (replace if exists, add if new)
    const existingIndex = state.projects.findIndex(p => p.id === migratedProject.id);
    const newProjects = existingIndex >= 0
      ? state.projects.map((p, i) => i === existingIndex ? migratedProject : p)
      : [...state.projects, migratedProject];
    dispatch({ type: 'SET_PROJECTS', payload: { projects: newProjects } });
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: { projectId: migratedProject.id } });
  }, [state.projects, dispatch]);

  const resetExampleProject = () => {
    dispatch({ type: 'RESET_EXAMPLE_PROJECT' });
  };

  const updateProjectTheme = (theme: { primaryColor?: string; backgroundColor?: string }) => {
    dispatch({ type: 'UPDATE_PROJECT_THEME', payload: { theme } });
  };

  const updateProjectLayout = (layout: { maxWidth?: number; padding?: number; spacing?: number }) => {
    dispatch({ type: 'UPDATE_PROJECT_LAYOUT', payload: { layout } });
  };

  const updateProjectDescription = (description: string) => {
    dispatch({ type: 'UPDATE_PROJECT_DESCRIPTION', payload: { description } });
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

  // ===== Viewport Preview =====

  const setViewportPreset = useCallback((preset: 'mobile' | 'tablet' | 'desktop' | 'full') => {
    dispatch({ type: 'SET_VIEWPORT_PRESET', payload: { preset } });
    // Persist to sessionStorage with project ID for isolation
    if (typeof window !== 'undefined' && state.currentProjectId) {
      sessionStorage.setItem(`viewport-preset-${state.currentProjectId}`, preset);
    }
  }, [state.currentProjectId]);

  const setZoomLevel = useCallback((level: number) => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: { level } });
    // Persist to sessionStorage with project ID for isolation
    if (typeof window !== 'undefined' && state.currentProjectId) {
      sessionStorage.setItem(`zoom-level-${state.currentProjectId}`, level.toString());
    }
  }, [state.currentProjectId]);

  const setShowWires = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_WIRES', payload: { show } });
  }, []);

  const setRequestedPropertiesTab = useCallback((tab: 'styles' | 'interactions' | null) => {
    dispatch({ type: 'SET_REQUESTED_PROPERTIES_TAB', payload: { tab } });
  }, []);

  const selectComponentOnPage = useCallback((pageId: string, componentId: string, openTab?: 'styles' | 'interactions') => {
    dispatch({ type: 'SELECT_COMPONENT_ON_PAGE', payload: { pageId, componentId, openTab } });
  }, []);

  // ===== Agent Execution State =====

  const setAgentExecuting = (isExecuting: boolean) => {
    dispatch({ type: 'SET_AGENT_EXECUTING', payload: { isExecuting } });
  };

  // ===== Editing Mode =====

  const setEditingMode = (mode: 'selection' | 'text') => {
    dispatch({ type: 'SET_EDITING_MODE', payload: { mode } });
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

  // ===== Global Components =====

  const makeGlobalComponent = (nodeId: string, name: string) => {
    dispatch({ type: 'MAKE_GLOBAL_COMPONENT', payload: { nodeId, name } });
  };

  const insertGlobalComponentInstance = (globalComponentId: string, parentId?: string, index?: number) => {
    dispatch({ type: 'INSERT_GLOBAL_COMPONENT_INSTANCE', payload: { globalComponentId, parentId, index } });
  };

  const updateGlobalComponent = (globalComponentId: string, node: ComponentNode) => {
    dispatch({ type: 'UPDATE_GLOBAL_COMPONENT', payload: { globalComponentId, node } });
  };

  const deleteGlobalComponent = (globalComponentId: string) => {
    dispatch({ type: 'DELETE_GLOBAL_COMPONENT', payload: { globalComponentId } });
  };

  const detachGlobalComponentInstance = (nodeId: string) => {
    dispatch({ type: 'DETACH_GLOBAL_COMPONENT_INSTANCE', payload: { nodeId } });
  };

  const setEditingGlobalComponent = (globalComponentId: string | null) => {
    dispatch({ type: 'SET_EDITING_GLOBAL_COMPONENT', payload: { globalComponentId } });
  };

  // ===== Cloud Save =====

  const markSaved = useCallback(() => {
    dispatch({ type: 'MARK_SAVED' });
  }, [dispatch]);

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
    groupComponents,
    ungroupComponents,
    swapLayoutType,
    resetTree,
    getNodeById,
    getParentById,
    gridLinesVisible: state.gridLinesVisible,
    toggleGridLines,
    toggleAllGridLines,
    clipboard: state.clipboard,
    cutNodeId: state.cutNodeId,
    copyComponent,
    cutComponent,
    pasteComponent,
    canPaste: state.clipboard !== null,
    pages,
    currentPageId,
    selectedPageId: state.selectedPageId,
    setCurrentPage,
    setSelectedPageId,
    selectPage,
    addPage,
    createPageWithId,
    deletePage,
    renamePage,
    duplicatePage,
    reorderPages,
    updatePageTheme,
    updatePageCanvasPosition,
    updateAllPageCanvasPositions,
    projects: state.projects,
    currentProjectId: state.currentProjectId,
    createProject,
    setCurrentProject,
    deleteProject,
    renameProject,
    duplicateProject,
    importProject,
    resetExampleProject,
    updateProjectTheme,
    updateProjectLayout,
    updateProjectDescription,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    undo,
    redo,
    clearHistory,
    isPlayMode: state.isPlayMode,
    setPlayMode,
    viewportPreset: state.viewportPreset,
    setViewportPreset,
    zoomLevel: state.zoomLevel,
    setZoomLevel,
    showWires: state.showWires,
    setShowWires,
    requestedPropertiesTab: state.requestedPropertiesTab,
    setRequestedPropertiesTab,
    selectComponentOnPage,
    isAgentExecuting: state.isAgentExecuting,
    setAgentExecuting,
    editingMode: state.editingMode,
    setEditingMode,
    addInteraction,
    removeInteraction,
    updateInteraction,
    globalComponents: currentProject?.globalComponents || [],
    editingGlobalComponentId: state.editingGlobalComponentId,
    makeGlobalComponent,
    insertGlobalComponentInstance,
    updateGlobalComponent,
    deleteGlobalComponent,
    detachGlobalComponentInstance,
    setEditingGlobalComponent,
    isDirty: state.isDirty,
    markSaved,
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

export { ROOT_GRID_ID };

