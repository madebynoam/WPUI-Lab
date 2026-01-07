# Multi-Page Canvas View

A Figma-style canvas view that displays all project pages at once, allowing users to pan, zoom, and reposition pages freely while visualizing navigation connections between them.

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Components](#components)
5. [Data Model](#data-model)
6. [Interactions](#interactions)
7. [Technical Details](#technical-details)

---

## Overview

The Canvas View provides a bird's-eye view of all pages in a project, similar to Figma's canvas. Users can:
- See all pages rendered as interactive thumbnails
- Pan and zoom to navigate the canvas
- Drag pages to reposition them
- Visualize navigation connections between pages
- Double-click a page to enter edit mode

### Access
Click the grid icon in the TopBar (between Layers toggle and mode switcher) to enter Canvas View. Press `Escape` or click the close button to exit.

---

## Features

### Pan & Zoom
- **Scroll** to pan the canvas
- **Ctrl/Cmd + Scroll** to zoom toward cursor position
- **Ctrl/Cmd + Plus/Minus** for keyboard zoom
- **Ctrl/Cmd + 0** to fit all pages in view
- Zoom range: 10% to 200%

### Page Thumbnails
- Live DOM rendering at 25% scale
- Viewport culling for performance (only visible pages render their DOM)
- Visual selection highlight
- Page name labels

### Page Repositioning
- Drag any page to reposition it on the canvas
- Positions are persisted to the project data
- "Arrange" button auto-layouts pages in a grid

### Navigation Connectors
- SVG bezier curves show navigation interactions between pages
- Arrow markers indicate flow direction
- Hover to highlight connections
- Click connections for future interaction editing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Editor                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                      TopBar                              ││
│  │  [Inserter] [Layers] [|] [Canvas View Toggle] ...       ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │           isCanvasView ? ProjectCanvas : Canvas          ││
│  │  ┌───────────────────────────────────────────────────┐  ││
│  │  │              ProjectCanvas                         │  ││
│  │  │  ┌─────────────────────────────────────────────┐  │  ││
│  │  │  │         Transform Layer (pan/zoom)          │  │  ││
│  │  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │  │  ││
│  │  │  │  │  Page   │ │  Page   │ │  Page   │       │  │  ││
│  │  │  │  │Thumbnail│→│Thumbnail│ │Thumbnail│       │  │  ││
│  │  │  │  └─────────┘ └─────────┘ └─────────┘       │  │  ││
│  │  │  │         PageConnectors (SVG)                │  │  ││
│  │  │  └─────────────────────────────────────────────┘  │  ││
│  │  │  ┌─────────────────────────────────────────────┐  │  ││
│  │  │  │         CanvasControls (overlay)            │  │  ││
│  │  │  └─────────────────────────────────────────────┘  │  ││
│  │  └───────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### ProjectCanvas (`src/components/ProjectCanvas.tsx`)

Main canvas component managing:
- Pan/zoom state and transforms
- Page thumbnail rendering with viewport culling
- Drag-to-reposition pages
- Local selection state (isolated from Editor's URL sync)

**Key State:**
```typescript
const [pan, setPan] = useState({ x: 100, y: 100 });
const [zoom, setZoom] = useState(1);
const [selectedPageId, setSelectedPageId] = useState(currentPageId);
const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
```

### PageThumbnail (internal to ProjectCanvas)

Renders a single page as a scaled-down thumbnail:
- Fixed size: 400×300 canvas units
- Content scale: 25% (renders 1600×1200 content area)
- Uses actual `RenderNode` components (live DOM, not screenshots)
- `pointerEvents: none` on content to prevent interaction

### PageConnectors (`src/components/PageConnectors.tsx`)

SVG overlay rendering navigation connections:
- Traverses all pages to find `action: 'navigate'` interactions
- Draws quadratic bezier curves between page edges
- Arrow markers for direction
- Hover states for interactivity

### CanvasControls (`src/components/CanvasControls.tsx`)

Floating control bar with:
- Close button (top-left)
- "All Pages" title (top-center)
- Arrange button (bottom-right)
- Zoom controls: minus, percentage display, plus
- Fit-to-view button

---

## Data Model

### Page Interface Extension

```typescript
// src/types.ts
export interface Page {
  id: string;
  name: string;
  tree: ComponentNode[];
  theme?: { ... };
  canvasPosition?: {  // NEW
    x: number;
    y: number;
  };
}
```

### Reducer Actions

```typescript
// src/ComponentTreeTypes.ts
| { type: 'UPDATE_PAGE_CANVAS_POSITION'; payload: { pageId: string; position: { x: number; y: number } } }
| { type: 'UPDATE_ALL_PAGE_CANVAS_POSITIONS'; payload: { positions: Record<string, { x: number; y: number }> } }
```

### Context Methods

```typescript
// src/contexts/ComponentTreeContext.tsx
updatePageCanvasPosition: (pageId: string, position: { x: number; y: number }) => void;
updateAllPageCanvasPositions: (positions: Record<string, { x: number; y: number }>) => void;
```

---

## Interactions

| Action | Result |
|--------|--------|
| Scroll | Pan canvas |
| Ctrl/Cmd + Scroll | Zoom toward cursor |
| Click page | Select page (local highlight) |
| Drag page | Reposition on canvas |
| Double-click page | Exit canvas view, edit that page |
| Escape | Exit canvas view |
| Ctrl/Cmd + 0 | Fit all pages in view |
| Arrange button | Auto-layout pages in grid |

---

## Technical Details

### Coordinate Systems

The canvas uses two coordinate systems:
1. **Screen coordinates** - Mouse/pointer positions in pixels
2. **Canvas coordinates** - Page positions (unscaled)

Conversion:
```typescript
// Screen → Canvas
const canvasX = (screenX - pan.x) / zoom;
const canvasY = (screenY - pan.y) / zoom;

// Canvas → Screen (via CSS transform)
transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
```

### Viewport Culling

Pages outside the visible viewport don't render their DOM content:

```typescript
const visiblePages = useMemo(() => {
  const visibleRect = {
    left: -pan.x / zoom,
    top: -pan.y / zoom,
    right: (-pan.x + viewportSize.width) / zoom,
    bottom: (-pan.y + viewportSize.height) / zoom,
  };
  
  // Add 200px padding for pre-rendering nearby pages
  const expandedRect = { /* ... */ };
  
  return pages.map(page => ({
    ...page,
    isVisible: rectsIntersect(getPageBounds(page), expandedRect),
  }));
}, [pages, pan, zoom, viewportSize]);
```

### Selection State Isolation

Canvas view uses local `selectedPageId` state instead of modifying `currentPageId` to avoid conflicts with Editor's URL synchronization effect:

```typescript
// Editor.tsx has this effect that syncs currentPageId with URL
useEffect(() => {
  if (isProjectLoaded && currentPageId !== pageId) {
    setCurrentPage(pageId); // Resets to URL's page
  }
}, [/* includes currentPageId */]);

// ProjectCanvas uses local state to avoid triggering this
const [selectedPageId, setSelectedPageId] = useState(currentPageId);
```

### Scroll Prevention

Native wheel event listener with `{ passive: false }` to properly prevent page scrolling:

```typescript
useEffect(() => {
  const container = containerRef.current;
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault(); // Only works with passive: false
    e.stopPropagation();
    // ... pan/zoom logic
  };
  container.addEventListener('wheel', handleWheel, { passive: false });
  return () => container.removeEventListener('wheel', handleWheel);
}, []);
```

---

## Future Enhancements

- [ ] Minimap for large projects
- [ ] Multi-select pages with shift-click
- [ ] Keyboard navigation between pages
- [ ] Page grouping/sections
- [ ] Export canvas as image
- [ ] Click connector lines to edit interactions
- [ ] Snap-to-grid when repositioning
