import React, { useRef, useEffect, useCallback } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { VIEWPORT_WIDTHS, VIEWPORT_HEIGHTS } from '@/hooks/useResponsiveViewport';

interface ViewportFrameProps {
  children: React.ReactNode;
}

export const ViewportFrame: React.FC<ViewportFrameProps> = ({ children }) => {
  const { viewportPreset, zoomLevel, isPlayMode, setZoomLevel } = useComponentTree();
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 1.0;

    const containerWidth = containerRef.current.clientWidth - CONTAINER_PADDING;
    const optimalZoom = Math.min(MAX_ZOOM, containerWidth / presetWidth);
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, optimalZoom));

    setZoomLevel(clampedZoom);
  }, [isConstrained, presetWidth, setZoomLevel]);

  // Store frame ref and fitToWidth in window for coordinate scaling and external access
  useEffect(() => {
    if (frameRef.current) {
      (window as any).__viewportFrameRef = frameRef.current;
      (window as any).__viewportZoomLevel = effectiveZoom;
    }
    (window as any).__viewportFitToWidth = fitToWidth;
  }, [effectiveZoom, fitToWidth]);

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
        padding: '40px 20px',
        overflow: 'auto',
        backgroundColor: '#f5f5f5',
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
  );
};
