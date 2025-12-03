// Register all tools
import { registerTool } from './tools/registry';

// Refactored job-level tools (Anthropic's "Writing effective tools for agents" principles)
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

// Active tools
import {
  buildFromYAMLTool,
  duplicateComponentTool,
  addInteractionTool,
  createPageTool,
  switchPageTool,
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

// ===== REFACTORED TOOLS (Anthropic's best practices) =====

// Consolidated context tools
registerTool(context_getProject);
registerTool(context_searchComponents);

// Job-level section creation
registerTool(section_create);

// Smart component operations
registerTool(component_update);
registerTool(component_delete);
registerTool(component_move);

// Tree manipulation
registerTool(modifyComponentTreeTool);
registerTool(buildFromYAMLTool);

// Component operations
registerTool(duplicateComponentTool);
registerTool(copyComponentTool);
registerTool(pasteComponentTool);

// Interactions
registerTool(addInteractionTool);
registerTool(removeInteractionTool);
registerTool(updateInteractionTool);

// Page management
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
