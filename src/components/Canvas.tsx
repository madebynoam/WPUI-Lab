import React, { useEffect, useCallback } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import { Breadcrumb } from './Breadcrumb';
import { wordpress } from '@wordpress/icons';
import { INTERACTIVE_COMPONENT_TYPES } from './TreePanel';

const RenderNode: React.FC<{ node: ComponentNode; renderInteractive?: boolean }> = ({ node, renderInteractive = true }) => {
  const { setSelectedNodeId, selectedNodeId, gridLinesVisible, undo, redo, canUndo, canRedo } = useComponentTree();
  const definition = componentRegistry[node.type];

  if (!definition) {
    return <div>Unknown component: {node.type}</div>;
  }

  // Skip rendering interactive components unless explicitly allowed
  if (INTERACTIVE_COMPONENT_TYPES.includes(node.type) && !renderInteractive) {
    return null;
  }

  const Component = definition.component;
  let props = { ...node.props };

  // Extract grid child properties to apply to wrapper
  const gridColumnSpan = props.gridColumnSpan;
  const gridRowSpan = props.gridRowSpan;
  delete props.gridColumnSpan;
  delete props.gridRowSpan;

  // Convert span numbers to CSS grid syntax
  const gridColumn = gridColumnSpan && gridColumnSpan > 1 ? `span ${gridColumnSpan}` : undefined;
  const gridRow = gridRowSpan && gridRowSpan > 1 ? `span ${gridRowSpan}` : undefined;

  // Base wrapper style with grid child properties
  const isRootVStack = node.id === ROOT_VSTACK_ID;
  const getWrapperStyle = (additionalStyles: React.CSSProperties = {}) => ({
    outline: selectedNodeId === node.id && !isRootVStack ? '2px solid #0073aa' : 'none',
    cursor: 'default',
    ...(gridColumn && { gridColumn }),
    ...(gridRow && { gridRow }),
    ...additionalStyles,
  });

  // Handle components with special text/content props
  if (node.type === 'Text' || node.type === 'Heading') {
    const content = props.content || definition.defaultProps?.children;
    delete props.content;

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(node.id);
        }}
        style={getWrapperStyle()}
      >
        <Component {...props}>{content}</Component>
      </div>
    );
  }

  // Handle Button text prop
  if (node.type === 'Button') {
    const text = props.text || 'Button';
    delete props.text;

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(node.id);
        }}
        style={getWrapperStyle({ display: 'inline-block' })}
      >
        <Component {...props}>{text}</Component>
      </div>
    );
  }

  // Handle Icon component - needs icon prop from @wordpress/icons
  if (node.type === 'Icon') {
    // Use wordpress icon as default
    const iconProp = wordpress;
    delete props.icon;

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(node.id);
        }}
        style={getWrapperStyle({ display: 'inline-block' })}
      >
        <Component icon={iconProp} {...props} />
      </div>
    );
  }

  // Handle interactive components (Modal, Popover, etc.) specially
  if (INTERACTIVE_COMPONENT_TYPES.includes(node.type)) {
    // For Modal in isolated view, render content directly without the overlay
    if (node.type === 'Modal') {
      // Render Modal content directly without the blocking overlay
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNodeId(node.id);
          }}
          style={{
            ...getWrapperStyle(),
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            minWidth: '400px',
            maxWidth: '600px',
          }}
        >
          {/* Modal header */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e0e0e0',
            fontWeight: 600,
            fontSize: '14px',
          }}>
            {props.title || 'Modal Title'}
          </div>

          {/* Modal content */}
          <div style={{ padding: '24px' }}>
            {node.children && node.children.length > 0
              ? node.children.map((child) => <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />)
              : <div style={{ padding: '20px', color: '#666', textAlign: 'center' }}>Add components inside this Modal</div>}
          </div>
        </div>
      );
    }

    // For other interactive components, render normally
    const mergedProps = { ...definition.defaultProps, ...props };
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(node.id);
        }}
        style={getWrapperStyle()}
      >
        <Component {...mergedProps}>
          {node.children && node.children.length > 0
            ? node.children.map((child) => <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />)
            : null}
        </Component>
      </div>
    );
  }

  // Form controls and self-contained components (don't accept children)
  const formControls = [
    'TextControl',
    'TextareaControl',
    'SelectControl',
    'ToggleControl',
    'CheckboxControl',
    'SearchControl',
    'NumberControl',
    'RadioControl',
    'RangeControl',
    'ColorPicker',
    'ColorPalette',
    'Spacer',
    'Divider',
    'Spinner',
    'DateTimePicker',
    'FontSizePicker',
    'AnglePickerControl',
    'BoxControl',
    'BorderControl',
    'FormTokenField',
    'TabPanel',
  ];

  if (formControls.includes(node.type)) {
    const mergedProps = { ...definition.defaultProps, ...props, onChange: () => {} };

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(node.id);
        }}
        style={getWrapperStyle({ padding: '4px' })}
      >
        <Component {...mergedProps} />
      </div>
    );
  }

  // Regular components with children - merge with defaultProps
  const mergedProps = { ...definition.defaultProps, ...props };

  // Check if this is a Grid with grid lines enabled
  const showGridLines = node.type === 'Grid' && gridLinesVisible.has(node.id);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNodeId(node.id);
      }}
      style={{ ...getWrapperStyle(), position: showGridLines ? 'relative' : undefined }}
    >
      <Component {...mergedProps}>
        {node.children && node.children.length > 0
          ? node.children.map((child) => <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />)
          : null}
      </Component>

      {/* Grid Lines Overlay */}
      {showGridLines && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <svg
            width="100%"
            height="100%"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {(() => {
              // Get grid properties
              const columns = mergedProps.columns || 2;
              // gap is a multiplier of 4px in WordPress components
              const gapMultiplier = typeof mergedProps.gap === 'number' ? mergedProps.gap : 0;
              const gapPx = gapMultiplier * 4;

              const elements = [];

              // Draw column boundaries and gutters
              for (let i = 1; i < columns; i++) {
                if (gapPx > 0) {
                  // Calculate gutter position
                  // In CSS Grid, gaps are between columns, so position is at end of column i-1
                  const gutterXPercent = (100 / columns) * i;

                  elements.push(
                    <rect
                      key={`gutter-${i}`}
                      x={`calc(${gutterXPercent}% - ${gapPx / 2}px)`}
                      y="0"
                      width={`${gapPx}px`}
                      height="100%"
                      fill="#007cba"
                      opacity="0.15"
                    />
                  );

                  // Draw line in the center of the gutter
                  elements.push(
                    <line
                      key={`col-${i}`}
                      x1={`${gutterXPercent}%`}
                      y1="0"
                      x2={`${gutterXPercent}%`}
                      y2="100%"
                      stroke="#007cba"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  );
                } else {
                  // No gap - just draw divider lines at column boundaries
                  const xPercent = (100 / columns) * i;
                  elements.push(
                    <line
                      key={`col-${i}`}
                      x1={`${xPercent}%`}
                      y1="0"
                      x2={`${xPercent}%`}
                      y2="100%"
                      stroke="#007cba"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  );
                }
              }

              return elements;
            })()}
          </svg>
        </div>
      )}
    </div>
  );
};

