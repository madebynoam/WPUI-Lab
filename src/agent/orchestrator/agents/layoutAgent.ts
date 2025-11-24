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
  systemPrompt: `Validate layout rules.

Rules:
1. Grid: Min column span 1/3 of parent (12-col → min 4)
2. Spacing: Multiples of 8px only (8, 16, 24, 32, 48, 64)
3. Nesting: Cards in Grid, Forms in VStack
4. Responsive: Cards min 1/3 width

Tools:
- getPageComponents: Read tree
- updateComponentProps: Fix spacing/spans

Return JSON:
{
  "valid": true/false,
  "issues": [{"component": "ID", "issue": "...", "fix": "..."}],
  "suggestions": ["..."]
}

Only flag actual violations.`,
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
