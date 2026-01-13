import { useViewportMatch } from '@wordpress/compose';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

export type ViewportSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface ResponsiveViewport {
  size: ViewportSize;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isXLarge: boolean;
  actualWidth: number;
}

// Viewport preset dimensions
export const VIEWPORT_WIDTHS = {
  mobile: 375,
  tablet: 768,
  desktop: 1440,
  full: 0, // 0 = use actual window width
} as const;

export const VIEWPORT_HEIGHTS = {
  mobile: 667,   // iPhone proportions
  tablet: 1024,  // iPad proportions
  desktop: 900,  // Desktop monitor proportions
  full: 0,       // 0 = use container height
} as const;

// WordPress-compatible breakpoints
const BREAKPOINTS = {
  xlarge: 1280,
  large: 1080,
  medium: 782,
} as const;

/**
 * Determine viewport size from width using WordPress breakpoints.
 */
function getViewportSizeFromWidth(width: number): ViewportSize {
  if (width >= BREAKPOINTS.xlarge) return 'xlarge';
  if (width >= BREAKPOINTS.large) return 'large';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'small';
}

/**
 * Determine viewport size from WordPress viewport match hooks.
 */
function getViewportSizeFromHooks(
  isXLarge: boolean,
  isLarge: boolean,
  isMedium: boolean
): ViewportSize {
  if (isXLarge) return 'xlarge';
  if (isLarge) return 'large';
  if (isMedium) return 'medium';
  return 'small';
}

/**
 * Hook to detect current viewport size using WordPress breakpoints.
 * Supports viewport preview override for testing responsive behavior.
 *
 * Breakpoints:
 * - small: < 782px
 * - medium: >= 782px
 * - large: >= 1080px
 * - xlarge: >= 1280px
 */
export function useResponsiveViewport(): ResponsiveViewport {
  const { viewportPreset } = useComponentTree();

  // Always call hooks unconditionally (Rules of Hooks requirement)
  const isXLarge = useViewportMatch('xlarge');
  const isLarge = useViewportMatch('large');
  const isMedium = useViewportMatch('medium');

  const presetWidth = VIEWPORT_WIDTHS[viewportPreset];
  const isPreviewMode = presetWidth > 0;

  // Calculate size and actualWidth based on mode
  const size = isPreviewMode
    ? getViewportSizeFromWidth(presetWidth)
    : getViewportSizeFromHooks(isXLarge, isLarge, isMedium);

  const actualWidth = isPreviewMode
    ? presetWidth
    : (typeof window !== 'undefined' ? window.innerWidth : 1280);

  return {
    size,
    isSmall: size === 'small',
    isMedium: size === 'medium',
    isLarge: size === 'large',
    isXLarge: size === 'xlarge',
    actualWidth,
  };
}
