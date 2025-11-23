import { ComponentNode, Page } from '../types';

// Tool execution context - provides agent access to app state
export interface ToolContext {
  tree: ComponentNode[];
  pages: Page[];
  currentPageId: string;
  selectedNodeIds: string[];
  getNodeById: (id: string) => ComponentNode | null;
  updateComponentProps: (id: string, props: any) => void;
  updateMultipleComponentProps: (ids: string[], props: any) => void;
  updateComponentName: (id: string, name: string) => void;
  addComponent: (node: ComponentNode, parentId?: string, index?: number) => void;
  removeComponent: (id: string) => void;
  copyComponent: (id: string) => void;
  pasteComponent: () => void;
  duplicateComponent: (id: string) => void;
  addInteraction: (componentId: string, interaction: any) => void;
  removeInteraction: (componentId: string, interactionId: string) => void;
  updateInteraction: (componentId: string, interactionId: string, updates: any) => void;
  createPage: (name: string, route: string) => string;
  setCurrentPage: (pageId: string) => void;
  updatePageTheme: (pageId: string, theme: Partial<{ primaryColor: string; backgroundColor: string }>) => void;
  toggleNodeSelection: (nodeId: string, multiSelect?: boolean, rangeSelect?: boolean, tree?: ComponentNode[]) => void;
}

// Tool result
export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Tool definition
export interface AgentTool {
  name: string;
  description: string;
  category: 'context' | 'action';
  parameters?: {
    [key: string]: {
      type: string;
      description: string;
      required?: boolean;
      default?: any;
    };
  };
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

// Message type for agent chat (compatible with @automattic/agenttic-ui)
export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: Array<{
    type: 'text' | 'component' | 'context';
    text?: string;
    component?: React.ComponentType;
    componentProps?: any;
  }>;
  timestamp: number;
  archived: boolean;
  showIcon: boolean;
}

// Agent conversation state
export interface AgentConversation {
  messages: AgentMessage[];
  isProcessing: boolean;
  error?: string | null;
}

// Suggestion type (for quick actions)
export interface AgentSuggestion {
  id: string;
  label: string;
  prompt: string;
}
