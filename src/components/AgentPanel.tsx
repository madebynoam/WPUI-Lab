'use client';

import React, { useState, useCallback, useEffect } from "react";
import { AgentUI } from "@automattic/agenttic-ui";
import "@automattic/agenttic-ui/index.css";
import { Button } from "@wordpress/components";
import { close } from "@wordpress/icons";
import { useComponentTree } from "@/src/contexts/ComponentTreeContext";
import {
  AgentMessage,
  ToolContext,
  handleUserMessage,
  PhaseResult,
  generateSuggestions,
  executePhase,
  PLANNER_PROMPT,
  getBUILDER_PROMPT,
} from "../agent";
import { getTool, getToolsForLLM, convertToolToLLM } from "../agent/tools/registry";

interface AgentPanelProps {
  onClose: () => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ onClose }) => {
  const PANEL_WIDTH = 280;
  const componentTreeContext = useComponentTree();

  // Progress state
  const [progressState, setProgressState] = useState<{
    isProcessing: boolean;
    phase: string | null;
    agent: string | null;
    current: number;
    total: number;
    message: string;
  }>({
    isProcessing: false,
    phase: null,
    agent: null,
    current: 0,
    total: 0,
    message: "",
  });

  // Abort controller for stop button
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // Debug mode detection (from URL parameter)
  const [isDebugMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('debug_agent') === 'true';
  });

  // Phase results for debug mode
  const [phaseResults, setPhaseResults] = useState<PhaseResult[] | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'planner' | 'builder' | 'done' | null>(null);
  const [currentUserMessage, setCurrentUserMessage] = useState<string>('');
  const [planOutput, setPlanOutput] = useState<any>(null);

  // Editable prompts for debug mode
  const [plannerPrompt, setPlannerPrompt] = useState<string>(PLANNER_PROMPT);
  const [builderPrompt, setBuilderPrompt] = useState<string>('');

  // Default welcome message
  const defaultWelcomeMessage: AgentMessage = {
    id: "welcome",
    role: "agent",
    content: [
      {
        type: "text",
        text: "Hi! I'm your AI assistant. I can help you build and modify your UI.",
      },
    ],
    timestamp: Date.now(),
    archived: false,
    showIcon: true,
  };

  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    // Load messages from localStorage on mount
    const savedMessages = localStorage.getItem("wp-designer-agent-messages");
    if (savedMessages) {
      try {
        return JSON.parse(savedMessages);
      } catch (e) {
        console.error("Failed to parse saved messages:", e);
        return [defaultWelcomeMessage];
      }
    }
    return [defaultWelcomeMessage];
  });

  const [error, setError] = useState<string | null>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "wp-designer-agent-messages",
      JSON.stringify(messages)
    );
  }, [messages]);

  // Handle stop button
  const handleStop = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setProgressState({
        isProcessing: false,
        phase: null,
        agent: null,
        current: 0,
        total: 0,
        message: "",
      });
    }
  }, [abortController]);

  // Create tool context from component tree context - simple pass-through to use same code paths as UI
  // With useReducer, the reducer always receives current state, so no refs needed!
  const createToolContext = useCallback((): ToolContext => {
    return {
      // Use getters to always return current state (not snapshots!)
      // This ensures that when createPage switches pages, subsequent tool calls see the new page
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

      // Direct pass-through - agent uses exact same code paths as UI
      getNodeById: componentTreeContext.getNodeById,
      setTree: componentTreeContext.setTree, // PRIMARY: Direct tree manipulation for data structure approach
      updateComponentProps: componentTreeContext.updateComponentProps,
      updateMultipleComponentProps:
        componentTreeContext.updateMultipleComponentProps,
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

  // Handle user message submission
  const handleSubmit = useCallback(
    async (userMessageText: string) => {
      if (!userMessageText.trim()) return;

      // Handle commands (messages starting with "/")
      if (userMessageText.startsWith("/")) {
        const command = userMessageText.toLowerCase().trim();

        if (command === "/clear") {
          // Clear messages and reset to welcome message
          setMessages([defaultWelcomeMessage]);
          localStorage.removeItem("wp-designer-agent-messages");
          return;
        }

        // Unknown command
        const errorMessage: AgentMessage = {
          id: `error-${Date.now()}`,
          role: "agent",
          content: [
            {
              type: "text",
              text: `Unknown command: ${userMessageText}\n\nAvailable commands:\n• /clear - Clear chat history`,
            },
          ],
          timestamp: Date.now(),
          archived: false,
          showIcon: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      // Add user message to chat
      const userMessage: AgentMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: [
          {
            type: "text",
            text: userMessageText,
          },
        ],
        timestamp: Date.now(),
        archived: false,
        showIcon: true,
      };

      setMessages((prev) => [...prev, userMessage]);
      setError(null);

      // Create abort controller for stop button
      const controller = new AbortController();
      setAbortController(controller);

      // Set initial progress state
      setProgressState({
        isProcessing: true,
        phase: null,
        agent: null,
        current: 0,
        total: 0,
        message: "Starting...",
      });

      try {
        // Process message and get agent response
        const toolContext = createToolContext();

        let agentResponse: AgentMessage;

        if (isDebugMode) {
          // Debug mode: Run ONLY planner phase, then stop
          setCurrentUserMessage(userMessageText);
          setCurrentPhase('planner');

          const contextTools = [getTool('context_getProject'), getTool('context_searchComponents')].filter(Boolean);
          const plannerResult = await executePhase(
            'planner',
            plannerPrompt,
            userMessageText,
            toolContext,
            undefined, // API key handled server-side
            contextTools.map(t => convertToolToLLM(t!)),
            (update) => {
              setProgressState({
                isProcessing: true,
                phase: 'planner',
                agent: null,
                current: 0,
                total: 0,
                message: update.message,
              });
            }
          );

          // Store results
          setPhaseResults([plannerResult]);

          // Try to parse plan from output
          try {
            const jsonMatch = plannerResult.output?.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              setPlanOutput(JSON.parse(jsonMatch[0]));
            }
          } catch (e) {
            console.error('Failed to parse plan:', e);
          }

          // Don't add agent response yet - waiting for user to click Continue
          return; // STOP HERE - wait for user input
        } else {
          // Use regular handler
          agentResponse = await handleUserMessage(
            userMessageText,
            toolContext,
            undefined, // API keys now handled server-side
            undefined, // API keys now handled server-side
            (update) => {
              console.log("[AgentPanel] Progress update:", update);

              // Append new progress message to chat
              const progressMessage: AgentMessage = {
                id: `progress-${Date.now()}-${Math.random()}`,
                role: "agent",
                content: [
                  {
                    type: "text",
                    text: update.message,
                  },
                ],
                timestamp: Date.now(),
                archived: false,
                showIcon: true,
              };
              setMessages((prev) => [...prev, progressMessage]);

              setProgressState({
                isProcessing: true,
                phase: update.phase,
                agent: update.agent || null,
                current: update.current || 0,
                total: update.total || 0,
                message: update.message,
              });
            },
            controller.signal,
            messages  // Pass conversation history for context
          );
        }

        // Add agent response to chat
        setMessages((prev) => [...prev, agentResponse]);
      } catch (err) {
        // Handle abort (user clicked stop) - don't show error
        if (err instanceof Error && err.name === "AbortError") {
          console.log("Request aborted by user");
          return;
        }

        console.error("Error processing message:", err);
        setError(err instanceof Error ? err.message : "An error occurred");

        // Add error message to chat
        const errorMessage: AgentMessage = {
          id: `error-${Date.now()}`,
          role: "agent",
          content: [
            {
              type: "text",
              text: `Sorry, I encountered an error: ${
                err instanceof Error ? err.message : "Unknown error"
              }`,
            },
          ],
          timestamp: Date.now(),
          archived: false,
          showIcon: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setAbortController(null);
        setProgressState({
          isProcessing: false,
          phase: null,
          agent: null,
          current: 0,
          total: 0,
          message: "",
        });
      }
    },
    [createToolContext, messages, isDebugMode]
  );

  // Debug mode: Continue to next phase
  const handleContinuePhase = useCallback(async () => {
    if (!currentPhase || !currentUserMessage) return;

    setProgressState({
      isProcessing: true,
      phase: currentPhase === 'planner' ? 'builder' : null,
      agent: null,
      current: 0,
      total: 0,
      message: currentPhase === 'planner' ? 'Building...' : 'Processing...',
    });

    try {
      const toolContext = createToolContext();

      if (currentPhase === 'planner' && planOutput) {
        // Run builder phase
        const generatedBuilderPrompt = getBUILDER_PROMPT(planOutput);
        setBuilderPrompt(generatedBuilderPrompt);

        const allTools = getToolsForLLM();
        const builderResult = await executePhase(
          'builder',
          generatedBuilderPrompt,
          `Execute this plan: ${JSON.stringify(planOutput)}`,
          toolContext,
          undefined,
          allTools,
          (update) => {
            setProgressState({
              isProcessing: true,
              phase: 'builder',
              agent: null,
              current: 0,
              total: 0,
              message: update.message,
            });
          }
        );

        setPhaseResults(prev => prev ? [...prev, builderResult] : [builderResult]);
        setCurrentPhase('builder'); // Keep as builder so user can rerun

        // Add final agent response
        const agentResponse: AgentMessage = {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: [{
            type: 'text',
            text: builderResult.output || 'Completed',
          }],
          timestamp: Date.now(),
          archived: false,
          showIcon: true,
        };
        setMessages((prev) => [...prev, agentResponse]);
      }
    } catch (err) {
      console.error('Error continuing phase:', err);
    } finally {
      setProgressState({
        isProcessing: false,
        phase: null,
        agent: null,
        current: 0,
        total: 0,
        message: '',
      });
    }
  }, [currentPhase, currentUserMessage, planOutput, createToolContext]);

  // Debug mode: Rerun current phase
  const handleRerunPhase = useCallback(async () => {
    if (!currentPhase || !currentUserMessage) return;

    setProgressState({
      isProcessing: true,
      phase: currentPhase,
      agent: null,
      current: 0,
      total: 0,
      message: `Rerunning ${currentPhase}...`,
    });

    try {
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
            setProgressState({
              isProcessing: true,
              phase: 'planner',
              agent: null,
              current: 0,
              total: 0,
              message: update.message,
            });
          }
        );

        setPhaseResults([plannerResult]);

        try {
          const jsonMatch = plannerResult.output?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            setPlanOutput(JSON.parse(jsonMatch[0]));
          }
        } catch (e) {
          console.error('Failed to parse plan:', e);
        }
      }
    } catch (err) {
      console.error('Error rerunning phase:', err);
    } finally {
      setProgressState({
        isProcessing: false,
        phase: null,
        agent: null,
        current: 0,
        total: 0,
        message: '',
      });
    }
  }, [currentPhase, currentUserMessage, createToolContext]);

  // Generate contextual suggestions
  const suggestions = generateSuggestions(createToolContext());

  return (
    <>
      <style>{`
        .agenttic {
          --color-background: #1F1F1F;
          --color-foreground: #FFFFFF;
        }
        .agenttic [data-slot='chat-footer'] {
          --color-background: #1F1F1F;
        }
      `}</style>
      <div
        style={{
          width: `${PANEL_WIDTH}px`,
          backgroundColor: "#1F1F1F",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          height: "100%",
        }}
      >
        <div style={{
          padding: "12px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}>
          <Button
            icon={close}
            onClick={onClose}
            title="Close AI assistant"
            style={{
              backgroundColor: "transparent",
              color: "#999",
              border: "none",
              outline: "none",
              boxShadow: "none",
              borderRadius: "2px",
              cursor: "pointer",
              minWidth: "auto",
              padding: "4px",
            }}
          />
        </div>

      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: "8px",
        }}
      >
        {/* Debug Mode: Phase Results */}
        {isDebugMode && phaseResults && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}>
              🔍 Debug Mode - Phase Results
            </div>
            {phaseResults.map((phase, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "12px",
                  padding: "8px",
                  backgroundColor: "#fff",
                  borderRadius: "3px",
                  borderLeft: `3px solid ${phase.success ? "#4caf50" : "#f44336"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <strong>
                    {phase.phase === "planner" && "📋 Phase 1: Planning"}
                    {phase.phase === "builder" && "🔨 Phase 2: Building"}
                    {phase.phase === "verifier" && "✓ Phase 3: Verification"}
                  </strong>
                  <span style={{ color: phase.success ? "#4caf50" : "#f44336" }}>
                    {phase.success ? "✓" : "✗"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>
                  Duration: {(phase.duration / 1000).toFixed(2)}s |
                  Tokens: {phase.inputTokens} in, {phase.outputTokens} out |
                  Cost: ${phase.cost.toFixed(5)}
                </div>
                {phase.error && (
                  <div style={{ color: "#f44336", fontSize: "11px", marginBottom: "6px" }}>
                    Error: {phase.error}
                  </div>
                )}

                {/* Editable Prompt */}
                <div style={{ marginTop: "8px", marginBottom: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "500", marginBottom: "4px", color: "#666" }}>
                    Prompt (editable):
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
                      width: "100%",
                      minHeight: "100px",
                      padding: "6px",
                      fontFamily: "monospace",
                      fontSize: "10px",
                      backgroundColor: "#fafafa",
                      border: "1px solid #ddd",
                      borderRadius: "3px",
                      resize: "vertical",
                    }}
                  />
                </div>

                <details style={{ marginTop: "6px" }}>
                  <summary style={{ cursor: "pointer", fontSize: "11px" }}>
                    Show output
                  </summary>
                  <pre style={{
                    marginTop: "6px",
                    padding: "6px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "3px",
                    fontSize: "10px",
                    overflow: "auto",
                    maxHeight: "150px",
                  }}>
                    {typeof phase.output === 'string'
                      ? phase.output
                      : JSON.stringify(phase.output, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
            <div style={{
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px solid #ddd",
              fontWeight: "bold"
            }}>
              Total Cost: ${phaseResults.reduce((sum, p) => sum + p.cost, 0).toFixed(5)}
            </div>

            {/* Control Buttons */}
            {currentPhase && currentPhase !== 'done' && (
              <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <button
                  onClick={handleRerunPhase}
                  disabled={progressState.isProcessing}
                  style={{
                    flex: 1,
                    padding: "8px",
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: progressState.isProcessing ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: "500",
                  }}
                >
                  ↻ Rerun {currentPhase === 'planner' ? 'Planner' : 'Builder'}
                </button>
                <button
                  onClick={handleContinuePhase}
                  disabled={progressState.isProcessing || !planOutput}
                  style={{
                    flex: 1,
                    padding: "8px",
                    backgroundColor: "#3858e9",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: progressState.isProcessing || !planOutput ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: "500",
                  }}
                >
                  → Continue to Builder
                </button>
              </div>
            )}
          </div>
        )}

        <AgentUI
          messages={messages}
          isProcessing={progressState.isProcessing}
          error={error}
          onSubmit={handleSubmit}
          onStop={handleStop}
          suggestions={suggestions}
          clearSuggestions={() => {
            // Suggestions are regenerated each render, no need to clear
          }}
          variant="embedded"
          placeholder="Ask me anything..."
        />
      </div>
    </div>
    </>
  );
};
