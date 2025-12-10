/**
 * Tool Registry Initialization
 *
 * Import and register all available agent tools
 */

import { registerTool } from './registry';

// Import all tools
import {
  duplicateComponentTool,
  addInteractionTool,
  createPageTool,
  switchPageTool,
  copyComponentTool,
  pasteComponentTool,
  removeInteractionTool,
  updateInteractionTool,
  updatePageThemeTool,
  buildFromMarkupTool,
} from './actions';

import {
  component_update,
  component_delete,
  component_move,
} from './smartUpdate';

import {
  context_getProject,
  context_searchComponents,
} from './consolidatedContext';

import { table_create } from './tableCreate';
import { section_create } from './sectionTemplates';
import { getPatternsTool, createPatternTool } from './patterns';
import { modifyComponentTreeTool } from './treeManipulation';

// Register all tools
const allTools = [
  // Context tools (read-only)
  context_getProject,
  context_searchComponents,

  // Action tools (mutations)
  component_update,
  component_delete,
  component_move,
  buildFromMarkupTool,
  table_create,
  section_create,

  // Page operations
  createPageTool,
  switchPageTool,
  updatePageThemeTool,

  // Component operations
  duplicateComponentTool,
  copyComponentTool,
  pasteComponentTool,

  // Interaction operations
  addInteractionTool,
  removeInteractionTool,
  updateInteractionTool,

  // Patterns (legacy)
  getPatternsTool,
  createPatternTool,

  // Tree manipulation (legacy)
  modifyComponentTreeTool,
];

// Register all tools in the registry
allTools.forEach(tool => registerTool(tool));

console.log(`[ToolRegistry] Registered ${allTools.length} tools`);

// Re-export registry functions for convenience
export { registerTool, getTool, getAllTools, getToolsByCategory } from './registry';
