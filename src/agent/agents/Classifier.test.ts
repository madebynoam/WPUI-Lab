/**
 * Classifier Tests (TDD)
 *
 * Routes user requests to appropriate specialist agents using LLM
 */

import { Classifier } from './Classifier';
import { PageAgent } from './PageAgent';
import { CreatorAgent } from './CreatorAgent';
import { UpdateAgent } from './UpdateAgent';
import { MockLLMProvider, createTextResponse } from '../__mocks__/MockLLMProvider';
import { MemoryStore } from '../memory/MemoryStore';

describe('Classifier', () => {
  let classifier: Classifier;
  let mockLLM: MockLLMProvider;
  let memory: MemoryStore;
  let pageAgent: PageAgent;
  let creatorAgent: CreatorAgent;
  let updateAgent: UpdateAgent;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    memory = new MemoryStore();

    pageAgent = new PageAgent(mockLLM, memory);
    creatorAgent = new CreatorAgent(mockLLM, memory);
    updateAgent = new UpdateAgent(mockLLM, memory);

    // Pass all required arguments: agents, llm, memory
    classifier = new Classifier([pageAgent, creatorAgent, updateAgent], mockLLM, memory);
  });

  /**
   * Helper to set up mock LLM response for classification
   */
  function mockClassifyResponse(agentName: string | null) {
    mockLLM.setResponses([
      createTextResponse(agentName ?? 'NO_MATCH'),
    ]);
  }

  describe('interface compliance', () => {
    it('has classify method', () => {
      expect(typeof classifier.classify).toBe('function');
    });

    it('has registered agents', () => {
      expect(classifier.agents).toHaveLength(3);
      expect(classifier.agents.map(a => a.name)).toContain('PageAgent');
      expect(classifier.agents.map(a => a.name)).toContain('CreatorAgent');
      expect(classifier.agents.map(a => a.name)).toContain('UpdateAgent');
    });
  });

  describe('classify - page operations', () => {
    it('routes to PageAgent for page creation', async () => {
      mockClassifyResponse('PageAgent');
      const result = await classifier.classify('Create a dashboard page', memory);
      expect(result).toBe('PageAgent');
    });

    it('routes to PageAgent for contact page creation', async () => {
      mockClassifyResponse('PageAgent');
      const result = await classifier.classify('Create a contact page', memory);
      expect(result).toBe('PageAgent');
    });

    it('routes to PageAgent for page switching', async () => {
      mockClassifyResponse('PageAgent');
      const result = await classifier.classify('Switch to about page', memory);
      expect(result).toBe('PageAgent');
    });

    it('routes to PageAgent for page deletion', async () => {
      mockClassifyResponse('PageAgent');
      const result = await classifier.classify('Delete the pricing page', memory);
      expect(result).toBe('PageAgent');
    });
  });

  describe('classify - component creation', () => {
    it('routes to CreatorAgent for component creation', async () => {
      mockClassifyResponse('CreatorAgent');
      const result = await classifier.classify('Add a button', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for section templates', async () => {
      mockClassifyResponse('CreatorAgent');
      const result = await classifier.classify('Create a pricing section', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for table creation', async () => {
      mockClassifyResponse('CreatorAgent');
      const result = await classifier.classify('Add a users table', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for multiple components', async () => {
      mockClassifyResponse('CreatorAgent');
      const result = await classifier.classify('Add 3 cards in a grid', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for form creation', async () => {
      mockClassifyResponse('CreatorAgent');
      const result = await classifier.classify('Add a contact form', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for form on current page', async () => {
      mockClassifyResponse('CreatorAgent');
      const result = await classifier.classify('Add contact form to this page', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for login form', async () => {
      mockClassifyResponse('CreatorAgent');
      const result = await classifier.classify('Create a login form', memory);
      expect(result).toBe('CreatorAgent');
    });
  });

  describe('classify - component updates', () => {
    it('routes to UpdateAgent for prop updates', async () => {
      mockClassifyResponse('UpdateAgent');
      const result = await classifier.classify('Change button color to red', memory);
      expect(result).toBe('UpdateAgent');
    });

    it('routes to UpdateAgent for component deletion', async () => {
      mockClassifyResponse('UpdateAgent');
      const result = await classifier.classify('Delete the card', memory);
      expect(result).toBe('UpdateAgent');
    });

    it('routes to UpdateAgent for component moving', async () => {
      mockClassifyResponse('UpdateAgent');
      const result = await classifier.classify('Move the button into the card', memory);
      expect(result).toBe('UpdateAgent');
    });
  });

  describe('classify - edge cases', () => {
    it('returns null for unhandled requests', async () => {
      mockClassifyResponse(null);
      const result = await classifier.classify('What is the meaning of life?', memory);
      expect(result).toBeNull();
    });

    it('returns null for empty message', async () => {
      // Empty messages are handled before LLM call
      const result = await classifier.classify('', memory);
      expect(result).toBeNull();
    });

    it('returns null for invalid agent name from LLM', async () => {
      mockLLM.setResponses([
        createTextResponse('InvalidAgent'),
      ]);
      const result = await classifier.classify('Some request', memory);
      expect(result).toBeNull();
    });

    it('prefers PageAgent over CreatorAgent for page creation', async () => {
      mockClassifyResponse('PageAgent');
      const result = await classifier.classify('Create a new page called Dashboard', memory);
      expect(result).toBe('PageAgent');
    });

    it('prefers UpdateAgent over CreatorAgent for updates', async () => {
      mockClassifyResponse('UpdateAgent');
      const result = await classifier.classify('Update the submit button', memory);
      expect(result).toBe('UpdateAgent');
    });
  });

  describe('LLM integration', () => {
    it('calls LLM with correct message format', async () => {
      mockClassifyResponse('CreatorAgent');
      await classifier.classify('Add a button', memory);

      const calls = mockLLM.getCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0].messages).toHaveLength(2);
      expect(calls[0].messages[0].role).toBe('system');
      expect(calls[0].messages[1].role).toBe('user');
      expect(calls[0].messages[1].content).toContain('Add a button');
    });

    it('uses low temperature for deterministic routing', async () => {
      mockClassifyResponse('PageAgent');
      await classifier.classify('Create a page', memory);

      const calls = mockLLM.getCalls();
      expect(calls[0].temperature).toBeLessThanOrEqual(0.3);
    });
  });

  describe('with memory context', () => {
    it('uses memory to improve classification', async () => {
      // Pre-populate memory with recent component creation
      memory.write({
        agent: 'CreatorAgent',
        action: 'component_created',
        entityId: 'btn-1',
        entityType: 'Button',
        details: {},
      });

      mockClassifyResponse('UpdateAgent');
      const result = await classifier.classify('Make it primary', memory);

      // Should route to UpdateAgent since there's a recent component to update
      expect(result).toBe('UpdateAgent');
    });

    it('includes memory context in LLM prompt', async () => {
      // Pre-populate memory
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-1',
        entityType: 'Page',
        details: { name: 'Dashboard' },
      });

      mockClassifyResponse('CreatorAgent');
      await classifier.classify('Add a card', memory);

      const calls = mockLLM.getCalls();
      // System message should contain memory context
      expect(calls[0].messages[0].content).toContain('RECENT ACTIONS');
    });
  });

  describe('classifyMultiStep', () => {
    it('returns null for single-step requests', async () => {
      mockLLM.setResponses([
        createTextResponse('SINGLE_STEP'),
      ]);

      const result = await classifier.classifyMultiStep('Add a button', memory);
      expect(result).toBeNull();
    });

    it('parses multi-step JSON response', async () => {
      mockLLM.setResponses([
        createTextResponse(JSON.stringify({
          steps: [
            { agent: 'PageAgent', instruction: 'Create a dashboard page' },
            { agent: 'CreatorAgent', instruction: 'Add pricing cards' },
          ],
        })),
      ]);

      const result = await classifier.classifyMultiStep(
        'Create a dashboard page with pricing cards',
        memory
      );

      expect(result).toHaveLength(2);
      expect(result![0].agent).toBe('PageAgent');
      expect(result![0].instruction).toBe('Create a dashboard page');
      expect(result![1].agent).toBe('CreatorAgent');
      expect(result![1].instruction).toBe('Add pricing cards');
    });

    it('returns null for invalid JSON', async () => {
      mockLLM.setResponses([
        createTextResponse('invalid json {'),
      ]);

      const result = await classifier.classifyMultiStep('Some request', memory);
      expect(result).toBeNull();
    });

    it('returns null for empty message', async () => {
      const result = await classifier.classifyMultiStep('', memory);
      expect(result).toBeNull();
    });
  });

  describe('getAgent', () => {
    it('returns agent by name', () => {
      expect(classifier.getAgent('PageAgent')).toBe(pageAgent);
      expect(classifier.getAgent('CreatorAgent')).toBe(creatorAgent);
      expect(classifier.getAgent('UpdateAgent')).toBe(updateAgent);
    });

    it('returns null for unknown agent', () => {
      expect(classifier.getAgent('UnknownAgent')).toBeNull();
    });
  });
});
