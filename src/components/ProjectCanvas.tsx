'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { Page, ComponentNode } from '@/types';
import { RenderNode } from './RenderNode';
import { PageConnectors } from './PageConnectors';
import { CanvasControls } from './CanvasControls';
import { SelectionProvider } from '@/contexts/SelectionContext';
import { SimpleDragProvider } from '@/contexts/SimpleDragContext';
import { privateApis as themePrivateApis } from '@wordpress/theme';
import { unlock } from '@/utils/wordpressPrivateApis';

const { ThemeProvider } = unlock(themePrivateApis);

// Viewport presets for different device sizes
export type ViewportPreset = 'mobile' | 'tablet' | 'desktop';

export const VIEWPORT_PRESETS: Record<ViewportPreset, { width: number; height: number; label: string; scale: number }> = {
  mobile: { width: 375, height: 667, label: 'Mobile', scale: 0.5 },
  tablet: { width: 768, height: 1024, label: 'Tablet', scale: 0.35 },
  desktop: { width: 1440, height: 900, label: 'Desktop', scale: 0.25 },
};

// Constants for page layout
const PAGE_GAP = 100; // Gap between pages in grid layout
const GRID_COLUMNS = 3; // Number of columns in auto-layout

interface ProjectCanvasProps {
  onPageClick: (pageId: string) => void;
  onClose: () => void;
}

interface PageWithVisibility extends Page {
  isVisible: boolean;
}

// Calculate auto-layout positions for pages
function calculateAutoLayout(pages: Page[], thumbWidth: number, thumbHeight: number): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  
  pages.forEach((page, index) => {
    const col = index % GRID_COLUMNS;
    const row = Math.floor(index / GRID_COLUMNS);
    positions[page.id] = {
      x: col * (thumbWidth + PAGE_GAP),
      y: row * (thumbHeight + PAGE_GAP + 40), // Extra space for label
    };
  });
  
  return positions;
}

// Check if two rectangles intersect
function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

// Get page bounds in canvas coordinates
function getPageBounds(position: { x: number; y: number }, thumbWidth: number, thumbHeight: number): { left: number; top: number; right: number; bottom: number } {
  return {
    left: position.x,
    top: position.y,
    right: position.x + thumbWidth,
    bottom: position.y + thumbHeight + 40, // Include label space
  };
}

