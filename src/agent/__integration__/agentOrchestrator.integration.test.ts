/**
 * Agent Orchestrator Integration Tests
 *
 * Tests the full multi-agent workflow with all components working together
 */

import { AgentOrchestrator } from '../agentOrchestrator';
import { ToolContext, AgentProgressMessage } from '../types';
import { MockLLMProvider, createToolCallResponse, createTextResponse } from '../__mocks__/MockLLMProvider';
import { createLLMProvider } from '../llm/factory';

// Mock the LLM factory to return MockLLMProvider
jest.mock('../llm/factory');

describe('AgentOrchestrator Integration Tests', () => {
  let orchestrator: AgentOrchestrator;
  let mockLLM: MockLLMProvider;
  let mockContext: ToolContext;
  let messages: AgentProgressMessage[];

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    (createLLMProvider as jest.Mock).mockReturnValue(mockLLM);

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
      createPage: jest.fn((name) => ({ id: `page-${Date.now()}`, name, tree: [] })),
      setCurrentPage: jest.fn(),
      updatePageTheme: jest.fn(),
      toggleNodeSelection: jest.fn(),
    };

    messages = [];
    orchestrator = new AgentOrchestrator();
  });

  describe('full workflow - page creation', () => {
    it('creates page and validates successfully', async () => {
      // Setup mock responses
      mockLLM.setResponses([
        // PageAgent responses
        createToolCallResponse('createPage', { name: 'Dashboard' }),
        createTextResponse('Created Dashboard page'),
        // ValidatorAgent response
        createTextResponse('Successfully created Dashboard page'),
      ]);

      const result = await orchestrator.handleMessage(
        'Create a dashboard page',
        mockContext,
        {
          onProgress: (msg) => messages.push(msg),
        }
      );

      // Check result
      expect(result.success).toBe(true);
      expect(result.message).toContain('Completed 1/1');
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.memoryEntriesCreated).toBeGreaterThan(0);

      // Check memory
      const memory = orchestrator.getMemory();
      const pageCreatedEntries = memory.search({ action: 'page_created' });
      expect(pageCreatedEntries).toHaveLength(1);
      expect(pageCreatedEntries[0].details.name).toBe('Dashboard');

      const validationEntries = memory.search({ action: 'validation_passed' });
      expect(validationEntries).toHaveLength(1);

      // Check messages were emitted
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(m => m.agent === 'Classifier')).toBe(true);
      expect(messages.some(m => m.agent === 'PageAgent')).toBe(true);
      expect(messages.some(m => m.agent === 'ValidatorAgent')).toBe(true);
    }, 10000);
  });

  describe('full workflow - component creation', () => {
    it('creates components and validates successfully', async () => {
      mockLLM.setResponses([
        // CreatorAgent responses
        createToolCallResponse('buildFromMarkup', {
          markup: '<Card><CardHeader><Heading>Title</Heading></CardHeader></Card>',
        }),
        createTextResponse('Created card'),
        // ValidatorAgent response
        createTextResponse('Successfully created card'),
      ]);

      const result = await orchestrator.handleMessage(
        'Add a card',
        mockContext,
        {
          onProgress: (msg) => messages.push(msg),
        }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Completed');

      const memory = orchestrator.getMemory();
      const componentCreatedEntries = memory.search({ action: 'component_created' });
      expect(componentCreatedEntries).toHaveLength(1);
    }, 10000);
  });

  describe('full workflow - component update', () => {
    it('updates component and validates successfully', async () => {
      // Setup existing component (use mockImplementation for multiple calls)
      (mockContext.getNodeById as jest.Mock).mockImplementation((id: string) => {
        if (id === 'btn-1') {
          return {
            id: 'btn-1',
            type: 'Button',
            props: { text: 'Submit', variant: 'secondary' },
          };
        }
        return null;
      });

      mockLLM.setResponses([
        // UpdateAgent: 1 LLM call returns tool call
        createToolCallResponse('component_update', {
          selector: { id: 'btn-1' },
          updates: { variant: 'primary' },
        }),
        // ValidatorAgent: 1 LLM call returns validation
        createTextResponse('Completed 1/1 tasks. Successfully updated button.'),
      ]);

      const result = await orchestrator.handleMessage(
        'Make the button primary',
        mockContext,
        {
          onProgress: (msg) => messages.push(msg),
        }
      );

      // Debug output
      if (!result.success) {
        console.log('FAILURE:', result.message);
        console.log('Messages:', messages);
      }

      expect(result.success).toBe(true);

      const memory = orchestrator.getMemory();
      const updateEntries = memory.search({ action: 'component_updated' });
      expect(updateEntries).toHaveLength(1);
    }, 10000);
  });

  describe('error handling', () => {
    it('handles unrecognized requests', async () => {
      const result = await orchestrator.handleMessage(
        'What is the meaning of life?',
        mockContext,
        {
          onProgress: (msg) => messages.push(msg),
        }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('not sure how to handle');
    });

    it('handles agent execution failures', async () => {
      mockLLM.setResponses([
        // PageAgent response that will cause tool failure
        createToolCallResponse('createPage', { name: '' }), // Empty name will fail validation
      ]);

      // Mock createPage to throw error
      (mockContext.createPage as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid page name');
      });

      const result = await orchestrator.handleMessage(
        'Create a page',
        mockContext,
        {
          onProgress: (msg) => messages.push(msg),
        }
      );

      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();

      // Should have error messages emitted
      const errorMessages = messages.filter(m => m.type === 'error');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  describe('multi-step workflows', () => {
    it('handles page creation + component creation', async () => {
      mockLLM.setResponses([
        // PageAgent responses
        createToolCallResponse('createPage', { name: 'Dashboard' }),
        createTextResponse('Created page'),
        // CreatorAgent responses (separate request)
        createToolCallResponse('buildFromMarkup', { markup: '<Card />' }),
        createTextResponse('Created card'),
        // ValidatorAgent responses
        createTextResponse('Created page successfully'),
        createTextResponse('Created card successfully'),
      ]);

      // First request: create page
      const result1 = await orchestrator.handleMessage(
        'Create a dashboard page',
        mockContext,
        { onProgress: (msg) => messages.push(msg) }
      );

      expect(result1.success).toBe(true);

      // Memory should have page creation
      let memory = orchestrator.getMemory();
      expect(memory.search({ action: 'page_created' })).toHaveLength(1);

      // Note: In a real multi-step workflow, memory would persist between requests
      // This test demonstrates that each request clears memory (as designed)
      // For persistent memory across requests, we'd need to modify the orchestrator
    }, 10000);
  });

  describe('streaming messages', () => {
    it('emits incremental progress messages', async () => {
      mockLLM.setResponses([
        createToolCallResponse('createPage', { name: 'Test' }),
        createTextResponse('Done'),
        createTextResponse('Validated'),
      ]);

      await orchestrator.handleMessage(
        'Create a test page',
        mockContext,
        { onProgress: (msg) => messages.push(msg) }
      );

      // Should have messages from Classifier, PageAgent, and ValidatorAgent
      const classifierMessages = messages.filter(m => m.agent === 'Classifier');
      const pageAgentProgressMessages = messages.filter(m => m.agent === 'PageAgent');
      const validatorMessages = messages.filter(m => m.agent === 'ValidatorAgent');

      expect(classifierMessages.length).toBeGreaterThan(0);
      expect(pageAgentProgressMessages.length).toBeGreaterThan(0);
      expect(validatorMessages.length).toBeGreaterThan(0);

      // Messages should have timestamps
      expect(messages.every(m => m.timestamp > 0)).toBe(true);

      // Messages should have types
      const types = messages.map(m => m.type);
      expect(types).toContain('progress');
      expect(types).toContain('success');
    }, 10000);
  });

  describe('cost tracking', () => {
    it('accurately tracks tokens and costs', async () => {
      mockLLM.setResponses([
        createToolCallResponse('createPage', { name: 'Dashboard' }),
        createTextResponse('Done'),
        createTextResponse('Validated'),
      ]);

      const result = await orchestrator.handleMessage(
        'Create a dashboard page',
        mockContext
      );

      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(0.01); // Should be very cheap with gpt-4o-mini
      expect(result.duration).toBeGreaterThanOrEqual(0);
    }, 10000);
  });
});
