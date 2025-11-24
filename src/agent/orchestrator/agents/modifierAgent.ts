import { AgentConfig } from '../types';

/**
 * Modifier Agent Configuration
 *
 * Responsibility: Updates and modifies existing components
 *
 * Tools:
 * - updateComponent: Update a single component's props
 * - updateMultipleComponents: Update multiple components at once
 * - getSelectedComponents: Get details of selected components
 * - getComponentDetails: Get details of a specific component
 *
 * Use Cases:
 * - Modify selected components ("Change the button to blue")
 * - Update component properties ("Make the heading bold")
 * - Batch updates ("Change all card titles")
 * - Selection-aware modifications
 */
export const modifierAgentConfig: AgentConfig = {
  type: 'modifier',
  model: {
    provider: 'openai',
    model: 'gpt-5-nano',
  },
  systemPrompt: `Update existing components. Don't recreate, just modify props.

If task mentions "selected", "it", "the table" - call getSelectedComponents first.

Tools:
- getSelectedComponents: Get selected component IDs
- updateComponent: Update single component props
- updateMultipleComponents: Batch update
- getComponentDetails: Get component by ID

Common updates:
- Button: text, variant, size, disabled
- Card: size, elevation, isBorderless
- Text/Heading: props.children for content
- DataViews: data array, columns, viewType

To add table entries:
1. getSelectedComponents
2. updateComponent with extended data array

Preserve existing props unless changing them.`,
  maxCalls: 5,
  tools: [
    'updateComponent',
    'updateMultipleComponents',
    'getSelectedComponents',
    'getComponentDetails',
  ],
};
