'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
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
  const { toggleNodeSelection, selectedNodeIds, tree, gridLinesVisible, isPlayMode, pages, currentPageId, currentProjectId, setPlayMode, updateComponentProps, setCurrentPage, reorderComponent } = useComponentTree();
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

  // Text editing state for inline contenteditable
  const [isEditingText, setIsEditingText] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);

  // Hover state for Figma-style hover behavior
  const [isHovered, setIsHovered] = useState(false);

  // Determine if this node should show hover border (Figma-style)
  const shouldShowHoverBorder = useCallback(() => {
    if (isPlayMode || node.id === ROOT_VSTACK_ID || isDragging || draggedNodeId) return false;
    if (!isHovered) return false;

    // If nothing is selected (or only root is selected), show hover on top-level items only
    const nothingSelected = selectedNodeIds.length === 0 ||
      (selectedNodeIds.length === 1 && selectedNodeIds[0] === ROOT_VSTACK_ID);

    if (nothingSelected) {
      const parent = findParent(tree, node.id);
      return parent?.id === ROOT_VSTACK_ID;
    }

    // If something is selected, show hover on siblings and parent's siblings (one level up)
    const selectedId = selectedNodeIds[0];
    if (selectedId === node.id) return false; // Don't hover the selected item itself

    // Check if node is a sibling of selected
    const selectedParent = findParent(tree, selectedId);
    const thisParent = findParent(tree, node.id);

    if (selectedParent && thisParent && selectedParent.id === thisParent.id) {
      // Same parent = siblings
      return true;
    }

    // Check if node is a sibling of selected's parent (one level up)
    if (selectedParent && selectedParent.id !== ROOT_VSTACK_ID) {
      const selectedGrandparent = findParent(tree, selectedParent.id);
      if (selectedGrandparent && thisParent && selectedGrandparent.id === thisParent.id) {
        // Same grandparent = parent's siblings
        return true;
      }
    }

    return false;
  }, [isPlayMode, node.id, isDragging, draggedNodeId, isHovered, selectedNodeIds, tree]);

  // Hover handlers for Figma-style hover
  const handleMouseEnter = useCallback(() => {
    if (!isPlayMode && !isDragging && !draggedNodeId) {
      setIsHovered(true);
    }
  }, [isPlayMode, isDragging, draggedNodeId]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Focus editable element when entering edit mode
  useEffect(() => {
    if (isEditingText && editableRef.current) {
      editableRef.current.focus();
      // Select all text for easy replacement
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(editableRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditingText]);

  if (!definition) {
    return <div>Unknown component: {node.type}</div>;
  }

  // Figma-style selection handler: Single click selects container, double click drills down
  const handleComponentClick = useCallback((e: React.MouseEvent, hitTargetId: string) => {
    // Check if the click originated from an editable input element
    // Only input fields should prevent selection so users can type in them
    // Buttons and tabs should be selectable in design mode
    const target = e.target as HTMLElement;
    const isEditableInput = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.tagName === 'SELECT' ||
                            target.closest('input') !== null ||
                            target.closest('textarea') !== null ||
                            target.closest('select') !== null;

    if (isEditableInput && !isPlayMode) {
      // Let the input handle the click, but still stop propagation
      // to prevent selecting parent components
      e.stopPropagation();
      return;
    }

    // Only stop propagation in design mode for selection control
    // In play mode, let events bubble naturally so interactive components work
    if (!isPlayMode) {
      e.stopPropagation();
    }

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

      // For Text/Heading/Badge/Button components, enter edit mode ONLY if already selected (Figma behavior)
      if ((node.type === 'Text' || node.type === 'Heading' || node.type === 'Badge' || node.type === 'Button') && selectedNodeIds.includes(node.id)) {
        setIsEditingText(true);
        // Focus will happen via useEffect
        // Reset click tracking
        lastClickTimeRef.current = 0;
        lastClickedIdRef.current = null;
        return;
      }

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
          // No path found (maybe clicking outside current selection), check if direct child of root
          console.log('[Figma Selection] No path found, checking if direct child of root');
          const clickedParent = findParent(tree, hitTargetId);

          if (clickedParent && clickedParent.id === ROOT_VSTACK_ID) {
            // Direct child of root - select it directly
            console.log('[Figma Selection] Direct child of root, selecting:', hitTargetId);
            toggleNodeSelection(hitTargetId, false, false, tree);
          } else {
            // Not a direct child - select top container
            console.log('[Figma Selection] Not direct child, selecting top container');
            const topContainer = findTopMostContainer(tree, hitTargetId, componentRegistry);
            console.log('[Figma Selection] Top container found:', topContainer ? { id: topContainer.id, type: topContainer.type } : null);
            if (topContainer) {
              toggleNodeSelection(topContainer.id, false, false, tree);
            }
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
      // Treat root-vstack as "no selection" for single-click purposes
      const currentSelection = selectedNodeIds[0];
      if (currentSelection && currentSelection !== ROOT_VSTACK_ID) {
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

        // No common ancestor found - check if direct child of root
        console.log('[Figma Selection] No common ancestor, checking if direct child of root');
        const clickedParent = findParent(tree, hitTargetId);

        if (clickedParent && clickedParent.id === ROOT_VSTACK_ID) {
          // Direct child of root - select it directly
          console.log('[Figma Selection] Direct child of root, selecting:', hitTargetId);
          toggleNodeSelection(hitTargetId, false, false, tree);
        } else {
          // Not a direct child - select topmost container
          console.log('[Figma Selection] Not direct child, selecting topmost container');
          const topContainer = findTopMostContainer(tree, hitTargetId, componentRegistry);
          if (topContainer) {
            console.log('[Figma Selection] Selecting topmost container:', { id: topContainer.id, type: topContainer.type });
            toggleNodeSelection(topContainer.id, false, false, tree);
          }
        }
        lastClickTimeRef.current = now;
        lastClickedIdRef.current = hitTargetId;
        return;
      }

      // SINGLE CLICK with no selection: Check if this is a direct child of root
      console.log('[Figma Selection] No selection, checking if direct child of root');
      const parent = findParent(tree, hitTargetId);

      if (parent && parent.id === ROOT_VSTACK_ID) {
        // Direct child of root - select it directly with one click
        console.log('[Figma Selection] Direct child of root, selecting:', hitTargetId);
        toggleNodeSelection(hitTargetId, false, false, tree);
      } else {
        // Not a direct child - find topmost container
        console.log('[Figma Selection] Not direct child, finding topmost container');
        const topContainer = findTopMostContainer(tree, hitTargetId, componentRegistry);
        console.log('[Figma Selection] Top container found:', topContainer ? { id: topContainer.id, type: topContainer.type } : null);
        if (topContainer) {
          toggleNodeSelection(topContainer.id, false, false, tree);
        }
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
            // In play mode, update the browser URL
            if (isPlayMode && currentProjectId) {
              window.location.pathname = `/play/${currentProjectId}/${interaction.targetId}`;
            } else {
              // In editor mode, just update the state
              setCurrentPage(interaction.targetId);
            }
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
            if (parent.type === 'VStack' || (parent.type === 'Flex' && parent.props?.direction === 'column')) {
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
    const draggedIndex = siblings.findIndex(child => child.id === draggedNodeId);
    const hoveredIndex = siblings.findIndex(child => child.id === hoveredSiblingId);

    if (thisIndex === -1 || draggedIndex === -1 || hoveredIndex === -1) {
      return false;
    }

    // Determine which items should animate based on drag direction
    let shouldAnimate = false;
    if (draggedIndex < hoveredIndex) {
      // Dragging forward (left→right): items between dragged and hovered shift left
      if (dropPosition === 'after') {
        shouldAnimate = thisIndex > draggedIndex && thisIndex <= hoveredIndex;
      } else {
        shouldAnimate = thisIndex > draggedIndex && thisIndex < hoveredIndex;
      }
    } else {
      // Dragging backward (right→left): items between hovered and dragged shift right
      if (dropPosition === 'before') {
        shouldAnimate = thisIndex >= hoveredIndex && thisIndex < draggedIndex;
      } else {
        shouldAnimate = thisIndex >= hoveredIndex && thisIndex < draggedIndex;
      }
    }

    if (shouldAnimate) {
      console.log(`[ShouldAnimate] Node ${node.id}: YES`, {
        thisIndex,
        draggedIndex,
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
        console.log(`[Transform Debug] Node ${node.id}: parent.type = '${parent.type}'`);

        // Get parent's spacing/gap (default to 8px if not set)
        const parentGap = parent.props?.gap !== undefined ?
          (typeof parent.props.gap === 'number' ? parent.props.gap * 4 : 8) : 8;

        // Check if parent uses vertical layout
        const isVerticalLayout =
          parent.type === 'VStack' ||
          (parent.type === 'Flex' && parent.props?.direction === 'column');

        if (isVerticalLayout) {
          // Vertical layout: shift up/down
          const siblings = parent.children || [];
          const draggedIndex = siblings.findIndex(child => child.id === draggedNodeId);
          const hoveredIndex = siblings.findIndex(child => child.id === hoveredSiblingId);

          const shiftAmount = draggedSize.height + parentGap;
          // Direction based on drag direction: forward (up→down) = shift up (-1), backward (down→up) = shift down (+1)
          const direction = draggedIndex < hoveredIndex ? -1 : 1;
          transform = `translateY(${direction * shiftAmount}px)`;
          console.log(`[Animation] Vertical node ${node.id}: translateY(${direction * shiftAmount}px)`, {
            draggedIndex,
            hoveredIndex,
            direction: draggedIndex < hoveredIndex ? 'forward' : 'backward',
            parentType: parent.type
          });
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
          const siblings = parent.children || [];
          const draggedIndex = siblings.findIndex(child => child.id === draggedNodeId);
          const hoveredIndex = siblings.findIndex(child => child.id === hoveredSiblingId);

          const shiftAmount = draggedSize.width + parentGap;
          // Direction based on drag direction: forward (left→right) = shift left (-1), backward (right→left) = shift right (+1)
          const direction = draggedIndex < hoveredIndex ? -1 : 1;
          transform = `translateX(${direction * shiftAmount}px)`;
          console.log(`[Animation] HStack node ${node.id}: translateX(${direction * shiftAmount}px)`, {
            draggedIndex,
            hoveredIndex,
            direction: draggedIndex < hoveredIndex ? 'forward' : 'backward'
          });
        }
      }
    }

    // Highlight hovered sibling
    const isHoveredSibling = hoveredSiblingId === node.id;
    const backgroundColor = isHoveredSibling ? 'rgba(56, 88, 233, 0.1)' : undefined;

    if (isHoveredSibling) {
      console.log(`[Hover] Highlighting node ${node.id} as hovered sibling`);
    }

    // Figma-style hover border - single pixel blue outline
    const showHoverBorder = shouldShowHoverBorder();
    const hoverOutline = showHoverBorder && !isSelected ? '1px solid #3858e9' : undefined;

    const baseStyle: React.CSSProperties = {
      outline: isSelected && !isRootVStack && !isPlayMode
        ? '2px solid #3858e9'
        : (hoverOutline || 'none'),
      // In play mode, don't set cursor - let native components use their natural cursor styles
      // In design mode, use default cursor for selection interactions
      cursor: isPlayMode ? undefined : 'default',
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

  // Helper: Build editor interaction props to pass directly to components
  const getEditorProps = (additionalStyles: React.CSSProperties = {}) => {
    return {
      ref: wrapperRef,
      'data-component-id': node.id,
      onClick: (e: React.MouseEvent) => handleComponentClick(e, node.id),
      onMouseDown: handleMouseDown,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      style: getWrapperStyle(additionalStyles),
    };
  };

  // Handle Button component - convert icon name to icon component
  if (node.type === 'Button' && props.icon) {
    const iconName = props.icon;
    const iconComponent = (wpIcons as Record<string, any>)[iconName];
    if (iconComponent) {
      props.icon = iconComponent;
    } else {
      // If icon name not found, remove it to avoid errors
      delete props.icon;
    }
  }

  // Handle components with special text/content props
  if (node.type === 'Text' || node.type === 'Heading' || node.type === 'Badge' || node.type === 'Button') {
    // Button uses 'text' prop, others use 'children'
    // For Button: if no text but has icon, allow icon-only (empty text)
    const content = node.type === 'Button'
      ? (props.text || (props.icon ? '' : (definition.defaultProps?.children || 'Button')))
      : (props.children || definition.defaultProps?.children);

    // For Button, handle special props
    let buttonStyle: React.CSSProperties = {};
    let buttonProps = { ...props };

    if (node.type === 'Button') {
      // Merge with defaultProps for Button
      buttonProps = { ...definition.defaultProps, ...props };
      delete buttonProps.text; // Remove text prop, will be passed as children

      // Handle stretchFullWidth
      const stretchFullWidth = buttonProps.stretchFullWidth;
      delete buttonProps.stretchFullWidth;
      if (stretchFullWidth) {
        buttonStyle = { width: '100%', justifyContent: 'center' };
      } else {
        // Prevent button from stretching in VStack with alignment='stretch'
        buttonStyle = { alignSelf: 'flex-start' };
      }

      // Handle disabled styling in design mode
      const isDisabled = buttonProps.disabled;
      if (!isPlayMode && isDisabled) {
        buttonStyle = {
          ...buttonStyle,
          opacity: '0.5',
          cursor: 'not-allowed',
          pointerEvents: 'none'
        };
      }

      // Apply style to button
      if (Object.keys(buttonStyle).length > 0) {
        buttonProps.style = buttonStyle;
      }

      // Disable button in play mode only
      buttonProps.disabled = isPlayMode ? buttonProps.disabled : false;
    } else {
      buttonProps = props;
    }

    // Render contenteditable wrapper preserving component styling (WYSIWYG)
    // NOTE: Edit mode still needs a wrapper div for the contenteditable functionality
    if (isEditingText) {
      return (
        <div
          ref={wrapperRef}
          data-component-id={node.id}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            ...getWrapperStyle(),
            outline: '2px solid #3858e9',
          }}
        >
          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            style={{
              cursor: 'text',
              outline: 'none', // Remove browser default outline
            }}
            onClick={(e) => {
              // Prevent clicks from bubbling up and changing selection
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              // Prevent mousedown from bubbling up to drag handlers
              e.stopPropagation();
            }}
            onPaste={(e) => {
              // Strip all formatting and insert plain text only
              e.preventDefault();
              const plainText = e.clipboardData.getData('text/plain');
              document.execCommand('insertText', false, plainText);
            }}
            onKeyDown={(e) => {
              // Block formatting shortcuts
              if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
                e.preventDefault();
                return;
              }

              // Save and exit edit mode on Escape
              if (e.key === 'Escape') {
                e.preventDefault();
                const newContent = editableRef.current?.textContent || '';
                if (node.type === 'Button') {
                  updateComponentProps(node.id, { text: newContent });
                } else {
                  updateComponentProps(node.id, { children: newContent });
                }
                setIsEditingText(false);
                return;
              }

              // Save and exit on Enter (for single-line text and buttons only, not headings)
              if (e.key === 'Enter' && (node.type === 'Text' || node.type === 'Button')) {
                e.preventDefault();
                setIsEditingText(false);
                return;
              }
            }}
            onBlur={() => {
              // Save plain text content and exit edit mode
              const newContent = editableRef.current?.textContent || '';
              if (node.type === 'Button') {
                updateComponentProps(node.id, { text: newContent });
              } else {
                updateComponentProps(node.id, { children: newContent });
              }
              setIsEditingText(false);
            }}
            onContextMenu={(e) => {
              // Disable right-click format menu
              e.preventDefault();
            }}
          >
            <Component {...buttonProps}>{content}</Component>
          </div>
        </div>
      );
    }

    // Normal rendering (non-edit mode) - pass editor props directly to component
    const editorProps = getEditorProps();
    const mergedStyle = { ...editorProps.style, ...buttonStyle };

    return (
      <Component
        {...editorProps}
        {...buttonProps}
        style={mergedStyle}
      >
        {content}
      </Component>
    );
  }

  // Handle Icon component - needs icon prop from @wordpress/icons
  if (node.type === 'Icon') {
    // Get icon name from props and map to actual icon object
    const iconName = props.icon || 'wordpress';
    const iconProp = (wpIcons as Record<string, any>)[iconName] || (wpIcons as Record<string, any>).wordpress;
    delete props.icon;

    // Map colorVariant to WordPress theme CSS variables
    const colorVariant = props.colorVariant || 'default';
    delete props.colorVariant;

    const colorMap: Record<string, string> = {
      'default': 'currentColor',
      // Content colors
      'content-brand': 'var(--wpds-color-fg-content-brand)',
      'content-neutral': 'var(--wpds-color-fg-content-neutral)',
      'content-neutral-weak': 'var(--wpds-color-fg-content-neutral-weak)',
      'content-error': 'var(--wpds-color-fg-content-error)',
      'content-error-weak': 'var(--wpds-color-fg-content-error-weak)',
      'content-success': 'var(--wpds-color-fg-content-success)',
      'content-success-weak': 'var(--wpds-color-fg-content-success-weak)',
      'content-caution': 'var(--wpds-color-fg-content-caution)',
      'content-caution-weak': 'var(--wpds-color-fg-content-caution-weak)',
      'content-info': 'var(--wpds-color-fg-content-info)',
      'content-info-weak': 'var(--wpds-color-fg-content-info-weak)',
      'content-warning': 'var(--wpds-color-fg-content-warning)',
      'content-warning-weak': 'var(--wpds-color-fg-content-warning-weak)',
      // Interactive colors
      'interactive-brand': 'var(--wpds-color-fg-interactive-brand)',
      'interactive-brand-active': 'var(--wpds-color-fg-interactive-brand-active)',
      'interactive-brand-disabled': 'var(--wpds-color-fg-interactive-brand-disabled)',
      'interactive-brand-strong': 'var(--wpds-color-fg-interactive-brand-strong)',
      'interactive-brand-strong-active': 'var(--wpds-color-fg-interactive-brand-strong-active)',
      'interactive-brand-strong-disabled': 'var(--wpds-color-fg-interactive-brand-strong-disabled)',
      'interactive-neutral': 'var(--wpds-color-fg-interactive-neutral)',
      'interactive-neutral-active': 'var(--wpds-color-fg-interactive-neutral-active)',
      'interactive-neutral-disabled': 'var(--wpds-color-fg-interactive-neutral-disabled)',
      'interactive-neutral-strong': 'var(--wpds-color-fg-interactive-neutral-strong)',
      'interactive-neutral-strong-active': 'var(--wpds-color-fg-interactive-neutral-strong-active)',
      'interactive-neutral-strong-disabled': 'var(--wpds-color-fg-interactive-neutral-strong-disabled)',
      'interactive-neutral-weak': 'var(--wpds-color-fg-interactive-neutral-weak)',
      'interactive-neutral-weak-disabled': 'var(--wpds-color-fg-interactive-neutral-weak-disabled)',
    };

    // Pass editor props directly to Icon component
    const editorProps = getEditorProps({ display: 'inline-block' });

    return (
      <Component
        {...editorProps}
        icon={iconProp}
        fill={colorMap[colorVariant]}
        {...props}
      />
    );
  }

  // Handle interactive components (Modal, Popover, etc.) specially
  if (INTERACTIVE_COMPONENT_TYPES.includes(node.type)) {
    // For Modal in isolated view, render content directly without the overlay
    if (node.type === 'Modal') {
      // Render Modal content directly without the blocking overlay
      const editorProps = getEditorProps();
      return (
        <div
          {...editorProps}
          style={{
            ...editorProps.style,
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

    // For other interactive components, render without wrapper
    const editorProps = getEditorProps();
    const mergedProps = {
      ...definition.defaultProps,
      ...editorProps,
      ...props,
      style: {
        ...editorProps.style,
        ...definition.defaultProps?.style,
        ...props.style,
      },
    };
    return (
      <Component {...mergedProps}>
        {node.children && node.children.length > 0
          ? node.children.map((child) =>
              <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />
            )
          : null}
      </Component>
    );
  }

  // DataViews component - special handling for data-driven component
  if (node.type === 'DataViews') {
    try {
      const dataSource = (props.dataSource || 'sites') as DataSetType;
      const viewType = props.viewType || 'table';
      const itemsPerPage = props.itemsPerPage || 10;

      console.log('[DataViews] Rendering with:', { dataSource, viewType, nodeId: node.id, propsDataSource: props.dataSource });

      // Auto-detect custom data or use mock data
      let mockData, fields;

      // SMART MODE: If dataSource is 'custom' and data prop is provided, use custom data
      // Otherwise, use mock data based on dataSource
      if (dataSource === 'custom' && props.data && Array.isArray(props.data) && props.data.length > 0) {
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
        console.log('[DataViews] Using mock data:', {
          dataSource,
          mockDataLength: mockData?.length,
          firstItem: mockData?.[0],
          fieldsLength: fields?.length
        });
      }

      // Validate data and fields exist
      if (!mockData || !Array.isArray(mockData) || mockData.length === 0) {
        console.warn(`DataViews: No data available for source "${dataSource}"`);
        // For custom datasource, show helpful error message
        if (dataSource === 'custom') {
          return (
            <div
              ref={isSelectable ? elementRef : undefined}
              onClick={handleNodeClick}
              style={{
                padding: '20px',
                border: '2px dashed #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                color: '#666',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                DataViews: Missing Data
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                This DataViews component has dataSource set to "custom" but no data is provided.
                {isSelectable && ' Select this component and ask the agent to generate data for it.'}
              </p>
            </div>
          );
        }
      }
      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        console.warn(`DataViews: No field definitions available for source "${dataSource}"`);
        // For custom datasource, show helpful error message
        if (dataSource === 'custom') {
          return (
            <div
              ref={isSelectable ? elementRef : undefined}
              onClick={handleNodeClick}
              style={{
                padding: '20px',
                border: '2px dashed #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                color: '#666',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                DataViews: Missing Columns
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                This DataViews component has dataSource set to "custom" but no columns are defined.
                {isSelectable && ' Select this component and ask the agent to generate data for it.'}
              </p>
            </div>
          );
        }
      }

      // Ensure valid sort field and visible fields
      const sortField = fields && fields.length > 0 ? fields[0].id : 'id';
      // Exclude 'thumbnail' from visible fields since it's used as mediaField
      const visibleFieldIds = fields ? fields.map(f => f.id).filter(id => id !== 'thumbnail') : [];

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
        // Specify thumbnail as the media field for grid/list views
        mediaField: 'thumbnail',
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

      // Calculate pagination
      const perPage = currentView.perPage || itemsPerPage;
      const currentPage = currentView.page || 1;
      const totalItems = processedData.length;
      const totalPages = Math.ceil(totalItems / perPage);

      // Slice data for current page
      const startIndex = (currentPage - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedData = processedData.slice(startIndex, endIndex);

      const mergedProps = {
        data: paginatedData,
        fields: fields || [],
        view: currentView,
        paginationInfo: {
          totalItems,
          totalPages,
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

      // DataViews needs a wrapper to be selectable (doesn't accept ref/event handlers)
      const editorProps = getEditorProps({ minHeight: '400px', height: '100%' });

      return (
        <div {...editorProps}>
          <Component key={`${node.id}-${dataSource}-${viewType}`} {...mergedProps} />
        </div>
      );
    } catch (error) {
      console.error('DataViews rendering error:', error);

      // Error fallback - render a div with error message
      const editorProps = getEditorProps();
      return (
        <div
          {...editorProps}
          style={{
            ...editorProps.style,
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
  ];

  if (formControls.includes(node.type)) {
    const mergedProps = {
      ...definition.defaultProps,
      ...props,
      style: {
        ...definition.defaultProps?.style,
        ...props.style,
        },
    };

    if (isPlayMode) {
      // In play mode: enable real interaction with runtime state
      // Determine the state prop name based on component type
      const statePropName = ['ToggleControl', 'CheckboxControl'].includes(node.type) ? 'checked' : 'value';

      // Get runtime value or fall back to design-time default
      let runtimeValue = playModeState.getState(node.id, statePropName) ?? props[statePropName];

      // CRITICAL: Ensure controlled inputs always have a defined value (never undefined)
      // React throws warning if value changes from defined to undefined
      if (runtimeValue === undefined) {
        if (statePropName === 'checked') {
          // Checkboxes and toggles default to false
          runtimeValue = false;
        } else if (node.type === 'RangeControl') {
          // RangeControl defaults to min value or 0
          runtimeValue = props.min ?? 0;
        } else {
          // Text inputs default to empty string
          runtimeValue = '';
        }
      }

      mergedProps[statePropName] = runtimeValue;

      // Wire up real onChange handler
      mergedProps.onChange = (newValue: any) => {
        playModeState.setState(node.id, statePropName, newValue);
      };
    } else {
      // In design mode: disable interaction
      mergedProps.onChange = () => {};
    }

    // Pass editor props directly to form controls
    const editorProps = getEditorProps({ padding: '4px' });
    const finalProps = {
      ...mergedProps,
      ...editorProps,
      style: {
        ...editorProps.style,
        ...mergedProps.style,
      },
    };

    return <Component {...finalProps} />;
  }

  // Regular components with children - merge with defaultProps
  const mergedProps = {
    ...definition.defaultProps,
    ...props,
    style: {
      ...definition.defaultProps?.style,
      ...props.style,
    },
  };

  // Apply layout constraints for VStack and HStack
  const maxWidthPresets: Record<string, string> = {
    sm: '640px',
    md: '960px',
    lg: '1280px',
    xl: '1440px',
    full: '100%',
  };

  if (node.type === 'VStack' || node.type === 'HStack') {
    const maxWidth = props.maxWidth || 'full';
    const maxWidthCustom = props.maxWidthCustom || '';
    const alignSelf = props.alignSelf || 'stretch';
    const padding = props.padding || '';

    // Apply maxWidth - always set width to 100% to ensure stretching
    if (maxWidth === 'custom' && maxWidthCustom) {
      mergedProps.style = { ...mergedProps.style, width: '100%', maxWidth: maxWidthCustom };
    } else if (maxWidth !== 'full') {
      mergedProps.style = { ...mergedProps.style, width: '100%', maxWidth: maxWidthPresets[maxWidth] || '100%' };
    } else {
      // Even for 'full', ensure width is 100%
      mergedProps.style = { ...mergedProps.style, width: '100%' };
    }

    // Apply alignSelf (for horizontal positioning when maxWidth is set)
    if (alignSelf === 'center') {
      mergedProps.style = { ...mergedProps.style, marginLeft: 'auto', marginRight: 'auto' };
    } else if (alignSelf === 'start') {
      mergedProps.style = { ...mergedProps.style, marginRight: 'auto' };
    } else if (alignSelf === 'end') {
      mergedProps.style = { ...mergedProps.style, marginLeft: 'auto' };
    }

    // Apply padding
    if (padding) {
      mergedProps.style = { ...mergedProps.style, padding };
    }
  }

  // Check if this is a Grid with grid lines enabled
  const showGridLines = node.type === 'Grid' && gridLinesVisible.has(node.id);

  // Check if Grid is empty
  const isEmptyGrid = node.type === 'Grid' && (!node.children || node.children.length === 0);

  // Pass editor props directly to regular components
  const editorProps = getEditorProps();
  const finalProps = {
    ...editorProps,
    ...mergedProps,
    style: {
      ...editorProps.style,
      ...mergedProps.style,
      position: showGridLines ? 'relative' : (editorProps.style?.position || mergedProps.style?.position),
      opacity: draggedNodeId === node.id ? 0 : 1,
    },
  };

  return (
    <React.Fragment>
      <Component {...finalProps}>
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
      </Component>
    </React.Fragment>
  );
};
