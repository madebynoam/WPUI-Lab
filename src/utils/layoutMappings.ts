/**
 * Layout Mappings: Figma-Style Auto Layout ↔ WordPress VStack/HStack
 *
 * This utility translates between intuitive, designer-friendly Figma concepts
 * and WordPress component props, hiding low-level flex implementation details.
 */

export type ResizingBehavior = 'hug' | 'fill';
export type PrimaryAlign = 'start' | 'center' | 'end' | 'space-between';
export type CrossAlign = 'start' | 'center' | 'end' | 'stretch';

/**
 * High-level layout configuration (Figma-style)
 */
export interface FigmaLayoutConfig {
  /** How the container behaves horizontally */
  widthBehavior: ResizingBehavior;
  /** How the container behaves vertically */
  heightBehavior: ResizingBehavior;
  /** Alignment along the primary axis (direction of stack) */
  primaryAlign: PrimaryAlign;
  /** Alignment along the cross axis (perpendicular to stack) */
  crossAlign: CrossAlign;
  /** Gap between children in pixels */
  gap: number;
}

/**
 * WordPress VStack/HStack props
 */
export interface StackProps {
  alignment?: string;
  spacing?: number | string;
  expanded?: boolean;
  justify?: string;
}

/**
 * Result of mapping with warnings for unsupported combinations
 */
export interface MappingResult {
  props: StackProps;
  warnings: string[];
}

// ============================================================================
// VStack Mappings (Vertical Layout)
// ============================================================================

/**
 * Convert Figma-style layout to VStack props
 */
export function mapToVStackProps(config: FigmaLayoutConfig): MappingResult {
  const props: StackProps = {};
  const warnings: string[] = [];

  // Handle resizing behavior
  // VStack expanded={true} only fills HEIGHT, not width
  if (config.heightBehavior === 'fill') {
    props.expanded = true;
  } else {
    props.expanded = false;
  }

  // Width fill requires parent Grid - can't be done with VStack props alone
  if (config.widthBehavior === 'fill') {
    warnings.push('Width "Fill" requires placing this VStack in a Grid with gridColumnSpan, or setting explicit width in custom styles.');
  }

  // Always set spacing (convert pixel gap to 4px grid multiplier)
  props.spacing = Math.round(config.gap / 4);

  // Always use justify + alignment for precise control
  // Map primary axis to justify prop
  switch (config.primaryAlign) {
    case 'start':
      props.justify = 'flex-start';
      break;
    case 'center':
      props.justify = 'center';
      break;
    case 'end':
      props.justify = 'flex-end';
      break;
    case 'space-between':
      props.justify = 'space-between';
      break;
  }

  // Map cross axis to alignment (CSS value)
  props.alignment = mapVStackCrossAlign(config.crossAlign);

  return { props, warnings };
}

/**
 * Map only cross-axis alignment (horizontal for VStack)
 * Returns CSS alignItems values, not presets, to avoid conflicting with justify prop
 */
function mapVStackCrossAlign(cross: CrossAlign): string {
  switch (cross) {
    case 'start': return 'flex-start';  // CSS value, not 'left' preset
    case 'center': return 'center';
    case 'end': return 'flex-end';      // CSS value, not 'right' preset
    case 'stretch': return 'stretch';
    default: return 'center';
  }
}

/**
 * Convert VStack props back to Figma-style layout (for UI display)
 */
export function mapFromVStackProps(props: StackProps): FigmaLayoutConfig {
  const config: FigmaLayoutConfig = {
    widthBehavior: 'hug', // VStack doesn't control width via expanded
    heightBehavior: props.expanded ? 'fill' : 'hug',
    primaryAlign: 'start',
    crossAlign: 'center',
    gap: typeof props.spacing === 'number' ? props.spacing * 4 : 8,
  };

  // Read primary axis from justify prop (we always use justify now)
  if (props.justify) {
    switch (props.justify) {
      case 'flex-start':
        config.primaryAlign = 'start';
        break;
      case 'center':
        config.primaryAlign = 'center';
        break;
      case 'flex-end':
        config.primaryAlign = 'end';
        break;
      case 'space-between':
        config.primaryAlign = 'space-between';
        break;
      default:
        config.primaryAlign = 'start';
    }
  }

  // Read cross axis from alignment (should be CSS value)
  const alignment = props.alignment || 'center';
  config.crossAlign = parseCrossAxisAlignment(alignment);

  return config;
}

/**
 * Parse cross-axis alignment from alignment value (handles both presets and CSS values)
 */
