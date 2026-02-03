'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { usePageSelection } from '@/hooks/usePageSelection';
import { VIEWPORT_WIDTHS, VIEWPORT_HEIGHTS } from '@/hooks/useResponsiveViewport';
import { PageFrame } from './PageFrame';
import { ComponentConnectors } from './ComponentConnectors';
import { RenderNode } from './RenderNode';
import { Page } from '@/types';
import { ROOT_GRID_ID } from '@/utils/treeHelpers';
import { privateApis as themePrivateApis } from "@wordpress/theme";
import { unlock } from "@/utils/wordpressPrivateApis";

const { ThemeProvider } = unlock(themePrivateApis);

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
    selectedNodeIds,
    updatePageCanvasPosition,
    updateAllPageCanvasPositions,
    showWires,
    editingGlobalComponentId,
    globalComponents,
    projects,
  } = useComponentTree();

  // Check if items are selected inside the current page (not just root grid)
  // Selections are now cleared on page switch, so we just check if any non-root items are selected
  const hasItemSelectedInCurrentPage = selectedNodeIds.length > 0 &&
    !(selectedNodeIds.length === 1 && selectedNodeIds[0] === ROOT_GRID_ID);

  // Find the global component being edited in isolation mode
  const editingGlobalComponent = editingGlobalComponentId
    ? globalComponents.find((gc) => gc.id === editingGlobalComponentId)
    : null;

  // Get project theme for isolation mode rendering
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectTheme = currentProject?.theme ?? {
    primaryColor: "#3858e9",
    backgroundColor: "#ffffff",
  };

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
  const pointerIdRef = useRef<number | null>(null);
  const hasCaptureRef = useRef(false);
  const justFinishedDragRef = useRef(false);

  // Track isolation mode transitions to save/restore pan and zoom
  const prevEditingGlobalComponentIdRef = useRef<string | null>(null);
  const savedViewStateRef = useRef<{ pan: { x: number; y: number }; zoom: number } | null>(null);

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

  // Live positions include current drag offset so wires redraw in real time
  const livePagePositions = useMemo(() => {
    if (!draggingPageId) return pagePositions;

    const current = pagePositions[draggingPageId] || { x: 0, y: 0 };
    return {
      ...pagePositions,
      [draggingPageId]: {
        x: current.x + dragOffset.x,
        y: current.y + dragOffset.y,
      },
    };
  }, [pagePositions, draggingPageId, dragOffset]);

  // Initialize page positions on mount if not set
  useEffect(() => {
    const hasPositions = pages.some((p) => p.canvasPosition);
    if (!hasPositions && pages.length > 0) {
      const positions = calculateAutoLayout(pages, presetWidth, presetHeight);
      updateAllPageCanvasPositions(positions);
    }
  }, [pages, updateAllPageCanvasPositions, presetWidth, presetHeight]);

  // Handle isolation mode transitions - save/restore pan and zoom
  useEffect(() => {
    const wasInIsolation = prevEditingGlobalComponentIdRef.current !== null;
    const isInIsolation = editingGlobalComponentId !== null;

    if (!wasInIsolation && isInIsolation) {
      // Entering isolation mode - save current pan and zoom
      savedViewStateRef.current = { pan: { ...panOffset }, zoom: zoomLevel };

      // Center the global component (positioned at 0,0) in the viewport
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const PADDING = 40;
          const panX = (containerWidth - presetWidth * zoomLevel) / 2;
          const panY = PADDING;
          setPanOffset({ x: panX, y: panY });
        }
      });
    } else if (wasInIsolation && !isInIsolation) {
      // Exiting isolation mode - restore saved pan and zoom
      if (savedViewStateRef.current) {
        setPanOffset(savedViewStateRef.current.pan);
        setZoomLevel(savedViewStateRef.current.zoom);
        savedViewStateRef.current = null;
      }
    }

    prevEditingGlobalComponentIdRef.current = editingGlobalComponentId;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on editingGlobalComponentId change
  }, [editingGlobalComponentId]);

  // Fit to width - pan to selected page (or first page if none selected)
  const fitToWidth = useCallback((): void => {
    if (!containerRef.current || !isConstrained) return;
    if (pages.length === 0) return;

    const CONTAINER_PADDING = 40;
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 1.0;

    // Determine target page: selected page, or first page if none selected
    const targetPageId = selectedPageId || pages[0].id;
    const targetPosition = pagePositions[targetPageId] || { x: 0, y: 0 };

    const containerWidth = containerRef.current.clientWidth;
    const availableWidth = containerWidth - CONTAINER_PADDING * 2;

    // Calculate zoom to fit page WIDTH
    const optimalZoom = availableWidth / presetWidth;
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, optimalZoom));

    // Center the page horizontally
    const pageCenterX = targetPosition.x + presetWidth / 2;
    const panX = containerWidth / 2 - pageCenterX * clampedZoom;

    // Align top of page with some padding from top of container
    const topPadding = CONTAINER_PADDING;
    const panY = topPadding - targetPosition.y * clampedZoom;

    setZoomLevel(clampedZoom);
    setPanOffset({ x: panX, y: panY });
    // Also clear from sessionStorage since we're intentionally resetting
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(panStorageKey);
    }
  }, [isConstrained, presetWidth, setZoomLevel, panStorageKey, pages, selectedPageId, pagePositions]);

  // Store frame ref and fitToWidth in window
  useEffect(() => {
    if (frameRef.current) {
      (window as any).__viewportFrameRef = frameRef.current;
      (window as any).__viewportZoomLevel = effectiveZoom;
    }
    (window as any).__viewportFitToWidth = fitToWidth;
  }, [effectiveZoom, fitToWidth]);

  // Auto fit-to-width on initial mount when no stored pan offset
  const hasAutoFitted = useRef(false);
  useEffect(() => {
    if (hasAutoFitted.current) return;
    if (!containerRef.current || !isConstrained || pages.length === 0) return;

    // Only auto-fit if there's no stored pan offset (fresh session)
    const stored = typeof window !== 'undefined' && currentProjectId
      ? sessionStorage.getItem(panStorageKey)
      : null;
    if (stored) {
      hasAutoFitted.current = true;
      return;
    }

    hasAutoFitted.current = true;
    fitToWidth();
  }, [isConstrained, pages, currentProjectId, panStorageKey, fitToWidth]);

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
    pointerIdRef.current = e.pointerId;
    hasCaptureRef.current = false;
    // Don't set pointer capture here - defer until actual drag movement
    // This allows click events to fire normally for page selection
  }, []);

  // Pointer move handler (like ProjectCanvas - React event handler)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingPageId) {
        const canvasDeltaX = e.movementX / zoomLevelRef.current;
        const canvasDeltaY = e.movementY / zoomLevelRef.current;
        if (Math.abs(canvasDeltaX) > 2 || Math.abs(canvasDeltaY) > 2) {
          hasDraggedRef.current = true;
          // Set pointer capture on first significant movement
          // This ensures we keep receiving events even if pointer leaves the page
          if (!hasCaptureRef.current && panWrapperRef.current && pointerIdRef.current !== null) {
            try {
              panWrapperRef.current.setPointerCapture(pointerIdRef.current);
              hasCaptureRef.current = true;
            } catch {
              // Ignore - pointer may have been released
            }
          }
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
        // Ensure the page is selected after drag ends
        selectPage(draggingPageId);
        // Flag to prevent handleBackgroundClick from deselecting
        justFinishedDragRef.current = true;
        setDraggingPageId(null);
        setDragOffset({ x: 0, y: 0 });
        // Release capture only if it was set during drag
        if (hasCaptureRef.current && panWrapperRef.current) {
          try {
            panWrapperRef.current.releasePointerCapture(e.pointerId);
          } catch {
            // Ignore - capture may have already been released
          }
        }
        pointerIdRef.current = null;
        hasCaptureRef.current = false;
      }
    },
    [draggingPageId, dragOffset, pagePositions, updatePageCanvasPosition, selectPage]
  );

  // Background click handler - deselect page
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // Skip if we just finished a drag (click fires after pointerup due to capture)
      if (justFinishedDragRef.current) {
        justFinishedDragRef.current = false;
        return;
      }
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

  // Isolation mode - render global component being edited
  if (editingGlobalComponent) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#f5f5f5',
          overscrollBehavior: 'none',
        }}
      >
        {/* Pan transform wrapper */}
        <div
          ref={panWrapperRef}
          className="pan-wrapper"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            willChange: 'transform',
          }}
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
              {/* Global component container at position 0,0 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: presetWidth,
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  padding: '40px',
                }}
              >
                <ThemeProvider
                  color={{
                    primary: projectTheme.primaryColor,
                    bg: projectTheme.backgroundColor,
                  }}
                >
                  <RenderNode
                    key={editingGlobalComponent.id}
                    node={editingGlobalComponent}
                    renderInteractive={false}
                  />
                </ThemeProvider>
              </div>
            </div>
          </div>
        </div>
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
                isSelected={page.id === selectedPageId && !(page.id === currentPageId && hasItemSelectedInCurrentPage)}
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

            {/* Interaction wires */}
            {showWires && (
              <ComponentConnectors
                pages={pages}
                pagePositions={livePagePositions}
                thumbWidth={presetWidth}
                thumbHeight={presetHeight}
                contentScale={1}
                zoom={effectiveZoom}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
