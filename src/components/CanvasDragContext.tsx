import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CanvasDragContextType {
  draggedNodeId: string | null;
  setDraggedNodeId: (id: string | null) => void;
  dropTargetId: string | null;
  setDropTargetId: (id: string | null) => void;
  dropPosition: 'before' | 'after' | 'inside' | null;
  setDropPosition: (position: 'before' | 'after' | 'inside' | null) => void;
}

const CanvasDragContext = createContext<CanvasDragContextType | undefined>(undefined);

export const CanvasDragProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  return (
    <CanvasDragContext.Provider
      value={{
        draggedNodeId,
        setDraggedNodeId,
        dropTargetId,
        setDropTargetId,
        dropPosition,
        setDropPosition,
      }}
    >
      {children}
    </CanvasDragContext.Provider>
  );
};

export const useCanvasDrag = () => {
  const context = useContext(CanvasDragContext);
  if (!context) {
    throw new Error('useCanvasDrag must be used within CanvasDragProvider');
  }
  return context;
};