function parseCrossAxisAlignment(alignment: string): CrossAlign {
  // Handle CSS values
  if (alignment === 'flex-start') return 'start';
  if (alignment === 'flex-end') return 'end';
  if (alignment === 'center') return 'center';
  if (alignment === 'stretch') return 'stretch';

  // Handle presets (for backward compatibility)
  if (alignment === 'left' || alignment === 'topLeft' || alignment === 'bottomLeft') return 'start';
  if (alignment === 'right' || alignment === 'topRight' || alignment === 'bottomRight') return 'end';

  // Default
  return 'center';
}

/**
 * Map Figma alignment to VStack alignment preset
 */
function mapVStackAlignment(primary: PrimaryAlign, cross: CrossAlign): string {
  // VStack alignment presets for column direction
  // Primary axis = vertical (justifyContent), Cross axis = horizontal (alignItems)

  if (primary === 'space-between') {
    return 'edge'; // Special case: space-between with center cross axis
  }

  // Map combination to named preset
  if (primary === 'start' && cross === 'start') return 'topLeft';
  if (primary === 'start' && cross === 'center') return 'top';
  if (primary === 'start' && cross === 'end') return 'topRight';
  if (primary === 'start' && cross === 'stretch') return 'stretch';

  if (primary === 'center' && cross === 'start') return 'left';
  if (primary === 'center' && cross === 'center') return 'center';
  if (primary === 'center' && cross === 'end') return 'right';
  if (primary === 'center' && cross === 'stretch') return 'stretch';

  if (primary === 'end' && cross === 'start') return 'bottomLeft';
  if (primary === 'end' && cross === 'center') return 'bottom';
  if (primary === 'end' && cross === 'end') return 'bottomRight';
  if (primary === 'end' && cross === 'stretch') return 'stretch';

  // Default fallback
  return 'top';
}

/**
 * Parse VStack alignment preset into primary/cross axis values
 */
function parseVStackAlignment(alignment: string): { primary: PrimaryAlign; cross: CrossAlign } {
  // Map VStack named presets back to primary/cross axis
  switch (alignment) {
    case 'topLeft': return { primary: 'start', cross: 'start' };
    case 'top': return { primary: 'start', cross: 'center' };
    case 'topRight': return { primary: 'start', cross: 'end' };

    case 'left': return { primary: 'center', cross: 'start' };
    case 'center': return { primary: 'center', cross: 'center' };
    case 'right': return { primary: 'center', cross: 'end' };

    case 'bottomLeft': return { primary: 'end', cross: 'start' };
    case 'bottom': return { primary: 'end', cross: 'center' };
    case 'bottomRight': return { primary: 'end', cross: 'end' };

    case 'edge': return { primary: 'space-between', cross: 'center' };
    case 'stretch': return { primary: 'start', cross: 'stretch' };

    default: return { primary: 'start', cross: 'center' };
  }
}

// ============================================================================
// HStack Mappings (Horizontal Layout)
// ============================================================================

/**
 * Convert Figma-style layout to HStack props
 */
export function mapToHStackProps(config: FigmaLayoutConfig): MappingResult {
  const props: StackProps = {};
  const warnings: string[] = [];

  // Handle resizing behavior
  // HStack expanded={true} only fills WIDTH, not height
  if (config.widthBehavior === 'fill') {
    props.expanded = true;
  } else {
    props.expanded = false;
  }

  // Height fill requires parent container - can't be done with HStack props alone
  if (config.heightBehavior === 'fill') {
    warnings.push('Height "Fill" requires placing this HStack in a container with explicit height.');
  }

  // Always set spacing (convert pixel gap to 4px grid multiplier)
  props.spacing = Math.round(config.gap / 4);

  // Always use justify + alignment for precise control
  // Map primary axis to justify prop
  switch (config.primaryAlign) {
    case 'start':
      props.justify = 'flex-start';
      break;
    case 'center':
      props.justify = 'center';
      break;
    case 'end':
      props.justify = 'flex-end';
      break;
    case 'space-between':
      props.justify = 'space-between';
      break;
  }

  // Map cross axis to alignment (CSS value)
  props.alignment = mapHStackCrossAlign(config.crossAlign);

  return { props, warnings };
}

/**
 * Map only cross-axis alignment (vertical for HStack)
 * Returns CSS alignItems values, not presets, to avoid conflicting with justify prop
 */
function mapHStackCrossAlign(cross: CrossAlign): string {
  switch (cross) {
    case 'start': return 'flex-start';  // CSS value, not 'top' preset
    case 'center': return 'center';
    case 'end': return 'flex-end';      // CSS value, not 'bottom' preset
    case 'stretch': return 'stretch';
    default: return 'center';
  }
}

