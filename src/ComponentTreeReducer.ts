import { ComponentTreeAction } from './ComponentTreeTypes';
import { ComponentNode, Page, Project, HistoryState } from './types';
import { componentRegistry } from '@/componentRegistry';
import {
  ROOT_VSTACK_ID,
  getCurrentTree,
  updateNodeInTree,
  updateMultipleNodesInTree,
  insertNodeInTree,
  removeNodeFromTree,
  duplicateNodeInTree,
  moveNodeInTree,
  reorderNodeInTree,
  updateTreeForPage,
  flattenTree,
  findParent,
} from './utils/treeHelpers';
import { generateId } from './utils/idGenerator';
import { validateTree, formatValidationErrors } from './utils/treeValidation';

// Debug flag - set to true to enable console logging
const DEBUG = false;

// State managed by the reducer
export interface ComponentTreeState {
  // Core data
  projects: Project[];
  currentProjectId: string;

  // UI state
  selectedNodeIds: string[];
  gridLinesVisible: Set<string>;
  clipboard: ComponentNode | null;
  cutNodeId: string | null; // ID of the node that was cut (to remove after paste)
  isPlayMode: boolean;
  editingMode: 'selection' | 'text';

  // History state
  history: {
    past: HistoryState[];
    present: HistoryState;
    future: HistoryState[];
  };
}

// Actions that should save to history
const HISTORY_ACTIONS = new Set([
  'UPDATE_COMPONENT_PROPS',
  'UPDATE_MULTIPLE_COMPONENT_PROPS',
  'UPDATE_COMPONENT_NAME',
  'INSERT_COMPONENT',
  'REMOVE_COMPONENT',
  'DUPLICATE_COMPONENT',
  'MOVE_COMPONENT',
  'REORDER_COMPONENT',
  'SET_TREE',
  'GROUP_COMPONENTS',
  'SWAP_LAYOUT_TYPE',
  'ADD_PAGE',
  'DELETE_PAGE',
  'RENAME_PAGE',
  'DUPLICATE_PAGE',
  'REORDER_PAGES',
  'UPDATE_PAGE_THEME',
  'UPDATE_PROJECT_THEME',
  'UPDATE_PROJECT_LAYOUT',
  'CUT_COMPONENT',
  'PASTE_COMPONENT',
  'RESET_TREE',
  'SET_CURRENT_PAGE',
  'CREATE_PROJECT',
  'SET_CURRENT_PROJECT',
  'DELETE_PROJECT',
  'RENAME_PROJECT',
  'DUPLICATE_PROJECT',
  'RESET_EXAMPLE_PROJECT',
]);

// Actions that should be debounced (for history)
const DEBOUNCED_ACTIONS = new Set([
  'UPDATE_COMPONENT_PROPS',
  'UPDATE_COMPONENT_NAME',
  'UPDATE_PROJECT_THEME',
  'UPDATE_PROJECT_LAYOUT',
  'RENAME_PAGE',
  'RENAME_PROJECT',
]);

/**
 * Helper to get current project from projects array
 */
function getCurrentProject(projects: Project[], currentProjectId: string): Project {
  const project = projects.find(p => p.id === currentProjectId);
  if (!project) {
    throw new Error(`Project not found: ${currentProjectId}`);
  }
  return project;
}

/**
 * Helper to get current tree from projects
 */
function getCurrentTreeFromProjects(projects: Project[], currentProjectId: string): ComponentNode[] {
  const project = getCurrentProject(projects, currentProjectId);
  return getCurrentTree(project.pages, project.currentPageId);
}

/**
 * Helper to update tree in a project
 */
function updateTreeInProject(project: Project, newTree: ComponentNode[]): Project {
  const newPages = updateTreeForPage(project.pages, project.currentPageId, newTree);
  return {
    ...project,
    pages: newPages,
    lastModified: Date.now(),
  };
}

/**
 * Helper to update a project in projects array
 */
