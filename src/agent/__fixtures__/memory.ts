/**
 * Test Fixtures: Memory Entries
 *
 * Reusable memory entry data for testing
 */

export type ActionType =
  | 'page_created'
  | 'page_switched'
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

/**
 * Page created entry
 */
export const pageCreatedEntry: MemoryEntry = {
  id: 'mem-1',
  timestamp: Date.now(),
  agent: 'PageAgent',
  action: 'page_created',
  entityId: 'page-123',
  entityType: 'Page',
  details: { name: 'Dashboard' },
};

/**
 * Page switched entry
 */
export const pageSwitchedEntry: MemoryEntry = {
  id: 'mem-2',
  timestamp: Date.now(),
  agent: 'PageAgent',
  action: 'page_switched',
  entityId: 'page-456',
  entityType: 'Page',
  details: { previousPageId: 'page-123' },
};

/**
 * Component created entry (single)
 */
export const componentCreatedEntry: MemoryEntry = {
  id: 'mem-3',
  timestamp: Date.now(),
  agent: 'CreatorAgent',
  action: 'component_created',
  entityId: 'card-abc',
  entityType: 'Card',
  details: {
    method: 'buildFromMarkup',
    parentId: 'root-vstack',
  },
  parentAction: 'mem-1',
};

/**
 * Component created entry (multiple)
 */
export const multipleComponentsCreatedEntry: MemoryEntry = {
  id: 'mem-4',
  timestamp: Date.now(),
  agent: 'CreatorAgent',
  action: 'component_created',
  entityId: ['card-1', 'card-2', 'card-3'],
  entityType: 'Card',
  details: {
    method: 'buildFromMarkup',
    count: 3,
    parentId: 'root-vstack',
  },
  parentAction: 'mem-1',
};

/**
 * Component updated entry
 */
export const componentUpdatedEntry: MemoryEntry = {
  id: 'mem-5',
  timestamp: Date.now(),
  agent: 'UpdateAgent',
  action: 'component_updated',
  entityId: 'btn-submit',
  entityType: 'Button',
  details: {
    changes: { variant: 'primary' },
  },
};

/**
 * Component deleted entry
 */
export const componentDeletedEntry: MemoryEntry = {
  id: 'mem-6',
  timestamp: Date.now(),
  agent: 'UpdateAgent',
  action: 'component_deleted',
  entityId: 'card-old',
  entityType: 'Card',
  details: {},
};

/**
 * Component moved entry
 */
export const componentMovedEntry: MemoryEntry = {
  id: 'mem-7',
  timestamp: Date.now(),
  agent: 'UpdateAgent',
  action: 'component_moved',
  entityId: 'card-abc',
  entityType: 'Card',
  details: {
    fromParentId: 'vstack-1',
    toParentId: 'hstack-1',
    position: 0,
  },
};

/**
 * Validation passed entry
 */
export const validationPassedEntry: MemoryEntry = {
  id: 'mem-8',
  timestamp: Date.now(),
  agent: 'ValidatorAgent',
  action: 'validation_passed',
  details: {
    completedTasks: 3,
    totalTasks: 3,
    summary: 'All tasks completed successfully',
  },
};

/**
 * Validation failed entry
 */
export const validationFailedEntry: MemoryEntry = {
  id: 'mem-9',
  timestamp: Date.now(),
  agent: 'ValidatorAgent',
  action: 'validation_failed',
  details: {
    completedTasks: 2,
    totalTasks: 3,
    issues: ['Could not find button to update'],
  },
};

/**
 * Error entry
 */
export const errorEntry: MemoryEntry = {
  id: 'mem-10',
  timestamp: Date.now(),
  agent: 'CreatorAgent',
  action: 'error',
  details: {
    error: 'Failed to parse markup',
    message: 'Invalid JSX syntax',
  },
};

/**
 * Complete workflow: Page creation + component creation + validation
 */
export const completeWorkflowMemory: MemoryEntry[] = [
  {
    id: 'mem-workflow-1',
    timestamp: Date.now(),
    agent: 'PageAgent',
    action: 'page_created',
    entityId: 'page-dashboard',
    entityType: 'Page',
    details: { name: 'Dashboard' },
  },
  {
    id: 'mem-workflow-2',
    timestamp: Date.now() + 1000,
    agent: 'CreatorAgent',
    action: 'component_created',
    entityId: 'table-users',
    entityType: 'DataViews',
    details: {
      method: 'table_create',
      template: 'users',
      parentId: 'root-vstack',
    },
    parentAction: 'mem-workflow-1',
  },
  {
    id: 'mem-workflow-3',
    timestamp: Date.now() + 2000,
    agent: 'CreatorAgent',
    action: 'component_created',
    entityId: ['card-1', 'card-2', 'card-3'],
    entityType: 'Card',
    details: {
      method: 'buildFromMarkup',
      count: 3,
      parentId: 'root-vstack',
    },
    parentAction: 'mem-workflow-1',
  },
  {
    id: 'mem-workflow-4',
    timestamp: Date.now() + 3000,
    agent: 'ValidatorAgent',
    action: 'validation_passed',
    details: {
      completedTasks: 3,
      totalTasks: 3,
      summary: 'Created Dashboard page with table and 3 cards',
    },
  },
];

/**
 * Failed workflow: Page creation + partial component creation + validation failed
 */
export const failedWorkflowMemory: MemoryEntry[] = [
  {
    id: 'mem-failed-1',
    timestamp: Date.now(),
    agent: 'PageAgent',
    action: 'page_created',
    entityId: 'page-test',
    entityType: 'Page',
    details: { name: 'Test Page' },
  },
  {
    id: 'mem-failed-2',
    timestamp: Date.now() + 1000,
    agent: 'CreatorAgent',
    action: 'component_created',
    entityId: 'card-1',
    entityType: 'Card',
    details: {
      method: 'buildFromMarkup',
      parentId: 'root-vstack',
    },
    parentAction: 'mem-failed-1',
  },
  {
    id: 'mem-failed-3',
    timestamp: Date.now() + 2000,
    agent: 'CreatorAgent',
    action: 'error',
    details: {
      error: 'Failed to create second card',
      message: 'Markup parse error',
    },
  },
  {
    id: 'mem-failed-4',
    timestamp: Date.now() + 3000,
    agent: 'ValidatorAgent',
    action: 'validation_failed',
    details: {
      completedTasks: 1,
      totalTasks: 2,
      issues: ['Only created 1 of 2 requested cards'],
    },
  },
];

/**
 * Helper: Create a memory entry
 */
export function createMemoryEntry(
  agent: string,
  action: ActionType,
  entityId?: string | string[],
  entityType?: string,
  details: any = {},
  parentAction?: string
): MemoryEntry {
  return {
    id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    agent,
    action,
    entityId,
    entityType,
    details,
    parentAction,
  };
}
