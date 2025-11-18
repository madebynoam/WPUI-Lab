import React, { useState } from 'react';
import { useComponentTree } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import { Button } from '@wordpress/components';

const TreeNode: React.FC<{ node: ComponentNode; level: number }> = ({ node, level }) => {
  const { selectedNodeId, setSelectedNodeId, removeComponent } = useComponentTree();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        style={{
          padding: '6px 8px',
          paddingLeft: `${level * 16 + 8}px`,
          cursor: 'pointer',
          backgroundColor: selectedNodeId === node.id ? '#e0e0e0' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderLeft: selectedNodeId === node.id ? '3px solid #0073aa' : 'none',
        }}
        onClick={() => setSelectedNodeId(node.id)}
      >
        {hasChildren && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            style={{ cursor: 'pointer', userSelect: 'none', width: '16px' }}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={{ width: '16px' }}></span>}
        <span style={{ flex: 1, fontSize: '13px' }}>{node.type}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeComponent(node.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 6px',
            fontSize: '12px',
            color: '#666',
          }}
          title="Remove"
        >
          ✕
        </button>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const TreePanel: React.FC = () => {
  const { tree, addComponent, selectedNodeId } = useComponentTree();
  const [showAddMenu, setShowAddMenu] = useState(false);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
          tree.map((node) => <TreeNode key={node.id} node={node} level={0} />)
        )}
      </div>
    </div>
  );
};
