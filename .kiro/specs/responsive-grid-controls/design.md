# Design Document: Responsive Grid Controls

## Overview

This design implements automatic responsive grid behavior for WP-Designer using WordPress's `useViewportMatch` hook from `@wordpress/compose`. The system automatically adjusts grid column counts across breakpoints and proportionally scales child component spans, matching the approach used in WordPress Calypso's dashboard.

The design follows a simple principle: **Grid containers control breakpoint behavior, children adapt automatically**. This keeps the UI simple while providing powerful responsive capabilities.

## Architecture

### Component Hierarchy

```
Canvas (detects viewport with useViewportMatch)
  └─ RenderNode (applies responsive column count)
      └─ Grid (renders with breakpoint-specific columns)
          └─ Grid Children (automatically scaled spans)
```

### Data Flow

1. **Viewport Detection**: Canvas uses `useViewportMatch` to detect current breakpoint
2. **Grid Column Resolution**: Grid component reads `responsiveColumns` from node props and applies appropriate column count
3. **Child Span Calculation**: RenderNode calculates proportional child spans based on parent grid's current column count
4. **Style Application**: Inline styles are applied to reflect responsive behavior
5. **Code Export**: Code generator creates media queries for responsive behavior

## Components and Interfaces

### 1. Viewport Detection Hook

**Location**: `src/hooks/useResponsiveViewport.ts` (new file)

```typescript
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
```

### 2. Responsive Grid Columns Type

**Location**: `src/types.ts` (update existing)

```typescript
export interface ResponsiveColumns {
  small?: number;    // < 782px (default: 2)
  medium?: number;   // >= 782px (default: 4)
  large?: number;    // >= 1080px (default: 8)
  xlarge?: number;   // >= 1280px (default: 12)
}

// Add to ComponentNode interface:
export interface ComponentNode {
  // ... existing properties
  responsiveColumns?: ResponsiveColumns; // For Grid components only
}
```

### 3. Responsive Column Resolution

**Location**: `src/utils/responsiveHelpers.ts` (new file)

```typescript
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
```

### 4. Canvas Updates

**Location**: `src/components/Canvas.tsx` (update existing)

Add viewport detection to Canvas component:

```typescript
import { useResponsiveViewport } from '@/hooks/useResponsiveViewport';

export const Canvas: React.FC<CanvasProps> = ({ showBreadcrumb = true }) => {
  // ... existing code
  
  // Add viewport detection
  const viewport = useResponsiveViewport();
  
  // Pass viewport to context or RenderNode via props
  // ... rest of component
}
```

### 5. RenderNode Updates

**Location**: `src/components/RenderNode.tsx` (update existing)

Update Grid rendering to apply responsive columns:

```typescript
import { useResponsiveViewport } from '@/hooks/useResponsiveViewport';
import { getGridColumns, calculateProportionalSpan } from '@/utils/responsiveHelpers';

// Inside RenderNode component:
const viewport = useResponsiveViewport();

// For Grid components:
if (node.type === 'Grid') {
  const baseColumns = node.props.columns || 12;
  const currentColumns = getGridColumns(
    node.responsiveColumns,
    viewport.size,
    baseColumns
  );
  
  // Apply currentColumns to grid-template-columns style
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${currentColumns}, 1fr)`,
    // ... other grid styles
  };
}

// For Grid children:
if (parentNode?.type === 'Grid') {
  const baseColumns = parentNode.props.columns || 12;
  const currentColumns = getGridColumns(
    parentNode.responsiveColumns,
    viewport.size,
    baseColumns
  );
  
  const childSpan = node.props.gridColumnSpan || 1;
  const adjustedSpan = calculateProportionalSpan(
    childSpan,
    baseColumns,
    currentColumns
  );
  
  // Apply adjustedSpan to grid-column style
  const childStyle = {
    gridColumn: `span ${adjustedSpan}`,
    // ... other styles
  };
}
```

### 6. Properties Panel - Responsive Columns Control

**Location**: `src/components/PropertiesPanel.tsx` (update existing)

Add responsive columns control for Grid components:

```typescript
import { ResponsiveColumns } from '@/types';
import { DEFAULT_RESPONSIVE_COLUMNS } from '@/utils/responsiveHelpers';

// Inside PropertiesPanel, for Grid components:
const responsiveColumns = selectedNode.responsiveColumns || {};