// Clamp a value between min and max
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Page thumbnail component
const PageThumbnail = React.memo(function PageThumbnail({
  page,
  position,
  isVisible,
  isSelected,
  isDragging,
  dragOffset,
  zoom,
  thumbWidth,
  thumbHeight,
  contentScale,
  onPointerDown,
  onClick,
  onDoubleClick,
}: {
  page: Page;
  position: { x: number; y: number };
  isVisible: boolean;
  isSelected: boolean;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  zoom: number;
  thumbWidth: number;
  thumbHeight: number;
  contentScale: number;
  onPointerDown: (e: React.PointerEvent, pageId: string) => void;
  onClick: (pageId: string) => void;
  onDoubleClick: (pageId: string) => void;
}) {
  const { projects, currentProjectId } = useComponentTree();
  
  // Get project theme
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectTheme = currentProject?.theme ?? {
    primaryColor: '#3858e9',
    backgroundColor: '#ffffff',
  };
  
  const actualPosition = isDragging
    ? { x: position.x + dragOffset.x, y: position.y + dragOffset.y }
    : position;

  return (
    <div
      className="page-thumbnail"
      style={{
        position: 'absolute',
        left: actualPosition.x,
        top: actualPosition.y,
        width: thumbWidth,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : 1,
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
      }}
      onPointerDown={(e) => onPointerDown(e, page.id)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(page.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(page.id);
      }}
    >
      {/* Page content container */}
      <div
        style={{
          width: thumbWidth,
          height: thumbHeight,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: isSelected
            ? `0 0 0 ${3 / zoom}px #3858e9, 0 8px 32px rgba(0,0,0,0.15)`
            : isDragging
            ? '0 16px 48px rgba(0,0,0,0.2)'
            : '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: '#fff',
          contain: 'strict',
        }}
      >
        {/* Scaled content wrapper */}
        <div
          style={{
            width: thumbWidth / contentScale,
            height: thumbHeight / contentScale,
            transform: `scale(${contentScale})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
            overflow: 'hidden',
            backgroundColor: page.theme?.backgroundColor || projectTheme.backgroundColor || '#fff',
          }}
        >
          {isVisible && page.tree.length > 0 ? (
            <SelectionProvider>
              <SimpleDragProvider>
                <ThemeProvider
                  color={{
                    primary: projectTheme.primaryColor,
                    bg: projectTheme.backgroundColor,
                  }}
                >
                  {page.tree.map((node) => (
                    <RenderNode
                      key={node.id}
                      node={node}
                      renderInteractive={false}
                    />
                  ))}
                </ThemeProvider>
              </SimpleDragProvider>
            </SelectionProvider>
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: 48,
              }}
            >
              {page.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      
      {/* Page label - counter-scaled to appear constant size regardless of zoom */}
      <div
        style={{
          marginTop: 8 / zoom,
          fontSize: 15 / zoom, // Target 15px visual size
          fontWeight: 500,
          color: isSelected ? '#3858e9' : '#1e1e1e',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transformOrigin: 'center top',
        }}
      >
        {page.name}
      </div>
    </div>
  );
});

export const ProjectCanvas: React.FC<ProjectCanvasProps> = ({ onPageClick, onClose }) => {
  const {
    pages,
    currentPageId,
    updatePageCanvasPosition,
    updateAllPageCanvasPositions,
  } = useComponentTree();

  // Local selection state for canvas view (doesn't affect global currentPageId)
  // This avoids conflicts with Editor's URL sync effect
  const [selectedPageId, setSelectedPageId] = useState<string>(currentPageId);

  // Viewport preset state
  const [viewportPreset, setViewportPreset] = useState<ViewportPreset>('desktop');
  
  // Calculate thumbnail dimensions from viewport preset
  const viewport = VIEWPORT_PRESETS[viewportPreset];
  const thumbWidth = viewport.width * viewport.scale;
  const thumbHeight = viewport.height * viewport.scale;
  const contentScale = viewport.scale;

  // Pan and zoom state
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [zoom, setZoom] = useState(1);
  
  // Dragging state
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false); // Track if actual drag movement occurred
  
  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panStartPanRef = useRef({ x: 0, y: 0 });
  
  // Viewport size
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize page positions on mount
  useEffect(() => {
    const hasPositions = pages.some(p => p.canvasPosition);
    if (!hasPositions && pages.length > 0) {
      const positions = calculateAutoLayout(pages, thumbWidth, thumbHeight);
      updateAllPageCanvasPositions(positions);
    }
  }, [pages, updateAllPageCanvasPositions, thumbWidth, thumbHeight]);

  // Track viewport size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Get page positions (use stored or calculate default)
  const pagePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const defaultPositions = calculateAutoLayout(pages, thumbWidth, thumbHeight);
    
    pages.forEach((page) => {
      positions[page.id] = page.canvasPosition || defaultPositions[page.id] || { x: 0, y: 0 };
    });
    
    return positions;
  }, [pages, thumbWidth, thumbHeight]);

  // Live page positions that include drag offset for real-time arrow updates
  const livePagePositions = useMemo(() => {
    if (!draggingPageId) return pagePositions;
    
    return {
      ...pagePositions,
      [draggingPageId]: {
        x: (pagePositions[draggingPageId]?.x || 0) + dragOffset.x,
        y: (pagePositions[draggingPageId]?.y || 0) + dragOffset.y,
      },
    };
  }, [pagePositions, draggingPageId, dragOffset]);

  // Calculate visible pages based on viewport
  const visiblePages = useMemo((): PageWithVisibility[] => {
    if (viewportSize.width === 0) {
      // Render all as visible initially
      return pages.map(page => ({ ...page, isVisible: true }));
    }

    // Calculate visible area in canvas coordinates
    const visibleRect = {
      left: -pan.x / zoom,
      top: -pan.y / zoom,
      right: (-pan.x + viewportSize.width) / zoom,
      bottom: (-pan.y + viewportSize.height) / zoom,
    };
    
    // Add padding to pre-render nearby pages
    const PADDING = 200;
    const expandedRect = {
      left: visibleRect.left - PADDING,
      top: visibleRect.top - PADDING,
      right: visibleRect.right + PADDING,
      bottom: visibleRect.bottom + PADDING,
    };
    
    return pages.map(page => {
      const position = pagePositions[page.id] || { x: 0, y: 0 };
      return {
        ...page,
        isVisible: rectsIntersect(getPageBounds(position, thumbWidth, thumbHeight), expandedRect),
      };
    });
  }, [pages, pan, zoom, viewportSize, pagePositions, thumbWidth, thumbHeight]);

  // Handle wheel for zoom - using refs to avoid stale closures
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;

  // Use native event listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Always prevent default to stop page scrolling
      e.preventDefault();
      e.stopPropagation();
      
      const currentPan = panRef.current;
      const currentZoom = zoomRef.current;
      
      if (e.ctrlKey || e.metaKey) {
        // Get mouse position relative to container
        const rect = container.getBoundingClientRect();
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert mouse position to canvas coords before zoom
        const mouseCanvasX = (mouseX - currentPan.x) / currentZoom;
        const mouseCanvasY = (mouseY - currentPan.y) / currentZoom;
        
        // Calculate new zoom
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = clamp(currentZoom * zoomFactor, 0.1, 5);
        
        // Adjust pan so mouse stays over same canvas point
        setPan({
          x: mouseX - mouseCanvasX * newZoom,
          y: mouseY - mouseCanvasY * newZoom,
        });
        setZoom(newZoom);
      } else {
        // Regular scroll = pan
        setPan(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Handle page pointer down (start potential drag)
  const handlePagePointerDown = useCallback((e: React.PointerEvent, pageId: string) => {
    if (e.button !== 0) return; // Only left click
    
    e.stopPropagation();
    
    setDraggingPageId(pageId);
    setDragOffset({ x: 0, y: 0 });
    hasDraggedRef.current = false;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  // Handle pointer move (for both panning and page dragging)
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingPageId) {
      // Convert screen delta to canvas delta
      const canvasDeltaX = e.movementX / zoom;
      const canvasDeltaY = e.movementY / zoom;
      
      // Mark as dragged if moved more than a small threshold
      if (Math.abs(canvasDeltaX) > 2 || Math.abs(canvasDeltaY) > 2) {
        hasDraggedRef.current = true;
      }
      
      setDragOffset(prev => ({
        x: prev.x + canvasDeltaX,
        y: prev.y + canvasDeltaY,
      }));
    } else if (isPanning) {
      setPan({
        x: panStartPanRef.current.x + (e.clientX - panStartRef.current.x),
        y: panStartPanRef.current.y + (e.clientY - panStartRef.current.y),
      });
    }
  }, [draggingPageId, isPanning, zoom]);

  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const wasOnPage = draggingPageId;
    const didDrag = hasDraggedRef.current;
    
    if (draggingPageId) {
      // Only commit position if an actual drag occurred
      if (didDrag) {
        const currentPosition = pagePositions[draggingPageId] || { x: 0, y: 0 };
        const newPosition = {
          x: currentPosition.x + dragOffset.x,
          y: currentPosition.y + dragOffset.y,
        };
        updatePageCanvasPosition(draggingPageId, newPosition);
      } else {
        // No drag occurred - this was a click, so select the page (local state only)
        setSelectedPageId(draggingPageId);
      }
      
      setDraggingPageId(null);
      setDragOffset({ x: 0, y: 0 });
      
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture was already released
      }
    }
    
    if (isPanning) {
      setIsPanning(false);
    }
  }, [draggingPageId, dragOffset, pagePositions, updatePageCanvasPosition, isPanning]);

  // Handle page click - now handled in pointerup for better pointer capture compatibility
  const handlePageClick = useCallback((_pageId: string) => {
    // Selection is handled in pointerup to work correctly with pointer capture
  }, []);

  // Handle background pointer down (for panning)
  const handleBackgroundPointerDown = useCallback((e: React.PointerEvent) => {
    // Only start panning if clicking directly on background
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-transform-layer')) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panStartPanRef.current = { ...pan };
    }
  }, [pan]);

  // Handle double-click to edit page
  const handlePageDoubleClick = useCallback((pageId: string) => {
    onPageClick(pageId);
  }, [onPageClick]);

  // Fit all pages in view
  const handleFitToView = useCallback(() => {
    if (pages.length === 0 || viewportSize.width === 0) return;
    
    // Calculate bounding box of all pages
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    pages.forEach(page => {
      const pos = pagePositions[page.id] || { x: 0, y: 0 };
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + thumbWidth);
      maxY = Math.max(maxY, pos.y + thumbHeight + 40);
    });
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Calculate zoom to fit with padding
    const padding = 80;
    const availableWidth = viewportSize.width - padding * 2;
    const availableHeight = viewportSize.height - padding * 2;
    
    const newZoom = clamp(
      Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
      0.1,
      1
    );
    
    // Center the content
    const scaledWidth = contentWidth * newZoom;
    const scaledHeight = contentHeight * newZoom;
    
    setPan({
      x: (viewportSize.width - scaledWidth) / 2 - minX * newZoom,
      y: (viewportSize.height - scaledHeight) / 2 - minY * newZoom,
    });
    setZoom(newZoom);
  }, [pages, pagePositions, viewportSize, thumbWidth, thumbHeight]);

  // Auto-arrange pages
  const handleAutoArrange = useCallback(() => {
    const positions = calculateAutoLayout(pages, thumbWidth, thumbHeight);
    updateAllPageCanvasPositions(positions);
    
    // Fit to view after arranging
    setTimeout(handleFitToView, 50);
  }, [pages, updateAllPageCanvasPositions, handleFitToView, thumbWidth, thumbHeight]);

  // Reset zoom to 100%
  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  // Zoom in/out handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => clamp(prev * 1.2, 0.1, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => clamp(prev / 1.2, 0.1, 5));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
      
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleFitToView();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleZoomIn, handleZoomOut, handleFitToView]);

  return (
    <div
      ref={containerRef}
      className="project-canvas"
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#e5e5e5',
        cursor: isPanning ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Transform layer */}
      <div
        className="canvas-transform-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Page thumbnails */}
        {visiblePages.map((page) => (
          <PageThumbnail
            key={page.id}
            page={page}
            position={pagePositions[page.id] || { x: 0, y: 0 }}
            isVisible={page.isVisible}
            isSelected={page.id === selectedPageId}
            isDragging={page.id === draggingPageId}
            dragOffset={page.id === draggingPageId ? dragOffset : { x: 0, y: 0 }}
            zoom={zoom}
            thumbWidth={thumbWidth}
            thumbHeight={thumbHeight}
            contentScale={contentScale}
            onPointerDown={handlePagePointerDown}
            onClick={handlePageClick}
            onDoubleClick={handlePageDoubleClick}
          />
        ))}
        
        {/* Connector lines */}
        <PageConnectors
          pages={pages}
          pagePositions={livePagePositions}
          thumbWidth={thumbWidth}
          thumbHeight={thumbHeight}
          zoom={zoom}
        />
      </div>
      
      {/* Controls overlay */}
      <CanvasControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitToView={handleFitToView}
        onAutoArrange={handleAutoArrange}
        onClose={onClose}
        viewportPreset={viewportPreset}
        onViewportChange={setViewportPreset}
      />
    </div>
  );
};
