import { AgentConfig } from '../types';

/**
 * Creation Agent Configuration
 *
 * Responsibility: Constructs component trees using YAML DSL or direct creation
 *
 * Tools:
 * - buildFromYAML: Build component tree from YAML (preferred for 3+ components)
 * - createComponent: Create single component
 * - batchCreateComponents: Create multiple components at once
 *
 * Use Cases:
 * - Create multiple components in one call (YAML)
 * - Create single components
 * - Build complex nested structures
 * - Most token-efficient agent for bulk operations
 */
export const creationAgentConfig: AgentConfig = {
  type: 'creation',
  model: {
    provider: 'openai',
    model: 'gpt-5-nano',
  },
  systemPrompt: `Create pages and UI components using YAML DSL.

IMPORTANT:
- If user mentions "page" or "new page", call createPage FIRST, then add components
- Use DataViews for tables/lists of data (NOT Cards)
- Use Cards for content blocks (pricing, features)

Components: Grid, VStack, HStack, Card, Panel, Text, Heading, Button, Icon, DataViews

Use buildFromYAML for 3+ components.

DataViews for tables (use when user says "table", "list", "data"):
DataViews:
  data:
    - {id: 1, name: "Rose Bundle", price: "$39", stock: "In Stock"}
    - {id: 2, name: "Tulip Set", price: "$29", stock: "Low"}
  columns:
    - {id: name, label: "Product"}
    - {id: price, label: "Price"}
    - {id: stock, label: "Availability"}

Cards for content (pricing, features, NOT data tables):
Grid:
  columns: 3
  children:
    - Card:
        title: Plan Name
        children:
          - Text: $9/mo
          - Button: {text: "Buy"}

Pass YAML as string: buildFromYAML({yaml: "DataViews:\\n  data: ..."})`,
  maxCalls: 5,
  tools: [
    'createPage',
    'buildFromYAML',
    'createComponent',
    'batchCreateComponents',
  ],
};

/**
 * Generate YAML for common UI patterns
 */
export function generateYAMLForPattern(
  pattern: 'pricing_cards' | 'contact_form' | 'hero_section' | 'faq',
  data: any
): string {
  switch (pattern) {
    case 'pricing_cards':
      return `Grid:
  columns: 3
  children:
${data.tiers.map((tier: any) => `    - Card:
        title: ${tier.name}
        children:
          - Text: ${tier.price}
          - Text: ${tier.description}
          - Button:
              text: ${tier.cta}`).join('\n')}`;

    case 'contact_form':
      return `VStack:
  spacing: 4
  children:
    - Heading:
        level: 2
        children: Contact Us
    - Text: ${data.description || 'Get in touch with our team'}
    - Button:
        text: ${data.submitText || 'Send Message'}`;

    case 'hero_section':
      return `VStack:
  spacing: 6
  children:
    - Heading:
        level: 1
        children: ${data.headline}
    - Text: ${data.subheadline}
    - HStack:
        spacing: 2
        children:
          - Button:
              text: ${data.primaryCTA || 'Get Started'}
          - Button:
              text: ${data.secondaryCTA || 'Learn More'}
              variant: secondary`;

    case 'faq':
      return `VStack:
  spacing: 3
  children:
    - Heading:
        level: 2
        children: Frequently Asked Questions
${data.questions.map((q: any) => `    - Card:
        title: ${q.question}
        children:
          - Text: ${q.answer}`).join('\n')}`;

    default:
      return '';
  }
}
