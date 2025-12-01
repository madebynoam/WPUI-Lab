import { ComponentNode, Page, Interaction, Project } from './types';

// Action types for the component tree reducer
export type ComponentTreeAction =
  // Component tree mutations
  | { type: 'UPDATE_COMPONENT_PROPS'; payload: { id: string; props: Record<string, any> } }
  | { type: 'UPDATE_MULTIPLE_COMPONENT_PROPS'; payload: { ids: string[]; props: Record<string, any> } }
  | { type: 'UPDATE_COMPONENT_NAME'; payload: { id: string; name: string } }
  | { type: 'INSERT_COMPONENT'; payload: { node: ComponentNode; parentId?: string; index?: number } }
  | { type: 'REMOVE_COMPONENT'; payload: { id: string } }
  | { type: 'DUPLICATE_COMPONENT'; payload: { id: string } }
  | { type: 'MOVE_COMPONENT'; payload: { id: string; direction: 'up' | 'down' } }
  | { type: 'REORDER_COMPONENT'; payload: { activeId: string; overId: string; position?: 'before' | 'after' | 'inside' } }
  | { type: 'SET_TREE'; payload: { tree: ComponentNode[] } }

  // Selection actions
  | { type: 'SET_SELECTED_NODE_IDS'; payload: { ids: string[] } }
  | { type: 'TOGGLE_NODE_SELECTION'; payload: { id: string; multiSelect?: boolean; rangeSelect?: boolean; allNodes?: ComponentNode[] } }

  // Page actions
  | { type: 'SET_CURRENT_PAGE'; payload: { pageId: string } }
  | { type: 'ADD_PAGE'; payload: { page: Page } }
  | { type: 'DELETE_PAGE'; payload: { pageId: string } }
  | { type: 'RENAME_PAGE'; payload: { pageId: string; name: string } }
  | { type: 'DUPLICATE_PAGE'; payload: { pageId: string } }
  | { type: 'UPDATE_PAGE_THEME'; payload: { pageId: string; theme: { primaryColor?: string; backgroundColor?: string } } }
  | { type: 'SET_PAGES'; payload: { pages: Page[] } }

  // Project actions
  | { type: 'CREATE_PROJECT'; payload: { project: Project } }
  | { type: 'SET_CURRENT_PROJECT'; payload: { projectId: string } }
  | { type: 'DELETE_PROJECT'; payload: { projectId: string } }
  | { type: 'RENAME_PROJECT'; payload: { projectId: string; name: string } }
  | { type: 'DUPLICATE_PROJECT'; payload: { projectId: string } }
  | { type: 'UPDATE_PROJECT_THEME'; payload: { theme: { primaryColor?: string; backgroundColor?: string } } }
  | { type: 'UPDATE_PROJECT_LAYOUT'; payload: { layout: { maxWidth?: number; padding?: number; spacing?: number } } }
  | { type: 'SET_PROJECTS'; payload: { projects: Project[] } }

  // Clipboard actions
  | { type: 'COPY_COMPONENT'; payload: { node: ComponentNode } }
  | { type: 'CUT_COMPONENT'; payload: { node: ComponentNode; nodeId: string } }
  | { type: 'PASTE_COMPONENT'; payload: { parentId?: string } }

  // Grid actions
  | { type: 'TOGGLE_GRID_LINES'; payload: { id: string } }
  | { type: 'SET_GRID_LINES'; payload: { gridLines: Set<string> } }

  // Play mode actions
  | { type: 'SET_PLAY_MODE'; payload: { isPlay: boolean } }

  // Interaction actions
  | { type: 'ADD_INTERACTION'; payload: { nodeId: string; interaction: Interaction } }
  | { type: 'REMOVE_INTERACTION'; payload: { nodeId: string; interactionId: string } }
  | { type: 'UPDATE_INTERACTION'; payload: { nodeId: string; interactionId: string; interaction: Omit<Interaction, 'id'> } }

  // History actions
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' }

  // Bulk actions
  | { type: 'RESET_TREE'; payload: { defaultProject: Project } };

// Metadata for actions to control history behavior
export interface ActionMetadata {
  skipHistory?: boolean;
  debounce?: boolean;
  debounceKey?: string;
}

export type ComponentTreeActionWithMetadata = ComponentTreeAction & { meta?: ActionMetadata };
