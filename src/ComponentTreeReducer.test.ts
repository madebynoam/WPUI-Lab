import {
  componentTreeReducer,
  componentTreeReducerWithDirtyTracking,
  ComponentTreeState,
} from './ComponentTreeReducer';
import { ComponentTreeAction } from './ComponentTreeTypes';
import { ComponentNode, Project, Page } from './types';
import { ROOT_GRID_ID } from './utils/treeHelpers';

// Mock componentRegistry
jest.mock('@/componentRegistry', () => ({
  componentRegistry: {
    Grid: { acceptsChildren: true, defaultProps: { columns: 12, gap: 4 } },
    VStack: { acceptsChildren: true, defaultProps: { spacing: 4 } },
    HStack: { acceptsChildren: true, defaultProps: { spacing: 4, alignment: 'center' } },
    Card: { acceptsChildren: true, defaultProps: {} },
    CardBody: { acceptsChildren: true, defaultProps: {} },
    Button: { acceptsChildren: false, defaultProps: { variant: 'primary' } },
    Text: { acceptsChildren: false, defaultProps: {} },
    Heading: { acceptsChildren: false, defaultProps: { level: 2 } },
  },
}));

// Mock generateId
jest.mock('./utils/idGenerator', () => {
  let counter = 0;
  return {
    generateId: jest.fn(() => `test-id-${++counter}`),
  };
});

// Mock normalizeComponentNode
jest.mock('./utils/normalizeComponent', () => ({
  normalizeComponentNode: jest.fn((node: ComponentNode) => node),
}));

