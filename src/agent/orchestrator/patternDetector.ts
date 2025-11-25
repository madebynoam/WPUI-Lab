/**
 * Pattern Detection for Instant Template Matching
 *
 * Detects common UI patterns from user requests and returns matching pattern IDs
 * for instant (<50ms) responses without LLM orchestration.
 *
 * This is the "v0.dev fast path" - common patterns are served instantly.
 */

export interface PatternMatch {
  patternId: string;
  confidence: number;
  keywords: string[];
  requiresPageCreation?: boolean;
  pageName?: string;
}

/**
 * Pattern detection rules
 * Each rule has keywords, pattern ID, and confidence score
 */
const PATTERN_RULES: Array<{
  patternId: string;
  keywords: string[];
  requiredKeywords?: string[];
  confidence: number;
  category: string;
}> = [
  // Data Tables - High Priority
  {
    patternId: 'users-table',
    keywords: ['user', 'member', 'customer', 'people', 'team', 'staff', 'employee'],
    requiredKeywords: ['table', 'directory', 'list'],
    confidence: 0.9,
    category: 'table',
  },
  {
    patternId: 'orders-table',
    keywords: ['order', 'purchase', 'sale', 'checkout'],
    requiredKeywords: ['table', 'list'],
    confidence: 0.9,
    category: 'table',
  },
  {
    patternId: 'products-table',
    keywords: ['product', 'item', 'goods', 'merchandise', 'inventory'],
    requiredKeywords: ['table', 'catalog', 'list'],
    confidence: 0.9,
    category: 'table',
  },
  {
    patternId: 'transactions-table',
    keywords: ['transaction', 'payment', 'transfer', 'financial'],
    requiredKeywords: ['table', 'list'],
    confidence: 0.9,
    category: 'table',
  },
  {
    patternId: 'tasks-table',
    keywords: ['task', 'todo', 'assignment', 'work', 'project'],
    requiredKeywords: ['table', 'list'],
    confidence: 0.9,
    category: 'table',
  },
  {
    patternId: 'crud-kanban-view',
    keywords: ['kanban', 'board'],
    requiredKeywords: ['kanban'],
    confidence: 0.95,
    category: 'crud',
  },
  {
    patternId: 'invoices-table',
    keywords: ['invoice', 'bill', 'billing'],
    requiredKeywords: ['table', 'list'],
    confidence: 0.9,
    category: 'table',
  },
  {
    patternId: 'logs-table',
    keywords: ['log', 'activity', 'audit', 'history', 'event'],
    requiredKeywords: ['table', 'list'],
    confidence: 0.9,
    category: 'table',
  },
  {
    patternId: 'inventory-table',
    keywords: ['inventory', 'stock', 'warehouse', 'storage'],
    requiredKeywords: ['table', 'list'],
    confidence: 0.9,
    category: 'table',
  },
  {
    patternId: 'leads-table',
    keywords: ['lead', 'prospect', 'sales', 'crm', 'contact'],
    requiredKeywords: ['table', 'list'],
    confidence: 0.9,
    category: 'table',
  },
  {
    patternId: 'tickets-table',
    keywords: ['ticket', 'support', 'helpdesk', 'issue', 'request'],
    requiredKeywords: ['table', 'list'],
    confidence: 0.9,
    category: 'table',
  },

  // Pricing Tables
  {
    patternId: 'pricing-3col',
    keywords: ['pricing', 'price', 'plan', 'tier', 'subscription'],
    requiredKeywords: ['pricing', 'plan'],
    confidence: 0.9,
    category: 'pricing',
  },

  // Hero Sections
  {
    patternId: 'hero-centered',
    keywords: ['hero', 'landing', 'welcome', 'intro'],
    requiredKeywords: ['hero', 'centered'],
    confidence: 0.85,
    category: 'hero',
  },
  {
    patternId: 'hero-two-column',
    keywords: ['hero', 'landing', 'two column', '2 column'],
    requiredKeywords: ['hero'],
    confidence: 0.85,
    category: 'hero',
  },

  // Forms
  {
    patternId: 'contact-form',
    keywords: ['contact', 'get in touch', 'reach out', 'message'],
    requiredKeywords: ['form', 'contact'],
    confidence: 0.9,
    category: 'form',
  },

  // Features
  {
    patternId: 'feature-cards-3col',
    keywords: ['feature', 'benefit', 'capability'],
    requiredKeywords: ['feature', 'card'],
    confidence: 0.85,
    category: 'feature',
  },
  {
    patternId: 'feature-list',
    keywords: ['feature', 'benefit', 'capability'],
    requiredKeywords: ['feature', 'list'],
    confidence: 0.85,
    category: 'feature',
  },

  // Stats
  {
    patternId: 'stats-4col',
    keywords: ['stat', 'metric', 'number', 'kpi', 'analytics'],
    requiredKeywords: ['stat'],
    confidence: 0.85,
    category: 'stats',
  },

  // CTA
  {
    patternId: 'cta-banner',
    keywords: ['cta', 'call to action', 'banner', 'signup', 'get started'],
    requiredKeywords: ['cta'],
    confidence: 0.85,
    category: 'cta',
  },

  // Testimonials
  {
    patternId: 'testimonial-card',
    keywords: ['testimonial', 'review', 'feedback', 'quote'],
    requiredKeywords: ['testimonial'],
    confidence: 0.85,
    category: 'testimonial',
  },

  // Dashboards
  {
    patternId: 'dashboard-overview',
    keywords: ['dashboard', 'overview', 'summary', 'home', 'main'],
    requiredKeywords: ['dashboard'],
    confidence: 0.9,
    category: 'dashboard',
  },
  {
    patternId: 'dashboard-analytics',
    keywords: ['dashboard', 'analytics', 'metrics', 'insights', 'data'],
    requiredKeywords: ['dashboard', 'analytics'],
    confidence: 0.95,
    category: 'dashboard',
  },
  {
    patternId: 'dashboard-sales',
    keywords: ['dashboard', 'sales', 'revenue', 'performance'],
    requiredKeywords: ['dashboard', 'sales'],
    confidence: 0.95,
    category: 'dashboard',
  },
  {
    patternId: 'dashboard-ecommerce',
    keywords: ['dashboard', 'ecommerce', 'shop', 'store', 'commerce'],
    requiredKeywords: ['dashboard', 'ecommerce'],
    confidence: 0.95,
    category: 'dashboard',
  },
  {
    patternId: 'dashboard-admin',
    keywords: ['dashboard', 'admin', 'administration', 'management'],
    requiredKeywords: ['dashboard', 'admin'],
    confidence: 0.95,
    category: 'dashboard',
  },

  // Forms
  {
    patternId: 'login-form',
    keywords: ['login', 'sign in', 'signin', 'authenticate'],
    requiredKeywords: ['login'],
    confidence: 0.95,
    category: 'form',
  },
  {
    patternId: 'registration-form',
    keywords: ['registration', 'signup', 'sign up', 'register', 'create account'],
    requiredKeywords: ['registration', 'signup', 'register'],
    confidence: 0.95,
    category: 'form',
  },
  {
    patternId: 'settings-form',
    keywords: ['settings', 'preferences', 'configuration', 'options'],
    requiredKeywords: ['settings'],
    confidence: 0.9,
    category: 'form',
  },
  {
    patternId: 'profile-edit-form',
    keywords: ['profile', 'edit profile', 'account', 'user profile'],
    requiredKeywords: ['profile'],
    confidence: 0.9,
    category: 'form',
  },
  {
    patternId: 'password-reset-form',
    keywords: ['password', 'reset', 'forgot password', 'recover'],
    requiredKeywords: ['password', 'reset'],
    confidence: 0.95,
    category: 'form',
  },

  // Navigation
  {
    patternId: 'sidebar-expanded',
    keywords: ['sidebar', 'side nav', 'navigation', 'menu', 'expanded'],
    requiredKeywords: ['sidebar'],
    confidence: 0.9,
    category: 'navigation',
  },
  {
    patternId: 'topbar-nav',
    keywords: ['topbar', 'navbar', 'navigation bar', 'header', 'top nav'],
    requiredKeywords: ['navbar', 'topbar', 'header'],
    confidence: 0.9,
    category: 'navigation',
  },
  {
    patternId: 'breadcrumbs-nav',
    keywords: ['breadcrumb', 'breadcrumbs', 'path', 'navigation path'],
    requiredKeywords: ['breadcrumb'],
    confidence: 0.95,
    category: 'navigation',
  },
  {
    patternId: 'horizontal-tabs',
    keywords: ['tabs', 'horizontal tabs', 'tab navigation'],
    requiredKeywords: ['tabs'],
    confidence: 0.85,
    category: 'navigation',
  },

  // CRUD Views
  {
    patternId: 'crud-list-view',
    keywords: ['list view', 'list', 'items', 'records'],
    requiredKeywords: ['list', 'view'],
    confidence: 0.85,
    category: 'crud',
  },
  {
    patternId: 'crud-card-view',
    keywords: ['card view', 'cards', 'grid view', 'tiles'],
    requiredKeywords: ['card', 'view'],
    confidence: 0.85,
    category: 'crud',
  },
  {
    patternId: 'crud-calendar-view',
    keywords: ['calendar', 'schedule', 'events', 'date'],
    requiredKeywords: ['calendar'],
    confidence: 0.95,
    category: 'crud',
  },
  {
    patternId: 'crud-gallery-view',
    keywords: ['gallery', 'images', 'photos', 'media'],
    requiredKeywords: ['gallery'],
    confidence: 0.95,
    category: 'crud',
  },

  // Modals
  {
    patternId: 'confirm-dialog',
    keywords: ['confirm', 'dialog', 'confirmation', 'modal', 'alert'],
    requiredKeywords: ['confirm'],
    confidence: 0.9,
    category: 'modal',
  },
  {
    patternId: 'form-modal',
    keywords: ['form modal', 'popup form', 'dialog form'],
    requiredKeywords: ['form', 'modal'],
    confidence: 0.9,
    category: 'modal',
  },
];

