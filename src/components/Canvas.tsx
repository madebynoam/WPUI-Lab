import React, { useEffect } from 'react';
import { useComponentTree } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import { Breadcrumb } from './Breadcrumb';
import { wordpress } from '@wordpress/icons';

const RenderNode: React.FC<{ node: ComponentNode }> = ({ node }) => {
  const { setSelectedNodeId, selectedNodeId } = useComponentTree();
  const definition = componentRegistry[node.type];

  if (!definition) {
    return <div>Unknown component: {node.type}</div>;
  }

  const Component = definition.component;
  let props = { ...node.props };

  // Extract grid child properties to apply to wrapper
  const gridColumn = props.gridColumn;
  const gridRow = props.gridRow;
  delete props.gridColumn;
  delete props.gridRow;

  // Base wrapper style with grid child properties
  const getWrapperStyle = (additionalStyles: React.CSSProperties = {}) => ({
    outline: selectedNodeId === node.id ? '2px solid #0073aa' : 'none',
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
          ? node.children.map((child) => <RenderNode key={child.id} node={child} />)
          : null}
      </Component>
    </div>
  );
};

export const Canvas: React.FC = () => {
  const { tree, selectedNodeId, setSelectedNodeId } = useComponentTree();

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

  // Keyboard shortcut: Shift+Enter to select parent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Enter' && selectedNodeId) {
        e.preventDefault();
        const parent = findParent(tree, selectedNodeId);
        if (parent) {
          setSelectedNodeId(parent.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, tree, setSelectedNodeId]);

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
          backgroundColor: '#f0f0f0',
          overflow: 'auto',
        }}
      >
        {tree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Add components from the tree panel to get started
          </div>
        ) : (
          tree.map((node) => <RenderNode key={node.id} node={node} />)
        )}
      </div>
      <Breadcrumb />
    </div>
  );
};
