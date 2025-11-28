import React, { useEffect, useCallback } from "react";
import { useComponentTree, ROOT_VSTACK_ID } from "../ComponentTreeContext";
import { ComponentNode } from "../types";
import { Breadcrumb } from "./Breadcrumb";
import { findParent } from "../utils/treeHelpers";
import { RenderNode } from "./RenderNode";
import { SelectionProvider } from "./SelectionContext";
import { SimpleDragProvider } from "./SimpleDragContext";
import { INTERACTIVE_COMPONENT_TYPES } from "./TreePanel";
import { componentRegistry } from "../componentRegistry";
import { privateApis as themePrivateApis } from "@wordpress/theme";
import { unlock } from "../utils/lock-unlock";

const { ThemeProvider } = unlock(themePrivateApis);

interface CanvasProps {
  showBreadcrumb?: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({ showBreadcrumb = true }) => {
  const {
    tree,
    selectedNodeIds,
    toggleNodeSelection,
    getNodeById,
    toggleGridLines,
    undo,
    redo,
    canUndo,
    canRedo,
    removeComponent,
    copyComponent,
    pasteComponent,
    canPaste,
    duplicateComponent,
    isPlayMode,
    pages,
    currentPageId,
  } = useComponentTree();

  // Get page-level properties from root VStack
  const rootVStack = getNodeById(ROOT_VSTACK_ID);
  const pageMaxWidth = rootVStack?.props.maxWidth ?? 1440;
  const pageBackgroundColor =
    rootVStack?.props.backgroundColor ?? "rgb(249, 250, 251)";
  const pagePadding = rootVStack?.props.padding ?? 20;

  // Get current page theme
  const currentPage = pages.find((p) => p.id === currentPageId);
  const pageTheme = currentPage?.theme ?? {
    primaryColor: "#3858e9",
    backgroundColor: "#ffffff",
  };

  // Find if a node is inside an interactive component
  const findInteractiveAncestor = useCallback(
    (nodeId: string): ComponentNode | null => {
      const findInTree = (nodes: ComponentNode[]): ComponentNode | null => {
        for (const node of nodes) {
          // Check if this node is interactive and contains the target
          if (INTERACTIVE_COMPONENT_TYPES.includes(node.type)) {
            const containsTarget = (n: ComponentNode): boolean => {
              if (n.id === nodeId) return true;
              if (n.children) {
                return n.children.some((child) => containsTarget(child));
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
    },
    [tree]
  );

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
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        selectedNodeIds.length > 0 &&
        !isInEditMode()
      ) {
        e.preventDefault();
        e.stopPropagation();
        copyComponent(selectedNodeIds[0]);
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

      // Escape to eject from interactive component isolated view
      if (e.key === "Escape" && selectedNodeIds.length > 0) {
        // Check if we're inside an interactive component
        const ancestor = findInteractiveAncestor(selectedNodeIds[0]);
        if (ancestor) {
          e.preventDefault();
          e.stopPropagation();
          // Return to root VStack to show full page view
          toggleNodeSelection(ROOT_VSTACK_ID, false);
        }
      }

      // Control+G to toggle grid lines for selected Grid component
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "g" &&
        selectedNodeIds.length > 0
      ) {
        const selectedNode = getNodeById(selectedNodeIds[0]);
        if (selectedNode && selectedNode.type === "Grid") {
          e.preventDefault();
          e.stopPropagation();
          toggleGridLines(selectedNodeIds[0]);
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
    getNodeById,
    findInteractiveAncestor,
    toggleGridLines,
    undo,
    redo,
    canUndo,
    canRedo,
    removeComponent,
    copyComponent,
    pasteComponent,
    canPaste,
    duplicateComponent,
    isInEditMode,
    isPlayMode,
  ]);

  // Find editing context - either interactive component or selected container
  const selectedNode =
    selectedNodeIds.length > 0 ? getNodeById(selectedNodeIds[0]) : null;

  // Check if selected node is an interactive component or a child of one
  const interactiveAncestor =
    selectedNodeIds.length > 0
      ? findInteractiveAncestor(selectedNodeIds[0])
      : null;
  const isInteractiveSelected = !!interactiveAncestor;

  // Figma-style: If a container component is selected, show its children as draggable context
  const editingContext =
    selectedNode &&
    componentRegistry[selectedNode.type]?.acceptsChildren &&
    !INTERACTIVE_COMPONENT_TYPES.includes(selectedNode.type)
      ? selectedNode
      : null;

  return (
    <SelectionProvider>
      <SimpleDragProvider>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          <div
            style={{
              flex: 1,
              padding: `${pagePadding * 4}px`,
              backgroundColor: pageBackgroundColor,
              overflow: "auto",
              display: "flex",
              justifyContent: "center",
            }}
            onMouseDown={(e) => {
              // Check if the click was on empty space (not on a component)
              const isClickOnComponent = (
                target: EventTarget | null
              ): boolean => {
                if (!target || !(target instanceof HTMLElement)) return false;
                // Traverse up the DOM to see if we're inside a component wrapper
                let current: HTMLElement | null = target as HTMLElement;
                while (current) {
                  if (current.hasAttribute("data-component-id")) {
                    return true;
                  }
                  current = current.parentElement;
                }
                return false;
              };

              // If clicked on empty space, select the page
              if (!isClickOnComponent(e.target)) {
                toggleNodeSelection(ROOT_VSTACK_ID, false);
              }
            }}
          >
            <ThemeProvider
              color={{
                primary: pageTheme.primaryColor,
                bg: pageTheme.backgroundColor,
              }}
            >
              <div style={{ width: "100%", maxWidth: `${pageMaxWidth}px` }}>
                {isInteractiveSelected && interactiveAncestor ? (
                  // Render only the interactive component in isolation
                  <div
                    style={{
                      padding: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "100%",
                    }}
                  >
                    <RenderNode
                      key={interactiveAncestor.id}
                      node={interactiveAncestor}
                      renderInteractive={true}
                    />
                  </div>
                ) : (
                  // Render full page tree with simple custom drag-drop
                  <>
                    {tree.map((node) => (
                      <RenderNode
                        key={node.id}
                        node={node}
                        renderInteractive={false}
                      />
                    ))}
                  </>
                )}
              </div>
            </ThemeProvider>
          </div>
          {showBreadcrumb && !isPlayMode && <Breadcrumb />}
        </div>
      </SimpleDragProvider>
    </SelectionProvider>
  );
};
