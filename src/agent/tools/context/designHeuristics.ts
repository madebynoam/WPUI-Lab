/**
 * Design Heuristics for WP-Designer
 *
 * Universal design rules that teach the agent HOW to make good design decisions,
 * not WHAT specific patterns to copy. These 25 heuristics apply to any component
 * combination the agent might create.
 */

const HEURISTICS = {
  structural: [
    "Card Anatomy: Cards MUST contain CardHeader, CardBody, and/or CardFooter as direct children. Never place Heading, Text, Button, or other content directly in Card",
    "Primary Actions in Footer: Primary CTAs and navigation actions belong in CardFooter, not CardBody. Secondary actions (like checkboxes) can live in CardBody",
    "Headers Contain Identifiers: CardHeader contains titles (Heading) and optional navigation affordances (chevrons, icons). It identifies 'what this is'",
    "Metadata Follows Content: In CardFooter, related actions group horizontally with justify='center' for centered presentation or justify='space-between' for edge alignment"
  ],

  spacing: [
    "4px Grid System: All spacing uses multiples of 4px. spacing={1} = 4px, spacing={2} = 8px, spacing={3} = 12px, spacing={4} = 16px, etc.",
    "Tight Proximity (1-2): Use spacing={1-2} (4-8px) for tightly related items like icon+text pairs, button groups, or label+value pairs that form a single conceptual unit",
    "Normal Spacing (3-4): Use spacing={3-4} (12-16px) for form fields, list items within cards, or vertical content stacks. This is the default spacing for most content",
    "Relaxed Spacing (5-6): Use spacing={5-6} (20-24px) to create breathing room between distinct content sections within a container",
    "Loose Spacing (8+): Use spacing={8+} (32px+) for major section breaks, like between hero sections and feature grids",
    "Grid Gap Scales with Columns: When using Grid layouts, gap={4} (16px) works for 3-column layouts, gap={6} (24px) for 2-column layouts. More columns = tighter gaps"
  ],

  hierarchy: [
    "Heading Level Hierarchy: level={3} for card titles and primary headings, level={4} for subsection titles within cards, level={5} for small labels or tertiary headings. Never skip levels",
    "Muted Variant for Metadata: Use variant='muted' on Text for timestamps, descriptions, labels, supplementary info, or anything that should recede visually (e.g., 'Per month', 'CURRENT PLAN')",
    "Primary Action Emphasis: The most important action in a group uses variant='primary'. Secondary actions use variant='secondary'. Tertiary/text-only actions use variant='link'",
    "All-Caps for Label Categories: Small, all-caps text (like 'CURRENT PLAN', 'RECOMMENDED', 'STORAGE') signals metadata categories. Always use variant='muted' with all-caps text",
    "Size Indicates Importance: Icon size={24} is standard for UI elements. Larger sizes (32+) emphasize importance. CardBody size='small' creates tighter internal padding for dense content"
  ],

  composition: [
    "Stretch Alignment for Forms: Forms and vertical input lists use VStack with alignment='stretch' so all fields have consistent width",
    "Grid Column Math: For N items in a 12-column grid, each gets gridColumnSpan={12/N}. 2 items = 6 each, 3 items = 4 each, 4 items = 3 each",
    "VStack for Vertical Flow: Default container for vertical content is VStack. Use it for form fields, card bodies, testimonial content, or any top-to-bottom flow",
    "HStack for Horizontal Grouping: Use HStack for horizontal arrangements like 'left content + right chevron', breadcrumbs, 'icon + label' pairs, or toolbar buttons",
    "Space-Between for Edge Alignment: Use justify='space-between' to push items to opposite edges (e.g., checkbox on left, 'Forgot password' link on right in login forms)"
  ],

  interaction: [
    "Chevron Indicates Navigation: A chevronRight icon signals 'this is clickable and will navigate somewhere'. Always place it at the trailing edge (right side) of a horizontal layout in CardHeader or action cards",
    "Icon + Heading Pairing: In CardHeader, pair an icon with a Heading in an HStack with spacing={2} (8px). The icon visually categorizes the card's purpose",
    "Disabled State Reduces Prominence: Current/active plans use disabled={true} and variant='secondary' for their buttons (e.g., 'Select' button on the Free plan when it's already active)",
    "Badge for Contextual Tags: Use Badge adjacent to prices or titles to highlight special states like discounts (intent='success' for '20% off') or status indicators"
  ],

  typography: [
    "Text vs Heading Distinction: Use Text for body content, descriptions, and metadata. Use Heading for titles, labels, values, and anything that needs semantic weight",
    "Semantic Weight Matters: Even if they look similar visually, the semantic distinction between Text and Heading matters for accessibility and hierarchy"
  ]
};

/**
 * Get relevant design heuristics based on the design context
 *
 * Smartly filters the 25 universal heuristics to return only the most relevant
 * rules for the current design task, keeping token usage low.
 *
 * @param context - Brief description of what's being designed
 * @returns Formatted string of relevant heuristics
 */
export function getRelevantHeuristics(context: string): string {
  const contextLower = context.toLowerCase();
  const relevant: string[] = [];

  // Always include structural rules for cards
  if (contextLower.includes('card')) {
    relevant.push(...HEURISTICS.structural);
  }

  // Include core spacing rules for most contexts (first 4 are most important)
  relevant.push(...HEURISTICS.spacing.slice(0, 4));

  // Add grid-specific spacing if relevant
  if (contextLower.includes('grid') || contextLower.includes('column')) {
    relevant.push(HEURISTICS.spacing[5]); // Grid Gap Scales
  }

  // Include hierarchy for content-heavy contexts
  if (contextLower.includes('dashboard') || contextLower.includes('metric') ||
      contextLower.includes('pricing') || contextLower.includes('content') ||
      contextLower.includes('feature') || contextLower.includes('hero')) {
    relevant.push(...HEURISTICS.hierarchy);
  }

  // Include composition for layout contexts
  if (contextLower.includes('grid') || contextLower.includes('layout') ||
      contextLower.includes('form') || contextLower.includes('vertical') ||
      contextLower.includes('horizontal') || contextLower.includes('stack')) {
    relevant.push(...HEURISTICS.composition);
  }

  // Include interaction for interactive contexts
  if (contextLower.includes('navigation') || contextLower.includes('clickable') ||
      contextLower.includes('button') || contextLower.includes('action') ||
      contextLower.includes('link') || contextLower.includes('menu')) {
    relevant.push(...HEURISTICS.interaction);
  }

  // Always include typography basics
  relevant.push(...HEURISTICS.typography);

  // If nothing matched, return core heuristics
  if (relevant.length === 0) {
    return formatHeuristics([
      ...HEURISTICS.structural,
      ...HEURISTICS.spacing.slice(0, 4),
      ...HEURISTICS.typography
    ]);
  }

  return formatHeuristics(relevant);
}

/**
 * Format heuristics into a readable string for the agent
 */
function formatHeuristics(heuristics: string[]): string {
  // Remove duplicates while preserving order
  const unique = Array.from(new Set(heuristics));

  return `DESIGN HEURISTICS FOR YOUR TASK:

${unique.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Apply these rules when generating markup to ensure professional design quality.`;
}

/**
 * Get all heuristics (for debugging/testing)
 */
export function getAllHeuristics(): typeof HEURISTICS {
  return HEURISTICS;
}
