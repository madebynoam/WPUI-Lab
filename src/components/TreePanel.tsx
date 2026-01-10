"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import { useComponentTree, ROOT_GRID_ID } from "@/contexts/ComponentTreeContext";
import { ComponentNode, PatternNode } from "../types";
import { componentRegistry } from "@/componentRegistry";
import { patterns, assignIds } from "../patterns";
import { generateId } from "../utils/idGenerator";
import {
  normalizeComponentNode,
  normalizeComponentNodes,
} from "../utils/normalizeComponent";
import "./TreePanel.css";
import {
  DropdownMenu,
  MenuGroup,
  MenuItem,
} from "@wordpress/components";
import { ComponentInserter } from "./ComponentInserter";
import {
  moreVertical,
} from "@wordpress/icons";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  flattenTreeForDnd,
  buildTree,
  getProjection,
  removeChildrenOf,
  FlattenedNode,
  type Projection,
} from "../utils/dndTreeHelpers";
import { SortableTreeItem } from "./TreeItem/SortableTreeItem";
import { TreeItem } from "./TreeItem/TreeItem";

// Interactive component types that should be rendered in isolation when selected
export const INTERACTIVE_COMPONENT_TYPES = [
  "Modal",
  "Popover",
  "Dropdown",
  "Tooltip",
  "Notice",
];

// Containers that should accept children when selected for insertion
const INSERTION_CONTAINERS = [
  "HStack",
  "VStack",
  "Flex",
  "FlexBlock",
  "FlexItem",
  "Grid",
  "CardBody",
  "CardHeader",
  "CardFooter",
  "TabPanel",
  "PanelBody",
  "PanelRow",
];

// Helper: Convert PatternNode to ComponentNode with IDs
function patternNodesToComponentNodes(
  patternNodes: PatternNode[]
): ComponentNode[] {
  const nodes = patternNodes.map((patternNode) => ({
    id: generateId(),
    type: patternNode.type,
    name: patternNode.name || "",
    props: { ...patternNode.props },
    children: patternNode.children
      ? patternNodesToComponentNodes(patternNode.children)
      : [],
    interactions: [],
  }));

  // Normalize all nodes to ensure consistent data structure
  return normalizeComponentNodes(nodes);
}

