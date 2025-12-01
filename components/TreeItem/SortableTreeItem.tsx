import React, { CSSProperties } from 'react';
import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { TreeItem, TreeItemProps } from './TreeItem';

interface Props extends TreeItemProps {
  id: string;
}

const animateLayoutChanges: AnimateLayoutChanges = ({ isSorting, wasDragging }) =>
  isSorting || wasDragging ? false : true;

export function SortableTreeItem({ id, depth, wrapperRef, ...props }: Props) {
  const {
    attributes,
    isDragging,
    isSorting,
    listeners,
    setDraggableNodeRef,
    setDroppableNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    animateLayoutChanges,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  // Combine both refs: dnd-kit's setDroppableNodeRef and the custom wrapperRef
  const combinedWrapperRef = (node: HTMLLIElement | null) => {
    setDroppableNodeRef(node);
    if (wrapperRef) {
      wrapperRef(node!);
    }
  };

  return (
    <TreeItem
      ref={setDraggableNodeRef}
      wrapperRef={combinedWrapperRef}
      style={style}
      depth={depth}
      ghost={isDragging}
      disableSelection={isDragging}
      disableInteraction={isSorting}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      {...props}
    />
  );
}
