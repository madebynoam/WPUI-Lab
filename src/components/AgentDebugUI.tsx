import React from 'react';
import { useAgentDebug } from '@/contexts/AgentDebugContext';

/**
 * Agent Debug UI (disabled - v2.0 removed)
 *
 * This component was part of the v2.0 two-phase system (Planner + Builder).
 * Debug mode is no longer available in v3.0 multi-agent system.
 */
export const AgentDebugUI: React.FC = () => {
  const { isDebugMode } = useAgentDebug();

  if (!isDebugMode) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 10000,
    }}>
      <h3>Debug Mode Disabled</h3>
      <p>Debug mode is no longer available (v2.0 system removed).</p>
      <p>The application now uses v3.0 multi-agent orchestrator.</p>
    </div>
  );
};