<div style={{ marginBottom: '16px' }}>
  <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
    Responsive Columns
  </h3>
  <p style={{ fontSize: '11px', color: '#757575', marginBottom: '12px' }}>
    Set column count for each breakpoint
  </p>
  
  {/* XLarge breakpoint */}
  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <label style={{ fontSize: '11px', width: '80px' }}>XLarge (≥1280px)</label>
    <input
      type="number"
      min="1"
      max="24"
      value={responsiveColumns.xlarge ?? DEFAULT_RESPONSIVE_COLUMNS.xlarge}
      onChange={(e) => {
        updateComponentProps(selectedNode.id, {
          responsiveColumns: {
            ...responsiveColumns,
            xlarge: parseInt(e.target.value) || DEFAULT_RESPONSIVE_COLUMNS.xlarge,
          },
        });
      }}
      style={{
        width: '60px',
        padding: '4px 8px',
        fontSize: '13px',
        border: '1px solid #ddd',
        borderRadius: '2px',
      }}
    />
  </div>
  
  {/* Large breakpoint */}
  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <label style={{ fontSize: '11px', width: '80px' }}>Large (≥1080px)</label>
    <input
      type="number"
      min="1"
      max="24"
      value={responsiveColumns.large ?? DEFAULT_RESPONSIVE_COLUMNS.large}
      onChange={(e) => {
        updateComponentProps(selectedNode.id, {
          responsiveColumns: {
            ...responsiveColumns,
            large: parseInt(e.target.value) || DEFAULT_RESPONSIVE_COLUMNS.large,
          },
        });
      }}
      style={{
        width: '60px',
        padding: '4px 8px',
        fontSize: '13px',
        border: '1px solid #ddd',
        borderRadius: '2px',
      }}
    />
  </div>
  
  {/* Medium breakpoint */}
  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <label style={{ fontSize: '11px', width: '80px' }}>Medium (≥782px)</label>
    <input
      type="number"
      min="1"
      max="24"
      value={responsiveColumns.medium ?? DEFAULT_RESPONSIVE_COLUMNS.medium}
      onChange={(e) => {
        updateComponentProps(selectedNode.id, {
          responsiveColumns: {
            ...responsiveColumns,
            medium: parseInt(e.target.value) || DEFAULT_RESPONSIVE_COLUMNS.medium,
          },
        });
      }}
      style={{
        width: '60px',
        padding: '4px 8px',
        fontSize: '13px',
        border: '1px solid #ddd',
        borderRadius: '2px',
      }}
    />
  </div>
  
  {/* Small breakpoint */}
  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <label style={{ fontSize: '11px', width: '80px' }}>Small (<782px)</label>
    <input
      type="number"
      min="1"
      max="24"
      value={responsiveColumns.small ?? DEFAULT_RESPONSIVE_COLUMNS.small}
      onChange={(e) => {
        updateComponentProps(selectedNode.id, {
          responsiveColumns: {
            ...responsiveColumns,
            small: parseInt(e.target.value) || DEFAULT_RESPONSIVE_COLUMNS.small,
          },
        });
      }}
      style={{
        width: '60px',
        padding: '4px 8px',
        fontSize: '13px',
        border: '1px solid #ddd',
        borderRadius: '2px',
      }}
    />
  </div>
</div>
```

### 7. Viewport Size Indicator

**Location**: `src/components/CanvasControls.tsx` (update existing or create new)

Add viewport size indicator to canvas controls:

```typescript
import { useResponsiveViewport } from '@/hooks/useResponsiveViewport';

export const ViewportIndicator: React.FC = () => {
  const viewport = useResponsiveViewport();
  
  const viewportLabels = {
    small: 'Small (<782px)',
    medium: 'Medium (782-1080px)',
    large: 'Large (1080-1280px)',
    xlarge: 'XLarge (≥1280px)',
  };
  
  return (
    <div style={{
      padding: '4px 12px',
      backgroundColor: '#f0f0f0',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 500,
      color: '#1e1e1e',
    }}>
      Viewport: {viewportLabels[viewport.size]}
    </div>
  );
};
```

### 8. Code Generation Updates

**Location**: `src/utils/codeGenerator.ts` (update existing)

Add media query generation for responsive grids:

```typescript
import { ResponsiveColumns } from '@/types';
import { DEFAULT_RESPONSIVE_COLUMNS } from '@/utils/responsiveHelpers';

/**
 * Generate CSS media queries for responsive grid columns
 */
