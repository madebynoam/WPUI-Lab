import React, { useEffect, useCallback } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { Breadcrumb } from './Breadcrumb';
import { findParent } from '../utils/treeHelpers';
import { RenderNode } from './RenderNode';
import { INTERACTIVE_COMPONENT_TYPES } from './TreePanel';

export const Canvas: React.FC = () => {
  const { tree, selectedNodeIds, toggleNodeSelection, getNodeById, toggleGridLines, undo, redo, canUndo, canRedo, removeComponent, copyComponent, pasteComponent, canPaste, duplicateComponent } = useComponentTree();

  // Get page-level properties from root VStack
  const rootVStack = getNodeById(ROOT_VSTACK_ID);
  const pageMaxWidth = rootVStack?.props.maxWidth ?? 1440;
  const pageBackgroundColor = rootVStack?.props.backgroundColor ?? 'rgb(249, 250, 251)';
  const pagePadding = rootVStack?.props.padding ?? 20;

  // Find if a node is inside an interactive component
  const findInteractiveAncestor = useCallback((nodeId: string): ComponentNode | null => {
    const findInTree = (nodes: ComponentNode[]): ComponentNode | null => {
      for (const node of nodes) {
        // Check if this node is interactive and contains the target
        if (INTERACTIVE_COMPONENT_TYPES.includes(node.type)) {
          const containsTarget = (n: ComponentNode): boolean => {
            if (n.id === nodeId) return true;
            if (n.children) {
              return n.children.some(child => containsTarget(child));
            }
            return false;
          };

          if (containsTarget(node)) {
            return node;
          }
        }

        // Recurse into children
        if (node.children) {
          const found = findInTree(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInTree(tree);
  }, [tree]);

  // Helper to check if we're in edit mode (text input, contenteditable, etc.)
  const isInEditMode = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const isEditable =
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true';

    return isEditable;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        undo();
        return;
      }

      // Cmd/Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z' && canRedo) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete key to remove selected component (skip if in edit mode)
      if (e.key === 'Delete' && selectedNodeIds.length > 0 && !isInEditMode()) {
        e.preventDefault();
        // Remove each selected component
        selectedNodeIds.forEach(id => {
          if (id !== ROOT_VSTACK_ID) { // Don't delete root
            removeComponent(id);
          }
        });
        return;
      }

      // Cmd/Ctrl+C for copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedNodeIds.length > 0 && !isInEditMode()) {
        e.preventDefault();
        copyComponent(selectedNodeIds[0]);
        return;
      }

      // Cmd/Ctrl+V for paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && canPaste && !isInEditMode()) {
        e.preventDefault();
        pasteComponent();
        return;
      }

      // Cmd/Ctrl+D for duplicate in same parent
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNodeIds.length > 0 && !isInEditMode()) {
        e.preventDefault();
        duplicateComponent(selectedNodeIds[0]);
        return;
      }

      // Cmd/Ctrl+Enter to go to page settings (select root VStack)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        toggleNodeSelection(ROOT_VSTACK_ID, false);
      }

      // Shift+Enter to select parent
      if (e.shiftKey && e.key === 'Enter' && selectedNodeIds.length > 0) {
        e.preventDefault();
        const parent = findParent(tree, selectedNodeIds[0]);
        if (parent) {
          toggleNodeSelection(parent.id, false);
        }
      }

      // Escape to eject from interactive component isolated view
      if (e.key === 'Escape' && selectedNodeIds.length > 0) {
        // Check if we're inside an interactive component
        const ancestor = findInteractiveAncestor(selectedNodeIds[0]);
        if (ancestor) {
          e.preventDefault();
          // Return to root VStack to show full page view
          toggleNodeSelection(ROOT_VSTACK_ID, false);
        }
      }

      // Control+G to toggle grid lines for selected Grid component
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && selectedNodeIds.length > 0) {
        const selectedNode = getNodeById(selectedNodeIds[0]);
        if (selectedNode && selectedNode.type === 'Grid') {
          e.preventDefault();
          toggleGridLines(selectedNodeIds[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, tree, toggleNodeSelection, getNodeById, findInteractiveAncestor, toggleGridLines, undo, redo, canUndo, canRedo, removeComponent, copyComponent, pasteComponent, canPaste, duplicateComponent, isInEditMode]);

  // Check if selected node is an interactive component or a child of one
  const interactiveAncestor = selectedNodeIds.length > 0 ? findInteractiveAncestor(selectedNodeIds[0]) : null;
  const isInteractiveSelected = !!interactiveAncestor;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          padding: `${pagePadding}px`,
          backgroundColor: pageBackgroundColor,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}
        onMouseDown={(e) => {
          // Deselect when clicking canvas background
          if (e.target === e.currentTarget) {
            toggleNodeSelection(ROOT_VSTACK_ID, false);
          }
        }}
      >
        <div style={{ width: '100%', maxWidth: `${pageMaxWidth}px` }}>
          {isInteractiveSelected && interactiveAncestor ? (
            // Render only the interactive component in isolation
            <div style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100%',
            }}>
              <RenderNode key={interactiveAncestor.id} node={interactiveAncestor} renderInteractive={true} />
            </div>
          ) : (
            // Render full page tree for normal components (skip interactive components)
            tree.map((node) => <RenderNode key={node.id} node={node} renderInteractive={false} />)
          )}
        </div>
      </div>
      <Breadcrumb />
    </div>
  );
};