/**
 * Normalize user message for matching
 */
function normalizeMessage(message: string): string {
  return message.toLowerCase().trim();
}

/**
 * Check if message contains all required keywords
 */
function hasRequiredKeywords(message: string, requiredKeywords?: string[]): boolean {
  if (!requiredKeywords || requiredKeywords.length === 0) return true;

  return requiredKeywords.some(keyword =>
    message.includes(keyword.toLowerCase())
  );
}

/**
 * Calculate match score for a rule
 */
function calculateMatchScore(message: string, rule: typeof PATTERN_RULES[0]): number {
  let score = 0;
  let matchedKeywords: string[] = [];

  // Check required keywords first
  if (!hasRequiredKeywords(message, rule.requiredKeywords)) {
    return 0;
  }

  // Count matching keywords
  for (const keyword of rule.keywords) {
    if (message.includes(keyword.toLowerCase())) {
      score += 1;
      matchedKeywords.push(keyword);
    }
  }

  // No keywords matched
  if (score === 0) return 0;

  // Calculate confidence based on keyword density
  const density = score / rule.keywords.length;
  const finalConfidence = rule.confidence * density;

  return finalConfidence;
}

/**
 * Extract page name from user message if creating a new page
 */
function extractPageName(message: string): string | undefined {
  const normalized = normalizeMessage(message);

  // Pattern: "new page called X"
  let match = normalized.match(/(?:new page|page) (?:called|named) ['""]?([^'""]+)['""]?/);
  if (match) return match[1].trim();

  // Pattern: "create X page"
  match = normalized.match(/create (?:a )?['""]?([^'""]+)['""]? page/);
  if (match) return match[1].trim();

  return undefined;
}

/**
 * Detect if user is requesting page creation
 */
function requiresPageCreation(message: string): boolean {
  const normalized = normalizeMessage(message);
  return (
    normalized.includes('new page') ||
    normalized.includes('create page') ||
    normalized.includes('add page') ||
    normalized.includes('page called') ||
    normalized.includes('page named')
  );
}

/**
 * Detect pattern from user message
 *
 * Returns pattern match with high confidence or null if no match
 */
export function detectPattern(userMessage: string): PatternMatch | null {
  const normalized = normalizeMessage(userMessage);

  let bestMatch: PatternMatch | null = null;
  let bestScore = 0;

  // Try each rule
  for (const rule of PATTERN_RULES) {
    const score = calculateMatchScore(normalized, rule);

    if (score > bestScore && score >= 0.5) {
      const keywords = rule.keywords.filter(kw =>
        normalized.includes(kw.toLowerCase())
      );

      bestMatch = {
        patternId: rule.patternId,
        confidence: score,
        keywords,
        requiresPageCreation: requiresPageCreation(normalized),
        pageName: extractPageName(normalized),
      };
      bestScore = score;
    }
  }

  // Only return if confidence is high enough
  if (bestMatch && bestMatch.confidence >= 0.7) {
    return bestMatch;
  }

  return null;
}

/**
 * Get pattern category (for logging/debugging)
 */
export function getPatternCategory(patternId: string): string | undefined {
  const rule = PATTERN_RULES.find(r => r.patternId === patternId);
  return rule?.category;
}

/**
 * Check if pattern is a data table
 */
export function isDataTablePattern(patternId: string): boolean {
  const category = getPatternCategory(patternId);
  return category === 'table';
}