function updateProjectInProjects(
  projects: Project[],
  projectId: string,
  updateFn: (project: Project) => Project
): Project[] {
  return projects.map(project =>
    project.id === projectId ? updateFn(project) : project
  );
}

/**
 * Helper to update history when state changes
 */
function updateHistory(
  state: ComponentTreeState,
  newProjects: Project[],
  newCurrentProjectId: string
): ComponentTreeState {
  const newPresent: HistoryState = {
    projects: JSON.parse(JSON.stringify(newProjects)),
    currentProjectId: newCurrentProjectId,
  };

  const MAX_HISTORY = 50;
  let newPast = [...state.history.past, state.history.present];
  if (newPast.length > MAX_HISTORY) {
    newPast = newPast.slice(newPast.length - MAX_HISTORY);
  }

  return {
    ...state,
    projects: newProjects,
    currentProjectId: newCurrentProjectId,
    history: {
      past: newPast,
      present: newPresent,
      future: [],
    },
  };
}

/**
 * Main reducer function
 */
export function componentTreeReducer(
  state: ComponentTreeState,
  action: ComponentTreeAction
): ComponentTreeState {
  switch (action.type) {
    // ===== Component Tree Mutations =====

    case 'UPDATE_COMPONENT_PROPS': {
      const { id, props } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      // Separate node-level properties from component props
      const { width, ...componentProps } = props;

      const newTree = updateNodeInTree(currentTree, id, (node) => ({
        ...node,
        ...(width !== undefined ? { width } : {}),
        props: { ...node.props, ...componentProps },
      }));

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'UPDATE_MULTIPLE_COMPONENT_PROPS': {
      const { ids, props } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      // Separate node-level properties from component props
      const { width, ...componentProps } = props;

      const newTree = updateMultipleNodesInTree(currentTree, ids, (node) => ({
        ...node,
        ...(width !== undefined ? { width } : {}),
        props: { ...node.props, ...componentProps },
      }));

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'UPDATE_COMPONENT_NAME': {
      const { id, name } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = updateNodeInTree(currentTree, id, (node) => ({
        ...node,
        name: name || undefined,
      }));

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'INSERT_COMPONENT': {
      const { node, parentId, index } = action.payload;
      if (DEBUG) {
        console.log('[Reducer] INSERT_COMPONENT - Received node:', JSON.stringify(node, null, 2));
        console.log('[Reducer] INSERT_COMPONENT - Parent ID:', parentId, 'Index:', index);
      }

      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = insertNodeInTree(currentTree, node, parentId, index);
      if (DEBUG) {
        console.log('[Reducer] INSERT_COMPONENT - New tree after insertion:', JSON.stringify(newTree, null, 2));
      }

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: [node.id],
      };
    }

    case 'REMOVE_COMPONENT': {
      const { id } = action.payload;
      if (id === ROOT_VSTACK_ID) return state; // Prevent deletion of root

      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);
      const newTree = removeNodeFromTree(currentTree, id);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      const newSelectedNodeIds = state.selectedNodeIds.filter(selectedId => selectedId !== id);
      const selectedIds = newSelectedNodeIds.length > 0 ? newSelectedNodeIds : [ROOT_VSTACK_ID];

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: selectedIds,
      };
    }

    case 'DUPLICATE_COMPONENT': {
      const { id } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const { tree: newTree, newNodeId } = duplicateNodeInTree(currentTree, id);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: newNodeId ? [newNodeId] : state.selectedNodeIds,
      };
    }

    case 'MOVE_COMPONENT': {
      const { id, direction } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = moveNodeInTree(currentTree, id, direction);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'REORDER_COMPONENT': {
      const { activeId, overId, position } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = reorderNodeInTree(currentTree, activeId, overId, position);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'SET_TREE': {
      const { tree } = action.payload;

      // Validate tree structure before accepting
      const validation = validateTree(tree);
      if (!validation.valid) {
        const errorMessage = formatValidationErrors(validation);
        console.error('[Reducer] SET_TREE validation failed:', errorMessage);
        throw new Error(`Invalid tree structure:\n${errorMessage}`);
      }

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, tree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'GROUP_COMPONENTS': {
      const { ids } = action.payload;
      if (ids.length < 2) return state; // Need at least 2 items to group

      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      // Helper to find a node by ID anywhere in the tree
      const findNodeInTree = (nodes: ComponentNode[], targetId: string): ComponentNode | null => {
        for (const node of nodes) {
          if (node.id === targetId) return node;
          if (node.children) {
            const found = findNodeInTree(node.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      // Find parent ID for a node
      const findParentId = (nodes: ComponentNode[], targetId: string, parentId?: string): string | null => {
        for (const node of nodes) {
          if (node.id === targetId) {
            return parentId || null;
          }
          if (node.children) {
            const found = findParentId(node.children, targetId, node.id);
            if (found !== null) return found;
          }
        }
        return null;
      };

      // Get parent IDs for all selected nodes
      const parentIds = ids.map(id => findParentId(currentTree, id));

      // Check all nodes have same parent
      const firstParentId = parentIds[0];
      if (!parentIds.every(parentId => parentId === firstParentId)) {
        console.warn('[Reducer] GROUP_COMPONENTS: Cannot group nodes with different parents');
        return state;
      }

      // Get the parent node
      const parent = firstParentId ? findNodeInTree(currentTree, firstParentId) : currentTree.find(n => n.id === ROOT_VSTACK_ID);
      if (!parent || !parent.children) return state;

      // Find indices of selected children in parent
      const selectedIndices = ids
        .map(id => parent.children!.findIndex(child => child.id === id))
        .filter(idx => idx !== -1)
        .sort((a, b) => a - b);

      if (selectedIndices.length === 0) return state;

      // Determine spacing - try to match closest system value (2 or 4)
      const parentSpacing = parent.props?.spacing;
      const containerSpacing = parentSpacing && [2, 4].includes(parentSpacing) ? parentSpacing : 2;

      // Create container (VStack by default) with cloned children
      const containerNode: ComponentNode = {
        id: generateId(),
        type: 'VStack',
        props: {
          spacing: containerSpacing,
          alignment: 'stretch',
        },
        children: selectedIndices.map(idx => JSON.parse(JSON.stringify(parent.children![idx]))),
      };

      // Remove selected nodes from parent and insert container at first selected position
      let newTree = currentTree;
      const firstIndex = selectedIndices[0];

      // Remove nodes in reverse order to maintain indices
      for (let i = selectedIndices.length - 1; i >= 0; i--) {
        newTree = removeNodeFromTree(newTree, ids[i]);
      }

      // Insert container at the position of the first selected item
      newTree = insertNodeInTree(newTree, containerNode, firstParentId || undefined, firstIndex);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: [containerNode.id],
      };
    }

    case 'SWAP_LAYOUT_TYPE': {
      const { id, newType } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      // Find the node
      const findNode = (nodes: ComponentNode[], targetId: string): ComponentNode | null => {
        for (const node of nodes) {
          if (node.id === targetId) return node;
          if (node.children) {
            const found = findNode(node.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const node = findNode(currentTree, id);
      if (!node) return state;

      // Only allow swapping between VStack and HStack
      if (!['VStack', 'HStack'].includes(node.type)) {
        console.warn('[Reducer] SWAP_LAYOUT_TYPE: Can only swap VStack <-> HStack');
        return state;
      }

      if (node.type === newType) return state; // Already the target type

      // Import layout mappings for proper prop translation
      const { mapFromVStackProps, mapFromHStackProps, mapToVStackProps, mapToHStackProps } = require('./utils/layoutMappings');

      // Convert old props to Figma config, then to new type's props
      let newProps: Record<string, any>;

      if (node.type === 'VStack' && newType === 'HStack') {
        // VStack -> HStack: translate through Figma config
        const figmaConfig = mapFromVStackProps({
          alignment: node.props.alignment,
          spacing: node.props.spacing,
          expanded: node.props.expanded,
          justify: node.props.justify,
        });
        const result = mapToHStackProps(figmaConfig);
        newProps = result.props;
      } else if (node.type === 'HStack' && newType === 'VStack') {
        // HStack -> VStack: translate through Figma config
        const figmaConfig = mapFromHStackProps({
          alignment: node.props.alignment,
          spacing: node.props.spacing,
          expanded: node.props.expanded,
          justify: node.props.justify,
        });
        const result = mapToVStackProps(figmaConfig);
        newProps = result.props;
      } else {
        // Fallback (shouldn't happen)
        newProps = { ...componentRegistry[newType]?.defaultProps };
      }

      // Update node type and props
      const newTree = updateNodeInTree(currentTree, id, (node) => ({
        ...node,
        type: newType,
        props: {
          ...componentRegistry[newType]?.defaultProps,
          ...newProps,
        },
      }));

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    // ===== Selection Actions =====

    case 'SET_SELECTED_NODE_IDS': {
      const { ids } = action.payload;
      return { ...state, selectedNodeIds: ids };
    }

    case 'TOGGLE_NODE_SELECTION': {
      const { id, multiSelect, rangeSelect, allNodes } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);
      const treeToUse = allNodes || currentTree;

      let newSelectedNodeIds: string[];

      if (rangeSelect && state.selectedNodeIds.length > 0) {
        // Range selection: select all sibling nodes between last selected and clicked node
        const lastSelectedId = state.selectedNodeIds[state.selectedNodeIds.length - 1];

        // Find parent of both nodes to ensure we're selecting siblings
        const lastSelectedParent = findParent(treeToUse, lastSelectedId);
        const clickedParent = findParent(treeToUse, id);

        // Only do range selection if both nodes share the same parent (are siblings)
        if (lastSelectedParent && clickedParent && lastSelectedParent.id === clickedParent.id) {
          // Get all children of the parent (siblings)
          const siblings = lastSelectedParent.children || [];
          const lastIndex = siblings.findIndex(n => n.id === lastSelectedId);
          const currentIndex = siblings.findIndex(n => n.id === id);

          if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const rangeIds = siblings.slice(start, end + 1).map(n => n.id);
            newSelectedNodeIds = [...new Set([...state.selectedNodeIds, ...rangeIds])];
          } else {
            newSelectedNodeIds = [...state.selectedNodeIds, id];
          }
        } else {
          // Not siblings - just add the clicked node to selection
          newSelectedNodeIds = [...state.selectedNodeIds, id];
        }
      } else if (multiSelect) {
        // Multi-select: toggle the clicked node
        if (state.selectedNodeIds.includes(id)) {
          newSelectedNodeIds = state.selectedNodeIds.filter(selectedId => selectedId !== id);
          if (newSelectedNodeIds.length === 0) {
            newSelectedNodeIds = [ROOT_VSTACK_ID];
          }
        } else {
          newSelectedNodeIds = [...state.selectedNodeIds, id];
        }
      } else {
        // Single select: replace selection
        newSelectedNodeIds = [id];
      }

      return { ...state, selectedNodeIds: newSelectedNodeIds };
    }

    // ===== Page Actions =====
    // Note: Page actions now work within the current project context

    case 'SET_CURRENT_PAGE': {
      const { pageId } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = { ...currentProject, currentPageId: pageId, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'ADD_PAGE': {
      const { page } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const newPages = [...currentProject.pages, page];
      const updatedProject = { ...currentProject, pages: newPages, currentPageId: page.id, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: [],
        gridLinesVisible: new Set(),
      };
    }

    case 'DELETE_PAGE': {
      const { pageId } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      if (currentProject.pages.length === 1) return state; // Don't delete last page

      const newPages = currentProject.pages.filter(p => p.id !== pageId);
      const newCurrentPageId = currentProject.currentPageId === pageId
        ? newPages[0].id
        : currentProject.currentPageId;

      const updatedProject = { ...currentProject, pages: newPages, currentPageId: newCurrentPageId, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: [],
      };
    }

    case 'RENAME_PAGE': {
      const { pageId, name } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const newPages = currentProject.pages.map(page =>
        page.id === pageId ? { ...page, name } : page
      );
      const updatedProject = { ...currentProject, pages: newPages, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'DUPLICATE_PAGE': {
      const { pageId } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const pageToDuplicate = currentProject.pages.find(p => p.id === pageId);
      if (!pageToDuplicate) return state;

      const newPageId = `page-${Date.now()}`;
      const newPage: Page = {
        ...JSON.parse(JSON.stringify(pageToDuplicate)),
        id: newPageId,
        name: `${pageToDuplicate.name} Copy`,
      };

      const newPages = [...currentProject.pages, newPage];
      const updatedProject = { ...currentProject, pages: newPages, currentPageId: newPageId, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: [ROOT_VSTACK_ID],
      };
    }

    case 'REORDER_PAGES': {
      const { fromIndex, toIndex } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const newPages = [...currentProject.pages];
      const [movedPage] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, movedPage);

      const updatedProject = { ...currentProject, pages: newPages, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'UPDATE_PAGE_THEME': {
      const { pageId, theme } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const newPages = currentProject.pages.map(page =>
        page.id === pageId
          ? { ...page, theme: { ...page.theme, ...theme } }
          : page
      );
      const updatedProject = { ...currentProject, pages: newPages, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'UPDATE_PROJECT_THEME': {
      const { theme } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = {
        ...currentProject,
        theme: { ...currentProject.theme, ...theme },
        lastModified: Date.now(),
      };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'UPDATE_PROJECT_LAYOUT': {
      const { layout } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = {
        ...currentProject,
        layout: { ...currentProject.layout, ...layout },
        lastModified: Date.now(),
      };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'SET_PAGES': {
      const { pages } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = { ...currentProject, pages, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      return { ...state, projects: newProjects };
    }

    // ===== Clipboard Actions =====

    case 'COPY_COMPONENT': {
      const { node } = action.payload;
      return { ...state, clipboard: JSON.parse(JSON.stringify(node)), cutNodeId: null };
    }

    case 'CUT_COMPONENT': {
      const { node, nodeId } = action.payload;
      // Cut should remove the component immediately from the tree (like delete)
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);
      const newTree = removeNodeFromTree(currentTree, nodeId);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      // Update selection to root after cutting
      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        clipboard: JSON.parse(JSON.stringify(node)),
        cutNodeId: nodeId,
        selectedNodeIds: [ROOT_VSTACK_ID],
      };
    }

    case 'PASTE_COMPONENT': {
      let { parentId } = action.payload;
      if (!state.clipboard) return state;

      // If no parentId specified, use smart paste logic
      if (!parentId && state.selectedNodeIds.length > 0) {
        const selectedId = state.selectedNodeIds[0];
        const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

        // Find selected node and check if it accepts children
        const findNodeWithParent = (
          nodes: ComponentNode[],
          targetId: string,
          parentId?: string
        ): { node: ComponentNode; parentId?: string } | null => {
          for (const node of nodes) {
            if (node.id === targetId) {
              return { node, parentId };
            }
            if (node.children) {
              const result = findNodeWithParent(node.children, targetId, node.id);
              if (result) return result;
            }
          }
          return null;
        };

        const result = findNodeWithParent(currentTree, selectedId);
        if (result) {
          const { node, parentId: nodeParentId } = result;
          // Check if node accepts children
          const definition = componentRegistry[node.type];

          // If selected node is a container, paste inside it
          if (definition?.acceptsChildren) {
            parentId = node.id;
          } else if (nodeParentId) {
            // Otherwise, paste into the parent of the selected node
            parentId = nodeParentId;
          }
          // If nodeParentId is undefined, it means selected node is at root, so paste at root (parentId stays undefined)
        }
      }

      // Create a new node with new ID
      const deepCloneWithNewIds = (node: ComponentNode): ComponentNode => ({
        ...node,
        id: generateId(),
        children: node.children?.map(deepCloneWithNewIds),
      });

      const newNode = deepCloneWithNewIds(state.clipboard);
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);
      const newTree = insertNodeInTree(currentTree, newNode, parentId);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      // Cut components are already removed from tree, so just insert
      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: [newNode.id],
        cutNodeId: null, // Clear cut state after paste
      };
    }

    // ===== Grid Actions =====

    case 'TOGGLE_GRID_LINES': {
      const { id } = action.payload;
      const newGridLines = new Set(state.gridLinesVisible);
      if (newGridLines.has(id)) {
        newGridLines.delete(id);
      } else {
        newGridLines.add(id);
      }
      return { ...state, gridLinesVisible: newGridLines };
    }

    case 'SET_GRID_LINES': {
      const { gridLines } = action.payload;
      return { ...state, gridLinesVisible: gridLines };
    }

    // ===== Play Mode Actions =====

    case 'SET_PLAY_MODE': {
      const { isPlay } = action.payload;
      return { ...state, isPlayMode: isPlay };
    }

    case 'SET_EDITING_MODE': {
      const { mode } = action.payload;
      return { ...state, editingMode: mode };
    }

    // ===== Interaction Actions =====

    case 'ADD_INTERACTION': {
      const { nodeId, interaction } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = updateNodeInTree(currentTree, nodeId, (node) => ({
        ...node,
        interactions: [...(node.interactions || []), interaction],
      }));

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return { ...state, projects: newProjects };
    }

    case 'REMOVE_INTERACTION': {
      const { nodeId, interactionId } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = updateNodeInTree(currentTree, nodeId, (node) => ({
        ...node,
        interactions: node.interactions?.filter(i => i.id !== interactionId) || [],
      }));

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return { ...state, projects: newProjects };
    }

    case 'UPDATE_INTERACTION': {
      const { nodeId, interactionId, interaction } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = updateNodeInTree(currentTree, nodeId, (node) => ({
        ...node,
        interactions: node.interactions?.map(i =>
          i.id === interactionId ? { ...i, ...interaction } : i
        ) || [],
      }));

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return { ...state, projects: newProjects };
    }

    // ===== History Actions =====

    case 'UNDO': {
      if (state.history.past.length === 0) return state;

      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, state.history.past.length - 1);

      return {
        ...state,
        projects: previous.projects,
        currentProjectId: previous.currentProjectId,
        selectedNodeIds: [ROOT_VSTACK_ID],
        gridLinesVisible: new Set(),
        history: {
          past: newPast,
          present: previous,
          future: [state.history.present, ...state.history.future],
        },
      };
    }

    case 'REDO': {
      if (state.history.future.length === 0) return state;

      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);

      return {
        ...state,
        projects: next.projects,
        currentProjectId: next.currentProjectId,
        selectedNodeIds: [ROOT_VSTACK_ID],
        gridLinesVisible: new Set(),
        history: {
          past: [...state.history.past, state.history.present],
          present: next,
          future: newFuture,
        },
      };
    }

    case 'CLEAR_HISTORY': {
      return {
        ...state,
        history: {
          past: [],
          present: state.history.present,
          future: [],
        },
      };
    }

    // ===== Project Actions =====

    case 'CREATE_PROJECT': {
      const { project } = action.payload;
      const newProjects = [...state.projects, project];
      return {
        ...updateHistory(state, newProjects, project.id),
        selectedNodeIds: [ROOT_VSTACK_ID],
        gridLinesVisible: new Set(),
      };
    }

    case 'SET_CURRENT_PROJECT': {
      const { projectId } = action.payload;
      return {
        ...updateHistory(state, state.projects, projectId),
        selectedNodeIds: [ROOT_VSTACK_ID],
        gridLinesVisible: new Set(),
      };
    }

    case 'DELETE_PROJECT': {
      const { projectId } = action.payload;
      if (state.projects.length === 1) return state; // Don't delete last project

      // Check if the project is an example project
      const projectToDelete = state.projects.find(p => p.id === projectId);
      if (projectToDelete?.isExampleProject) {
        console.warn('[ComponentTreeReducer] Cannot delete example project:', projectToDelete.name);
        return state; // Don't delete example projects
      }

      const newProjects = state.projects.filter(p => p.id !== projectId);
      const newCurrentProjectId = state.currentProjectId === projectId
        ? newProjects[0].id
        : state.currentProjectId;

      return {
        ...updateHistory(state, newProjects, newCurrentProjectId),
        selectedNodeIds: [ROOT_VSTACK_ID],
      };
    }

    case 'RENAME_PROJECT': {
      const { projectId, name } = action.payload;

      // Check if the project is an example project
      const projectToRename = state.projects.find(p => p.id === projectId);
      if (projectToRename?.isExampleProject) {
        console.warn('[ComponentTreeReducer] Cannot rename example project:', projectToRename.name);
        return state; // Don't rename example projects
      }

      const newProjects = state.projects.map(project =>
        project.id === projectId ? { ...project, name, lastModified: Date.now() } : project
      );
      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'DUPLICATE_PROJECT': {
      const { projectId, newProjectId } = action.payload;
      const projectToDuplicate = state.projects.find(p => p.id === projectId);
      if (!projectToDuplicate) return state;

      const newProject: Project = {
        ...JSON.parse(JSON.stringify(projectToDuplicate)),
        id: newProjectId,
        name: `${projectToDuplicate.name} (Copy)`,
        createdAt: Date.now(),
        lastModified: Date.now(),
        isExampleProject: false, // Duplicates are never example projects
      };

      const newProjects = [...state.projects, newProject];
      return {
        ...updateHistory(state, newProjects, newProjectId),
        selectedNodeIds: [ROOT_VSTACK_ID],
      };
    }

    case 'RESET_EXAMPLE_PROJECT': {
      // Find the example project
      const exampleProject = state.projects.find(p => p.isExampleProject);
      if (!exampleProject) {
        return state; // No example project to reset
      }

      // Import fresh from DEMO_PROJECT
      const { DEMO_PROJECT } = require('@/demoProject');

      // Replace the example project with fresh copy
      const firstPageId = DEMO_PROJECT.pages[0]?.id || 'page-1';
      const newProjects = state.projects.map(p =>
        p.isExampleProject ? { ...DEMO_PROJECT, currentPageId: firstPageId, lastModified: Date.now() } : p
      );

      // Reset to first page of example project
      const resetProjectId = DEMO_PROJECT.id;

      return {
        ...updateHistory(state, newProjects, resetProjectId),
        selectedNodeIds: [ROOT_VSTACK_ID],
        gridLinesVisible: new Set(),
      };
    }

    case 'SET_PROJECTS': {
      const { projects } = action.payload;
      return { ...state, projects };
    }

    // ===== Bulk Actions =====

    case 'RESET_TREE': {
      const { defaultProject } = action.payload;
      return {
        ...state,
        projects: [defaultProject],
        currentProjectId: defaultProject.id,
        selectedNodeIds: [ROOT_VSTACK_ID],
        gridLinesVisible: new Set(),
        history: {
          past: [],
          present: {
            projects: [defaultProject],
            currentProjectId: defaultProject.id,
          },
          future: [],
        },
      };
    }

    default:
      return state;
  }
}
