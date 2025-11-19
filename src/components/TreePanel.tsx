/**
 * WP Designer Tree Panel - Using WordPress ListView with adapter
 */
import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import {
  Button,
  DropdownMenu,
  MenuGroup,
  MenuItem,
  __experimentalListView as ListView,
} from '@wordpress/components';
import {
  plus,
} from '@wordpress/icons';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import './TreePanel.css';

// Interactive components that require special rendering
export const INTERACTIVE_COMPONENT_TYPES = ['Modal', 'Popover', 'Dropdown', 'Tooltip', 'Notice'];

// Create a custom context to bridge our data with WordPress ListView
interface TreeAdapterContextType {
  nodes: Map<string, ComponentNode>;
  expandedState: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
}

const TreeAdapterContext = createContext<TreeAdapterContextType | null>(null);

// Adapter hook to transform our tree data for WordPress ListView
const useTreeAdapter = (tree: ComponentNode[]) => {
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});

  // Build a flat map of all nodes for quick lookup
  const nodesMap = useMemo(() => {
    const map = new Map<string, ComponentNode>();
    const traverse = (nodes: ComponentNode[]) => {
      nodes.forEach(node => {
        map.set(node.id, node);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(tree);
    return map;
  }, [tree]);

  // Get list of all client IDs (node IDs) in tree order
  const clientIds = useMemo(() => {
    const ids: string[] = [];
    const traverse = (nodes: ComponentNode[]) => {
      nodes.forEach(node => {
        ids.push(node.id);
        if (node.children && expandedState[node.id] !== false) {
          traverse(node.children);
        }
      });
    };
    traverse(tree);
    return ids;
  }, [tree, expandedState]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedState(prev => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));
  }, []);

  return {
    nodesMap,
    clientIds,
    expandedState,
    toggleExpanded,
  };
};

// Main TreePanel component
export const TreePanel: React.FC = () => {
  const {
    tree,
    selectedNodeId,
    setSelectedNodeId,
    addComponent,
  } = useComponentTree();

  const { nodesMap, clientIds, expandedState, toggleExpanded } = useTreeAdapter(tree);

  const handleSelect = useCallback((id: string) => {
    setSelectedNodeId(id);
  }, [setSelectedNodeId]);

  return (
    <TreeAdapterContext.Provider value={{ nodes: nodesMap, expandedState, toggleExpanded }}>
      <div
        style={{
          width: '280px',
          borderRight: '1px solid rgba(0, 0, 0, 0.133)',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Layers</h3>
          <DropdownMenu icon={plus} label="Add Component" style={{ minWidth: '200px' }}>
            {() => (
              <MenuGroup>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'VStack')}>
                  VStack
                </MenuItem>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'HStack')}>
                  HStack
                </MenuItem>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'Grid')}>
                  Grid
                </MenuItem>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'Spacer')}>
                  Spacer
                </MenuItem>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'Box')}>
                  Box
                </MenuItem>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'Text')}>
                  Text
                </MenuItem>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'Heading')}>
                  Heading
                </MenuItem>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'Button')}>
                  Button
                </MenuItem>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'TextInput')}>
                  TextInput
                </MenuItem>
                <MenuItem onClick={() => addComponent(selectedNodeId || ROOT_VSTACK_ID, 'Image')}>
                  Image
                </MenuItem>
              </MenuGroup>
            )}
          </DropdownMenu>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Simple tree rendering for now - WordPress ListView requires block editor store setup */}
          <div style={{ padding: '8px' }}>
            {tree.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                isSelected={node.id === selectedNodeId}
                isExpanded={expandedState[node.id] !== false}
                onSelect={handleSelect}
                onToggleExpanded={toggleExpanded}
              />
            ))}
          </div>
        </div>
      </div>
    </TreeAdapterContext.Provider>
  );
};

// Wrapper to connect TreeNode with context
interface TreeNodeWrapperProps {
  node: ComponentNode;
  level: number;
  onSelect: (id: string) => void;
  onToggleExpanded: (id: string) => void;
}

const TreeNodeWrapper: React.FC<TreeNodeWrapperProps> = (props) => {
  const { selectedNodeId } = useComponentTree();
  const context = useContext(TreeAdapterContext);

  return (
    <TreeNode
      {...props}
      isSelected={props.node.id === selectedNodeId}
      isExpanded={context?.expandedState[props.node.id] !== false}
    />
  );
};

// Simple tree node renderer
interface TreeNodeProps {
  node: ComponentNode;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (id: string) => void;
  onToggleExpanded: (id: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpanded,
}) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          paddingLeft: `${level * 24 + 8}px`,
          paddingRight: '8px',
          cursor: 'pointer',
          backgroundColor: isSelected ? '#2271b1' : 'transparent',
          color: isSelected ? '#fff' : 'inherit',
        }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expander */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              onToggleExpanded(node.id);
            }
          }}
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            visibility: hasChildren ? 'visible' : 'hidden',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'inherit',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{
              transition: 'transform 0.2s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <path d="M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z" />
          </svg>
        </button>

        {/* Drag Handle */}
        <span
          style={{
            marginRight: '4px',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 16.5h10V15H7v1.5zm0-9V9h10V7.5H7z" />
          </svg>
        </span>

        {/* Block Name */}
        <span style={{ flex: 1 }}>{node.name || node.type}</span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNodeWrapper
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};
