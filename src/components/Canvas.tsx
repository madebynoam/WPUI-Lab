import React, { useEffect, useCallback, useMemo } from "react";
import { useComponentTree, ROOT_GRID_ID } from "@/contexts/ComponentTreeContext";
import { useAgentDebug } from "@/contexts/AgentDebugContext";
import { ComponentNode } from "@/types";
import { ViewportFrame } from "./ViewportFrame";
import { RenderNode } from "./RenderNode";
import { SelectionProvider } from "@/contexts/SelectionContext";
import { SimpleDragProvider } from "@/contexts/SimpleDragContext";
import { INTERACTIVE_COMPONENT_TYPES } from "./TreePanel";
import { componentRegistry } from "@/componentRegistry";
import { privateApis as themePrivateApis } from "@wordpress/theme";
import { unlock } from "@/utils/wordpressPrivateApis";
import { AgentDebugUI } from "./AgentDebugUI";
import { KeyboardHandler } from "./KeyboardHandler";

const { ThemeProvider } = unlock(themePrivateApis);

export const Canvas: React.FC = () => {
  const {
    tree,
    selectedNodeIds,
    setSelectedNodeIds,
    getNodeById,
    isPlayMode,
    projects,
    currentProjectId,
    globalComponents,
    editingGlobalComponentId,
    updateGlobalComponent,
  } = useComponentTree();

  const { setIsDebugMode } = useAgentDebug();

  // Check URL parameter for debug mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const debugMode = params.get('debug_agent') === 'true';
      setIsDebugMode(debugMode);
    }
  }, [setIsDebugMode]);

  // Get current project and layout settings (project-wide)
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectTheme = currentProject?.theme ?? {
    primaryColor: "#3858e9",
    backgroundColor: "#ffffff",
  };
  const projectLayout = currentProject?.layout ?? {
    maxWidth: 0, // 0 means no constraint (100%)
    padding: 0,
    spacing: 4,
  };

  // Use project-level layout settings (applies to all pages)
  const pagePadding = projectLayout.padding ?? 0;
  const pageSpacing = projectLayout.spacing ?? 4;

  // Apply pageSpacing to root VStack
  const modifiedTree = useMemo(() => {
    return tree.map((node) => {
      if (node.id === ROOT_GRID_ID) {
        return {
          ...node,
          props: {
            ...node.props,
            spacing: pageSpacing,
          },
        };
      }
      return node;
    });
  }, [tree, pageSpacing]);

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
  const _editingContext =
    selectedNode &&
    componentRegistry[selectedNode.type]?.acceptsChildren &&
    !INTERACTIVE_COMPONENT_TYPES.includes(selectedNode.type)
      ? selectedNode
      : null;

  // Find the global component being edited
  const editingGlobalComponent = editingGlobalComponentId
    ? globalComponents.find((gc) => gc.id === editingGlobalComponentId)
    : null;

  // Wrap the global component in an array to render it like a tree
  const globalComponentTree = editingGlobalComponent ? [editingGlobalComponent] : null;

  // In play mode or full width, render single page content inside ViewportFrame
  // Otherwise, ViewportFrame renders all pages internally
  const singlePageContent = isPlayMode ? (
    <div
      style={{
        flex: 1,
        padding: `${pagePadding * 4}px`,
        backgroundColor: '#FCFCFC',
        overflow: "auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
      onMouseDown={(e) => {
        const isClickOnComponent = (
          target: EventTarget | null
        ): boolean => {
          if (!target || !(target instanceof HTMLElement)) return false;
          let current: HTMLElement | null = target as HTMLElement;
          while (current) {
            if (current.hasAttribute("data-component-id")) {
              return true;
            }
            current = current.parentElement;
          }
          return false;
        };

        if (!isClickOnComponent(e.target)) {
          setSelectedNodeIds([]);
        }
      }}
    >
      <ThemeProvider
        color={{
          primary: projectTheme.primaryColor,
          bg: projectTheme.backgroundColor,
        }}
      >
        <div style={{ width: "100%", height: "100%", alignSelf: "stretch" }}>
          {editingGlobalComponent && globalComponentTree ? (
            <div
              style={{
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100%",
              }}
            >
              {globalComponentTree.map((node) => (
                <RenderNode
                  key={node.id}
                  node={node}
                  renderInteractive={false}
                />
              ))}
            </div>
          ) : isInteractiveSelected && interactiveAncestor ? (
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
            <>
              {modifiedTree.map((node) => (
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
  ) : null;

  return (
    <SelectionProvider>
      <SimpleDragProvider>
        <KeyboardHandler
          isPlayMode={isPlayMode}
          findInteractiveAncestor={findInteractiveAncestor}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            userSelect: "none",
            position: "relative",
          }}
        >
          <ViewportFrame>
            {singlePageContent}
          </ViewportFrame>

          {/* Debug UI - rendered in canvas area */}
          <AgentDebugUI />
        </div>
      </SimpleDragProvider>
    </SelectionProvider>
  );
};
