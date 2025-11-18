import React from 'react';
import { useComponentTree } from '../ComponentTreeContext';
import { ComponentNode } from '../types';

export const Breadcrumb: React.FC = () => {
  const { selectedNodeId, setSelectedNodeId, tree } = useComponentTree();

  const getNodePath = (targetId: string | null): ComponentNode[] => {
    if (!targetId) return [];

    const path: ComponentNode[] = [];

    const findPath = (nodes: ComponentNode[], ancestors: ComponentNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          path.push(...ancestors, node);
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (findPath(node.children, [...ancestors, node])) {
            return true;
          }
        }
      }
      return false;
    };

    findPath(tree, []);
    return path;
  };

  const path = getNodePath(selectedNodeId);

  if (path.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        borderTop: '1px solid #ccc',
        backgroundColor: '#fff',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
        minHeight: '40px',
        flexShrink: 0,
      }}
    >
      {path.map((node, index) => (
        <React.Fragment key={node.id}>
          {index > 0 && (
            <span style={{ color: '#999', margin: '0 4px' }}>/</span>
          )}
          <button
            onClick={() => setSelectedNodeId(node.id)}
            style={{
              background: index === path.length - 1 ? '#e0e0e0' : 'transparent',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: index === path.length - 1 ? 600 : 400,
              color: '#1e1e1e',
              transition: 'background-color 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (index !== path.length - 1) {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }
            }}
            onMouseLeave={(e) => {
              if (index !== path.length - 1) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {node.type}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
