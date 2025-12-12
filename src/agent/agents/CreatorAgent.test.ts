/**
 * CreatorAgent Tests (TDD)
 *
 * Specialist agent for component creation
 */

import { CreatorAgent } from './CreatorAgent';
import { MockLLMProvider, createToolCallResponse, createTextResponse } from '../__mocks__/MockLLMProvider';
import { MemoryStore } from '../memory/MemoryStore';
import { ToolContext } from '../types';
import { AgentProgressMessage } from './types';
import { getTool } from '../tools'; // Imports and registers all tools

describe('CreatorAgent', () => {
  let agent: CreatorAgent;
  let mockLLM: MockLLMProvider;
  let memory: MemoryStore;
  let mockContext: ToolContext;
  let messages: AgentProgressMessage[];

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    memory = new MemoryStore();
    messages = [];

    mockContext = {
      tree: [{ id: 'root-vstack', type: 'VStack', props: {}, children: [] }],
      pages: [{ id: 'page-1', name: 'Test Page', tree: [] }],
      currentPageId: 'page-1',
      selectedNodeIds: [],
      getNodeById: jest.fn(),
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

    agent = new CreatorAgent(mockLLM, memory);

    // Inject real tools from registry
    const tools = agent.requiredTools
      .map(toolName => getTool(toolName))
      .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined);
    agent.setTools(tools);
  });

  describe('interface compliance', () => {
    it('has correct name', () => {
      expect(agent.name).toBe('CreatorAgent');
    });

    it('has capabilities defined', () => {
      expect(agent.capabilities).toContain('component_creation');
      expect(agent.capabilities).toContain('section_templates');
      expect(agent.capabilities).toContain('table_creation');
    });

    it('has tools defined', () => {
      expect(agent.tools.length).toBeGreaterThanOrEqual(3);
      const toolNames = agent.tools.map(t => t.name);
      expect(toolNames).toContain('buildFromMarkup');
      expect(toolNames).toContain('section_create');
      expect(toolNames).toContain('table_create');
    });
  });

  describe('canHandle', () => {
    it('returns true for component creation requests', async () => {
      expect(await agent.canHandle('Add 3 cards', memory)).toBe(true);
      expect(await agent.canHandle('Create a button', memory)).toBe(true);
      expect(await agent.canHandle('Build a grid', memory)).toBe(true);
    });

    it('returns true for section template requests', async () => {
      expect(await agent.canHandle('Create pricing section', memory)).toBe(true);
      expect(await agent.canHandle('Add a hero', memory)).toBe(true);
    });

    it('returns true for table requests', async () => {
      expect(await agent.canHandle('Add a users table', memory)).toBe(true);
      expect(await agent.canHandle('Create orders table', memory)).toBe(true);
    });

    it('returns false for page operations', async () => {
      expect(await agent.canHandle('Create a new page', memory)).toBe(false);
      expect(await agent.canHandle('Switch to about page', memory)).toBe(false);
    });
  });

  describe('execute - buildFromMarkup', () => {
    it('creates components from markup', async () => {
      mockLLM.setResponses([
        createToolCallResponse('buildFromMarkup', {
          markup: '<Card><CardHeader><Heading level={3}>Test</Heading></CardHeader></Card>',
        }),
        createTextResponse('Created card'),
      ]);

      const result = await agent.execute(
        'Add a card',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(true);
      expect(mockContext.addComponent).toHaveBeenCalled();

      // Check memory
      const memoryEntries = memory.search({ action: 'component_created' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].details.method).toBe('buildFromMarkup');
    });

    it('creates multiple components from markup', async () => {
      mockLLM.setResponses([
        createToolCallResponse('buildFromMarkup', {
          markup: '<Grid columns={3}><Card /><Card /><Card /></Grid>',
        }),
        createTextResponse('Created 3 cards'),
      ]);

      await agent.execute('Add 3 cards in a grid', mockContext, memory);

      const memoryEntries = memory.search({ action: 'component_created' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].details.count).toBe(3);
    });
  });

  describe('execute - section templates', () => {
    it('creates pricing section', async () => {
      mockLLM.setResponses([
        createToolCallResponse('section_create', { template: 'pricing' }),
        createTextResponse('Created pricing section'),
      ]);

      const result = await agent.execute(
        'Create a pricing section',
        mockContext,
        memory
      );

      expect(result.success).toBe(true);

      const memoryEntries = memory.search({ action: 'component_created' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].details.method).toBe('section_create');
      expect(memoryEntries[0].details.template).toBe('pricing');
    });

    it('creates hero section', async () => {
      mockLLM.setResponses([
        createToolCallResponse('section_create', { template: 'hero' }),
        createTextResponse('Created hero section'),
      ]);

      await agent.execute('Add a hero section', mockContext, memory);

      const memoryEntries = memory.search({ action: 'component_created' });
      expect(memoryEntries[0].details.template).toBe('hero');
    });
  });

  describe('execute - table creation', () => {
    it('creates users table', async () => {
      mockLLM.setResponses([
        createToolCallResponse('table_create', { template: 'users' }),
        createTextResponse('Created users table'),
      ]);

      const result = await agent.execute(
        'Add a users table',
        mockContext,
        memory
      );

      expect(result.success).toBe(true);

      const memoryEntries = memory.search({ action: 'component_created' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].entityType).toBe('DataViews');
      expect(memoryEntries[0].details.template).toBe('users');
    });
  });

  describe('memory integration', () => {
    it('searches for active page in memory', async () => {
      // Pre-populate memory with page creation
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-dashboard',
        entityType: 'Page',
        details: { name: 'Dashboard' },
      });

      mockContext.currentPageId = 'page-dashboard';

      mockLLM.setResponses([
        createToolCallResponse('buildFromMarkup', { markup: '<Card />' }),
        createTextResponse('Done'),
      ]);

      await agent.execute('Add a card', mockContext, memory, (msg) => messages.push(msg));

      // Should have found page in memory and used it
      expect(messages.some(m => m.message.includes('page'))).toBe(true);
    });

    it('writes detailed memory entries', async () => {
      mockLLM.setResponses([
        createToolCallResponse('buildFromMarkup', { markup: '<Button text="Click" />' }),
        createTextResponse('Done'),
      ]);

      await agent.execute('Add a button', mockContext, memory);

      const entries = memory.search({ agent: 'CreatorAgent' });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].action).toBe('component_created');
      expect(entries[0].details).toHaveProperty('method');
    });
  });

  describe('message emission', () => {
    it('emits progress messages', async () => {
      mockLLM.setResponses([
        createToolCallResponse('buildFromMarkup', { markup: '<Card />' }),
        createTextResponse('Done'),
      ]);

      await agent.execute(
        'Add a card',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(messages.filter(m => m.type === 'progress').length).toBeGreaterThan(0);
      expect(messages.filter(m => m.type === 'success').length).toBeGreaterThan(0);
    });
  });

  describe('token and cost tracking', () => {
    it('tracks tokens and cost', async () => {
      mockLLM.setResponses([
        createToolCallResponse('buildFromMarkup', { markup: '<Card />' }),
        createTextResponse('Done'),
      ]);

      const result = await agent.execute('Add a card', mockContext, memory);

      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(0.01);
    });
  });

  describe('error handling', () => {
    it('handles tool execution errors gracefully', async () => {
      mockLLM.setResponses([
        createToolCallResponse('buildFromMarkup', { markup: 'invalid' }),
      ]);

      (mockContext.addComponent as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid markup');
      });

      const result = await agent.execute(
        'Add invalid component',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(false);
      expect(messages.some(m => m.type === 'error')).toBe(true);
    });
  });
});
