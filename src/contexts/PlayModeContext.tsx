import React, { createContext, useContext, useState, useCallback } from 'react';

interface PlayModeContextType {
  getState: (nodeId: string, propName: string) => any;
  setState: (nodeId: string, propName: string, value: any) => void;
  resetAllState: () => void;
}

const PlayModeContext = createContext<PlayModeContextType | undefined>(undefined);

export const PlayModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map of nodeId -> { propName: value }
  const [componentStates, setComponentStates] = useState<Map<string, Record<string, any>>>(new Map());

  const getState = useCallback((nodeId: string, propName: string) => {
    const nodeState = componentStates.get(nodeId);
    return nodeState?.[propName];
  }, [componentStates]);

  const setState = useCallback((nodeId: string, propName: string, value: any) => {
    setComponentStates(prev => {
      const newMap = new Map(prev);
      const nodeState = newMap.get(nodeId) || {};
      newMap.set(nodeId, { ...nodeState, [propName]: value });
      return newMap;
    });
  }, []);

  const resetAllState = useCallback(() => {
    setComponentStates(new Map());
  }, []);

  return (
    <PlayModeContext.Provider value={{ getState, setState, resetAllState }}>
      {children}
    </PlayModeContext.Provider>
  );
};

export const usePlayModeState = () => {
  const context = useContext(PlayModeContext);
  if (!context) {
    throw new Error('usePlayModeState must be used within PlayModeProvider');
  }
  return context;
};

