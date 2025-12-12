/**
 * Classifier Tests (TDD)
 *
 * Routes user requests to appropriate specialist agents
 */

import { Classifier } from './Classifier';
import { PageAgent } from './PageAgent';
import { CreatorAgent } from './CreatorAgent';
import { UpdateAgent } from './UpdateAgent';
import { MockLLMProvider } from '../__mocks__/MockLLMProvider';
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

    classifier = new Classifier([pageAgent, creatorAgent, updateAgent]);
  });

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
      const result = await classifier.classify('Create a dashboard page', memory);
      expect(result).toBe('PageAgent');
    });

    it('routes to PageAgent for contact page creation', async () => {
      const result = await classifier.classify('Create a contact page', memory);
      expect(result).toBe('PageAgent');
    });

    it('routes to PageAgent for page switching', async () => {
      const result = await classifier.classify('Switch to about page', memory);
      expect(result).toBe('PageAgent');
    });

    it('routes to PageAgent for page deletion', async () => {
      const result = await classifier.classify('Delete the pricing page', memory);
      expect(result).toBe('PageAgent');
    });
  });

  describe('classify - component creation', () => {
    it('routes to CreatorAgent for component creation', async () => {
      const result = await classifier.classify('Add a button', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for section templates', async () => {
      const result = await classifier.classify('Create a pricing section', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for table creation', async () => {
      const result = await classifier.classify('Add a users table', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for multiple components', async () => {
      const result = await classifier.classify('Add 3 cards in a grid', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for form creation', async () => {
      const result = await classifier.classify('Add a contact form', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for form on current page', async () => {
      const result = await classifier.classify('Add contact form to this page', memory);
      expect(result).toBe('CreatorAgent');
    });

    it('routes to CreatorAgent for login form', async () => {
      const result = await classifier.classify('Create a login form', memory);
      expect(result).toBe('CreatorAgent');
    });
  });

  describe('classify - component updates', () => {
    it('routes to UpdateAgent for prop updates', async () => {
      const result = await classifier.classify('Change button color to red', memory);
      expect(result).toBe('UpdateAgent');
    });

    it('routes to UpdateAgent for component deletion', async () => {
      const result = await classifier.classify('Delete the card', memory);
      expect(result).toBe('UpdateAgent');
    });

    it('routes to UpdateAgent for component moving', async () => {
      const result = await classifier.classify('Move the button into the card', memory);
      expect(result).toBe('UpdateAgent');
    });
  });

  describe('classify - edge cases', () => {
    it('returns null for unhandled requests', async () => {
      const result = await classifier.classify('What is the meaning of life?', memory);
      expect(result).toBeNull();
    });

    it('returns null for empty message', async () => {
      const result = await classifier.classify('', memory);
      expect(result).toBeNull();
    });

    it('prefers PageAgent over CreatorAgent for page creation', async () => {
      // "Create" keyword could match both, but PageAgent should win for pages
      const result = await classifier.classify('Create a new page called Dashboard', memory);
      expect(result).toBe('PageAgent');
    });

    it('prefers UpdateAgent over CreatorAgent for updates', async () => {
      // Both might match "button" but UpdateAgent should win for modifications
      const result = await classifier.classify('Update the submit button', memory);
      expect(result).toBe('UpdateAgent');
    });
  });

  describe('performance', () => {
    it('classifies quickly without LLM calls', async () => {
      const start = Date.now();
      await classifier.classify('Add a button', memory);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be nearly instant
      expect(mockLLM.getCalls()).toHaveLength(0); // No LLM calls for clear cases
    });

    it('handles batch classification efficiently', async () => {
      const messages = [
        'Create a page',
        'Add a button',
        'Update the card',
        'Delete the heading',
        'Create a pricing section',
      ];

      const start = Date.now();
      const results = await Promise.all(
        messages.map(msg => classifier.classify(msg, memory))
      );
      const duration = Date.now() - start;

      expect(results).toEqual(['PageAgent', 'CreatorAgent', 'UpdateAgent', 'UpdateAgent', 'CreatorAgent']);
      expect(duration).toBeLessThan(200);
      expect(mockLLM.getCalls()).toHaveLength(0);
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

      // Ambiguous request that could refer to the recent button
      const result = await classifier.classify('Make it primary', memory);

      // Should route to UpdateAgent since there's a recent component to update
      expect(result).toBe('UpdateAgent');
    });
  });
});
