# Design Document: Canvas Viewport Preview Controls

## Overview

This feature adds viewport preview and zoom controls to the Canvas, allowing designers to preview their designs at specific device widths (Mobile 375px, Tablet 768px, Desktop 1440px) with zoom functionality for better visibility. The viewport preview constrains the canvas width and triggers responsive grid behavior, while zoom scales the entire canvas for easier viewing.

This complements the responsive grid system by providing visual tooling to test responsive behavior at specific breakpoints.

## Architecture

### Component Hierarchy

```
EditorLayout
  └─ Canvas
      ├─ ViewportFrame (new - wrapper that constrains width and applies zoom)
      │   └─ Canvas Content (existing - all rendered components)
      └─ Bottom Bar (existing container)
          ├─ Breadcrumb (existing)
          ├─ ViewportIndicator (existing - shows current breakpoint)
          ├─ ViewportPresetButtons (new - Mobile/Tablet/Desktop/Full buttons)
          └─ ZoomSlider (new - zoom slider with percentage display)
```

### Data Flow

1. **User Action**: User clicks viewport preset button (Mobile/Tablet/Desktop/Full Width)
2. **State Update**: ViewportControls updates viewport state in context
3. **Width Constraint**: ViewportFrame applies width constraint to canvas content
4. **Responsive Trigger**: Constrained width triggers responsive grid calculations
5. **Visual Feedback**: ViewportFrame shows border, ViewportIndicator shows breakpoint
6. **Zoom Application**: Zoom transform scales the entire ViewportFrame content
7. **Interaction Scaling**: Mouse coordinates are scaled for accurate hit detection

### Key Design Decisions

1. **CSS Transform for Zoom**: Use `transform: scale()` instead of changing actual dimensions
   - Preserves layout calculations
   - Better performance (no reflow)
   - Maintains crisp text rendering

2. **Viewport Width Override**: Override browser window width for responsive calculations
   - Use viewport preset width instead of `window.innerWidth`
   - Ensures responsive grids react to preview size, not browser window

3. **SessionStorage Persistence**: Store viewport and zoom settings in sessionStorage
   - Persists across page reloads
   - Resets when browser tab closes
   - Per-project isolation using project ID as key

4. **Zoom Interaction Scaling**: Scale mouse coordinates inversely to zoom level
   - `actualX = (screenX - frameOffsetX) / zoomLevel`
   - Ensures accurate component selection and drag-drop at any zoom

## Components and Interfaces

### 1. Viewport State Management

**Location**: `src/contexts/ComponentTreeContext.tsx` (update existing)

Add viewport preview state to the context:

```typescript
// Add to ComponentTreeState interface:
interface ComponentTreeState {
  // ... existing properties
  viewportPreset: 'mobile' | 'tablet' | 'desktop' | 'full';
  zoomLevel: number; // 0.5, 0.75, 1.0, 1.5, 2.0
}

// Add to context actions:
interface ComponentTreeActions {
  // ... existing actions
  setViewportPreset: (preset: 'mobile' | 'tablet' | 'desktop' | 'full') => void;
  setZoomLevel: (level: number) => void;
}

// Add to reducer:
case 'SET_VIEWPORT_PRESET':
  return { ...state, viewportPreset: action.payload };
case 'SET_ZOOM_LEVEL':
  return { ...state, zoomLevel: action.payload };
```

### 2. Viewport Width Hook

**Location**: `src/hooks/useResponsiveViewport.ts` (update existing)

Update the hook to support viewport preview override:

```typescript
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
const VIEWPORT_WIDTHS = {
  mobile: 375,
  tablet: 768,
  desktop: 1440,
  full: 0, // 0 means use actual window width
};

/**
 * Hook to detect current viewport size
 * Supports viewport preview override for testing responsive behavior
 */
export function useResponsiveViewport(): ResponsiveViewport {
  const { viewportPreset } = useComponentTree();
  
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
    // Full width mode - use actual window width
    const isXLarge = useViewportMatch('xlarge');
    const isLarge = useViewportMatch('large');
    const isMedium = useViewportMatch('medium');
    
    if (isXLarge) {
      size = 'xlarge';
    } else if (isLarge) {
      size = 'large';
    } else if (isMedium) {
      size = 'medium';
    } else {
      size = 'small';
    }
    
    actualWidth = window.innerWidth;
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
```