export const Canvas: React.FC = () => {
  const { tree, selectedNodeId, setSelectedNodeId, getNodeById, gridLinesVisible, toggleGridLines, undo, redo, canUndo, canRedo } = useComponentTree();

  // Get page-level properties from root VStack
  const rootVStack = getNodeById(ROOT_VSTACK_ID);
  const pageMaxWidth = rootVStack?.props.maxWidth ?? 1440;
  const pageBackgroundColor = rootVStack?.props.backgroundColor ?? 'rgb(249, 250, 251)';
  const pagePadding = rootVStack?.props.padding ?? 20;

  // Find parent of a node
  const findParent = (nodes: ComponentNode[], targetId: string, parent: ComponentNode | null = null): ComponentNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return parent;
      }
      if (node.children) {
        const found = findParent(node.children, targetId, node);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };

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

      // Cmd/Ctrl+Enter to go to page settings (select root VStack)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setSelectedNodeId(ROOT_VSTACK_ID);
      }

      // Shift+Enter to select parent
      if (e.shiftKey && e.key === 'Enter' && selectedNodeId) {
        e.preventDefault();
        const parent = findParent(tree, selectedNodeId);
        if (parent) {
          setSelectedNodeId(parent.id);
        }
      }

      // Escape to eject from interactive component isolated view
      if (e.key === 'Escape' && selectedNodeId) {
        // Check if we're inside an interactive component
        const ancestor = findInteractiveAncestor(selectedNodeId);
        if (ancestor) {
          e.preventDefault();
          // Return to root VStack to show full page view
          setSelectedNodeId(ROOT_VSTACK_ID);
        }
      }

      // Control+G to toggle grid lines for selected Grid component
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && selectedNodeId) {
        const selectedNode = getNodeById(selectedNodeId);
        if (selectedNode && selectedNode.type === 'Grid') {
          e.preventDefault();
          toggleGridLines(selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, tree, setSelectedNodeId, getNodeById, findInteractiveAncestor, toggleGridLines, undo, redo, canUndo, canRedo]);

  // Check if selected node is an interactive component or a child of one
  const selectedNode = selectedNodeId ? getNodeById(selectedNodeId) : null;
  const interactiveAncestor = selectedNodeId ? findInteractiveAncestor(selectedNodeId) : null;
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
        onClick={(e) => {
          // Deselect when clicking canvas background
          if (e.target === e.currentTarget) {
            setSelectedNodeId(ROOT_VSTACK_ID);
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
