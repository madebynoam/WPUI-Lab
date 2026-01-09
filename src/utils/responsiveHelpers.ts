import { ViewportSize } from '@/hooks/useResponsiveViewport';
import { ResponsiveColumns } from '@/types';

/**
 * Default column counts for each breakpoint
 * Matches WordPress Calypso dashboard behavior
 */
export const DEFAULT_RESPONSIVE_COLUMNS: Required<ResponsiveColumns> = {
  small: 2,
  medium: 4,
  large: 8,
  xlarge: 12,
};

/**
 * Get the column count for a Grid at the current viewport size
 */
export function getGridColumns(
  responsiveColumns: ResponsiveColumns | undefined,
  viewportSize: ViewportSize,
  baseColumns: number = 12
): number {
  // If no responsive columns defined, use defaults
  if (!responsiveColumns) {
    return DEFAULT_RESPONSIVE_COLUMNS[viewportSize];
  }

  // Use specified column count for this breakpoint, or fall back to default
  return responsiveColumns[viewportSize] ?? DEFAULT_RESPONSIVE_COLUMNS[viewportSize];
}

/**
 * Calculate proportional child span based on parent grid's column count change
 *
 * Example: Child spans 6 of 12 columns (50%)
 * - On large (8 columns): 6/12 * 8 = 4 columns
 * - On medium (4 columns): 6/12 * 4 = 2 columns
 * - On small (2 columns): 6/12 * 2 = 1 column
 */
export function calculateProportionalSpan(
  childSpan: number,
  originalGridColumns: number,
  newGridColumns: number
): number {
  // Calculate proportion (e.g., 6/12 = 0.5)
  const proportion = childSpan / originalGridColumns;

  // Apply proportion to new column count
  const newSpan = proportion * newGridColumns;

  // Round to nearest integer, minimum 1
  return Math.max(1, Math.round(newSpan));
}
