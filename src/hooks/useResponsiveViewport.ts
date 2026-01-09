import { useViewportMatch } from '@wordpress/compose';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

export type ViewportSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface ResponsiveViewport {
  size: ViewportSize;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isXLarge: boolean;
  actualWidth: number; // The width being used for calculations
}

// Viewport preset widths
export const VIEWPORT_WIDTHS = {
  mobile: 375,
  tablet: 768,
  desktop: 1440,
  full: 0, // 0 means use actual window width
} as const;

/**
 * Hook to detect current viewport size using WordPress breakpoints
 * Supports viewport preview override for testing responsive behavior
 *
 * Breakpoints:
 * - small: < 782px
 * - medium: >= 782px
 * - large: >= 1080px
 * - xlarge: >= 1280px
 */
export function useResponsiveViewport(): ResponsiveViewport {
  const { viewportPreset } = useComponentTree();

  // Always call hooks (Rules of Hooks requirement)
  const isXLarge = useViewportMatch('xlarge');
  const isLarge = useViewportMatch('large');
  const isMedium = useViewportMatch('medium');

  // Get viewport preset width (0 = use actual window width)
  const presetWidth = VIEWPORT_WIDTHS[viewportPreset];

  // If viewport preview is active, use preset width for breakpoint detection
  // Otherwise, use WordPress useViewportMatch for actual window width
  let size: ViewportSize;
  let actualWidth: number;

  if (presetWidth > 0) {
    // Viewport preview mode - use preset width
    actualWidth = presetWidth;

    // Manually determine breakpoint based on preset width
    if (actualWidth >= 1280) {
      size = 'xlarge';
    } else if (actualWidth >= 1080) {
      size = 'large';
    } else if (actualWidth >= 782) {
      size = 'medium';
    } else {
      size = 'small';
    }
  } else {
    // Full width mode - use actual window width from hooks
    if (isXLarge) {
      size = 'xlarge';
    } else if (isLarge) {
      size = 'large';
    } else if (isMedium) {
      size = 'medium';
    } else {
      size = 'small';
    }

    actualWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  }

  return {
    size,
    isSmall: size === 'small',
    isMedium: size === 'medium',
    isLarge: size === 'large',
    isXLarge: size === 'xlarge',
    actualWidth,
  };
}
