import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { ROOT_GRID_ID } from './ComponentTreeContext';

interface SelectionContextType {
  lastClickTimeRef: React.MutableRefObject<number>;
  lastClickedIdRef: React.MutableRefObject<string | null>;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize to root VStack context - no selection means root VStack
  const lastClickTimeRef = useRef<number>(0);
  const lastClickedIdRef = useRef<string | null>(ROOT_GRID_ID);

  console.log('[SelectionContext] Initialized with:', {
    lastClickTime: lastClickTimeRef.current,
    lastClickedId: lastClickedIdRef.current,
  });

  return (
    <SelectionContext.Provider value={{ lastClickTimeRef, lastClickedIdRef }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
};