### 3. Viewport Preset Buttons Component

**Location**: `src/components/ViewportPresetButtons.tsx` (new file)

Compact preset buttons that integrate into the bottom bar:

```typescript
import React from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

export const ViewportPresetButtons: React.FC = () => {
  const { viewportPreset, setViewportPreset, isPlayMode } = useComponentTree();
  
  // Don't show in play mode
  if (isPlayMode) return null;
  
  const presets = [
    { id: 'mobile' as const, label: '📱', title: 'Mobile (375px) - Cmd+1' },
    { id: 'tablet' as const, label: '📱', title: 'Tablet (768px) - Cmd+2' },
    { id: 'desktop' as const, label: '🖥️', title: 'Desktop (1440px) - Cmd+3' },
    { id: 'full' as const, label: '↔️', title: 'Full Width - Cmd+0' },
  ];
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      marginLeft: '12px',
      paddingLeft: '12px',
      borderLeft: '1px solid #ddd',
    }}>
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => setViewportPreset(preset.id)}
          title={preset.title}
          style={{
            padding: '2px 6px',
            fontSize: '14px',
            border: '1px solid transparent',
            borderRadius: '3px',
            backgroundColor: viewportPreset === preset.id ? '#f0f0f0' : 'transparent',
            color: '#1e1e1e',
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
          }}
          onMouseEnter={(e) => {
            if (viewportPreset !== preset.id) {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }
          }}
          onMouseLeave={(e) => {
            if (viewportPreset !== preset.id) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};
```

### 4. Zoom Slider Component

**Location**: `src/components/ZoomSlider.tsx` (new file)

Compact zoom slider with percentage display:

```typescript
import React from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.5, 2.0];

export const ZoomSlider: React.FC = () => {
  const { zoomLevel, setZoomLevel, isPlayMode } = useComponentTree();
  
  // Don't show in play mode
  if (isPlayMode) return null;
  
  const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    setZoomLevel(ZOOM_LEVELS[index]);
  };
  
  const handleZoomReset = () => {
    setZoomLevel(1.0);
  };
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginLeft: '12px',
      paddingLeft: '12px',
      borderLeft: '1px solid #ddd',
    }}>
      <span style={{ fontSize: '11px', color: '#757575' }}>Zoom:</span>
      <input
        type="range"
        min="0"
        max={ZOOM_LEVELS.length - 1}
        step="1"
        value={currentIndex}
        onChange={handleSliderChange}
        title="Zoom Level - Cmd+Plus/Minus"
        style={{
          width: '80px',
          height: '4px',
          cursor: 'pointer',
        }}
      />
      <button
        onClick={handleZoomReset}
        title="Reset Zoom - Cmd+Shift+0"
        style={{
          padding: '2px 6px',
          fontSize: '11px',
          border: '1px solid #ddd',
          borderRadius: '3px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          minWidth: '42px',
          fontWeight: 500,
          color: '#1e1e1e',
        }}
      >
        {Math.round(zoomLevel * 100)}%
      </button>
    </div>
  );
};
```

### 5. Viewport Frame Component

**Location**: `src/components/ViewportFrame.tsx` (new file)

Wrapper that constrains width and applies zoom:

