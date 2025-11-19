import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import { patterns, patternCategories, assignIds } from '../patterns';
import {
  Button,
  DropdownMenu,
  MenuGroup,
  MenuItem,
  SearchControl,
  Icon,
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
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItem,
  TreeItemIndex,
} from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';
import './TreePanel.css';

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

interface TreePanelProps {
  showInserter: boolean;
  onCloseInserter: () => void;
}

export const TreePanel: React.FC<TreePanelProps> = ({ showInserter, onCloseInserter }) => {
  const { tree, addComponent, selectedNodeId, resetTree, reorderComponent, pages, currentPageId, setCurrentPage, addPage, deletePage, renamePage, duplicatePage, setTree } = useComponentTree();
  const [inserterTab, setInserterTab] = useState<'blocks' | 'patterns'>('blocks');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([ROOT_VSTACK_ID]));
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const dropPositionRef = useRef<'before' | 'after' | 'inside' | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageName, setEditingPageName] = useState('');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [displacements, setDisplacements] = useState<DisplacementMap>({});
  const draggedNodeRef = useRef<string | null>(null);

  // Helper to get all node IDs in flat order (for displacement calculation)
  const getAllNodesFlat = (nodes: ComponentNode[]): ComponentNode[] => {
    const result: ComponentNode[] = [];
    const traverse = (node: ComponentNode) => {
      result.push(node);
      if (node.children && expandedNodes.has(node.id)) {
        node.children.forEach(traverse);
      }
    };
    nodes.forEach(traverse);
    return result;
  };

  // WordPress-style displacement calculation
  const calculateDisplacements = (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside'): DisplacementMap => {
    const allNodes = getAllNodesFlat(tree);
    const draggedIndex = allNodes.findIndex(n => n.id === draggedId);
    const targetIndex = allNodes.findIndex(n => n.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return {};

    const newDisplacements: DisplacementMap = {};

    // Determine the target insertion index
    let insertIndex = targetIndex;
    if (position === 'after') {
      insertIndex = targetIndex + 1;
    } else if (position === 'inside') {
      // For inside drops, no displacement needed
      return {};
    }

    // Calculate displacements
    if (draggedIndex < insertIndex) {
      // Dragging down: nodes between current position and target move up
      for (let i = draggedIndex + 1; i < insertIndex; i++) {
        if (allNodes[i].id !== ROOT_VSTACK_ID) {
          newDisplacements[allNodes[i].id] = 'up';
        }
      }
    } else if (draggedIndex > insertIndex) {
      // Dragging up: nodes between target and current position move down
      for (let i = insertIndex; i < draggedIndex; i++) {
        if (allNodes[i].id !== ROOT_VSTACK_ID) {
          newDisplacements[allNodes[i].id] = 'down';
        }
      }
    }

    return newDisplacements;
  };

  const handleDragStart = (nodeId: string, event: React.DragEvent) => {
    setDraggingNodeId(nodeId);
    draggedNodeRef.current = nodeId;
    // Reset position tracking
    dropPositionRef.current = null;
    setDropPosition(null);
    setDragOverId(null);
    setDisplacements({});

    // Set drag image to semi-transparent
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', nodeId);
    }
  };

  // WordPress-style throttled drag over handler (50ms)
  const handleDragOverThrottled = useRef(
    throttle(50, (event: DragEvent, targetNodeId: string) => {
      if (!draggedNodeRef.current) return;

      const overElement = nodeRefs.current.get(targetNodeId);
      if (!overElement) {
        setDragOverId(null);
        setDropPosition(null);
        return;
      }

      // Get the bounding rect of the element we're over
      const rect = overElement.getBoundingClientRect();

      // Get mouse position
      const mouseY = event.clientY;
      const mouseX = event.clientX;

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

      const overNode = findNode(tree, targetNodeId);
      const canAcceptChildren = overNode && componentRegistry[overNode.type]?.acceptsChildren;
      const isExpanded = overNode && expandedNodes.has(overNode.id);
      const hasChildren = overNode && overNode.children && overNode.children.length > 0;

      // Calculate position based on Y position
      const relativePosition = relativeY / elementHeight;

      let position: 'before' | 'after' | 'inside' = 'after';

      // SPECIAL CASE: Empty containers (no children) → ALWAYS nest inside
      if (canAcceptChildren && !hasChildren) {
        position = 'inside';
      }
      // For containers, use larger nesting zone (20-80%)
      else if (canAcceptChildren) {
        const CONTAINER_TOP_ZONE = 0.2;
        const CONTAINER_BOTTOM_ZONE = 0.8;

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

      setDragOverId(targetNodeId);
      setDropPosition(position);
      dropPositionRef.current = position;

      // Calculate and set displacements for FLIP animation
      if (draggedNodeRef.current) {
        const newDisplacements = calculateDisplacements(draggedNodeRef.current, targetNodeId, position);
        setDisplacements(newDisplacements);
      }
    })
  ).current;

  const handleDragEnd = (event: React.DragEvent) => {
    const draggedId = draggedNodeRef.current;

    if (!draggedId || !dragOverId) {
      // Reset state
      setDraggingNodeId(null);
      setDragOverId(null);
      setDropPosition(null);
      dropPositionRef.current = null;
      draggedNodeRef.current = null;
      setDisplacements({});
      return;
    }

    // Capture the drop position from ref (more reliable than state)
    const finalDropPosition = dropPositionRef.current;

    // Reset visual feedback
    const dragOverIdCopy = dragOverId;
    setDraggingNodeId(null);
    setDragOverId(null);
    setDropPosition(null);
    dropPositionRef.current = null;
    draggedNodeRef.current = null;
    setDisplacements({});

    // Allow dropping on self only if position is 'inside'
    if (draggedId === dragOverIdCopy && finalDropPosition !== 'inside') {
      return;
    }

    // Perform the reorder if we have a valid drop position
    if (finalDropPosition) {
      reorderComponent(draggedId, dragOverIdCopy, finalDropPosition);
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
    onCloseInserter();
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

    onCloseInserter();
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
            top: 0,
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

      <div
        style={{ flex: 1, overflow: 'auto' }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();

          // Find the target node element
          const target = e.target as HTMLElement;
          const nodeElement = target.closest('[data-node-id]') as HTMLElement;
          if (nodeElement) {
            const nodeId = nodeElement.getAttribute('data-node-id');
            if (nodeId) {
              handleDragOverThrottled(e.nativeEvent, nodeId);
            }
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
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
              draggingNodeId={draggingNodeId}
              displacements={displacements}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </TreeGrid>
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
