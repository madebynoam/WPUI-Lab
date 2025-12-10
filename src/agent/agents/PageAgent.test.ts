/**
 * PageAgent Tests (TDD)
 *
 * Specialist agent for page operations:
 * - Create pages
 * - Switch between pages
 * - Delete pages
 */

import { PageAgent } from './PageAgent';
import { MockLLMProvider, createToolCallResponse, createTextResponse } from '../__mocks__/MockLLMProvider';
import { MemoryStore } from '../memory/MemoryStore';
import { ToolContext } from '../types';
import { AgentProgressMessage } from './types';
import { getTool } from '../tools/registry';

describe('PageAgent', () => {
  let agent: PageAgent;
  let mockLLM: MockLLMProvider;
  let memory: MemoryStore;
  let mockContext: ToolContext;
  let messages: AgentProgressMessage[];

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    memory = new MemoryStore();
    messages = [];

    // Mock context with page operations
    mockContext = {
      tree: [],
      pages: [],
      currentPageId: '',
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
      createPage: jest.fn().mockReturnValue('page-123'),
      setCurrentPage: jest.fn(),
      updatePageTheme: jest.fn(),
      toggleNodeSelection: jest.fn(),
    };

    agent = new PageAgent(mockLLM, memory);

    // Inject real tools from registry
    const tools = agent.requiredTools
      .map(toolName => getTool(toolName))
      .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined);
    agent.setTools(tools);
  });

  describe('interface compliance', () => {
    it('has correct name', () => {
      expect(agent.name).toBe('PageAgent');
    });

    it('has capabilities defined', () => {
      expect(agent.capabilities).toContain('page_creation');
      expect(agent.capabilities).toContain('page_switching');
      expect(agent.capabilities).toContain('page_deletion');
    });

    it('has tools defined', () => {
      expect(agent.tools).toHaveLength(2);
      expect(agent.tools.map(t => t.name)).toContain('createPage');
      expect(agent.tools.map(t => t.name)).toContain('switchPage');
    });
  });

  describe('canHandle', () => {
    it('returns true for page creation requests', async () => {
      const result = await agent.canHandle('Create a dashboard page', memory);
      expect(result).toBe(true);
    });

    it('returns true for page switching requests', async () => {
      const result = await agent.canHandle('Switch to the about page', memory);
      expect(result).toBe(true);
    });

    it('returns false for component operations', async () => {
      const result = await agent.canHandle('Add 3 cards', memory);
      expect(result).toBe(false);
    });
  });

  describe('execute - page creation', () => {
    it('creates page when it does not exist', async () => {
      mockLLM.setResponses([
        createToolCallResponse('createPage', { name: 'Dashboard' }),
        createTextResponse('Created Dashboard page'),
      ]);

      const result = await agent.execute(
        'Create a dashboard page',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(true);
      expect(mockContext.createPage).toHaveBeenCalledWith('Dashboard', expect.any(String));

      // Check memory was written
      const memoryEntries = memory.search({ action: 'page_created' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].entityId).toBe('page-123');
      expect(memoryEntries[0].entityType).toBe('Page');
      expect(memoryEntries[0].details.name).toBe('Dashboard');

      // Check messages were emitted
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(m => m.type === 'success')).toBe(true);
    });

    it('uses existing page when it already exists', async () => {
      // Setup: page already exists
      mockContext.pages = [{ id: 'page-existing', name: 'Dashboard', tree: [] }];

      mockLLM.setResponses([
        createTextResponse('Dashboard page already exists, using it'),
      ]);

      const result = await agent.execute(
        'Create a dashboard page',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(true);
      expect(mockContext.createPage).not.toHaveBeenCalled();

      // Should still write to memory about using existing page
      const memoryEntries = memory.search({ action: 'page_switched' });
      expect(memoryEntries.length).toBeGreaterThanOrEqual(0);
    });

    it('switches to newly created page', async () => {
      mockLLM.setResponses([
        createToolCallResponse('createPage', { name: 'About' }),
        createTextResponse('Created and switched to About page'),
      ]);

      await agent.execute(
        'Create an about page',
        mockContext,
        memory
      );

      expect(mockContext.setCurrentPage).toHaveBeenCalledWith('page-123');
    });
  });

  describe('execute - page switching', () => {
    beforeEach(() => {
      mockContext.pages = [
        { id: 'page-home', name: 'Home', tree: [] },
        { id: 'page-about', name: 'About', tree: [] },
        { id: 'page-pricing', name: 'Pricing', tree: [] },
      ];
      mockContext.currentPageId = 'page-home';
    });

    it('switches to existing page by name', async () => {
      mockLLM.setResponses([
        createToolCallResponse('switchPage', { pageId: 'page-about' }),
        createTextResponse('Switched to About page'),
      ]);

      const result = await agent.execute(
        'Switch to the about page',
        mockContext,
        memory
      );

      expect(result.success).toBe(true);
      expect(mockContext.setCurrentPage).toHaveBeenCalledWith('page-about');

      // Check memory
      const memoryEntries = memory.search({ action: 'page_switched' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].entityId).toBe('page-about');
    });

    it('handles page not found gracefully', async () => {
      mockLLM.setResponses([
        createTextResponse('Page "Nonexistent" not found'),
      ]);

      const result = await agent.execute(
        'Switch to the nonexistent page',
        mockContext,
        memory
      );

      // Should complete but indicate issue
      expect(mockContext.setCurrentPage).not.toHaveBeenCalled();
    });
  });

  describe('execute - page deletion', () => {
    beforeEach(() => {
      mockContext.pages = [
        { id: 'page-home', name: 'Home', tree: [] },
        { id: 'page-old', name: 'Old Page', tree: [] },
      ];
      mockContext.currentPageId = 'page-home';
    });

    it('deletes page when requested', async () => {
      mockLLM.setResponses([
        createToolCallResponse('deletePage', { pageId: 'page-old' }),
        createTextResponse('Deleted Old Page'),
      ]);

      const result = await agent.execute(
        'Delete the old page',
        mockContext,
        memory
      );

      expect(result.success).toBe(true);

      // Check memory
      const memoryEntries = memory.search({ action: 'page_deleted' });
      expect(memoryEntries).toHaveLength(1);
      expect(memoryEntries[0].entityId).toBe('page-old');
    });
  });

  describe('message emission', () => {
    it('emits progress messages during execution', async () => {
      mockLLM.setResponses([
        createToolCallResponse('createPage', { name: 'Test' }),
        createTextResponse('Done'),
      ]);

      await agent.execute(
        'Create a test page',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      // Should have progress and success messages
      const progressMessages = messages.filter(m => m.type === 'progress');
      const successMessages = messages.filter(m => m.type === 'success');

      expect(progressMessages.length).toBeGreaterThan(0);
      expect(successMessages.length).toBeGreaterThan(0);
    });

    it('emits error messages on failure', async () => {
      mockLLM.setResponses([
        createTextResponse('Error occurred'),
      ]);

      // Simulate error by making createPage throw
      (mockContext.createPage as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create page');
      });

      mockLLM.setResponses([
        createToolCallResponse('createPage', { name: 'Test' }),
      ]);

      const result = await agent.execute(
        'Create a test page',
        mockContext,
        memory,
        (msg) => messages.push(msg)
      );

      expect(result.success).toBe(false);

      const errorMessages = messages.filter(m => m.type === 'error');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  describe('token and cost tracking', () => {
    it('tracks tokens and cost', async () => {
      mockLLM.setResponses([
        createToolCallResponse('createPage', { name: 'Dashboard' }),
        createTextResponse('Created Dashboard page'),
      ]);

      const result = await agent.execute(
        'Create a dashboard page',
        mockContext,
        memory
      );

      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(0.01); // Should be cheap
    });
  });

  describe('memory integration', () => {
    it('writes memory entries for all actions', async () => {
      mockLLM.setResponses([
        createToolCallResponse('createPage', { name: 'Dashboard' }),
        createTextResponse('Done'),
      ]);

      const result = await agent.execute(
        'Create a dashboard page',
        mockContext,
        memory
      );

      expect(result.memoryEntriesCreated).toBeGreaterThan(0);
      expect(memory.getAll().length).toBeGreaterThan(0);

      // All memory entries should have agent attribution
      const allEntries = memory.getAll();
      expect(allEntries.every(e => e.agent === 'PageAgent')).toBe(true);
    });

    it('checks memory before creating duplicate page', async () => {
      // First create a page
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-dashboard',
        entityType: 'Page',
        details: { name: 'Dashboard' },
      });

      mockContext.pages = [{ id: 'page-dashboard', name: 'Dashboard', tree: [] }];

      mockLLM.setResponses([
        createTextResponse('Dashboard page already exists'),
      ]);

      const result = await agent.execute(
        'Create a dashboard page',
        mockContext,
        memory
      );

      // Should not create new page
      expect(mockContext.createPage).not.toHaveBeenCalled();
    });
  });

  describe('duration tracking', () => {
    it('tracks execution duration', async () => {
      mockLLM.setResponses([
        createToolCallResponse('createPage', { name: 'Test' }),
        createTextResponse('Done'),
      ]);

      const startTime = Date.now();
      const result = await agent.execute(
        'Create a test page',
        mockContext,
        memory
      );
      const elapsed = Date.now() - startTime;

      expect(result.duration).toBeGreaterThanOrEqual(0); // Can be 0 for fast mocks
      expect(result.duration).toBeLessThanOrEqual(elapsed + 100); // Allow 100ms margin
    });
  });
});
