import { AgentConfig } from '../types';

/**
 * Deletion Agent Configuration
 *
 * Responsibility: Safely removes components from the tree
 *
 * Tools:
 * - deleteComponent: Delete a single component by ID
 * - modifyComponentTree: Advanced tree manipulation for bulk deletes
 * - getSelectedComponents: Get details of selected components
 * - searchComponents: Find components to delete
 *
 * Use Cases:
 * - Delete selected components ("Delete the selected card")
 * - Remove specific components ("Remove all buttons")
 * - Bulk deletion ("Delete the pricing section")
 * - Selection-aware deletion
 */
export const deletionAgentConfig: AgentConfig = {
  type: 'deletion',
  model: {
    provider: 'openai',
    model: 'gpt-5-nano',
  },
  systemPrompt: `Delete components safely. Deletion is destructive!

If task mentions "selected", "it", "the table" - call getSelectedComponents first.

Tools:
- getSelectedComponents: Get selected IDs
- searchComponents: Find by type
- deleteComponent: Delete by ID
- modifyComponentTree: Advanced deletions

Safety rules:
- NEVER delete root VStack
- NEVER delete all components
- If ambiguous, don't delete

Process:
1. Identify: getSelectedComponents or searchComponents
2. Verify: Check IDs are valid
3. Execute: deleteComponent for each ID`,
  maxCalls: 5,
  tools: [
    'deleteComponent',
    'modifyComponentTree',
    'getSelectedComponents',
    'searchComponents',
  ],
};
