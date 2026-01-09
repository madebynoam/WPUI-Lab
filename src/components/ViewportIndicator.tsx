import React from 'react';
import { useResponsiveViewport } from '@/hooks/useResponsiveViewport';

export const ViewportIndicator: React.FC = () => {
  const viewport = useResponsiveViewport();

  const viewportLabels = {
    small: 'Small (<782px)',
    medium: 'Medium (782-1080px)',
    large: 'Large (1080-1280px)',
    xlarge: 'XLarge (≥1280px)',
  };

  const viewportColors = {
    small: '#e63946',    // Red for small
    medium: '#f77f00',   // Orange for medium
    large: '#06a77d',    // Teal for large
    xlarge: '#3858e9',   // Blue for xlarge
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        color: '#1e1e1e',
        border: '1px solid #ddd',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: viewportColors[viewport.size],
        }}
      />
      <span>Viewport: {viewportLabels[viewport.size]}</span>
    </div>
  );
};
