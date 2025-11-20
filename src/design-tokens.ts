/**
 * Design Tokens
 *
 * Centralized design system using WordPress CSS custom properties.
 * These tokens ensure consistency across the application and allow
 * for easy theming through CSS variables.
 */

/**
 * Color Tokens
 * Based on WordPress 2025 design system with modern blueberry palette
 */
export const colors = {
  // Primary colors
  primary: 'var(--wp-admin-theme-color, #3858e9)', // Modern WordPress blue
  primaryLight: 'var(--wp--preset--color--blueberry-2, #9fb1ff)',
  primaryLighter: 'var(--wp--preset--color--blueberry-4, #eff2ff)',
  primaryDark: 'var(--wp-admin-theme-color-darker-20, #213fd4)',
  primaryDarker: 'var(--wp--preset--color--dark-blueberry, #1d35b4)',

  // Semantic colors
  surface: '#fff',
  surfaceSecondary: '#f9fafc',
  surfaceTertiary: '#f0f0f1',

  // Text colors
  text: '#1e1e1e',
  textSecondary: '#757575',
  textTertiary: '#999',
  textInverse: '#fff',

  // Border and divider
  border: 'rgba(0, 0, 0, 0.133)',
  borderLight: 'rgba(0, 0, 0, 0.05)',
  divider: '#e0e0e0',

  // Interactive states
  hover: '#f0f0f0',
  focus: '#3858e9',
  focusOutline: '2px solid #3858e9',
  disabled: '#ccc',
  disabledText: '#999',

  // Semantic colors
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#0c5460',

  // Grid and visualization
  gridLine: '#007cba',
  gridLineLight: 'rgba(0, 124, 186, 0.15)',
  gridGutter: 'rgba(0, 124, 186, 0.15)',
  selectionOutline: '#3858e9',
  dropIndicator: '#2271b1',
  dropBackground: 'rgba(34, 113, 177, 0.12)',
  hoverBackground: '#e5f5fa',
} as const;

/**
 * Spacing Tokens
 * Base unit: 4px
 */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
} as const;

/**
 * Typography Tokens
 */
export const typography = {
  // Font sizes
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    xxl: '20px',
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

/**
 * Border Tokens
 */
export const borders = {
  none: 'none',
  thin: '1px solid',
  thick: '2px solid',
  radius: {
    none: '0',
    sm: '2px',
    md: '4px',
    lg: '6px',
    full: '9999px',
  },
} as const;

/**
 * Shadow Tokens
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 2px 4px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 8px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 16px rgba(0, 0, 0, 0.2)',
  modal: '0 2px 8px rgba(0, 0, 0, 0.15)',
} as const;

/**
 * Component-specific tokens
 */
export const components = {
  button: {
    padding: `${spacing.sm} ${spacing.lg}`,
    height: '36px',
    fontSize: typography.fontSize.base,
    borderRadius: borders.radius.sm,
  },

  input: {
    padding: `${spacing.sm} ${spacing.md}`,
    height: '36px',
    fontSize: typography.fontSize.base,
    borderRadius: borders.radius.sm,
    border: `1px solid ${colors.border}`,
    focusBorder: `1px solid ${colors.focus}`,
  },

  panel: {
    padding: spacing.lg,
    borderRadius: borders.radius.md,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
  },

  treeItem: {
    height: '36px',
    paddingY: spacing.sm,
    paddingX: spacing.md,
    selectedBackground: colors.primary,
    selectedText: colors.textInverse,
    hoverBackground: colors.hover,
  },
} as const;

/**
 * Transition/Animation Tokens
 */
export const transitions = {
  fast: '0.05s ease',
  normal: '0.1s ease',
  slow: '0.2s ease',
} as const;

/**
 * Z-index scale
 */
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
} as const;
