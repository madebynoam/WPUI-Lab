/**
 * UpdateAgent Tests (TDD)
 *
 * Specialist agent for component updates/modifications
 */

import { UpdateAgent } from './UpdateAgent';
import { MockLLMProvider, createToolCallResponse, createTextResponse } from '../__mocks__/MockLLMProvider';
import { MemoryStore } from '../memory/MemoryStore';
import { ToolContext } from '../types';
import { AgentProgressMessage } from './types';
import { getTool } from '../tools'; // Imports and registers all tools

describe('UpdateAgent', () => {
  let agent: UpdateAgent;
  let mockLLM: MockLLMProvider;
  let memory: MemoryStore;
  let mockContext: ToolContext;
  let messages: AgentProgressMessage[];

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    memory = new MemoryStore();
    messages = [];

    mockContext = {
      tree: [
        {
          id: 'root-vstack',
          type: 'VStack',
          props: {},
          children: [
            { id: 'btn-submit', type: 'Button', props: { text: 'Submit', variant: 'secondary' } },
            { id: 'card-1', type: 'Card', props: {}, children: [] },
          ],
        },
      ],
      pages: [{ id: 'page-1', name: 'Test', tree: [] }],
      currentPageId: 'page-1',
      selectedNodeIds: [],
      getNodeById: jest.fn((id) => {
        if (id === 'btn-submit') return { id: 'btn-submit', type: 'Button', props: { text: 'Submit', variant: 'secondary' } };
        if (id === 'card-1') return { id: 'card-1', type: 'Card', props: {}, children: [] };
        if (id === 'root-vstack') return mockContext.tree[0];
        return null;
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

    agent = new UpdateAgent(mockLLM, memory);

    // Inject real tools from registry
    const tools = agent.requiredTools
      .map(toolName => getTool(toolName))
      .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined);
    agent.setTools(tools);
  });

  describe('interface compliance', () => {
    it('has correct name', () => {
      expect(agent.name).toBe('UpdateAgent');
    });

    it('has capabilities', () => {
      expect(agent.capabilities).toContain('component_update');
      expect(agent.capabilities).toContain('component_move');
      expect(agent.capabilities).toContain('component_delete');
    });

    it('has tools', () => {
      expect(agent.tools.length).toBeGreaterThanOrEqual(3);
      const toolNames = agent.tools.map(t => t.name);
      expect(toolNames).toContain('component_update');
      expect(toolNames).toContain('component_move');
      expect(toolNames).toContain('component_delete');
    });
  });

  describe('canHandle', () => {
    it('handles update requests', async () => {
      expect(await agent.canHandle('Change button color', memory)).toBe(true);
      expect(await agent.canHandle('Update the heading', memory)).toBe(true);
      expect(await agent.canHandle('Modify card props', memory)).toBe(true);
    });

    it('handles delete requests', async () => {
      expect(await agent.canHandle('Delete the card', memory)).toBe(true);
      expect(await agent.canHandle('Remove button', memory)).toBe(true);
    });

    it('handles move requests', async () => {
      expect(await agent.canHandle('Move card to sidebar', memory)).toBe(true);
    });

    it('rejects creation requests', async () => {
      expect(await agent.canHandle('Add 3 cards', memory)).toBe(false);
      expect(await agent.canHandle('Create a button', memory)).toBe(false);
    });
  });

  describe('execute - component_update', () => {
    it('updates component by ID', async () => {
      // component_update uses componentId and props (not selector/updates)
      mockLLM.setResponses([
        createToolCallResponse('component_update', {
          componentId: 'btn-submit',
          props: { variant: 'primary' },
        }),
      ]);

      const result = await agent.execute(
        'Change submit button to primary',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(true);
      expect(mockContext.updateComponentProps).toHaveBeenCalledWith('btn-submit', { variant: 'primary' });

      const memoryEntries = memory.search({ action: 'component_updated' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].entityId).toBe('btn-submit');
    });

    it('updates component text', async () => {
      mockLLM.setResponses([
        createToolCallResponse('component_update', {
          componentId: 'btn-submit',
          text: 'Send',
        }),
      ]);

      const result = await agent.execute(
        'Change button text to Send',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(true);
      // Button uses 'text' prop
      expect(mockContext.updateComponentProps).toHaveBeenCalledWith('btn-submit', { text: 'Send' });
    });

    it('updates component by selector', async () => {
      mockLLM.setResponses([
        createToolCallResponse('component_update', {
          selector: { type: 'Button' },
          props: { variant: 'primary' },
        }),
      ]);

      const result = await agent.execute(
        'Make submit button primary',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(true);
      expect(mockContext.updateComponentProps).toHaveBeenCalled();
    });
  });

  describe('execute - component_delete', () => {
    it('deletes component by ID', async () => {
      mockLLM.setResponses([
        createToolCallResponse('component_delete', { componentId: 'card-1' }),
      ]);

      const result = await agent.execute(
        'Delete the card',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(true);
      expect(mockContext.removeComponent).toHaveBeenCalledWith('card-1');

      const memoryEntries = memory.search({ action: 'component_deleted' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].entityId).toBe('card-1');
    });
  });

  describe('execute - component_move', () => {
    it('moves component to new parent', async () => {
      mockLLM.setResponses([
        createToolCallResponse('component_move', {
          componentId: 'btn-submit',
          to: { parentId: 'card-1', position: 0 },
        }),
      ]);

      const result = await agent.execute(
        'Move button into card',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(true);
      expect(mockContext.removeComponent).toHaveBeenCalledWith('btn-submit');
      expect(mockContext.addComponent).toHaveBeenCalled();

      const memoryEntries = memory.search({ action: 'component_moved' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].entityId).toBe('btn-submit');
      expect(memoryEntries[0].details.to).toBe('card-1');
    });
  });

  describe('memory integration', () => {
    it('searches memory for recently created components', async () => {
      memory.write({
        agent: 'CreatorAgent',
        action: 'component_created',
        entityId: 'btn-new',
        entityType: 'Button',
        details: {},
      });

      // Update mock to return the new button
      (mockContext.getNodeById as jest.Mock).mockImplementation((id) => {
        if (id === 'btn-new') return { id: 'btn-new', type: 'Button', props: { text: 'New', variant: 'secondary' } };
        if (id === 'btn-submit') return { id: 'btn-submit', type: 'Button', props: { text: 'Submit', variant: 'secondary' } };
        if (id === 'card-1') return { id: 'card-1', type: 'Card', props: {}, children: [] };
        return null;
      });

      mockLLM.setResponses([
        createToolCallResponse('component_update', {
          componentId: 'btn-new',
          props: { variant: 'primary' },
        }),
      ]);

      await agent.execute(
        'Update the new button',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      // Should use memory to find the recently created button
      const entries = memory.search({ action: 'component_updated' });
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('handles component not found', async () => {
      mockLLM.setResponses([
        createToolCallResponse('component_update', {
          componentId: 'nonexistent',
          props: { variant: 'primary' },
        }),
      ]);

      const result = await agent.execute(
        'Update nonexistent component',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(false);
    });

    it('handles missing updates', async () => {
      mockLLM.setResponses([
        createToolCallResponse('component_update', {
          componentId: 'btn-submit',
          // No text or props - should fail
        }),
      ]);

      const result = await agent.execute(
        'Update button with nothing',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(false);
    });
  });

  describe('token and cost tracking', () => {
    it('tracks tokens and cost', async () => {
      mockLLM.setResponses([
        createToolCallResponse('component_update', {
          componentId: 'btn-submit',
          props: { variant: 'primary' },
        }),
      ]);

      const result = await agent.execute(
        'Update button',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(0.01);
    });
  });

  describe('message emission', () => {
    it('emits progress messages', async () => {
      mockLLM.setResponses([
        createToolCallResponse('component_update', {
          componentId: 'btn-submit',
          props: { variant: 'primary' },
        }),
      ]);

      await agent.execute(
        'Update button',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(messages.filter(m => m.type === 'progress').length).toBeGreaterThan(0);
      expect(messages.filter(m => m.type === 'success').length).toBeGreaterThan(0);
    });
  });
});
