# Implementation Plan: Responsive Grid Controls

## Overview

Implement automatic responsive grid behavior using WordPress `useViewportMatch` hook, with designer controls for column counts per breakpoint. Children automatically scale proportionally. Follows WordPress Calypso dashboard patterns.

## Tasks

- [ ] 1. Install WordPress Compose package
  - Add `@wordpress/compose` to package.json dependencies
  - Run `npm install`
  - _Requirements: 1.1_

- [ ] 2. Create viewport detection hook
  - [ ] 2.1 Create `src/hooks/useResponsiveViewport.ts`
    - Import `useViewportMatch` from `@wordpress/compose`
    - Export `ViewportSize` type ('small' | 'medium' | 'large' | 'xlarge')
    - Export `ResponsiveViewport` interface with size and boolean flags
    - Implement hook that calls `useViewportMatch` for each breakpoint
    - Return viewport size and boolean flags (isSmall, isMedium, isLarge, isXLarge)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 2.2 Write property test for viewport detection
    - **Property 1: Viewport Detection Accuracy**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [ ] 3. Add responsive columns type and helpers
  - [ ] 3.1 Update `src/types.ts`
    - Add `ResponsiveColumns` interface with optional breakpoint properties
    - Add `responsiveColumns?: ResponsiveColumns` to ComponentNode interface
    - _Requirements: 3.6_

  - [ ] 3.2 Create `src/utils/responsiveHelpers.ts`
    - Export `DEFAULT_RESPONSIVE_COLUMNS` constant (small: 2, medium: 4, large: 8, xlarge: 12)
    - Implement `getGridColumns` function to resolve column count for viewport
    - Implement `calculateProportionalSpan` function for child span calculation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 3.3 Write property test for grid column resolution
    - **Property 2: Grid Column Resolution**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7**

  - [ ]* 3.4 Write property test for proportional span calculation
    - **Property 3: Proportional Span Calculation**
    - **Validates: Requirements 4.1, 4.5**

  - [ ]* 3.5 Write unit tests for proportional span examples
    - Test 6/12 → 4/8 (50% preserved)
    - Test 6/12 → 2/4 (50% preserved)
    - Test 6/12 → 1/2 (50% preserved)
    - Test 1/12 → 1/2 (minimum 1 enforced)
    - _Requirements: 4.2, 4.3, 4.4_

- [ ] 4. Update Canvas to detect viewport
  - [ ] 4.1 Update `src/components/Canvas.tsx`
    - Import `useResponsiveViewport` hook
    - Call hook to get current viewport
    - Pass viewport to RenderNode via context or props
    - _Requirements: 2.5, 5.2_

  - [ ]* 4.2 Write property test for window resize reactivity
    - **Property 4: Window Resize Reactivity**
    - **Validates: Requirements 5.2**

- [ ] 5. Update RenderNode to apply responsive columns
  - [ ] 5.1 Update `src/components/RenderNode.tsx`
    - Import `useResponsiveViewport`, `getGridColumns`, `calculateProportionalSpan`
    - For Grid components: call `getGridColumns` to get current column count
    - Apply current column count to `grid-template-columns` style
    - For Grid children: call `calculateProportionalSpan` to get adjusted span
    - Apply adjusted span to `grid-column` style
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.3, 5.4_

- [ ] 6. Add responsive columns controls to Properties Panel
  - [ ] 6.1 Update `src/components/PropertiesPanel.tsx`
    - Add "Responsive Columns" section for Grid components
    - Add number inputs for each breakpoint (small, medium, large, xlarge)
    - Display default values when not set
    - Call `updateComponentProps` with `responsiveColumns` object
    - _Requirements: 3.5, 3.6_

- [ ] 7. Add viewport size indicator
  - [ ] 7.1 Create `src/components/ViewportIndicator.tsx`
    - Import `useResponsiveViewport` hook
    - Display current viewport size name and pixel range
    - Style as small badge/pill
    - _Requirements: 5.1, 5.3_

  - [ ] 7.2 Add ViewportIndicator to Canvas or CanvasControls
    - Import and render ViewportIndicator component
    - Position in canvas controls area
    - _Requirements: 5.1_

- [ ] 8. Update code generator for responsive CSS
  - [ ] 8.1 Update `src/utils/codeGenerator.ts`
    - Add `generateResponsiveGridCSS` function for Grid media queries
    - Add `generateResponsiveChildCSS` function for child span media queries
    - Use WordPress breakpoint values (782px, 1080px, 1280px)
    - Use mobile-first approach (min-width)
    - Generate clean CSS with comments
    - Integrate into main code generation flow
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.2 Write property test for media query generation (Grids)
    - **Property 5: Media Query Generation for Grids**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 8.3 Write property test for media query generation (Children)
    - **Property 6: Media Query Generation for Children**
    - **Validates: Requirements 6.4**

  - [ ]* 8.4 Write property test for mobile-first media queries
    - **Property 7: Mobile-First Media Queries**
    - **Validates: Requirements 6.5**

- [ ] 9. Update markup parser for validation
  - [ ] 9.1 Update `src/utils/markupParser.ts`
    - Add validation for `responsiveColumns` in `validateDesignTokens`
    - Validate each breakpoint value is a positive integer
    - Throw descriptive error for invalid values
    - _Requirements: 3.6_

- [ ] 10. Checkpoint - Test responsive behavior
  - Ensure all tests pass
  - Manually test viewport detection in browser
  - Test grid column changes at different viewport sizes
  - Test child span proportional scaling
  - Test Properties Panel controls
  - Test code export with media queries
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow WordPress Calypso code patterns (useViewportMatch, dynamic calculation)
