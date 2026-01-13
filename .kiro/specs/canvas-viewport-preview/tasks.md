# Implementation Tasks: Canvas Viewport Preview Controls

## Task 1: Add Viewport State to Context

**Requirements**: 1.5, 8.1, 8.2, 8.3, 8.4, 8.5

**Description**: Add viewport preset and zoom level state to ComponentTreeContext with sessionStorage persistence.

**Files to Modify**:
- `src/contexts/ComponentTreeContext.tsx`

**Subtasks**:

### 1.1: Add State Types
- Add `viewportPreset` type: `'mobile' | 'tablet' | 'desktop' | 'full'`
- Add `zoomLevel` type: `number` (0.5, 0.75, 1.0, 1.5, 2.0)
- Add to `ComponentTreeState` interface
- Add `setViewportPreset` and `setZoomLevel` to actions interface

### 1.2: Add Reducer Cases
- Add `SET_VIEWPORT_PRESET` case to reducer
- Add `SET_ZOOM_LEVEL` case to reducer
- Initialize state with defaults: `viewportPreset: 'full'`, `zoomLevel: 1.0`

### 1.3: Add SessionStorage Persistence
- Load viewport preset from sessionStorage on mount (key: `viewport-preset-${projectId}`)
- Load zoom level from sessionStorage on mount (key: `zoom-level-${projectId}`)
- Save viewport preset to sessionStorage on change
- Save zoom level to sessionStorage on change
- Handle invalid values with fallback to defaults

### 1.4: Export State and Actions
- Export `viewportPreset` and `zoomLevel` from context
- Export `setViewportPreset` and `setZoomLevel` actions
- Update context provider value

---

## Task 2: Update Responsive Viewport Hook

**Requirements**: 5.1, 5.2, 5.3, 5.4, 5.5

**Description**: Update `useResponsiveViewport` hook to support viewport preview override.

**Files to Modify**:
- `src/hooks/useResponsiveViewport.ts`

**Subtasks**:

### 2.1: Add Viewport Width Constants
- Define `VIEWPORT_WIDTHS` constant: `{ mobile: 375, tablet: 768, desktop: 1440, full: 0 }`
- Export constant for use in other components

### 2.2: Add Viewport Preview Logic
- Import `viewportPreset` from ComponentTreeContext
- Check if viewport preset is active (width > 0)
- If active, use preset width for breakpoint detection instead of `useViewportMatch`
- If full width (width = 0), use existing `useViewportMatch` logic

### 2.3: Add Manual Breakpoint Detection
- Implement breakpoint detection based on preset width:
  - `width >= 1280` → xlarge
  - `width >= 1080` → large
  - `width >= 782` → medium
  - `width < 782` → small

### 2.4: Add Actual Width to Return Value
- Add `actualWidth` property to `ResponsiveViewport` interface
- Return preset width when viewport preview active
- Return `window.innerWidth` when full width mode

---

## Task 3: Create Viewport Preset Buttons Component

**Requirements**: 1.1, 1.2, 1.3, 1.4, 7.2, 7.4

**Description**: Create compact preset buttons that integrate into the existing bottom bar next to ViewportIndicator.

**Files to Create**:
- `src/components/ViewportPresetButtons.tsx`

**Subtasks**:

### 3.1: Create Component Structure
- Create functional component `ViewportPresetButtons`
- Import context: `useComponentTree`
- Get state: `viewportPreset`, `isPlayMode`
- Get actions: `setViewportPreset`
- Return null if `isPlayMode` is true

