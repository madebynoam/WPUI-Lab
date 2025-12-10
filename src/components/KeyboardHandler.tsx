import React, { useEffect, useCallback } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '@/contexts/ComponentTreeContext';
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
    editingMode,
    setEditingMode,
    pages,
    currentPageId,
  } = useComponentTree();

  const { lastClickTimeRef, lastClickedIdRef } = useSelection();

  // Helper to check if we're in edit mode (text input, contenteditable, etc.)
  const isInEditMode = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const isEditable =
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      (activeElement as HTMLElement).contentEditable === "true";

    return isEditable;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          if (id !== ROOT_VSTACK_ID) {
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
        console.log('[KeyboardHandler] Cmd/Ctrl+X pressed, cutting component:', selectedNodeIds[0]);
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
        console.log('[KeyboardHandler] Copy page JSON shortcut triggered!');
        e.preventDefault();
        e.stopPropagation();

        // Find current page
        const currentPage = pages.find((p) => p.id === currentPageId);
        if (currentPage) {
          // Copy page JSON to clipboard
          const pageJson = JSON.stringify(currentPage, null, 2);
          navigator.clipboard.writeText(pageJson).then(() => {
            console.log('[KeyboardHandler] Page JSON copied to clipboard');
            // Optional: Show a toast notification
            alert('Page JSON copied to clipboard!');
          }).catch((err) => {
            console.error('[KeyboardHandler] Failed to copy page JSON:', err);
            alert('Failed to copy page JSON to clipboard');
          });
        } else {
          console.error('[KeyboardHandler] Current page not found:', currentPageId);
        }
        return;
      }

      // Cmd/Ctrl+Enter to go to page settings (select root VStack)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        toggleNodeSelection(ROOT_VSTACK_ID, false);
      }

      // Shift+Enter to select parent
      if (e.shiftKey && e.key === "Enter" && selectedNodeIds.length > 0) {
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

        console.log('[KeyboardHandler] Escape pressed. Before reset:', {
          selectedNodeIds: selectedNodeIds,
          lastClickTime: lastClickTimeRef.current,
          lastClickedId: lastClickedIdRef.current,
        });

        // Check if we're inside an interactive component
        const ancestor = findInteractiveAncestor(selectedNodeIds[0]);
        if (ancestor) {
          // Return to root VStack to show full page view
          toggleNodeSelection(ROOT_VSTACK_ID, false);
        } else {
          // Normal case: deselect everything
          setSelectedNodeIds([]);
          // Reset to default state: no selection means root VStack context
          lastClickTimeRef.current = 0;
          lastClickedIdRef.current = ROOT_VSTACK_ID;

          console.log('[KeyboardHandler] Escape - After reset:', {
            lastClickTime: lastClickTimeRef.current,
            lastClickedId: lastClickedIdRef.current,
          });
        }
      }

      // Cmd+G to group components (Mac: Cmd, Windows: Win key via metaKey)
      if (
        e.metaKey &&
        !e.ctrlKey &&
        e.key === "g" &&
        selectedNodeIds.length >= 2 &&
        !isInEditMode()
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Don't group if root is selected
        const hasRoot = selectedNodeIds.includes(ROOT_VSTACK_ID);
        if (!hasRoot) {
          groupComponents(selectedNodeIds);
        }
      }

      // Ctrl+G to toggle grid lines for selected Grid component
      if (
        e.ctrlKey &&
        !e.metaKey &&
        e.key === "g" &&
        selectedNodeIds.length > 0 &&
        !isInEditMode()
      ) {
        const selectedNode = getNodeById(selectedNodeIds[0]);
        if (selectedNode && selectedNode.type === "Grid") {
          e.preventDefault();
          e.stopPropagation();
          toggleGridLines(selectedNodeIds[0]);
        }
      }

      // V key to switch to selection mode (skip if in edit mode)
      if (e.key === "v" && !isInEditMode()) {
        e.preventDefault();
        e.stopPropagation();
        setEditingMode('selection');
        return;
      }

      // T key to switch to text mode (skip if in edit mode)
      if (e.key === "t" && !isInEditMode()) {
        e.preventDefault();
        e.stopPropagation();
        setEditingMode('text');
        return;
      }

      // Arrow keys to reorder items (Figma-style)
      // Only single selection, not in edit mode, and not root
      if (
        selectedNodeIds.length === 1 &&
        selectedNodeIds[0] !== ROOT_VSTACK_ID &&
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
    toggleGridLines,
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
