/**
 * ValidatorAgent Tests (TDD)
 *
 * Validates that requested actions were completed successfully
 */

import { ValidatorAgent } from './ValidatorAgent';
import { MockLLMProvider, createTextResponse } from '../__mocks__/MockLLMProvider';
import { MemoryStore } from '../memory/MemoryStore';

describe('ValidatorAgent', () => {
  let agent: ValidatorAgent;
  let mockLLM: MockLLMProvider;
  let memory: MemoryStore;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    memory = new MemoryStore();
    agent = new ValidatorAgent(mockLLM, memory);
  });

  describe('interface compliance', () => {
    it('has correct name', () => {
      expect(agent.name).toBe('ValidatorAgent');
    });

    it('has validate method', () => {
      expect(typeof agent.validate).toBe('function');
    });
  });

  describe('validate - complete success', () => {
    it('validates single task completion', async () => {
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-1',
        entityType: 'Page',
        details: { name: 'Dashboard' },
      });

      mockLLM.setResponses([
        createTextResponse('Successfully created Dashboard page'),
      ]);

      const result = await agent.validate(
        'Create a dashboard page',
        memory
      );

      expect(result.success).toBe(true);
      expect(result.completedTasks).toBe(1);
      expect(result.totalTasks).toBe(1);
      expect(result.message).toContain('Completed 1/1');
    });

    it('validates multiple task completion', async () => {
      // User asked to create page and add 3 cards
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-1',
        entityType: 'Page',
        details: { name: 'Dashboard' },
      });

      memory.write({
        agent: 'CreatorAgent',
        action: 'component_created',
        entityId: ['card-1', 'card-2', 'card-3'],
        entityType: 'Card',
        details: { count: 3 },
      });

      mockLLM.setResponses([
        createTextResponse('Created page and 3 cards successfully'),
      ]);

      const result = await agent.validate(
        'Create a dashboard page and add 3 cards',
        memory
      );

      expect(result.success).toBe(true);
      expect(result.completedTasks).toBe(2); // Page + components
      expect(result.totalTasks).toBe(2);
      expect(result.message).toContain('Completed 2/2');
    });
  });

  describe('validate - partial completion', () => {
    it('detects partial completion', async () => {
      // User asked for 5 cards, only 3 created
      memory.write({
        agent: 'CreatorAgent',
        action: 'component_created',
        entityId: ['card-1', 'card-2', 'card-3'],
        entityType: 'Card',
        details: { count: 3 },
      });

      mockLLM.setResponses([
        createTextResponse('Only created 3 cards instead of 5'),
      ]);

      const result = await agent.validate(
        'Add 5 cards in a grid',
        memory
      );

      expect(result.success).toBe(false);
      expect(result.completedTasks).toBeLessThan(result.totalTasks);
      expect(result.message).toContain('I was only able to complete');
    });

    it('detects errors in memory', async () => {
      memory.write({
        agent: 'CreatorAgent',
        action: 'error',
        details: { error: 'Failed to create component' },
      });

      mockLLM.setResponses([
        createTextResponse('Failed to create components'),
      ]);

      const result = await agent.validate(
        'Add a button',
        memory
      );

      expect(result.success).toBe(false);
      expect(result.completedTasks).toBe(0);
      expect(result.message).toContain('error');
    });
  });

  describe('validate - no actions taken', () => {
    it('handles empty memory', async () => {
      mockLLM.setResponses([
        createTextResponse('No actions were taken'),
      ]);

      const result = await agent.validate(
        'Do something',
        memory
      );

      expect(result.success).toBe(false);
      expect(result.completedTasks).toBe(0);
      expect(result.message).toContain('No actions');
    });
  });

  describe('message format', () => {
    it('formats success message correctly', async () => {
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-1',
        entityType: 'Page',
        details: { name: 'Dashboard' },
      });

      memory.write({
        agent: 'CreatorAgent',
        action: 'component_created',
        entityId: 'card-1',
        entityType: 'Card',
        details: {},
      });

      memory.write({
        agent: 'UpdateAgent',
        action: 'component_updated',
        entityId: 'btn-1',
        entityType: 'Button',
        details: {},
      });

      mockLLM.setResponses([
        createTextResponse('All tasks completed successfully'),
      ]);

      const result = await agent.validate(
        'Create dashboard, add card, update button',
        memory
      );

      expect(result.message).toMatch(/Completed \d+\/\d+ tasks/);
    });

    it('formats partial completion message correctly', async () => {
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-1',
        entityType: 'Page',
        details: { name: 'Dashboard' },
      });

      // Only 1 of 2 tasks completed
      mockLLM.setResponses([
        createTextResponse('Only created page, failed to add components'),
      ]);

      const result = await agent.validate(
        'Create dashboard and add 3 cards',
        memory
      );

      expect(result.message).toContain('I was only able to complete');
      expect(result.message).toMatch(/\d+\s+out of\s+\d+\s+tasks/);
    });
  });

  describe('token and cost tracking', () => {
    it('tracks tokens and cost', async () => {
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-1',
        entityType: 'Page',
        details: {},
      });

      mockLLM.setResponses([
        createTextResponse('Success'),
      ]);

      const result = await agent.validate('Create a page', memory);

      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(0.001); // Very cheap validation
    });
  });

  describe('memory analysis', () => {
    it('counts actions from memory correctly', async () => {
      // Multiple actions
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-1',
        entityType: 'Page',
        details: {},
      });

      memory.write({
        agent: 'CreatorAgent',
        action: 'component_created',
        entityId: 'card-1',
        entityType: 'Card',
        details: {},
      });

      memory.write({
        agent: 'CreatorAgent',
        action: 'component_created',
        entityId: 'card-2',
        entityType: 'Card',
        details: {},
      });

      mockLLM.setResponses([
        createTextResponse('Created page and 2 cards'),
      ]);

      const result = await agent.validate(
        'Create page and add 2 cards',
        memory
      );

      // Should recognize 3 distinct actions
      expect(result.completedTasks).toBeGreaterThan(0);
    });
  });
});
