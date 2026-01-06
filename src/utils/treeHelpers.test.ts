import {
  ROOT_GRID_ID,
  getCurrentTree,
  findParent,
  findNodeById,
  updateNodeInTree,
  updateMultipleNodesInTree,
  insertNodeInTree,
  removeNodeFromTree,
  deepCloneNode,
  duplicateNodeInTree,
  moveNodeInTree,
  reorderNodeInTree,
  flattenTree,
  updateTreeForPage,
  findTopMostContainer,
  findPathBetweenNodes,
  calculateSmartGridSpan,
} from './treeHelpers';
import { ComponentNode, Page } from '../types';

// Mock generateId to return predictable IDs for testing
jest.mock('./idGenerator', () => {
  let counter = 0;
  return {
    generateId: jest.fn(() => `test-id-${++counter}`),
  };
});

// Reset ID counter before each test
beforeEach(() => {
  jest.clearAllMocks();
  const idGenerator = require('./idGenerator');
  let counter = 0;
  idGenerator.generateId.mockImplementation(() => `test-id-${++counter}`);
});

// Test fixtures
const createRootGrid = (children: ComponentNode[] = []): ComponentNode => ({
  id: ROOT_GRID_ID,
  type: 'Grid',
  props: { columns: 12, gap: 24 },
  children,
});

const createButton = (id: string, text = 'Button'): ComponentNode => ({
  id,
  type: 'Button',
  props: { text, variant: 'primary' },
  children: [],
});

const createVStack = (id: string, children: ComponentNode[] = []): ComponentNode => ({
  id,
  type: 'VStack',
  props: { spacing: 4 },
  children,
});

const createCard = (id: string, children: ComponentNode[] = []): ComponentNode => ({
  id,
  type: 'Card',
  props: {},
  children,
});