// Mock validateTree to always return valid
jest.mock('./utils/treeValidation', () => ({
  validateTree: jest.fn(() => ({ valid: true, errors: [] })),
  formatValidationErrors: jest.fn(() => 'Tree is valid'),
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  const idGenerator = require('./utils/idGenerator');
  let counter = 0;
  idGenerator.generateId.mockImplementation(() => `test-id-${++counter}`);
});

// Helper to create test fixtures
const createRootGrid = (children: ComponentNode[] = []): ComponentNode => ({
  id: ROOT_GRID_ID,
  type: 'Grid',
  props: { columns: 12, gap: 4 },
  children,
  interactions: [],
});

const createButton = (id: string, text = 'Button'): ComponentNode => ({
  id,
  type: 'Button',
  props: { text, variant: 'primary' },
  children: [],
  interactions: [],
});

const createVStack = (id: string, children: ComponentNode[] = []): ComponentNode => ({
  id,
  type: 'VStack',
  props: { spacing: 4 },
  children,
  interactions: [],
});

const createPage = (id: string, name: string, tree: ComponentNode[]): Page => ({
  id,
  name,
  tree,
  theme: { primaryColor: '#3858e9', backgroundColor: '#ffffff' },
});

const createProject = (id: string, name: string, pages: Page[]): Project => ({
  id,
  name,
  version: 3,
  pages,
  currentPageId: pages[0]?.id || 'page-1',
  createdAt: Date.now(),
  lastModified: Date.now(),
});

const createInitialState = (tree: ComponentNode[] = [createRootGrid()]): ComponentTreeState => {
  const page = createPage('page-1', 'Home', tree);
  const project = createProject('project-1', 'Test Project', [page]);

  return {
    projects: [project],
    currentProjectId: project.id,
    selectedNodeIds: [ROOT_GRID_ID],
    gridLinesVisible: new Set(),
    clipboard: null,
    cutNodeId: null,
    isPlayMode: false,
    isAgentExecuting: false,
    editingMode: 'selection',
    isDirty: false,
    history: {
      past: [],
      present: { projects: [project], currentProjectId: project.id },
      future: [],
    },
  };
};

describe('componentTreeReducer', () => {
  describe('Component mutations', () => {
    describe('UPDATE_COMPONENT_PROPS', () => {
      it('updates props of a component', () => {
        const button = createButton('btn-1', 'Click');
        const state = createInitialState([createRootGrid([button])]);

        const action: ComponentTreeAction = {
          type: 'UPDATE_COMPONENT_PROPS',
          payload: { id: 'btn-1', props: { text: 'Updated' } },
        };

        const newState = componentTreeReducer(state, action);

        const updatedButton = newState.projects[0].pages[0].tree[0].children![0];
        expect(updatedButton.props.text).toBe('Updated');
      });

      it('merges new props with existing props', () => {
        const button = createButton('btn-1', 'Click');
        const state = createInitialState([createRootGrid([button])]);

        const action: ComponentTreeAction = {
          type: 'UPDATE_COMPONENT_PROPS',
          payload: { id: 'btn-1', props: { disabled: true } },
        };

        const newState = componentTreeReducer(state, action);

        const updatedButton = newState.projects[0].pages[0].tree[0].children![0];
        expect(updatedButton.props.text).toBe('Click'); // Original preserved
        expect(updatedButton.props.disabled).toBe(true); // New prop added
      });

      it('adds to history', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);

        const action: ComponentTreeAction = {
          type: 'UPDATE_COMPONENT_PROPS',
          payload: { id: 'btn-1', props: { text: 'Updated' } },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.history.past.length).toBe(1);
      });
    });

    describe('UPDATE_MULTIPLE_COMPONENT_PROPS', () => {
      it('updates multiple components at once', () => {
        const state = createInitialState([
          createRootGrid([
            createButton('btn-1'),
            createButton('btn-2'),
            createButton('btn-3'),
          ]),
        ]);

        const action: ComponentTreeAction = {
          type: 'UPDATE_MULTIPLE_COMPONENT_PROPS',
          payload: { ids: ['btn-1', 'btn-3'], props: { variant: 'secondary' } },
        };

        const newState = componentTreeReducer(state, action);

        const children = newState.projects[0].pages[0].tree[0].children!;
        expect(children[0].props.variant).toBe('secondary');
        expect(children[1].props.variant).toBe('primary'); // Unchanged
        expect(children[2].props.variant).toBe('secondary');
      });
    });

    describe('UPDATE_COMPONENT_NAME', () => {
      it('updates component name', () => {
        const button = createButton('btn-1');
        const state = createInitialState([createRootGrid([button])]);

        const action: ComponentTreeAction = {
          type: 'UPDATE_COMPONENT_NAME',
          payload: { id: 'btn-1', name: 'Submit Button' },
        };

        const newState = componentTreeReducer(state, action);

        const updatedButton = newState.projects[0].pages[0].tree[0].children![0];
        expect(updatedButton.name).toBe('Submit Button');
      });

      it('clears name when empty string provided', () => {
        const button: ComponentNode = { ...createButton('btn-1'), name: 'Old Name' };
        const state = createInitialState([createRootGrid([button])]);

        const action: ComponentTreeAction = {
          type: 'UPDATE_COMPONENT_NAME',
          payload: { id: 'btn-1', name: '' },
        };

        const newState = componentTreeReducer(state, action);

        const updatedButton = newState.projects[0].pages[0].tree[0].children![0];
        expect(updatedButton.name).toBeUndefined();
      });
    });

    describe('INSERT_COMPONENT', () => {
      it('inserts component at end of root by default', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);
        const newButton = createButton('btn-2');

        const action: ComponentTreeAction = {
          type: 'INSERT_COMPONENT',
          payload: { node: newButton },
        };

        const newState = componentTreeReducer(state, action);

        const children = newState.projects[0].pages[0].tree[0].children!;
        expect(children).toHaveLength(2);
        expect(children[1].id).toBe('btn-2');
      });

      it('inserts component at specific index', () => {
        const state = createInitialState([
          createRootGrid([createButton('btn-1'), createButton('btn-3')]),
        ]);
        const newButton = createButton('btn-2');

        const action: ComponentTreeAction = {
          type: 'INSERT_COMPONENT',
          payload: { node: newButton, parentId: ROOT_GRID_ID, index: 1 },
        };

        const newState = componentTreeReducer(state, action);

        const children = newState.projects[0].pages[0].tree[0].children!;
        expect(children[1].id).toBe('btn-2');
      });

      it('keeps parent selected when inserting into container', () => {
        // Smart selection: inserting into containers (Grid, VStack, etc.) keeps parent selected
        const state = createInitialState([createRootGrid()]);
        const newButton = createButton('btn-1');

        const action: ComponentTreeAction = {
          type: 'INSERT_COMPONENT',
          payload: { node: newButton },
        };

        const newState = componentTreeReducer(state, action);

        // Grid is an insertion container, so it stays selected
        expect(newState.selectedNodeIds).toContain(ROOT_GRID_ID);
      });

      it('selects new component when inserting into non-container parent', () => {
        // When the parent is not an insertion container (e.g., Card), select the new node
        const card: ComponentNode = {
          id: 'card-1',
          type: 'Card',
          props: {},
          children: [],
          interactions: [],
        };
        const state = createInitialState([createRootGrid([card])]);
        const newButton = createButton('btn-1');

        const action: ComponentTreeAction = {
          type: 'INSERT_COMPONENT',
          payload: { node: newButton, parentId: 'card-1' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.selectedNodeIds).toContain('btn-1');
      });
    });

    describe('REMOVE_COMPONENT', () => {
      it('removes component from parent', () => {
        const state = createInitialState([
          createRootGrid([createButton('btn-1'), createButton('btn-2')]),
        ]);

        const action: ComponentTreeAction = {
          type: 'REMOVE_COMPONENT',
          payload: { id: 'btn-1' },
        };

        const newState = componentTreeReducer(state, action);

        const children = newState.projects[0].pages[0].tree[0].children!;
        expect(children).toHaveLength(1);
        expect(children[0].id).toBe('btn-2');
      });

      it('prevents removal of root grid', () => {
        const state = createInitialState([createRootGrid()]);

        const action: ComponentTreeAction = {
          type: 'REMOVE_COMPONENT',
          payload: { id: ROOT_GRID_ID },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects[0].pages[0].tree[0].id).toBe(ROOT_GRID_ID);
      });

      it('clears selection of removed component', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);
        state.selectedNodeIds = ['btn-1'];

        const action: ComponentTreeAction = {
          type: 'REMOVE_COMPONENT',
          payload: { id: 'btn-1' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.selectedNodeIds).not.toContain('btn-1');
      });
    });

    describe('DUPLICATE_COMPONENT', () => {
      it('duplicates component', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);

        const action: ComponentTreeAction = {
          type: 'DUPLICATE_COMPONENT',
          payload: { id: 'btn-1' },
        };

        const newState = componentTreeReducer(state, action);

        const children = newState.projects[0].pages[0].tree[0].children!;
        expect(children).toHaveLength(2);
      });

      it('selects the duplicated component', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);

        const action: ComponentTreeAction = {
          type: 'DUPLICATE_COMPONENT',
          payload: { id: 'btn-1' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.selectedNodeIds[0]).not.toBe('btn-1');
      });
    });

    describe('MOVE_COMPONENT', () => {
      it('moves component up', () => {
        const state = createInitialState([
          createRootGrid([createButton('btn-1'), createButton('btn-2')]),
        ]);

        const action: ComponentTreeAction = {
          type: 'MOVE_COMPONENT',
          payload: { id: 'btn-2', direction: 'up' },
        };

        const newState = componentTreeReducer(state, action);

        const children = newState.projects[0].pages[0].tree[0].children!;
        expect(children[0].id).toBe('btn-2');
        expect(children[1].id).toBe('btn-1');
      });

      it('moves component down', () => {
        const state = createInitialState([
          createRootGrid([createButton('btn-1'), createButton('btn-2')]),
        ]);

        const action: ComponentTreeAction = {
          type: 'MOVE_COMPONENT',
          payload: { id: 'btn-1', direction: 'down' },
        };

        const newState = componentTreeReducer(state, action);

        const children = newState.projects[0].pages[0].tree[0].children!;
        expect(children[0].id).toBe('btn-2');
        expect(children[1].id).toBe('btn-1');
      });
    });
  });

  describe('Clipboard operations', () => {
    describe('COPY_COMPONENT', () => {
      it('copies component to clipboard', () => {
        const button = createButton('btn-1');
        const state = createInitialState([createRootGrid([button])]);

        const action: ComponentTreeAction = {
          type: 'COPY_COMPONENT',
          payload: { node: button },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.clipboard).toBeDefined();
        expect(newState.clipboard?.type).toBe('Button');
        expect(newState.cutNodeId).toBeNull();
      });
    });

    describe('CUT_COMPONENT', () => {
      it('cuts component to clipboard and removes from tree', () => {
        const button = createButton('btn-1');
        const state = createInitialState([createRootGrid([button])]);

        const action: ComponentTreeAction = {
          type: 'CUT_COMPONENT',
          payload: { node: button, nodeId: 'btn-1' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.clipboard).toBeDefined();
        expect(newState.cutNodeId).toBe('btn-1');
        expect(newState.projects[0].pages[0].tree[0].children).toHaveLength(0);
      });
    });

    describe('PASTE_COMPONENT', () => {
      it('pastes component from clipboard', () => {
        const button = createButton('btn-1');
        const state = createInitialState([createRootGrid()]);
        state.clipboard = button;

        const action: ComponentTreeAction = {
          type: 'PASTE_COMPONENT',
          payload: {},
        };

        const newState = componentTreeReducer(state, action);

        const children = newState.projects[0].pages[0].tree[0].children!;
        expect(children).toHaveLength(1);
      });

      it('does nothing if clipboard is empty', () => {
        const state = createInitialState([createRootGrid()]);
        state.clipboard = null;

        const action: ComponentTreeAction = {
          type: 'PASTE_COMPONENT',
          payload: {},
        };

        const newState = componentTreeReducer(state, action);

        expect(newState).toBe(state);
      });

      it('clears cutNodeId after paste', () => {
        const button = createButton('btn-1');
        const state = createInitialState([createRootGrid()]);
        state.clipboard = button;
        state.cutNodeId = 'btn-original';

        const action: ComponentTreeAction = {
          type: 'PASTE_COMPONENT',
          payload: {},
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.cutNodeId).toBeNull();
      });
    });
  });

  describe('Page management', () => {
    describe('SET_CURRENT_PAGE', () => {
      it('switches to specified page', () => {
        const page1 = createPage('page-1', 'Home', [createRootGrid()]);
        const page2 = createPage('page-2', 'About', [createRootGrid()]);
        const project = createProject('project-1', 'Test', [page1, page2]);
        const state = createInitialState();
        state.projects = [project];

        const action: ComponentTreeAction = {
          type: 'SET_CURRENT_PAGE',
          payload: { pageId: 'page-2' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects[0].currentPageId).toBe('page-2');
      });
    });

    describe('ADD_PAGE', () => {
      it('adds new page', () => {
        const state = createInitialState();
        const newPage = createPage('page-2', 'About', [createRootGrid()]);

        const action: ComponentTreeAction = {
          type: 'ADD_PAGE',
          payload: { page: newPage },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects[0].pages).toHaveLength(2);
        expect(newState.projects[0].currentPageId).toBe('page-2');
      });

      it('clears selection when adding page', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);
        state.selectedNodeIds = ['btn-1'];

        const action: ComponentTreeAction = {
          type: 'ADD_PAGE',
          payload: { page: createPage('page-2', 'About', [createRootGrid()]) },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.selectedNodeIds).toEqual([]);
      });
    });

    describe('DELETE_PAGE', () => {
      it('deletes page', () => {
        const page1 = createPage('page-1', 'Home', [createRootGrid()]);
        const page2 = createPage('page-2', 'About', [createRootGrid()]);
        const project = createProject('project-1', 'Test', [page1, page2]);
        const state = createInitialState();
        state.projects = [project];

        const action: ComponentTreeAction = {
          type: 'DELETE_PAGE',
          payload: { pageId: 'page-2' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects[0].pages).toHaveLength(1);
      });

      it('prevents deletion of last page', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = {
          type: 'DELETE_PAGE',
          payload: { pageId: 'page-1' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects[0].pages).toHaveLength(1);
      });

      it('switches to another page if current page is deleted', () => {
        const page1 = createPage('page-1', 'Home', [createRootGrid()]);
        const page2 = createPage('page-2', 'About', [createRootGrid()]);
        const project = createProject('project-1', 'Test', [page1, page2]);
        project.currentPageId = 'page-2';
        const state = createInitialState();
        state.projects = [project];
        state.currentProjectId = project.id;

        const action: ComponentTreeAction = {
          type: 'DELETE_PAGE',
          payload: { pageId: 'page-2' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects[0].currentPageId).toBe('page-1');
      });
    });

    describe('RENAME_PAGE', () => {
      it('renames page', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = {
          type: 'RENAME_PAGE',
          payload: { pageId: 'page-1', name: 'New Name' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects[0].pages[0].name).toBe('New Name');
      });
    });
  });

  describe('Project management', () => {
    describe('CREATE_PROJECT', () => {
      it('creates new project and switches to it', () => {
        const state = createInitialState();
        const newProject = createProject('project-2', 'New Project', [
          createPage('new-page-1', 'Home', [createRootGrid()]),
        ]);

        const action: ComponentTreeAction = {
          type: 'CREATE_PROJECT',
          payload: { project: newProject },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects).toHaveLength(2);
        expect(newState.currentProjectId).toBe('project-2');
      });
    });

    describe('DELETE_PROJECT', () => {
      it('deletes project', () => {
        const project1 = createProject('project-1', 'Project 1', [
          createPage('page-1', 'Home', [createRootGrid()]),
        ]);
        const project2 = createProject('project-2', 'Project 2', [
          createPage('page-2', 'Home', [createRootGrid()]),
        ]);
        const state = createInitialState();
        state.projects = [project1, project2];

        const action: ComponentTreeAction = {
          type: 'DELETE_PROJECT',
          payload: { projectId: 'project-2' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects).toHaveLength(1);
      });

      it('prevents deletion of last project', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = {
          type: 'DELETE_PROJECT',
          payload: { projectId: 'project-1' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects).toHaveLength(1);
      });

      it('prevents deletion of example project', () => {
        const project: Project = {
          ...createProject('project-1', 'Example', [
            createPage('page-1', 'Home', [createRootGrid()]),
          ]),
          isExampleProject: true,
        };
        const project2 = createProject('project-2', 'Other', [
          createPage('page-2', 'Home', [createRootGrid()]),
        ]);
        const state = createInitialState();
        state.projects = [project, project2];

        const action: ComponentTreeAction = {
          type: 'DELETE_PROJECT',
          payload: { projectId: 'project-1' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects).toHaveLength(2);
      });
    });

    describe('RENAME_PROJECT', () => {
      it('renames project', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = {
          type: 'RENAME_PROJECT',
          payload: { projectId: 'project-1', name: 'New Name' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects[0].name).toBe('New Name');
      });

      it('prevents renaming example project', () => {
        const project: Project = {
          ...createProject('project-1', 'Example', [
            createPage('page-1', 'Home', [createRootGrid()]),
          ]),
          isExampleProject: true,
        };
        const state = createInitialState();
        state.projects = [project];

        const action: ComponentTreeAction = {
          type: 'RENAME_PROJECT',
          payload: { projectId: 'project-1', name: 'New Name' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.projects[0].name).toBe('Example');
      });
    });
  });

  describe('Selection actions', () => {
    describe('SET_SELECTED_NODE_IDS', () => {
      it('sets selected node IDs', () => {
        const state = createInitialState([
          createRootGrid([createButton('btn-1'), createButton('btn-2')]),
        ]);

        const action: ComponentTreeAction = {
          type: 'SET_SELECTED_NODE_IDS',
          payload: { ids: ['btn-1', 'btn-2'] },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.selectedNodeIds).toEqual(['btn-1', 'btn-2']);
      });
    });

    describe('TOGGLE_NODE_SELECTION', () => {
      it('single-selects node by default', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);
        state.selectedNodeIds = [ROOT_GRID_ID];

        const action: ComponentTreeAction = {
          type: 'TOGGLE_NODE_SELECTION',
          payload: { id: 'btn-1' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.selectedNodeIds).toEqual(['btn-1']);
      });

      it('adds to selection with multiSelect', () => {
        const state = createInitialState([
          createRootGrid([createButton('btn-1'), createButton('btn-2')]),
        ]);
        state.selectedNodeIds = ['btn-1'];

        const action: ComponentTreeAction = {
          type: 'TOGGLE_NODE_SELECTION',
          payload: { id: 'btn-2', multiSelect: true },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.selectedNodeIds).toContain('btn-1');
        expect(newState.selectedNodeIds).toContain('btn-2');
      });

      it('removes from selection with multiSelect if already selected', () => {
        const state = createInitialState([
          createRootGrid([createButton('btn-1'), createButton('btn-2')]),
        ]);
        state.selectedNodeIds = ['btn-1', 'btn-2'];

        const action: ComponentTreeAction = {
          type: 'TOGGLE_NODE_SELECTION',
          payload: { id: 'btn-1', multiSelect: true },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.selectedNodeIds).toEqual(['btn-2']);
      });
    });
  });

  describe('History actions', () => {
    describe('UNDO', () => {
      it('restores previous state', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);

        // First add a component
        const insertAction: ComponentTreeAction = {
          type: 'INSERT_COMPONENT',
          payload: { node: createButton('btn-2') },
        };
        const stateAfterInsert = componentTreeReducer(state, insertAction);

        // Then undo
        const undoAction: ComponentTreeAction = { type: 'UNDO' };
        const stateAfterUndo = componentTreeReducer(stateAfterInsert, undoAction);

        const children = stateAfterUndo.projects[0].pages[0].tree[0].children!;
        expect(children).toHaveLength(1);
      });

      it('does nothing if no past states', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = { type: 'UNDO' };
        const newState = componentTreeReducer(state, action);

        expect(newState).toBe(state);
      });

      it('adds current state to future', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);

        const insertAction: ComponentTreeAction = {
          type: 'INSERT_COMPONENT',
          payload: { node: createButton('btn-2') },
        };
        const stateAfterInsert = componentTreeReducer(state, insertAction);

        const undoAction: ComponentTreeAction = { type: 'UNDO' };
        const stateAfterUndo = componentTreeReducer(stateAfterInsert, undoAction);

        expect(stateAfterUndo.history.future.length).toBe(1);
      });
    });

    describe('REDO', () => {
      it('restores future state', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);

        // First add, then undo, then redo
        const insertAction: ComponentTreeAction = {
          type: 'INSERT_COMPONENT',
          payload: { node: createButton('btn-2') },
        };
        const stateAfterInsert = componentTreeReducer(state, insertAction);

        const undoAction: ComponentTreeAction = { type: 'UNDO' };
        const stateAfterUndo = componentTreeReducer(stateAfterInsert, undoAction);

        const redoAction: ComponentTreeAction = { type: 'REDO' };
        const stateAfterRedo = componentTreeReducer(stateAfterUndo, redoAction);

        const children = stateAfterRedo.projects[0].pages[0].tree[0].children!;
        expect(children).toHaveLength(2);
      });

      it('does nothing if no future states', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = { type: 'REDO' };
        const newState = componentTreeReducer(state, action);

        expect(newState).toBe(state);
      });
    });

    describe('CLEAR_HISTORY', () => {
      it('clears past and future history', () => {
        const state = createInitialState();
        state.history.past = [{ projects: [], currentProjectId: '' }];
        state.history.future = [{ projects: [], currentProjectId: '' }];

        const action: ComponentTreeAction = { type: 'CLEAR_HISTORY' };
        const newState = componentTreeReducer(state, action);

        expect(newState.history.past).toHaveLength(0);
        expect(newState.history.future).toHaveLength(0);
      });
    });
  });

  describe('UI state actions', () => {
    describe('SET_PLAY_MODE', () => {
      it('sets play mode', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = {
          type: 'SET_PLAY_MODE',
          payload: { isPlay: true },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.isPlayMode).toBe(true);
      });
    });

    describe('SET_AGENT_EXECUTING', () => {
      it('sets agent executing state', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = {
          type: 'SET_AGENT_EXECUTING',
          payload: { isExecuting: true },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.isAgentExecuting).toBe(true);
      });
    });

    describe('SET_EDITING_MODE', () => {
      it('sets editing mode', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = {
          type: 'SET_EDITING_MODE',
          payload: { mode: 'text' },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.editingMode).toBe('text');
      });
    });
  });

  describe('Grid actions', () => {
    describe('TOGGLE_GRID_LINES', () => {
      it('toggles grid lines visibility', () => {
        const state = createInitialState();

        const action: ComponentTreeAction = {
          type: 'TOGGLE_GRID_LINES',
          payload: { id: ROOT_GRID_ID },
        };

        const newState = componentTreeReducer(state, action);

        expect(newState.gridLinesVisible.has(ROOT_GRID_ID)).toBe(true);

        const stateAfterToggleOff = componentTreeReducer(newState, action);

        expect(stateAfterToggleOff.gridLinesVisible.has(ROOT_GRID_ID)).toBe(false);
      });
    });
  });

  describe('Dirty tracking', () => {
    describe('componentTreeReducerWithDirtyTracking', () => {
      it('marks state as dirty after content-modifying action', () => {
        const state = createInitialState([createRootGrid([createButton('btn-1')])]);

        const action: ComponentTreeAction = {
          type: 'UPDATE_COMPONENT_PROPS',
          payload: { id: 'btn-1', props: { text: 'Updated' } },
        };

        const newState = componentTreeReducerWithDirtyTracking(state, action);

        expect(newState.isDirty).toBe(true);
      });

      it('does not mark dirty for navigation actions', () => {
        const page1 = createPage('page-1', 'Home', [createRootGrid()]);
        const page2 = createPage('page-2', 'About', [createRootGrid()]);
        const project = createProject('project-1', 'Test', [page1, page2]);
        const state = createInitialState();
        state.projects = [project];
        state.isDirty = false;

        // SET_CURRENT_PAGE and SET_CURRENT_PROJECT don't modify content
        const action: ComponentTreeAction = {
          type: 'SET_SELECTED_NODE_IDS',
          payload: { ids: ['btn-1'] },
        };

        const newState = componentTreeReducerWithDirtyTracking(state, action);

        expect(newState.isDirty).toBe(false);
      });
    });

    describe('MARK_SAVED', () => {
      it('marks state as not dirty', () => {
        const state = createInitialState();
        state.isDirty = true;

        const action: ComponentTreeAction = { type: 'MARK_SAVED' };
        const newState = componentTreeReducer(state, action);

        expect(newState.isDirty).toBe(false);
      });
    });

    describe('MARK_DIRTY', () => {
      it('marks state as dirty', () => {
        const state = createInitialState();
        state.isDirty = false;

        const action: ComponentTreeAction = { type: 'MARK_DIRTY' };
        const newState = componentTreeReducer(state, action);

        expect(newState.isDirty).toBe(true);
      });
    });
  });
});
