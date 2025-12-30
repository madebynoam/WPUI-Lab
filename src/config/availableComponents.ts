/**
 * Single Source of Truth for Available Components
 *
 * This file defines which components are available in both:
 * 1. Component Inserter UI (what users can add)
 * 2. Agent System (what the AI can use)
 *
 * This ensures the inserter and agent always stay in sync.
 */

// Icons for component categories (conditionally imported for browser)
let layout: any, box: any, pencil: any, tag: any, plus: any, table: any;

if (typeof window !== 'undefined') {
  try {
    const icons = require('@wordpress/icons');
    ({ layout, box, pencil, tag, plus, table } = icons);
  } catch (e) {
    console.log('[availableComponents] Running in Node.js - icons unavailable');
  }
}

export interface ComponentGroup {
  name: string;
  icon: any;
  components: string[];
}

/**
 * All component groups shown in the inserter UI
 * Total: 32 components across 6 categories
 */
export const componentGroups: ComponentGroup[] = [
  {
    name: "Layout",
    icon: layout,
    components: ["VStack", "HStack", "Grid", "FlexBlock", "FlexItem"],
  },
  {
    name: "Containers",
    icon: box,
    components: [
      "Card",
      "CardBody",
      "CardHeader",
      "PanelBody",
      "PanelRow",
      "Tabs",
    ],
  },
  {
    name: "Content",
    icon: pencil,
    components: ["Text", "Heading", "Button", "Badge", "Icon"],
  },
  {
    name: "Form Inputs",
    icon: tag,
    components: [
      "TextControl",
      "TextareaControl",
      "SelectControl",
      "NumberControl",
      "SearchControl",
      "ToggleControl",
      "CheckboxControl",
      "RadioControl",
      "RangeControl",
      "DatePicker",
    ],
  },
  {
    name: "Utilities",
    icon: plus,
    components: ["Spacer", "Divider", "Spinner"],
  },
  {
    name: "Data Display",
    icon: table,
    components: ["DataViews"],
  },
];

/**
 * Hidden primitives that are filtered out from the inserter UI
 * These are low-level components used internally but not exposed to users
 * Total: 6 hidden components
 * Result: 33 - 6 = 27 components visible to users
 */
export const hiddenPrimitives = new Set([
  "CardHeader",
  "CardBody",
  "PanelBody",
  "PanelRow",
  "FlexItem",
  "FlexBlock",
]);

/**
 * Get component groups for the inserter UI
 * Returns the full componentGroups array with icons
 */
export function getInserterComponents(): ComponentGroup[] {
  return componentGroups;
}

/**
 * Get flat list of all visible components for the agent
 * Excludes hidden primitives
 * Returns: 27 component types
 */
export function getAgentComponentList(): string[] {
  const allComponents: string[] = [];

  for (const group of componentGroups) {
    for (const component of group.components) {
      if (!hiddenPrimitives.has(component)) {
        allComponents.push(component);
      }
    }
  }

  return allComponents;
}

/**
 * Get formatted component summary for agent SYSTEM_PROMPT
 * Groups components by category for better understanding
 */
export function getAgentComponentSummary(): string {
  const visibleGroups = componentGroups.map(group => ({
    name: group.name,
    components: group.components.filter(c => !hiddenPrimitives.has(c))
  })).filter(group => group.components.length > 0);

  const summary = visibleGroups.map(group =>
    `${group.name}: ${group.components.join(', ')}`
  ).join('\n');

  return `Available Components (27 total):\n${summary}\n\nIMPORTANT: Components like "Container", "Section", "Div" do NOT exist. Only use the components listed above.`;
}

/**
 * Get component groups organized by category (for agent context)
 * Returns structured data with categories and their components
 */
export function getAgentComponentsByCategory(): Array<{ category: string; components: string[] }> {
  return componentGroups.map(group => ({
    category: group.name,
    components: group.components.filter(c => !hiddenPrimitives.has(c))
  })).filter(group => group.components.length > 0);
}
