/**
 * WP Designer Tree Panel - Rewritten to match WordPress Gutenberg ListView exactly
 */
import React, { useState, useEffect, useRef, useCallback, useReducer, useMemo, forwardRef } from 'react';
import clsx from 'clsx';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
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
import {
  moreVertical,
  chevronDown,
  chevronRight,
  dragHandle,
  plus,
} from '@wordpress/icons';
import './TreePanel.css';

// Constants matching WordPress
const BLOCK_LIST_ITEM_HEIGHT = 32;
const NESTING_LEVEL_INDENTATION = 24;

// Expanded state reducer (copied from WordPress)
const expanded = (state: Record<string, boolean>, action: { type: string; clientIds?: string[] }) => {
  if (action.type === 'clear') {
    return {};
  }
  if (Array.isArray(action.clientIds)) {
    return {
      ...state,
      ...action.clientIds.reduce(
        (newState, id) => ({
          ...newState,
          [id]: action.type === 'expand',
        }),
        {}
      ),
    };
  }
  return state;
};

// Displacement calculation (copied from WordPress utils.js)
function getDragDisplacementValues({
  blockIndexes,
  blockDropTargetIndex,
  blockDropPosition,
  clientId,
  firstDraggedBlockIndex,
  isDragged,
}: {
  blockIndexes: Record<string, number>;
  blockDropTargetIndex?: number | null;
  blockDropPosition?: 'before' | 'after' | 'inside' | null;
  clientId: string;
  firstDraggedBlockIndex?: number;
  isDragged?: boolean;
}) {
  let displacement: 'up' | 'down' | 'normal' | undefined;
  let isNesting = false;
  let isAfterDraggedBlocks = false;

  if (!isDragged) {
    const thisBlockIndex = blockIndexes[clientId];
    isAfterDraggedBlocks = thisBlockIndex > (firstDraggedBlockIndex || 0);

    if (
      blockDropTargetIndex !== undefined &&
      blockDropTargetIndex !== null &&
      firstDraggedBlockIndex !== undefined
    ) {
      if (thisBlockIndex !== undefined) {
        if (
          thisBlockIndex >= firstDraggedBlockIndex &&
          thisBlockIndex < blockDropTargetIndex
        ) {
          displacement = 'up';
        } else if (
          thisBlockIndex < firstDraggedBlockIndex &&
          thisBlockIndex >= blockDropTargetIndex
        ) {
          displacement = 'down';
        } else {
          displacement = 'normal';
        }
        isNesting =
          typeof blockDropTargetIndex === 'number' &&
          blockDropTargetIndex - 1 === thisBlockIndex &&
          blockDropPosition === 'inside';
      }
    } else if (
      blockDropTargetIndex === null &&
      firstDraggedBlockIndex !== undefined
    ) {
      if (
        thisBlockIndex !== undefined &&
        thisBlockIndex >= firstDraggedBlockIndex
      ) {
        displacement = 'up';
      } else {
        displacement = 'normal';
      }
    }
  }

  return {
    displacement,
    isNesting,
    isAfterDraggedBlocks,
  };
}

// ListViewLeaf component (matching WordPress)
interface ListViewLeafProps {
  children: React.ReactNode;
  className?: string;
  level: number;
  position: number;
  rowCount: number;
  clientId: string;
  isDragged?: boolean;
  displacement?: 'up' | 'down' | 'normal';
  isAfterDraggedBlocks?: boolean;
  isNesting?: boolean;
  isExpanded?: boolean;
}

const ListViewLeaf = forwardRef<HTMLDivElement, ListViewLeafProps>(
  ({ children, className, level, position, rowCount, clientId, isDragged, displacement, isAfterDraggedBlocks, isNesting, isExpanded }, ref) => {
    const classes = clsx('tree-panel-leaf', className, {
      'is-dragging': isDragged,
      'is-displacement-up': displacement === 'up',
      'is-displacement-down': displacement === 'down',
      'is-displacement-normal': displacement === 'normal',
      'is-after-dragged-blocks': isAfterDraggedBlocks,
      'is-nesting': isNesting,
    });

    return (
      <TreeGridRow
        ref={ref as any}
        className={classes}
        level={level}
        positionInSet={position}
        setSize={rowCount}
        isExpanded={isExpanded}
        data-block={clientId}
        data-expanded={isExpanded}
      >
        {children}
      </TreeGridRow>
    );
  }
);

