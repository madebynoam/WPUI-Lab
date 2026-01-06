/**
 * Agent Orchestrator Integration Tests
 *
 * Tests the full multi-agent workflow with all components working together
 */

import { AgentOrchestrator } from '../agentOrchestrator';
import { ToolContext } from '../types';
import { AgentProgressMessage } from '../agents/types';
import { MockLLMProvider, createToolCallResponse, createTextResponse } from '../__mocks__/MockLLMProvider';
import { MemoryStore } from '../memory/MemoryStore';
import { Classifier } from '../agents/Classifier';
import { PageAgent } from '../agents/PageAgent';
import { CreatorAgent } from '../agents/CreatorAgent';
import { UpdateAgent } from '../agents/UpdateAgent';
import { ValidatorAgent } from '../agents/ValidatorAgent';

describe('AgentOrchestrator Integration Tests', () => {
  let orchestrator: AgentOrchestrator;
  let mockLLM: MockLLMProvider;
  let mockContext: ToolContext;
  let messages: AgentProgressMessage[];
  let memory: MemoryStore;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    memory = new MemoryStore();

    // Create agents with mock LLM
    const pageAgent = new PageAgent(mockLLM, memory);
    const creatorAgent = new CreatorAgent(mockLLM, memory);
    const updateAgent = new UpdateAgent(mockLLM, memory);
    const validatorAgent = new ValidatorAgent(mockLLM, memory);

    // Create classifier with agents and mock LLM
    const classifier = new Classifier(
      [pageAgent, creatorAgent, updateAgent],
      mockLLM,
      memory
    );

    // Create orchestrator using test factory
    orchestrator = AgentOrchestrator.createForTesting({
      memory,
      classifier,
      pageAgent,
      creatorAgent,
      updateAgent,
      validatorAgent,
    });

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
  });

  describe('full workflow - page creation', () => {
    it('creates page and validates successfully', async () => {
      // Setup mock responses in order:
      // 1. Classifier.classifyMultiStep (returns SINGLE_STEP)
      // 2. Classifier.classify (returns PageAgent)
      // 3. PageAgent.execute (returns tool call)
      // 4. ValidatorAgent.validate (returns validation message)
      mockLLM.setResponses([
        createTextResponse('SINGLE_STEP'),  // classifyMultiStep
        createTextResponse('PageAgent'),     // classify
        createToolCallResponse('createPage', { name: 'Dashboard' }),  // PageAgent
        createTextResponse('Completed 1/1 tasks. Created Dashboard page'),  // ValidatorAgent
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
      expect(result.memoryEntriesCreated).toBeGreaterThan(0);

      // Check memory
      const pageCreatedEntries = orchestrator.getMemory().search({ action: 'page_created' });
      expect(pageCreatedEntries).toHaveLength(1);
      expect(pageCreatedEntries[0].details.name).toBe('Dashboard');

      // Check messages were emitted
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(m => m.agent === 'Classifier')).toBe(true);
      expect(messages.some(m => m.agent === 'PageAgent')).toBe(true);
    }, 10000);
  });

  describe('full workflow - component creation', () => {
    it('creates components and validates successfully', async () => {
      mockLLM.setResponses([
        createTextResponse('SINGLE_STEP'),   // classifyMultiStep
        createTextResponse('CreatorAgent'),   // classify
        createTextResponse('["Add a card"]'),  // CreatorAgent decomposer
        createToolCallResponse('buildFromMarkup', {
          markup: '<Card><CardHeader><Heading level={3}>Title</Heading></CardHeader></Card>',
        }),
        createTextResponse('Completed 1/1 tasks. Created card'),  // ValidatorAgent
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

      const componentCreatedEntries = orchestrator.getMemory().search({ action: 'component_created' });
      expect(componentCreatedEntries).toHaveLength(1);
    }, 10000);
  });

  describe('full workflow - component update', () => {
    it('updates component and validates successfully', async () => {
      // Setup existing component
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
        createTextResponse('SINGLE_STEP'),   // classifyMultiStep
        createTextResponse('UpdateAgent'),    // classify
        createToolCallResponse('component_update', {
          componentId: 'btn-1',
          props: { variant: 'primary' },
        }),
        createTextResponse('Completed 1/1 tasks. Updated button.'),  // ValidatorAgent
      ]);

      const result = await orchestrator.handleMessage(
        'Make the button primary',
        mockContext,
        {
          onProgress: (msg) => messages.push(msg),
        }
      );

      expect(result.success).toBe(true);

      const updateEntries = orchestrator.getMemory().search({ action: 'component_updated' });
      expect(updateEntries).toHaveLength(1);
    }, 10000);
  });

  describe('error handling', () => {
    it('handles unrecognized requests', async () => {
      mockLLM.setResponses([
        createTextResponse('SINGLE_STEP'),  // classifyMultiStep
        createTextResponse('NO_MATCH'),      // classify returns no agent
      ]);

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
        createTextResponse('SINGLE_STEP'),  // classifyMultiStep
        createTextResponse('PageAgent'),     // classify
        createToolCallResponse('createPage', { name: '' }),  // PageAgent with bad args
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
    });
  });

  describe('multi-step workflows', () => {
    it('handles page creation + component creation via multi-step', async () => {
      mockLLM.setResponses([
        // classifyMultiStep returns multi-step workflow
        createTextResponse(JSON.stringify({
          steps: [
            { agent: 'PageAgent', instruction: 'Create a dashboard page' },
            { agent: 'CreatorAgent', instruction: 'Add pricing cards' },
          ],
        })),
        // PageAgent.execute
        createToolCallResponse('createPage', { name: 'Dashboard' }),
        // CreatorAgent.execute (decomposer + tool)
        createTextResponse('["Add pricing cards"]'),
        createToolCallResponse('buildFromMarkup', { markup: '<Card />' }),
        // ValidatorAgent
        createTextResponse('Completed 2/2 tasks.'),
      ]);

      const result = await orchestrator.handleMessage(
        'Create a dashboard page with pricing cards',
        mockContext,
        { onProgress: (msg) => messages.push(msg) }
      );

      expect(result.success).toBe(true);

      // Memory should have both page and component creation
      const mem = orchestrator.getMemory();
      expect(mem.search({ action: 'page_created' })).toHaveLength(1);
      expect(mem.search({ action: 'component_created' })).toHaveLength(1);
    }, 10000);
  });

  describe('streaming messages', () => {
    it('emits incremental progress messages', async () => {
      mockLLM.setResponses([
        createTextResponse('SINGLE_STEP'),
        createTextResponse('PageAgent'),
        createToolCallResponse('createPage', { name: 'Test' }),
        createTextResponse('Completed 1/1 tasks.'),
      ]);

      await orchestrator.handleMessage(
        'Create a test page',
        mockContext,
        { onProgress: (msg) => messages.push(msg) }
      );

      // Should have messages from Classifier and PageAgent
      const classifierMessages = messages.filter(m => m.agent === 'Classifier');
      const pageAgentMessages = messages.filter(m => m.agent === 'PageAgent');

      expect(classifierMessages.length).toBeGreaterThan(0);
      expect(pageAgentMessages.length).toBeGreaterThan(0);

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
        createTextResponse('SINGLE_STEP'),
        createTextResponse('PageAgent'),
        createToolCallResponse('createPage', { name: 'Dashboard' }),
        createTextResponse('Completed 1/1 tasks.'),
      ]);

      const result = await orchestrator.handleMessage(
        'Create a dashboard page',
        mockContext
      );

      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(0.01);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    }, 10000);
  });
});
