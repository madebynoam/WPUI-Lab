'use client';

import React, { forwardRef, HTMLAttributes, CSSProperties, useState, useEffect, useRef } from 'react';
import { DropdownMenu, MenuGroup, MenuItem, Icon } from '@wordpress/components';
import { moreVertical, page } from '@wordpress/icons';
import styles from './TreeItem.module.css';
import { ROOT_VSTACK_ID } from '@/contexts/ComponentTreeContext';
import { Page } from '../../types';

// Helper to get designer-friendly labels for layout containers
function getDisplayLabel(type: string): string {
  switch (type) {
    case 'VStack':
      return 'Container (Vertical)';
    case 'HStack':
      return 'Container (Horizontal)';
    default:
      return type;
  }
}

export interface TreeItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'id'> {
  childCount?: number;
  clone?: boolean;
  collapsed?: boolean;
  depth: number;
  disableSelection?: boolean;
  disableInteraction?: boolean;
  ghost?: boolean;
  handleProps?: any;
  indicator?: boolean;
  indentationWidth: number;
  value: string;
  itemType: string;
  itemName?: string;
  onCollapse?: () => void;
  onRemove?: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canPaste?: boolean;
  wrapperRef?: (node: HTMLLIElement) => void;
  isSelected?: boolean;
  isRootVStack?: boolean;
  currentPage?: Page;
  onDoubleClick?: () => void;
  editingNodeId?: string | null;
  editingNodeName?: string;
  onEditStart?: () => void;
  onEditChange?: (name: string) => void;
  onEditEnd?: (save: boolean) => void;
  projectedDepth?: number;
}

export const TreeItem = forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      childCount,
      clone,
      depth,
      disableSelection,
      disableInteraction,
      ghost,
      handleProps,
      indentationWidth,
      indicator,
      collapsed,
      onCollapse,
      onRemove,
      onDuplicate,
      onCopy,
      onPaste,
      onMoveUp,
      onMoveDown,
      canPaste = false,
      style,
      value,
      itemType,
      itemName,
      wrapperRef,
      isSelected = false,
      isRootVStack = false,
      currentPage,
      onDoubleClick,
      editingNodeId,
      editingNodeName = '',
      onEditStart,
      onEditChange,
      onEditEnd,
      projectedDepth,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle double-click for name editing
    const handleNameClick = (e: React.MouseEvent) => {
      if (isRootVStack) return;

      const newCount = clickCount + 1;
      setClickCount(newCount);

      if (newCount === 1) {
        // First click - start timer
        clickTimeoutRef.current = setTimeout(() => {
          setClickCount(0);
        }, 350);
      } else if (newCount === 2) {
        // Second click - trigger edit
        e.stopPropagation();
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        setClickCount(0);
        onEditStart?.();
      }
    };

    useEffect(() => {
      return () => {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
      };
    }, []);

    return (
      <li
        className={styles.Wrapper}
        ref={wrapperRef}
        style={
          {
            '--spacing': `${depth === 0 ? 0 : indentationWidth * depth + 8}px`,
          } as CSSProperties
        }
        {...props}
      >
        <div
          className={`${styles.TreeItem} ${ghost ? styles.ghost : ''} ${
            isSelected ? styles.selected : ''
          } ${indicator ? styles.indicator : ''} ${
            disableSelection ? styles.disableSelection : ''
          } ${disableInteraction ? styles.disableInteraction : ''}`}
          ref={ref}
          style={style}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          {...handleProps}
        >
          {/* Chevron for collapsible items */}
          {childCount && childCount > 0 ? (
            <button
              className={`${styles.Chevron} ${
                collapsed ? styles.collapsed : styles.expanded
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onCollapse?.();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z" />
              </svg>
            </button>
          ) : (
            <div className={styles.Spacer} />
          )}

          {/* Component Name */}
          {editingNodeId === value ? (
            <input
              type="text"
              className={styles.Input}
              value={editingNodeName}
              onChange={(e) => onEditChange?.(e.target.value)}
              onBlur={() => onEditEnd?.(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onEditEnd?.(true);
                } else if (e.key === 'Escape') {
                  onEditEnd?.(false);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : clone ? (
            <div className={styles.Clone}>
              {itemName ? `${itemName} (${getDisplayLabel(itemType)})` : getDisplayLabel(itemType)}
            </div>
          ) : (
            <span className={styles.Text} onClick={handleNameClick}>
              {isRootVStack ? (
                <>
                  <Icon icon={page} size={16} style={{ marginRight: '4px' }} />
                  {currentPage?.name || 'Untitled'}
                </>
              ) : itemName ? (
                `${itemName} (${getDisplayLabel(itemType)})`
              ) : (
                getDisplayLabel(itemType)
              )}
            </span>
          )}

          {/* Actions Menu */}
          {!clone && !isRootVStack && (
            <div
              className={styles.Actions}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu
                icon={moreVertical}
                label="Options"
                popoverProps={{ placement: 'left-start' }}
              >
                {() => (
                  <MenuGroup>
                    <MenuItem onClick={onMoveUp}>Move up</MenuItem>
                    <MenuItem onClick={onMoveDown}>Move down</MenuItem>
                    <MenuItem onClick={onDuplicate}>Duplicate</MenuItem>
                    <MenuItem onClick={onCopy}>Copy</MenuItem>
                    <MenuItem onClick={onPaste} disabled={!canPaste}>
                      Paste
                    </MenuItem>
                    <MenuItem onClick={onRemove} isDestructive>
                      Remove
                    </MenuItem>
                  </MenuGroup>
                )}
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Projection indicator - shows where item will be dropped at projected depth */}
        {projectedDepth !== undefined && indicator && (
          <div
            className={styles.ProjectionIndicator}
            style={{
              '--projection-spacing': `${indentationWidth * projectedDepth + 8}px`,
            } as CSSProperties}
          />
        )}
      </li>
    );
  }
);

TreeItem.displayName = 'TreeItem';
