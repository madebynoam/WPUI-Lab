import React, { createContext, useContext, useRef, ReactNode } from 'react';

interface SelectionContextType {
  lastClickTimeRef: React.MutableRefObject<number>;
  lastClickedIdRef: React.MutableRefObject<string | null>;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const lastClickTimeRef = useRef<number>(0);
  const lastClickedIdRef = useRef<string | null>(null);

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
