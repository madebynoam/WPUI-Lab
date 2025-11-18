import React, { useState, useEffect, useRef } from 'react';
import { useComponentTree } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import {
  Button,
  __experimentalTreeGrid as TreeGrid,
  __experimentalTreeGridRow as TreeGridRow,
  __experimentalTreeGridCell as TreeGridCell,
  DropdownMenu,
  MenuGroup,
  MenuItem,
} from '@wordpress/components';
import { moreVertical, chevronDown, chevronRight, dragHandle } from '@wordpress/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface TreeNodeProps {
  node: ComponentNode;
  level: number;
  positionInSet: number;
  setSize: number;
  allNodes: ComponentNode[];
  expandedNodes: Set<string>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  dragOverId: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  positionInSet,
  setSize,
  allNodes,
  expandedNodes,
  setExpandedNodes,
  nodeRefs,
  dragOverId,
  dropPosition,
}) => {
  const { selectedNodeId, setSelectedNodeId, removeComponent, duplicateComponent, moveComponent } = useComponentTree();
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes.has(node.id);
  const definition = componentRegistry[node.type];
  const canAcceptChildren = definition?.acceptsChildren ?? false;

  // Drag & drop - separate draggable (for handle) and droppable (for row)
  const {
    attributes,
    listeners,
    setNodeRef: setDragHandleRef,
    transform,
    isDragging,
  } = useDraggable({
    id: node.id,
    data: { type: node.type }
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: node.id,
    data: { type: node.type, acceptsChildren: canAcceptChildren }
  });

  const showDropBefore = dragOverId === node.id && dropPosition === 'before';
  const showDropAfter = dragOverId === node.id && dropPosition === 'after';
  const showDropInside = dragOverId === node.id && dropPosition === 'inside';

  // Set droppable ref and track in nodeRefs
  const setDroppableRef = (el: HTMLDivElement | null) => {
    setDropRef(el);
    if (el) {
      nodeRefs.current.set(node.id, el);
    } else {
      nodeRefs.current.delete(node.id);
    }
  };

  const renderChildren = () => {
    if (!isExpanded || !hasChildren) return null;
    return node.children!.map((child, index) => (
      <TreeNode
        key={child.id}
        node={child}
        level={level + 1}
        positionInSet={index + 1}
        setSize={node.children!.length}
        allNodes={allNodes}
        expandedNodes={expandedNodes}
        setExpandedNodes={setExpandedNodes}
        nodeRefs={nodeRefs}
        dragOverId={dragOverId}
        dropPosition={dropPosition}
      />
    ));
  };

  const toggleExpand = () => {
    if (!hasChildren) return;
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <>
      {showDropBefore && (
        <div style={{
          height: '3px',
          backgroundColor: '#2271b1',
          marginLeft: `${(level - 1) * 12 + 8}px`,
          borderRadius: '2px',
          boxShadow: '0 0 4px rgba(34, 113, 177, 0.5)',
        }} />
      )}
      <TreeGridRow
        level={level}
        positionInSet={positionInSet}
        setSize={setSize}
        isExpanded={hasChildren ? isExpanded : undefined}
      >
        <TreeGridCell>
          {(props) => {
            // Combine refs from TreeGridCell and droppable
            const combinedRef = (el: HTMLDivElement | null) => {
              setDroppableRef(el);
              if (props.ref) {
                if (typeof props.ref === 'function') {
                  (props.ref as any)(el);
                } else {
                  (props.ref as any).current = el;
                }
              }
            };

            return (
              <div
                {...props}
                ref={combinedRef}
                style={{
                ...props.style,
                ...style,
                display: 'flex',
                alignItems: 'center',
                height: '32px',
                paddingLeft: `${(level - 1) * 12 + 8}px`,
                paddingRight: '8px',
                backgroundColor: isSelected ? '#2271b1' : (showDropInside ? '#cce5ff' : 'transparent'),
                color: isSelected ? '#fff' : '#1e1e1e',
                cursor: isDragging ? 'grabbing' : 'pointer',
                transition: 'background-color 0.1s ease, border 0.1s ease',
                border: showDropInside ? '2px solid #2271b1' : '2px solid transparent',
                borderRadius: showDropInside ? '4px' : '0',
                margin: showDropInside ? '2px 0' : '0',
              }}
              onClick={() => setSelectedNodeId(node.id)}
              onMouseEnter={(e) => {
                if (!isSelected && !showDropInside) {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !showDropInside) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Drag Handle */}
              <button
                ref={setDragHandleRef}
                {...attributes}
                {...listeners}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'grab',
                  padding: '4px',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  opacity: 0.6,
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label="Drag to reorder"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 16.5h10V15H7v1.5zm0-9V9h10V7.5H7z" />
                </svg>
              </button>
              {/* Expander */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: hasChildren ? 'pointer' : 'default',
                  padding: '4px',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  opacity: hasChildren ? 1 : 0,
                  transition: 'transform 0.1s ease',
                  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                disabled={!hasChildren}
              >
                {hasChildren && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z" />
                  </svg>
                )}
              </button>

              {/* Component Name */}
              <span
                style={{
                  flex: 1,
                  fontSize: '13px',
                  fontWeight: 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginLeft: '4px',
                }}
              >
                {node.type}
              </span>

              {/* Options Menu */}
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu
                  icon={moreVertical}
                  label="Options"
                  className="wp-designer-tree-menu"
                  popoverProps={{ placement: 'left-start' }}
                >
                  {() => (
                    <MenuGroup>
                      <MenuItem
                        onClick={() => {
                          moveComponent(node.id, 'up');
                        }}
                      >
                        Move up
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          moveComponent(node.id, 'down');
                        }}
                      >
                        Move down
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          duplicateComponent(node.id);
                        }}
                      >
                        Duplicate
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          removeComponent(node.id);
                        }}
                        isDestructive
                      >
                        Remove
                      </MenuItem>
                    </MenuGroup>
                  )}
                </DropdownMenu>
              </div>
            </div>
            );
          }}
        </TreeGridCell>
      </TreeGridRow>
      {showDropAfter && !isExpanded && (
        <div style={{
          height: '3px',
          backgroundColor: '#2271b1',
          marginLeft: `${(level - 1) * 12 + 8}px`,
          borderRadius: '2px',
          boxShadow: '0 0 4px rgba(34, 113, 177, 0.5)',
        }} />
      )}
      {renderChildren()}
      {showDropAfter && isExpanded && hasChildren && (
        <div style={{
          height: '3px',
          backgroundColor: '#2271b1',
          marginLeft: `${level * 12 + 8}px`,
          borderRadius: '2px',
          boxShadow: '0 0 4px rgba(34, 113, 177, 0.5)',
        }} />
      )}
    </>
  );
};

