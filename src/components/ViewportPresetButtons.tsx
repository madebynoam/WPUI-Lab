import React from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

type ViewportPresetType = 'mobile' | 'tablet' | 'desktop' | 'full';

interface ViewportIconProps {
  preset: ViewportPresetType;
  size?: number;
}

function ViewportIcon({ preset, size = 16 }: ViewportIconProps): React.ReactElement {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
  };

  switch (preset) {
    case 'mobile':
      return (
        <svg {...svgProps} strokeWidth="1.5">
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'tablet':
      return (
        <svg {...svgProps} strokeWidth="1.5">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <line x1="12" y1="17" x2="12" y2="17.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'desktop':
      return (
        <svg {...svgProps} strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      );
    case 'full':
      return (
        <svg {...svgProps} strokeWidth="2">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      );
  }
}

// Shared button styles
const baseButtonStyle: React.CSSProperties = {
  width: 28,
  height: 24,
  borderRadius: 3,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease, color 0.15s ease',
};

function getButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    ...baseButtonStyle,
    backgroundColor: isActive ? '#3858e9' : 'transparent',
    color: isActive ? '#fff' : '#1e1e1e',
  };
}

function handleHoverEnter(e: React.MouseEvent<HTMLButtonElement>, isActive: boolean): void {
  if (!isActive) {
    e.currentTarget.style.backgroundColor = '#f0f0f0';
  }
}

function handleHoverLeave(e: React.MouseEvent<HTMLButtonElement>, isActive: boolean): void {
  if (!isActive) {
    e.currentTarget.style.backgroundColor = 'transparent';
  }
}

export function ViewportPresetButtons(): React.ReactElement | null {
  const { viewportPreset, setViewportPreset, isPlayMode } = useComponentTree();

  if (isPlayMode) return null;

  const presets: Array<{ id: 'mobile' | 'tablet' | 'desktop'; title: string }> = [
    { id: 'mobile', title: 'Mobile (375px) - Cmd+1' },
    { id: 'tablet', title: 'Tablet (768px) - Cmd+2' },
    { id: 'desktop', title: 'Desktop (1440px) - Cmd+3' },
  ];

  function handleFitToWidth(): void {
    const fitToWidth = (window as { __viewportFitToWidth?: () => void }).__viewportFitToWidth;
    if (fitToWidth) {
      fitToWidth();
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        borderRadius: 4,
        padding: '2px',
        border: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      {presets.map((preset) => {
        const isActive = viewportPreset === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => setViewportPreset(preset.id)}
            style={getButtonStyle(isActive)}
            onMouseEnter={(e) => handleHoverEnter(e, isActive)}
            onMouseLeave={(e) => handleHoverLeave(e, isActive)}
            title={preset.title}
          >
            <ViewportIcon preset={preset.id} size={14} />
          </button>
        );
      })}
      <button
        onClick={handleFitToWidth}
        style={getButtonStyle(false)}
        onMouseEnter={(e) => handleHoverEnter(e, false)}
        onMouseLeave={(e) => handleHoverLeave(e, false)}
        title="Fit to Width - Cmd+0"
      >
        <ViewportIcon preset="full" size={14} />
      </button>
    </div>
  );
}