### 3.2: Add Preset Buttons
- Create array of presets: Mobile (📱), Tablet (📱), Desktop (🖥️), Full (↔️)
- Map over presets to create buttons
- Use emoji icons only (no text labels for compact design)
- Highlight active preset with light gray background (#f0f0f0)
- Add hover effect (lighter gray #f8f8f8)
- Add tooltips with full labels and keyboard shortcuts

### 3.3: Style for Bottom Bar Integration
- Use flexbox layout with minimal gap (2px)
- Add left border separator (1px solid #ddd)
- Add left margin and padding (12px)
- Match existing bottom bar height (25px)
- Use small padding (2px 6px) for compact buttons
- Match existing bottom bar font size (13-14px for emojis)

---

## Task 4: Create Zoom Slider Component

**Requirements**: 2.1, 2.2, 2.3, 2.4, 7.3, 7.5

**Description**: Create compact zoom slider with percentage display that integrates into the bottom bar.

**Files to Create**:
- `src/components/ZoomSlider.tsx`

**Subtasks**:

### 4.1: Create Component Structure
- Create functional component `ZoomSlider`
- Import context: `useComponentTree`
- Get state: `zoomLevel`, `isPlayMode`
- Get actions: `setZoomLevel`
- Return null if `isPlayMode` is true
- Define `ZOOM_LEVELS` constant: `[0.5, 0.75, 1.0, 1.5, 2.0]`

### 4.2: Add Zoom Slider
- Create range input with 5 steps (one per zoom level)
- Map zoom level to slider index (0-4)
- Handle slider change to update zoom level
- Set width to 80px for compact design
- Add tooltip with keyboard shortcuts

### 4.3: Add Percentage Display Button
- Create button showing current zoom percentage (e.g., "100%")
- Make button clickable to reset zoom to 100%
- Use minimal width (42px) for compact design
- Match existing bottom bar button styling
- Add tooltip: "Reset Zoom - Cmd+Shift+0"

### 4.4: Style for Bottom Bar Integration
- Use flexbox layout with small gap (6px)
- Add left border separator (1px solid #ddd)
- Add left margin and padding (12px)
- Add "Zoom:" label in small gray text (11px, #757575)
- Match existing bottom bar height (25px)
- Use consistent styling with other bottom bar elements

---

## Task 5: Create Viewport Frame Component

**Requirements**: 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 10.1, 10.2, 10.5

**Description**: Create wrapper component that constrains canvas width and applies zoom transform.

**Files to Create**:
- `src/components/ViewportFrame.tsx`

**Subtasks**:

### 5.1: Create Component Structure
- Create functional component `ViewportFrame` with `children` prop
- Import context: `useComponentTree`
- Get state: `viewportPreset`, `zoomLevel`, `isPlayMode`
- Import `VIEWPORT_WIDTHS` constant
- Create ref for frame element

### 5.2: Add Full Width Mode
- Check if `presetWidth === 0` (full width mode)
- If full width, render children without frame
- Apply zoom transform if zoom !== 1.0
- Use `transformOrigin: 'top center'`

### 5.3: Add Constrained Viewport Mode
- If preset width > 0, render frame container
- Center frame horizontally with flexbox
- Set frame width to preset width
- Add white background
- Add box shadow for depth
- Add border radius (4px)

### 5.4: Add Viewport Width Label
- Position label above frame (absolute positioning)
- Display preset width in pixels (e.g., "375px")
- Style: 11px font, gray color (#757575), medium weight

### 5.5: Add Zoom Transform
- Apply `transform: scale(${zoomLevel})` to frame
- Use `transformOrigin: 'top center'`
- Only apply if zoom !== 1.0

### 5.6: Store Frame Ref in Window
- Store frame ref in `window.__viewportFrameRef` for coordinate scaling
- Store zoom level in `window.__viewportZoomLevel`
- Update on zoom level change

---

## Task 6: Integrate Controls into Canvas Bottom Bar

**Requirements**: 7.1, 7.6

**Description**: Add ViewportPresetButtons and ZoomSlider to existing bottom bar alongside Breadcrumb and ViewportIndicator.

**Files to Modify**:
- `src/components/Canvas.tsx`

**Subtasks**:

### 6.1: Import Components
- Import `ViewportPresetButtons` component
- Import `ZoomSlider` component
- Import `ViewportFrame` component

### 6.2: Wrap Canvas Content with ViewportFrame
- Wrap existing canvas content div with `<ViewportFrame>`
- Move all canvas rendering logic inside ViewportFrame
- Ensure bottom bar stays outside frame (not zoomed)

### 6.3: Add Controls to Bottom Bar
- Add `<ViewportPresetButtons />` to existing bottom bar container
- Add `<ZoomSlider />` to existing bottom bar container
- Place after `<ViewportIndicator />`
- Maintain existing flexbox layout with gap
- Ensure controls flow naturally with breadcrumb and indicator

### 6.4: Verify Layout
- Ensure bottom bar maintains 25px height
- Ensure all elements align vertically
- Ensure separators (borders) between sections
- Ensure responsive wrapping if needed

---

## Task 7: Add Keyboard Shortcuts

**Requirements**: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

**Description**: Add keyboard shortcuts for viewport presets and zoom controls.

**Files to Modify**:
- `src/components/KeyboardHandler.tsx`

**Subtasks**:

### 7.1: Import Context Actions
- Import `setViewportPreset` and `setZoomLevel` from context
- Import `viewportPreset` and `zoomLevel` state

### 7.2: Add Viewport Preset Shortcuts
- Add Cmd+1 → Mobile viewport
- Add Cmd+2 → Tablet viewport
- Add Cmd+3 → Desktop viewport
- Add Cmd+0 (without Shift) → Full Width viewport
- Prevent default browser behavior for all shortcuts

### 7.3: Add Zoom Shortcuts
- Define `ZOOM_LEVELS` constant: `[0.5, 0.75, 1.0, 1.5, 2.0]`
- Add Cmd+Plus (or Cmd+=) → Zoom in (next level)
- Add Cmd+Minus (or Cmd+_) → Zoom out (previous level)
- Add Cmd+Shift+0 → Reset zoom to 100%
- Prevent default browser behavior for all shortcuts
- Handle zoom level boundaries (don't exceed min/max)

---

## Task 8: Add Coordinate Scaling for Interactions

**Requirements**: 6.1, 6.2, 6.3, 6.4

**Description**: Scale mouse coordinates inversely to zoom level for accurate hit detection.

**Files to Modify**:
- `src/components/RenderNode.tsx`

**Subtasks**:

### 8.1: Create Coordinate Scaling Helper
- Add `scaleMouseCoordinates` function at top of file
- Get frame ref from `window.__viewportFrameRef`
- Get zoom level from `window.__viewportZoomLevel`
- If no frame or zoom = 1.0, return original coordinates
- Calculate position relative to frame
- Scale coordinates inversely: `scaledX = relativeX / zoomLevel`
- Convert back to screen coordinates

### 8.2: Update Mouse Event Handlers
- Update `handleMouseDown` to use scaled coordinates
- Update `handleMouseMove` to use scaled coordinates
- Update `handleMouseUp` to use scaled coordinates
- Replace all `e.clientX` and `e.clientY` with scaled values

### 8.3: Update Drag Detection
- Scale drag start position
- Scale drag threshold calculation
- Scale ghost position updates

### 8.4: Update Drop Position Detection
- Scale coordinates for hover detection
- Scale coordinates for drop position calculation
- Ensure drag-and-drop works correctly at all zoom levels

---

## Task 9: Update Viewport Indicator

**Requirements**: 9.1, 9.2, 9.3, 9.4, 9.5

**Description**: Update ViewportIndicator to show active breakpoint based on viewport preview.

**Files to Modify**:
- `src/components/ViewportIndicator.tsx`

**Subtasks**:

### 9.1: Import Viewport State
- Import `viewportPreset` from ComponentTreeContext
- Import `useResponsiveViewport` hook

### 9.2: Update Breakpoint Display
- Get current viewport size from hook
- Display breakpoint name: Small, Medium, Large, XLarge
- Show "N/A" when full width mode is active
- Update display when viewport preset changes

### 9.3: Add Viewport Width Display
- Show actual width being used for calculations
- Format: "Small (375px)" or "XLarge (1440px)"
- Show "Full Width" when preset is 'full'

---

## Task 10: Handle Play Mode Behavior

**Requirements**: 6.5

**Description**: Ensure viewport preview and zoom are disabled in play mode.

**Files to Modify**:
- `src/components/ViewportPresetButtons.tsx`
- `src/components/ZoomSlider.tsx`
- `src/components/ViewportFrame.tsx`

**Subtasks**:

### 10.1: Hide Controls in Play Mode
- Check `isPlayMode` in ViewportPresetButtons
- Return null if play mode is active
- Check `isPlayMode` in ZoomSlider
- Return null if play mode is active

### 10.2: Force Full Width in Play Mode
- Check `isPlayMode` in ViewportFrame
- Override viewport preset to 'full' if play mode
- Override zoom level to 1.0 if play mode
- Ensure play mode always shows full-size design

---

## Task 11: Add Tests

**Requirements**: All (validation)

**Description**: Add unit and integration tests for viewport preview functionality.

**Files to Create**:
- `src/components/ViewportPresetButtons.test.tsx`
- `src/components/ZoomSlider.test.tsx`
- `src/components/ViewportFrame.test.tsx`
- `src/hooks/useResponsiveViewport.test.ts`
- `src/utils/coordinateScaling.test.ts`

**Subtasks**:

### 11.1: Test Viewport Preset Buttons
- Test preset button clicks
- Test active preset highlighting
- Test hover effects
- Test play mode hiding
- Test tooltips

### 11.2: Test Zoom Slider
- Test slider drag to change zoom
- Test percentage button click to reset
- Test zoom boundaries (50%-200%)
- Test play mode hiding
- Test tooltips

### 11.3: Test Viewport Frame
- Test full width mode rendering
- Test constrained viewport mode rendering
- Test width constraint applied correctly
- Test zoom transform applied correctly
- Test viewport width label display
- Test frame ref stored in window

### 11.4: Test Responsive Viewport Hook
- Test viewport preview override
- Test breakpoint detection with preset widths
- Test full width mode uses window width
- Test actual width returned correctly

### 11.5: Test Coordinate Scaling
- Test scaling at different zoom levels (50%, 75%, 100%, 150%, 200%)
- Test fallback when frame ref unavailable
- Test coordinate accuracy at viewport boundaries

### 11.6: Test SessionStorage Persistence
- Test viewport preset save/restore
- Test zoom level save/restore
- Test per-project isolation
- Test invalid value handling

### 11.7: Test Keyboard Shortcuts
- Test Cmd+1/2/3/0 for viewport presets
- Test Cmd+Plus/Minus for zoom
- Test Cmd+Shift+0 for zoom reset
- Test shortcuts prevented in play mode

---

## Task 12*: Add Viewport Rotation (Optional)

**Requirements**: None (future enhancement)

**Description**: Add portrait/landscape rotation for mobile and tablet viewports.

**Files to Modify**:
- `src/components/ViewportPresetButtons.tsx`
- `src/components/ViewportFrame.tsx`
- `src/contexts/ComponentTreeContext.tsx`

**Subtasks**:

### 12.1: Add Rotation State
- Add `viewportRotation` state: `'portrait' | 'landscape'`
- Add to context and reducer
- Persist in sessionStorage

### 12.2: Add Rotation Button
- Add rotation button to ViewportPresetButtons (🔄 icon)
- Toggle between portrait and landscape
- Only show for mobile and tablet presets

### 12.3: Apply Rotation Transform
- Swap width/height when landscape mode
- Apply CSS transform: `rotate(90deg)`
- Adjust transform origin for proper rotation

---

## Task 13*: Add Custom Viewport Width Input (Optional)

**Requirements**: None (future enhancement)

**Description**: Allow designers to enter custom viewport width for testing specific sizes.

**Files to Modify**:
- `src/components/ViewportPresetButtons.tsx`
- `src/contexts/ComponentTreeContext.tsx`

**Subtasks**:

### 13.1: Add Custom Width State
- Add `customViewportWidth` state: `number | null`
- Add to context and reducer
- Persist in sessionStorage

### 13.2: Add Custom Width Input
- Add text input to ViewportPresetButtons
- Validate input (positive integer, 200-3000px range)
- Add "Custom" preset button
- Show input when custom preset active

### 13.3: Apply Custom Width
- Update `useResponsiveViewport` to support custom width
- Use custom width for breakpoint detection
- Display custom width in viewport indicator

---

## Implementation Order

1. **Task 1**: Add viewport state to context (foundation)
2. **Task 2**: Update responsive viewport hook (core logic)
3. **Task 3**: Create viewport preset buttons (UI)
4. **Task 4**: Create zoom slider (UI)
5. **Task 5**: Create viewport frame component (UI)
6. **Task 6**: Integrate into Canvas bottom bar (integration)
7. **Task 9**: Update viewport indicator (visual feedback)
8. **Task 7**: Add keyboard shortcuts (UX enhancement)
9. **Task 8**: Add coordinate scaling (interaction fix)
10. **Task 10**: Handle play mode behavior (edge case)
11. **Task 11**: Add tests (validation)
12. **Task 12***: Add viewport rotation (optional)
13. **Task 13***: Add custom viewport width (optional)

## Testing Checklist

- [ ] Viewport preset buttons work correctly
- [ ] Zoom in/out buttons work correctly
- [ ] Zoom reset button works correctly
- [ ] Keyboard shortcuts work correctly
- [ ] Viewport width constraint applied correctly
- [ ] Zoom transform applied correctly
- [ ] Responsive grids react to viewport preview
- [ ] Mouse interactions work at all zoom levels
- [ ] Drag-and-drop works at all zoom levels
- [ ] Component selection works at all zoom levels
- [ ] Viewport indicator shows correct breakpoint
- [ ] SessionStorage persistence works
- [ ] Play mode disables viewport preview and zoom
- [ ] Full width mode uses actual window width
- [ ] Constrained viewport shows frame and label

## Notes

- Tasks marked with `*` are optional enhancements for faster MVP
- Coordinate scaling is critical for zoom functionality - test thoroughly
- SessionStorage provides per-project isolation automatically
- Play mode behavior ensures interactions work correctly in preview
- Viewport preview integrates seamlessly with responsive grid system
