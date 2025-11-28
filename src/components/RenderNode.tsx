import React, { useCallback, useState, useRef } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { usePlayModeState } from '../PlayModeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import * as wpIcons from '@wordpress/icons';
import { INTERACTIVE_COMPONENT_TYPES } from './TreePanel';
import { getMockData, getFieldDefinitions, DataSetType } from '../utils/mockDataGenerator';
import { findTopMostContainer, findPathBetweenNodes, findNodeById, findParent } from '../utils/treeHelpers';
import { useSelection } from './SelectionContext';
import { useSimpleDrag } from './SimpleDragContext';

// Simple Figma-style drag-and-drop component
export const RenderNode: React.FC<{
  node: ComponentNode;
  renderInteractive?: boolean;
}> = ({ node, renderInteractive = true }) => {
  const { toggleNodeSelection, selectedNodeIds, tree, gridLinesVisible, isPlayMode, pages, currentPageId, setPlayMode, updateComponentProps, setCurrentPage, reorderComponent } = useComponentTree();
  const playModeState = usePlayModeState();
  const definition = componentRegistry[node.type];

  // Shared click tracking for Figma-style selection
  const { lastClickTimeRef, lastClickedIdRef } = useSelection();

  // Simple drag state
  const { draggedNodeId, setDraggedNodeId, hoveredSiblingId, setHoveredSiblingId, dropPosition, setDropPosition, draggedSize, setDraggedSize, justFinishedDragging, setJustFinishedDragging, draggedItemParentId, setDraggedItemParentId } = useSimpleDrag();
  const [isDragging, setIsDragging] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Local drag state
  const [parentLayoutDirection, setParentLayoutDirection] = useState<'vertical' | 'horizontal' | 'grid'>('vertical');
  const [parentGridColumns, setParentGridColumns] = useState<number>(1);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragThresholdMet = useRef<boolean>(false);
  const clonedElementRef = useRef<HTMLElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const prevMousePosRef = useRef<{ x: number; y: number } | null>(null);

  if (!definition) {
    return <div>Unknown component: {node.type}</div>;
  }

  // Figma-style selection handler: Single click selects container, double click drills down
  const handleComponentClick = useCallback((e: React.MouseEvent, hitTargetId: string) => {
    e.stopPropagation();

    // Skip click handling if currently dragging or just finished dragging to prevent selection changes
    if (draggedNodeId || justFinishedDragging) {
      return;
    }

    // Clicking root VStack clears selection (clicking empty canvas area)
    if (hitTargetId === ROOT_VSTACK_ID) {
      // Clear all selections when clicking on the root container (empty canvas)
      if (selectedNodeIds.length > 0) {
        toggleNodeSelection('', false, false, tree); // Empty string clears selection
      }
      return;
    }

    // Preserve existing behavior for play mode and modifier keys
    if (isPlayMode) {
      executeInteractions(node.interactions);
      return;
    }

    // Handle modifier keys for selection
    // Cmd+Shift or Ctrl+Shift = multi-select (toggle item in/out of selection)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
      toggleNodeSelection(hitTargetId, true, false, tree);
      return;
    }

    // Shift alone = range select
    if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
      toggleNodeSelection(hitTargetId, false, true, tree);
      return;
    }

    // Cmd or Ctrl alone = normal single selection (bypass Figma logic, just select this item)
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      toggleNodeSelection(hitTargetId, false, false, tree);
      return;
    }

    // Double-click detection (350ms window)
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    const isDoubleClick =
      timeSinceLastClick < 350 &&
      lastClickedIdRef.current === hitTargetId;

    console.log('[Figma Selection] Click event:', {
      hitTargetId,
      timeSinceLastClick,
      isDoubleClick,
      lastClickedId: lastClickedIdRef.current,
      currentSelection: selectedNodeIds[0],
    });

    if (isDoubleClick) {
      console.log('[Figma Selection] DOUBLE CLICK detected');
      // DOUBLE CLICK: Drill down from current selection
      const currentSelection = selectedNodeIds[0];

      if (currentSelection && currentSelection !== hitTargetId) {
        // Find path from current selection to hit target
        const path = findPathBetweenNodes(tree, currentSelection, hitTargetId);
        console.log('[Figma Selection] Path from current to target:', path.map(n => ({ id: n.id, type: n.type })));

        if (path.length > 1) {
          // Drill to next level (direct child in path)
          const nextLevel = path[1];
          console.log('[Figma Selection] Drilling to next level:', { id: nextLevel.id, type: nextLevel.type });
          toggleNodeSelection(nextLevel.id, false, false, tree);
        } else {
          // No path found (maybe clicking outside current selection), select top container
          console.log('[Figma Selection] No path found, selecting top container');
          const topContainer = findTopMostContainer(tree, hitTargetId, componentRegistry);
          console.log('[Figma Selection] Top container found:', topContainer ? { id: topContainer.id, type: topContainer.type } : null);
          if (topContainer) {
            toggleNodeSelection(topContainer.id, false, false, tree);
          }
        }
      } else {
        console.log('[Figma Selection] Double-clicking already selected element');
        // Double-clicking already selected element - can't drill further
        // Do nothing (already selected)
      }

      // Reset click tracking
      lastClickTimeRef.current = 0;
      lastClickedIdRef.current = null;
    } else {
      console.log('[Figma Selection] SINGLE CLICK detected');

      // Check if clicked element is inside current selection
      const currentSelection = selectedNodeIds[0];
      if (currentSelection) {
        const path = findPathBetweenNodes(tree, currentSelection, hitTargetId);
        console.log('[Figma Selection] Path from current selection to clicked element:', path.map(n => ({ id: n.id, type: n.type })));

        if (path.length > 0) {
          // Clicked element is inside current selection - keep current selection
          console.log('[Figma Selection] Clicked inside current selection, keeping selection');
          // Don't change selection, but update click tracking
          lastClickTimeRef.current = now;
          lastClickedIdRef.current = hitTargetId;
          return;
        }

        // Clicked outside current selection - use Figma's "working level" algorithm
        console.log('[Figma Selection] Clicked outside selection, finding appropriate sibling level');

        // Build ancestor chains for both current selection and clicked element
        const getCurrentAncestors = (nodeId: string): ComponentNode[] => {
          const ancestors: ComponentNode[] = [];
          let current = findNodeById(tree, nodeId);
          while (current) {
            ancestors.push(current);
            const parent = findParent(tree, current.id);
            if (!parent || parent.id === ROOT_VSTACK_ID) break;
            current = parent;
          }
          return ancestors;
        };

        const currentAncestors = getCurrentAncestors(currentSelection);
        const clickedAncestors = getCurrentAncestors(hitTargetId);

        console.log('[Figma Selection] Current ancestors:', currentAncestors.map(n => ({ id: n.id, type: n.type })));
        console.log('[Figma Selection] Clicked ancestors:', clickedAncestors.map(n => ({ id: n.id, type: n.type })));

        // Find first common ancestor
        let commonAncestor: ComponentNode | null = null;
        for (const currentAnc of currentAncestors) {
          for (const clickedAnc of clickedAncestors) {
            if (currentAnc.id === clickedAnc.id) {
              commonAncestor = currentAnc;
              break;
            }
          }
          if (commonAncestor) break;
        }

        if (commonAncestor) {
          console.log('[Figma Selection] Common ancestor:', { id: commonAncestor.id, type: commonAncestor.type });

          // Find the child of common ancestor that contains the clicked element
          const clickedAncestorIndex = clickedAncestors.findIndex(n => n.id === commonAncestor!.id);
          if (clickedAncestorIndex > 0) {
            // Select the child of common ancestor in the clicked path
            const targetNode = clickedAncestors[clickedAncestorIndex - 1];
            console.log('[Figma Selection] Selecting at appropriate level:', { id: targetNode.id, type: targetNode.type });
            toggleNodeSelection(targetNode.id, false, false, tree);
            lastClickTimeRef.current = now;
            lastClickedIdRef.current = hitTargetId;
            return;
          } else if (clickedAncestorIndex === 0) {
            // Clicked on the common ancestor itself
            console.log('[Figma Selection] Clicked on common ancestor');
            toggleNodeSelection(commonAncestor.id, false, false, tree);
            lastClickTimeRef.current = now;
            lastClickedIdRef.current = hitTargetId;
            return;
          }
        }

        // No common ancestor found - select topmost container of clicked element
        console.log('[Figma Selection] No common ancestor, selecting topmost container');
        const topContainer = findTopMostContainer(tree, hitTargetId, componentRegistry);
        if (topContainer) {
          console.log('[Figma Selection] Selecting topmost container:', { id: topContainer.id, type: topContainer.type });
          toggleNodeSelection(topContainer.id, false, false, tree);
        }
        lastClickTimeRef.current = now;
        lastClickedIdRef.current = hitTargetId;
        return;
      }

      // SINGLE CLICK with no selection: Select topmost container
      console.log('[Figma Selection] No selection, finding topmost container');
      const topContainer = findTopMostContainer(tree, hitTargetId, componentRegistry);
      console.log('[Figma Selection] Top container found:', topContainer ? { id: topContainer.id, type: topContainer.type } : null);
      if (topContainer) {
        toggleNodeSelection(topContainer.id, false, false, tree);
      }

      // Track click for double-click detection
      lastClickTimeRef.current = now;
      lastClickedIdRef.current = hitTargetId;
    }
  }, [draggedNodeId, justFinishedDragging, isPlayMode, selectedNodeIds, tree, toggleNodeSelection, node.interactions]);

  // Execute interactions on a component
  const executeInteractions = (nodeInteractions: any[] | undefined) => {
    if (!nodeInteractions || nodeInteractions.length === 0) return;

    nodeInteractions.forEach((interaction) => {
      if (interaction.trigger === 'onClick') {
        if (interaction.action === 'navigate') {
          // Navigate to the target page
          const targetPage = pages.find(p => p.id === interaction.targetId);
          if (targetPage) {
            setCurrentPage(interaction.targetId);
          }
        } else if (interaction.action === 'showModal') {
          // Find the target component (modal) and show it
          console.log('Show modal:', interaction.targetId);
          // This would require a more complex state management for modal visibility
        }
      }
    });
  };

  // Figma-style drag: Find nearest selected ancestor to drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    // Skip if in play mode or already dragging
    if (isPlayMode || draggedNodeId) return;

    // Skip if not left click
    if (e.button !== 0) return;

    // Start with clicked node
    let currentId = node.id;
    let dragTargetId: string | null = null;

    // Walk up ancestors to find selected node
    while (currentId) {
      if (selectedNodeIds.includes(currentId)) {
        dragTargetId = currentId;
        break;
      }
      const parent = findParent(tree, currentId);
      if (!parent || parent.id === ROOT_VSTACK_ID) break;
      currentId = parent.id;
    }

    // If we found a selected ancestor, prepare for potential drag
    if (dragTargetId && dragTargetId !== ROOT_VSTACK_ID) {
      // Don't set up drag if we're in a potential double-click window
      if (timeSinceLastClick < 350) {
        // Within double-click window - don't prepare for drag, let event proceed normally
        return;
      }

      // DON'T preventDefault here - let click events work for double-click detection
      // We'll preventDefault in mousemove when we actually start dragging

      // Capture initial mouse position for drag threshold
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      dragThresholdMet.current = false;

      // Store the drag target ID temporarily (will start drag after threshold)
      (window as any).__pendingDragTargetId = dragTargetId;
    }
  }, [isPlayMode, draggedNodeId, node.id, selectedNodeIds, tree]);

  // Document-level mouse move for drag tracking
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pendingDragTargetId = (window as any).__pendingDragTargetId;

      // Check if we're waiting to start a drag (threshold not met yet)
      if (pendingDragTargetId && dragStartPosRef.current && !dragThresholdMet.current) {
        const dx = e.clientX - dragStartPosRef.current.x;
        const dy = e.clientY - dragStartPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Don't start drag if we're in a potential double-click window (350ms)
        const timeSinceLastClick = Date.now() - lastClickTimeRef.current;
        if (timeSinceLastClick < 350) {
          // Clear pending drag to prevent drag during double-click
          (window as any).__pendingDragTargetId = null;
          dragStartPosRef.current = null;
          return;
        }

        // Start drag if threshold exceeded (5px)
        if (distance > 5) {
          dragThresholdMet.current = true;

          // Find the parent and store its ID for sibling validation
          const parent = findParent(tree, pendingDragTargetId);
          if (parent) {
            // Store parent ID - used to validate drop targets are siblings
            setDraggedItemParentId(parent.id);

            // Determine layout direction for animation
            if (parent.type === 'VStack') {
              setParentLayoutDirection('vertical');
            } else if (parent.type === 'Grid') {
              setParentLayoutDirection('grid');
              setParentGridColumns(parent.props?.columns || 3);
            } else {
              setParentLayoutDirection('horizontal');
            }

            // Capture dragged component size and clone it
            const draggedElement = document.querySelector(`[data-component-id="${pendingDragTargetId}"]`) as HTMLElement;
            if (draggedElement) {
              const rect = draggedElement.getBoundingClientRect();
              setDraggedSize({ width: rect.width, height: rect.height });

              // Calculate offset from cursor to element's top-left corner
              dragOffsetRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              };

              // Clone the element for dragging
              const clone = draggedElement.cloneNode(true) as HTMLElement;
              clone.style.position = 'fixed';
              clone.style.left = `${e.clientX - dragOffsetRef.current.x}px`;
              clone.style.top = `${e.clientY - dragOffsetRef.current.y}px`;
              clone.style.width = `${rect.width}px`;
              clone.style.height = `${rect.height}px`;
              clone.style.zIndex = '10000';
              clone.style.pointerEvents = 'none';
              clone.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
              clone.style.borderRadius = '4px';
              clone.setAttribute('data-drag-clone', 'true');
              document.body.appendChild(clone);
              clonedElementRef.current = clone;
            }

            // Start the drag
            setDraggedNodeId(pendingDragTargetId);
            setIsDragging(true);
            (window as any).__pendingDragTargetId = null;

            // Prevent text selection during drag
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
          }
        }
        return;
      }

      // If drag is active, update clone position and detect drop position
      if (draggedNodeId) {
        // Update clone position using offset
        if (clonedElementRef.current && dragOffsetRef.current) {
          clonedElementRef.current.style.left = `${e.clientX - dragOffsetRef.current.x}px`;
          clonedElementRef.current.style.top = `${e.clientY - dragOffsetRef.current.y}px`;
        }
        setGhostPosition({ x: e.clientX, y: e.clientY });

        // Direction and edge-based hover detection
        if (!draggedItemParentId || !draggedSize || !dragOffsetRef.current) return;

        // Calculate dragged item's bounds
        const draggedLeft = e.clientX - dragOffsetRef.current.x;
        const draggedTop = e.clientY - dragOffsetRef.current.y;
        const draggedRight = draggedLeft + draggedSize.width;
        const draggedBottom = draggedTop + draggedSize.height;

        // Determine drag direction
        let movingRight = true;
        let movingDown = true;
        if (prevMousePosRef.current) {
          movingRight = e.clientX >= prevMousePosRef.current.x;
          movingDown = e.clientY >= prevMousePosRef.current.y;
        }
        prevMousePosRef.current = { x: e.clientX, y: e.clientY };

        // Get parent node
        const parent = findNodeById(tree, draggedItemParentId);
        if (!parent || !parent.children) return;

        let foundSlot = false;

        // Check each sibling
        for (const sibling of parent.children) {
          if (sibling.id === draggedNodeId) continue;

          const element = document.querySelector(`[data-component-id="${sibling.id}"]`);
          if (!element) continue;

          const rect = element.getBoundingClientRect();
          const siblingMidX = rect.left + rect.width / 2;
          const siblingMidY = rect.top + rect.height / 2;

          if (parentLayoutDirection === 'vertical') {
            // Use leading edge based on direction
            const leadingEdge = movingDown ? draggedBottom : draggedTop;

            // Check if leading edge overlaps with sibling
            if (leadingEdge >= rect.top && leadingEdge <= rect.bottom) {
              // Determine position only when edge crosses midpoint
              const position = leadingEdge < siblingMidY ? 'before' : 'after';
              setHoveredSiblingId(sibling.id);
              setDropPosition(position);
              foundSlot = true;
              break;
            }
          } else if (parentLayoutDirection === 'horizontal') {
            // Use leading edge based on direction
            const leadingEdge = movingRight ? draggedRight : draggedLeft;

            // Check if leading edge overlaps with sibling
            if (leadingEdge >= rect.left && leadingEdge <= rect.right) {
              // Determine position only when edge crosses midpoint
              const position = leadingEdge < siblingMidX ? 'before' : 'after';
              setHoveredSiblingId(sibling.id);
              setDropPosition(position);
              foundSlot = true;
              break;
            }
          } else {
            // Grid: Use leading edges
            const leadingEdgeX = movingRight ? draggedRight : draggedLeft;
            const leadingEdgeY = movingDown ? draggedBottom : draggedTop;

            const isInside =
              leadingEdgeX >= rect.left &&
              leadingEdgeX <= rect.right &&
              leadingEdgeY >= rect.top &&
              leadingEdgeY <= rect.bottom;

            if (isInside) {
              const position = leadingEdgeX < siblingMidX ? 'before' : 'after';
              setHoveredSiblingId(sibling.id);
              setDropPosition(position);
              foundSlot = true;
              break;
            }
          }
        }

        // Keep last valid hover to prevent race conditions
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [draggedNodeId, tree, setHoveredSiblingId, setDropPosition, setDraggedNodeId, setDraggedSize, draggedItemParentId, parentLayoutDirection]);

  // Document-level mouse up for drop
  React.useEffect(() => {
    const handleMouseUp = () => {
      // Clear pending drag state if we didn't start dragging
      if ((window as any).__pendingDragTargetId && !draggedNodeId) {
        (window as any).__pendingDragTargetId = null;
        dragStartPosRef.current = null;
        dragThresholdMet.current = false;
        return;
      }

      if (!draggedNodeId) return;
      // Capture values immediately to avoid race conditions
      const targetSiblingId = hoveredSiblingId;
      const targetPosition = dropPosition;

      // Perform drop if we have a valid target
      if (targetSiblingId && targetPosition && draggedItemParentId) {
        // Simple validation: check if target shares the same parent
        const targetParent = findParent(tree, targetSiblingId);

        if (targetParent && targetParent.id === draggedItemParentId) {
          // Same parent - safe to reorder
          reorderComponent(draggedNodeId, targetSiblingId, targetPosition);
        } else {
          console.warn('[Drop] Prevented cross-container drop - different parents:', {
            draggedNodeId,
            draggedItemParentId,
            targetSiblingId,
            targetParentId: targetParent?.id,
          });
        }
      }

      // Set flag to prevent click event after drag
      setJustFinishedDragging(true);
      setTimeout(() => {
        setJustFinishedDragging(false);
      }, 200);

      // Remove cloned element
      if (clonedElementRef.current) {
        try {
          document.body.removeChild(clonedElementRef.current);
          clonedElementRef.current = null;
        } catch (error) {
          console.error('[Drop] Error removing clone:', error);
        }
      }

      // Fallback: Remove any drag clone that might be lingering
      const orphanedClone = document.querySelector('[data-drag-clone="true"]');
      if (orphanedClone) {
        orphanedClone.remove();
      }

      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      // Cleanup drag state
      setDraggedNodeId(null);
      setIsDragging(false);
      setHoveredSiblingId(null);
      setDropPosition(null);
      setGhostPosition(null);
      setDraggedSize(null);
      setDraggedItemParentId(null);
      setParentGridColumns(1);
      dragStartPosRef.current = null;
      dragThresholdMet.current = false;
      dragOffsetRef.current = null;
      (window as any).__pendingDragTargetId = null;
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [draggedNodeId, hoveredSiblingId, dropPosition, draggedItemParentId, reorderComponent, setDraggedNodeId, setHoveredSiblingId, setDropPosition, setJustFinishedDragging, setDraggedItemParentId, setDraggedSize, tree, node.id]);

  // Skip rendering interactive components unless explicitly allowed
  if (INTERACTIVE_COMPONENT_TYPES.includes(node.type) && !renderInteractive) {
    return null;
  }

  const Component = definition.component;
  let props = { ...node.props };

  // Extract grid child properties to apply to wrapper
  const gridColumnSpan = props.gridColumnSpan;
  const gridRowSpan = props.gridRowSpan;
  delete props.gridColumnSpan;
  delete props.gridRowSpan;

  // Convert span numbers to CSS grid syntax
  const gridColumn = gridColumnSpan && gridColumnSpan > 1 ? `span ${gridColumnSpan}` : undefined;
  const gridRow = gridRowSpan && gridRowSpan > 1 ? `span ${gridRowSpan}` : undefined;

  // Base wrapper style with grid child properties
  const isRootVStack = node.id === ROOT_VSTACK_ID;
  const isSelected = selectedNodeIds.includes(node.id);

  // Check if this node is a sibling of the dragged node and should animate
  const shouldAnimateAsSibling = React.useMemo(() => {
    if (!draggedNodeId || draggedNodeId === node.id || !hoveredSiblingId || !dropPosition) {
      return false;
    }

    // Get parent of dragged node
    const draggedParent = findParent(tree, draggedNodeId);
    const thisParent = findParent(tree, node.id);

    // Must be siblings (same parent)
    if (draggedParent?.id !== thisParent?.id || !thisParent) {
      return false;
    }

    // Get the children array to find indices
    const siblings = thisParent.children || [];
    const thisIndex = siblings.findIndex(child => child.id === node.id);
    const hoveredIndex = siblings.findIndex(child => child.id === hoveredSiblingId);

    if (thisIndex === -1 || hoveredIndex === -1) {
      return false;
    }

    // Shift siblings that come at or after the insertion point
    // If dropping BEFORE hovered: shift all siblings from hovered onwards
    // If dropping AFTER hovered: shift all siblings after hovered
    let shouldAnimate = false;
    if (dropPosition === 'before') {
      shouldAnimate = thisIndex >= hoveredIndex;
    } else {
      shouldAnimate = thisIndex > hoveredIndex;
    }

    if (shouldAnimate) {
      console.log(`[ShouldAnimate] Node ${node.id}: YES`, {
        thisIndex,
        hoveredIndex,
        dropPosition,
        parentType: thisParent.type
      });
    }

    return shouldAnimate;
  }, [draggedNodeId, hoveredSiblingId, dropPosition, node.id, tree]);

  const getWrapperStyle = (additionalStyles: React.CSSProperties = {}) => {
    // Calculate proper sibling animation transform
    let transform = 'none';
    if (shouldAnimateAsSibling && dropPosition && draggedSize && draggedNodeId) {
      // Get parent to determine layout direction
      const parent = findParent(tree, node.id);
      if (parent) {
        // Get parent's spacing/gap (default to 8px if not set)
        const parentGap = parent.props?.gap !== undefined ?
          (typeof parent.props.gap === 'number' ? parent.props.gap * 4 : 8) : 8;

        if (parent.type === 'VStack') {
          // Vertical layout: shift up/down
          const shiftAmount = draggedSize.height + parentGap;
          const direction = dropPosition === 'before' ? -1 : 1;
          transform = `translateY(${direction * shiftAmount}px)`;
        } else if (parent.type === 'Grid') {
          // Grid layout: calculate 2D displacement
          const siblings = parent.children || [];
          const thisIndex = siblings.findIndex(child => child.id === node.id);
          const draggedIndex = siblings.findIndex(child => child.id === draggedNodeId);
          const hoveredIndex = siblings.findIndex(child => child.id === hoveredSiblingId);

          if (thisIndex !== -1 && draggedIndex !== -1 && hoveredIndex !== -1) {
            const columns = parent.props?.columns || 3;

            // Calculate where this item will be after the reorder
            let newIndex = thisIndex;
            if (draggedIndex < hoveredIndex) {
              // Dragging forward: items between dragged and hovered shift backward
              if (thisIndex > draggedIndex && thisIndex <= hoveredIndex) {
                newIndex = thisIndex - 1;
              }
            } else {
              // Dragging backward: items between hovered and dragged shift forward
              if (thisIndex < draggedIndex && thisIndex >= hoveredIndex) {
                newIndex = thisIndex + 1;
              }
            }

            // Convert indices to grid positions (row, col)
            const oldRow = Math.floor(thisIndex / columns);
            const oldCol = thisIndex % columns;
            const newRow = Math.floor(newIndex / columns);
            const newCol = newIndex % columns;

            // Calculate displacement
            const colDiff = newCol - oldCol;
            const rowDiff = newRow - oldRow;

            if (colDiff !== 0 || rowDiff !== 0) {
              const translateX = colDiff * (draggedSize.width + parentGap);
              const translateY = rowDiff * (draggedSize.height + parentGap);
              transform = `translate(${translateX}px, ${translateY}px)`;
              console.log(`[Animation] Grid node ${node.id}: translate(${translateX}px, ${translateY}px)`, {
                thisIndex, draggedIndex, hoveredIndex, newIndex,
                oldRow, oldCol, newRow, newCol, colDiff, rowDiff
              });
            }
          }
        } else {
          // Horizontal layout (HStack): shift left/right
          const shiftAmount = draggedSize.width + parentGap;
          const direction = dropPosition === 'before' ? -1 : 1;
          transform = `translateX(${direction * shiftAmount}px)`;
          console.log(`[Animation] HStack node ${node.id}: translateX(${direction * shiftAmount}px)`);
        }
      }
    }

    // Highlight hovered sibling
    const isHoveredSibling = hoveredSiblingId === node.id;
    const backgroundColor = isHoveredSibling ? 'rgba(56, 88, 233, 0.1)' : undefined;

    if (isHoveredSibling) {
      console.log(`[Hover] Highlighting node ${node.id} as hovered sibling`);
    }

    const baseStyle: React.CSSProperties = {
      outline: isSelected && !isRootVStack && !isPlayMode ? '2px solid #3858e9' : 'none',
      cursor: isPlayMode && node.interactions && node.interactions.length > 0
        ? 'pointer'
        : 'default',
      position: 'relative',
      ...(gridColumn && { gridColumn }),
      ...(gridRow && { gridRow }),
      backgroundColor,

      // Sibling animation: shift to make space for drop
      // Only apply transform and transition when actually animating to prevent unwanted animations
      ...(shouldAnimateAsSibling && transform !== 'none' ? {
        transform,
        transition: 'transform 0.2s ease',
      } : {
        transform: 'none',
        transition: 'none',
      }),
    };

    return { ...baseStyle, ...additionalStyles };
  };

  // Handle components with special text/content props
  if (node.type === 'Text' || node.type === 'Heading') {
    // Data is normalized at the boundary, so content is always in props.children
    const content = props.children || definition.defaultProps?.children;

    return (
      <div
        ref={wrapperRef}
        data-component-id={node.id}
        onClick={(e) => handleComponentClick(e, node.id)}
        onMouseDown={handleMouseDown}
        style={getWrapperStyle()}
      >
        <Component {...props}>{content}</Component>
      </div>
    );
  }

  // Handle Button text prop
  if (node.type === 'Button') {
    // Merge with defaultProps to ensure variant='primary' is applied by default
    const mergedProps = { ...definition.defaultProps, ...props };
    const text = mergedProps.text || 'Button';
    delete mergedProps.text;

    return (
      <div
        ref={wrapperRef}
        data-component-id={node.id}
        onClick={(e) => handleComponentClick(e, node.id)}
        onMouseDown={handleMouseDown}
        style={getWrapperStyle({ display: 'inline-block' })}
      >
        <Component {...mergedProps}>{text}</Component>
      </div>
    );
  }

  // Handle Icon component - needs icon prop from @wordpress/icons
  if (node.type === 'Icon') {
    // Get icon name from props and map to actual icon object
    const iconName = props.icon || 'wordpress';
    const iconProp = (wpIcons as Record<string, any>)[iconName] || (wpIcons as Record<string, any>).wordpress;
    delete props.icon;

    return (
      <div
        ref={wrapperRef}
        data-component-id={node.id}
        onClick={(e) => handleComponentClick(e, node.id)}
        onMouseDown={handleMouseDown}
        style={getWrapperStyle({ display: 'inline-block' })}
      >
        <Component icon={iconProp} {...props} />
      </div>
    );
  }

  // Handle interactive components (Modal, Popover, etc.) specially
  if (INTERACTIVE_COMPONENT_TYPES.includes(node.type)) {
    // For Modal in isolated view, render content directly without the overlay
    if (node.type === 'Modal') {
      // Render Modal content directly without the blocking overlay
      return (
        <div
          ref={wrapperRef}
          data-component-id={node.id}
          onClick={(e) => handleComponentClick(e, node.id)}
          onMouseDown={handleMouseDown}
          style={{
            ...getWrapperStyle(),
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            minWidth: '400px',
            maxWidth: '600px',
          }}
        >
          {/* Modal header */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e0e0e0',
            fontWeight: 600,
            fontSize: '14px',
          }}>
            {props.title || 'Modal Title'}
          </div>

          {/* Modal content */}
          <div style={{ padding: '24px' }}>
            {node.children && node.children.length > 0
              ? node.children.map((child) =>
                  <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />
                )
              : <div style={{ padding: '20px', color: '#666', textAlign: 'center' }}>Add components inside this Modal</div>}
          </div>
        </div>
      );
    }

    // For other interactive components, render normally
    const mergedProps = { ...definition.defaultProps, ...props };
    return (
      <div
        ref={wrapperRef}
        data-component-id={node.id}
        onClick={(e) => handleComponentClick(e, node.id)}
        onMouseDown={handleMouseDown}
        style={getWrapperStyle()}
      >
        <Component {...mergedProps}>
          {node.children && node.children.length > 0
            ? node.children.map((child) =>
                <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />
              )
            : null}
        </Component>
      </div>
    );
  }

  // DataViews component - special handling for data-driven component
  if (node.type === 'DataViews') {
    try {
      const dataSource = (props.dataSource || 'blog') as DataSetType;
      const viewType = props.viewType || 'table';
      const itemsPerPage = props.itemsPerPage || 10;

      // Auto-detect custom data or use mock data
      let mockData, fields;

      // SMART MODE: If data prop is provided, use it (regardless of dataSource)
      if (props.data && Array.isArray(props.data) && props.data.length > 0) {
        mockData = props.data;

        // Accept both 'columns' and 'fields' props (LLM might use either)
        const columnDefs = props.columns || props.fields;

        if (columnDefs && Array.isArray(columnDefs) && columnDefs.length > 0) {
          // Generate field definitions from column/field definitions
          fields = columnDefs.map((col: any) => {
            // Handle both string format and object format
            const id = typeof col === 'string' ? col : (col.id || col.accessor || col);
            const label = typeof col === 'string' ? col : (col.label || col.header || id);

            return {
              id,
              label,
              type: 'text',
              enableSorting: true,
              enableHiding: true,
              getValue: (item: any) => item[id],
              render: ({ item }: any) => String(item[id] || ''),
            };
          });
        } else {
          // Auto-detect columns from first data item
          const firstItem = mockData[0];
          fields = Object.keys(firstItem).map(key => ({
            id: key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            type: 'text',
            enableSorting: true,
            enableHiding: true,
            getValue: (item: any) => item[key],
            render: ({ item }: any) => String(item[key] || ''),
          }));
        }
      } else {
        // Fall back to mock data based on dataSource
        mockData = getMockData(dataSource);
        fields = getFieldDefinitions(dataSource);
      }

      // Validate data and fields exist
      if (!mockData || !Array.isArray(mockData) || mockData.length === 0) {
        console.warn(`DataViews: No data available for source "${dataSource}"`);
      }
      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        console.warn(`DataViews: No field definitions available for source "${dataSource}"`);
      }

      // Ensure valid sort field and visible fields
      const sortField = fields && fields.length > 0 ? fields[0].id : 'id';
      const visibleFieldIds = fields ? fields.map(f => f.id) : [];

      // Default view state based on design-time props
      const defaultView = {
        type: viewType,
        perPage: itemsPerPage,
        page: 1,
        filters: [],
        search: '',
        fields: visibleFieldIds,
        sort: {
          field: sortField,
          direction: 'asc' as const,
        },
      };

      // In play mode, use runtime view state; in design mode, use default
      const currentView = isPlayMode
        ? (playModeState.getState(node.id, 'view') ?? defaultView)
        : defaultView;

      // Apply search, filters, and sort to the data
      let processedData = mockData || [];

      // Apply search filter
      if (currentView.search) {
        const searchLower = currentView.search.toLowerCase();
        processedData = processedData.filter((item: any) => {
          // Search across all fields
          return fields.some((field: any) => {
            const value = field.getValue?.(item) ?? item[field.id];
            return String(value).toLowerCase().includes(searchLower);
          });
        });
      }

      // Apply filters
      if (currentView.filters && currentView.filters.length > 0) {
        try {
          processedData = processedData.filter((item: any) => {
            return currentView.filters.every((filter: any) => {
              try {
                // Get the field definition to use getValue if available
                const field = fields.find((f: any) => f.id === filter.field);
                const value = field?.getValue?.(item) ?? item[filter.field];
                const filterValue = filter.value;

                switch (filter.operator) {
                  // Equality operators
                  case 'is':
                    return value === filterValue;
                  case 'isNot':
                    return value !== filterValue;

                  // Array operators
                  case 'isAny':
                    return Array.isArray(filterValue) && filterValue.includes(value);
                  case 'isNone':
                    return Array.isArray(filterValue) && !filterValue.includes(value);
                  case 'isAll':
                    return Array.isArray(filterValue) && filterValue.every((v: any) => value.includes(v));

                  // Numerical comparison operators (without 'is' prefix)
                  case 'greaterThan':
                    return Number(value) > Number(filterValue);
                  case 'greaterThanOrEqual':
                    return Number(value) >= Number(filterValue);
                  case 'lessThan':
                    return Number(value) < Number(filterValue);
                  case 'lessThanOrEqual':
                    return Number(value) <= Number(filterValue);

                  // Text operators
                  case 'contains':
                    return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                  case 'notContains':
                    return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                  case 'startsWith':
                    return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());

                  // Default: pass filter if unknown operator
                  default:
                    console.warn(`Unknown filter operator: ${filter.operator}`);
                    return true;
                }
              } catch (error) {
                console.error('Error applying filter:', error, filter);
                return true; // Pass through on error to avoid crash
              }
            });
          });
        } catch (error) {
          console.error('Error in filter processing:', error);
          // Keep original data if filtering fails
        }
      }

      // Apply sorting
      if (currentView.sort) {
        const { field: sortField, direction } = currentView.sort;
        processedData = [...processedData].sort((a: any, b: any) => {
          const aValue = a[sortField];
          const bValue = b[sortField];

          if (aValue === bValue) return 0;

          const comparison = aValue < bValue ? -1 : 1;
          return direction === 'asc' ? comparison : -comparison;
        });
      }

      const mergedProps = {
        data: processedData,
        fields: fields || [],
        view: currentView,
        paginationInfo: {
          totalItems: processedData.length,
          totalPages: Math.ceil(processedData.length / (currentView.perPage || itemsPerPage)),
        },
        // REQUIRED: defaultLayouts tells DataViews which layout types are available
        // Without this, DataViews crashes with "Cannot convert undefined or null to object"
        defaultLayouts: {
          table: {},
          grid: {},
          list: {},
        },
        onChangeView: isPlayMode
          ? (newView: any) => playModeState.setState(node.id, 'view', newView)
          : () => {}, // Disabled in design mode
        getItemId: (item: any) => item?.id || `item-${Math.random()}`,
      };

      // Debug logging
      console.log('DataViews props:', {
        dataCount: mergedProps.data.length,
        fieldCount: mergedProps.fields.length,
        fieldIds: mergedProps.fields.map(f => f.id),
        fields: mergedProps.fields,
        sampleData: mergedProps.data.slice(0, 1),
        view: mergedProps.view,
        paginationInfo: mergedProps.paginationInfo,
        defaultLayouts: mergedProps.defaultLayouts,
      });

      // Test getValue functions on sample data
      if (mergedProps.data.length > 0) {
        const testItem = mergedProps.data[0];
        console.log('Testing getValue on first item:', {
          item: testItem,
          titleValue: mergedProps.fields[0]?.getValue?.(testItem),
        });
      }

      return (
        <div
          ref={wrapperRef}
          data-component-id={node.id}
          onClick={(e) => handleComponentClick(e, node.id)}
          onMouseDown={handleMouseDown}
          style={getWrapperStyle({ minHeight: '400px', height: '100%' })}
        >
          <Component {...mergedProps} />
        </div>
      );
    } catch (error) {
      console.error('DataViews rendering error:', error);
      return (
        <div
          ref={wrapperRef}
          data-component-id={node.id}
          onClick={(e) => handleComponentClick(e, node.id)}
          onMouseDown={handleMouseDown}
          style={{
            ...getWrapperStyle(),
            padding: '16px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#856404',
          }}
        >
          <strong>DataViews Error:</strong> Failed to render component. Check console for details.
        </div>
      );
    }
  }

  // Form controls and self-contained components (don't accept children)
  const formControls = [
    'TextControl',
    'TextareaControl',
    'SelectControl',
    'ToggleControl',
    'CheckboxControl',
    'SearchControl',
    'NumberControl',
    'RadioControl',
    'RangeControl',
    'ColorPicker',
    'ColorPalette',
    'Spacer',
    'Divider',
    'Spinner',
    'DateTimePicker',
    'FontSizePicker',
    'AnglePickerControl',
    'BoxControl',
    'BorderControl',
    'FormTokenField',
    'TabPanel',
  ];

  if (formControls.includes(node.type)) {
    const mergedProps = { ...definition.defaultProps, ...props };

    if (isPlayMode) {
      // In play mode: enable real interaction with runtime state
      // Determine the state prop name based on component type
      const statePropName = ['ToggleControl', 'CheckboxControl'].includes(node.type) ? 'checked' : 'value';

      // Get runtime value or fall back to design-time default
      const runtimeValue = playModeState.getState(node.id, statePropName) ?? props[statePropName];
      mergedProps[statePropName] = runtimeValue;

      // Wire up real onChange handler
      mergedProps.onChange = (newValue: any) => {
        playModeState.setState(node.id, statePropName, newValue);
      };
    } else {
      // In design mode: disable interaction
      mergedProps.onChange = () => {};
    }

    return (
      <div
        ref={wrapperRef}
        data-component-id={node.id}
        onClick={(e) => handleComponentClick(e, node.id)}
        onMouseDown={handleMouseDown}
        style={getWrapperStyle({ padding: '4px' })}
      >
        <Component {...mergedProps} />
      </div>
    );
  }

  // Regular components with children - merge with defaultProps
  const mergedProps = { ...definition.defaultProps, ...props };

  // Check if this is a Grid with grid lines enabled
  const showGridLines = node.type === 'Grid' && gridLinesVisible.has(node.id);

  // Check if Grid is empty
  const isEmptyGrid = node.type === 'Grid' && (!node.children || node.children.length === 0);

  return (
    <React.Fragment>
    <div
      ref={wrapperRef}
      data-component-id={node.id}
      onClick={(e) => handleComponentClick(e, node.id)}
      onMouseDown={handleMouseDown}
      style={{
        ...getWrapperStyle(),
        position: showGridLines ? 'relative' : undefined,
        opacity: draggedNodeId === node.id ? 0 : 1,
      }}
    >
      <Component {...mergedProps}>
        {node.children && node.children.length > 0
          ? node.children.map((child) =>
              <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />
            )
          : isEmptyGrid && !isPlayMode ? (
              <div style={{
                minHeight: '120px',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '14px',
                borderRadius: '2px',
                gridColumn: `1 / -1`, // Span all columns
              }}>
                Add items to the grid
              </div>
            ) : null}
      </Component>

      {/* Grid Lines Overlay */}
      {showGridLines && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <svg
            width="100%"
            height="100%"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {(() => {
              // Get grid properties
              const columns = mergedProps.columns || 2;
              // gap is a multiplier of 4px in WordPress components
              const gapMultiplier = typeof mergedProps.gap === 'number' ? mergedProps.gap : 0;
              const gapPx = gapMultiplier * 4;

              const elements = [];

              // Draw column boundaries and gutters
              for (let i = 1; i < columns; i++) {
                if (gapPx > 0) {
                  // Calculate gutter position
                  // In CSS Grid, gaps are between columns, so position is at end of column i-1
                  const gutterXPercent = (100 / columns) * i;

                  elements.push(
                    <rect
                      key={`gutter-${i}`}
                      x={`calc(${gutterXPercent}% - ${gapPx / 2}px)`}
                      y="0"
                      width={`${gapPx}px`}
                      height="100%"
                      fill="#3858e9"
                      opacity="0.15"
                    />
                  );

                  // Draw line in the center of the gutter
                  elements.push(
                    <line
                      key={`col-${i}`}
                      x1={`${gutterXPercent}%`}
                      y1="0"
                      x2={`${gutterXPercent}%`}
                      y2="100%"
                      stroke="#3858e9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  );
                } else {
                  // No gap - just draw divider lines at column boundaries
                  const xPercent = (100 / columns) * i;
                  elements.push(
                    <line
                      key={`col-${i}`}
                      x1={`${xPercent}%`}
                      y1="0"
                      x2={`${xPercent}%`}
                      y2="100%"
                      stroke="#3858e9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  );
                }
              }

              return elements;
            })()}
          </svg>
        </div>
      )}
    </div>
    </React.Fragment>
  );
};
