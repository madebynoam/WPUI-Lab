import React from 'react';

export interface Interaction {
  id: string;
  trigger: 'onClick'; // Future: 'onHover', 'onFocus', etc.
  action: 'navigate' | 'showModal'; // Expandable
  targetId: string; // Page ID for navigate, Modal node ID for showModal
}

export interface ComponentNode {
  id: string;
  type: string;
  name?: string;
  props: Record<string, any>;
  interactions?: Interaction[];
  children?: ComponentNode[];
  collapsed?: boolean;
  width?: 'content' | 'full'; // Optional width override for layout containers
  // Global component metadata
  isGlobalInstance?: boolean; // True if this is an instance of a global component
  globalComponentId?: string; // ID of the global component definition this instance references
}

// Pattern node - same as ComponentNode but without id (assigned on insert)
export interface PatternNode {
  type: string;
  name?: string;
  props: Record<string, any>;
  children?: PatternNode[];
}

export interface Page {
  id: string;
  name: string;
  tree: ComponentNode[];
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
  };
  canvasPosition?: {
    x: number;
    y: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string; // Optional project description
  version: number; // Tree structure version (current: 3)
  pages: Page[];
  currentPageId: string;
  globalComponents?: ComponentNode[]; // Reusable components that can be instantiated across pages
  createdAt: number;
  lastModified: number;
  isExampleProject?: boolean; // If true, this project cannot be deleted
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
  };
  layout?: {
    maxWidth?: number;
    padding?: number;
    spacing?: number;
  };
}

export interface ComponentDefinition {
  name: string;
  component: React.ComponentType<any>;
  acceptsChildren: boolean;
  description?: string;
  defaultProps?: Record<string, any>;
  defaultChildren?: PatternNode[];
  propDefinitions: PropDefinition[];
  disableInteractions?: boolean;
  codeGeneration?: {
    // Transform design-time props to real component API props
    transformProps?: (node: ComponentNode) => Record<string, any>;
    // Fully custom code generation (overrides default)
    generateCode?: (node: ComponentNode, generateChildren: () => string) => string;
    // Additional imports needed for this component
    imports?: {
      package?: string; // Package name (e.g., '@wordpress/dataviews')
      components?: string[]; // Component names to import
    };
  };
}

export interface PropDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'object' | 'color' | 'selectOptions';
  options?: string[];
  defaultValue?: any;
  description?: string;
  disabledWhen?: { prop: string; value: any };
}

export interface HistoryState {
  projects: Project[];
  currentProjectId: string;
}
