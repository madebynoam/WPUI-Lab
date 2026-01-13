import React from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

export function WiresToggleButton(): React.ReactElement | null {
  const { showWires, setShowWires, isPlayMode } = useComponentTree();

  // Don't show in play mode
  if (isPlayMode) return null;

  return (
    <button
      onClick={() => setShowWires(!showWires)}
      style={{
        width: 28,
        height: 24,
        borderRadius: 3,
        border: '1px solid rgba(0,0,0,0.1)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: showWires ? '#3858e9' : '#fff',
        color: showWires ? '#fff' : '#1e1e1e',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'background-color 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!showWires) {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }
      }}
      onMouseLeave={(e) => {
        if (!showWires) {
          e.currentTarget.style.backgroundColor = '#fff';
        }
      }}
      title={showWires ? 'Hide interaction wires' : 'Show interaction wires'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="5" cy="12" r="2" />
        <circle cx="19" cy="6" r="2" />
        <circle cx="19" cy="18" r="2" />
        <path d="M7 12h4c2 0 3-1 4-3l2-3" />
        <path d="M7 12h4c2 0 3 1 4 3l2 3" />
      </svg>
    </button>
  );
}
