/**
 * MemoryStore Tests (TDD)
 *
 * Write tests first, then implement MemoryStore to pass them
 */

import { MemoryStore } from './MemoryStore';
import { ActionType } from '../__fixtures__/memory';

describe('MemoryStore', () => {
  let memory: MemoryStore;

  beforeEach(() => {
    memory = new MemoryStore();
  });

  describe('write', () => {
    it('writes entry and returns it with id and timestamp', () => {
      const entry = memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-123',
        entityType: 'Page',
        details: { name: 'Dashboard' },
      });

      expect(entry.id).toBeDefined();
      expect(entry.id).toMatch(/^mem-/);
      expect(entry.timestamp).toBeDefined();
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.agent).toBe('PageAgent');
      expect(entry.action).toBe('page_created');
      expect(entry.entityId).toBe('page-123');
    });

    it('generates unique IDs for each entry', () => {
      const entry1 = memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        details: {},
      });

      const entry2 = memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        details: {},
      });

      expect(entry1.id).not.toBe(entry2.id);
    });

    it('preserves all provided fields', () => {
      const entry = memory.write({
        agent: 'CreatorAgent',
        action: 'component_created',
        entityId: 'card-abc',
        entityType: 'Card',
        details: { method: 'buildFromMarkup' },
        parentAction: 'mem-parent',
      });

      expect(entry.agent).toBe('CreatorAgent');
      expect(entry.action).toBe('component_created');
      expect(entry.entityId).toBe('card-abc');
      expect(entry.entityType).toBe('Card');
      expect(entry.details).toEqual({ method: 'buildFromMarkup' });
      expect(entry.parentAction).toBe('mem-parent');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      // Setup test data
      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-1',
        entityType: 'Page',
        details: { name: 'Dashboard' },
      });

      memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        entityId: 'page-2',
        entityType: 'Page',
        details: { name: 'About' },
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
    });

    it('searches by action', () => {
      const results = memory.search({ action: 'page_created' });
      expect(results).toHaveLength(2);
      expect(results[0].action).toBe('page_created');
      expect(results[1].action).toBe('page_created');
    });

    it('searches by agent', () => {
      const results = memory.search({ agent: 'PageAgent' });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.agent === 'PageAgent')).toBe(true);
    });

    it('searches by entityId', () => {
      const results = memory.search({ entityId: 'card-1' });
      expect(results).toHaveLength(1);
      expect(results[0].entityId).toBe('card-1');
    });

    it('searches by entityType', () => {
      const results = memory.search({ entityType: 'Page' });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.entityType === 'Page')).toBe(true);
    });

    it('combines multiple filters (AND logic)', () => {
      const results = memory.search({
        agent: 'PageAgent',
        action: 'page_created',
      });

      expect(results).toHaveLength(2);
      expect(results.every(r =>
        r.agent === 'PageAgent' && r.action === 'page_created'
      )).toBe(true);
    });

    it('returns latest entry only when latest: true', () => {
      const results = memory.search({
        action: 'page_created',
        latest: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].entityId).toBe('page-2'); // Most recent
    });

    it('filters by timestamp with since parameter', async () => {
      const beforeTimestamp = Date.now();

      await new Promise(resolve => setTimeout(resolve, 10));

      memory.write({
        agent: 'UpdateAgent',
        action: 'component_deleted',
        entityId: 'card-old',
        entityType: 'Card',
        details: {},
      });

      const results = memory.search({ since: beforeTimestamp });
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('component_deleted');
    });

    it('returns empty array when no matches', () => {
      const results = memory.search({ action: 'nonexistent_action' as ActionType });
      expect(results).toEqual([]);
    });

    it('returns all entries when no query provided', () => {
      const results = memory.search({});
      expect(results).toHaveLength(4);
    });
  });

  describe('get', () => {
    it('returns entry by ID', () => {
      const written = memory.write({
        agent: 'PageAgent',
        action: 'page_created',
        details: {},
      });

      const retrieved = memory.get(written.id);
      expect(retrieved).toEqual(written);
    });

    it('returns null when ID not found', () => {
      const result = memory.get('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('returns all entries in chronological order', () => {
      memory.write({ agent: 'Agent1', action: 'page_created', details: {} });
      memory.write({ agent: 'Agent2', action: 'component_created', details: {} });
      memory.write({ agent: 'Agent3', action: 'component_updated', details: {} });

      const all = memory.getAll();
      expect(all).toHaveLength(3);
      expect(all[0].agent).toBe('Agent1');
      expect(all[1].agent).toBe('Agent2');
      expect(all[2].agent).toBe('Agent3');
    });

    it('returns empty array when no entries', () => {
      const all = memory.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      memory.write({ agent: 'PageAgent', action: 'page_created', details: {} });
      memory.write({ agent: 'CreatorAgent', action: 'component_created', details: {} });

      expect(memory.getAll()).toHaveLength(2);

      memory.clear();

      expect(memory.getAll()).toEqual([]);
    });

    it('allows new writes after clear', () => {
      memory.write({ agent: 'PageAgent', action: 'page_created', details: {} });
      memory.clear();

      const entry = memory.write({ agent: 'CreatorAgent', action: 'component_created', details: {} });
      expect(entry).toBeDefined();
      expect(memory.getAll()).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('handles entityId as array', () => {
      const entry = memory.write({
        agent: 'CreatorAgent',
        action: 'component_created',
        entityId: ['card-1', 'card-2', 'card-3'],
        entityType: 'Card',
        details: { count: 3 },
      });

      expect(entry.entityId).toEqual(['card-1', 'card-2', 'card-3']);
    });

    it('handles missing optional fields', () => {
      const entry = memory.write({
        agent: 'ValidatorAgent',
        action: 'validation_passed',
        details: { summary: 'All good' },
      });

      expect(entry.entityId).toBeUndefined();
      expect(entry.entityType).toBeUndefined();
      expect(entry.parentAction).toBeUndefined();
    });

    it('handles complex details objects', () => {
      const complexDetails = {
        changes: { variant: 'primary', size: 'large' },
        metadata: { userId: '123', timestamp: Date.now() },
        nested: { deep: { value: 'test' } },
      };

      const entry = memory.write({
        agent: 'UpdateAgent',
        action: 'component_updated',
        details: complexDetails,
      });

      expect(entry.details).toEqual(complexDetails);
    });

    it('preserves entry order with same timestamp', () => {
      const entry1 = memory.write({ agent: 'Agent1', action: 'page_created', details: {} });
      const entry2 = memory.write({ agent: 'Agent2', action: 'page_created', details: {} });

      const all = memory.getAll();
      expect(all[0].id).toBe(entry1.id);
      expect(all[1].id).toBe(entry2.id);
    });
  });

  describe('performance', () => {
    it('handles many entries efficiently', () => {
      const startTime = Date.now();

      // Write 1000 entries
      for (let i = 0; i < 1000; i++) {
        memory.write({
          agent: `Agent${i % 3}`,
          action: i % 2 === 0 ? 'page_created' : 'component_created',
          entityId: `entity-${i}`,
          details: { index: i },
        });
      }

      const writeTime = Date.now() - startTime;
      expect(writeTime).toBeLessThan(100); // Should take less than 100ms

      const searchStartTime = Date.now();
      const results = memory.search({ action: 'page_created' });
      const searchTime = Date.now() - searchStartTime;

      expect(results).toHaveLength(500);
      expect(searchTime).toBeLessThan(50); // Search should be fast
    });
  });
});
