import React, { useState, useEffect, useRef } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import { patterns, patternCategories, assignIds } from '../patterns';
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
  TextControl,
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
  const isRootVStack = node.id === ROOT_VSTACK_ID;

  // Drag & drop - separate draggable (for handle) and droppable (for row)
  // Don't allow dragging the root VStack
  const {
    attributes,
    listeners,
    setNodeRef: setDragHandleRef,
    transform,
    isDragging,
  } = useDraggable({
    id: node.id,
    data: { type: node.type },
    disabled: isRootVStack,
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
                cursor: isDragging ? 'grabbing' : 'default',
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
                  cursor: isRootVStack ? 'default' : 'grab',
                  padding: '4px',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  opacity: isRootVStack ? 0 : 0.6,
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label="Drag to reorder"
                disabled={isRootVStack}
              >
                {!isRootVStack && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 16.5h10V15H7v1.5zm0-9V9h10V7.5H7z" />
                  </svg>
                )}
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
                {node.id === ROOT_VSTACK_ID
                  ? 'Page'
                  : node.name
                    ? `${node.name} (${node.type})`
                    : node.type}
              </span>

              {/* Options Menu - Hide for root VStack */}
              {!isRootVStack && (
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
              )}
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
  const { tree, addComponent, selectedNodeId, resetTree, reorderComponent, pages, currentPageId, setCurrentPage, addPage, deletePage, renamePage, duplicatePage, setTree } = useComponentTree();
  const [showInserter, setShowInserter] = useState(false);
  const [inserterTab, setInserterTab] = useState<'blocks' | 'patterns'>('blocks');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([ROOT_VSTACK_ID]));
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const dropPositionRef = useRef<'before' | 'after' | 'inside' | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageName, setEditingPageName] = useState('');

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

    // Calculate position based on Y position
    const relativePosition = relativeY / elementHeight;

    let position: 'before' | 'after' | 'inside' = 'after';

    // SPECIAL CASE: Empty containers (no children) → ALWAYS nest inside
    // This makes empty containers much easier to drop into
    if (canAcceptChildren && !hasChildren) {
      position = 'inside';
    }
    // For containers, use larger nesting zone (20-80%)
    else if (canAcceptChildren) {
      const CONTAINER_TOP_ZONE = 0.2; // Top 20% for "before"
      const CONTAINER_BOTTOM_ZONE = 0.8; // Bottom 20% for "after"

      if (relativePosition < CONTAINER_TOP_ZONE) {
        position = 'before';
      } else if (relativePosition > CONTAINER_BOTTOM_ZONE) {
        position = 'after';
      } else {
        // Middle 60% (0.2-0.8) nests inside
        position = 'inside';
      }
    }
    // For non-containers, use standard zones (30-70%)
    else {
      const TOP_ZONE = 0.3;
      const BOTTOM_ZONE = 0.7;

      if (relativePosition < TOP_ZONE) {
        position = 'before';
      } else if (relativePosition > BOTTOM_ZONE) {
        position = 'after';
      } else {
        // Middle 40% uses closest edge
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

  // Handle adding pattern - convert pattern template to actual nodes and insert
  const handleAddPattern = (patternId: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) return;

    // Assign IDs to the pattern tree
    const patternWithIds = assignIds(pattern.tree);

    const targetId = selectedNodeId || ROOT_VSTACK_ID;
    const targetNode = findNodeInTree(tree, targetId);
    const canAcceptChildren = targetNode && componentRegistry[targetNode.type]?.acceptsChildren;

    // Add pattern to tree
    if (canAcceptChildren) {
      // Add as child of selected node
      const addToParent = (nodes: ComponentNode[]): ComponentNode[] => {
        return nodes.map(node => {
          if (node.id === targetId) {
            return {
              ...node,
              children: [...(node.children || []), patternWithIds],
            };
          }
          if (node.children) {
            return {
              ...node,
              children: addToParent(node.children),
            };
          }
          return node;
        });
      };
      setTree(addToParent(tree));
    } else {
      // Add as sibling (at root level)
      setTree([...tree, patternWithIds]);
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

  // Filter patterns based on search term
  const filteredPatternCategories = patternCategories.map(category => ({
    category,
    patterns: patterns.filter(p =>
      p.category === category &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
  })).filter(cat => cat.patterns.length > 0);

  return (
    <div
      style={{
        width: '280px',
        borderRight: '1px solid #ccc',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* WordPress Editor-style Top Bar */}
      <div style={{
        height: '60px',
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid #000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#fff">
            <path d="M12.158 12.786l-2.698 7.84c.87.46 1.837.718 2.84.718.721 0 1.414-.13 2.057-.368l-.144-.36-2.055-7.83zm-5.15 3.2c-.297-.703-.464-1.487-.464-2.31 0-1.548.632-2.945 1.65-3.95-.064.854.13 1.597.428 2.375l1.936 5.885zm11.47-9.215c-.82-.042-1.564-.083-1.564-.083-.738-.044-.652-1.174.087-1.134 0 0 2.224.175 3.652.175 1.346 0 3.61-.175 3.61-.175.738-.04.826 1.134.087 1.134 0 0-.706.041-1.476.083l-4.74 14.114-2.01-6.027 1.43-4.273c.738-.042 1.434-.083 1.434-.083.738-.042.65-1.133-.088-1.133 0 0-2.225.175-3.653.175l-.828-.007zm-2.344-6.053c1.72 0 3.283.655 4.453 1.733L18.7 4.56c-1.134-1.002-2.622-1.616-4.254-1.616-2.117 0-3.984.99-5.18 2.516l1.922 5.88c.862-1.528 2.482-2.575 4.35-2.575z"/>
          </svg>
        </div>

        <button
          onClick={() => setShowInserter(!showInserter)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '2px',
            border: 'none',
            backgroundColor: showInserter ? '#1e1e1e' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.1s ease',
          }}
          onMouseEnter={(e) => {
            if (!showInserter) {
              e.currentTarget.style.backgroundColor = '#2c2c2c';
            }
          }}
          onMouseLeave={(e) => {
            if (!showInserter) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          aria-label={showInserter ? 'Close inserter' : 'Open inserter'}
        >
          {showInserter ? (
            // X icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1-6.5-6.7z" />
            </svg>
          ) : (
            // + icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
            </svg>
          )}
        </button>
      </div>

      {/* Pages Section */}
      <div style={{ padding: '12px 8px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Pages
          </span>
          <button
            onClick={() => addPage()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
              color: '#666',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Add page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
            </svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {pages.map((page) => (
            <div
              key={page.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 8px',
                backgroundColor: currentPageId === page.id ? '#e5f5fa' : 'transparent',
                color: '#1e1e1e',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
              onClick={() => {
                if (editingPageId !== page.id) {
                  setCurrentPage(page.id);
                }
              }}
              onMouseEnter={(e) => {
                if (currentPageId !== page.id && editingPageId !== page.id) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPageId !== page.id && editingPageId !== page.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {editingPageId === page.id ? (
                <input
                  type="text"
                  value={editingPageName}
                  onChange={(e) => setEditingPageName(e.target.value)}
                  onBlur={() => {
                    if (editingPageName.trim()) {
                      renamePage(page.id, editingPageName.trim());
                    }
                    setEditingPageId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editingPageName.trim()) {
                        renamePage(page.id, editingPageName.trim());
                      }
                      setEditingPageId(null);
                    } else if (e.key === 'Escape') {
                      setEditingPageId(null);
                    }
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    padding: '2px 4px',
                    border: '1px solid #007cba',
                    borderRadius: '2px',
                    outline: 'none',
                    backgroundColor: '#fff',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span style={{ flex: 1, fontWeight: currentPageId === page.id ? 500 : 400 }}>
                  {page.name}
                </span>
              )}
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu
                  icon={moreVertical}
                  label="Page options"
                  popoverProps={{ placement: 'left-start' }}
                >
                  {() => (
                    <MenuGroup>
                      <MenuItem
                        onClick={() => {
                          setEditingPageId(page.id);
                          setEditingPageName(page.name);
                        }}
                      >
                        Rename
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          duplicatePage(page.id);
                        }}
                      >
                        Duplicate
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          if (pages.length > 1) {
                            if (confirm(`Delete page "${page.name}"?`)) {
                              deletePage(page.id);
                            }
                          } else {
                            alert('Cannot delete the last page');
                          }
                        }}
                        isDestructive
                        disabled={pages.length === 1}
                      >
                        Delete
                      </MenuItem>
                    </MenuGroup>
                  )}
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Layers Label */}
      <div style={{ padding: '12px 8px 8px 8px', borderBottom: '1px solid #e0e0e0' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Layers
        </span>
      </div>

      {/* WordPress-style Block Inserter Panel - Overlay */}
      {showInserter && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#fff',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid #e0e0e0',
          }}
        >
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f9f9f9',
          }}>
            <button
              onClick={() => setInserterTab('blocks')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                backgroundColor: inserterTab === 'blocks' ? '#fff' : 'transparent',
                borderBottom: inserterTab === 'blocks' ? '2px solid #2271b1' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: inserterTab === 'blocks' ? 600 : 400,
                color: inserterTab === 'blocks' ? '#1e1e1e' : '#666',
                fontFamily: 'inherit',
              }}
            >
              Blocks
            </button>
            <button
              onClick={() => setInserterTab('patterns')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                backgroundColor: inserterTab === 'patterns' ? '#fff' : 'transparent',
                borderBottom: inserterTab === 'patterns' ? '2px solid #2271b1' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: inserterTab === 'patterns' ? 600 : 400,
                color: inserterTab === 'patterns' ? '#1e1e1e' : '#666',
                fontFamily: 'inherit',
              }}
            >
              Patterns
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
            <SearchControl
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={inserterTab === 'blocks' ? 'Search blocks...' : 'Search patterns...'}
              __nextHasNoMarginBottom
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {inserterTab === 'blocks' ? (
              // Blocks content
              filteredGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#757575', fontSize: '13px' }}>
                  No blocks found
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.name} style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
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
                        gap: '8px',
                      }}
                    >
                      {group.components.map((componentType) => (
                        <button
                          key={componentType}
                          onClick={() => handleAddComponent(componentType)}
                          style={{
                            height: '64px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            textAlign: 'center',
                            padding: '10px 6px',
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
                          <Icon icon={blockDefault} size={24} />
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
              )
            ) : (
              // Patterns content
              filteredPatternCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#757575', fontSize: '13px' }}>
                  No patterns found
                </div>
              ) : (
                filteredPatternCategories.map((cat) => (
                  <div key={cat.category} style={{ marginBottom: '32px' }}>
                    <div
                      style={{
                        marginBottom: '16px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#1e1e1e',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {cat.category}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {cat.patterns.map((pattern) => (
                        <button
                          key={pattern.id}
                          onClick={() => handleAddPattern(pattern.id)}
                          style={{
                            padding: '16px',
                            border: '1px solid #ddd',
                            borderRadius: '2px',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.1s ease',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9f9f9';
                            e.currentTarget.style.borderColor = '#2271b1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                            e.currentTarget.style.borderColor = '#ddd';
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e1e1e', marginBottom: '4px' }}>
                            {pattern.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {pattern.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
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
