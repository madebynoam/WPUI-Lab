// Register all tools
import { registerTool } from './tools/registry';
import {
  getPagesTool,
  getCurrentPageTool,
  getAvailableComponentTypesTool,
  getPageComponentsTool,
  getComponentDetailsTool,
  getSelectedComponentsTool,
  searchComponentsTool,
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

// Register context tools
registerTool(getPagesTool);
registerTool(getCurrentPageTool);
registerTool(getAvailableComponentTypesTool);
registerTool(getPageComponentsTool);
registerTool(getComponentDetailsTool);
registerTool(getSelectedComponentsTool);
registerTool(searchComponentsTool);

// Register PRIMARY tree manipulation tools
registerTool(modifyComponentTreeTool);
registerTool(buildFromYAMLTool); // YAML DSL - most token-efficient for bulk operations (3+ items)

// Register legacy action tools (for backward compatibility - will be deprecated)
registerTool(createComponentTool);
registerTool(batchCreateComponentsTool);
registerTool(updateComponentTool);
registerTool(updateMultipleComponentsTool);
registerTool(deleteComponentTool);
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
