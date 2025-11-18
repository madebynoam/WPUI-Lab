import React from 'react';
import { useComponentTree } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';

const RenderNode: React.FC<{ node: ComponentNode }> = ({ node }) => {
  const { setSelectedNodeId, selectedNodeId } = useComponentTree();
  const definition = componentRegistry[node.type];

  if (!definition) {
    return <div>Unknown component: {node.type}</div>;
  }

  const Component = definition.component;

  // Handle special text/content props for Text and Heading
  let props = { ...node.props };
  if (node.type === 'Text' || node.type === 'Heading') {
    const content = props.content || definition.defaultProps?.children;
    delete props.content;

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(node.id);
        }}
        style={{
          outline: selectedNodeId === node.id ? '2px solid #0073aa' : 'none',
          cursor: 'pointer',
        }}
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
        style={{
          outline: selectedNodeId === node.id ? '2px solid #0073aa' : 'none',
          cursor: 'pointer',
          display: 'inline-block',
        }}
      >
        <Component {...props}>{text}</Component>
      </div>
    );
  }

  // Regular components with children
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNodeId(node.id);
      }}
      style={{
        outline: selectedNodeId === node.id ? '2px solid #0073aa' : 'none',
        cursor: 'pointer',
      }}
    >
      <Component {...props}>
        {node.children && node.children.length > 0
          ? node.children.map((child) => <RenderNode key={child.id} node={child} />)
          : null}
      </Component>
    </div>
  );
};

export const Canvas: React.FC = () => {
  const { tree } = useComponentTree();

  return (
    <div
      style={{
        flex: 1,
        padding: '20px',
        backgroundColor: '#f0f0f0',
        overflow: 'auto',
        minHeight: '100vh',
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
  );
};
