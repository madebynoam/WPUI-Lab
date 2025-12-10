/**
 * Memory System Types
 */

export type ActionType =
  | 'page_created'
  | 'page_switched'
  | 'page_deleted'
  | 'component_created'
  | 'component_updated'
  | 'component_deleted'
  | 'component_moved'
  | 'validation_passed'
  | 'validation_failed'
  | 'error';

export interface MemoryEntry {
  id: string;
  timestamp: number;
  agent: string;
  action: ActionType;
  entityId?: string | string[];
  entityType?: string;
  details: any;
  parentAction?: string;
}

export interface MemoryQuery {
  action?: ActionType;
  agent?: string;
  entityId?: string | string[];
  entityType?: string;
  latest?: boolean;
  since?: number;
}
