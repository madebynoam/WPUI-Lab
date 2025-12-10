/**
 * Eval Dataset
 *
 * Comprehensive test scenarios for regression testing
 * Each scenario includes expected outcomes and cost/time budgets
 */

import { ComponentNode, Page } from '../../types';
import { MemoryEntry, ActionType } from '../__fixtures__/memory';

export interface EvalScenario {
  id: string;
  category: 'simple' | 'medium' | 'complex';
  userMessage: string;
  description: string;

  // Optional setup state
  setupState?: {
    pages?: Page[];
    currentPageId?: string;
    components?: ComponentNode[];
    selectedNodeIds?: string[];
  };

  // Expected outcomes
  expectedMemory: Array<{
    action: ActionType;
    entityType?: string;
    count?: number;
    entityId?: string;
  }>;
  expectedComponentCount?: number;
  expectedPageCount?: number;
  expectedProps?: Record<string, any>;

  // Performance budgets
  maxCost: number; // in dollars
  maxTime: number; // in milliseconds
}

/**
 * Eval Dataset: 25 scenarios across different complexities
 */
export const evalDataset: EvalScenario[] = [
  // ======================================
  // SIMPLE SCENARIOS (1-2 tasks, fast)
  // ======================================

  {
    id: 'simple-page-creation',
    category: 'simple',
    userMessage: 'Create a dashboard page',
    description: 'Create single page with no components',
    expectedMemory: [
      { action: 'page_created', entityType: 'Page' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 0,
    expectedPageCount: 1,
    maxCost: 0.002,
    maxTime: 5000,
  },

  {
    id: 'simple-button-update',
    category: 'simple',
    userMessage: 'Change the submit button to blue',
    description: 'Update single component prop',
    setupState: {
      pages: [
        {
          id: 'page-1',
          name: 'Test Page',
          tree: [
            {
              id: 'root-vstack',
              type: 'VStack',
              props: {},
              children: [
                {
                  id: 'btn-submit',
                  type: 'Button',
                  props: { text: 'Submit', variant: 'secondary' },
                },
              ],
            },
          ],
        },
      ],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_updated', entityId: 'btn-submit' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 1,
    expectedProps: { variant: 'primary' },
    maxCost: 0.001,
    maxTime: 3000,
  },

  {
    id: 'simple-component-delete',
    category: 'simple',
    userMessage: 'Delete the old card',
    description: 'Delete single component',
    setupState: {
      pages: [
        {
          id: 'page-1',
          name: 'Test Page',
          tree: [
            {
              id: 'root-vstack',
              type: 'VStack',
              props: {},
              children: [
                {
                  id: 'card-old',
                  type: 'Card',
                  props: {},
                  children: [],
                },
              ],
            },
          ],
        },
      ],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_deleted', entityId: 'card-old' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 0,
    maxCost: 0.001,
    maxTime: 3000,
  },

  {
    id: 'simple-page-switch',
    category: 'simple',
    userMessage: 'Switch to the pricing page',
    description: 'Switch to different existing page',
    setupState: {
      pages: [
        { id: 'page-home', name: 'Home', tree: [] },
        { id: 'page-pricing', name: 'Pricing', tree: [] },
      ],
      currentPageId: 'page-home',
    },
    expectedMemory: [
      { action: 'page_switched', entityId: 'page-pricing' },
      { action: 'validation_passed' },
    ],
    maxCost: 0.001,
    maxTime: 2000,
  },

  // ======================================
  // MEDIUM SCENARIOS (2-4 tasks)
  // ======================================

  {
    id: 'medium-pricing-section',
    category: 'medium',
    userMessage: 'Create a pricing section with 3 tiers',
    description: 'Use section template to create pricing',
    setupState: {
      pages: [{ id: 'page-1', name: 'Pricing', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created', count: 3, entityType: 'Card' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 3,
    maxCost: 0.0025,
    maxTime: 6000,
  },

  {
    id: 'medium-user-table',
    category: 'medium',
    userMessage: 'Add a users table',
    description: 'Create DataViews table with template',
    setupState: {
      pages: [{ id: 'page-1', name: 'Users', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created', entityType: 'DataViews' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 1,
    maxCost: 0.002,
    maxTime: 5000,
  },

  {
    id: 'medium-hero-section',
    category: 'medium',
    userMessage: 'Create a hero section with headline and CTA button',
    description: 'Create hero section template',
    setupState: {
      pages: [{ id: 'page-1', name: 'Home', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 1, // Hero section is one component
    maxCost: 0.0025,
    maxTime: 6000,
  },

  {
    id: 'medium-grid-cards',
    category: 'medium',
    userMessage: 'Add 3 feature cards in a grid',
    description: 'Create custom grid with buildFromMarkup',
    setupState: {
      pages: [{ id: 'page-1', name: 'Features', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created', count: 3 },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 3,
    maxCost: 0.003,
    maxTime: 7000,
  },

  {
    id: 'medium-page-with-heading',
    category: 'medium',
    userMessage: 'Create an about page with a heading',
    description: 'Create page + add simple component',
    expectedMemory: [
      { action: 'page_created', entityType: 'Page' },
      { action: 'component_created', entityType: 'Heading' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 1,
    expectedPageCount: 1,
    maxCost: 0.003,
    maxTime: 6000,
  },

  // ======================================
  // COMPLEX SCENARIOS (4+ tasks)
  // ======================================

  {
    id: 'complex-dashboard-full',
    category: 'complex',
    userMessage: 'Create a dashboard page with a user table and 3 metric cards',
    description: 'Page creation + table + multiple cards',
    expectedMemory: [
      { action: 'page_created', entityType: 'Page' },
      { action: 'component_created', entityType: 'DataViews' },
      { action: 'component_created', count: 3, entityType: 'Card' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 4, // 1 table + 3 cards
    expectedPageCount: 1,
    maxCost: 0.004,
    maxTime: 10000,
  },

  {
    id: 'complex-pricing-page-full',
    category: 'complex',
    userMessage: 'Create a pricing page with a heading and 3 pricing tiers',
    description: 'Page + heading + pricing section',
    expectedMemory: [
      { action: 'page_created', entityType: 'Page' },
      { action: 'component_created', entityType: 'Heading' },
      { action: 'component_created', count: 3, entityType: 'Card' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 4, // 1 heading + 3 cards
    expectedPageCount: 1,
    maxCost: 0.0045,
    maxTime: 10000,
  },

  {
    id: 'complex-multi-section-page',
    category: 'complex',
    userMessage: 'Create a home page with hero, features grid, and testimonial sections',
    description: 'Page + multiple section templates',
    expectedMemory: [
      { action: 'page_created', entityType: 'Page' },
      { action: 'component_created' }, // hero
      { action: 'component_created' }, // features
      { action: 'component_created' }, // testimonials
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 3,
    expectedPageCount: 1,
    maxCost: 0.005,
    maxTime: 12000,
  },

  {
    id: 'complex-crud-interface',
    category: 'complex',
    userMessage: 'Create a users page with a table, search bar, and add user button',
    description: 'Complex CRUD interface',
    expectedMemory: [
      { action: 'page_created', entityType: 'Page' },
      { action: 'component_created' }, // table
      { action: 'component_created' }, // search
      { action: 'component_created' }, // button
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 3,
    expectedPageCount: 1,
    maxCost: 0.005,
    maxTime: 12000,
  },

  // ======================================
  // EDGE CASES & ERROR SCENARIOS
  // ======================================

  {
    id: 'edge-duplicate-page',
    category: 'medium',
    userMessage: 'Create a dashboard page',
    description: 'Try to create page that already exists',
    setupState: {
      pages: [{ id: 'page-dashboard', name: 'Dashboard', tree: [] }],
      currentPageId: 'page-dashboard',
    },
    expectedMemory: [
      // Should use existing page, not create new one
      { action: 'validation_passed' },
    ],
    expectedPageCount: 1, // Still 1 page, not 2
    maxCost: 0.002,
    maxTime: 4000,
  },

  {
    id: 'edge-update-nonexistent',
    category: 'simple',
    userMessage: 'Change the submit button color',
    description: 'Try to update component that doesn\'t exist',
    setupState: {
      pages: [{ id: 'page-1', name: 'Test', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      // Should fail gracefully
      { action: 'validation_failed' },
    ],
    maxCost: 0.002,
    maxTime: 4000,
  },

  {
    id: 'edge-empty-request',
    category: 'simple',
    userMessage: 'Show me the current page',
    description: 'Request that requires no actions',
    setupState: {
      pages: [{ id: 'page-1', name: 'Test', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      // Just validation, no actions
      { action: 'validation_passed' },
    ],
    maxCost: 0.001,
    maxTime: 2000,
  },

  // ======================================
  // BATCH OPERATIONS
  // ======================================

  {
    id: 'batch-button-update',
    category: 'medium',
    userMessage: 'Change all buttons to primary variant',
    description: 'Batch update multiple components',
    setupState: {
      pages: [
        {
          id: 'page-1',
          name: 'Test',
          tree: [
            {
              id: 'root-vstack',
              type: 'VStack',
              props: {},
              children: [
                { id: 'btn-1', type: 'Button', props: { text: 'One', variant: 'secondary' } },
                { id: 'btn-2', type: 'Button', props: { text: 'Two', variant: 'tertiary' } },
                { id: 'btn-3', type: 'Button', props: { text: 'Three', variant: 'secondary' } },
              ],
            },
          ],
        },
      ],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_updated', count: 3 },
      { action: 'validation_passed' },
    ],
    maxCost: 0.003,
    maxTime: 6000,
  },

  // ======================================
  // SELECTION-BASED OPERATIONS
  // ======================================

  {
    id: 'selection-add-to-card',
    category: 'medium',
    userMessage: 'Add a button inside this card',
    description: 'Use selected component as parent',
    setupState: {
      pages: [
        {
          id: 'page-1',
          name: 'Test',
          tree: [
            {
              id: 'root-vstack',
              type: 'VStack',
              props: {},
              children: [
                {
                  id: 'card-1',
                  type: 'Card',
                  props: {},
                  children: [
                    { id: 'card-body-1', type: 'CardBody', props: {}, children: [] },
                  ],
                },
              ],
            },
          ],
        },
      ],
      currentPageId: 'page-1',
      selectedNodeIds: ['card-body-1'],
    },
    expectedMemory: [
      { action: 'component_created', entityType: 'Button' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 1,
    maxCost: 0.0025,
    maxTime: 5000,
  },

  // ======================================
  // CONTENT GENERATION
  // ======================================

  {
    id: 'content-realistic-pricing',
    category: 'complex',
    userMessage: 'Create 3 pricing tiers for a SaaS product with realistic content',
    description: 'Generate realistic pricing content',
    setupState: {
      pages: [{ id: 'page-1', name: 'Pricing', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created', count: 3 },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 3,
    maxCost: 0.004,
    maxTime: 8000,
  },

  {
    id: 'content-blog-layout',
    category: 'complex',
    userMessage: 'Create a blog post layout with title, author, date, and content sections',
    description: 'Complex content layout',
    setupState: {
      pages: [{ id: 'page-1', name: 'Blog Post', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created' },
      { action: 'validation_passed' },
    ],
    maxCost: 0.004,
    maxTime: 8000,
  },

  // ======================================
  // LAYOUT OPERATIONS
  // ======================================

  {
    id: 'layout-responsive-grid',
    category: 'medium',
    userMessage: 'Create a responsive 4-column grid with product cards',
    description: 'Grid layout with multiple cards',
    setupState: {
      pages: [{ id: 'page-1', name: 'Products', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created', count: 4 },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 4,
    maxCost: 0.004,
    maxTime: 8000,
  },

  {
    id: 'layout-sidebar',
    category: 'complex',
    userMessage: 'Create a layout with sidebar and main content area',
    description: 'Two-column layout',
    setupState: {
      pages: [{ id: 'page-1', name: 'App', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created' },
      { action: 'validation_passed' },
    ],
    maxCost: 0.003,
    maxTime: 7000,
  },

  // ======================================
  // INTERACTIONS
  // ======================================

  {
    id: 'interaction-navigation',
    category: 'medium',
    userMessage: 'Add a button that navigates to the about page',
    description: 'Add interaction to component',
    setupState: {
      pages: [
        { id: 'page-home', name: 'Home', tree: [] },
        { id: 'page-about', name: 'About', tree: [] },
      ],
      currentPageId: 'page-home',
    },
    expectedMemory: [
      { action: 'component_created', entityType: 'Button' },
      // Interaction added as part of creation or separate update
      { action: 'validation_passed' },
    ],
    maxCost: 0.003,
    maxTime: 6000,
  },

  // ======================================
  // PERFORMANCE BENCHMARKS
  // ======================================

  {
    id: 'perf-large-table',
    category: 'medium',
    userMessage: 'Create an orders table',
    description: 'Create table with sample data',
    setupState: {
      pages: [{ id: 'page-1', name: 'Orders', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created', entityType: 'DataViews' },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 1,
    maxCost: 0.0025,
    maxTime: 6000,
  },

  {
    id: 'perf-many-components',
    category: 'complex',
    userMessage: 'Create a dashboard with 6 metric cards in a grid',
    description: 'Create many components at once',
    setupState: {
      pages: [{ id: 'page-1', name: 'Dashboard', tree: [] }],
      currentPageId: 'page-1',
    },
    expectedMemory: [
      { action: 'component_created', count: 6 },
      { action: 'validation_passed' },
    ],
    expectedComponentCount: 6,
    maxCost: 0.005,
    maxTime: 10000,
  },
];

/**
 * Get scenarios by category
 */
export function getScenariosByCategory(category: 'simple' | 'medium' | 'complex'): EvalScenario[] {
  return evalDataset.filter(s => s.category === category);
}

/**
 * Get scenario by ID
 */
export function getScenario(id: string): EvalScenario | undefined {
  return evalDataset.find(s => s.id === id);
}

/**
 * Calculate total budget
 */
export function calculateTotalBudget(): { cost: number; time: number } {
  return evalDataset.reduce(
    (acc, scenario) => ({
      cost: acc.cost + scenario.maxCost,
      time: acc.time + scenario.maxTime,
    }),
    { cost: 0, time: 0 }
  );
}