/**
 * Convert HStack props back to Figma-style layout (for UI display)
 */
export function mapFromHStackProps(props: StackProps): FigmaLayoutConfig {
  const config: FigmaLayoutConfig = {
    widthBehavior: props.expanded ? 'fill' : 'hug',
    heightBehavior: 'hug', // HStack doesn't control height via expanded
    primaryAlign: 'start',
    crossAlign: 'center',
    gap: typeof props.spacing === 'number' ? props.spacing * 4 : 8,
  };

  // Read primary axis from justify prop (we always use justify now)
  if (props.justify) {
    switch (props.justify) {
      case 'flex-start':
        config.primaryAlign = 'start';
        break;
      case 'center':
        config.primaryAlign = 'center';
        break;
      case 'flex-end':
        config.primaryAlign = 'end';
        break;
      case 'space-between':
        config.primaryAlign = 'space-between';
        break;
      default:
        config.primaryAlign = 'start';
    }
  }

  // Read cross axis from alignment (should be CSS value)
  const alignment = props.alignment || 'center';
  config.crossAlign = parseCrossAxisAlignment(alignment);

  return config;
}

/**
 * Map Figma alignment to HStack alignment preset
 */
function mapHStackAlignment(primary: PrimaryAlign, cross: CrossAlign): string {
  // HStack alignment presets for row direction
  // Primary axis = horizontal (justifyContent), Cross axis = vertical (alignItems)

  if (primary === 'space-between') {
    return 'edge'; // Special case: space-between with center cross axis
  }

  // Map combination to named preset
  if (primary === 'start' && cross === 'start') return 'topLeft';
  if (primary === 'start' && cross === 'center') return 'left';
  if (primary === 'start' && cross === 'end') return 'bottomLeft';
  if (primary === 'start' && cross === 'stretch') return 'stretch';

  if (primary === 'center' && cross === 'start') return 'top';
  if (primary === 'center' && cross === 'center') return 'center';
  if (primary === 'center' && cross === 'end') return 'bottom';
  if (primary === 'center' && cross === 'stretch') return 'stretch';

  if (primary === 'end' && cross === 'start') return 'topRight';
  if (primary === 'end' && cross === 'center') return 'right';
  if (primary === 'end' && cross === 'end') return 'bottomRight';
  if (primary === 'end' && cross === 'stretch') return 'stretch';

  // Default fallback
  return 'left';
}

/**
 * Parse HStack alignment preset into primary/cross axis values
 */
function parseHStackAlignment(alignment: string): { primary: PrimaryAlign; cross: CrossAlign } {
  // Map HStack named presets back to primary/cross axis
  switch (alignment) {
    case 'topLeft': return { primary: 'start', cross: 'start' };
    case 'left': return { primary: 'start', cross: 'center' };
    case 'bottomLeft': return { primary: 'start', cross: 'end' };

    case 'top': return { primary: 'center', cross: 'start' };
    case 'center': return { primary: 'center', cross: 'center' };
    case 'bottom': return { primary: 'center', cross: 'end' };

    case 'topRight': return { primary: 'end', cross: 'start' };
    case 'right': return { primary: 'end', cross: 'center' };
    case 'bottomRight': return { primary: 'end', cross: 'end' };

    case 'edge': return { primary: 'space-between', cross: 'center' };
    case 'stretch': return { primary: 'start', cross: 'stretch' };

    default: return { primary: 'start', cross: 'center' };
  }
}

// ============================================================================
// Common Spacing Presets
// ============================================================================

/**
 * Common spacing values in pixels
 */
export const SPACING_PRESETS = [
  { label: 'None', value: 0 },
  { label: 'Tight', value: 4 },
  { label: 'Normal', value: 8 },
  { label: 'Relaxed', value: 12 },
  { label: 'Loose', value: 16 },
  { label: 'Extra Loose', value: 24 },
  { label: 'Spacious', value: 32 },
];

/**
 * Convert spacing preset to WordPress spacing prop (4px grid)
 */
export function spacingPresetToWordPress(pixels: number): number {
  return Math.round(pixels / 4);
}

/**
 * Convert WordPress spacing prop to pixels
 */
export function wordPressSpacingToPixels(spacing: number | string): number {
  if (typeof spacing === 'number') {
    return spacing * 4;
  }
  // Parse CSS string (e.g., "16px")
  const match = spacing.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 8;
}
