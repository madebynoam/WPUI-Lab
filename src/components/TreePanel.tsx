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
  SearchControl,
  Icon,
  __experimentalDivider as Divider,
} from '@wordpress/components';
import {
  moreVertical,
  chevronDown,
  chevronRight,
  dragHandle,
  layout,
  box,
  pencil,
  tag,
  brush,
  settings,
  plugins,
  plus,
  blockDefault,
} from '@wordpress/icons';
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
import { ROOT_VSTACK_ID } from '../ComponentTreeContext';

// Component groups for the inserter
interface ComponentGroup {
  name: string;
  icon: JSX.Element;
  components: string[];
}

const componentGroups: ComponentGroup[] = [
  {
    name: 'Layout',
    icon: layout,
    components: ['VStack', 'HStack', 'Grid', 'Flex', 'FlexBlock', 'FlexItem'],
  },
  {
    name: 'Containers',
    icon: box,
    components: ['Card', 'CardBody', 'CardHeader', 'Panel', 'PanelBody', 'PanelRow'],
  },
  {
    name: 'Content',
    icon: pencil,
    components: ['Text', 'Heading', 'Button', 'Icon'],
  },
  {
    name: 'Form Inputs',
    icon: tag,
    components: [
      'TextControl',
      'TextareaControl',
      'SelectControl',
      'NumberControl',
      'SearchControl',
      'ToggleControl',
      'CheckboxControl',
      'RadioControl',
      'RangeControl',
      'DateTimePicker',
      'FontSizePicker',
      'AnglePickerControl',
    ],
  },
  {
    name: 'Color',
    icon: brush,
    components: ['ColorPicker', 'ColorPalette'],
  },
  {
    name: 'Advanced',
    icon: settings,
    components: ['BoxControl', 'BorderControl', 'FormTokenField', 'TabPanel'],
  },
  {
    name: 'Interactive',
    icon: plugins,
    components: ['Modal', 'Popover', 'Dropdown', 'MenuGroup', 'MenuItem', 'Tooltip', 'Notice'],
  },
  {
    name: 'Utilities',
    icon: plus,
    components: ['Spacer', 'Divider', 'Spinner', 'Truncate'],
  },
];

// Interactive component types that should be rendered in isolation when selected
export const INTERACTIVE_COMPONENT_TYPES = ['Modal', 'Popover', 'Dropdown', 'Tooltip', 'Notice'];

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
          height: '2px',
          backgroundColor: '#007cba',
          marginLeft: `${(level - 1) * 12 + 8}px`,
          marginRight: '8px',
          borderRadius: '1px',
          boxShadow: '0 0 8px rgba(0, 124, 186, 0.6), 0 0 2px rgba(0, 124, 186, 0.8)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            left: '-4px',
            top: '-3px',
            width: '8px',
            height: '8px',
            backgroundColor: '#007cba',
            borderRadius: '50%',
            boxShadow: '0 0 4px rgba(0, 124, 186, 0.8)',
          }} />
        </div>
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
                backgroundColor: isSelected ? '#2271b1' : (showDropInside ? '#e5f5fa' : 'transparent'),
                color: isSelected ? '#fff' : '#1e1e1e',
                cursor: isDragging ? 'grabbing' : 'pointer',
                transition: 'background-color 0.15s ease, border 0.15s ease, box-shadow 0.15s ease',
                border: showDropInside ? '2px solid #007cba' : '2px solid transparent',
                borderRadius: showDropInside ? '4px' : '0',
                margin: showDropInside ? '2px 0' : '0',
                boxShadow: showDropInside ? '0 0 0 2px rgba(0, 124, 186, 0.1), inset 0 0 0 1px rgba(0, 124, 186, 0.2)' : 'none',
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
          height: '2px',
          backgroundColor: '#007cba',
          marginLeft: `${(level - 1) * 12 + 8}px`,
          marginRight: '8px',
          borderRadius: '1px',
          boxShadow: '0 0 8px rgba(0, 124, 186, 0.6), 0 0 2px rgba(0, 124, 186, 0.8)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            left: '-4px',
            top: '-3px',
            width: '8px',
            height: '8px',
            backgroundColor: '#007cba',
            borderRadius: '50%',
            boxShadow: '0 0 4px rgba(0, 124, 186, 0.8)',
          }} />
        </div>
      )}
      {renderChildren()}
      {showDropAfter && isExpanded && hasChildren && (
        <div style={{
          height: '2px',
          backgroundColor: '#007cba',
          marginLeft: `${level * 12 + 8}px`,
          marginRight: '8px',
          borderRadius: '1px',
          boxShadow: '0 0 8px rgba(0, 124, 186, 0.6), 0 0 2px rgba(0, 124, 186, 0.8)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            left: '-4px',
            top: '-3px',
            width: '8px',
            height: '8px',
            backgroundColor: '#007cba',
            borderRadius: '50%',
            boxShadow: '0 0 4px rgba(0, 124, 186, 0.8)',
          }} />
        </div>
      )}
    </>
  );
};

