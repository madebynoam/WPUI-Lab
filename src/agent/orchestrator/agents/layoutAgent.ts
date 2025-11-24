import { AgentConfig } from '../types';

/**
 * Layout Agent Configuration
 *
 * Responsibility: Validates and enforces spatial system rules
 *
 * Tools:
 * - getPageComponents: Read current layout
 * - updateComponentProps: Fix spacing, grid spans
 *
 * Use Cases:
 * - Ensure components are in Grid containers
 * - Validate minimum column spans (1/3 of parent)
 * - Enforce 8pt spacing scale
 * - Fix improper nesting
 */
export const layoutAgentConfig: AgentConfig = {
  type: 'layout',
  model: {
    provider: 'openai',
    model: 'gpt-5-nano',
  },
  systemPrompt: `You are a Layout Agent for WP-Designer. Your job is to validate and enforce layout rules.

Your responsibilities:
1. Ensure components are in proper containers (Grid, not loose VStack)
2. Validate column spans (minimum 1/3 of parent columns)
3. Enforce 8pt spacing scale (8px, 16px, 24px, 32px, 48px, 64px)
4. Check proper nesting (Cards/Panels contain content, not float loose)

Layout Rules:
1. **Grid System:**
   - Multi-column layouts must use Grid component
   - Minimum column span: 1/3 of parent (e.g., 12-col grid → min 4 cols)
   - Cards in Grid should span evenly (3 cards → 4 cols each)

2. **Spacing Scale (8pt):**
   - Use multiples of 8px: 8, 16, 24, 32, 48, 64
   - Small spacing: 8px-16px (tight layouts, form fields)
   - Medium spacing: 24px-32px (sections, cards)
   - Large spacing: 48px-64px (major sections, hero)

3. **Proper Nesting:**
   - Cards should be in Grid containers
   - Forms should be in VStack
   - Buttons in HStack for horizontal groups
   - Content in proper containers, not loose at root

4. **Responsive Behavior:**
   - Cards: min 1/3 width (prevents too-narrow cards)
   - Stack mobile, grid desktop

Available tools:
- getPageComponents: Read current component tree
- updateComponentProps: Update spacing, grid spans, layout props

Output format:
{
  "valid": true/false,
  "issues": [
    {"component": "Card-123", "issue": "Column span too narrow", "fix": "Change span from 2 to 4"}
  ],
  "suggestions": [
    "Consider 24px spacing between cards"
  ]
}

IMPORTANT: Only flag actual layout violations. Don't be overly prescriptive.`,
  maxCalls: 3,
  tools: [
    'getPageComponents',
    'updateComponentProps',
  ],
};

/**
 * Layout validation rules
 */
export const LAYOUT_RULES = {
  spacing: {
    scale: [8, 16, 24, 32, 48, 64],
    small: [8, 16],
    medium: [24, 32],
    large: [48, 64],
  },
  grid: {
    minColumnSpan: (totalColumns: number) => Math.ceil(totalColumns / 3),
    recommendedColumns: [1, 2, 3, 4, 6, 12],
  },
  nesting: {
    cardsNeedContainer: true,
    formsNeedVStack: true,
    buttonsCanBeInHStack: true,
  },
};

/**
 * Validate spacing value against 8pt scale
 */
export function validateSpacing(value: number): {
  valid: boolean;
  nearest?: number;
  suggestion?: string;
} {
  const { scale } = LAYOUT_RULES.spacing;

  if (scale.includes(value)) {
    return { valid: true };
  }

  // Find nearest valid value
  const nearest = scale.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );

  return {
    valid: false,
    nearest,
    suggestion: `Use ${nearest}px instead of ${value}px (8pt scale)`,
  };
}

/**
 * Validate grid column span
 */
export function validateColumnSpan(
  span: number,
  totalColumns: number
): {
  valid: boolean;
  suggestion?: string;
} {
  const minSpan = LAYOUT_RULES.grid.minColumnSpan(totalColumns);

  if (span >= minSpan) {
    return { valid: true };
  }

  return {
    valid: false,
    suggestion: `Column span ${span} is too narrow. Minimum for ${totalColumns}-column grid is ${minSpan} (1/3 width)`,
  };
}
