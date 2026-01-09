import { ComponentTreeAction } from './ComponentTreeTypes';
import { ComponentNode, Page, Project, HistoryState } from './types';
import { componentRegistry } from '@/componentRegistry';
import {
  ROOT_GRID_ID,
  getCurrentTree,
  findNodeById,
  updateNodeInTree,
  updateMultipleNodesInTree,
  insertNodeInTree,
  removeNodeFromTree,
  duplicateNodeInTree,
  moveNodeInTree,
  reorderNodeInTree,
  updateTreeForPage,
  findParent,
} from './utils/treeHelpers';
import { generateId } from './utils/idGenerator';
import { validateTree, formatValidationErrors } from './utils/treeValidation';
import { normalizeComponentNode } from './utils/normalizeComponent';

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
  isAgentExecuting: boolean; // Disable UI interactions while AI agent is working
  editingMode: 'selection' | 'text';
  editingGlobalComponentId: string | null; // ID of global component being edited in isolation mode

  // Cloud save state
  isDirty: boolean; // True when there are unsaved changes

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
  'UNGROUP_COMPONENTS',
  'SWAP_LAYOUT_TYPE',
  'MAKE_GLOBAL_COMPONENT',
  'INSERT_GLOBAL_COMPONENT_INSTANCE',
  'UPDATE_GLOBAL_COMPONENT',
  'DELETE_GLOBAL_COMPONENT',
  'DETACH_GLOBAL_COMPONENT_INSTANCE',
  'ADD_PAGE',
  'DELETE_PAGE',
  'RENAME_PAGE',
  'DUPLICATE_PAGE',
  'REORDER_PAGES',
  'UPDATE_PAGE_THEME',
  'UPDATE_PROJECT_THEME',
  'UPDATE_PROJECT_LAYOUT',
  'UPDATE_PROJECT_DESCRIPTION',
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