export const TreePanel: React.FC = () => {
  const { tree, addComponent, selectedNodeId, resetTree, reorderComponent } = useComponentTree();
  const [showInserter, setShowInserter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

    // Calculate relative position within the element
    const relativeY = mouseY - rect.top;
    const elementHeight = rect.height;
    const relativeX = mouseX - rect.left;

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

    // Simple, ergonomic drop zones
    const TOP_ZONE = 0.3; // Top 30% for "before"
    const BOTTOM_ZONE = 0.7; // Bottom 30% for "after"
    // Middle 40% (0.3-0.7) is for nesting

    // Calculate position based on Y position
    const relativePosition = relativeY / elementHeight;

    let position: 'before' | 'after' | 'inside' = 'after';

    // SPECIAL CASE: Empty containers (no children) → ALWAYS nest inside
    // This makes empty containers much easier to drop into
    if (canAcceptChildren && !hasChildren) {
      position = 'inside';
    }
    // Top zone (0-30%) → insert before
    else if (relativePosition < TOP_ZONE) {
      position = 'before';
    }
    // Bottom zone (70-100%) → insert after
    else if (relativePosition > BOTTOM_ZONE) {
      position = 'after';
    }
    // Middle zone (30-70%) → nest if container, otherwise use closest edge
    else {
      if (canAcceptChildren) {
        // Any container in the middle zone = nest inside
        position = 'inside';
      } else {
        // Can't nest, so use closest edge
        position = relativePosition < 0.5 ? 'before' : 'after';
      }
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

  // Handle adding component - always add to selected node (or root VStack if nothing selected)
  const handleAddComponent = (componentType: string) => {
    const targetId = selectedNodeId || ROOT_VSTACK_ID;
    const targetNode = findNodeInTree(tree, targetId);
    const canAcceptChildren = targetNode && componentRegistry[targetNode.type]?.acceptsChildren;

    if (canAcceptChildren) {
      addComponent(componentType, targetId);
    } else {
      // If selected node can't accept children, add as sibling (to parent)
      addComponent(componentType);
    }
    setShowInserter(false);
    setSearchTerm('');
  };

  // Filter components based on search term
  const filteredGroups = componentGroups.map(group => ({
    ...group,
    components: group.components.filter(comp =>
      comp.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(group => group.components.length > 0);

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

      <div style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>
        <Button
          variant="primary"
          size="small"
          onClick={() => setShowInserter(!showInserter)}
          icon={plus}
          style={{ width: '100%' }}
        >
          {showInserter ? 'Close Inserter' : 'Add Component'}
        </Button>
      </div>

      {/* WordPress-style Block Inserter Panel */}
      {showInserter && (
        <div
          style={{
            borderBottom: '1px solid #ccc',
            backgroundColor: '#fff',
            maxHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
            <SearchControl
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search components..."
              __nextHasNoMarginBottom
            />
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            {filteredGroups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#757575', fontSize: '13px' }}>
                No components found
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.name} style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#1e1e1e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <Icon icon={group.icon} size={16} />
                    {group.name}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '6px',
                    }}
                  >
                    {group.components.map((componentType) => (
                      <button
                        key={componentType}
                        onClick={() => handleAddComponent(componentType)}
                        style={{
                          height: '56px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          textAlign: 'center',
                          padding: '8px 4px',
                          border: '1px solid #ddd',
                          borderRadius: '2px',
                          backgroundColor: '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f0f0';
                          e.currentTarget.style.borderColor = '#2271b1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fff';
                          e.currentTarget.style.borderColor = '#ddd';
                        }}
                      >
                        <Icon icon={blockDefault} size={20} />
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}>
                          {componentType}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
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
            {(() => {
              // Helper function to check if a node or any of its children are interactive
              const isInteractiveNode = (node: ComponentNode): boolean => {
                if (INTERACTIVE_COMPONENT_TYPES.includes(node.type)) return true;
                if (node.children) {
                  return node.children.some(child => isInteractiveNode(child));
                }
                return false;
              };

              // Separate tree into regular and interactive components
              const regularComponents = tree.filter(node => !isInteractiveNode(node));
              const interactiveComponents = tree.filter(node => isInteractiveNode(node));

              return (
                <>
                  {/* Regular Page Components Section */}
                  {regularComponents.length > 0 && (
                    <>
                      <div style={{
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#757575',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '1px solid #e0e0e0',
                      }}>
                        Page Components
                      </div>
                      <TreeGrid style={{ width: '100%' }}>
                        {regularComponents.map((node, index) => (
                          <TreeNode
                            key={node.id}
                            node={node}
                            level={1}
                            positionInSet={index + 1}
                            setSize={regularComponents.length}
                            allNodes={tree}
                            expandedNodes={expandedNodes}
                            setExpandedNodes={setExpandedNodes}
                            nodeRefs={nodeRefs}
                            dragOverId={dragOverId}
                            dropPosition={dropPosition}
                          />
                        ))}
                      </TreeGrid>
                    </>
                  )}

                  {/* Separator */}
                  {regularComponents.length > 0 && interactiveComponents.length > 0 && (
                    <div style={{
                      margin: '12px 0',
                      borderTop: '1px solid #e0e0e0',
                    }} />
                  )}

                  {/* Interactive Components Section */}
                  {interactiveComponents.length > 0 && (
                    <>
                      <div style={{
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#757575',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '1px solid #e0e0e0',
                      }}>
                        Interactive Components
                      </div>
                      <TreeGrid style={{ width: '100%' }}>
                        {interactiveComponents.map((node, index) => (
                          <TreeNode
                            key={node.id}
                            node={node}
                            level={1}
                            positionInSet={index + 1}
                            setSize={interactiveComponents.length}
                            allNodes={tree}
                            expandedNodes={expandedNodes}
                            setExpandedNodes={setExpandedNodes}
                            nodeRefs={nodeRefs}
                            dragOverId={dragOverId}
                            dropPosition={dropPosition}
                          />
                        ))}
                      </TreeGrid>
                    </>
                  )}
                </>
              );
            })()}
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
