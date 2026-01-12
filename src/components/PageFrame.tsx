'use client';

import React, { useRef, useCallback } from 'react';
import { Page } from '@/types';
import { RenderNode } from './RenderNode';
import { SelectionProvider } from '@/contexts/SelectionContext';
import { SimpleDragProvider } from '@/contexts/SimpleDragContext';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { privateApis as themePrivateApis } from '@wordpress/theme';
import { unlock } from '@/utils/wordpressPrivateApis';

const { ThemeProvider } = unlock(themePrivateApis);

interface PageFrameProps {
  page: Page;
  isSelected: boolean;
  isDrilledIn: boolean;
  position: { x: number; y: number };
  presetWidth: number;
  presetHeight: number;
  zoom: number;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  onPointerDown: (e: React.PointerEvent, pageId: string) => void;
  onSelect: (pageId: string) => void;
  onDrillIn: (pageId: string) => void;
}

export const PageFrame = React.memo(function PageFrame({
  page,
  isSelected,
  isDrilledIn,
  position,
  presetWidth,
  presetHeight,
  zoom,
  isDragging,
  dragOffset,
  onPointerDown,
  onSelect,
  onDrillIn,
}: PageFrameProps) {
  const { projects, currentProjectId, setSelectedNodeIds } = useComponentTree();
  const lastClickTimeRef = useRef(0);
  const lastClickIdRef = useRef<string | null>(null);

  // Get project theme
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectTheme = currentProject?.theme ?? {
    primaryColor: '#3858e9',
    backgroundColor: '#ffffff',
  };

  // Calculate actual position including drag offset
  const actualPosition = isDragging
    ? { x: position.x + dragOffset.x, y: position.y + dragOffset.y }
    : position;

  // Handle click with double-click detection and cmd+click for drill-in
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    // Cmd+click or Ctrl+click to drill in immediately
    if (e.metaKey || e.ctrlKey) {
      onDrillIn(page.id);
      return;
    }

    const now = Date.now();
    const isDoubleClick =
      now - lastClickTimeRef.current < 350 &&
      lastClickIdRef.current === page.id;

    lastClickTimeRef.current = now;
    lastClickIdRef.current = page.id;

    if (isDoubleClick) {
      onDrillIn(page.id);
    } else {
      // Clear item selections when clicking to select a page (not drill-in)
      setSelectedNodeIds([]);
      onSelect(page.id);
    }
  }, [page.id, onSelect, onDrillIn, setSelectedNodeIds]);

  // Handle native double-click as backup
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDrillIn(page.id);
  }, [page.id, onDrillIn]);

  // Page background color
  const pageBackgroundColor = page.theme?.backgroundColor || projectTheme.backgroundColor || '#fff';

  return (
    <div
      className="page-frame"
      data-page-id={page.id}
      style={{
        position: 'absolute',
        left: actualPosition.x,
        top: actualPosition.y,
        width: presetWidth,
        cursor: 'default',
        zIndex: isDragging ? 1000 : isSelected ? 10 : 1,
      }}
      onPointerDown={isDrilledIn ? undefined : (e) => onPointerDown(e, page.id)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Page label - clickable to select/drill, outside zoom, counter-scaled for consistent size */}
      <div
        style={{
          position: 'absolute',
          top: -24 / zoom,
          left: 0,
          fontSize: 11 / zoom,
          fontWeight: 500,
          color: isSelected ? '#3858e9' : '#757575',
          whiteSpace: 'nowrap',
          transformOrigin: 'left bottom',
          cursor: 'default',
          padding: `${4 / zoom}px ${8 / zoom}px`,
          marginLeft: -8 / zoom,
          marginTop: -4 / zoom,
          borderRadius: 4 / zoom,
          zIndex: 100,
          backgroundColor: 'transparent',
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {page.name} — {presetWidth}px
      </div>

      {/* Page content frame */}
      <div
        style={{
          width: presetWidth,
          minHeight: presetHeight,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: pageBackgroundColor,
          boxShadow: isSelected
            ? `0 0 0 ${1 / zoom}px #3858e9`
            : '0 0 0 1px rgba(0, 0, 0, 0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Clickable overlay when not drilled in - captures all clicks */}
        {!isDrilledIn && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              cursor: 'default',
            }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          />
        )}
        {/* Page content - only interactive when drilled in */}
        <div
          style={{
            flex: 1,
            pointerEvents: isDrilledIn ? 'auto' : 'none',
            overflow: 'auto',
          }}
        >
          {page.tree.length > 0 ? (
            <SelectionProvider>
              <SimpleDragProvider>
                <ThemeProvider
                  color={{
                    primary: projectTheme.primaryColor,
                    bg: projectTheme.backgroundColor,
                  }}
                >
                  {page.tree.map((node) => (
                    <RenderNode
                      key={node.id}
                      node={node}
                      renderInteractive={false}
                    />
                  ))}
                </ThemeProvider>
              </SimpleDragProvider>
            </SelectionProvider>
          ) : (
            <div
              style={{
                width: '100%',
                height: presetHeight,
                backgroundColor: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: 14,
              }}
            >
              Empty page
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