// ListViewBlockSelectButton (matching WordPress)
interface BlockSelectButtonProps {
  node: ComponentNode;
  onClick: (e: React.MouseEvent) => void;
  onToggleExpanded: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  draggable?: boolean;
  isExpanded?: boolean;
  level: number;
  isSelected: boolean;
}

const ListViewBlockSelectButton = forwardRef<HTMLAnchorElement, BlockSelectButtonProps>(
  ({ node, onClick, onToggleExpanded, onDragStart, onDragEnd, onDragOver, draggable, isExpanded, level, isSelected }, ref) => {
    const definition = componentRegistry[node.type];
    const hasChildren = node.children && node.children.length > 0;

    const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.clearData();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', node.id);
      if (onDragStart) {
        onDragStart(e);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (onDragOver) {
        onDragOver(e);
      }
    };

    return (
      <a
        ref={ref}
        className="tree-panel-row"
        onClick={onClick}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        href={`#block-${node.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          paddingLeft: `${(level - 1) * NESTING_LEVEL_INDENTATION + 8}px`,
          paddingRight: '8px',
          textDecoration: 'none',
          color: 'inherit',
          userSelect: 'none',
        }}
      >
        {/* Expander */}
        <span
          className="block-editor-list-view__expander"
          onClick={(e) => {
            if (hasChildren) {
              onToggleExpanded(e);
            }
          }}
          aria-hidden="true"
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            visibility: hasChildren ? 'visible' : 'hidden',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            <path d="M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z" />
          </svg>
        </span>

        {/* Drag Handle */}
        <span style={{ marginRight: '4px', opacity: 0.6, display: 'flex', alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 16.5h10V15H7v1.5zm0-9V9h10V7.5H7z" />
          </svg>
        </span>

        {/* Block Name */}
        <span style={{ flex: 1 }}>
          {node.name || node.type}
        </span>
      </a>
    );
  }
);

// ListViewBlock component
interface ListViewBlockProps {
  node: ComponentNode;
  level: number;
  position: number;
  rowCount: number;
  selectBlock: (e: React.MouseEvent, clientId: string) => void;
  isSelected: boolean;
  isDragged: boolean;
  isExpanded?: boolean;
  displacement?: 'up' | 'down' | 'normal';
  isAfterDraggedBlocks?: boolean;
  isNesting?: boolean;
  onDragStart: (clientId: string) => void;
  onDragEnd: () => void;
  onDropTargetChange: (clientId: string, position: 'before' | 'after' | 'inside') => void;
}

const ListViewBlock: React.FC<ListViewBlockProps> = ({
  node,
  level,
  position,
  rowCount,
  selectBlock,
  isSelected,
  isDragged,
  isExpanded,
  displacement,
  isAfterDraggedBlocks,
  isNesting,
  onDragStart,
  onDragEnd,
  onDropTargetChange,
}) => {
  const { removeComponent, duplicateComponent } = useComponentTree();
  const [expandedLocal, setExpandedLocal] = useState(isExpanded);
  const rowRef = useRef<HTMLAnchorElement>(null);

  const handleToggleExpanded = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedLocal(!expandedLocal);
  };

  const handleDragStart = () => {
    onDragStart(node.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    selectBlock(e, node.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    // Calculate drop position based on cursor Y position within the row
    if (rowRef.current && !isDragged) {
      const rect = rowRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const rowHeight = rect.height;

      const hasChildren = node.children && node.children.length > 0;

      // Divide row into zones: top 25% = before, middle 50% = inside, bottom 25% = after
      if (relativeY < rowHeight * 0.25) {
        onDropTargetChange(node.id, 'before');
      } else if (relativeY > rowHeight * 0.75) {
        onDropTargetChange(node.id, 'after');
      } else if (hasChildren) {
        onDropTargetChange(node.id, 'inside');
      } else {
        // If no children, default to after
        onDropTargetChange(node.id, 'after');
      }
    }
  };

  return (
    <ListViewLeaf
      clientId={node.id}
      className={clsx({ 'is-selected': isSelected })}
      level={level}
      position={position}
      rowCount={rowCount}
      isDragged={isDragged}
      displacement={displacement}
      isAfterDraggedBlocks={isAfterDraggedBlocks}
      isNesting={isNesting}
      isExpanded={expandedLocal}
    >
      <TreeGridCell>
        {({ ref, tabIndex, onFocus }: any) => (
          <ListViewBlockSelectButton
            ref={(el) => {
              // Handle both refs
              if (typeof ref === 'function') {
                ref(el);
              }
              rowRef.current = el;
            }}
            node={node}
            onClick={handleClick}
            onToggleExpanded={handleToggleExpanded}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onDragOver={handleDragOver}
            draggable={node.id !== ROOT_VSTACK_ID}
            isExpanded={expandedLocal}
            level={level}
            isSelected={isSelected}
          />
        )}
      </TreeGridCell>
    </ListViewLeaf>
  );
};

// Main TreePanel component
export const TreePanel: React.FC = () => {
  const {
    tree,
    selectedNodeId,
    setSelectedNodeId,
    reorderComponent,
  } = useComponentTree();

  const [expandedState, setExpandedState] = useReducer(expanded, {});
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ clientId: string; position: 'before' | 'after' | 'inside' } | null>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Build flat list of all blocks with indexes
  const blockIndexes = useMemo(() => {
    const indexes: Record<string, number> = {};
    let currentIndex = 0;

    const traverse = (nodes: ComponentNode[]) => {
      for (const node of nodes) {
        indexes[node.id] = currentIndex++;
        if (node.children && expandedState[node.id] !== false) {
          traverse(node.children);
        }
      }
    };

    traverse(tree);
    return indexes;
  }, [tree, expandedState]);

  const handleDragStart = (clientId: string) => {
    setDraggedClientId(clientId);
  };

  const handleDragEnd = () => {
    if (draggedClientId && dropTarget) {
      reorderComponent(draggedClientId, dropTarget.clientId, dropTarget.position);
    }
    setDraggedClientId(null);
    setDropTarget(null);
  };

  const handleDropTargetChange = useCallback((clientId: string, position: 'before' | 'after' | 'inside') => {
    setDropTarget({ clientId, position });
  }, []);

  const selectBlock = (e: React.MouseEvent, clientId: string) => {
    setSelectedNodeId(clientId);
  };

  const renderBlocks = (blocks: ComponentNode[], level: number = 1): React.ReactNode[] => {
    return blocks.map((node, index) => {
      const isDragged = node.id === draggedClientId;
      const isSelected = node.id === selectedNodeId;
      const isExpanded = expandedState[node.id] ?? true;

      const { displacement, isAfterDraggedBlocks, isNesting } = getDragDisplacementValues({
        blockIndexes,
        blockDropTargetIndex: dropTarget ? blockIndexes[dropTarget.clientId] : undefined,
        blockDropPosition: dropTarget?.position,
        clientId: node.id,
        firstDraggedBlockIndex: draggedClientId ? blockIndexes[draggedClientId] : undefined,
        isDragged,
      });

      return (
        <React.Fragment key={node.id}>
          <ListViewBlock
            node={node}
            level={level}
            position={index + 1}
            rowCount={blocks.length}
            selectBlock={selectBlock}
            isSelected={isSelected}
            isDragged={isDragged}
            isExpanded={isExpanded}
            displacement={displacement}
            isAfterDraggedBlocks={isAfterDraggedBlocks}
            isNesting={isNesting}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDropTargetChange={handleDropTargetChange}
          />
          {node.children && node.children.length > 0 && isExpanded && !isDragged && (
            renderBlocks(node.children, level + 1)
          )}
        </React.Fragment>
      );
    });
  };

  return (
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
      <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Layers</h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <TreeGrid style={{ width: '100%' }}>
          {renderBlocks(tree)}
        </TreeGrid>
      </div>
    </div>
  );
};
