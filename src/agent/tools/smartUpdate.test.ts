/**
 * Smart Update Tools Tests
 *
 * Tests for component_update, component_delete, and component_move tools
 */

import { component_update, component_delete, component_move } from './smartUpdate';
import { ToolContext } from '../types';

describe('Smart Update Tools', () => {
  let mockContext: ToolContext;

  beforeEach(() => {
    mockContext = {
      tree: [
        {
          id: 'root-vstack',
          type: 'VStack',
          props: {},
          children: [
            { id: 'heading-1', type: 'Heading', props: { children: 'Welcome' } },
            { id: 'btn-submit', type: 'Button', props: { text: 'Submit', variant: 'secondary' } },
            { id: 'btn-cancel', type: 'Button', props: { text: 'Cancel', variant: 'tertiary' } },
            {
              id: 'card-1',
              type: 'Card',
              props: {},
              children: [
                { id: 'card-text', type: 'Text', props: { children: 'Card content' } },
              ],
            },
          ],
        },
      ],
      pages: [{ id: 'page-1', name: 'Test', tree: [] }],
      currentPageId: 'page-1',
      selectedNodeIds: [],
      getNodeById: jest.fn((id) => {
        const findNode = (nodes: any[]): any => {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
              const found = findNode(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        return findNode(mockContext.tree);
      }),
      setTree: jest.fn(),
      updateComponentProps: jest.fn(),
      updateMultipleComponentProps: jest.fn(),
      updateComponentName: jest.fn(),
      addComponent: jest.fn(),
      removeComponent: jest.fn(),
      copyComponent: jest.fn(),
      pasteComponent: jest.fn(),
      duplicateComponent: jest.fn(),
      addInteraction: jest.fn(),
      removeInteraction: jest.fn(),
      updateInteraction: jest.fn(),
      createPage: jest.fn(),
      setCurrentPage: jest.fn(),
      updatePageTheme: jest.fn(),
      toggleNodeSelection: jest.fn(),
    };
  });

  describe('component_update', () => {
    it('has correct metadata', () => {
      expect(component_update.name).toBe('component_update');
      expect(component_update.category).toBe('action');
      expect(component_update.parameters).toHaveProperty('componentId');
      expect(component_update.parameters).toHaveProperty('selector');
      expect(component_update.parameters).toHaveProperty('text');
      expect(component_update.parameters).toHaveProperty('props');
    });

    describe('by componentId', () => {
      it('updates component props by ID', async () => {
        const result = await component_update.execute(
          {
            componentId: 'btn-submit',
            props: { variant: 'primary' },
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.updateComponentProps).toHaveBeenCalledWith('btn-submit', { variant: 'primary' });
      });

      it('updates button text using text property', async () => {
        const result = await component_update.execute(
          {
            componentId: 'btn-submit',
            text: 'Send',
          },
          mockContext
        );

        expect(result.success).toBe(true);
        // Buttons use 'text' prop
        expect(mockContext.updateComponentProps).toHaveBeenCalledWith('btn-submit', { text: 'Send' });
      });

      it('updates non-button text using children property', async () => {
        const result = await component_update.execute(
          {
            componentId: 'heading-1',
            text: 'Hello World',
          },
          mockContext
        );

        expect(result.success).toBe(true);
        // Non-buttons use 'children' prop
        expect(mockContext.updateComponentProps).toHaveBeenCalledWith('heading-1', { children: 'Hello World' });
      });

      it('fails for non-existent component', async () => {
        const result = await component_update.execute(
          {
            componentId: 'nonexistent',
            props: { variant: 'primary' },
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Component not found');
      });

      it('fails when no updates provided', async () => {
        const result = await component_update.execute(
          {
            componentId: 'btn-submit',
            // No text or props
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('No updates provided');
      });
    });

    describe('by selector', () => {
      it('finds component by type', async () => {
        const result = await component_update.execute(
          {
            selector: { type: 'Heading' },
            text: 'New Title',
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.updateComponentProps).toHaveBeenCalledWith('heading-1', { children: 'New Title' });
      });

      it('finds component by content', async () => {
        const result = await component_update.execute(
          {
            selector: { type: 'Button', containing: 'Submit' },
            props: { variant: 'primary' },
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.updateComponentProps).toHaveBeenCalledWith('btn-submit', { variant: 'primary' });
      });

      it('returns disambiguation options for multiple matches', async () => {
        const result = await component_update.execute(
          {
            selector: { type: 'Button' },  // Matches both buttons
            props: { variant: 'primary' },
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.requiresDisambiguation).toBe(true);
        expect(result.data?.count).toBe(2);
      });

      it('selects by index when multiple matches', async () => {
        const result = await component_update.execute(
          {
            selector: { type: 'Button', index: 1 },  // Second button (Cancel)
            props: { variant: 'secondary' },
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.updateComponentProps).toHaveBeenCalledWith('btn-cancel', { variant: 'secondary' });
      });

      it('fails when no matches found', async () => {
        const result = await component_update.execute(
          {
            selector: { type: 'NonexistentType' },
            props: { variant: 'primary' },
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('No matches found');
      });
    });

    describe('validation', () => {
      it('fails without componentId or selector', async () => {
        const result = await component_update.execute(
          {
            props: { variant: 'primary' },
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Missing component identifier');
      });
    });
  });

  describe('component_delete', () => {
    it('has correct metadata', () => {
      expect(component_delete.name).toBe('component_delete');
      expect(component_delete.category).toBe('action');
    });

    describe('by componentId', () => {
      it('deletes component by ID', async () => {
        const result = await component_delete.execute(
          {
            componentId: 'btn-cancel',
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.removeComponent).toHaveBeenCalledWith('btn-cancel');
      });

      it('fails for non-existent component', async () => {
        const result = await component_delete.execute(
          {
            componentId: 'nonexistent',
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Component not found');
      });
    });

    describe('by selector', () => {
      it('deletes single match', async () => {
        const result = await component_delete.execute(
          {
            selector: { type: 'Heading' },
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.removeComponent).toHaveBeenCalledWith('heading-1');
      });

      it('requires confirmation for bulk delete', async () => {
        const result = await component_delete.execute(
          {
            selector: { type: 'Button' },  // Matches both buttons
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.requiresConfirmation).toBe(true);
        expect(result.data?.count).toBe(2);
      });

      it('bulk deletes with confirmation', async () => {
        const result = await component_delete.execute(
          {
            selector: { type: 'Button' },
            confirm: true,
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.removeComponent).toHaveBeenCalledTimes(2);
      });
    });

    describe('validation', () => {
      it('fails without componentId or selector', async () => {
        const result = await component_delete.execute({}, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Missing component identifier');
      });
    });
  });

  describe('component_move', () => {
    it('has correct metadata', () => {
      expect(component_move.name).toBe('component_move');
      expect(component_move.category).toBe('action');
    });

    describe('by componentId', () => {
      it('moves component to new parent', async () => {
        const result = await component_move.execute(
          {
            componentId: 'btn-submit',
            to: { parentId: 'card-1' },
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.removeComponent).toHaveBeenCalledWith('btn-submit');
        expect(mockContext.addComponent).toHaveBeenCalled();
      });

      it('moves component to specific position', async () => {
        const result = await component_move.execute(
          {
            componentId: 'btn-submit',
            to: { parentId: 'card-1', position: 0 },
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.addComponent).toHaveBeenCalledWith(
          expect.any(Object),
          'card-1',
          0
        );
      });

      it('moves to start position', async () => {
        const result = await component_move.execute(
          {
            componentId: 'btn-submit',
            to: { parentId: 'card-1', position: 'start' },
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.addComponent).toHaveBeenCalledWith(
          expect.any(Object),
          'card-1',
          0
        );
      });

      it('moves to end position', async () => {
        const result = await component_move.execute(
          {
            componentId: 'btn-submit',
            to: { parentId: 'card-1', position: 'end' },
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.addComponent).toHaveBeenCalledWith(
          expect.any(Object),
          'card-1',
          undefined
        );
      });

      it('fails for non-existent component', async () => {
        const result = await component_move.execute(
          {
            componentId: 'nonexistent',
            to: { parentId: 'card-1' },
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Component not found');
      });

      it('fails for non-existent target parent', async () => {
        const result = await component_move.execute(
          {
            componentId: 'btn-submit',
            to: { parentId: 'nonexistent' },
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Target parent not found');
      });
    });

    describe('by selector', () => {
      it('moves single match', async () => {
        const result = await component_move.execute(
          {
            selector: { type: 'Heading' },
            to: { parentId: 'card-1' },
          },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(mockContext.removeComponent).toHaveBeenCalledWith('heading-1');
      });

      it('requires disambiguation for multiple matches', async () => {
        const result = await component_move.execute(
          {
            selector: { type: 'Button' },
            to: { parentId: 'card-1' },
          },
          mockContext
        );

        expect(result.success).toBe(false);
        expect(result.requiresDisambiguation).toBe(true);
      });
    });
  });
});
