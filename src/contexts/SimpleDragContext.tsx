import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SimpleDragContextType {
  draggedNodeId: string | null;
  setDraggedNodeId: (id: string | null) => void;
  hoveredSiblingId: string | null;
  setHoveredSiblingId: (id: string | null) => void;
  dropPosition: 'before' | 'after' | null;
  setDropPosition: (position: 'before' | 'after' | null) => void;
  draggedSize: { width: number; height: number } | null;
  setDraggedSize: (size: { width: number; height: number } | null) => void;
  justFinishedDragging: boolean;
  setJustFinishedDragging: (value: boolean) => void;
  draggedItemParentId: string | null;
  setDraggedItemParentId: (id: string | null) => void;
}

const SimpleDragContext = createContext<SimpleDragContextType | undefined>(undefined);

export const SimpleDragProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [hoveredSiblingId, setHoveredSiblingId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [draggedSize, setDraggedSize] = useState<{ width: number; height: number } | null>(null);
  const [justFinishedDragging, setJustFinishedDragging] = useState<boolean>(false);
  const [draggedItemParentId, setDraggedItemParentId] = useState<string | null>(null);

  return (
    <SimpleDragContext.Provider
      value={{
        draggedNodeId,
        setDraggedNodeId,
        hoveredSiblingId,
        setHoveredSiblingId,
        dropPosition,
        setDropPosition,
        draggedSize,
        setDraggedSize,
        justFinishedDragging,
        setJustFinishedDragging,
        draggedItemParentId,
        setDraggedItemParentId,
      }}
    >
      {children}
    </SimpleDragContext.Provider>
  );
};

export const useSimpleDrag = () => {
  const context = useContext(SimpleDragContext);
  if (!context) {
    throw new Error('useSimpleDrag must be used within SimpleDragProvider');
  }
  return context;
};

