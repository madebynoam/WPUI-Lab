# Requirements Document

## Introduction

This feature adds viewport preview controls to the Canvas, allowing designers to preview their designs at different screen sizes (mobile, tablet, desktop) with zoom functionality for better visibility. This complements the responsive grid system by providing visual tooling to test responsive behavior.

## Glossary

- **Canvas**: The visual editor where users design their layouts
- **Viewport_Preview**: A mode where the canvas is constrained to a specific width to simulate different devices
- **Viewport_Preset**: Predefined screen widths (Mobile: 375px, Tablet: 768px, Desktop: 1440px)
- **Zoom_Level**: Canvas scale factor for better visibility (50%, 75%, 100%, 150%, 200%)
- **Canvas_Frame**: Visual container that shows the viewport boundaries
- **Viewport_Controls**: UI controls for selecting viewport size and zoom level

## Requirements

### Requirement 1: Viewport Size Presets

**User Story:** As a designer, I want to preview my design at common device sizes, so that I can see how it looks on mobile, tablet, and desktop.

#### Acceptance Criteria

1. THE System SHALL provide viewport size presets: Mobile (375px), Tablet (768px), Desktop (1440px), and Full Width
2. THE Canvas SHALL display viewport preset buttons in the canvas controls area
3. WHEN a user selects a viewport preset, THE Canvas SHALL constrain the design width to that preset
4. WHEN "Full Width" is selected, THE Canvas SHALL use the full available width (current behavior)
5. THE System SHALL persist the selected viewport preset in the editor session
6. THE Canvas SHALL center the constrained viewport horizontally in the available space

### Requirement 2: Zoom Controls

**User Story:** As a designer, I want to zoom in and out of the canvas, so that I can see details or get an overview of my design.

#### Acceptance Criteria

1. THE System SHALL provide zoom level presets: 50%, 75%, 100%, 150%, 200%
2. THE Canvas SHALL display zoom controls (buttons or slider) in the canvas controls area
3. WHEN a user selects a zoom level, THE Canvas SHALL scale the entire design by that factor
4. THE Canvas SHALL maintain the viewport width constraint when zooming
5. THE System SHALL persist the selected zoom level in the editor session
6. THE Canvas SHALL provide smooth scrolling when zoomed content exceeds viewport

### Requirement 3: Visual Viewport Frame

**User Story:** As a designer, I want to see clear boundaries of the viewport, so that I understand what fits on screen at each size.

#### Acceptance Criteria

1. WHEN a viewport preset is active, THE Canvas SHALL display a visual frame around the constrained viewport
2. THE Frame SHALL have a subtle border and shadow to distinguish it from the background
3. THE Frame SHALL display the current viewport width in pixels
4. THE Frame SHALL not be visible when "Full Width" is selected
5. THE Canvas background outside the frame SHALL be visually distinct (darker or different color)

### Requirement 4: Keyboard Shortcuts

**User Story:** As a designer, I want keyboard shortcuts for viewport and zoom controls, so that I can quickly switch between sizes.

#### Acceptance Criteria

1. THE System SHALL provide keyboard shortcut Cmd+1 for Mobile viewport
2. THE System SHALL provide keyboard shortcut Cmd+2 for Tablet viewport
3. THE System SHALL provide keyboard shortcut Cmd+3 for Desktop viewport
4. THE System SHALL provide keyboard shortcut Cmd+0 for Full Width viewport
5. THE System SHALL provide keyboard shortcut Cmd+Plus for zoom in
6. THE System SHALL provide keyboard shortcut Cmd+Minus for zoom out
7. THE System SHALL provide keyboard shortcut Cmd+Shift+0 for reset zoom to 100%

### Requirement 5: Responsive Grid Integration

**User Story:** As a designer, I want viewport preview to work with responsive grids, so that I can see how grids adapt at different sizes.

#### Acceptance Criteria

1. WHEN a viewport preset is active, THE System SHALL trigger responsive grid behavior based on the viewport width
2. THE System SHALL use the viewport preset width (not browser window width) for responsive calculations
3. WHEN viewport is Mobile (375px), THE System SHALL apply small breakpoint styles
4. WHEN viewport is Tablet (768px), THE System SHALL apply medium breakpoint styles
5. WHEN viewport is Desktop (1440px), THE System SHALL apply xlarge breakpoint styles
6. THE Viewport indicator SHALL display the active breakpoint name

### Requirement 6: Zoom Interaction Behavior

**User Story:** As a designer, I want interactions to work correctly when zoomed, so that I can test my design at any zoom level.

#### Acceptance Criteria

1. WHEN zoomed, THE System SHALL scale mouse/pointer coordinates correctly for component selection
2. WHEN zoomed, THE System SHALL scale drag-and-drop interactions correctly
3. WHEN zoomed, THE System SHALL scale resize handles correctly
4. WHEN zoomed, THE System SHALL maintain accurate hit detection for all interactive elements
5. THE System SHALL not apply zoom in Play Mode (always 100%)

### Requirement 7: Viewport Controls UI

**User Story:** As a designer, I want intuitive viewport controls, so that I can easily switch between sizes and zoom levels.

#### Acceptance Criteria

1. THE Canvas SHALL display viewport controls in a toolbar at the top or bottom of the canvas
2. THE Viewport controls SHALL include preset buttons with device icons (mobile, tablet, desktop)
3. THE Zoom controls SHALL include zoom percentage display and +/- buttons
4. THE Active viewport preset SHALL be visually highlighted
5. THE Active zoom level SHALL be displayed as a percentage
6. THE Controls SHALL be accessible and not overlap with the design content

### Requirement 8: Viewport State Persistence

**User Story:** As a designer, I want my viewport and zoom settings to persist, so that I don't have to reconfigure them every time.

#### Acceptance Criteria

1. THE System SHALL store viewport preset in browser sessionStorage
2. THE System SHALL store zoom level in browser sessionStorage
3. WHEN the editor reloads, THE System SHALL restore the previous viewport preset
4. WHEN the editor reloads, THE System SHALL restore the previous zoom level
5. WHEN switching pages, THE System SHALL maintain viewport and zoom settings

### Requirement 9: Responsive Behavior Indicator

**User Story:** As a designer, I want to see which responsive breakpoint is active, so that I understand what styles are being applied.

#### Acceptance Criteria

1. THE Viewport controls SHALL display the active breakpoint name (Small, Medium, Large, XLarge)
2. THE Breakpoint indicator SHALL update when viewport preset changes
3. THE Breakpoint indicator SHALL show "N/A" when Full Width is selected
4. THE Breakpoint indicator SHALL use WordPress breakpoint names for consistency
5. THE Indicator SHALL be visually distinct and easy to read

### Requirement 10: Zoom Quality and Performance

**User Story:** As a designer, I want smooth zoom with good visual quality, so that I can work efficiently at any zoom level.

#### Acceptance Criteria

1. THE System SHALL use CSS transform scale for zoom (not changing actual dimensions)
2. THE System SHALL maintain crisp text rendering at all zoom levels
3. THE System SHALL maintain smooth scrolling performance when zoomed
4. THE System SHALL not cause layout recalculations when zooming
5. THE System SHALL apply zoom transform to the entire canvas content container
