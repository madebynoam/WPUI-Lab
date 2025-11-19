import React, { useEffect, useCallback } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import { Breadcrumb } from './Breadcrumb';
import { wordpress } from '@wordpress/icons';
import { INTERACTIVE_COMPONENT_TYPES } from './TreePanel';

const RenderNode: React.FC<{ node: ComponentNode; renderInteractive?: boolean }> = ({ node, renderInteractive = true }) => {
  const { setSelectedNodeId, selectedNodeId } = useComponentTree();
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
  const gridColumn = props.gridColumn;
  const gridRow = props.gridRow;
  delete props.gridColumn;
  delete props.gridRow;

  // Base wrapper style with grid child properties
  const isRootVStack = node.id === ROOT_VSTACK_ID;
  const getWrapperStyle = (additionalStyles: React.CSSProperties = {}) => ({
    outline: selectedNodeId === node.id && !isRootVStack ? '2px solid #0073aa' : 'none',
    cursor: 'pointer',
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
};

export const Canvas: React.FC = () => {
  const { tree, selectedNodeId, setSelectedNodeId, getNodeById } = useComponentTree();

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, tree, setSelectedNodeId, getNodeById, findInteractiveAncestor]);

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
          padding: '20px',
          backgroundColor: 'rgb(249, 250, 251)',
          overflow: 'auto',
        }}
        onClick={(e) => {
          // Deselect when clicking canvas background
          if (e.target === e.currentTarget) {
            setSelectedNodeId(ROOT_VSTACK_ID);
          }
        }}
      >
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
      <Breadcrumb />
    </div>
  );
};
