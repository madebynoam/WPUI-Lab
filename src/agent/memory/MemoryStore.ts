/**
 * Memory Store
 *
 * In-memory storage for agent actions and state.
 * Provides cheap, fast search alternative to re-prompting full context.
 */

import { MemoryEntry, MemoryQuery } from './types';

export class MemoryStore {
  private entries: MemoryEntry[] = [];

  /**
   * Write a new entry to memory
   * Automatically generates ID and timestamp
   */
  write(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): MemoryEntry {
    const fullEntry: MemoryEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.entries.push(fullEntry);
    return fullEntry;
  }

  /**
   * Search memory with filters
   * All filters use AND logic (must match all provided criteria)
   */
  search(query: MemoryQuery): MemoryEntry[] {
    let results = this.entries;

    // Filter by action
    if (query.action) {
      results = results.filter(entry => entry.action === query.action);
    }

    // Filter by agent
    if (query.agent) {
      results = results.filter(entry => entry.agent === query.agent);
    }

    // Filter by entityId
    if (query.entityId) {
      results = results.filter(entry => {
        if (!entry.entityId) return false;

        // Handle both string and array entityId
        if (Array.isArray(entry.entityId)) {
          return entry.entityId.includes(query.entityId as string);
        }

        return entry.entityId === query.entityId;
      });
    }

    // Filter by entityType
    if (query.entityType) {
      results = results.filter(entry => entry.entityType === query.entityType);
    }

    // Filter by timestamp (since)
    if (query.since !== undefined) {
      results = results.filter(entry => entry.timestamp > query.since!);
    }

    // Return only latest
    if (query.latest && results.length > 0) {
      return [results[results.length - 1]];
    }

    return results;
  }

  /**
   * Get specific entry by ID
   */
  get(id: string): MemoryEntry | null {
    const entry = this.entries.find(e => e.id === id);
    return entry || null;
  }

  /**
   * Get all entries in chronological order
   */
  getAll(): MemoryEntry[] {
    return [...this.entries];
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get entry count
   */
  size(): number {
    return this.entries.length;
  }

  /**
   * Generate unique ID for memory entry
   */
  private generateId(): string {
    return `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export * from './types';
