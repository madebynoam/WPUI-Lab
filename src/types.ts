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
}

export interface Project {
  id: string;
  name: string;
  pages: Page[];
  currentPageId: string;
  createdAt: number;
  lastModified: number;
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
}

export interface PropDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'object';
  options?: string[];
  defaultValue?: any;
  description?: string;
}

export interface HistoryState {
  projects: Project[];
  currentProjectId: string;
}
