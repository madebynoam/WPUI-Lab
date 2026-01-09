# Requirements Document

## Introduction

This feature adds automatic responsive grid behavior to WP-Designer, matching the WordPress Calypso dashboard approach. The system uses `useViewportMatch` from `@wordpress/compose` to detect viewport sizes and automatically adjusts grid column counts based on the viewport, exactly as implemented in the Calypso dashboard.

## Glossary

- **Grid_System**: The existing 12-column grid layout mechanism
- **useViewportMatch**: WordPress hook from `@wordpress/compose` that detects viewport breakpoints
- **Viewport_Size**: Screen width category detected by useViewportMatch (small, medium, large, xlarge)
- **Grid_Columns**: The number of columns in a Grid container (e.g., 12, 8, 4, 2, 1)
- **Canvas**: The visual editor where users design layouts
- **Grid_Container**: A Grid component that contains child components

## Requirements

### Requirement 1: Install WordPress Compose Package

**User Story:** As a developer, I want to use WordPress standard viewport detection, so that the system behaves like WordPress Calypso.

#### Acceptance Criteria

1. THE System SHALL install the `@wordpress/compose` package as a dependency
2. THE System SHALL import and use the `useViewportMatch` hook from `@wordpress/compose`
3. THE System SHALL use the same breakpoint names as WordPress: 'small', 'medium', 'large', 'xlarge'

### Requirement 2: Detect Viewport Size

**User Story:** As a designer, I want the system to automatically detect screen size, so that layouts adapt without manual configuration.

#### Acceptance Criteria

1. THE Canvas SHALL use `useViewportMatch` to detect if viewport is xlarge (≥1280px)
2. THE Canvas SHALL use `useViewportMatch` to detect if viewport is large (≥1080px and <1280px)
3. THE Canvas SHALL use `useViewportMatch` to detect if viewport is medium (≥782px and <1080px)
4. THE Canvas SHALL use `useViewportMatch` to detect if viewport is small (<782px)
5. THE System SHALL determine the current viewport size on every render

### Requirement 3: Automatic Grid Column Adjustment

**User Story:** As a designer, I want Grid containers to automatically reduce columns on smaller screens, so that layouts remain usable like the Calypso dashboard.

#### Acceptance Criteria

1. WHEN viewport is xlarge, THE Grid SHALL use the designer-specified column count (default: 12)
2. WHEN viewport is large, THE Grid SHALL use the designer-specified column count for large breakpoint (default: 8)
3. WHEN viewport is medium, THE Grid SHALL use the designer-specified column count for medium breakpoint (default: 4)
4. WHEN viewport is small, THE Grid SHALL use the designer-specified column count for small breakpoint (default: 2)
5. THE Properties_Panel SHALL provide controls to set column count for each breakpoint
6. THE System SHALL store breakpoint column counts in the Grid node as `responsiveColumns: { small?: number, medium?: number, large?: number, xlarge?: number }`
7. WHEN a breakpoint column count is not set, THE System SHALL use the default values (12, 8, 4, 2)

### Requirement 4: Proportional Child Span Adjustment

**User Story:** As a designer, I want child components to maintain their proportional width when grid columns change, so that layouts scale naturally without per-child configuration.

#### Acceptance Criteria

1. WHEN a Grid's column count changes, THE System SHALL automatically and proportionally adjust each child's gridColumnSpan
2. WHEN a child spans 6 of 12 columns (50%), THE System SHALL adjust it to span 4 of 8 columns on large viewport
3. WHEN a child spans 6 of 12 columns (50%), THE System SHALL adjust it to span 2 of 4 columns on medium viewport
4. WHEN a child spans 6 of 12 columns (50%), THE System SHALL adjust it to span 1 of 2 columns on small viewport
5. THE System SHALL round proportional spans to the nearest integer (minimum 1 column)
6. THE System SHALL apply proportional adjustment automatically to all Grid children without requiring per-child configuration
7. THE System SHALL not provide per-child breakpoint controls (children adapt automatically based on Grid column count)

### Requirement 5: Visual Feedback in Canvas

**User Story:** As a designer, I want to see how my layout looks at different screen sizes, so that I can verify responsive behavior.

#### Acceptance Criteria

1. THE Canvas SHALL display the current viewport size name (small, medium, large, xlarge) in the UI
2. WHEN the browser window resizes, THE Canvas SHALL automatically update the viewport detection
3. THE Grid SHALL visually reflect the adjusted column count in the canvas
4. THE Grid_Child components SHALL visually reflect their adjusted column spans in the canvas

### Requirement 6: Code Generation with Media Queries

**User Story:** As a developer, I want exported code to include responsive CSS, so that layouts work when deployed.

#### Acceptance Criteria

1. WHEN exporting code, THE System SHALL generate CSS media queries for grid-template-columns
2. THE System SHALL use WordPress standard breakpoint values: 782px, 1080px, 1280px
3. THE System SHALL generate media queries that adjust grid-template-columns from 12 to 8 to 4 to 2 columns
4. THE System SHALL generate media queries that proportionally adjust child grid-column spans
5. THE System SHALL use mobile-first approach with min-width media queries
