/**
 * Evaluation Tasks for Tool Performance Testing
 * Based on Anthropic's guidance: "Generate lots of evaluation tasks, grounded in real workflows"
 */

export interface EvaluationTask {
  id: string;
  description: string;
  userPrompt: string;
  expectedTools: string[];
  expectedOutcome: {
    componentCount?: Record<string, number>;
    hasContent?: boolean;
    pagesCreated?: number;
    success?: boolean;
    maxToolCalls?: number;  // Maximum efficient tool calls
  };
  setup?: string;  // Optional: Pre-requisites for the task
}

/**
 * 20 realistic evaluation tasks covering all major workflows
 */
export const evaluationTasks: EvaluationTask[] = [
  // Pricing Section Jobs
  {
    id: 'pricing-4-tiers',
    description: 'Create pricing page with 4 tiers',
    userPrompt: 'Add 4 pricing cards for Free ($0), Starter ($29), Pro ($99), Enterprise (custom pricing)',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { Grid: 1, Card: 4, Heading: 8, Text: 16, Button: 4 },
      hasContent: true,
      maxToolCalls: 1,  // ONE call with section_create
    },
  },

  {
    id: 'pricing-3-tiers-highlighted',
    description: 'Create pricing with highlighted tier',
    userPrompt: 'Add pricing cards: Free ($0), Pro ($29) highlighted, Enterprise ($99)',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { Grid: 1, Card: 3 },
      hasContent: true,
      maxToolCalls: 1,
    },
  },

  // Hero Section Jobs
  {
    id: 'hero-with-cta',
    description: 'Create hero section with headline and CTA',
    userPrompt: 'Add a hero section with headline "Build Faster" and a Sign Up button',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { VStack: 1, Heading: 1, Button: 1 },
      hasContent: true,
      maxToolCalls: 1,
    },
  },

  {
    id: 'hero-full',
    description: 'Create hero with headline, subheadline, and CTA',
    userPrompt: 'Create hero: headline "Ship Products in Days", subheadline "Not months", CTA "Get Started"',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { VStack: 1, Heading: 1, Text: 1, Button: 1 },
      hasContent: true,
      maxToolCalls: 1,
    },
  },

  // Features Section Jobs
  {
    id: 'features-6-cards',
    description: 'Create features page with 6 feature cards',
    userPrompt: 'Add a features section with 6 feature cards about SaaS product capabilities',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { Grid: 1, Card: 6 },
      hasContent: true,
      maxToolCalls: 1,
    },
  },

  {
    id: 'features-with-header',
    description: 'Create features section with title',
    userPrompt: 'Add features section titled "Why Choose Us" with 4 feature cards',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { VStack: 1, Heading: 1, Grid: 1, Card: 4 },
      hasContent: true,
      maxToolCalls: 1,
    },
  },

  // Component Update Jobs (with disambiguation)
  {
    id: 'edit-button-single',
    description: 'Edit button when only one exists',
    userPrompt: 'Change the button label to "Get Started"',
    setup: 'Page with 1 button',
    expectedTools: ['component_update'],
    expectedOutcome: {
      success: true,
      maxToolCalls: 1,  // Direct update, no disambiguation needed
    },
  },

  {
    id: 'edit-button-multiple',
    description: 'Edit button when multiple exist (disambiguation)',
    userPrompt: 'Change the button label to "Get Started"',
    setup: 'Page with 5 buttons',
    expectedTools: ['context_searchComponents', 'component_update'],
    expectedOutcome: {
      success: false,  // Should require disambiguation first
      maxToolCalls: 2,
    },
  },

  {
    id: 'edit-button-specific',
    description: 'Edit specific button with context',
    userPrompt: 'Change the button in the hero section to say "Get Started"',
    setup: 'Page with 5 buttons (1 in hero)',
    expectedTools: ['component_update'],
    expectedOutcome: {
      success: true,
      maxToolCalls: 1,  // Specific context avoids disambiguation
    },
  },

  // Context Queries
  {
    id: 'get-project-concise',
    description: 'Get project overview for chaining',
    userPrompt: 'What pages exist?',
    expectedTools: ['context_getProject'],
    expectedOutcome: {
      success: true,
      maxToolCalls: 1,  // ONE call instead of multiple
    },
  },

  {
    id: 'get-project-detailed',
    description: 'Get detailed project info',
    userPrompt: 'Show me the complete component tree',
    expectedTools: ['context_getProject'],
    expectedOutcome: {
      success: true,
      maxToolCalls: 1,
    },
  },

  // Search and Disambiguation
  {
    id: 'search-components-type',
    description: 'Search by component type',
    userPrompt: 'Find all buttons',
    expectedTools: ['context_searchComponents'],
    expectedOutcome: {
      success: true,
      maxToolCalls: 1,
    },
  },

  {
    id: 'search-components-content',
    description: 'Search by content',
    userPrompt: 'Find the component that says "Sign Up"',
    expectedTools: ['context_searchComponents'],
    expectedOutcome: {
      success: true,
      maxToolCalls: 1,
    },
  },

  // Page Management
  {
    id: 'create-pricing-page',
    description: 'Create new page with content',
    userPrompt: 'Add a new page titled pricing and add pricing cards to it',
    expectedTools: ['createPageTool', 'section_create'],
    expectedOutcome: {
      pagesCreated: 1,
      componentCount: { Grid: 1, Card: 3 },
      maxToolCalls: 2,  // Create page + section
    },
  },

  // Complex Multi-Step Jobs
  {
    id: 'landing-page-full',
    description: 'Create complete landing page',
    userPrompt: 'Create a landing page with hero, features section (6 cards), and pricing (3 tiers)',
    expectedTools: ['createPageTool', 'section_create'],
    expectedOutcome: {
      pagesCreated: 1,
      componentCount: { VStack: 1, Heading: 2, Button: 4, Grid: 2, Card: 9 },
      hasContent: true,
      maxToolCalls: 4,  // Page + hero + features + pricing
    },
  },

  // Testimonials
  {
    id: 'testimonials-3',
    description: 'Create testimonials section',
    userPrompt: 'Add testimonials section with 3 customer quotes',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { Grid: 1, Card: 3 },
      hasContent: true,
      maxToolCalls: 1,
    },
  },

  // Footer
  {
    id: 'footer-with-links',
    description: 'Create footer with links',
    userPrompt: 'Add footer with links to About, Contact, Privacy and copyright text',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { VStack: 1, HStack: 1, Button: 3, Text: 1 },
      hasContent: true,
      maxToolCalls: 1,
    },
  },

  // Navigation
  {
    id: 'nav-bar',
    description: 'Create navigation bar',
    userPrompt: 'Add navigation with Home, Features, Pricing, About links',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { HStack: 1, Button: 4 },
      hasContent: true,
      maxToolCalls: 1,
    },
  },

  // CTA Section
  {
    id: 'cta-section',
    description: 'Create call-to-action section',
    userPrompt: 'Add CTA section: headline "Ready to get started?", primary CTA "Sign Up Free", secondary "Learn More"',
    expectedTools: ['section_create'],
    expectedOutcome: {
      componentCount: { VStack: 1, Heading: 1, HStack: 1, Button: 2 },
      hasContent: true,
      maxToolCalls: 1,
    },
  },

  // Delete Operations
  {
    id: 'delete-single',
    description: 'Delete single component',
    userPrompt: 'Delete the pricing section',
    setup: 'Page with pricing section',
    expectedTools: ['component_delete'],
    expectedOutcome: {
      success: true,
      maxToolCalls: 1,
    },
  },
];

/**
 * Metrics to track for each evaluation
 */
export interface EvaluationMetrics {
  taskId: string;
  success: boolean;
  toolCalls: number;
  tokensUsed: number;
  executionTimeMs: number;
  errors: string[];
  componentCountMatch: boolean;
  contentPresent: boolean;
}

/**
 * Expected improvements with refactored tools:
 * - Pricing section: 15+ tool calls → 1 tool call (93% reduction)
 * - Hero section: 3-4 tool calls → 1 tool call (75% reduction)
 * - Context queries: 4 tool calls → 1 tool call (75% reduction)
 * - Ambiguous updates: Manual disambiguation → Automatic with helpful errors
 * - Token usage: 40-60% reduction due to response_format
 */
