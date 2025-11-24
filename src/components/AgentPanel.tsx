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

  const [openAIKey, setOpenAIKey] = useState<string>("");
  const [showKey, setShowKey] = useState(false);

  // Default welcome message
  const defaultWelcomeMessage: AgentMessage = {
    id: "welcome",
    role: "agent",
    content: [
      {
        type: "text",
        text: 'Hi! I\'m your AI assistant. I can help you build and modify your UI.\n\nTry asking me:\n• "What pages do I have?"\n• "Add a button to the current page"\n• "Create a new page called About"\n\nType "help" to see everything I can do!',
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

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load OpenAI key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("wp-designer-openai-key");
    if (savedKey) {
      setOpenAIKey(savedKey);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "wp-designer-agent-messages",
      JSON.stringify(messages)
    );
  }, [messages]);

  // Save OpenAI key to localStorage when it changes
  const handleKeyChange = (key: string) => {
    setOpenAIKey(key);
    localStorage.setItem("wp-designer-openai-key", key);
  };

  // Create tool context from component tree context - simple pass-through to use same code paths as UI
  // With useReducer, the reducer always receives current state, so no refs needed!
  const createToolContext = useCallback((): ToolContext => {
    return {
      // Direct access to current state - reducer ensures each action sees updated state
      tree: componentTreeContext.tree,
      pages: componentTreeContext.pages,
      currentPageId: componentTreeContext.currentPageId,
      selectedNodeIds: componentTreeContext.selectedNodeIds,

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
      setIsProcessing(true);
      setError(null);

      try {
        // Process message and get agent response
        const toolContext = createToolContext();
        const agentResponse = await handleUserMessage(
          userMessageText,
          toolContext,
          openAIKey
        );

        // Add agent response to chat
        setMessages((prev) => [...prev, agentResponse]);
      } catch (err) {
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
        setIsProcessing(false);
      }
    },
    [createToolContext, openAIKey]
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

      {/* OpenAI API Key Input */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#f9fafb",
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 500,
            color: "#1e1e1e",
            marginBottom: "6px",
          }}
        >
          OpenAI API Key (temp)
        </label>
        <div style={{ display: "flex", gap: "4px" }}>
          <input
            type={showKey ? "text" : "password"}
            value={openAIKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder="sk-..."
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

      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AgentUI
          messages={messages}
          isProcessing={isProcessing}
          error={error}
          onSubmit={handleSubmit}
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
