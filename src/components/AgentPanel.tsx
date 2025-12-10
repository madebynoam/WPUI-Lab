'use client';

import React, { useState, useCallback, useEffect } from "react";
import { AgentUI } from "@automattic/agenttic-ui";
import "@automattic/agenttic-ui/index.css";
import { Button, Dropdown, MenuGroup, MenuItem } from "@wordpress/components";
import { close, moreVertical } from "@wordpress/icons";
import { useComponentTree } from "@/src/contexts/ComponentTreeContext";
import { useAgentDebug } from "@/src/contexts/AgentDebugContext";
import {
  AgentMessage,
  ToolContext,
  handleUserMessage,
  PhaseResult,
  generateSuggestions,
  executePhase,
  PLANNER_PROMPT,
  getBUILDER_PROMPT,
  AgentOrchestrator,
} from "../agent";
import { getTool, getToolsForLLM, convertToolToLLM } from "../agent/tools/registry";

interface AgentPanelProps {
  onClose: () => void;
}

// Singleton orchestrator instance (created once, reused across renders)
let orchestratorInstance: AgentOrchestrator | null = null;
function getOrchestrator() {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
  }
  return orchestratorInstance;
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

  // Use debug context
  const {
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
  } = useAgentDebug();

  // Initialize planner prompt
  useEffect(() => {
    if (!plannerPrompt) {
      setPlannerPrompt(PLANNER_PROMPT);
    }
  }, [plannerPrompt, setPlannerPrompt]);

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
          // Use new multi-agent orchestrator (v3.0)
          const orchestrator = getOrchestrator();

          const result = await orchestrator.handleMessage(
            userMessageText,
            toolContext,
            {
              onProgress: (agentMsg) => {
                console.log("[AgentPanel] Progress update:", agentMsg);

                // Append new progress message to chat
                const progressMessage: AgentMessage = {
                  id: `progress-${Date.now()}-${Math.random()}`,
                  role: "agent",
                  content: [
                    {
                      type: "text",
                      text: agentMsg.message,
                    },
                  ],
                  timestamp: agentMsg.timestamp,
                  archived: false,
                  showIcon: true,
                };
                setMessages((prev) => [...prev, progressMessage]);

                setProgressState({
                  isProcessing: true,
                  phase: null,
                  agent: agentMsg.agent,
                  current: 0,
                  total: 0,
                  message: agentMsg.message,
                });
              },
            }
          );

          // Create agent response from orchestrator result
          agentResponse = {
            id: `agent-${Date.now()}`,
            role: "agent",
            content: [
              {
                type: "text",
                text: result.message,
              },
            ],
            timestamp: Date.now(),
            archived: false,
            showIcon: true,
            metadata: {
              tokensUsed: result.tokensUsed,
              cost: result.cost,
              duration: result.duration,
            },
          };
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
    [createToolContext, messages, isDebugMode, setPhaseResults, setCurrentPhase, setCurrentUserMessage, setPlanOutput, plannerPrompt, setPlannerPrompt]
  );

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
          userSelect: "text",
        }}
      >
        <div style={{
          padding: "12px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "4px",
        }}>
          <Dropdown
            popoverProps={{ placement: "bottom-end" }}
            renderToggle={({ isOpen, onToggle }) => (
              <Button
                icon={moreVertical}
                onClick={onToggle}
                aria-expanded={isOpen}
                title="Agent options"
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
            )}
            renderContent={() => (
              <MenuGroup>
                <MenuItem
                  onClick={() => setIsDebugMode(!isDebugMode)}
                  style={{
                    fontSize: "13px",
                  }}
                >
                  {isDebugMode ? "Disable" : "Enable"} Debug Mode
                </MenuItem>
              </MenuGroup>
            )}
          />
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
