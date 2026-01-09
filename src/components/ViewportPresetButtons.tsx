import React from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

// Device icons for viewport presets (matching CanvasControls style)
const ViewportIcon: React.FC<{ preset: 'mobile' | 'tablet' | 'desktop' | 'full'; size?: number }> = ({ preset, size = 16 }) => {
  switch (preset) {
    case 'mobile':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'tablet':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <line x1="12" y1="17" x2="12" y2="17.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'desktop':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      );
    case 'full':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      );
  }
};

export const ViewportPresetButtons: React.FC = () => {
  const { viewportPreset, setViewportPreset, isPlayMode } = useComponentTree();

  // Don't show in play mode
  if (isPlayMode) return null;

  const presets = [
    { id: 'mobile' as const, title: 'Mobile (375px) - Cmd+1' },
    { id: 'tablet' as const, title: 'Tablet (768px) - Cmd+2' },
    { id: 'desktop' as const, title: 'Desktop (1440px) - Cmd+3' },
    { id: 'full' as const, title: 'Full Width - Cmd+0' },
  ];

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
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => setViewportPreset(preset.id)}
          style={{
            width: 28,
            height: 24,
            borderRadius: 3,
            border: 'none',
            backgroundColor: viewportPreset === preset.id ? '#3858e9' : 'transparent',
            color: viewportPreset === preset.id ? '#fff' : '#1e1e1e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (viewportPreset !== preset.id) {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (viewportPreset !== preset.id) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title={preset.title}
        >
          <ViewportIcon preset={preset.id} size={14} />
        </button>
      ))}
    </div>
  );
};
