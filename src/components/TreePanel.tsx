import React, { useState } from 'react';
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
import { moreVertical, chevronDown, chevronRight } from '@wordpress/icons';

interface TreeNodeProps {
  node: ComponentNode;
  level: number;
  positionInSet: number;
  setSize: number;
  allNodes: ComponentNode[];
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, positionInSet, setSize, allNodes }) => {
  const { selectedNodeId, setSelectedNodeId, removeComponent, duplicateComponent, moveComponent } = useComponentTree();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

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
      />
    ));
  };

  return (
    <>
      <TreeGridRow
        level={level}
        positionInSet={positionInSet}
        setSize={setSize}
        isExpanded={hasChildren ? isExpanded : undefined}
      >
        <TreeGridCell>
          {(props) => (
            <div
              {...props}
              style={{
                ...props.style,
                display: 'flex',
                alignItems: 'center',
                height: '32px',
                paddingLeft: `${(level - 1) * 12 + 8}px`,
                paddingRight: '8px',
                backgroundColor: isSelected ? '#2271b1' : 'transparent',
                color: isSelected ? '#fff' : '#1e1e1e',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
              }}
              onClick={() => setSelectedNodeId(node.id)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Expander */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) {
                    setIsExpanded(!isExpanded);
                  }
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
          )}
        </TreeGridCell>
      </TreeGridRow>
      {renderChildren()}
    </>
  );
};

export const TreePanel: React.FC = () => {
  const { tree, addComponent, selectedNodeId, resetTree } = useComponentTree();
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
          <TreeGrid style={{ width: '100%' }}>
            {tree.map((node, index) => (
              <TreeNode
                key={node.id}
                node={node}
                level={1}
                positionInSet={index + 1}
                setSize={tree.length}
                allNodes={tree}
              />
            ))}
          </TreeGrid>
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
