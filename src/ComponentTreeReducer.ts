import { ComponentTreeAction } from './ComponentTreeTypes';
import { ComponentNode, Page, Project, HistoryState } from './types';
import { componentRegistry } from './componentRegistry';
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

      const newTree = updateNodeInTree(currentTree, id, (node) => ({
        ...node,
        props: { ...node.props, ...props },
      }));

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'UPDATE_MULTIPLE_COMPONENT_PROPS': {
      const { ids, props } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = updateMultipleNodesInTree(currentTree, ids, (node) => ({
        ...node,
        props: { ...node.props, ...props },
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
        // Range selection: select all nodes between last selected and clicked node
        const flatNodes = flattenTree(treeToUse);
        const lastSelectedId = state.selectedNodeIds[state.selectedNodeIds.length - 1];
        const lastIndex = flatNodes.findIndex(n => n.id === lastSelectedId);
        const currentIndex = flatNodes.findIndex(n => n.id === id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = flatNodes.slice(start, end + 1).map(n => n.id);
          newSelectedNodeIds = [...new Set([...state.selectedNodeIds, ...rangeIds])];
        } else {
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
        selectedNodeIds: [ROOT_VSTACK_ID],
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
        selectedNodeIds: [ROOT_VSTACK_ID],
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
