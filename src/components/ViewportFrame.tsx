import React, { useRef, useEffect } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { VIEWPORT_WIDTHS } from '@/hooks/useResponsiveViewport';

interface ViewportFrameProps {
  children: React.ReactNode;
}

export const ViewportFrame: React.FC<ViewportFrameProps> = ({ children }) => {
  const { viewportPreset, zoomLevel, isPlayMode } = useComponentTree();
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
  return (
    <div
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
      <div
        ref={frameRef}
        style={{
          width: `${presetWidth}px`,
          minHeight: 'calc(100% - 80px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: '4px',
          position: 'relative',
          transform: effectiveZoom !== 1.0 ? `scale(${effectiveZoom})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {/* Viewport width label */}
        <div
          style={{
            position: 'absolute',
            top: '-28px',
            left: '0',
            fontSize: '11px',
            color: '#757575',
            fontWeight: 500,
          }}
        >
          {presetWidth}px
        </div>

        {children}
      </div>
    </div>
  );
};