function generateResponsiveGridCSS(
  node: ComponentNode,
  className: string
): string {
  if (node.type !== 'Grid' || !node.responsiveColumns) {
    return '';
  }
  
  const responsiveColumns = node.responsiveColumns;
  const baseColumns = node.props.columns || 12;
  
  let css = '';
  
  // Small breakpoint (< 782px) - mobile first, no media query needed
  const smallCols = responsiveColumns.small ?? DEFAULT_RESPONSIVE_COLUMNS.small;
  css += `.${className} {\n`;
  css += `  grid-template-columns: repeat(${smallCols}, 1fr);\n`;
  css += `}\n\n`;
  
  // Medium breakpoint (>= 782px)
  const mediumCols = responsiveColumns.medium ?? DEFAULT_RESPONSIVE_COLUMNS.medium;
  css += `@media (min-width: 782px) {\n`;
  css += `  .${className} {\n`;
  css += `    grid-template-columns: repeat(${mediumCols}, 1fr);\n`;
  css += `  }\n`;
  css += `}\n\n`;
  
  // Large breakpoint (>= 1080px)
  const largeCols = responsiveColumns.large ?? DEFAULT_RESPONSIVE_COLUMNS.large;
  css += `@media (min-width: 1080px) {\n`;
  css += `  .${className} {\n`;
  css += `    grid-template-columns: repeat(${largeCols}, 1fr);\n`;
  css += `  }\n`;
  css += `}\n\n`;
  
  // XLarge breakpoint (>= 1280px)
  const xlargeCols = responsiveColumns.xlarge ?? DEFAULT_RESPONSIVE_COLUMNS.xlarge;
  css += `@media (min-width: 1280px) {\n`;
  css += `  .${className} {\n`;
  css += `    grid-template-columns: repeat(${xlargeCols}, 1fr);\n`;
  css += `  }\n`;
  css += `}\n\n`;
  
  return css;
}

/**
 * Generate CSS media queries for responsive child spans
 */