// Sortable Page Item Component
interface SortablePageItemProps {
  page: any;
  isEditing: boolean;
  isCurrent: boolean;
  editingName: string;
  onEditNameChange: (name: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onPageClick: () => void;
  onNameClick: (e: React.MouseEvent) => void;
  onEditStart: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

const SortablePageItem: React.FC<SortablePageItemProps> = ({
  page,
  isEditing,
  isCurrent,
  editingName,
  onEditNameChange,
  onEditSubmit,
  onEditCancel,
  onPageClick,
  onNameClick,
  onEditStart,
  onDuplicate,
  onDelete,
  canDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        height: "36px",
        paddingRight: "8px",
        paddingLeft: "4px",
        backgroundColor: isCurrent ? "#f0f0f0" : "transparent",
        color: "#1e1e1e",
        borderRadius: "2px",
        fontSize: "13px",
        cursor: "default",
      }}
      {...attributes}
      onMouseDown={!isEditing ? () => {
        onPageClick();
      } : undefined}
    >
      {/* Drag handle */}
      {!isEditing && (
        <div
          {...listeners}
          style={{
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            padding: "0 4px",
            marginRight: "4px",
            opacity: 0.4,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
          </svg>
        </div>
      )}

      {isEditing ? (
        <input
          type="text"
          value={editingName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onBlur={onEditSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onEditSubmit();
            } else if (e.key === "Escape") {
              onEditCancel();
            }
          }}
          autoFocus
          style={{
            flex: 1,
            fontSize: "13px",
            padding: "2px 4px",
            border: "1px solid #3858e9",
            borderRadius: "2px",
            outline: "none",
            backgroundColor: "#fff",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <span
            style={{
              flex: 1,
              fontWeight: isCurrent ? 500 : 400,
              userSelect: "none",
              pointerEvents: "auto",
              cursor: "default",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNameClick(e);
            }}
          >
            {page.name}
          </span>
          <div
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <DropdownMenu
              icon={moreVertical}
              label="Page options"
              popoverProps={{ placement: "left-start" }}
            >
              {({ onClose }) => (
                <MenuGroup>
                  <MenuItem
                    onClick={() => {
                      onEditStart();
                      onClose();
                    }}
                  >
                    Rename
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      onDuplicate();
                      onClose();
                    }}
                  >
                    Duplicate
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                    isDestructive
                    disabled={!canDelete}
                  >
                    Delete
                  </MenuItem>
                </MenuGroup>
              )}
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
};

interface TreePanelProps {
  showInserter: boolean;
  onCloseInserter: () => void;
}

const indentationWidth = 16; // pixels per level of nesting

const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

export const TreePanel: React.FC<TreePanelProps> = ({
  showInserter,
  onCloseInserter,
}) => {
  const router = useRouter();
  const params = useParams();
  const binId = params.binId as string; // Get binId from URL for navigation
  const {
    tree,
    addComponent,
    insertComponent,
    selectedNodeIds,
    toggleNodeSelection,
    removeComponent,
    duplicateComponent,
    moveComponent,
    updateComponentName,
    pages,
    currentPageId,
    setCurrentPage,
    createPageWithId,
    deletePage,
    renamePage,
    duplicatePage,
    reorderPages,
    setTree,
    getParentById,
    getNodeById,
    copyComponent,
    pasteComponent,
    canPaste,
    isAgentExecuting,
    globalComponents,
    editingGlobalComponentId,
    setEditingGlobalComponent,
    deleteGlobalComponent,
    makeGlobalComponent,
    detachGlobalComponentInstance,
    insertGlobalComponentInstance,
  } = useComponentTree();

  const [inserterTab, setInserterTab] = useState<"blocks" | "patterns" | "components">(
    "blocks"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageName, setEditingPageName] = useState("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeName, setEditingNodeName] = useState("");

  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pageClickCountRef = useRef<Record<string, number>>({});
  const pageClickTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // dnd-kit state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [_offsetLeft, setOffsetLeft] = useState(0);
  const [currentProjection, setCurrentProjection] = useState<Projection | null>(
    null
  );

  // Configure dnd-kit sensors (disable when agent is executing)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
      // Disable sensor when agent is executing
      disabled: isAgentExecuting,
    })
  );

  // Get the current page object from the pages array
  const currentPage = pages.find((page) => page.id === currentPageId);

  // Flatten tree with collapsed filtering (matches dnd-kit SortableTree example)
  const flattenedItems = React.useMemo(() => {
    const flattenedTree = flattenTreeForDnd(tree);

    // Simple collapsed detection - matches dnd-kit example exactly
    const collapsedItems = flattenedTree.reduce<string[]>(
      (acc, { children, collapsed, id }) =>
        collapsed && children && children.length ? [...acc, id] : acc,
      []
    );

    // Remove children of activeId and collapsed nodes
    const filteredTree = removeChildrenOf(
      flattenedTree,
      activeId != null ? [activeId, ...collapsedItems] : collapsedItems
    );

    // Hide the root VStack (page node) from layers panel and adjust depth
    // Since we're removing root (depth 0), subtract 1 from all depths so direct children start at 0
    return filteredTree
      .filter((item) => item.id !== ROOT_GRID_ID)
      .map((item) => ({ ...item, depth: item.depth - 1 }));
  }, [tree, activeId]);

  const sortedIds = React.useMemo(
    () => flattenedItems.map((item) => item.id),
    [flattenedItems]
  );

  // Toggle collapse state directly on tree items
  const handleCollapse = useCallback(
    (id: string) => {
      const updateNodeCollapsed = (nodes: ComponentNode[]): ComponentNode[] => {
        return nodes.map((node) => {
          if (node.id === id) {
            return { ...node, collapsed: !node.collapsed };
          }
          if (node.children) {
            return { ...node, children: updateNodeCollapsed(node.children) };
          }
          return node;
        });
      };

      setTree(updateNodeCollapsed(tree));
    },
    [tree, setTree]
  );

  // Auto-expand collapsed parents when an item is selected
  const prevSelectedRef = useRef<string[]>([]);
  const treeItemRefsMap = useRef<Map<string, HTMLElement>>(new Map());
  const treeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run when selection actually changes
    const currentSelection = selectedNodeIds.join(",");
    const prevSelection = prevSelectedRef.current.join(",");

    if (currentSelection === prevSelection || selectedNodeIds.length === 0) {
      prevSelectedRef.current = selectedNodeIds;
      return;
    }

    prevSelectedRef.current = selectedNodeIds;
    const selectedId = selectedNodeIds[0];

    // Find all ancestor IDs and check if any are collapsed
    const findAncestorsAndCheckCollapsed = (
      nodes: ComponentNode[],
      targetId: string,
      ancestors: ComponentNode[] = []
    ): { ancestorIds: string[]; hasCollapsed: boolean } | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return {
            ancestorIds: ancestors.map((n) => n.id),
            hasCollapsed: ancestors.some((n) => n.collapsed === true),
          };
        }
        if (node.children) {
          const result = findAncestorsAndCheckCollapsed(
            node.children,
            targetId,
            [...ancestors, node]
          );
          if (result !== null) {
            return result;
          }
        }
      }
      return null;
    };

    const result = findAncestorsAndCheckCollapsed(tree, selectedId);

    // Only update tree if there are actually collapsed ancestors
    if (result && result.hasCollapsed && result.ancestorIds.length > 0) {
      const ancestorIds = result.ancestorIds;

      // Expand all collapsed ancestors
      const expandAncestors = (nodes: ComponentNode[]): ComponentNode[] => {
        return nodes.map((node) => {
          if (ancestorIds.includes(node.id) && node.collapsed) {
            return {
              ...node,
              collapsed: false,
              children: node.children
                ? expandAncestors(node.children)
                : undefined,
            };
          }
          if (node.children) {
            return { ...node, children: expandAncestors(node.children) };
          }
          return node;
        });
      };

      setTree(expandAncestors(tree));
    }
  }, [selectedNodeIds, tree, setTree]);

  // Auto-scroll to selected item
  useEffect(() => {
    // Don't auto-scroll during drag operations
    if (activeId) return;
    if (selectedNodeIds.length === 0) return;

    const selectedId = selectedNodeIds[0];
    const selectedElement = treeItemRefsMap.current.get(selectedId);

    if (selectedElement && treeContainerRef.current) {
      // Use a timeout to ensure the item is expanded first
      setTimeout(() => {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
  }, [selectedNodeIds, activeId]);

  // Handle adding component
  const handleAddComponent = (componentType: string) => {
    const targetId = selectedNodeIds[0] || ROOT_GRID_ID;
    const targetNode = getNodeById(targetId);

    // Special case: root VStack always accepts children
    if (targetId === ROOT_GRID_ID) {
      addComponent(componentType, ROOT_GRID_ID);
      setSearchTerm("");
      return;
    }

    // Check if target is an insertion container
    const isInsertionContainer =
      targetNode && INSERTION_CONTAINERS.includes(targetNode.type);

    // If it's an insertion container, insert as child
    if (isInsertionContainer) {
      addComponent(componentType, targetId);
      setSearchTerm("");
      return;
    }

    // Otherwise, insert as sibling (after the selected node)
    const parent = getParentById(targetId);
    if (!parent) {
      // Fallback: add to root if no parent found
      addComponent(componentType, ROOT_GRID_ID);
      setSearchTerm("");
      return;
    }

    // Find the index of the selected node in parent's children
    const siblingIndex =
      parent.children?.findIndex((child) => child.id === targetId) ?? -1;
    if (siblingIndex === -1) {
      // Fallback: add to parent if index not found
      addComponent(componentType, parent.id);
      setSearchTerm("");
      return;
    }

    // Create the new component node
    const definition = componentRegistry[componentType];
    if (!definition) {
      setSearchTerm("");
      return;
    }

    const children = definition.defaultChildren
      ? patternNodesToComponentNodes(definition.defaultChildren)
      : [];

    const newNode: ComponentNode = {
      id: generateId(),
      type: componentType,
      name: "",
      props: { ...definition.defaultProps },
      children,
      interactions: [],
    };

    const normalizedNode = normalizeComponentNode(newNode);

    // Insert component as sibling after selected node
    insertComponent(normalizedNode, parent.id, siblingIndex + 1);
    setSearchTerm("");
  };

  // Handle adding pattern
  const handleAddPattern = (patternId: string) => {
    const pattern = patterns.find((p) => p.id === patternId);
    if (!pattern) return;

    let patternWithIds = assignIds(pattern.tree);
    const targetId = selectedNodeIds[0] || ROOT_GRID_ID;
    const targetNode = getNodeById(targetId);

    // Special case: root Grid always accepts children
    if (targetId === ROOT_GRID_ID) {
      // Root is a Grid, so set default Grid child props on pattern root
      patternWithIds = {
        ...patternWithIds,
        props: {
          ...patternWithIds.props,
          gridColumnSpan: 12,
          height: 'auto',
        },
      };
      insertComponent(patternWithIds, undefined);
      setSearchTerm("");
      return;
    }

    // Check if target is an insertion container
    const isInsertionContainer =
      targetNode && INSERTION_CONTAINERS.includes(targetNode.type);

    // If it's an insertion container, insert as child
    if (isInsertionContainer) {
      // If target is a Grid, set default Grid child props for the pattern root
      if (targetNode.type === "Grid") {
        patternWithIds = {
          ...patternWithIds,
          props: {
            ...patternWithIds.props,
            gridColumnSpan: 12,
            height: 'auto',
          },
        };
      }
      insertComponent(patternWithIds, targetId);
      setSearchTerm("");
      return;
    }

    // Otherwise, insert as sibling (after the selected node)
    const parent = getParentById(targetId);
    if (!parent) {
      // Fallback: add to root if no parent found
      insertComponent(patternWithIds, undefined);
      setSearchTerm("");
      return;
    }

    // Find the index of the selected node in parent's children
    const siblingIndex =
      parent.children?.findIndex((child) => child.id === targetId) ?? -1;
    if (siblingIndex === -1) {
      // Fallback: add to parent if index not found
      insertComponent(patternWithIds, parent.id);
      setSearchTerm("");
      return;
    }

    // If parent is a Grid, set default Grid child props for the pattern root
    if (parent.type === "Grid") {
      patternWithIds = {
        ...patternWithIds,
        props: {
          ...patternWithIds.props,
          gridColumnSpan: 12,
          height: 'auto',
        },
      };
    }

    // Insert pattern as sibling after selected node
    insertComponent(patternWithIds, parent.id, siblingIndex + 1);
    setSearchTerm("");
  };

  const _registerNodeRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) {
        nodeRefs.current.set(id, el);
      } else {
        nodeRefs.current.delete(id);
      }
    },
    []
  );

  // Helper to find node recursively in tree
  const findNodeInTree = useCallback(
    (nodeId: string): any => {
      const search = (nodes: ComponentNode[]): any => {
        for (const node of nodes) {
          if (node.id === nodeId) return node;
          if (node.children) {
            const found = search(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      return search(tree);
    },
    [tree]
  );

  const findNodePath = useCallback(
    (
      nodes: ComponentNode[],
      targetId: string,
      path: string[] = []
    ): string[] | null => {
      for (const node of nodes) {
        const nextPath = [...path, node.id];
        if (node.id === targetId) {
          return nextPath;
        }
        if (node.children) {
          const found = findNodePath(node.children, targetId, nextPath);
          if (found) {
            return found;
          }
        }
      }
      return null;
    },
    []
  );

  // Scroll to selected node
  useEffect(() => {
    if (selectedNodeIds.length === 0) return;
    const el = nodeRefs.current.get(selectedNodeIds[0]);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedNodeIds]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setOverId(null);
    setOffsetLeft(0);
    setCurrentProjection(null);
  };

  // Handle drag move - track horizontal offset for depth calculation
  const handleDragMove = (event: DragMoveEvent) => {
    const { delta, over } = event;

    if (over) {
      setOverId(over.id as string);
      setOffsetLeft(delta.x);

      // Calculate projection based on horizontal offset
      if (activeId && over.id) {
        const fullFlattenedTree = flattenTreeForDnd(tree);
        const projection = getProjection(
          fullFlattenedTree,
          activeId,
          over.id as string,
          delta.x,
          indentationWidth,
          componentRegistry
        );
        setCurrentProjection(projection);
      }
    }
  };

  // Handle drag end - reorder component with depth
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const resetState = () => {
      setActiveId(null);
      setOverId(null);
      setOffsetLeft(0);
      setCurrentProjection(null);
    };

    if (!over || active.id === over.id) {
      resetState();
      return;
    }

    const fullFlattenedTree = flattenTreeForDnd(tree);
    const activeIndex = fullFlattenedTree.findIndex((n) => n.id === active.id);
    const overIndex = fullFlattenedTree.findIndex((n) => n.id === over.id);

    if (activeIndex === -1 || overIndex === -1) {
      resetState();
      return;
    }

    // Clone flattened tree
    const clonedItems: FlattenedNode[] = JSON.parse(
      JSON.stringify(fullFlattenedTree)
    );

    // Use arrayMove on flattened array
    const newItems = arrayMove(clonedItems, activeIndex, overIndex);

    // Update depth and parentId based on projection
    if (currentProjection) {
      newItems[overIndex].depth = currentProjection.depth;
      newItems[overIndex].parentId = currentProjection.parentId;
    }

    // Rebuild tree from flattened array
    const newTree = buildTree(newItems);

    // Update state once
    setTree(newTree);
    resetState();
  };

  // Get active item for DragOverlay
  const activeItem = activeId
    ? flattenedItems.find((item) => item.id === activeId)
    : null;

  return (
    <div
      style={{
        width: "280px",
        borderRight: "1px solid #ccc",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Pages Section */}
      {/* Pages Header */}
      <div
        style={{
          padding: "12px 8px 12px 8px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#666",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Pages
        </span>
        <button
          onClick={() => {
            const newPageId = createPageWithId();
            if (binId) {
              router.push(`/editor/${binId}/${newPageId}`);
            }
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "2px",
            color: "#666",
          }}
          aria-label="Add page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
          </svg>
        </button>
      </div>

      {/* Pages List */}
      <div style={{ padding: "12px 4px" }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              const oldIndex = pages.findIndex((p) => p.id === active.id);
              const newIndex = pages.findIndex((p) => p.id === over.id);
              reorderPages(oldIndex, newIndex);
            }
          }}
        >
          <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {pages.map((page) => (
                <SortablePageItem
                  key={page.id}
                  page={page}
                  isEditing={editingPageId === page.id}
                  isCurrent={currentPageId === page.id && !editingGlobalComponentId}
                  editingName={editingPageName}
                  onEditNameChange={setEditingPageName}
                  onEditSubmit={() => {
                    if (editingPageName.trim()) {
                      renamePage(page.id, editingPageName.trim());
                    }
                    setEditingPageId(null);
                  }}
                  onEditCancel={() => setEditingPageId(null)}
                  onPageClick={() => {
                    if (editingPageId !== page.id) {
                      // Exit isolation mode if active
                      if (editingGlobalComponentId) {
                        setEditingGlobalComponent(null);
                      }
                      setCurrentPage(page.id);
                      if (binId) {
                        router.push(`/editor/${binId}/${page.id}`);
                      }
                    }
                  }}
                  onNameClick={(e: React.MouseEvent) => {
                    if (!pageClickCountRef.current[page.id]) {
                      pageClickCountRef.current[page.id] = 0;
                    }
                    pageClickCountRef.current[page.id] += 1;

                    if (pageClickCountRef.current[page.id] === 1) {
                      // Select page on first click
                      if (editingPageId !== page.id) {
                        // Exit isolation mode if active
                        if (editingGlobalComponentId) {
                          setEditingGlobalComponent(null);
                        }
                        setCurrentPage(page.id);
                        if (binId) {
                          router.push(`/editor/${binId}/${page.id}`);
                        }
                      }
                      pageClickTimeoutRef.current[page.id] = setTimeout(() => {
                        pageClickCountRef.current[page.id] = 0;
                      }, 350);
                    } else if (pageClickCountRef.current[page.id] === 2) {
                      e.stopPropagation();
                      clearTimeout(pageClickTimeoutRef.current[page.id]);
                      pageClickCountRef.current[page.id] = 0;
                      setEditingPageId(page.id);
                      setEditingPageName(page.name);
                    }
                  }}
                  onEditStart={() => {
                    setEditingPageId(page.id);
                    setEditingPageName(page.name);
                  }}
                  onDuplicate={() => duplicatePage(page.id)}
                  onDelete={() => {
                    if (pages.length > 1) {
                      if (confirm(`Delete page "${page.name}"?`)) {
                        deletePage(page.id);
                      }
                    } else {
                      alert("Cannot delete the last page");
                    }
                  }}
                  canDelete={pages.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Global Components Section */}
      {globalComponents.length > 0 && (
        <>
          <div
            style={{
              padding: "12px 8px 12px 8px",
              borderTop: "1px solid #e0e0e0",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Components
            </span>
          </div>
          <div style={{ padding: "12px 4px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {globalComponents.map((component) => {
                const isEditing = editingGlobalComponentId === component.id;
                return (
                  <div
                    key={component.id}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "4px",
                      backgroundColor: isEditing ? "#e7f3ff" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onClick={() => setEditingGlobalComponent(component.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#666", flexShrink: 0 }}>
                        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                      </svg>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#1e1e1e",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {component.name || component.type}
                      </span>
                    </div>
                    <DropdownMenu
                      icon={moreVertical}
                      label="More options"
                      popoverProps={{
                        position: "bottom right",
                      }}
                    >
                      {() => (
                        <MenuGroup>
                          <MenuItem
                            onClick={(e: any) => {
                              e.stopPropagation();
                              // Count instances across all pages
                              let instanceCount = 0;
                              pages.forEach((page) => {
                                const countInTree = (nodes: ComponentNode[]): number => {
                                  let count = 0;
                                  nodes.forEach((node) => {
                                    if (node.isGlobalInstance && node.globalComponentId === component.id) {
                                      count++;
                                    }
                                    if (node.children) {
                                      count += countInTree(node.children);
                                    }
                                  });
                                  return count;
                                };
                                instanceCount += countInTree(page.tree);
                              });

                              const message = instanceCount > 0
                                ? `Delete "${component.name || component.type}"? This will detach all ${instanceCount} instance${instanceCount !== 1 ? 's' : ''} across your pages and convert them to normal components.`
                                : `Delete "${component.name || component.type}"?`;

                              if (confirm(message)) {
                                deleteGlobalComponent(component.id);
                              }
                            }}
                          >
                            Delete Component
                          </MenuItem>
                        </MenuGroup>
                      )}
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Layers Label */}
      <div
        style={{
          padding: "12px 8px 12px 8px",
          borderTop: "1px solid #e0e0e0",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#666",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Layers
        </span>
      </div>

      {/* Inserter Overlay */}
      <ComponentInserter
        showInserter={showInserter}
        onCloseInserter={onCloseInserter}
        onAddComponent={handleAddComponent}
        onAddPattern={handleAddPattern}
        onAddGlobalComponent={(globalComponentId) => {
          // Exit global component editing mode if active
          if (editingGlobalComponentId) {
            setEditingGlobalComponent(null);
          }

          // Find the selected parent for insertion
          // If the selected node is a global component definition (not in the tree), use ROOT_GRID_ID
          let parentId = ROOT_GRID_ID;
          if (selectedNodeIds.length > 0) {
            const selectedId = selectedNodeIds[0];
            // Don't use the global component itself as parent, and check if it exists in the tree
            const isInTree = getNodeById(selectedId) !== null;
            if (selectedId !== globalComponentId && isInTree) {
              parentId = selectedId;
            }
          }

          insertGlobalComponentInstance(globalComponentId, parentId);
          setSearchTerm("");
        }}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        inserterTab={inserterTab}
        onTabChange={setInserterTab}
        globalComponents={globalComponents}
      />

      {/* Tree */}
      <div ref={treeContainerRef} style={{ flex: 1, overflow: "auto" }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={measuring}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedIds}
            strategy={verticalListSortingStrategy}
          >
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {flattenedItems.map((item) => {
                const isSelected = selectedNodeIds.includes(item.id);
                const isRootVStack = item.id === ROOT_GRID_ID;
                const isOverItem = overId === item.id;
                const projectedDepth =
                  isOverItem && currentProjection
                    ? currentProjection.depth
                    : undefined;

                return (
                  <SortableTreeItem
                    key={item.id}
                    id={item.id}
                    value={item.id}
                    depth={item.depth}
                    indentationWidth={indentationWidth}
                    itemType={item.type}
                    itemName={item.name}
                    collapsed={item.collapsed}
                    childCount={item.children?.length || 0}
                    isSelected={isSelected}
                    isRootVStack={isRootVStack}
                    isGlobalInstance={item.isGlobalInstance}
                    currentPage={currentPage}
                    canPaste={canPaste}
                    indicator={isOverItem}
                    projectedDepth={projectedDepth}
                    onCollapse={() => handleCollapse(item.id)}
                    onMouseDown={(e: any) => {
                      if (editingNodeId === item.id) {
                        e.stopPropagation();
                        return;
                      }
                      const multiSelect = e.metaKey || e.ctrlKey;
                      const rangeSelect = e.shiftKey;
                      toggleNodeSelection(
                        item.id,
                        multiSelect,
                        rangeSelect,
                        tree
                      );
                    }}
                    onRemove={() => removeComponent(item.id)}
                    onDuplicate={() => duplicateComponent(item.id)}
                    onCopy={() => copyComponent(item.id)}
                    onPaste={() => pasteComponent(item.id)}
                    onMakeGlobal={() => {
                      const componentName = prompt('Enter a name for this global component:', item.name || item.type);
                      if (componentName) {
                        makeGlobalComponent(item.id, componentName);
                      }
                    }}
                    onDetachGlobal={() => {
                      if (confirm('Detach this instance from its global component? It will become a normal component.')) {
                        detachGlobalComponentInstance(item.id);
                      }
                    }}
                    onMoveUp={() => moveComponent(item.id, "up")}
                    onMoveDown={() => moveComponent(item.id, "down")}
                    editingNodeId={editingNodeId}
                    editingNodeName={editingNodeName}
                    onEditStart={() => {
                      setEditingNodeId(item.id);
                      const node = findNodeInTree(item.id);
                      setEditingNodeName(node?.name || "");
                    }}
                    onEditChange={(name) => setEditingNodeName(name)}
                    onEditEnd={(save) => {
                      if (save && editingNodeName.trim()) {
                        updateComponentName(item.id, editingNodeName.trim());
                      }
                      setEditingNodeId(null);
                    }}
                    wrapperRef={(node: HTMLLIElement) => {
                      if (node) {
                        treeItemRefsMap.current.set(item.id, node);
                      } else {
                        treeItemRefsMap.current.delete(item.id);
                      }
                    }}
                  />
                );
              })}
            </ul>
          </SortableContext>
          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeItem ? (
                <TreeItem
                  clone
                  depth={activeItem.depth}
                  indentationWidth={indentationWidth}
                  itemType={activeItem.type}
                  itemName={activeItem.name}
                  value={activeItem.id}
                  childCount={activeItem.children?.length || 0}
                />
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>
    </div>
  );
};
