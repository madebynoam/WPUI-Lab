import React, { useState, useCallback, useEffect } from "react";
import { AgentUI } from "@automattic/agenttic-ui";
import "@automattic/agenttic-ui/index.css";
import { useComponentTree } from "../ComponentTreeContext";
import {
  AgentMessage,
  ToolContext,
  handleUserMessage,
  generateSuggestions,
} from "../agent";

export const AgentPanel: React.FC = () => {
  const PANEL_WIDTH = 280;
  const componentTreeContext = useComponentTree();

  const [apiKey, setApiKey] = useState<string>("");
  const [showKey, setShowKey] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

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

  // Load Claude API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("wp-designer-claude-key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Load OpenAI API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("wp-designer-openai-key");
    if (savedKey) {
      setOpenaiApiKey(savedKey);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "wp-designer-agent-messages",
      JSON.stringify(messages)
    );
  }, [messages]);

  // Save Claude API key to localStorage when it changes
  const handleKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem("wp-designer-claude-key", key);
  };

  // Save OpenAI API key to localStorage when it changes
  const handleOpenaiKeyChange = (key: string) => {
    setOpenaiApiKey(key);
    localStorage.setItem("wp-designer-openai-key", key);
  };

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

      // Add temporary progress message
      const progressMessageId = `progress-${Date.now()}`;
      const progressMessage: AgentMessage = {
        id: progressMessageId,
        role: "agent",
        content: [
          {
            type: "text",
            text: "Starting...",
          },
        ],
        timestamp: Date.now(),
        archived: false,
        showIcon: true,
      };
      setMessages((prev) => [...prev, progressMessage]);

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
        const agentResponse = await handleUserMessage(
          userMessageText,
          toolContext,
          apiKey,
          openaiApiKey,
          (update) => {
            console.log("[AgentPanel] Progress update:", update);

            // Update progress message in chat
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === progressMessageId
                  ? {
                      ...msg,
                      content: [
                        {
                          type: "text",
                          text:
                            update.agent && update.total
                              ? `${update.agent} (${update.current}/${update.total}): ${update.message}`
                              : update.message,
                        },
                      ],
                    }
                  : msg
              )
            );

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

        // Remove progress message and add actual response
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== progressMessageId)
        );

        // Add agent response to chat
        setMessages((prev) => [...prev, agentResponse]);
      } catch (err) {
        // Remove progress message
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== progressMessageId)
        );

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
    [createToolContext, apiKey, openaiApiKey]
  );

  // Generate contextual suggestions
  const suggestions = generateSuggestions(createToolContext());

  return (
    <div
      style={{
        width: `${PANEL_WIDTH}px`,
        borderLeft: "1px solid rgba(0, 0, 0, 0.133)",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div style={{ padding: "12px", borderBottom: "1px solid #e0e0e0" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
          AI Assistant
        </h3>
      </div>

      {/* API Keys Input */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#f9fafb",
        }}
      >
        {/* Claude API Key */}
        <div style={{ marginBottom: "12px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 500,
              color: "#1e1e1e",
              marginBottom: "6px",
            }}
          >
            Claude API Key
          </label>
          <div style={{ display: "flex", gap: "4px" }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                flex: 1,
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #ddd",
                borderRadius: "2px",
                outline: "none",
                fontFamily: "monospace",
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                padding: "6px 8px",
                fontSize: "11px",
                border: "1px solid #ddd",
                borderRadius: "2px",
                backgroundColor: "#fff",
                cursor: "pointer",
                color: "#666",
              }}
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
        </div>

        {/* OpenAI API Key */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 500,
              color: "#1e1e1e",
              marginBottom: "6px",
            }}
          >
            OpenAI API Key
          </label>
          <div style={{ display: "flex", gap: "4px" }}>
            <input
              type={showOpenaiKey ? "text" : "password"}
              value={openaiApiKey}
              onChange={(e) => handleOpenaiKeyChange(e.target.value)}
              placeholder="sk-proj-..."
              style={{
                flex: 1,
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #ddd",
                borderRadius: "2px",
                outline: "none",
                fontFamily: "monospace",
              }}
            />
            <button
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              style={{
                padding: "6px 8px",
                fontSize: "11px",
                border: "1px solid #ddd",
                borderRadius: "2px",
                backgroundColor: "#fff",
                cursor: "pointer",
                color: "#666",
              }}
              title={showOpenaiKey ? "Hide key" : "Show key"}
            >
              {showOpenaiKey ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
        </div>
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
  );
};