function generateResponsiveChildCSS(
  node: ComponentNode,
  parentNode: ComponentNode,
  className: string
): string {
  if (parentNode.type !== 'Grid' || !parentNode.responsiveColumns) {
    return '';
  }
  
  const childSpan = node.props.gridColumnSpan || 1;
  const baseColumns = parentNode.props.columns || 12;
  const responsiveColumns = parentNode.responsiveColumns;
  
  let css = '';
  
  // Calculate proportional spans for each breakpoint
  const smallCols = responsiveColumns.small ?? DEFAULT_RESPONSIVE_COLUMNS.small;
  const smallSpan = calculateProportionalSpan(childSpan, baseColumns, smallCols);
  css += `.${className} {\n`;
  css += `  grid-column: span ${smallSpan};\n`;
  css += `}\n\n`;
  
  const mediumCols = responsiveColumns.medium ?? DEFAULT_RESPONSIVE_COLUMNS.medium;
  const mediumSpan = calculateProportionalSpan(childSpan, baseColumns, mediumCols);
  css += `@media (min-width: 782px) {\n`;
  css += `  .${className} {\n`;
  css += `    grid-column: span ${mediumSpan};\n`;
  css += `  }\n`;
  css += `}\n\n`;
  
  const largeCols = responsiveColumns.large ?? DEFAULT_RESPONSIVE_COLUMNS.large;
  const largeSpan = calculateProportionalSpan(childSpan, baseColumns, largeCols);
  css += `@media (min-width: 1080px) {\n`;
  css += `  .${className} {\n`;
  css += `    grid-column: span ${largeSpan};\n`;
  css += `  }\n`;
  css += `}\n\n`;
  
  const xlargeCols = responsiveColumns.xlarge ?? DEFAULT_RESPONSIVE_COLUMNS.xlarge;
  const xlargeSpan = calculateProportionalSpan(childSpan, baseColumns, xlargeCols);
  css += `@media (min-width: 1280px) {\n`;
  css += `  .${className} {\n`;
  css += `    grid-column: span ${xlargeSpan};\n`;
  css += `  }\n`;
  css += `}\n\n`;
  
  return css;
}
```

## Data Models

### ResponsiveColumns Interface

```typescript
interface ResponsiveColumns {
  small?: number;    // < 782px (default: 2)
  medium?: number;   // >= 782px (default: 4)
  large?: number;    // >= 1080px (default: 8)
  xlarge?: number;   // >= 1280px (default: 12)
}
```

Stored in `ComponentNode.responsiveColumns` for Grid components only.

### ViewportSize Type

```typescript
type ViewportSize = 'small' | 'medium' | 'large' | 'xlarge';
```

Detected by `useResponsiveViewport` hook using WordPress `useViewportMatch`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Viewport Detection Accuracy

*For any* window width, the viewport detection should return the correct viewport size according to WordPress breakpoints: small (<782px), medium (782-1080px), large (1080-1280px), or xlarge (≥1280px).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 2: Grid Column Resolution

*For any* Grid component with responsive columns configuration and any viewport size, the column resolution function should return the configured column count for that breakpoint, or the default value if not configured (small: 2, medium: 4, large: 8, xlarge: 12).

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7**

### Property 3: Proportional Span Calculation

*For any* child span, original grid column count, and new grid column count, the proportional span calculation should maintain the same proportion (within rounding) and return a minimum of 1 column.

**Validates: Requirements 4.1, 4.5**

### Property 4: Window Resize Reactivity

*For any* sequence of window resize events, the viewport detection should update to reflect the current window width according to WordPress breakpoints.

**Validates: Requirements 5.2**

### Property 5: Media Query Generation for Grids

*For any* Grid component with responsive columns configuration, the code generator should produce CSS media queries that set grid-template-columns to the configured column counts at WordPress standard breakpoints (782px, 1080px, 1280px).

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 6: Media Query Generation for Children

*For any* Grid child component, the code generator should produce CSS media queries that set grid-column spans proportionally based on the parent Grid's responsive column configuration.

**Validates: Requirements 6.4**

### Property 7: Mobile-First Media Queries

*For any* generated CSS with responsive behavior, all media queries should use min-width (mobile-first approach) rather than max-width.

**Validates: Requirements 6.5**

## Error Handling

### Invalid Column Counts

- **Validation**: Column counts must be positive integers (minimum 1)
- **Handling**: If invalid value provided, fall back to default for that breakpoint
- **User Feedback**: Show validation error in Properties Panel

### Missing Responsive Columns

- **Handling**: If `responsiveColumns` is undefined, use default values (2, 4, 8, 12)
- **User Feedback**: Display "(default)" label next to unset breakpoint values

### Proportional Span Rounding Edge Cases

- **Scenario**: Child spans 1 of 12 columns, grid reduces to 2 columns
- **Calculation**: 1/12 * 2 = 0.167 → rounds to 0
- **Handling**: Apply minimum of 1 column
- **Result**: Child spans 1 of 2 columns (50% instead of 8.3%)

### Browser Compatibility

- **WordPress Compose**: Requires modern browser with ResizeObserver support
- **Fallback**: If `useViewportMatch` fails, default to xlarge viewport
- **Testing**: Verify behavior in Chrome, Firefox, Safari, Edge

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

1. **Viewport Detection Examples**
   - Test specific window widths map to correct viewport sizes
   - Test boundary values (781px → small, 782px → medium)
   - Test edge cases (0px, very large widths)

2. **Column Resolution Examples**
   - Test default values when responsiveColumns is undefined
   - Test custom values override defaults
   - Test partial configuration (only some breakpoints set)

3. **Proportional Span Examples**
   - Test 6/12 → 4/8 (50% preserved)
   - Test 6/12 → 2/4 (50% preserved)
   - Test 6/12 → 1/2 (50% preserved)
   - Test 1/12 → 1/2 (minimum 1 enforced)
   - Test 3/12 → 1/4 (25% preserved with rounding)

4. **Code Generation Examples**
   - Test media query structure
   - Test breakpoint pixel values
   - Test min-width vs max-width
   - Test CSS syntax correctness

### Property-Based Tests

Property tests verify universal properties across all inputs (minimum 100 iterations each):

1. **Property 1: Viewport Detection Accuracy**
   - Generate random window widths (0-3000px)
   - Verify correct viewport size returned
   - **Feature: responsive-grid-controls, Property 1: Viewport Detection Accuracy**

2. **Property 2: Grid Column Resolution**
   - Generate random responsive columns configurations
   - Generate random viewport sizes
   - Verify correct column count returned (configured or default)
   - **Feature: responsive-grid-controls, Property 2: Grid Column Resolution**

3. **Property 3: Proportional Span Calculation**
   - Generate random child spans (1-24)
   - Generate random original column counts (1-24)
   - Generate random new column counts (1-24)
   - Verify proportion maintained (within rounding tolerance)
   - Verify minimum 1 column enforced
   - **Feature: responsive-grid-controls, Property 3: Proportional Span Calculation**

4. **Property 4: Window Resize Reactivity**
   - Generate random sequences of window widths
   - Verify viewport detection updates correctly for each width
   - **Feature: responsive-grid-controls, Property 4: Window Resize Reactivity**

5. **Property 5: Media Query Generation for Grids**
   - Generate random responsive columns configurations
   - Verify media queries generated with correct breakpoints
   - Verify grid-template-columns values match configuration
   - **Feature: responsive-grid-controls, Property 5: Media Query Generation for Grids**

6. **Property 6: Media Query Generation for Children**
   - Generate random child spans and parent responsive columns
   - Verify child media queries generated with proportional spans
   - **Feature: responsive-grid-controls, Property 6: Media Query Generation for Children**

7. **Property 7: Mobile-First Media Queries**
   - Generate random responsive configurations
   - Verify all media queries use min-width
   - Verify no max-width media queries present
   - **Feature: responsive-grid-controls, Property 7: Mobile-First Media Queries**

### Property Testing Library

Use **fast-check** for property-based testing in TypeScript:

```bash
npm install --save-dev fast-check @types/fast-check
```

Example property test structure:

```typescript
import fc from 'fast-check';
import { calculateProportionalSpan } from '@/utils/responsiveHelpers';