```typescript
import React, { useRef, useEffect } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { useResponsiveViewport } from '@/hooks/useResponsiveViewport';

const VIEWPORT_WIDTHS = {
  mobile: 375,
  tablet: 768,
  desktop: 1440,
  full: 0,
};

interface ViewportFrameProps {
  children: React.ReactNode;
}

export const ViewportFrame: React.FC<ViewportFrameProps> = ({ children }) => {
  const { viewportPreset, zoomLevel, isPlayMode } = useComponentTree();
  const viewport = useResponsiveViewport();
  const frameRef = useRef<HTMLDivElement>(null);
  
  // In play mode, always use full width and 100% zoom
  const effectivePreset = isPlayMode ? 'full' : viewportPreset;
  const effectiveZoom = isPlayMode ? 1.0 : zoomLevel;
  
  const presetWidth = VIEWPORT_WIDTHS[effectivePreset];
  const isConstrained = presetWidth > 0;
  
  // Store frame ref in window for coordinate scaling in RenderNode
  useEffect(() => {
    if (frameRef.current) {
      (window as any).__viewportFrameRef = frameRef.current;
      (window as any).__viewportZoomLevel = effectiveZoom;
    }
  }, [effectiveZoom]);
  
  if (!isConstrained) {
    // Full width mode - no frame, just apply zoom
    return (
      <div
        ref={frameRef}
        style={{
          width: '100%',
          height: '100%',
          transform: effectiveZoom !== 1.0 ? `scale(${effectiveZoom})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    );
  }
  
  // Constrained viewport mode - show frame with border
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '40px 20px',
      overflow: 'auto',
    }}>
      <div
        ref={frameRef}
        style={{
          width: `${presetWidth}px`,
          minHeight: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: '4px',
          position: 'relative',
          transform: effectiveZoom !== 1.0 ? `scale(${effectiveZoom})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {/* Viewport width label */}
        <div style={{
          position: 'absolute',
          top: '-28px',
          left: '0',
          fontSize: '11px',
          color: '#757575',
          fontWeight: 500,
        }}>
          {presetWidth}px
        </div>
        
        {children}
      </div>
    </div>
  );
};
```

### 6. Canvas Updates

**Location**: `src/components/Canvas.tsx` (update existing)

Integrate ViewportPresetButtons and ZoomSlider into existing bottom bar:

```typescript
import { ViewportPresetButtons } from './ViewportPresetButtons';
import { ZoomSlider } from './ZoomSlider';
import { ViewportFrame } from './ViewportFrame';

export const Canvas: React.FC<CanvasProps> = ({ showBreadcrumb = true }) => {
  // ... existing code
  
  return (
    <SelectionProvider>
      <SimpleDragProvider>
        <KeyboardHandler
          isPlayMode={isPlayMode}
          findInteractiveAncestor={findInteractiveAncestor}
        />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          userSelect: 'none',
          position: 'relative',
        }}>
          {/* Canvas Content with Viewport Frame */}
          <ViewportFrame>
            <div
              style={{
                flex: 1,
                padding: `${pagePadding * 4}px`,
                backgroundColor: pageBackgroundColor,
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
              onMouseDown={(e) => {
                // ... existing mousedown logic
              }}
            >
              <ThemeProvider color={{ primary: projectTheme.primaryColor, bg: projectTheme.backgroundColor }}>
                <div style={{ width: '100%', height: '100%', alignSelf: 'stretch' }}>
                  {/* ... existing render logic */}
                </div>
              </ThemeProvider>
            </div>
          </ViewportFrame>
          
          {/* Bottom Bar with Breadcrumb, Viewport Indicator, Preset Buttons, and Zoom Slider */}
          {showBreadcrumb && !isPlayMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <Breadcrumb />
              <ViewportIndicator />
              <ViewportPresetButtons />
              <ZoomSlider />
            </div>
          )}
          
          <AgentDebugUI />
        </div>
      </SimpleDragProvider>
    </SelectionProvider>
  );
};
```

### 7. Keyboard Shortcuts

**Location**: `src/components/KeyboardHandler.tsx` (update existing)

Add viewport and zoom keyboard shortcuts:

```typescript
// Add to KeyboardHandler component:
const { setViewportPreset, setZoomLevel, zoomLevel } = useComponentTree();

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.5, 2.0];

// Add to handleKeyDown:
// Viewport presets
if ((e.metaKey || e.ctrlKey) && e.key === '1') {
  e.preventDefault();
  setViewportPreset('mobile');
  return;
}
if ((e.metaKey || e.ctrlKey) && e.key === '2') {
  e.preventDefault();
  setViewportPreset('tablet');
  return;
}
if ((e.metaKey || e.ctrlKey) && e.key === '3') {
  e.preventDefault();
  setViewportPreset('desktop');
  return;
}
if ((e.metaKey || e.ctrlKey) && e.key === '0' && !e.shiftKey) {
  e.preventDefault();
  setViewportPreset('full');
  return;
}

// Zoom controls
if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
  e.preventDefault();
  const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
  if (currentIndex < ZOOM_LEVELS.length - 1) {
    setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
  }
  return;
}
if ((e.metaKey || e.ctrlKey) && (e.key === '-' || e.key === '_')) {
  e.preventDefault();
  const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
  if (currentIndex > 0) {
    setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
  }
  return;
}
if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '0') {
  e.preventDefault();
  setZoomLevel(1.0);
  return;
}
```

### 8. Interaction Coordinate Scaling

**Location**: `src/components/RenderNode.tsx` (update existing)

Scale mouse coordinates for accurate hit detection when zoomed:

```typescript
// Add helper function at top of file:
function scaleMouseCoordinates(e: MouseEvent | React.MouseEvent): { x: number; y: number } {
  const frameRef = (window as any).__viewportFrameRef;
  const zoomLevel = (window as any).__viewportZoomLevel || 1.0;
  
  if (!frameRef || zoomLevel === 1.0) {
    return { x: e.clientX, y: e.clientY };
  }
  
  const frameRect = frameRef.getBoundingClientRect();
  
  // Calculate position relative to frame
  const relativeX = e.clientX - frameRect.left;
  const relativeY = e.clientY - frameRect.top;
  
  // Scale coordinates inversely to zoom level
  const scaledX = relativeX / zoomLevel;
  const scaledY = relativeY / zoomLevel;
  
  // Convert back to screen coordinates
  return {
    x: frameRect.left + scaledX,
    y: frameRect.top + scaledY,
  };
}

// Update all mouse event handlers to use scaled coordinates:
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  const { x, y } = scaleMouseCoordinates(e);
  // Use x, y instead of e.clientX, e.clientY
  // ... rest of logic
}, [/* deps */]);

// Apply to: handleMouseDown, handleMouseMove, handleMouseUp, drag detection, etc.
```

### 9. SessionStorage Persistence

**Location**: `src/contexts/ComponentTreeContext.tsx` (update existing)

Persist viewport and zoom settings:

```typescript
// Add to ComponentTreeProvider:
const [viewportPreset, setViewportPresetState] = useState<'mobile' | 'tablet' | 'desktop' | 'full'>(() => {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(`viewport-preset-${currentProjectId}`);
    return (stored as any) || 'full';
  }
  return 'full';
});

const [zoomLevel, setZoomLevelState] = useState<number>(() => {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(`zoom-level-${currentProjectId}`);
    return stored ? parseFloat(stored) : 1.0;
  }
  return 1.0;
});

const setViewportPreset = useCallback((preset: 'mobile' | 'tablet' | 'desktop' | 'full') => {
  setViewportPresetState(preset);
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`viewport-preset-${currentProjectId}`, preset);
  }
}, [currentProjectId]);

const setZoomLevel = useCallback((level: number) => {
  setZoomLevelState(level);
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`zoom-level-${currentProjectId}`, level.toString());
  }
}, [currentProjectId]);
```

## Data Models

### Viewport Preset Type

```typescript
type ViewportPreset = 'mobile' | 'tablet' | 'desktop' | 'full';

const VIEWPORT_WIDTHS: Record<ViewportPreset, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1440,
  full: 0, // 0 = use full available width
};
```

### Zoom Level Type

```typescript
type ZoomLevel = 0.5 | 0.75 | 1.0 | 1.5 | 2.0;

const ZOOM_LEVELS: ZoomLevel[] = [0.5, 0.75, 1.0, 1.5, 2.0];
```

## Integration with Responsive Grid System

The viewport preview system integrates seamlessly with the responsive grid system:

1. **Viewport Width Override**: `useResponsiveViewport` hook checks viewport preset and uses preset width instead of window width
2. **Breakpoint Detection**: Preset width determines which breakpoint is active (small/medium/large/xlarge)
3. **Grid Column Resolution**: Responsive grids use the breakpoint from viewport preview to determine column count
4. **Child Span Calculation**: Grid children scale proportionally based on the active breakpoint

This means designers can:
- Set viewport to Mobile (375px) → Grids use "small" breakpoint columns
- Set viewport to Tablet (768px) → Grids use "medium" breakpoint columns
- Set viewport to Desktop (1440px) → Grids use "xlarge" breakpoint columns
- Zoom in/out to see details without affecting responsive behavior

## Error Handling

### Invalid Zoom Levels

- **Validation**: Zoom level must be one of: 0.5, 0.75, 1.0, 1.5, 2.0
- **Handling**: If invalid value in sessionStorage, default to 1.0
- **User Feedback**: Disable zoom in/out buttons at min/max levels

### Invalid Viewport Presets

- **Validation**: Viewport preset must be one of: 'mobile', 'tablet', 'desktop', 'full'
- **Handling**: If invalid value in sessionStorage, default to 'full'
- **User Feedback**: Highlight active preset button

### Coordinate Scaling Edge Cases

- **Scenario**: Frame ref not available during initial render
- **Handling**: Fall back to unscaled coordinates (zoom = 1.0)
- **Result**: Interactions work correctly, just without zoom scaling

### Play Mode Behavior

- **Scenario**: User enters play mode with viewport preview active
- **Handling**: Automatically switch to full width and 100% zoom in play mode
- **Result**: Play mode always shows full-size, unzoomed design

## Testing Strategy

### Unit Tests

1. **Viewport Width Resolution**
   - Test preset width lookup (mobile → 375, tablet → 768, etc.)
   - Test full width mode (preset → 0)

2. **Zoom Level Validation**
   - Test zoom in/out boundaries
   - Test zoom reset to 100%

3. **Coordinate Scaling**
   - Test scaling at different zoom levels
   - Test fallback when frame ref unavailable

4. **SessionStorage Persistence**
   - Test save/restore viewport preset
   - Test save/restore zoom level
   - Test per-project isolation

### Integration Tests

1. **Viewport Preview Integration**
   - Render Canvas with viewport preset
   - Verify width constraint applied
   - Verify responsive grids react to preset width

2. **Zoom Integration**
   - Apply zoom level
   - Verify transform applied
   - Verify interactions work correctly

3. **Keyboard Shortcuts**
   - Test Cmd+1/2/3/0 for viewport presets
   - Test Cmd+Plus/Minus for zoom
   - Test Cmd+Shift+0 for zoom reset

4. **Play Mode Behavior**
   - Enter play mode with viewport preview active
   - Verify full width and 100% zoom applied
   - Exit play mode and verify settings restored

## Performance Considerations

1. **CSS Transform**: Using `transform: scale()` is GPU-accelerated and doesn't trigger layout recalculation
2. **Coordinate Scaling**: Minimal overhead - simple division operation per mouse event
3. **SessionStorage**: Synchronous but fast - only accessed on mount and setting changes
4. **Viewport Detection**: React hook with minimal re-renders - only updates when preset changes

## Notes

- **Play Mode**: Viewport preview and zoom are disabled in play mode (always full width, 100% zoom)
- **Responsive Integration**: Viewport preview triggers responsive grid behavior automatically
- **Browser Compatibility**: CSS transform scale is supported in all modern browsers
- **Future Enhancement**: Could add custom viewport width input for testing specific sizes
- **Future Enhancement**: Could add viewport rotation (portrait/landscape) for mobile preview
