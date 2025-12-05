import React, { useCallback } from 'react';
import { useAgentDebug } from '@/src/contexts/AgentDebugContext';
import { useComponentTree } from '@/src/contexts/ComponentTreeContext';
import { executePhase, PLANNER_PROMPT, getBUILDER_PROMPT } from '@/src/agent/messageHandler';
import { getTool, convertToolToLLM, getToolsForLLM } from '@/src/agent/tools/registry';

export const AgentDebugUI: React.FC = () => {
  const {
    isDebugMode,
    phaseResults,
    setPhaseResults,
    currentPhase,
    setCurrentPhase,
    currentUserMessage,
    planOutput,
    setPlanOutput,
    plannerPrompt,
    setPlannerPrompt,
    builderPrompt,
    setBuilderPrompt,
  } = useAgentDebug();

  const { tree, selectedNodeIds, pages, currentPageId, projects, currentProjectId, getNodeById } = useComponentTree();

  if (!isDebugMode || !phaseResults) {
    return null;
  }

  const createToolContext = () => {
    return {
      tree,
      selectedNodeIds,
      pages,
      currentPageId,
      projects,
      currentProjectId,
      getNodeById,
    };
  };

  const handleRerunPhase = useCallback(async () => {
    if (!currentPhase || currentPhase === 'done') return;

    const toolContext = createToolContext();

    if (currentPhase === 'planner') {
      const contextTools = [getTool('context_getProject'), getTool('context_searchComponents')].filter(Boolean);

      const plannerResult = await executePhase(
        'planner',
        plannerPrompt,
        currentUserMessage,
        toolContext,
        undefined,
        contextTools.map(t => convertToolToLLM(t!)),
        (update) => {
          console.log('[AgentDebugUI] Planner progress:', update);
        }
      );

      setPhaseResults([plannerResult]);

      // Extract plan from result
      if (plannerResult.success && plannerResult.output) {
        setPlanOutput(plannerResult.output);
      }
    } else if (currentPhase === 'builder') {
      const allTools = getToolsForLLM();

      const builderResult = await executePhase(
        'builder',
        builderPrompt,
        `Execute this plan: ${JSON.stringify(planOutput)}`,
        toolContext,
        undefined,
        allTools,
        (update) => {
          console.log('[AgentDebugUI] Builder progress:', update);
        }
      );

      setPhaseResults(prev => prev ? [prev[0], builderResult] : [builderResult]);
    }
  }, [currentPhase, currentUserMessage, plannerPrompt, builderPrompt, planOutput, createToolContext, setPhaseResults, setPlanOutput]);

  const handleContinuePhase = useCallback(async () => {
    if (currentPhase === 'planner' && planOutput) {
      const toolContext = createToolContext();
      const generatedBuilderPrompt = getBUILDER_PROMPT(planOutput);
      setBuilderPrompt(generatedBuilderPrompt);
      setCurrentPhase('builder');

      const allTools = getToolsForLLM();
      const builderResult = await executePhase(
        'builder',
        generatedBuilderPrompt,
        `Execute this plan: ${JSON.stringify(planOutput)}`,
        toolContext,
        undefined,
        allTools,
        (update) => {
          console.log('[AgentDebugUI] Builder progress:', update);
        }
      );

      setPhaseResults(prev => prev ? [...prev, builderResult] : [builderResult]);
    }
  }, [currentPhase, currentUserMessage, planOutput, createToolContext, setPhaseResults, setCurrentPhase, setBuilderPrompt]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '500px',
        maxHeight: '80vh',
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          fontWeight: '600',
          fontSize: '14px',
          backgroundColor: '#f5f5f5',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
        }}
      >
        Agent Debug Mode
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {phaseResults.map((phase, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              padding: '12px',
              backgroundColor: '#fafafa',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '8px',
                textTransform: 'capitalize',
              }}
            >
              {phase.phase} Phase
            </div>

            <div
              style={{
                fontSize: '11px',
                color: '#666',
                marginBottom: '12px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span>Duration: {(phase.duration / 1000).toFixed(2)}s</span>
              <span>•</span>
              <span>Tokens: {phase.inputTokens} in, {phase.outputTokens} out</span>
              <span>•</span>
              <span>Cost: ${phase.cost.toFixed(5)}</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  color: '#666',
                }}
              >
                Prompt:
              </div>
              <textarea
                value={phase.phase === 'planner' ? plannerPrompt : builderPrompt}
                onChange={(e) => {
                  if (phase.phase === 'planner') {
                    setPlannerPrompt(e.target.value);
                  } else if (phase.phase === 'builder') {
                    setBuilderPrompt(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                  backgroundColor: '#fff',
                }}
              />
            </div>

            <details>
              <summary
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#666',
                  marginBottom: '8px',
                }}
              >
                Show output
              </summary>
              <pre
                style={{
                  fontSize: '10px',
                  backgroundColor: '#fff',
                  padding: '8px',
                  borderRadius: '4px',
                  overflowX: 'auto',
                  border: '1px solid #ddd',
                  margin: 0,
                  marginTop: '8px',
                }}
              >
                {JSON.stringify(phase.output, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>

      {currentPhase && currentPhase !== 'done' && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            gap: '8px',
            backgroundColor: '#f5f5f5',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
          }}
        >
          <button
            onClick={handleRerunPhase}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ↻ Rerun {currentPhase}
          </button>
          {currentPhase === 'planner' && planOutput && (
            <button
              onClick={handleContinuePhase}
              style={{
                flex: 1,
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: '#3858e9',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              → Continue to Builder
            </button>
          )}
        </div>
      )}
    </div>
  );
};