describe('Property 3: Proportional Span Calculation', () => {
  it('maintains proportion and enforces minimum 1 column', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 24 }), // childSpan
        fc.integer({ min: 1, max: 24 }), // originalColumns
        fc.integer({ min: 1, max: 24 }), // newColumns
        (childSpan, originalColumns, newColumns) => {
          const result = calculateProportionalSpan(childSpan, originalColumns, newColumns);
          
          // Property 1: Result is at least 1
          expect(result).toBeGreaterThanOrEqual(1);
          
          // Property 2: Proportion is maintained (within rounding tolerance)
          const expectedProportion = childSpan / originalColumns;
          const actualProportion = result / newColumns;
          const tolerance = 0.5 / newColumns; // Half a column tolerance
          expect(Math.abs(actualProportion - expectedProportion)).toBeLessThanOrEqual(tolerance);
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    );
  });
});
```

### Integration Tests

Integration tests verify end-to-end behavior:

1. **Canvas Responsive Behavior**
   - Render Grid with responsive columns
   - Simulate window resize
   - Verify Grid and children update correctly

2. **Properties Panel Integration**
   - Render Properties Panel for Grid
   - Update responsive column values
   - Verify Grid updates in Canvas

3. **Code Export Integration**
   - Create Grid with responsive columns and children
   - Export code
   - Verify generated CSS is valid and complete

## Agent Integration

### Markup Parser Updates

**Location**: `src/utils/markupParser.ts`

The markup parser already validates grid props. Add validation for `responsiveColumns`:

```typescript
// Add to validateDesignTokens function:
if ('responsiveColumns' in props && typeof props.responsiveColumns === 'object') {
  const rc = props.responsiveColumns;
  ['small', 'medium', 'large', 'xlarge'].forEach((breakpoint) => {
    if (breakpoint in rc) {
      const value = rc[breakpoint];
      if (typeof value !== 'number' || value < 1 || !Number.isInteger(value)) {
        throw createError(
          state,
          `Invalid responsiveColumns.${breakpoint} value: ${value}. Must be a positive integer`
        );
      }
    }
  });
}
```

### Agent Tool Compatibility

The agent's `component_update` tool works with ComponentNode props directly. Since `responsiveColumns` is stored in `node.responsiveColumns` (top-level property, not in props), the agent can update it like any other node property:

```typescript
// Agent can update responsive columns:
component_update({
  componentId: "grid-123",
  props: {
    responsiveColumns: {
      small: 2,
      medium: 4,
      large: 8,
      xlarge: 12
    }
  }
})
```

No changes needed to agent tools - they work with the ComponentNode structure automatically.

## Notes

- **WordPress Dependency**: This feature requires `@wordpress/compose` package
- **Browser Support**: Requires modern browsers with ResizeObserver API
- **Performance**: Viewport detection uses React hooks, minimal performance impact
- **Backward Compatibility**: Existing Grids without `responsiveColumns` will use defaults
- **Agent Compatibility**: Agent tools work automatically with `responsiveColumns` property
- **Future Enhancement**: Could add viewport preview controls to manually test different sizes
