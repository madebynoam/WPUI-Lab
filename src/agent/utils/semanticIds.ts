/**
 * Semantic ID generation utilities
 * Based on Anthropic's principle: "Converting UUIDs to semantic language significantly improves precision"
 */

// Counter for generating unique numeric suffixes
const componentCounters: Map<string, number> = new Map();

/**
 * Generate a semantic, human-readable ID for a component
 * Examples: "button-hero-cta", "card-pricing-1", "grid-features"
 */
export function generateSemanticId(
  componentType: string,
  context?: {
    purpose?: string;      // e.g., "hero", "pricing", "features"
    content?: string;      // e.g., "Sign Up", "Get Started"
    parentType?: string;   // e.g., "Grid", "VStack"
  }
): { semanticId: string; uuid: string; displayName: string } {
  const type = componentType.toLowerCase();

  // Generate UUID for internal tracking
  const uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Build semantic ID
  let semanticId = type;

  // Add context clues
  if (context?.purpose) {
    semanticId += `-${context.purpose.toLowerCase().replace(/\s+/g, '-')}`;
  }

  if (context?.content) {
    // Use first 2-3 words of content, sanitized
    const contentSlug = context.content
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .slice(0, 3)
      .join('-');
    if (contentSlug) {
      semanticId += `-${contentSlug}`;
    }
  }

  // Add counter to ensure uniqueness
  const counter = (componentCounters.get(semanticId) || 0) + 1;
  componentCounters.set(semanticId, counter);

  if (counter > 1) {
    semanticId += `-${counter}`;
  }

  // Generate display name
  const displayName = buildDisplayName(componentType, context);

  return {
    semanticId,
    uuid,
    displayName,
  };
}

/**
 * Build human-readable display name for component
 * Examples: "Sign Up button in Hero", "Pricing Card #1", "Features Grid"
 */
export function buildDisplayName(
  componentType: string,
  context?: {
    purpose?: string;
    content?: string;
    parentType?: string;
    index?: number;
  }
): string {
  let name = '';

  // Add content preview if available
  if (context?.content) {
    const preview = context.content.length > 30
      ? context.content.substring(0, 27) + '...'
      : context.content;
    name = `"${preview}" `;
  }

  // Add component type
  name += componentType;

  // Add index if multiple instances
  if (context?.index !== undefined && context.index >= 0) {
    name += ` #${context.index + 1}`;
  }

  // Add location context
  if (context?.purpose) {
    name += ` in ${context.purpose}`;
  } else if (context?.parentType) {
    name += ` in ${context.parentType}`;
  }

  return name;
}

/**
 * Extract content preview from component for identification
 */
export function getContentPreview(props: any): string | null {
  // Try to extract meaningful text content
  if (typeof props.children === 'string') {
    return props.children;
  }

  if (props.text && typeof props.text === 'string') {
    return props.text;
  }

  if (props.title && typeof props.title === 'string') {
    return props.title;
  }

  if (props.label && typeof props.label === 'string') {
    return props.label;
  }

  return null;
}

/**
 * Find the closest matching component by semantic similarity
 * Used for "Did you mean?" suggestions in error messages
 */
export function findClosestMatch(
  query: string,
  candidates: Array<{ id: string; type: string; displayName: string }>
): { id: string; displayName: string; score: number } | null {
  if (candidates.length === 0) return null;

  const queryLower = query.toLowerCase();

  // Calculate simple similarity score
  const scored = candidates.map(candidate => {
    let score = 0;
    const displayLower = candidate.displayName.toLowerCase();
    const typeLower = candidate.type.toLowerCase();

    // Exact match bonus
    if (displayLower === queryLower || typeLower === queryLower) {
      score += 100;
    }

    // Contains match
    if (displayLower.includes(queryLower)) {
      score += 50;
    }
    if (typeLower.includes(queryLower)) {
      score += 30;
    }

    // Word overlap
    const queryWords = queryLower.split(/\s+/);
    const displayWords = displayLower.split(/\s+/);
    const overlap = queryWords.filter(w => displayWords.includes(w)).length;
    score += overlap * 20;

    return {
      id: candidate.id,
      displayName: candidate.displayName,
      score,
    };
  });

  // Return best match
  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0] : null;
}

/**
 * Reset counters (useful for tests)
 */
export function resetCounters(): void {
  componentCounters.clear();
}
