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
    "4px Grid System: All spacing uses multiples of 4px. spacing={1} = 4px, spacing={2} = 8px, spacing={3} = 12px, spacing={4} = 16px, etc. VALID VALUES: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24 (enforced by validation)",
    "Tight Proximity (1-2): Use spacing={1-2} (4-8px) for tightly related items like icon+text pairs, button groups, or label+value pairs that form a single conceptual unit",
    "Normal Spacing (3-4): Use spacing={3-4} (12-16px) for form fields, list items within cards, or vertical content stacks. This is the default spacing for most content",
    "Relaxed Spacing (5-6): Use spacing={5-6} (20-24px) to create breathing room between distinct content sections within a container",
    "Loose Spacing (8+): Use spacing={8, 10, 12} (32-48px) for major section breaks, like between hero sections and feature grids",
    "Grid Gap Scales with Columns: When using Grid layouts, gap={4} (16px) works for 3-column layouts, gap={6} (24px) for 2-column layouts. More columns = tighter gaps. VALID gap VALUES: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24"
  ],

  hierarchy: [
    "Heading Level Hierarchy: level={3} for card titles and primary headings, level={4} for subsection titles within cards, level={5} for small labels or tertiary headings. Never skip levels",
    "Muted Variant for Metadata: Use variant='muted' on Text for timestamps, descriptions, labels, supplementary info, or anything that should recede visually (e.g., 'Per month', 'CURRENT PLAN')",
    "Primary Action Emphasis: The most important action in a group uses variant='primary'. Secondary actions use variant='secondary'. Tertiary/text-only actions use variant='link'",
    "All-Caps for Label Categories: Small, all-caps text (like 'CURRENT PLAN', 'RECOMMENDED', 'STORAGE') signals metadata categories. Always use variant='muted' with all-caps text",
    "Size Indicates Importance: Icon size={24} is standard for UI elements. Larger sizes (32+) emphasize importance. CardBody size='small' creates tighter internal padding for dense content"
  ],

  composition: [
    "Grid-Only Top Level: ALL top-level markup MUST start with Grid columns={12}. NEVER use VStack, HStack, or Stack at the top level. Grid provides the 12-column layout system for all content",
    "Grid Spans Must Fill Columns: In a Grid with columns={12}, child gridColumnSpan values MUST add up to 12. Examples: 1 item = gridColumnSpan={12}, 2 items = gridColumnSpan={6} each, 3 items = gridColumnSpan={4} each, 4 items = gridColumnSpan={3} each",
    "Stack Component (PREFERRED): Use <Stack gap='md' direction='vertical'> for vertical/horizontal content flow. Stack uses WordPress semantic tokens (gap='xs'|'sm'|'md'|'lg'|'xl') for better design system alignment. Preferred over VStack/HStack",
    "Stack Placement: Stack is ONLY allowed inside Card parts (CardHeader/CardBody/CardFooter) OR as Grid children with gridColumnSpan={12}. It's a container-level component, NOT a top-level container",
    "Stack Gap Tokens: Use gap='xs' (8px) for tight pairs, gap='sm' (12px) for compact lists, gap='md' (16px) for normal spacing (DEFAULT), gap='lg' (24px) for relaxed sections, gap='xl' (32px) for major breaks",
    "Form Field Pattern: Use label prop for field labels. TextControl/TextareaControl children contain placeholder text. SelectControl uses options prop with array of {label, value} objects. Examples: <TextControl label='Name'>Your name</TextControl>, <SelectControl label='Size' options={[{label: 'Small', value: 's'}, {label: 'Large', value: 'l'}]} />",
    "Stack for Vertical Flow: Inside containers, use <Stack direction='vertical' gap='md'> for form fields, card bodies, testimonial content. Use alignment='stretch' for forms so fields have consistent width",
    "Stack for Horizontal Grouping: Inside containers, use <Stack direction='horizontal' gap='sm'> for 'icon + label' pairs, breadcrumbs, or toolbar buttons",
    "Space-Between for Edge Alignment: Use justify='space-between' to push items to opposite edges (e.g., checkbox left, link right)"
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
  ],

  layout: [
    "Centered Content Pattern: For full pages/dashboards, create professional layouts with margins. Use full-width header (gridColumnSpan={12}), then nest a Grid with gridColumnStart={2} gridColumnSpan={10} columns={12} for content. This creates 1-column margins on each side (Automattic style)",
    "Sidebar Pattern: For pages with navigation, use gridColumnSpan={3} for sidebar, gridColumnSpan={9} for main content. Nest a Grid inside the main content area with columns={12} for further layout",
    "Asymmetric Pattern: For dashboards with activity feeds, use uneven splits like gridColumnSpan={7} for primary content and gridColumnSpan={5} for secondary sidebar. This creates visual hierarchy",
    "Column Span by Content Type: Full-width (12 cols) for navbars/headers/heroes/tables. Primary content (6-8 cols) for featured cards/forms/CTAs. Equal distribution: 2 items=6 each, 3 items=4 each, 4 items=3 each. Secondary content (4-5 cols) for sidebars/activity feeds/stats (3-4 cols)",
    "Dashboard Layout Selection: Default 'create a dashboard' → Centered Content pattern. 'Dashboard with sidebar' → Sidebar pattern. 'Dashboard with activity feed' → Asymmetric pattern. Context determines pattern",
    "Nested Grids for Complex Layouts: When creating multi-region layouts (like sidebar + content), use nested Grids. Outer Grid divides space (sidebar span 3, content span 9), inner Grid in content area has its own columns={12} for layout flexibility",
    "Context-Aware Layout: If parent is ROOT_GRID_ID → use dashboard patterns. If parent is VStack/HStack → just add children (no layout pattern). If parent is nested Grid → use appropriate gridColumnSpan"
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

  // Include layout for page-level or multi-column contexts
  if (contextLower.includes('dashboard') || contextLower.includes('page') ||
      contextLower.includes('sidebar') || contextLower.includes('layout') ||
      contextLower.includes('full') || contextLower.includes('centered') ||
      contextLower.includes('asymmetric') || contextLower.includes('activity') ||
      contextLower.includes('feed') || contextLower.includes('hero') ||
      contextLower.includes('section')) {
    relevant.push(...HEURISTICS.layout);
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
