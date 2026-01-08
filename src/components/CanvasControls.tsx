'use client';

import React from 'react';

interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToView: () => void;
  onAutoArrange: () => void;
  onClose: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToView,
  onAutoArrange,
  onClose,
}) => {
  const zoomPercentage = Math.round(zoom * 100);

  return (
    <>
      {/* Close button - top left */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 8,
          border: 'none',
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          color: '#1e1e1e',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fff';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }}
        title="Close canvas view (Esc)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Controls bar - bottom right */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {/* Auto-arrange button */}
        <button
          onClick={onAutoArrange}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            color: '#1e1e1e',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }}
          title="Auto-arrange pages"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Arrange
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.1)' }} />

        {/* Zoom controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: 8,
            padding: '4px',
          }}
        >
          <button
            onClick={onZoomOut}
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              border: 'none',
              backgroundColor: 'transparent',
              color: '#1e1e1e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Zoom out (⌘-)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
            </svg>
          </button>

          <button
            onClick={onResetZoom}
            style={{
              minWidth: 48,
              height: 28,
              padding: '0 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: 'transparent',
              color: '#1e1e1e',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Reset zoom to 100%"
          >
            {zoomPercentage}%
          </button>

          <button
            onClick={onZoomIn}
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              border: 'none',
              backgroundColor: 'transparent',
              color: '#1e1e1e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Zoom in (⌘+)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Fit to view button */}
        <button
          onClick={onFitToView}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            color: '#1e1e1e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }}
          title="Fit all pages in view (⌘0)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>
    </>
  );
};
