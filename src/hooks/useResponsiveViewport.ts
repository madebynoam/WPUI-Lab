import { useViewportMatch } from '@wordpress/compose';

export type ViewportSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface ResponsiveViewport {
  size: ViewportSize;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isXLarge: boolean;
}

/**
 * Hook to detect current viewport size using WordPress breakpoints
 * Matches the approach used in WordPress Calypso dashboard
 *
 * Breakpoints:
 * - small: < 782px
 * - medium: >= 782px
 * - large: >= 1080px
 * - xlarge: >= 1280px
 */
export function useResponsiveViewport(): ResponsiveViewport {
  // WordPress breakpoints (from @wordpress/compose):
  // small: < 782px
  // medium: >= 782px
  // large: >= 1080px
  // xlarge: >= 1280px

  const isXLarge = useViewportMatch('xlarge'); // >= 1280px
  const isLarge = useViewportMatch('large'); // >= 1080px
  const isMedium = useViewportMatch('medium'); // >= 782px
  const isSmall = !isMedium; // < 782px

  // Determine specific size (most specific first)
  let size: ViewportSize;
  if (isXLarge) {
    size = 'xlarge';
  } else if (isLarge) {
    size = 'large';
  } else if (isMedium) {
    size = 'medium';
  } else {
    size = 'small';
  }

  return {
    size,
    isSmall,
    isMedium,
    isLarge,
    isXLarge,
  };
}
