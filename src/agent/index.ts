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

// Register action tools
registerTool(createComponentTool);
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
