import { ComponentTreeAction } from './ComponentTreeTypes';
import { ComponentNode, Page, HistoryState } from './types';
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
  generateId,
} from './utils/treeHelpers';
import { validateTree, formatValidationErrors } from './utils/treeValidation';

// Debug flag - set to true to enable console logging
const DEBUG = false;

// State managed by the reducer
export interface ComponentTreeState {
  // Core data
  pages: Page[];
  currentPageId: string;

  // UI state
  selectedNodeIds: string[];
  gridLinesVisible: Set<string>;
  clipboard: ComponentNode | null;
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
  'UPDATE_PAGE_THEME',
  'PASTE_COMPONENT',
  'RESET_TREE',
  'SET_CURRENT_PAGE',
]);

// Actions that should be debounced (for history)
const DEBOUNCED_ACTIONS = new Set([
  'UPDATE_COMPONENT_PROPS',
  'UPDATE_COMPONENT_NAME',
  'RENAME_PAGE',
]);

/**
 * Helper to update history when state changes
 */
function updateHistory(
  state: ComponentTreeState,
  newPages: Page[],
  newCurrentPageId: string
): ComponentTreeState {
  const newPresent: HistoryState = {
    pages: JSON.parse(JSON.stringify(newPages)),
    currentPageId: newCurrentPageId,
  };

  const MAX_HISTORY = 50;
  let newPast = [...state.history.past, state.history.present];
  if (newPast.length > MAX_HISTORY) {
    newPast = newPast.slice(newPast.length - MAX_HISTORY);
  }

  return {
    ...state,
    pages: newPages,
    currentPageId: newCurrentPageId,
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
      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const newTree = updateNodeInTree(currentTree, id, (node) => ({
        ...node,
        props: { ...node.props, ...props },
      }));

      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);
      return updateHistory(state, newPages, state.currentPageId);
    }

    case 'UPDATE_MULTIPLE_COMPONENT_PROPS': {
      const { ids, props } = action.payload;
      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const newTree = updateMultipleNodesInTree(currentTree, ids, (node) => ({
        ...node,
        props: { ...node.props, ...props },
      }));

      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);
      return updateHistory(state, newPages, state.currentPageId);
    }

    case 'UPDATE_COMPONENT_NAME': {
      const { id, name } = action.payload;
      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const newTree = updateNodeInTree(currentTree, id, (node) => ({
        ...node,
        name: name || undefined,
      }));

      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);
      return updateHistory(state, newPages, state.currentPageId);
    }

    case 'INSERT_COMPONENT': {
      const { node, parentId, index } = action.payload;
      if (DEBUG) {
        console.log('[Reducer] INSERT_COMPONENT - Received node:', JSON.stringify(node, null, 2));
        console.log('[Reducer] INSERT_COMPONENT - Parent ID:', parentId, 'Index:', index);
      }

      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const newTree = insertNodeInTree(currentTree, node, parentId, index);
      if (DEBUG) {
        console.log('[Reducer] INSERT_COMPONENT - New tree after insertion:', JSON.stringify(newTree, null, 2));
      }

      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);

      return {
        ...updateHistory(state, newPages, state.currentPageId),
        selectedNodeIds: [node.id],
      };
    }

    case 'REMOVE_COMPONENT': {
      const { id } = action.payload;
      if (id === ROOT_VSTACK_ID) return state; // Prevent deletion of root

      const currentTree = getCurrentTree(state.pages, state.currentPageId);
      const newTree = removeNodeFromTree(currentTree, id);
      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);

      const newSelectedNodeIds = state.selectedNodeIds.filter(selectedId => selectedId !== id);
      const selectedIds = newSelectedNodeIds.length > 0 ? newSelectedNodeIds : [ROOT_VSTACK_ID];

      return {
        ...updateHistory(state, newPages, state.currentPageId),
        selectedNodeIds: selectedIds,
      };
    }

    case 'DUPLICATE_COMPONENT': {
      const { id } = action.payload;
      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const { tree: newTree, newNodeId } = duplicateNodeInTree(currentTree, id);
      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);

      return {
        ...updateHistory(state, newPages, state.currentPageId),
        selectedNodeIds: newNodeId ? [newNodeId] : state.selectedNodeIds,
      };
    }

    case 'MOVE_COMPONENT': {
      const { id, direction } = action.payload;
      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const newTree = moveNodeInTree(currentTree, id, direction);
      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);

      return updateHistory(state, newPages, state.currentPageId);
    }

    case 'REORDER_COMPONENT': {
      const { activeId, overId, position } = action.payload;
      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const newTree = reorderNodeInTree(currentTree, activeId, overId, position);
      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);

      return updateHistory(state, newPages, state.currentPageId);
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

      const newPages = updateTreeForPage(state.pages, state.currentPageId, tree);
      return updateHistory(state, newPages, state.currentPageId);
    }

    // ===== Selection Actions =====

    case 'SET_SELECTED_NODE_IDS': {
      const { ids } = action.payload;
      return { ...state, selectedNodeIds: ids };
    }

    case 'TOGGLE_NODE_SELECTION': {
      const { id, multiSelect, rangeSelect, allNodes } = action.payload;
      const currentTree = getCurrentTree(state.pages, state.currentPageId);
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

    case 'SET_CURRENT_PAGE': {
      const { pageId } = action.payload;
      return updateHistory(state, state.pages, pageId);
    }

    case 'ADD_PAGE': {
      const { page } = action.payload;
      const newPages = [...state.pages, page];
      return {
        ...updateHistory(state, newPages, page.id),
        selectedNodeIds: [ROOT_VSTACK_ID],
        gridLinesVisible: new Set(),
      };
    }

    case 'DELETE_PAGE': {
      const { pageId } = action.payload;
      if (state.pages.length === 1) return state; // Don't delete last page

      const newPages = state.pages.filter(p => p.id !== pageId);
      const newCurrentPageId = state.currentPageId === pageId
        ? newPages[0].id
        : state.currentPageId;

      return {
        ...updateHistory(state, newPages, newCurrentPageId),
        selectedNodeIds: [ROOT_VSTACK_ID],
      };
    }

    case 'RENAME_PAGE': {
      const { pageId, name } = action.payload;
      const newPages = state.pages.map(page =>
        page.id === pageId ? { ...page, name } : page
      );
      return updateHistory(state, newPages, state.currentPageId);
    }

    case 'DUPLICATE_PAGE': {
      const { pageId } = action.payload;
      const pageToDuplicate = state.pages.find(p => p.id === pageId);
      if (!pageToDuplicate) return state;

      const newPageId = `page-${Date.now()}`;
      const newPage: Page = {
        ...JSON.parse(JSON.stringify(pageToDuplicate)),
        id: newPageId,
        name: `${pageToDuplicate.name} Copy`,
      };

      const newPages = [...state.pages, newPage];
      return {
        ...updateHistory(state, newPages, newPageId),
        selectedNodeIds: [ROOT_VSTACK_ID],
      };
    }

    case 'UPDATE_PAGE_THEME': {
      const { pageId, theme } = action.payload;
      const newPages = state.pages.map(page =>
        page.id === pageId
          ? { ...page, theme: { ...page.theme, ...theme } }
          : page
      );
      return updateHistory(state, newPages, state.currentPageId);
    }

    case 'SET_PAGES': {
      const { pages } = action.payload;
      return { ...state, pages };
    }

    // ===== Clipboard Actions =====

    case 'COPY_COMPONENT': {
      const { node } = action.payload;
      return { ...state, clipboard: JSON.parse(JSON.stringify(node)) };
    }

    case 'PASTE_COMPONENT': {
      let { parentId } = action.payload;
      if (!state.clipboard) return state;

      // If no parentId specified, use smart paste logic
      if (!parentId && state.selectedNodeIds.length > 0) {
        const selectedId = state.selectedNodeIds[0];
        const currentTree = getCurrentTree(state.pages, state.currentPageId);

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
          // Import componentRegistry to check if node accepts children
          const { componentRegistry } = require('./componentRegistry');
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
      const currentTree = getCurrentTree(state.pages, state.currentPageId);
      const newTree = insertNodeInTree(currentTree, newNode, parentId);
      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);

      return {
        ...updateHistory(state, newPages, state.currentPageId),
        selectedNodeIds: [newNode.id],
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
      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const newTree = updateNodeInTree(currentTree, nodeId, (node) => ({
        ...node,
        interactions: [...(node.interactions || []), interaction],
      }));

      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);
      return { ...state, pages: newPages };
    }

    case 'REMOVE_INTERACTION': {
      const { nodeId, interactionId } = action.payload;
      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const newTree = updateNodeInTree(currentTree, nodeId, (node) => ({
        ...node,
        interactions: node.interactions?.filter(i => i.id !== interactionId) || [],
      }));

      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);
      return { ...state, pages: newPages };
    }

    case 'UPDATE_INTERACTION': {
      const { nodeId, interactionId, interaction } = action.payload;
      const currentTree = getCurrentTree(state.pages, state.currentPageId);

      const newTree = updateNodeInTree(currentTree, nodeId, (node) => ({
        ...node,
        interactions: node.interactions?.map(i =>
          i.id === interactionId ? { ...i, ...interaction } : i
        ) || [],
      }));

      const newPages = updateTreeForPage(state.pages, state.currentPageId, newTree);
      return { ...state, pages: newPages };
    }

    // ===== History Actions =====

    case 'UNDO': {
      if (state.history.past.length === 0) return state;

      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, state.history.past.length - 1);

      return {
        ...state,
        pages: previous.pages,
        currentPageId: previous.currentPageId,
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
        pages: next.pages,
        currentPageId: next.currentPageId,
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

    // ===== Bulk Actions =====

    case 'RESET_TREE': {
      const { defaultPage } = action.payload;
      return {
        ...state,
        pages: [defaultPage],
        currentPageId: defaultPage.id,
        selectedNodeIds: [ROOT_VSTACK_ID],
        gridLinesVisible: new Set(),
        history: {
          past: [],
          present: {
            pages: [defaultPage],
            currentPageId: defaultPage.id,
          },
          future: [],
        },
      };
    }

    default:
      return state;
  }
}
