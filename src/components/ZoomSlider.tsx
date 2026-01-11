import React from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

function FitToWidthIcon({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

export const ZoomSlider: React.FC = () => {
  const { zoomLevel, setZoomLevel, isPlayMode } = useComponentTree();

  // Don't show in play mode
  if (isPlayMode) return null;

  const zoomPercentage = Math.round(zoomLevel * 100);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setZoomLevel(value / 100);
  };

  const handleFitToWidth = () => {
    const fitToWidth = (window as { __viewportFitToWidth?: () => void }).__viewportFitToWidth;
    if (fitToWidth) fitToWidth();
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
        minWidth: '150px',
      }}
    >
      <span style={{ fontSize: '11px', fontWeight: 500, color: '#1e1e1e', minWidth: '35px' }}>
        {zoomPercentage}%
      </span>
      <input
        type="range"
        min={25}
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
          background: `linear-gradient(to right, #3858e9 0%, #3858e9 ${((zoomPercentage - 25) / 75) * 100}%, #ddd ${((zoomPercentage - 25) / 75) * 100}%, #ddd 100%)`,
          cursor: 'pointer',
        }}
      />
      <button
        onClick={handleFitToWidth}
        style={{
          width: 24,
          height: 24,
          borderRadius: 3,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          color: '#1e1e1e',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f0f0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        title="Fit to Width - Cmd+0"
      >
        <FitToWidthIcon size={14} />
      </button>
    </div>
  );
};
