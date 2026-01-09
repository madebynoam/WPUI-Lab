import React, { useEffect, useCallback } from 'react';
import { useComponentTree, ROOT_GRID_ID } from '@/contexts/ComponentTreeContext';
import { useSelection } from '@/contexts/SelectionContext';
import { findParent } from '@/utils/treeHelpers';

/**
 * Component that handles keyboard shortcuts and has access to SelectionContext.
 * Must be rendered inside SelectionProvider.
 */
export const KeyboardHandler: React.FC<{
  isPlayMode: boolean;
  findInteractiveAncestor: (nodeId: string) => any;
}> = ({ isPlayMode, findInteractiveAncestor }) => {
  const {
    tree,
    selectedNodeIds,
    setSelectedNodeIds,
    toggleNodeSelection,
    getNodeById,
    toggleGridLines,
    toggleAllGridLines,
    undo,
    redo,
    canUndo,
    canRedo,
    removeComponent,
    copyComponent,
    cutComponent,
    pasteComponent,
    canPaste,
    duplicateComponent,
    reorderComponent,
    groupComponents,
    ungroupComponents,
    editingMode,
    setEditingMode,
    pages,
    currentPageId,
    isAgentExecuting,
    setViewportPreset,
    setZoomLevel,
    zoomLevel,
  } = useComponentTree();

  const { lastClickTimeRef, lastClickedIdRef } = useSelection();

  // Helper to check if we're in edit mode (text input, contenteditable, etc.)
  const isInEditMode = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const isEditable =
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      (activeElement as HTMLElement).contentEditable === "true" ||
      (activeElement as HTMLElement).classList.contains("rich-text-editor") ||
      !!(activeElement as HTMLElement).closest(".rich-text-editor");

    return isEditable;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.5, 2.0];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable all keyboard shortcuts when agent is executing
      if (isAgentExecuting) {
        return;
      }

      // In play mode, most shortcuts are disabled except Escape
      // (Escape is handled below to allow exiting play mode if needed)
      if (isPlayMode) {
        // Allow escaping play mode with Escape key
        if (e.key === "Escape") {
          // This will be handled by the play mode exit logic in TopBar
          // For now, just allow the event to propagate
        } else {
          // Block all other keyboard shortcuts in play mode
          return;
        }
      }

      // Cmd/Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && canUndo) {
        e.preventDefault();
        e.stopPropagation();
        undo();
        return;
      }

      // Cmd/Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z" && canRedo) {
        e.preventDefault();
        e.stopPropagation();
        redo();
        return;
      }

      // Viewport preset shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "1" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setViewportPreset('mobile');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "2" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setViewportPreset('tablet');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "3" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setViewportPreset('desktop');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "0" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setViewportPreset('full');
        return;
      }

      // Zoom controls
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
        if (currentIndex < ZOOM_LEVELS.length - 1) {
          setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
        if (currentIndex > 0) {
          setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "0") {
        e.preventDefault();
        e.stopPropagation();
        setZoomLevel(1.0);
        return;
      }

      // Backspace to remove selected component (skip if in edit mode)
      if (
        e.key === "Backspace" &&
        selectedNodeIds.length > 0 &&
        !isInEditMode()
      ) {
        e.preventDefault();
        e.stopPropagation();
        // Remove each selected component
        selectedNodeIds.forEach((id) => {
          if (id !== ROOT_GRID_ID) {
            // Don't delete root
            removeComponent(id);
          }
        });
        return;
      }

      // Cmd/Ctrl+C for copy
      // Check if user is selecting text first - let browser handle it
      const hasTextSelection = (window.getSelection()?.toString().length ?? 0) > 0;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        selectedNodeIds.length > 0 &&
        !isInEditMode() &&
        !hasTextSelection
      ) {
        e.preventDefault();
        e.stopPropagation();
        copyComponent(selectedNodeIds[0]);
        return;
      }

      // Cmd/Ctrl+X for cut
      // Check if user is selecting text first - let browser handle it
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "x" &&
        selectedNodeIds.length > 0 &&
        !isInEditMode() &&
        !hasTextSelection
      ) {
        e.preventDefault();
        e.stopPropagation();
        cutComponent(selectedNodeIds[0]);
        return;
      }

      // Cmd/Ctrl+V for paste
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "v" &&
        canPaste &&
        !isInEditMode()
      ) {
        e.preventDefault();
        e.stopPropagation();
        pasteComponent();
        return;
      }

      // Cmd/Ctrl+D for duplicate in same parent
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "d" &&
        selectedNodeIds.length > 0 &&
        !isInEditMode()
      ) {
        e.preventDefault();
        e.stopPropagation();
        duplicateComponent(selectedNodeIds[0]);
        return;
      }

      // Cmd+Option+Shift+J to copy page JSON to clipboard
      // Use e.code instead of e.key for keyboard layout independence
      if (
        e.metaKey &&
        e.altKey &&
        e.shiftKey &&
        e.code === "KeyJ" &&
        !isInEditMode()
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Find current page
        const currentPage = pages.find((p) => p.id === currentPageId);
        if (currentPage) {
          // Copy page JSON to clipboard
          const pageJson = JSON.stringify(currentPage, null, 2);
          navigator.clipboard.writeText(pageJson).then(() => {
            // Optional: Show a toast notification
            alert('Page JSON copied to clipboard!');
          }).catch(() => {
            alert('Failed to copy page JSON to clipboard');
          });
        }
        return;
      }

      // Cmd/Ctrl+Enter to go to page settings (select root VStack)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        toggleNodeSelection(ROOT_GRID_ID, false);
      }

      // Shift+Enter to select parent (skip if in edit mode)
      if (e.shiftKey && e.key === "Enter" && selectedNodeIds.length > 0 && !isInEditMode()) {
        e.preventDefault();
        e.stopPropagation();
        const parent = findParent(tree, selectedNodeIds[0]);
        if (parent) {
          toggleNodeSelection(parent.id, false);
        }
      }

      // Escape to deselect or eject from interactive component isolated view
      if (e.key === "Escape" && selectedNodeIds.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        // Check if we're inside an interactive component
        const ancestor = findInteractiveAncestor(selectedNodeIds[0]);
        if (ancestor) {
          // Return to root VStack to show full page view
          toggleNodeSelection(ROOT_GRID_ID, false);
        } else {
          // Normal case: deselect everything
          setSelectedNodeIds([]);
          // Reset to default state: no selection means root VStack context
          lastClickTimeRef.current = 0;
          lastClickedIdRef.current = ROOT_GRID_ID;
        }
      }

      // Cmd+G to group components (Mac: Cmd, Windows: Win key via metaKey)
      if (
        e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        e.key === "g" &&
        selectedNodeIds.length >= 1 &&
        !isInEditMode()
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Don't group if root is selected
        const hasRoot = selectedNodeIds.includes(ROOT_GRID_ID);
        if (!hasRoot) {
          groupComponents(selectedNodeIds);
        }
      }

      // Cmd+Shift+G to ungroup components
      if (
        e.metaKey &&
        !e.ctrlKey &&
        e.shiftKey &&
        e.key === "g" &&
        selectedNodeIds.length === 1 &&
        !isInEditMode()
      ) {
        e.preventDefault();
        e.stopPropagation();

        const selectedNode = getNodeById(selectedNodeIds[0]);
        // Only ungroup VStack or HStack
        if (selectedNode && (selectedNode.type === 'VStack' || selectedNode.type === 'HStack')) {
          ungroupComponents(selectedNodeIds[0]);
        }
      }

      // Ctrl+G to toggle all grid guides on/off (Cmd+G is for grouping)
      if (
        e.ctrlKey &&
        !e.metaKey &&
        e.key === "g" &&
        !isInEditMode()
      ) {
        e.preventDefault();
        e.stopPropagation();
        toggleAllGridLines();
      }

      // COMMENTED OUT: Mode switcher keyboard shortcuts (now using RichTextControl in Properties Panel)
      // V key to switch to selection mode (skip if in edit mode)
      // if (e.key === "v" && !isInEditMode()) {
      //   e.preventDefault();
      //   e.stopPropagation();
      //   setEditingMode('selection');
      //   return;
      // }

      // T key to switch to text mode (skip if in edit mode)
      // if (e.key === "t" && !isInEditMode()) {
      //   e.preventDefault();
      //   e.stopPropagation();
      //   setEditingMode('text');
      //   return;
      // }

      // Arrow keys to reorder items (Figma-style)
      // Only single selection, not in edit mode, and not root
      if (
        selectedNodeIds.length === 1 &&
        selectedNodeIds[0] !== ROOT_GRID_ID &&
        !isInEditMode() &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        const selectedId = selectedNodeIds[0];
        const parent = findParent(tree, selectedId);

        if (!parent || !parent.children || parent.children.length < 2) {
          return; // Can't reorder if no parent or only one child
        }

        // Determine layout direction based on parent type
        let isVertical = false;
        let isHorizontal = false;

        if (parent.type === "VStack") {
          isVertical = true;
        } else if (parent.type === "HStack") {
          isHorizontal = true;
        } else if (parent.type === "Grid") {
          // Grid supports both directions
          isVertical = true;
          isHorizontal = true;
        } else if (parent.type === "Flex") {
          // Check flex direction
          const direction = parent.props?.direction || "row";
          isVertical = direction === "column";
          isHorizontal = direction === "row";
        }

        // Find current index
        const currentIndex = parent.children.findIndex(
          (child) => child.id === selectedId
        );
        if (currentIndex === -1) return;

        let targetIndex = -1;

        // Determine target index based on arrow key and layout
        if (e.key === "ArrowUp" && isVertical) {
          targetIndex = currentIndex - 1;
        } else if (e.key === "ArrowDown" && isVertical) {
          targetIndex = currentIndex + 1;
        } else if (e.key === "ArrowLeft" && isHorizontal) {
          targetIndex = currentIndex - 1;
        } else if (e.key === "ArrowRight" && isHorizontal) {
          targetIndex = currentIndex + 1;
        }

        // Check if target index is valid
        if (targetIndex >= 0 && targetIndex < parent.children.length) {
          e.preventDefault();
          e.stopPropagation();

          const targetSibling = parent.children[targetIndex];
          // Determine position: if moving forward use 'after', if moving backward use 'before'
          const position = targetIndex > currentIndex ? "after" : "before";
          reorderComponent(selectedId, targetSibling.id, position);
        }
      }
    };

    // Attach to document to catch events earlier
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [
    isAgentExecuting,
    selectedNodeIds,
    tree,
    toggleNodeSelection,
    setSelectedNodeIds,
    undo,
    redo,
    canUndo,
    canRedo,
    removeComponent,
    copyComponent,
    cutComponent,
    pasteComponent,
    canPaste,
    duplicateComponent,
    reorderComponent,
    groupComponents,
    ungroupComponents,
    toggleGridLines,
    toggleAllGridLines,
    getNodeById,
    editingMode,
    setEditingMode,
    isPlayMode,
    isInEditMode,
    findInteractiveAncestor,
    lastClickTimeRef,
    lastClickedIdRef,
    pages,
    currentPageId,
  ]);

  // This component doesn't render anything
  return null;
};
