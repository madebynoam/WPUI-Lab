import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

interface GridResizeHandlesProps {
  nodeId: string;
  gridColumnSpan: number;
  gridColumnStart?: number;
  parentColumns: number;
  isSelected: boolean;
  isPlayMode: boolean;
}

export const GridResizeHandles: React.FC<GridResizeHandlesProps> = ({
  nodeId,
  gridColumnSpan,
  gridColumnStart = 1,
  parentColumns = 12,
  isSelected,
  isPlayMode,
}) => {
  const { updateComponentProps, isAgentExecuting } = useComponentTree();

  // Only use state for hover and active drag side
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  const [isHoveringRight, setIsHoveringRight] = useState(false);
  const [activeDragSide, setActiveDragSide] = useState<'left' | 'right' | null>(null);

  // Track drag state without triggering renders
  const dragStateRef = useRef<{
    side: 'left' | 'right';
    initialX: number;
    initialStart: number;
    initialSpan: number;
    columnWidth: number;
    gapWidth: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Don't show handles in play mode or during agent execution
  if (isPlayMode || isAgentExecuting) {
    return null;
  }

  const startDrag = useCallback((e: React.PointerEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();

    console.log('[GridResizeHandles] Starting drag on', side, 'handle');

    const container = containerRef.current;
    if (!container) return;

    // Find the parent Grid element by searching upward for an element with display: grid
    let parentGrid: HTMLElement | null = container.parentElement;
    while (parentGrid && window.getComputedStyle(parentGrid).display !== 'grid') {
      parentGrid = parentGrid.parentElement;
    }

    if (!parentGrid) {
      console.error('[GridResizeHandles] Could not find parent Grid element');
      return;
    }

    // Calculate accurate column width accounting for gaps
    const parentRect = parentGrid.getBoundingClientRect();
    const gridGap = window.getComputedStyle(parentGrid).gap || '0px';
    const gapWidth = parseFloat(gridGap);
    const totalGapWidth = (parentColumns - 1) * gapWidth;
    const columnWidth = (parentRect.width - totalGapWidth) / parentColumns;

    console.log('[GridResizeHandles] Drag setup:', {
      columnWidth,
      gapWidth,
      parentColumns,
      initialStart: gridColumnStart,
      initialSpan: gridColumnSpan,
    });

    dragStateRef.current = {
      side,
      initialX: e.clientX,
      initialStart: gridColumnStart,
      initialSpan: gridColumnSpan,
      columnWidth,
      gapWidth,
    };

    setActiveDragSide(side);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [gridColumnStart, gridColumnSpan, parentColumns]);

  const handleLeftPointerDown = useCallback((e: React.PointerEvent) => {
    startDrag(e, 'left');
  }, [startDrag]);

  const handleRightPointerDown = useCallback((e: React.PointerEvent) => {
    startDrag(e, 'right');
  }, [startDrag]);

  // Document-level pointer move and up handlers
  useEffect(() => {
    if (!activeDragSide || !dragStateRef.current) return;

    console.log('[GridResizeHandles] Attaching document listeners for', activeDragSide);

    const handlePointerMove = (e: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const deltaX = e.clientX - dragState.initialX;
      const columnsDelta = Math.round(deltaX / (dragState.columnWidth + dragState.gapWidth));

      console.log('[GridResizeHandles] Pointer move:', { deltaX, columnsDelta });

      if (dragState.side === 'left') {
        // Dragging left handle: Change gridColumnStart (keep right edge fixed)
        const newStart = Math.max(1, Math.min(
          parentColumns - dragState.initialSpan + 1,
          dragState.initialStart + columnsDelta
        ));
        const newSpan = dragState.initialSpan + (dragState.initialStart - newStart);

        if (newSpan >= 1 && newSpan <= parentColumns && newStart + newSpan - 1 <= parentColumns) {
          console.log('[GridResizeHandles] Updating left:', { newStart, newSpan });
          updateComponentProps(nodeId, {
            gridColumnStart: newStart,
            gridColumnSpan: newSpan,
          });
        }
      } else if (dragState.side === 'right') {
        // Dragging right handle: Change gridColumnSpan (keep left edge fixed)
        const newSpan = Math.max(1, Math.min(
          parentColumns - dragState.initialStart + 1,
          dragState.initialSpan + columnsDelta
        ));

        if (newSpan >= 1 && newSpan <= parentColumns) {
          console.log('[GridResizeHandles] Updating right:', { newSpan });
          updateComponentProps(nodeId, {
            gridColumnSpan: newSpan,
          });
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      console.log('[GridResizeHandles] Pointer up, ending drag');
      e.stopPropagation();
      e.preventDefault();

      dragStateRef.current = null;
      setActiveDragSide(null);
    };

    // Attach to document for proper capture
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      console.log('[GridResizeHandles] Removing document listeners');
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDragSide, parentColumns, nodeId, updateComponentProps]);

  const showHandles = isSelected || isHoveringLeft || isHoveringRight || activeDragSide !== null;

  return (
    <div ref={containerRef} style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 1500, // Above grid lines (1000)
    }}>
      {/* Left Handle */}
      <div
        onPointerDown={handleLeftPointerDown}
        onPointerEnter={() => setIsHoveringLeft(true)}
        onPointerLeave={() => {
          if (activeDragSide !== 'left') setIsHoveringLeft(false);
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '10px',
          height: '100%',
          cursor: 'ew-resize',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showHandles && (
          <div style={{
            width: '2px',
            height: '50%',
            minHeight: '20px',
            maxHeight: '60px',
            backgroundColor: (activeDragSide === 'left') ? '#0066ff' : (isHoveringLeft ? '#3858e9' : '#a0a0a0'),
            borderRadius: '1px',
            transition: activeDragSide ? 'none' : 'background-color 0.15s ease',
            boxShadow: '0 0 4px rgba(0,0,0,0.2)',
          }} />
        )}
      </div>

      {/* Right Handle */}
      <div
        onPointerDown={handleRightPointerDown}
        onPointerEnter={() => setIsHoveringRight(true)}
        onPointerLeave={() => {
          if (activeDragSide !== 'right') setIsHoveringRight(false);
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '10px',
          height: '100%',
          cursor: 'ew-resize',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showHandles && (
          <div style={{
            width: '2px',
            height: '50%',
            minHeight: '20px',
            maxHeight: '60px',
            backgroundColor: (activeDragSide === 'right') ? '#0066ff' : (isHoveringRight ? '#3858e9' : '#a0a0a0'),
            borderRadius: '1px',
            transition: activeDragSide ? 'none' : 'background-color 0.15s ease',
            boxShadow: '0 0 4px rgba(0,0,0,0.2)',
          }} />
        )}
      </div>
    </div>
  );
};