// Actions that modify content and should mark the document as dirty
// Excludes navigation actions (SET_CURRENT_PAGE, SET_CURRENT_PROJECT) that don't change content
const CONTENT_MODIFYING_ACTIONS = new Set(
  Array.from(HISTORY_ACTIONS).filter(
    action => action !== 'SET_CURRENT_PAGE' && action !== 'SET_CURRENT_PROJECT'
  )
);

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
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // If editing a global component in isolation mode, update it directly
      if (state.editingGlobalComponentId) {
        const globalComponents = currentProject.globalComponents || [];
        const globalComponent = globalComponents.find(gc => gc.id === state.editingGlobalComponentId);

        if (!globalComponent) {
          console.warn('[Reducer] UPDATE_COMPONENT_PROPS in isolation: Global component not found');
          return state;
        }

        // Separate node-level properties from component props
        const { width, responsiveColumns, ...componentProps } = props;

        // Update the global component tree
        const updatedGlobalComponent = updateNodeInTree([globalComponent], id, (node) => ({
          ...node,
          ...(width !== undefined ? { width } : {}),
          ...(responsiveColumns !== undefined ? { responsiveColumns } : {}),
          props: { ...node.props, ...componentProps },
        }))[0];

        // Update in globalComponents array
        const newGlobalComponents = globalComponents.map(gc =>
          gc.id === state.editingGlobalComponentId ? updatedGlobalComponent : gc
        );

        // Update all instances across all pages
        const updateInstancesInTree = (tree: ComponentNode[]): ComponentNode[] => {
          return tree.map(node => {
            if (node.isGlobalInstance && node.globalComponentId === state.editingGlobalComponentId) {
              const cloneWithMetadata = (sourceNode: ComponentNode, targetId: string): ComponentNode => {
                return {
                  ...sourceNode,
                  id: targetId,
                  isGlobalInstance: true,
                  globalComponentId: state.editingGlobalComponentId,
                  props: { ...sourceNode.props },
                  children: sourceNode.children?.map(child => cloneWithMetadata(child, generateId())),
                };
              };
              return cloneWithMetadata(updatedGlobalComponent, node.id);
            }
            if (node.children) {
              return { ...node, children: updateInstancesInTree(node.children) };
            }
            return node;
          });
        };

        const updatedPages = currentProject.pages.map(page => ({
          ...page,
          tree: updateInstancesInTree(page.tree),
        }));

        const updatedProject = {
          ...currentProject,
          globalComponents: newGlobalComponents,
          pages: updatedPages,
          lastModified: Date.now(),
        };

        const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
        return updateHistory(state, newProjects, state.currentProjectId);
      }

      // Normal mode: update page tree
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      // Separate node-level properties from component props
      const { width, responsiveColumns, ...componentProps } = props;

      const newTree = updateNodeInTree(currentTree, id, (node) => ({
        ...node,
        ...(width !== undefined ? { width } : {}),
        ...(responsiveColumns !== undefined ? { responsiveColumns } : {}),
        props: { ...node.props, ...componentProps },
      }));

      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'UPDATE_MULTIPLE_COMPONENT_PROPS': {
      const { ids, props } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // If editing a global component in isolation mode, update it directly
      if (state.editingGlobalComponentId) {
        const globalComponents = currentProject.globalComponents || [];
        const globalComponent = globalComponents.find(gc => gc.id === state.editingGlobalComponentId);

        if (!globalComponent) {
          console.warn('[Reducer] UPDATE_MULTIPLE_COMPONENT_PROPS in isolation: Global component not found');
          return state;
        }

        // Separate node-level properties from component props
        const { width, responsiveColumns, ...componentProps } = props;

        // Update the global component tree
        const updatedGlobalComponent = updateMultipleNodesInTree([globalComponent], ids, (node) => ({
          ...node,
          ...(width !== undefined ? { width } : {}),
          ...(responsiveColumns !== undefined ? { responsiveColumns } : {}),
          props: { ...node.props, ...componentProps },
        }))[0];

        // Update in globalComponents array
        const newGlobalComponents = globalComponents.map(gc =>
          gc.id === state.editingGlobalComponentId ? updatedGlobalComponent : gc
        );

        // Update all instances across all pages
        const updateInstancesInTree = (tree: ComponentNode[]): ComponentNode[] => {
          return tree.map(node => {
            if (node.isGlobalInstance && node.globalComponentId === state.editingGlobalComponentId) {
              const cloneWithMetadata = (sourceNode: ComponentNode, targetId: string): ComponentNode => {
                return {
                  ...sourceNode,
                  id: targetId,
                  isGlobalInstance: true,
                  globalComponentId: state.editingGlobalComponentId,
                  props: { ...sourceNode.props },
                  children: sourceNode.children?.map(child => cloneWithMetadata(child, generateId())),
                };
              };
              return cloneWithMetadata(updatedGlobalComponent, node.id);
            }
            if (node.children) {
              return { ...node, children: updateInstancesInTree(node.children) };
            }
            return node;
          });
        };

        const updatedPages = currentProject.pages.map(page => ({
          ...page,
          tree: updateInstancesInTree(page.tree),
        }));

        const updatedProject = {
          ...currentProject,
          globalComponents: newGlobalComponents,
          pages: updatedPages,
          lastModified: Date.now(),
        };

        const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
        return updateHistory(state, newProjects, state.currentProjectId);
      }

      // Normal mode: update page tree
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      // Separate node-level properties from component props
      const { width, responsiveColumns, ...componentProps } = props;

      const newTree = updateMultipleNodesInTree(currentTree, ids, (node) => ({
        ...node,
        ...(width !== undefined ? { width } : {}),
        ...(responsiveColumns !== undefined ? { responsiveColumns } : {}),
        props: { ...node.props, ...componentProps },
      }));

      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'UPDATE_COMPONENT_NAME': {
      const { id, name } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // If editing a global component in isolation mode, update it directly
      if (state.editingGlobalComponentId) {
        const globalComponents = currentProject.globalComponents || [];
        const globalComponent = globalComponents.find(gc => gc.id === state.editingGlobalComponentId);

        if (!globalComponent) {
          console.warn('[Reducer] UPDATE_COMPONENT_NAME in isolation: Global component not found');
          return state;
        }

        // Update the global component tree
        const updatedGlobalComponent = updateNodeInTree([globalComponent], id, (node) => ({
          ...node,
          name: name || undefined,
        }))[0];

        // Update in globalComponents array
        const newGlobalComponents = globalComponents.map(gc =>
          gc.id === state.editingGlobalComponentId ? updatedGlobalComponent : gc
        );

        // Update all instances across all pages
        const updateInstancesInTree = (tree: ComponentNode[]): ComponentNode[] => {
          return tree.map(node => {
            if (node.isGlobalInstance && node.globalComponentId === state.editingGlobalComponentId) {
              const cloneWithMetadata = (sourceNode: ComponentNode, targetId: string): ComponentNode => {
                return {
                  ...sourceNode,
                  id: targetId,
                  isGlobalInstance: true,
                  globalComponentId: state.editingGlobalComponentId,
                  props: { ...sourceNode.props },
                  children: sourceNode.children?.map(child => cloneWithMetadata(child, generateId())),
                };
              };
              return cloneWithMetadata(updatedGlobalComponent, node.id);
            }
            if (node.children) {
              return { ...node, children: updateInstancesInTree(node.children) };
            }
            return node;
          });
        };

        const updatedPages = currentProject.pages.map(page => ({
          ...page,
          tree: updateInstancesInTree(page.tree),
        }));

        const updatedProject = {
          ...currentProject,
          globalComponents: newGlobalComponents,
          pages: updatedPages,
          lastModified: Date.now(),
        };

        const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
        return updateHistory(state, newProjects, state.currentProjectId);
      }

      // Normal mode: update page tree
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = updateNodeInTree(currentTree, id, (node) => ({
        ...node,
        name: name || undefined,
      }));

      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'INSERT_COMPONENT': {
      const { node, parentId, index } = action.payload;

      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      // Normalize node before insertion to ensure defaultProps are applied
      const normalizedNode = normalizeComponentNode(node);

      const newTree = insertNodeInTree(currentTree, normalizedNode, parentId, index);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      // Smart selection: if parent is an insertion container, keep it selected
      const effectiveParentId = parentId || ROOT_GRID_ID;
      const parentNode = findNodeById(newTree, effectiveParentId);
      const isInsertionContainer = parentNode && [
        'Grid', 'VStack', 'HStack', 'Flex', 'FlexBlock', 'FlexItem',
        'CardBody', 'CardHeader', 'CardFooter', 'TabPanel', 'PanelBody', 'PanelRow'
      ].includes(parentNode.type);

      const newSelectedNodeIds = isInsertionContainer ? [effectiveParentId] : [node.id];

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: newSelectedNodeIds,
      };
    }

    case 'REMOVE_COMPONENT': {
      const { id } = action.payload;
      if (id === ROOT_GRID_ID) return state; // Prevent deletion of root

      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);
      const newTree = removeNodeFromTree(currentTree, id);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      const newSelectedNodeIds = state.selectedNodeIds.filter(selectedId => selectedId !== id);
      const selectedIds = newSelectedNodeIds.length > 0 ? newSelectedNodeIds : [ROOT_GRID_ID];

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
      if (ids.length < 1) return state; // Need at least 1 item to group

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
      const parent = firstParentId ? findNodeInTree(currentTree, firstParentId) : currentTree.find(n => n.id === ROOT_GRID_ID);
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

      // Get gridColumnSpan from first selected item (if parent is Grid)
      const firstSelectedNode = parent.children[selectedIndices[0]];
      const gridColumnSpan = firstSelectedNode?.props?.gridColumnSpan;
      const isParentGrid = parent.type === 'Grid';

      // Create container: HStack for single item, VStack for multiple items
      const containerType = ids.length === 1 ? 'HStack' : 'VStack';
      const containerNode: ComponentNode = {
        id: generateId(),
        type: containerType,
        props: {
          spacing: containerSpacing,
          alignment: containerType === 'HStack' ? 'center' : 'stretch',
          // Copy gridColumnSpan from first item if it exists (for Grid children)
          ...(gridColumnSpan ? { gridColumnSpan } : {}),
          // Set height: 'auto' for Grid children to match PropertiesPanel default
          ...(isParentGrid ? { height: 'auto' } : {}),
        },
        // Clone children and remove their gridColumnSpan (they're now inside a container)
        children: selectedIndices.map(idx => {
          const child = JSON.parse(JSON.stringify(parent.children![idx]));
          if (child.props?.gridColumnSpan) {
            delete child.props.gridColumnSpan;
          }
          if (child.props?.gridRowSpan) {
            delete child.props.gridRowSpan;
          }
          return child;
        }),
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

    case 'UNGROUP_COMPONENTS': {
      const { id } = action.payload;
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

      // Find the container to ungroup
      const container = findNodeInTree(currentTree, id);
      if (!container) {
        console.warn('[Reducer] UNGROUP_COMPONENTS: Container not found:', id);
        return state;
      }

      // Only ungroup VStack or HStack
      if (container.type !== 'VStack' && container.type !== 'HStack') {
        console.warn('[Reducer] UNGROUP_COMPONENTS: Can only ungroup VStack or HStack, got:', container.type);
        return state;
      }

      // Container must have children to ungroup
      if (!container.children || container.children.length === 0) {
        console.warn('[Reducer] UNGROUP_COMPONENTS: Container has no children');
        return state;
      }

      // Get container's parent
      const parentId = findParentId(currentTree, id);
      const parent = parentId ? findNodeInTree(currentTree, parentId) : currentTree.find(n => n.id === ROOT_GRID_ID);

      if (!parent || !parent.children) {
        console.warn('[Reducer] UNGROUP_COMPONENTS: Parent not found');
        return state;
      }

      // Find container's position in parent
      const containerIndex = parent.children.findIndex(child => child.id === id);
      if (containerIndex === -1) {
        console.warn('[Reducer] UNGROUP_COMPONENTS: Container not found in parent');
        return state;
      }

      // If parent is a Grid, restore gridColumnSpan to children
      const isParentGrid = parent.type === 'Grid';
      const containerGridColumnSpan = container.props?.gridColumnSpan;
      const containerGridRowSpan = container.props?.gridRowSpan;

      // Clone children and restore gridColumnSpan if needed
      const childrenToInsert = container.children.map(child => {
        const clonedChild = JSON.parse(JSON.stringify(child));
        if (isParentGrid) {
          clonedChild.props = clonedChild.props || {};
          if (containerGridColumnSpan) {
            clonedChild.props.gridColumnSpan = containerGridColumnSpan;
          }
          if (containerGridRowSpan) {
            clonedChild.props.gridRowSpan = containerGridRowSpan;
          }
          // Set height: 'auto' for Grid children to match PropertiesPanel default
          clonedChild.props.height = 'auto';
        }
        return clonedChild;
      });

      // Remove the container
      let newTree = removeNodeFromTree(currentTree, id);

      // Insert children at the container's position
      for (let i = 0; i < childrenToInsert.length; i++) {
        newTree = insertNodeInTree(newTree, childrenToInsert[i], parentId || undefined, containerIndex + i);
      }

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      // Select the first ungrouped child
      const firstChildId = childrenToInsert[0]?.id;

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: firstChildId ? [firstChildId] : state.selectedNodeIds,
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

      // Grid-first: VStack/HStack are just content grouping with same props
      // Keep existing props when swapping (justify, alignment, spacing, padding)
      const newProps = {
        ...componentRegistry[newType]?.defaultProps,
        ...node.props,
      };

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

    // ===== Global Component Actions =====

    case 'MAKE_GLOBAL_COMPONENT': {
      const { nodeId, name } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // Find the node to make global
      const node = findNodeById(currentTree, nodeId);
      if (!node || node.id === ROOT_GRID_ID) {
        console.warn('[Reducer] MAKE_GLOBAL_COMPONENT: Cannot make root or non-existent node global');
        return state;
      }

      // Don't allow making instances global (must detach first)
      if (node.isGlobalInstance) {
        console.warn('[Reducer] MAKE_GLOBAL_COMPONENT: Cannot make an instance global');
        return state;
      }

      // Find the parent and index of the original node
      const parent = findParent(currentTree, nodeId);
      const parentId = parent?.id;
      const nodeIndex = parent?.children?.findIndex(child => child.id === nodeId);

      // Create global component with a clean clone and name
      const globalComponent: ComponentNode = {
        ...node,
        name: name || node.name || node.type,
        isGlobalInstance: undefined,
        globalComponentId: undefined,
      };

      // Remove original node from tree
      let newTree = removeNodeFromTree(currentTree, nodeId);

      // Create an instance of the global component with new IDs
      const cloneWithMetadata = (sourceNode: ComponentNode): ComponentNode => {
        return {
          ...sourceNode,
          id: generateId(),
          isGlobalInstance: true,
          globalComponentId: globalComponent.id,
          props: { ...sourceNode.props },
          children: sourceNode.children?.map(cloneWithMetadata),
        };
      };

      const instance = cloneWithMetadata(globalComponent);

      // Insert the instance where the original node was
      newTree = insertNodeInTree(newTree, instance, parentId, nodeIndex);

      const updatedProject = {
        ...currentProject,
        pages: updateTreeForPage(currentProject.pages, currentProject.currentPageId, newTree),
        globalComponents: [...(currentProject.globalComponents || []), globalComponent],
        lastModified: Date.now(),
      };

      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: [instance.id],
      };
    }

    case 'INSERT_GLOBAL_COMPONENT_INSTANCE': {
      const { globalComponentId, parentId, index } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // Find the global component definition
      const globalComponent = (currentProject.globalComponents || []).find(gc => gc.id === globalComponentId);
      if (!globalComponent) {
        console.warn('[Reducer] INSERT_GLOBAL_COMPONENT_INSTANCE: Global component not found');
        return state;
      }

      // Create a deep clone with new IDs and add instance metadata
      const cloneWithMetadata = (node: ComponentNode): ComponentNode => {
        return {
          ...node,
          id: generateId(),
          isGlobalInstance: true,
          globalComponentId: globalComponentId,
          props: { ...node.props },
          children: node.children?.map(cloneWithMetadata),
        };
      };

      const instance = cloneWithMetadata(globalComponent);
      const newTree = insertNodeInTree(currentTree, instance, parentId, index);

      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        selectedNodeIds: [instance.id],
      };
    }

    case 'UPDATE_GLOBAL_COMPONENT': {
      const { globalComponentId, node: updatedNode } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // Update the global component definition
      const globalComponents = currentProject.globalComponents || [];
      const globalIndex = globalComponents.findIndex(gc => gc.id === globalComponentId);

      if (globalIndex === -1) {
        console.warn('[Reducer] UPDATE_GLOBAL_COMPONENT: Global component not found');
        return state;
      }

      const newGlobalComponents = [...globalComponents];
      newGlobalComponents[globalIndex] = updatedNode;

      // Update all instances across all pages
      const updateInstancesInTree = (tree: ComponentNode[]): ComponentNode[] => {
        return tree.map(node => {
          if (node.isGlobalInstance && node.globalComponentId === globalComponentId) {
            // Clone the updated definition with the instance's ID and metadata
            const cloneWithMetadata = (sourceNode: ComponentNode, targetId: string): ComponentNode => {
              return {
                ...sourceNode,
                id: targetId,
                isGlobalInstance: true,
                globalComponentId: globalComponentId,
                props: { ...sourceNode.props },
                children: sourceNode.children?.map(child => cloneWithMetadata(child, generateId())),
              };
            };
            return cloneWithMetadata(updatedNode, node.id);
          }
          if (node.children) {
            return { ...node, children: updateInstancesInTree(node.children) };
          }
          return node;
        });
      };

      const newPages = currentProject.pages.map(page => ({
        ...page,
        tree: updateInstancesInTree(page.tree),
      }));

      const updatedProject = {
        ...currentProject,
        globalComponents: newGlobalComponents,
        pages: newPages,
      };

      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'DELETE_GLOBAL_COMPONENT': {
      const { globalComponentId } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // Remove from global components
      const globalComponents = currentProject.globalComponents || [];
      const newGlobalComponents = globalComponents.filter(gc => gc.id !== globalComponentId);

      // Detach all instances across all pages (convert to normal components)
      const detachInstancesInTree = (tree: ComponentNode[]): ComponentNode[] => {
        return tree.map(node => {
          if (node.isGlobalInstance && node.globalComponentId === globalComponentId) {
            // Remove instance metadata, converting to normal component
            const { isGlobalInstance: _gi, globalComponentId: _gcid, ...normalNode } = node;
            return {
              ...normalNode,
              children: node.children ? detachInstancesInTree(node.children) : undefined,
            };
          }
          if (node.children) {
            return { ...node, children: detachInstancesInTree(node.children) };
          }
          return node;
        });
      };

      const newPages = currentProject.pages.map(page => ({
        ...page,
        tree: detachInstancesInTree(page.tree),
      }));

      const updatedProject = {
        ...currentProject,
        globalComponents: newGlobalComponents,
        pages: newPages,
      };

      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return {
        ...updateHistory(state, newProjects, state.currentProjectId),
        editingGlobalComponentId: null, // Exit isolation mode if we were editing this component
      };
    }

    case 'DETACH_GLOBAL_COMPONENT_INSTANCE': {
      const { nodeId } = action.payload;
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      // Find the node and remove instance metadata
      const node = findNodeById(currentTree, nodeId);
      if (!node || !node.isGlobalInstance) {
        console.warn('[Reducer] DETACH_GLOBAL_COMPONENT_INSTANCE: Node is not a global instance');
        return state;
      }

      const detachNode = (tree: ComponentNode[]): ComponentNode[] => {
        return tree.map(n => {
          if (n.id === nodeId) {
            // Remove instance metadata
            const { isGlobalInstance: _gi, globalComponentId: _gcid, ...normalNode } = n;
            return normalNode;
          }
          if (n.children) {
            return { ...n, children: detachNode(n.children) };
          }
          return n;
        });
      };

      const newTree = detachNode(currentTree);

      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return updateHistory(state, newProjects, state.currentProjectId);
    }

    case 'SET_EDITING_GLOBAL_COMPONENT': {
      const { globalComponentId } = action.payload;
      return { ...state, editingGlobalComponentId: globalComponentId };
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
            newSelectedNodeIds = [ROOT_GRID_ID];
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
        selectedNodeIds: [ROOT_GRID_ID],
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

    case 'UPDATE_PAGE_CANVAS_POSITION': {
      const { pageId, position } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const newPages = currentProject.pages.map(page =>
        page.id === pageId
          ? { ...page, canvasPosition: position }
          : page
      );
      const updatedProject = { ...currentProject, pages: newPages, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      // Don't use updateHistory - canvas positions shouldn't add to undo stack
      return { ...state, projects: newProjects };
    }

    case 'UPDATE_ALL_PAGE_CANVAS_POSITIONS': {
      const { positions } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const newPages = currentProject.pages.map(page =>
        positions[page.id]
          ? { ...page, canvasPosition: positions[page.id] }
          : page
      );
      const updatedProject = { ...currentProject, pages: newPages, lastModified: Date.now() };
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
      // Don't use updateHistory - canvas positions shouldn't add to undo stack
      return { ...state, projects: newProjects };
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

    case 'UPDATE_PROJECT_DESCRIPTION': {
      const { description } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);
      const updatedProject = {
        ...currentProject,
        description: description || undefined,
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
        selectedNodeIds: [ROOT_GRID_ID],
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
          // Exception: Card should paste as sibling, not inside
          if (definition?.acceptsChildren && node.type !== 'Card') {
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

      // Normalize the pasted node to ensure defaultProps are applied
      const normalizedNode = normalizeComponentNode(newNode);

      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);
      const newTree = insertNodeInTree(currentTree, normalizedNode, parentId);

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

    case 'TOGGLE_ALL_GRID_LINES': {
      // Find current project and page
      if (!state.projects || state.projects.length === 0) {
        return state;
      }

      const currentProject = state.projects.find((p) => p.id === state.currentProjectId);
      if (!currentProject || !currentProject.pages) {
        return state;
      }

      const currentPage = currentProject.pages.find((p) => p.id === currentProject.currentPageId);
      if (!currentPage) {
        return state;
      }

      const findAllGridIds = (nodes: ComponentNode[]): string[] => {
        const gridIds: string[] = [];
        for (const node of nodes) {
          if (node.type === 'Grid') {
            gridIds.push(node.id);
          }
          if (node.children) {
            gridIds.push(...findAllGridIds(node.children));
          }
        }
        return gridIds;
      };

      const allGridIds = findAllGridIds(currentPage.tree);

      // Check if all grids are currently visible
      const allVisible = allGridIds.every((id) => state.gridLinesVisible.has(id));

      const newGridLines = new Set(state.gridLinesVisible);

      if (allVisible) {
        // Hide all grids
        allGridIds.forEach((id) => newGridLines.delete(id));
      } else {
        // Show all grids
        allGridIds.forEach((id) => newGridLines.add(id));
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

    case 'SET_AGENT_EXECUTING': {
      const { isExecuting } = action.payload;
      return { ...state, isAgentExecuting: isExecuting };
    }

    case 'SET_EDITING_MODE': {
      const { mode } = action.payload;
      return { ...state, editingMode: mode };
    }

    // ===== Interaction Actions =====

    case 'ADD_INTERACTION': {
      const { nodeId, interaction } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // If editing a global component in isolation mode, update it directly
      if (state.editingGlobalComponentId) {
        const globalComponents = currentProject.globalComponents || [];
        const globalComponent = globalComponents.find(gc => gc.id === state.editingGlobalComponentId);

        if (!globalComponent) {
          console.warn('[Reducer] ADD_INTERACTION in isolation: Global component not found');
          return state;
        }

        // Update the global component tree
        const updatedGlobalComponent = updateNodeInTree([globalComponent], nodeId, (node) => ({
          ...node,
          interactions: [...(node.interactions || []), interaction],
        }))[0];

        // Update in globalComponents array
        const newGlobalComponents = globalComponents.map(gc =>
          gc.id === state.editingGlobalComponentId ? updatedGlobalComponent : gc
        );

        // Update all instances across all pages
        const updateInstancesInTree = (tree: ComponentNode[]): ComponentNode[] => {
          return tree.map(node => {
            if (node.isGlobalInstance && node.globalComponentId === state.editingGlobalComponentId) {
              const cloneWithMetadata = (sourceNode: ComponentNode, targetId: string): ComponentNode => {
                return {
                  ...sourceNode,
                  id: targetId,
                  isGlobalInstance: true,
                  globalComponentId: state.editingGlobalComponentId,
                  props: { ...sourceNode.props },
                  children: sourceNode.children?.map(child => cloneWithMetadata(child, generateId())),
                };
              };
              return cloneWithMetadata(updatedGlobalComponent, node.id);
            }
            if (node.children) {
              return { ...node, children: updateInstancesInTree(node.children) };
            }
            return node;
          });
        };

        const updatedPages = currentProject.pages.map(page => ({
          ...page,
          tree: updateInstancesInTree(page.tree),
        }));

        const updatedProject = {
          ...currentProject,
          globalComponents: newGlobalComponents,
          pages: updatedPages,
          lastModified: Date.now(),
        };

        const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
        return { ...state, projects: newProjects };
      }

      // Normal mode: update page tree
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = updateNodeInTree(currentTree, nodeId, (node) => ({
        ...node,
        interactions: [...(node.interactions || []), interaction],
      }));

      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return { ...state, projects: newProjects };
    }

    case 'REMOVE_INTERACTION': {
      const { nodeId, interactionId } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // If editing a global component in isolation mode, update it directly
      if (state.editingGlobalComponentId) {
        const globalComponents = currentProject.globalComponents || [];
        const globalComponent = globalComponents.find(gc => gc.id === state.editingGlobalComponentId);

        if (!globalComponent) {
          console.warn('[Reducer] REMOVE_INTERACTION in isolation: Global component not found');
          return state;
        }

        // Update the global component tree
        const updatedGlobalComponent = updateNodeInTree([globalComponent], nodeId, (node) => ({
          ...node,
          interactions: node.interactions?.filter(i => i.id !== interactionId) || [],
        }))[0];

        // Update in globalComponents array
        const newGlobalComponents = globalComponents.map(gc =>
          gc.id === state.editingGlobalComponentId ? updatedGlobalComponent : gc
        );

        // Update all instances across all pages
        const updateInstancesInTree = (tree: ComponentNode[]): ComponentNode[] => {
          return tree.map(node => {
            if (node.isGlobalInstance && node.globalComponentId === state.editingGlobalComponentId) {
              const cloneWithMetadata = (sourceNode: ComponentNode, targetId: string): ComponentNode => {
                return {
                  ...sourceNode,
                  id: targetId,
                  isGlobalInstance: true,
                  globalComponentId: state.editingGlobalComponentId,
                  props: { ...sourceNode.props },
                  children: sourceNode.children?.map(child => cloneWithMetadata(child, generateId())),
                };
              };
              return cloneWithMetadata(updatedGlobalComponent, node.id);
            }
            if (node.children) {
              return { ...node, children: updateInstancesInTree(node.children) };
            }
            return node;
          });
        };

        const updatedPages = currentProject.pages.map(page => ({
          ...page,
          tree: updateInstancesInTree(page.tree),
        }));

        const updatedProject = {
          ...currentProject,
          globalComponents: newGlobalComponents,
          pages: updatedPages,
          lastModified: Date.now(),
        };

        const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
        return { ...state, projects: newProjects };
      }

      // Normal mode: update page tree
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = updateNodeInTree(currentTree, nodeId, (node) => ({
        ...node,
        interactions: node.interactions?.filter(i => i.id !== interactionId) || [],
      }));

      const updatedProject = updateTreeInProject(currentProject, newTree);
      const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);

      return { ...state, projects: newProjects };
    }

    case 'UPDATE_INTERACTION': {
      const { nodeId, interactionId, interaction } = action.payload;
      const currentProject = getCurrentProject(state.projects, state.currentProjectId);

      // If editing a global component in isolation mode, update it directly
      if (state.editingGlobalComponentId) {
        const globalComponents = currentProject.globalComponents || [];
        const globalComponent = globalComponents.find(gc => gc.id === state.editingGlobalComponentId);

        if (!globalComponent) {
          console.warn('[Reducer] UPDATE_INTERACTION in isolation: Global component not found');
          return state;
        }

        // Update the global component tree
        const updatedGlobalComponent = updateNodeInTree([globalComponent], nodeId, (node) => ({
          ...node,
          interactions: node.interactions?.map(i =>
            i.id === interactionId ? { ...i, ...interaction } : i
          ) || [],
        }))[0];

        // Update in globalComponents array
        const newGlobalComponents = globalComponents.map(gc =>
          gc.id === state.editingGlobalComponentId ? updatedGlobalComponent : gc
        );

        // Update all instances across all pages
        const updateInstancesInTree = (tree: ComponentNode[]): ComponentNode[] => {
          return tree.map(node => {
            if (node.isGlobalInstance && node.globalComponentId === state.editingGlobalComponentId) {
              const cloneWithMetadata = (sourceNode: ComponentNode, targetId: string): ComponentNode => {
                return {
                  ...sourceNode,
                  id: targetId,
                  isGlobalInstance: true,
                  globalComponentId: state.editingGlobalComponentId,
                  props: { ...sourceNode.props },
                  children: sourceNode.children?.map(child => cloneWithMetadata(child, generateId())),
                };
              };
              return cloneWithMetadata(updatedGlobalComponent, node.id);
            }
            if (node.children) {
              return { ...node, children: updateInstancesInTree(node.children) };
            }
            return node;
          });
        };

        const updatedPages = currentProject.pages.map(page => ({
          ...page,
          tree: updateInstancesInTree(page.tree),
        }));

        const updatedProject = {
          ...currentProject,
          globalComponents: newGlobalComponents,
          pages: updatedPages,
          lastModified: Date.now(),
        };

        const newProjects = updateProjectInProjects(state.projects, state.currentProjectId, () => updatedProject);
        return { ...state, projects: newProjects };
      }

      // Normal mode: update page tree
      const currentTree = getCurrentTreeFromProjects(state.projects, state.currentProjectId);

      const newTree = updateNodeInTree(currentTree, nodeId, (node) => ({
        ...node,
        interactions: node.interactions?.map(i =>
          i.id === interactionId ? { ...i, ...interaction } : i
        ) || [],
      }));

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
        selectedNodeIds: [ROOT_GRID_ID],
        gridLinesVisible: state.gridLinesVisible, // Preserve UI state across undo
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
        selectedNodeIds: [ROOT_GRID_ID],
        gridLinesVisible: state.gridLinesVisible, // Preserve UI state across redo
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
        selectedNodeIds: [ROOT_GRID_ID],
        gridLinesVisible: new Set(),
      };
    }

    case 'SET_CURRENT_PROJECT': {
      const { projectId } = action.payload;
      return {
        ...updateHistory(state, state.projects, projectId),
        selectedNodeIds: [ROOT_GRID_ID],
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
        selectedNodeIds: [ROOT_GRID_ID],
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
        selectedNodeIds: [ROOT_GRID_ID],
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
        selectedNodeIds: [ROOT_GRID_ID],
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
        selectedNodeIds: [ROOT_GRID_ID],
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

    case 'MARK_SAVED':
      return { ...state, isDirty: false };

    case 'MARK_DIRTY':
      return { ...state, isDirty: true };

    default:
      return state;
  }

  // This code is unreachable but TypeScript doesn't know that
  // The actual isDirty logic is handled in the wrapper function below
}

/**
 * Wrapper that sets isDirty for content-modifying actions
 */
export function componentTreeReducerWithDirtyTracking(
  state: ComponentTreeState,
  action: ComponentTreeAction
): ComponentTreeState {
  const newState = componentTreeReducer(state, action);

  // If state changed and action modifies content, mark as dirty
  if (newState !== state && CONTENT_MODIFYING_ACTIONS.has(action.type)) {
    return { ...newState, isDirty: true };
  }

  return newState;
}
