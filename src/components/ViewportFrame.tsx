import React, { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { VIEWPORT_WIDTHS, VIEWPORT_HEIGHTS } from '@/hooks/useResponsiveViewport';

interface ViewportFrameProps {
  children: React.ReactNode;
}

// Extra space around content for free panning
const CANVAS_PADDING = 200;

export const ViewportFrame: React.FC<ViewportFrameProps> = ({ children }) => {
  const { viewportPreset, zoomLevel, isPlayMode, setZoomLevel } = useComponentTree();
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan offset state for transform-based panning
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // In play mode, always use full width and 100% zoom
  const effectivePreset = isPlayMode ? 'full' : viewportPreset;
  const effectiveZoom = isPlayMode ? 1.0 : zoomLevel;

  const presetWidth = VIEWPORT_WIDTHS[effectivePreset];
  const presetHeight = VIEWPORT_HEIGHTS[effectivePreset];
  const isConstrained = presetWidth > 0;

  // Fit to width: Calculate zoom to fill available container width
  const fitToWidth = useCallback((): void => {
    if (!containerRef.current || !isConstrained) return;

    const CONTAINER_PADDING = 40; // 20px each side
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 1.0;

    const containerWidth = containerRef.current.clientWidth - CONTAINER_PADDING;
    const optimalZoom = Math.min(MAX_ZOOM, containerWidth / presetWidth);
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, optimalZoom));

    setZoomLevel(clampedZoom);
    // Reset pan when fitting to width
    setPanOffset({ x: 0, y: 0 });
  }, [isConstrained, presetWidth, setZoomLevel]);

  // Track previous viewport preset to reset pan when it changes
  const prevViewportPresetRef = useRef(viewportPreset);

  // Store frame ref and fitToWidth in window for coordinate scaling and external access
  useEffect(() => {
    if (frameRef.current) {
      (window as any).__viewportFrameRef = frameRef.current;
      (window as any).__viewportZoomLevel = effectiveZoom;
    }
    (window as any).__viewportFitToWidth = fitToWidth;
  }, [effectiveZoom, fitToWidth]);

  // Reset pan when viewport preset changes (useLayoutEffect for synchronous update before paint)
  useLayoutEffect(() => {
    if (prevViewportPresetRef.current !== viewportPreset) {
      setPanOffset({ x: 0, y: 0 }); // eslint-disable-line react-hooks/set-state-in-effect -- Intentional reset
      prevViewportPresetRef.current = viewportPreset;
    }
  }, [viewportPreset]);

  // Refs for smooth zoom - apply directly to DOM, sync to React state after gesture ends
  const zoomLevelRef = useRef(zoomLevel);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // Wheel event handler for two-finger trackpad panning and pinch-to-zoom (Figma-style)
  useEffect(() => {
    const container = containerRef.current;
    const frame = frameRef.current;
    if (!container || !frame || !isConstrained) return;

    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 1.0;
    const SYNC_DELAY = 150; // Only sync to React after 150ms of no zooming

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Pinch-to-zoom (trackpad pinch reports as ctrlKey) or Cmd+scroll
      if (e.ctrlKey || e.metaKey) {
        // Use multiplicative zoom for smoother feel (like Figma)
        const zoomFactor = Math.pow(0.995, e.deltaY);
        const currentZoom = zoomLevelRef.current;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));

        // Apply zoom directly to DOM for immediate visual feedback (no React re-render)
        frame.style.zoom = String(newZoom);
        zoomLevelRef.current = newZoom;
        // Also update window global for coordinate calculations
        (window as any).__viewportZoomLevel = newZoom;

        // Debounce React state sync - only update after gesture ends
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          setZoomLevel(newZoom);
        }, SYNC_DELAY);
      } else {
        // Two-finger trackpad pan: deltaX = horizontal, deltaY = vertical
        setPanOffset(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isConstrained, setZoomLevel]);

  if (!isConstrained) {
    // Full width mode - no frame, just apply transform
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

  // Constrained viewport mode - show frame with border
  // Use CSS zoom which affects layout size (unlike transform: scale)
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: `${CANVAS_PADDING}px`,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* Pan transform wrapper */}
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          willChange: 'transform',
        }}
      >
        {/* Wrapper for label positioning */}
        <div style={{ position: 'relative' }}>
          {/* Viewport width label - outside zoom */}
          <div
            style={{
              position: 'absolute',
              top: '-24px',
              left: '0',
              fontSize: '11px',
              color: '#757575',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {presetWidth}px
          </div>

          {/* Viewport frame - CSS zoom applied */}
          <div
            ref={frameRef}
            style={{
              width: `${presetWidth}px`,
              minHeight: `${presetHeight}px`,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              zoom: effectiveZoom,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
