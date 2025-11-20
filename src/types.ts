import React from 'react';

export interface ComponentNode {
  id: string;
  type: string;
  name?: string;
  props: Record<string, any>;
  children?: ComponentNode[];
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
}

export interface ComponentDefinition {
  name: string;
  component: React.ComponentType<any>;
  acceptsChildren: boolean;
  defaultProps?: Record<string, any>;
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
  pages: Page[];
  currentPageId: string;
}
