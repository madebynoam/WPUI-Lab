import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PhaseResult } from '@/src/agent/types';

interface AgentDebugContextType {
  isDebugMode: boolean;
  setIsDebugMode: (value: boolean) => void;
  phaseResults: PhaseResult[] | null;
  setPhaseResults: (results: PhaseResult[] | null) => void;
  currentPhase: 'planner' | 'builder' | 'done' | null;
  setCurrentPhase: (phase: 'planner' | 'builder' | 'done' | null) => void;
  currentUserMessage: string;
  setCurrentUserMessage: (message: string) => void;
  planOutput: any;
  setPlanOutput: (output: any) => void;
  plannerPrompt: string;
  setPlannerPrompt: (prompt: string) => void;
  builderPrompt: string;
  setBuilderPrompt: (prompt: string) => void;
}

const AgentDebugContext = createContext<AgentDebugContextType | undefined>(undefined);

export const AgentDebugProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [phaseResults, setPhaseResults] = useState<PhaseResult[] | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'planner' | 'builder' | 'done' | null>(null);
  const [currentUserMessage, setCurrentUserMessage] = useState<string>('');
  const [planOutput, setPlanOutput] = useState<any>(null);
  const [plannerPrompt, setPlannerPrompt] = useState<string>('');
  const [builderPrompt, setBuilderPrompt] = useState<string>('');

  return (
    <AgentDebugContext.Provider
      value={{
        isDebugMode,
        setIsDebugMode,
        phaseResults,
        setPhaseResults,
        currentPhase,
        setCurrentPhase,
        currentUserMessage,
        setCurrentUserMessage,
        planOutput,
        setPlanOutput,
        plannerPrompt,
        setPlannerPrompt,
        builderPrompt,
        setBuilderPrompt,
      }}
    >
      {children}
    </AgentDebugContext.Provider>
  );
};

export const useAgentDebug = () => {
  const context = useContext(AgentDebugContext);
  if (context === undefined) {
    throw new Error('useAgentDebug must be used within an AgentDebugProvider');
  }
  return context;
};
