import React, { useCallback, useMemo, useState } from 'react';
import { useAgentDebug } from '@/contexts/AgentDebugContext';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { executePhase, PLANNER_PROMPT, getBUILDER_PROMPT } from '@/agent/messageHandler';
import { getTool, convertToolToLLM, getToolsForLLM } from '@/agent/tools/registry';

export const AgentDebugUI: React.FC = () => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, itemId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItem(itemId);
      setTimeout(() => setCopiedItem(null), 2000);
    });
  }, []);

  const {
    isDebugMode,
    setIsDebugMode,
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

  const componentTreeContext = useComponentTree();

  // Get tools for each phase - MUST be before early return (Rules of Hooks)
  const plannerTools = useMemo(() => {
    return [getTool('context_getProject'), getTool('context_searchComponents')]
      .filter(Boolean)
      .map(t => convertToolToLLM(t!));
  }, []);

  const builderTools = useMemo(() => {
    return getToolsForLLM();
  }, []);

  // Create tool context helper - defined before hooks that use it
  const createToolContext = useCallback(() => {
    // Return full context matching AgentPanel - need all methods for tool execution
    return {
      // Getters for current state
      get tree() {
        return componentTreeContext.tree;
      },
      get pages() {
        return componentTreeContext.pages;
      },
      get currentPageId() {
        return componentTreeContext.currentPageId;
      },
      get selectedNodeIds() {
        return componentTreeContext.selectedNodeIds;
      },
      get projects() {
        return componentTreeContext.projects;
      },
      get currentProjectId() {
        return componentTreeContext.currentProjectId;
      },

      // Methods from useComponentTree
      getNodeById: componentTreeContext.getNodeById,
      setTree: componentTreeContext.setTree,
      updateComponentProps: componentTreeContext.updateComponentProps,
      updateMultipleComponentProps: componentTreeContext.updateMultipleComponentProps,
      updateComponentName: componentTreeContext.updateComponentName,
      addComponent: componentTreeContext.insertComponent,
      removeComponent: componentTreeContext.removeComponent,
      copyComponent: componentTreeContext.copyComponent,
      pasteComponent: componentTreeContext.pasteComponent,
      duplicateComponent: componentTreeContext.duplicateComponent,
      addInteraction: componentTreeContext.addInteraction,
      removeInteraction: componentTreeContext.removeInteraction,
      updateInteraction: componentTreeContext.updateInteraction,
      createPage: (name: string, _route: string) => {
        return componentTreeContext.createPageWithId(name);
      },
      setCurrentPage: componentTreeContext.setCurrentPage,
      updatePageTheme: componentTreeContext.updatePageTheme,
      toggleNodeSelection: componentTreeContext.toggleNodeSelection,
    };
  }, [componentTreeContext]);

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

  // Early return AFTER all hooks
  if (!isDebugMode || !phaseResults) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '500px',
        maxHeight: '70vh',
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Agent Debug Mode</span>
        <button
          onClick={() => setIsDebugMode(false)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
          }}
          title="Close debug mode"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
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
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Prompt:</span>
                <button
                  onClick={() => copyToClipboard(
                    phase.phase === 'planner' ? plannerPrompt : builderPrompt,
                    `${phase.phase}-prompt-${index}`
                  )}
                  style={{
                    padding: '2px 8px',
                    fontSize: '10px',
                    backgroundColor: copiedItem === `${phase.phase}-prompt-${index}` ? '#4CAF50' : '#fff',
                    color: copiedItem === `${phase.phase}-prompt-${index}` ? '#fff' : '#666',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  {copiedItem === `${phase.phase}-prompt-${index}` ? '✓ Copied' : 'Copy'}
                </button>
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

            <details style={{ marginBottom: '12px' }}>
              <summary
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#666',
                  marginBottom: '8px',
                }}
              >
                Tools ({phase.phase === 'planner' ? plannerTools.length : builderTools.length})
              </summary>
              <div
                style={{
                  fontSize: '10px',
                  backgroundColor: '#fff',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  marginTop: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {(phase.phase === 'planner' ? plannerTools : builderTools).map((tool: any) => (
                  <div
                    key={tool.function.name}
                    style={{
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: '600',
                        marginBottom: '4px',
                        color: '#333',
                      }}
                    >
                      {tool.function.name}
                    </div>
                    <div style={{ color: '#666', lineHeight: '1.4' }}>
                      {tool.function.description}
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <details>
              <summary
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#666',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Show output</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(
                      typeof phase.output === 'string'
                        ? phase.output
                        : JSON.stringify(phase.output, null, 2),
                      `${phase.phase}-output-${index}`
                    );
                  }}
                  style={{
                    padding: '2px 8px',
                    fontSize: '10px',
                    backgroundColor: copiedItem === `${phase.phase}-output-${index}` ? '#4CAF50' : '#fff',
                    color: copiedItem === `${phase.phase}-output-${index}` ? '#fff' : '#666',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  {copiedItem === `${phase.phase}-output-${index}` ? '✓ Copied' : 'Copy'}
                </button>
              </summary>
              <pre
                style={{
                  fontSize: '10px',
                  backgroundColor: '#fff',
                  padding: '8px',
                  borderRadius: '4px',
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: '200px',
                  border: '1px solid #ddd',
                  margin: 0,
                  marginTop: '8px',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}
              >
                {typeof phase.output === 'string'
                  ? phase.output
                  : JSON.stringify(phase.output, null, 2)}
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