export const TreePanel: React.FC = () => {
  const { tree, addComponent, selectedNodeId, resetTree, reorderComponent } = useComponentTree();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const dropPositionRef = useRef<'before' | 'after' | 'inside' | null>(null);

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = () => {
    // Reset position tracking
    dropPositionRef.current = null;
    setDropPosition(null);
    setDragOverId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || !active) {
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    const overId = String(over.id);
    const overElement = nodeRefs.current.get(overId);

    if (!overElement) {
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    // Get the bounding rect of the element we're over
    const rect = overElement.getBoundingClientRect();

    // Use the center of the dragged element's current position
    const activeRect = active.rect.current.translated;
    if (!activeRect) {
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    // Get center point of dragged item
    const mouseY = activeRect.top + activeRect.height / 2;
    const mouseX = activeRect.left + activeRect.width / 2;

    // Calculate distances to edges (Gutenberg-style pixel-based)
    const distanceToTop = mouseY - rect.top;
    const distanceToBottom = rect.bottom - mouseY;
    const distanceToLeft = mouseX - rect.left;

    // Check if the node can accept children
    const findNode = (nodes: ComponentNode[], id: string): ComponentNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const overNode = findNode(tree, overId);
    const activeNode = findNode(tree, String(active.id));
    const canAcceptChildren = overNode && componentRegistry[overNode.type]?.acceptsChildren;
    const isExpanded = overNode && expandedNodes.has(overNode.id);
    const hasChildren = overNode && overNode.children && overNode.children.length > 0;

    // Simple, natural thresholds
    const EDGE_THRESHOLD = 8; // pixels from top/bottom edge for before/after

    // Determine drop position - simple and predictable
    let position: 'before' | 'after' | 'inside' = 'after';

    // Within edge threshold → before/after
    if (distanceToTop <= EDGE_THRESHOLD) {
      position = 'before';
    } else if (distanceToBottom <= EDGE_THRESHOLD) {
      position = 'after';
    }
    // In the middle → nest if possible
    else if (canAcceptChildren) {
      position = 'inside';
    }
    // Default to closest edge
    else {
      position = distanceToTop < distanceToBottom ? 'before' : 'after';
    }

    setDragOverId(overId);
    setDropPosition(position);
    dropPositionRef.current = position;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setDragOverId(null);
      setDropPosition(null);
      dropPositionRef.current = null;
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Capture the drop position from ref (more reliable than state)
    const finalDropPosition = dropPositionRef.current;

    // Reset visual feedback
    setDragOverId(null);
    setDropPosition(null);
    dropPositionRef.current = null;

    // Allow dropping on self only if position is 'inside'
    if (activeId === overId && finalDropPosition !== 'inside') {
      return;
    }

    // Perform the reorder if we have a valid drop position
    if (finalDropPosition) {
      reorderComponent(activeId, overId, finalDropPosition);
    }
  };

  // Find all ancestor IDs of a node
  const findAncestors = (nodes: ComponentNode[], targetId: string, ancestors: string[] = []): string[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return ancestors;
      }
      if (node.children) {
        const result = findAncestors(node.children, targetId, [...ancestors, node.id]);
        if (result) return result;
      }
    }
    return null;
  };

  // Auto-expand ancestors and scroll to selected node
  useEffect(() => {
    if (selectedNodeId) {
      const ancestors = findAncestors(tree, selectedNodeId);
      if (ancestors) {
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          ancestors.forEach((id) => next.add(id));
          return next;
        });

        // Scroll to selected node after a brief delay to ensure rendering
        setTimeout(() => {
          const element = nodeRefs.current.get(selectedNodeId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
    }
  }, [selectedNodeId, tree]);

  // Get all node IDs for SortableContext
  const getAllNodeIds = (nodes: ComponentNode[]): string[] => {
    const ids: string[] = [];
    nodes.forEach((node) => {
      ids.push(node.id);
      if (node.children) {
        ids.push(...getAllNodeIds(node.children));
      }
    });
    return ids;
  };

  const allNodeIds = getAllNodeIds(tree);

  const selectedNode = selectedNodeId
    ? tree.find((n) => findNodeById(n, selectedNodeId))
    : null;

  function findNodeById(node: ComponentNode, id: string): ComponentNode | null {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  const canAddChild = selectedNodeId
    ? (() => {
        const node = findNodeInTree(tree, selectedNodeId);
        return node ? componentRegistry[node.type]?.acceptsChildren : false;
      })()
    : false;

  function findNodeInTree(nodes: ComponentNode[], id: string): ComponentNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  return (
    <div
      style={{
        width: '280px',
        borderRight: '1px solid #ccc',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Component Tree</h3>
      </div>

      <div style={{ padding: '8px', borderBottom: '1px solid #ccc', display: 'flex', gap: '8px' }}>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setShowAddMenu(!showAddMenu)}
          style={{ flex: 1 }}
        >
          + Add Root
        </Button>
        {canAddChild && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              setShowAddMenu(!showAddMenu);
            }}
            style={{ flex: 1 }}
          >
            + Add Child
          </Button>
        )}
      </div>

      {showAddMenu && (
        <div
          style={{
            padding: '8px',
            borderBottom: '1px solid #ccc',
            backgroundColor: '#f9f9f9',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            Select Component:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflow: 'auto' }}>
            {Object.keys(componentRegistry).map((componentType) => (
              <button
                key={componentType}
                onClick={() => {
                  if (canAddChild && selectedNodeId) {
                    addComponent(componentType, selectedNodeId);
                  } else {
                    addComponent(componentType);
                  }
                  setShowAddMenu(false);
                }}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  textAlign: 'left',
                  border: '1px solid #ddd',
                  background: '#fff',
                  cursor: 'pointer',
                  borderRadius: '3px',
                }}
              >
                {componentType}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {tree.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
            No components yet
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <TreeGrid style={{ width: '100%' }}>
              {tree.map((node, index) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  level={1}
                  positionInSet={index + 1}
                  setSize={tree.length}
                  allNodes={tree}
                  expandedNodes={expandedNodes}
                  setExpandedNodes={setExpandedNodes}
                  nodeRefs={nodeRefs}
                  dragOverId={dragOverId}
                  dropPosition={dropPosition}
                />
              ))}
            </TreeGrid>
          </DndContext>
        )}
      </div>

      {tree.length > 0 && (
        <div style={{ padding: '8px', borderTop: '1px solid #ccc' }}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              if (confirm('Are you sure you want to reset the entire tree?')) {
                resetTree();
              }
            }}
            isDestructive
            style={{ width: '100%' }}
          >
            Reset All
          </Button>
        </div>
      )}
    </div>
  );
};
