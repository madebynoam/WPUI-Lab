import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

interface GridResizeHandlesProps {
  nodeId: string;
  gridColumnSpan: number;
  gridColumnStart?: number;
  parentColumns: number;
  isSelected: boolean;
  isPlayMode: boolean;
  needsHandles: boolean;
  siblings?: Array<{ id: string; gridColumnStart: number; gridColumnSpan: number }>;
}

export const GridResizeHandles: React.FC<GridResizeHandlesProps> = ({
  nodeId,
  gridColumnSpan,
  gridColumnStart = 1,
  parentColumns = 12,
  isSelected,
  isPlayMode,
  needsHandles,
  siblings = [],
}) => {
  const { updateComponentProps, isAgentExecuting, undo } = useComponentTree();

  // Only use state for hover and active drag side
  const [isHoveringLeft, _setIsHoveringLeft] = useState(false);
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
    element: HTMLElement;
    currentStart?: number;
    currentSpan?: number;
  } | null>(null);

  // Ref to track the element being resized for live visual updates
  const _elementRef = useRef<HTMLElement | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Track how many updates occur during drag for smart history consolidation
  const updateCountRef = useRef(0);

  const startDrag = useCallback((e: React.PointerEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    // Find the parent Grid element by searching upward for an element with display: grid
    let parentGrid: HTMLElement | null = container.parentElement;
    while (parentGrid && window.getComputedStyle(parentGrid).display !== 'grid') {
      parentGrid = parentGrid.parentElement;
    }

    if (!parentGrid) {
      return;
    }

    // Calculate accurate column width accounting for gaps
    const parentRect = parentGrid.getBoundingClientRect();
    const gridGap = window.getComputedStyle(parentGrid).gap || '0px';
    const gapWidth = parseFloat(gridGap);
    const totalGapWidth = (parentColumns - 1) * gapWidth;
    const columnWidth = (parentRect.width - totalGapWidth) / parentColumns;

    dragStateRef.current = {
      side,
      initialX: e.clientX,
      initialStart: gridColumnStart,
      initialSpan: gridColumnSpan,
      columnWidth,
      gapWidth,
      element: e.target as HTMLElement,
    };

    // Reset update counter for smart history consolidation
    updateCountRef.current = 0;

    setActiveDragSide(side);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [gridColumnStart, gridColumnSpan, parentColumns]);

  const _handleLeftPointerDown = useCallback((e: React.PointerEvent) => {
    startDrag(e, 'left');
  }, [startDrag]);

  const handleRightPointerDown = useCallback((e: React.PointerEvent) => {
    startDrag(e, 'right');
  }, [startDrag]);

  // Document-level pointer move and up handlers
  useEffect(() => {
    if (!activeDragSide || !dragStateRef.current) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const deltaX = e.clientX - dragState.initialX;
      const columnsDelta = Math.round(deltaX / (dragState.columnWidth + dragState.gapWidth));

      if (dragState.side === 'left') {
        // Dragging left handle: Change gridColumnStart (keep right edge fixed)
        // Right edge = initialStart + initialSpan (this stays fixed)
        const rightEdge = dragState.initialStart + dragState.initialSpan;

        // Calculate desired new start position
        const unconstrainedNewStart = dragState.initialStart + columnsDelta;

        // Find the maximum allowed start position by checking for sibling obstacles
        // We can't start before any sibling that would cause overlap
        let maxAllowedStart = 1;
        siblings.forEach(sibling => {
          if (sibling.id === nodeId) return;  // Skip self

          const siblingEnd = sibling.gridColumnStart + sibling.gridColumnSpan;

          // If sibling ends before our right edge, we can't go past its end
          if (siblingEnd <= rightEdge && siblingEnd > maxAllowedStart) {
            maxAllowedStart = siblingEnd;
          }
        });

        // Constrain newStart between obstacles
        const newStart = Math.max(maxAllowedStart, Math.min(
          rightEdge - 1,  // Leave room for minimum span of 1
          unconstrainedNewStart
        ));

        // Calculate new span to keep right edge fixed
        const newSpan = rightEdge - newStart;

        if (newSpan >= 1 && newSpan <= parentColumns) {
          // Store values for final update on pointer up
          dragState.currentStart = newStart;
          dragState.currentSpan = newSpan;

          // Update component props for visual feedback
          // Note: This creates history entries on every move (will be consolidated on pointer up)
          updateComponentProps(nodeId, {
            gridColumnStart: newStart,
            gridColumnSpan: newSpan,
          });
          updateCountRef.current++;
        }
      } else if (dragState.side === 'right') {
        // Dragging right handle: Change gridColumnSpan (keep left edge fixed)
        const newSpan = Math.max(1, Math.min(
          parentColumns - dragState.initialStart + 1,
          dragState.initialSpan + columnsDelta
        ));

        if (newSpan >= 1 && newSpan <= parentColumns) {
          // Store values for final update on pointer up
          dragState.currentSpan = newSpan;

          // Update component props for visual feedback
          // Note: This creates history entries on every move (will be consolidated on pointer up)
          updateComponentProps(nodeId, {
            gridColumnSpan: newSpan,
          });
          updateCountRef.current++;
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const dragState = dragStateRef.current;
      if (dragState) {
        // Smart history consolidation: undo all intermediate moves, then create ONE final entry
        const updateCount = updateCountRef.current;

        if (updateCount > 0) {
          // Undo all intermediate updates
          for (let i = 0; i < updateCount; i++) {
            undo();
          }

          // Create ONE final history entry with the final values
          if (dragState.side === 'left' && dragState.currentStart !== undefined && dragState.currentSpan !== undefined) {
            updateComponentProps(nodeId, {
              gridColumnStart: dragState.currentStart,
              gridColumnSpan: dragState.currentSpan,
            });
          } else if (dragState.side === 'right' && dragState.currentSpan !== undefined) {
            updateComponentProps(nodeId, {
              gridColumnSpan: dragState.currentSpan,
            });
          }
        }

        // Reset counter
        updateCountRef.current = 0;
      }

      // Clean up drag state
      dragStateRef.current = null;
      setActiveDragSide(null);
    };

    // Attach to document for proper capture
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDragSide, parentColumns, nodeId, updateComponentProps, siblings, undo]);

  const showHandles = isSelected || isHoveringLeft || isHoveringRight || activeDragSide !== null;

  // Don't show handles if not needed, in play mode, or during agent execution
  if (!needsHandles || isPlayMode || isAgentExecuting) {
    return null;
  }

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
      {/* Left Handle - Temporarily disabled */}
      {/* <div
        onPointerDown={handleLeftPointerDown}
        onPointerEnter={() => setIsHoveringLeft(true)}
        onPointerLeave={() => {
          if (activeDragSide !== 'left') setIsHoveringLeft(false);
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '15px',
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
      </div> */}

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
          width: '15px',
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
