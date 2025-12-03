// Register all tools
import { registerTool } from './tools/registry';

// NEW: Refactored job-level tools (Anthropic's "Writing effective tools for agents" principles)
import {
  context_getProject,
  context_searchComponents,
} from './tools/consolidatedContext';
import { section_create } from './tools/sectionTemplates';
import {
  component_update,
  component_delete,
  component_move,
} from './tools/smartUpdate';

// Legacy context tools (kept for backward compatibility)
import {
  getPagesTool,
  getCurrentPageTool,
  getAvailableComponentTypesTool,
  getPageComponentsTool,
  getComponentDetailsTool,
  getSelectedComponentsTool,
  searchComponentsTool,
  getComponentSchemaTool,
} from './tools/context';
import {
  createComponentTool,
  batchCreateComponentsTool,
  buildFromYAMLTool,
  updateComponentTool,
  deleteComponentTool,
  duplicateComponentTool,
  addInteractionTool,
  createPageTool,
  switchPageTool,
  updateMultipleComponentsTool,
  copyComponentTool,
  pasteComponentTool,
  removeInteractionTool,
  updateInteractionTool,
  updatePageThemeTool,
} from './tools/actions';
import { modifyComponentTreeTool } from './tools/treeManipulation';
import {
  getPatternsTool,
  createPatternTool,
} from './tools/patterns';

// ===== PREFERRED TOOLS (Refactored for Anthropic's best practices) =====
// These tools consolidate functionality and follow job-level patterns

// Consolidated context tool (replaces 4 separate tools)
registerTool(context_getProject);

// Smart search with disambiguation
registerTool(context_searchComponents);

// Job-level section creation (pricing, hero, features, etc.)
registerTool(section_create);

// Smart component operations with disambiguation
registerTool(component_update);
registerTool(component_delete);
registerTool(component_move);

// ===== LEGACY TOOLS (DISABLED - Use new refactored tools instead) =====
// Context tools replaced by: context_getProject, context_searchComponents
// CRUD tools replaced by: component_update, component_delete, component_move
// Section creation replaced by: section_create

// COMMENTED OUT - Use context_getProject instead
// registerTool(getPagesTool);
// registerTool(getCurrentPageTool);
// registerTool(getAvailableComponentTypesTool);
// registerTool(getPageComponentsTool);
// registerTool(getComponentDetailsTool);
// registerTool(getSelectedComponentsTool);
// registerTool(searchComponentsTool);
// registerTool(getComponentSchemaTool);

// Register PRIMARY tree manipulation tools (KEEP - still useful)
registerTool(modifyComponentTreeTool);
registerTool(buildFromYAMLTool); // YAML DSL - most token-efficient for bulk operations (3+ items)

// COMMENTED OUT - Use component_update, component_delete, section_create instead
// registerTool(createComponentTool);
// registerTool(batchCreateComponentsTool);
// registerTool(updateComponentTool);
// registerTool(updateMultipleComponentsTool);
// registerTool(deleteComponentTool);

// KEEP - Not replaced yet
registerTool(duplicateComponentTool);
registerTool(copyComponentTool);
registerTool(pasteComponentTool);
registerTool(addInteractionTool);
registerTool(removeInteractionTool);
registerTool(updateInteractionTool);
registerTool(createPageTool);
registerTool(switchPageTool);
registerTool(updatePageThemeTool);

// Register pattern tools
registerTool(getPatternsTool);
registerTool(createPatternTool);

// Export types and utilities
export * from './types';
export * from './messageHandler';
export { getAllTools, getTool, getToolsByCategory } from './tools/registry';
