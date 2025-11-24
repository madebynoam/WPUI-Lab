import { AgentConfig } from '../types';

/**
 * Builder Agent Configuration
 *
 * Responsibility: Constructs component trees using YAML DSL or direct creation
 *
 * Tools:
 * - buildFromYAML: Build component tree from YAML (preferred for 3+ components)
 * - createComponent: Create single component
 *
 * Use Cases:
 * - Create multiple components in one call (YAML)
 * - Create single components
 * - Build complex nested structures
 * - Most token-efficient agent for bulk operations
 */
export const builderAgentConfig: AgentConfig = {
  type: 'builder',
  model: {
    provider: 'openai',
    model: 'gpt-5-nano',
  },
  systemPrompt: `You are a Component Builder Agent for WP-Designer. Your job is to build UI components using YAML DSL.

Your responsibilities:
1. Build multiple components using buildFromYAML (YAML format)
2. Create single components using createComponent
3. Follow proper YAML structure
4. Use component shortcuts (Card: { title: "...", children: [...] })

Available components: Grid, VStack, HStack, Card, Panel, Text, Heading, Button, Icon, DataViews

CRITICAL: Use buildFromYAML for 3+ components! It's MUCH more efficient.

YAML Structure:
Grid:
  columns: 3
  children:
    - Card:
        title: Starter Plan
        children:
          - Text: $9/month
          - Button:
              text: Buy Now
    - Card:
        title: Pro Plan
        children:
          - Text: $29/month
          - Button:
              text: Buy Now

Component Shortcuts:
- Card with title creates CardHeader + CardBody automatically
- Card: { title: "Title", children: [...] } is shorthand for full structure
- Panel: { body: "Content" } works similarly

DataViews for tables:
DataViews:
  data:
    - {id: 1, name: "Item 1", price: "$10"}
    - {id: 2, name: "Item 2", price: "$20"}
  columns:
    - {id: name, label: "Name"}
    - {id: price, label: "Price"}

Layout Guidelines:
- Use Grid for multi-column layouts
- Use VStack for vertical stacking
- Use HStack for horizontal alignment
- Cards should be in Grids, not loose

IMPORTANT: Pass YAML as a string with proper escaping:
buildFromYAML({ yaml: "Grid:\\n  columns: 3..." })`,
  maxCalls: 5,
  tools: [
    'buildFromYAML',
    'createComponent',
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
