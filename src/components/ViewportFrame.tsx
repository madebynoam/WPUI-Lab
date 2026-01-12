'use client';

import React, { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { usePageSelection } from '@/hooks/usePageSelection';
import { VIEWPORT_WIDTHS, VIEWPORT_HEIGHTS } from '@/hooks/useResponsiveViewport';
import { PageFrame } from './PageFrame';
import { Page } from '@/types';

// Constants for page layout
const PAGE_GAP = 100;
const GRID_COLUMNS = 3;

// Calculate auto-layout positions for pages
function calculateAutoLayout(
  pages: Page[],
  thumbWidth: number,
  thumbHeight: number
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  pages.forEach((page, index) => {
    const col = index % GRID_COLUMNS;
    const row = Math.floor(index / GRID_COLUMNS);
    positions[page.id] = {
      x: col * (thumbWidth + PAGE_GAP),
      y: row * (thumbHeight + PAGE_GAP + 40),
    };
  });

  return positions;
}

interface ViewportFrameProps {
  children?: React.ReactNode;
}

export const ViewportFrame: React.FC<ViewportFrameProps> = ({ children }) => {
  const { selectPage } = usePageSelection();

  const {
    viewportPreset,
    zoomLevel,
    isPlayMode,
    setZoomLevel,
    pages,
    selectedPageId,
    currentPageId,
    currentProjectId,
    updatePageCanvasPosition,
    updateAllPageCanvasPositions,
  } = useComponentTree();

  // SessionStorage key for pan offset persistence (survives component remounts from URL changes)
  const panStorageKey = `pan-offset-${currentProjectId}`;

  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panWrapperRef = useRef<HTMLDivElement>(null);

  // Pan offset state - initialized from sessionStorage to survive component remounts
  const [panOffset, setPanOffset] = useState(() => {
    if (typeof window === 'undefined' || !currentProjectId) return { x: 0, y: 0 };
    try {
      const stored = sessionStorage.getItem(`pan-offset-${currentProjectId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return { x: 0, y: 0 };
  });

  // Save panOffset to sessionStorage (debounced to avoid excessive writes during panning)
  const panSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || !currentProjectId) return;

    // Debounce the save to avoid excessive writes during panning
    if (panSaveTimerRef.current) {
      clearTimeout(panSaveTimerRef.current);
    }
    panSaveTimerRef.current = setTimeout(() => {
      sessionStorage.setItem(panStorageKey, JSON.stringify(panOffset));
    }, 100);

    return () => {
      if (panSaveTimerRef.current) {
        clearTimeout(panSaveTimerRef.current);
      }
    };
  }, [panOffset, panStorageKey, currentProjectId]);

  // Dragging state
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // In play mode, always use full width and 100% zoom
  const effectivePreset = isPlayMode ? 'full' : viewportPreset;
  const effectiveZoom = isPlayMode ? 1.0 : zoomLevel;

  const presetWidth = VIEWPORT_WIDTHS[effectivePreset];
  const presetHeight = VIEWPORT_HEIGHTS[effectivePreset];
  const isConstrained = presetWidth > 0;

  // Calculate page positions
  const pagePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const defaultPositions = calculateAutoLayout(pages, presetWidth, presetHeight);

    pages.forEach((page) => {
      positions[page.id] = page.canvasPosition || defaultPositions[page.id] || { x: 0, y: 0 };
    });

    return positions;
  }, [pages, presetWidth, presetHeight]);

  // Initialize page positions on mount if not set
  useEffect(() => {
    const hasPositions = pages.some((p) => p.canvasPosition);
    if (!hasPositions && pages.length > 0) {
      const positions = calculateAutoLayout(pages, presetWidth, presetHeight);
      updateAllPageCanvasPositions(positions);
    }
  }, [pages, updateAllPageCanvasPositions, presetWidth, presetHeight]);

  // Fit to width
  const fitToWidth = useCallback((): void => {
    if (!containerRef.current || !isConstrained) return;

    const CONTAINER_PADDING = 40;
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 1.0;

    const containerWidth = containerRef.current.clientWidth - CONTAINER_PADDING;
    const optimalZoom = Math.min(MAX_ZOOM, containerWidth / presetWidth);
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, optimalZoom));

    setZoomLevel(clampedZoom);
    setPanOffset({ x: 0, y: 0 });
    // Also clear from sessionStorage since we're intentionally resetting
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(panStorageKey);
    }
  }, [isConstrained, presetWidth, setZoomLevel, panStorageKey]);

  // Track previous viewport preset to reset pan when it changes
  const prevViewportPresetRef = useRef(viewportPreset);

  // Store frame ref and fitToWidth in window
  useEffect(() => {
    if (frameRef.current) {
      (window as any).__viewportFrameRef = frameRef.current;
      (window as any).__viewportZoomLevel = effectiveZoom;
    }
    (window as any).__viewportFitToWidth = fitToWidth;
  }, [effectiveZoom, fitToWidth]);

  // Reset pan when viewport preset changes
  useLayoutEffect(() => {
    if (prevViewportPresetRef.current !== viewportPreset) {
      setPanOffset({ x: 0, y: 0 });
      prevViewportPresetRef.current = viewportPreset;
      // Also clear from sessionStorage since we're intentionally resetting
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(panStorageKey);
      }
    }
  }, [viewportPreset, panStorageKey]);

  // Refs for smooth zoom - apply directly to DOM, sync to React state after gesture ends
  const zoomLevelRef = useRef(zoomLevel);
  const panOffsetRef = useRef(panOffset);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  // Wheel event handler for two-finger trackpad panning and pinch-to-zoom (Figma-style)
  // Listen on window level with capture to intercept before browser navigation
  useEffect(() => {
    const container = containerRef.current;
    const frame = frameRef.current;
    if (!container || !frame || !isConstrained) return;

    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 1.0;
    const SYNC_DELAY = 150;

    const handleWheel = (e: WheelEvent) => {
      // Only handle if event is within our container
      if (!container.contains(e.target as Node)) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or Cmd+scroll - zoom toward visible viewport center
        const panWrapper = panWrapperRef.current;
        if (!panWrapper) return;

        const zoomFactor = Math.pow(0.995, e.deltaY);
        const currentZoom = zoomLevelRef.current;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));

        // Get the visible viewport center (the center of the container element)
        const containerRect = container.getBoundingClientRect();
        const viewportCenterX = containerRect.width / 2;
        const viewportCenterY = containerRect.height / 2;

        // Current pan offset
        const currentPan = panOffsetRef.current;

        // Calculate what content point is at the viewport center
        // The content position formula: screenPos = contentPos * zoom + panOffset
        // So: contentPos = (screenPos - panOffset) / zoom
        const contentX = (viewportCenterX - currentPan.x) / currentZoom;
        const contentY = (viewportCenterY - currentPan.y) / currentZoom;

        // After zooming, adjust pan so the same content point stays at viewport center
        // We want: viewportCenter = contentPos * newZoom + newPan
        // So: newPan = viewportCenter - contentPos * newZoom
        const newPanX = viewportCenterX - contentX * newZoom;
        const newPanY = viewportCenterY - contentY * newZoom;

        // Apply both transforms directly to DOM (no React state during gesture)
        frame.style.transform = `scale(${newZoom})`;
        panWrapper.style.transform = `translate(${newPanX}px, ${newPanY}px)`;

        // Update refs
        zoomLevelRef.current = newZoom;
        panOffsetRef.current = { x: newPanX, y: newPanY };
        (window as any).__viewportZoomLevel = newZoom;

        // Debounce sync to React state (only after gesture ends)
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          setZoomLevel(newZoom);
          setPanOffset({ x: newPanX, y: newPanY });
        }, SYNC_DELAY);
      } else {
        // Two-finger trackpad pan - update DOM directly for smooth panning
        const panWrapper = panWrapperRef.current;
        if (!panWrapper) return;

        const currentPan = panOffsetRef.current;
        const newPanX = currentPan.x - e.deltaX;
        const newPanY = currentPan.y - e.deltaY;

        // Apply directly to DOM
        panWrapper.style.transform = `translate(${newPanX}px, ${newPanY}px)`;
        panOffsetRef.current = { x: newPanX, y: newPanY };

        // Debounce sync to React state
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          setPanOffset({ x: newPanX, y: newPanY });
        }, SYNC_DELAY);
      }
    };

    // Use capture phase on window to intercept before browser handles navigation
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isConstrained, setZoomLevel]);

  // Page dragging handlers
  const handlePagePointerDown = useCallback((e: React.PointerEvent, pageId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDraggingPageId(pageId);
    setDragOffset({ x: 0, y: 0 });
    hasDraggedRef.current = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  // Pointer move handler (like ProjectCanvas - React event handler)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingPageId) {
        const canvasDeltaX = e.movementX / zoomLevelRef.current;
        const canvasDeltaY = e.movementY / zoomLevelRef.current;
        if (Math.abs(canvasDeltaX) > 2 || Math.abs(canvasDeltaY) > 2) {
          hasDraggedRef.current = true;
        }
        setDragOffset((prev) => ({
          x: prev.x + canvasDeltaX,
          y: prev.y + canvasDeltaY,
        }));
      }
    },
    [draggingPageId]
  );

  // Pointer up handler (like ProjectCanvas - React event handler)
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (draggingPageId) {
        if (hasDraggedRef.current) {
          const currentPosition = pagePositions[draggingPageId] || { x: 0, y: 0 };
          updatePageCanvasPosition(draggingPageId, {
            x: currentPosition.x + dragOffset.x,
            y: currentPosition.y + dragOffset.y,
          });
        }
        setDraggingPageId(null);
        setDragOffset({ x: 0, y: 0 });
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }
    },
    [draggingPageId, dragOffset, pagePositions, updatePageCanvasPosition]
  );

  // Background click handler - deselect page
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('pan-wrapper')) {
        selectPage(null);
      }
    },
    [selectPage]
  );

  // Unified page selection handler - hook handles both state + URL update
  const handlePageSelect = useCallback(
    (pageId: string) => selectPage(pageId),
    [selectPage]
  );

  // Drill-in is same as select now (unified selection)
  const handlePageDrillIn = useCallback(
    (pageId: string) => selectPage(pageId),
    [selectPage]
  );

  if (!isConstrained) {
    // Full width mode - render single page (legacy behavior for play mode)
    return (
      <div
        ref={frameRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transform: effectiveZoom !== 1.0 ? `scale(${effectiveZoom})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    );
  }

  // Multi-page canvas mode - SAME STRUCTURE as original
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        // Prevent browser back/forward navigation on horizontal swipe
        overscrollBehavior: 'none',
      }}
      onClick={handleBackgroundClick}
    >
      {/* Pan transform wrapper */}
      <div
        ref={panWrapperRef}
        className="pan-wrapper"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          willChange: 'transform',
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Wrapper for positioning */}
        <div style={{ position: 'relative' }}>
          {/* Zoom frame - transform scale applied */}
          <div
            ref={frameRef}
            style={{
              position: 'relative',
              transform: `scale(${effectiveZoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Page frames instead of children */}
            {pages.map((page) => (
              <PageFrame
                key={page.id}
                page={page}
                isSelected={page.id === selectedPageId}
                isDrilledIn={page.id === currentPageId}
                position={pagePositions[page.id] || { x: 0, y: 0 }}
                presetWidth={presetWidth}
                presetHeight={presetHeight}
                zoom={effectiveZoom}
                isDragging={page.id === draggingPageId}
                dragOffset={page.id === draggingPageId ? dragOffset : { x: 0, y: 0 }}
                onPointerDown={handlePagePointerDown}
                onSelect={handlePageSelect}
                onDrillIn={handlePageDrillIn}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