describe('treeHelpers', () => {
  describe('getCurrentTree', () => {
    it('returns tree for the specified page', () => {
      const tree = [createRootGrid([createButton('btn-1')])];
      const pages: Page[] = [
        { id: 'page-1', name: 'Home', tree },
        { id: 'page-2', name: 'About', tree: [] },
      ];

      const result = getCurrentTree(pages, 'page-1');
      expect(result).toBe(tree);
    });

    it('returns empty array if page not found', () => {
      const pages: Page[] = [{ id: 'page-1', name: 'Home', tree: [] }];

      const result = getCurrentTree(pages, 'nonexistent');
      expect(result).toEqual([]);
    });

    it('returns empty array for page with no tree', () => {
      const pages: Page[] = [{ id: 'page-1', name: 'Home', tree: [] }];

      const result = getCurrentTree(pages, 'page-1');
      expect(result).toEqual([]);
    });
  });

  describe('findNodeById', () => {
    it('finds node at root level', () => {
      const root = createRootGrid();
      const tree = [root];

      const result = findNodeById(tree, ROOT_GRID_ID);
      expect(result).toBe(root);
    });

    it('finds node in children', () => {
      const button = createButton('btn-1');
      const tree = [createRootGrid([button])];

      const result = findNodeById(tree, 'btn-1');
      expect(result).toBe(button);
    });

    it('finds deeply nested node', () => {
      const button = createButton('btn-deep');
      const card = createCard('card-1', [button]);
      const vstack = createVStack('vstack-1', [card]);
      const tree = [createRootGrid([vstack])];

      const result = findNodeById(tree, 'btn-deep');
      expect(result).toBe(button);
    });

    it('returns null for nonexistent node', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const result = findNodeById(tree, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findParent', () => {
    it('returns null for root node', () => {
      const tree = [createRootGrid()];

      const result = findParent(tree, ROOT_GRID_ID);
      expect(result).toBeNull();
    });

    it('finds parent of direct child', () => {
      const root = createRootGrid([createButton('btn-1')]);
      const tree = [root];

      const result = findParent(tree, 'btn-1');
      expect(result).toBe(root);
    });

    it('finds parent of nested child', () => {
      const card = createCard('card-1', [createButton('btn-1')]);
      const tree = [createRootGrid([card])];

      const result = findParent(tree, 'btn-1');
      expect(result).toBe(card);
    });

    it('returns null for nonexistent node', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const result = findParent(tree, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateNodeInTree', () => {
    it('updates node at root level', () => {
      const tree = [createRootGrid()];

      const result = updateNodeInTree(tree, ROOT_GRID_ID, (node) => ({
        ...node,
        props: { ...node.props, gap: 32 },
      }));

      expect(result[0].props.gap).toBe(32);
      expect(result).not.toBe(tree); // Immutable update
    });

    it('updates nested node', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const result = updateNodeInTree(tree, 'btn-1', (node) => ({
        ...node,
        props: { ...node.props, text: 'Updated' },
      }));

      expect(result[0].children![0].props.text).toBe('Updated');
    });

    it('does not modify tree if node not found', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const result = updateNodeInTree(tree, 'nonexistent', (node) => ({
        ...node,
        props: { ...node.props, text: 'Updated' },
      }));

      expect(result[0].children![0].props.text).toBe('Button');
    });
  });

  describe('updateMultipleNodesInTree', () => {
    it('updates multiple nodes at once', () => {
      const tree = [
        createRootGrid([
          createButton('btn-1'),
          createButton('btn-2'),
          createButton('btn-3'),
        ]),
      ];

      const result = updateMultipleNodesInTree(tree, ['btn-1', 'btn-3'], (node) => ({
        ...node,
        props: { ...node.props, variant: 'secondary' },
      }));

      expect(result[0].children![0].props.variant).toBe('secondary');
      expect(result[0].children![1].props.variant).toBe('primary'); // Unchanged
      expect(result[0].children![2].props.variant).toBe('secondary');
    });

    it('handles empty ID array', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const result = updateMultipleNodesInTree(tree, [], (node) => ({
        ...node,
        props: { ...node.props, variant: 'secondary' },
      }));

      expect(result[0].children![0].props.variant).toBe('primary');
    });
  });

  describe('insertNodeInTree', () => {
    it('inserts node at end of root children by default', () => {
      const tree = [createRootGrid([createButton('btn-1')])];
      const newButton = createButton('btn-2');

      const result = insertNodeInTree(tree, newButton);

      expect(result[0].children).toHaveLength(2);
      expect(result[0].children![1].id).toBe('btn-2');
    });

    it('inserts node into specified parent', () => {
      const card = createCard('card-1', []);
      const tree = [createRootGrid([card])];
      const newButton = createButton('btn-1');

      const result = insertNodeInTree(tree, newButton, 'card-1');

      expect(result[0].children![0].children).toHaveLength(1);
      expect(result[0].children![0].children![0].id).toBe('btn-1');
    });

    it('inserts node at specified index', () => {
      const tree = [
        createRootGrid([createButton('btn-1'), createButton('btn-3')]),
      ];
      const newButton = createButton('btn-2');

      const result = insertNodeInTree(tree, newButton, ROOT_GRID_ID, 1);

      expect(result[0].children).toHaveLength(3);
      expect(result[0].children![0].id).toBe('btn-1');
      expect(result[0].children![1].id).toBe('btn-2');
      expect(result[0].children![2].id).toBe('btn-3');
    });

    it('defaults to ROOT_GRID_ID when parentId not specified', () => {
      const tree = [createRootGrid()];
      const newButton = createButton('btn-1');

      const result = insertNodeInTree(tree, newButton);

      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe('btn-1');
    });
  });

  describe('removeNodeFromTree', () => {
    it('removes node from parent', () => {
      const tree = [
        createRootGrid([createButton('btn-1'), createButton('btn-2')]),
      ];

      const result = removeNodeFromTree(tree, 'btn-1');

      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe('btn-2');
    });

    it('removes nested node', () => {
      const card = createCard('card-1', [createButton('btn-1')]);
      const tree = [createRootGrid([card])];

      const result = removeNodeFromTree(tree, 'btn-1');

      expect(result[0].children![0].children).toHaveLength(0);
    });

    it('prevents deletion of root grid', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const result = removeNodeFromTree(tree, ROOT_GRID_ID);

      expect(result).toBe(tree);
    });

    it('handles nonexistent node gracefully', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const result = removeNodeFromTree(tree, 'nonexistent');

      expect(result[0].children).toHaveLength(1);
    });
  });

  describe('deepCloneNode', () => {
    it('creates deep copy with new IDs', () => {
      const original = createCard('card-1', [createButton('btn-1')]);

      const cloned = deepCloneNode(original);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.children![0].id).not.toBe(original.children![0].id);
      expect(cloned.type).toBe(original.type);
    });

    it('clears gridColumnStart from props', () => {
      const original: ComponentNode = {
        id: 'node-1',
        type: 'Card',
        props: { gridColumnStart: 1, gridColumnSpan: 6 },
        children: [],
      };

      const cloned = deepCloneNode(original);

      expect(cloned.props.gridColumnStart).toBeUndefined();
      expect(cloned.props.gridColumnSpan).toBe(6);
    });
  });

  describe('duplicateNodeInTree', () => {
    it('duplicates node and returns new ID', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const { tree: newTree, newNodeId } = duplicateNodeInTree(tree, 'btn-1');

      expect(newTree[0].children).toHaveLength(2);
      expect(newNodeId).toBe('test-id-1');
      expect(newTree[0].children![1].id).toBe('test-id-1');
    });

    it('places duplicate right after original', () => {
      const tree = [
        createRootGrid([
          createButton('btn-1'),
          createButton('btn-2'),
          createButton('btn-3'),
        ]),
      ];

      const { tree: newTree } = duplicateNodeInTree(tree, 'btn-2');

      expect(newTree[0].children).toHaveLength(4);
      expect(newTree[0].children![0].id).toBe('btn-1');
      expect(newTree[0].children![1].id).toBe('btn-2');
      expect(newTree[0].children![2].id).toBe('test-id-1'); // Duplicate
      expect(newTree[0].children![3].id).toBe('btn-3');
    });

    it('returns null newNodeId if node not found', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const { newNodeId } = duplicateNodeInTree(tree, 'nonexistent');

      expect(newNodeId).toBeNull();
    });
  });

  describe('moveNodeInTree', () => {
    it('moves node up', () => {
      const tree = [
        createRootGrid([
          createButton('btn-1'),
          createButton('btn-2'),
          createButton('btn-3'),
        ]),
      ];

      const result = moveNodeInTree(tree, 'btn-2', 'up');

      expect(result[0].children![0].id).toBe('btn-2');
      expect(result[0].children![1].id).toBe('btn-1');
      expect(result[0].children![2].id).toBe('btn-3');
    });

    it('moves node down', () => {
      const tree = [
        createRootGrid([
          createButton('btn-1'),
          createButton('btn-2'),
          createButton('btn-3'),
        ]),
      ];

      const result = moveNodeInTree(tree, 'btn-2', 'down');

      expect(result[0].children![0].id).toBe('btn-1');
      expect(result[0].children![1].id).toBe('btn-3');
      expect(result[0].children![2].id).toBe('btn-2');
    });

    it('does not move first node up', () => {
      const tree = [createRootGrid([createButton('btn-1'), createButton('btn-2')])];

      const result = moveNodeInTree(tree, 'btn-1', 'up');

      expect(result[0].children![0].id).toBe('btn-1');
      expect(result[0].children![1].id).toBe('btn-2');
    });

    it('does not move last node down', () => {
      const tree = [createRootGrid([createButton('btn-1'), createButton('btn-2')])];

      const result = moveNodeInTree(tree, 'btn-2', 'down');

      expect(result[0].children![0].id).toBe('btn-1');
      expect(result[0].children![1].id).toBe('btn-2');
    });

    it('moves nested node', () => {
      const card = createCard('card-1', [
        createButton('btn-1'),
        createButton('btn-2'),
      ]);
      const tree = [createRootGrid([card])];

      const result = moveNodeInTree(tree, 'btn-2', 'up');

      expect(result[0].children![0].children![0].id).toBe('btn-2');
      expect(result[0].children![0].children![1].id).toBe('btn-1');
    });
  });

  describe('reorderNodeInTree', () => {
    it('reorders node before target', () => {
      const tree = [
        createRootGrid([
          createButton('btn-1'),
          createButton('btn-2'),
          createButton('btn-3'),
        ]),
      ];

      const result = reorderNodeInTree(tree, 'btn-3', 'btn-1', 'before');

      expect(result[0].children![0].id).toBe('btn-3');
      expect(result[0].children![1].id).toBe('btn-1');
      expect(result[0].children![2].id).toBe('btn-2');
    });

    it('reorders node after target', () => {
      const tree = [
        createRootGrid([
          createButton('btn-1'),
          createButton('btn-2'),
          createButton('btn-3'),
        ]),
      ];

      const result = reorderNodeInTree(tree, 'btn-1', 'btn-3', 'after');

      expect(result[0].children![0].id).toBe('btn-2');
      expect(result[0].children![1].id).toBe('btn-3');
      expect(result[0].children![2].id).toBe('btn-1');
    });

    it('moves node inside target container', () => {
      const card = createCard('card-1', []);
      const tree = [createRootGrid([card, createButton('btn-1')])];

      const result = reorderNodeInTree(tree, 'btn-1', 'card-1', 'inside');

      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].children).toHaveLength(1);
      expect(result[0].children![0].children![0].id).toBe('btn-1');
    });

    it('does not allow dropping onto self', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const result = reorderNodeInTree(tree, 'btn-1', 'btn-1', 'before');

      expect(result).toBe(tree);
    });

    it('prevents reorder across different parents', () => {
      const card1 = createCard('card-1', [createButton('btn-1')]);
      const card2 = createCard('card-2', [createButton('btn-2')]);
      const tree = [createRootGrid([card1, card2])];

      // Suppress console.warn for this test
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = reorderNodeInTree(tree, 'btn-1', 'btn-2', 'before');

      expect(result).toBe(tree);
      warnSpy.mockRestore();
    });
  });

  describe('flattenTree', () => {
    it('flattens tree to array', () => {
      const button = createButton('btn-1');
      const card = createCard('card-1', [button]);
      const root = createRootGrid([card]);
      const tree = [root];

      const result = flattenTree(tree);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(root);
      expect(result[1]).toBe(card);
      expect(result[2]).toBe(button);
    });

    it('handles empty tree', () => {
      const result = flattenTree([]);
      expect(result).toEqual([]);
    });
  });

  describe('updateTreeForPage', () => {
    it('updates tree for specified page', () => {
      const pages: Page[] = [
        { id: 'page-1', name: 'Home', tree: [] },
        { id: 'page-2', name: 'About', tree: [] },
      ];
      const newTree = [createRootGrid([createButton('btn-1')])];

      const result = updateTreeForPage(pages, 'page-1', newTree);

      expect(result[0].tree).toBe(newTree);
      expect(result[1].tree).toEqual([]);
    });

    it('does not modify other pages', () => {
      const originalTree = [createRootGrid()];
      const pages: Page[] = [
        { id: 'page-1', name: 'Home', tree: [] },
        { id: 'page-2', name: 'About', tree: originalTree },
      ];

      const result = updateTreeForPage(pages, 'page-1', [createRootGrid([createButton('btn-1')])]);

      expect(result[1].tree).toBe(originalTree);
    });
  });

  describe('findTopMostContainer', () => {
    const mockRegistry = {
      Grid: { acceptsChildren: true },
      VStack: { acceptsChildren: true },
      Card: { acceptsChildren: true },
      CardBody: { acceptsChildren: true },
      Button: { acceptsChildren: false },
    };

    it('returns node itself when clicking root', () => {
      const root = createRootGrid();
      const tree = [root];

      const result = findTopMostContainer(tree, ROOT_GRID_ID, mockRegistry);

      expect(result).toBe(root);
    });

    it('returns topmost container for deeply nested node', () => {
      const button = createButton('btn-1');
      const card = createCard('card-1', [button]);
      const vstack = createVStack('vstack-1', [card]);
      const tree = [createRootGrid([vstack])];

      const result = findTopMostContainer(tree, 'btn-1', mockRegistry);

      // Should return VStack (topmost before root), not Card
      expect(result?.id).toBe('vstack-1');
    });

    it('skips structure containers like CardBody', () => {
      const button = createButton('btn-1');
      const cardBody: ComponentNode = {
        id: 'card-body-1',
        type: 'CardBody',
        props: {},
        children: [button],
      };
      const card = createCard('card-1', [cardBody]);
      const tree = [createRootGrid([card])];

      const result = findTopMostContainer(tree, 'btn-1', mockRegistry);

      // Should return Card, not CardBody (skipped as structure container)
      expect(result?.id).toBe('card-1');
    });

    it('returns null for nonexistent node', () => {
      const tree = [createRootGrid()];

      const result = findTopMostContainer(tree, 'nonexistent', mockRegistry);

      expect(result).toBeNull();
    });
  });

  describe('findPathBetweenNodes', () => {
    it('returns single node when start equals target', () => {
      const button = createButton('btn-1');
      const tree = [createRootGrid([button])];

      const result = findPathBetweenNodes(tree, 'btn-1', 'btn-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(button);
    });

    it('finds path from parent to child', () => {
      const button = createButton('btn-1');
      const card = createCard('card-1', [button]);
      const tree = [createRootGrid([card])];

      const result = findPathBetweenNodes(tree, 'card-1', 'btn-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('card-1');
      expect(result[1].id).toBe('btn-1');
    });

    it('finds path through multiple levels', () => {
      const button = createButton('btn-1');
      const card = createCard('card-1', [button]);
      const vstack = createVStack('vstack-1', [card]);
      const root = createRootGrid([vstack]);
      const tree = [root];

      const result = findPathBetweenNodes(tree, ROOT_GRID_ID, 'btn-1');

      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(ROOT_GRID_ID);
      expect(result[1].id).toBe('vstack-1');
      expect(result[2].id).toBe('card-1');
      expect(result[3].id).toBe('btn-1');
    });

    it('returns empty array when start node not found', () => {
      const tree = [createRootGrid([createButton('btn-1')])];

      const result = findPathBetweenNodes(tree, 'nonexistent', 'btn-1');

      expect(result).toEqual([]);
    });

    it('returns empty array when target is not descendant of start', () => {
      const tree = [createRootGrid([createButton('btn-1'), createButton('btn-2')])];

      const result = findPathBetweenNodes(tree, 'btn-1', 'btn-2');

      expect(result).toEqual([]);
    });
  });

  describe('calculateSmartGridSpan', () => {
    it('returns full width for empty grid', () => {
      const grid: ComponentNode = {
        id: 'grid-1',
        type: 'Grid',
        props: { columns: 12 },
        children: [],
      };

      const result = calculateSmartGridSpan(grid);

      expect(result.span).toBe(12);
      expect(result.childrenToUpdate).toEqual([]);
    });

    it('splits in half when one full-width child exists', () => {
      const grid: ComponentNode = {
        id: 'grid-1',
        type: 'Grid',
        props: { columns: 12 },
        children: [
          { id: 'child-1', type: 'Card', props: { gridColumnSpan: 12 }, children: [] },
        ],
      };

      const result = calculateSmartGridSpan(grid);

      expect(result.span).toBe(6);
      expect(result.childrenToUpdate).toEqual([{ id: 'child-1', gridColumnSpan: 6 }]);
    });

    it('uses remaining space when available', () => {
      const grid: ComponentNode = {
        id: 'grid-1',
        type: 'Grid',
        props: { columns: 12 },
        children: [
          { id: 'child-1', type: 'Card', props: { gridColumnSpan: 6 }, children: [] },
        ],
      };

      const result = calculateSmartGridSpan(grid);

      expect(result.span).toBe(6);
      expect(result.childrenToUpdate).toEqual([]);
    });

    it('rebalances when grid is full with equal children', () => {
      const grid: ComponentNode = {
        id: 'grid-1',
        type: 'Grid',
        props: { columns: 12 },
        children: [
          { id: 'child-1', type: 'Card', props: { gridColumnSpan: 6 }, children: [] },
          { id: 'child-2', type: 'Card', props: { gridColumnSpan: 6 }, children: [] },
        ],
      };

      const result = calculateSmartGridSpan(grid);

      expect(result.span).toBe(4);
      expect(result.childrenToUpdate).toEqual([
        { id: 'child-1', gridColumnSpan: 4 },
        { id: 'child-2', gridColumnSpan: 4 },
      ]);
    });

    it('defaults to 3 columns when grid is full with unequal children', () => {
      const grid: ComponentNode = {
        id: 'grid-1',
        type: 'Grid',
        props: { columns: 12 },
        children: [
          { id: 'child-1', type: 'Card', props: { gridColumnSpan: 4 }, children: [] },
          { id: 'child-2', type: 'Card', props: { gridColumnSpan: 8 }, children: [] },
        ],
      };

      const result = calculateSmartGridSpan(grid);

      expect(result.span).toBe(3);
      expect(result.childrenToUpdate).toEqual([]);
    });

    it('handles grid with custom column count', () => {
      const grid: ComponentNode = {
        id: 'grid-1',
        type: 'Grid',
        props: { columns: 6 },
        children: [],
      };

      const result = calculateSmartGridSpan(grid);

      expect(result.span).toBe(6);
    });
  });
});
