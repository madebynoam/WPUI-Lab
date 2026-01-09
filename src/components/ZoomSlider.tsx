import React from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

export const ZoomSlider: React.FC = () => {
  const { zoomLevel, setZoomLevel, isPlayMode } = useComponentTree();

  // Don't show in play mode
  if (isPlayMode) return null;

  const zoomPercentage = Math.round(zoomLevel * 100);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setZoomLevel(value / 100);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        borderRadius: 4,
        padding: '4px 12px',
        border: '1px solid rgba(0,0,0,0.1)',
        minWidth: '120px',
      }}
    >
      <span style={{ fontSize: '11px', fontWeight: 500, color: '#1e1e1e', minWidth: '35px' }}>
        {zoomPercentage}%
      </span>
      <input
        type="range"
        min={50}
        max={100}
        step={1}
        value={zoomPercentage}
        onChange={handleSliderChange}
        style={{
          flex: 1,
          height: '4px',
          borderRadius: '2px',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          background: `linear-gradient(to right, #3858e9 0%, #3858e9 ${((zoomPercentage - 50) / 50) * 100}%, #ddd ${((zoomPercentage - 50) / 50) * 100}%, #ddd 100%)`,
          cursor: 'pointer',
        }}
      />
    </div>
  );
};
