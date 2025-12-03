/**
 * Section Templates Tool
 * Based on Anthropic's principle: "Consolidate functionality, handling multiple discrete operations"
 * Reduces 15+ tool calls to 1 for common design patterns
 */

import { AgentTool, ToolContext, ToolResult } from '../types';
import { ComponentNode } from '../../types';
import { generateSemanticId, getContentPreview } from '../utils/semanticIds';
import * as yaml from 'js-yaml';

type SectionTemplate = 'pricing' | 'hero' | 'features' | 'testimonials' | 'footer' | 'nav' | 'cta';

interface PricingTier {
  name: string;
  price: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

interface Feature {
  title: string;
  description: string;
  icon?: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  company?: string;
}

interface NavLink {
  label: string;
  href: string;
}

/**
 * section_create - Creates complete sections with layout + components + content in ONE call
 * This is the job-level tool that agents should use instead of multiple createComponent calls
 */
export const section_create: AgentTool = {
  name: 'section_create',
  description: `Create complete sections with layout, components, and content in a single call. Use this for pricing pages, hero sections, feature grids, testimonials, etc. Much more efficient than creating components one-by-one!

PARAMETER EXAMPLES:

1. PRICING SECTION:
{
  template: "pricing",
  content: {
    tiers: [
      {
        name: "Free",
        price: "$0",
        features: ["1 user", "Basic features"],
        cta: "Get Started",
        highlighted: false
      },
      {
        name: "Pro",
        price: "$29/mo",
        features: ["10 users", "Advanced features", "Priority support"],
        cta: "Start Free Trial",
        highlighted: true
      }
    ]
  }
}

2. HERO SECTION:
{
  template: "hero",
  content: {
    headline: "Build Amazing Sites",
    subheadline: "Create professional websites in minutes",
    cta: "Get Started Free"
  }
}

3. FEATURES SECTION:
{
  template: "features",
  content: {
    features: [
      { title: "Fast", description: "Lightning fast performance", icon: "bolt" },
      { title: "Secure", description: "Bank-level security", icon: "shield" }
    ]
  }
}

4. TESTIMONIALS:
{
  template: "testimonials",
  content: {
    testimonials: [
      {
        quote: "This changed everything for us!",
        author: "Jane Smith",
        role: "CEO",
        company: "Acme Corp"
      }
    ]
  }
}`,
  category: 'action',
  parameters: {
    template: {
      type: 'string',
      description: 'Section template to use: "pricing" (pricing cards), "hero" (headline + CTA), "features" (feature grid), "testimonials" (testimonial cards), "footer" (footer with links), "nav" (navigation bar), "cta" (call-to-action)',
      required: true,
    },
    content: {
      type: 'object',
      description: 'Content for the section. Structure depends on template - see examples in description.',
      required: true,
    },
    placement: {
      type: 'string',
      description: 'Where to place the section: "top", "bottom", or "after:component-id". Default: "bottom"',
      required: false,
      default: 'bottom',
    },
  },
  execute: async (
    params: {
      template: SectionTemplate;
      content: any;
      placement?: string;
    },
    context: ToolContext
  ): Promise<ToolResult> => {
    // Generate section based on template
    let yamlContent: string;
    let componentCount = 0;

    try {
      switch (params.template) {
        case 'pricing':
          ({ yamlContent, componentCount } = buildPricingSection(params.content));
          break;

        case 'hero':
          ({ yamlContent, componentCount } = buildHeroSection(params.content));
          break;

        case 'features':
          ({ yamlContent, componentCount } = buildFeaturesSection(params.content));
          break;

        case 'testimonials':
          ({ yamlContent, componentCount } = buildTestimonialsSection(params.content));
          break;

        case 'footer':
          ({ yamlContent, componentCount } = buildFooterSection(params.content));
          break;

        case 'nav':
          ({ yamlContent, componentCount } = buildNavSection(params.content));
          break;

        case 'cta':
          ({ yamlContent, componentCount } = buildCTASection(params.content));
          break;

        default:
          return {
            success: false,
            message: `Unknown template "${params.template}". Available templates: pricing, hero, features, testimonials, footer, nav, cta`,
            error: 'Invalid template',
          };
      }

      // Use buildFromYAML tool to create the section
      // For now, we'll parse YAML and build manually (can refactor to use buildFromYAML later)

      console.log(`[section_create] Generated YAML for ${params.template}:`, yamlContent);

      // Parse YAML and create components
      const tree = yaml.load(yamlContent) as any;
      const nodes = await buildComponentTree(tree, context);

      // Add to tree based on placement
      const parentId = params.placement?.startsWith('after:')
        ? params.placement.replace('after:', '')
        : undefined;

      for (const node of nodes) {
        context.addComponent(node, parentId);
      }

      return {
        success: true,
        message: `Created ${params.template} section with ${componentCount} components`,
        data: {
          template: params.template,
          componentCount,
          nodes,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create ${params.template} section: ${error.message}`,
        error: error.message,
      };
    }
  },
};

// Template builders

function buildPricingSection(content: { tiers: PricingTier[] }): { yamlContent: string; componentCount: number } {
  if (!content.tiers || content.tiers.length === 0) {
    throw new Error('Pricing section requires at least one tier in content.tiers');
  }

  const cards = content.tiers.map(tier => `    - Card:
        variant: ${tier.highlighted ? 'elevated' : 'outlined'}
        children:
          - CardHeader:
              children:
                - Heading:
                    level: 3
                    children: "${tier.name}"
          - CardBody:
              children:
                - VStack:
                    spacing: 4
                    children:
                      - Heading:
                          level: 2
                          children: "${tier.price}"
                      - VStack:
                          spacing: 2
                          children:
${tier.features.map(f => `                            - Text:
                                children: "✓ ${f}"`).join('\n')}
                      - Button:
                          variant: ${tier.highlighted ? 'primary' : 'default'}
                          children: "${tier.cta}"`).join('\n');

  const yamlContent = `Grid:
  columns: ${Math.min(content.tiers.length, 4)}
  gap: 6
  children:
${cards}`;

  const componentCount = content.tiers.reduce((count, tier) => {
    return count + 5 + tier.features.length; // Card + Header + Heading + Body + VStack + Price + Features + Button
  }, 1); // +1 for Grid

  return { yamlContent, componentCount };
}

function buildHeroSection(content: {
  headline: string;
  subheadline?: string;
  cta?: { text: string; variant?: string };
}): { yamlContent: string; componentCount: number } {
  if (!content.headline) {
    throw new Error('Hero section requires headline in content');
  }

  let componentCount = 2; // VStack + Heading

  const children: string[] = [
    `    - Heading:
        level: 1
        size: "2xl"
        children: "${content.headline}"`
  ];

  if (content.subheadline) {
    children.push(`    - Text:
        size: "lg"
        children: "${content.subheadline}"`);
    componentCount++;
  }

  if (content.cta) {
    children.push(`    - Button:
        variant: ${content.cta.variant || 'primary'}
        size: "lg"
        children: "${content.cta.text}"`);
    componentCount++;
  }

  const yamlContent = `VStack:
  spacing: 6
  alignment: center
  children:
${children.join('\n')}`;

  return { yamlContent, componentCount };
}

function buildFeaturesSection(content: {
  title?: string;
  description?: string;
  features: Feature[];
}): { yamlContent: string; componentCount: number } {
  if (!content.features || content.features.length === 0) {
    throw new Error('Features section requires at least one feature in content.features');
  }

  const header = content.title || content.description
    ? `  - VStack:
      spacing: 2
      alignment: center
      children:
${content.title ? `        - Heading:
            level: 2
            children: "${content.title}"` : ''}
${content.description ? `        - Text:
            children: "${content.description}"` : ''}`
    : '';

  const featureCards = content.features.map(feature => `    - Card:
        children:
          - CardBody:
              children:
                - VStack:
                    spacing: 3
                    children:
${feature.icon ? `                      - Text:
                          size: "2xl"
                          children: "${feature.icon}"` : ''}
                      - Heading:
                          level: 3
                          children: "${feature.title}"
                      - Text:
                          children: "${feature.description}"`).join('\n');

  const yamlContent = `VStack:
  spacing: 8
  children:
${header}
  - Grid:
      columns: ${Math.min(content.features.length, 3)}
      gap: 6
      children:
${featureCards}`;

  const componentCount = 2 + // VStack + Grid
    (content.title ? 1 : 0) +
    (content.description ? 1 : 0) +
    content.features.reduce((count, f) => count + 4 + (f.icon ? 1 : 0), 0); // Card + Body + VStack + Heading + Text (+ icon)

  return { yamlContent, componentCount };
}

function buildTestimonialsSection(content: {
  title?: string;
  testimonials: Testimonial[];
}): { yamlContent: string; componentCount: number } {
  if (!content.testimonials || content.testimonials.length === 0) {
    throw new Error('Testimonials section requires at least one testimonial');
  }

  const header = content.title
    ? `  - Heading:
      level: 2
      alignment: center
      children: "${content.title}"`
    : '';

  const testimonialCards = content.testimonials.map(t => `    - Card:
        children:
          - CardBody:
              children:
                - VStack:
                    spacing: 4
                    children:
                      - Text:
                          children: "${t.quote}"
                      - VStack:
                          spacing: 1
                          children:
                            - Text:
                                weight: "bold"
                                children: "${t.author}"
${t.role || t.company ? `                            - Text:
                                size: "sm"
                                children: "${[t.role, t.company].filter(Boolean).join(', ')}"` : ''}`).join('\n');

  const yamlContent = `VStack:
  spacing: 8
  children:
${header}
  - Grid:
      columns: ${Math.min(content.testimonials.length, 3)}
      gap: 6
      children:
${testimonialCards}`;

  const componentCount = 2 + // VStack + Grid
    (content.title ? 1 : 0) +
    content.testimonials.reduce((count, t) => count + 6 + (t.role || t.company ? 1 : 0), 0);

  return { yamlContent, componentCount };
}

function buildFooterSection(content: {
  copyright?: string;
  links?: NavLink[];
}): { yamlContent: string; componentCount: number } {
  const linkButtons = content.links?.map(link => `        - Button:
            variant: "link"
            children: "${link.label}"`).join('\n') || '';

  const yamlContent = `VStack:
  spacing: 4
  padding: 8
  children:
${content.links ? `    - HStack:
        spacing: 4
        children:
${linkButtons}` : ''}
${content.copyright ? `    - Text:
        size: "sm"
        children: "${content.copyright}"` : ''}`;

  const componentCount = 1 + // VStack
    (content.links ? content.links.length + 1 : 0) + // HStack + Buttons
    (content.copyright ? 1 : 0);

  return { yamlContent, componentCount };
}

function buildNavSection(content: { links: NavLink[] }): { yamlContent: string; componentCount: number } {
  if (!content.links || content.links.length === 0) {
    throw new Error('Nav section requires at least one link');
  }

  const linkButtons = content.links.map(link => `    - Button:
        variant: "link"
        children: "${link.label}"`).join('\n');

  const yamlContent = `HStack:
  spacing: 4
  padding: 4
  children:
${linkButtons}`;

  const componentCount = 1 + content.links.length; // HStack + Buttons

  return { yamlContent, componentCount };
}

function buildCTASection(content: {
  headline: string;
  description?: string;
  primaryCTA: string;
  secondaryCTA?: string;
}): { yamlContent: string; componentCount: number } {
  if (!content.headline || !content.primaryCTA) {
    throw new Error('CTA section requires headline and primaryCTA');
  }

  const yamlContent = `VStack:
  spacing: 6
  alignment: center
  padding: 12
  children:
    - Heading:
        level: 2
        children: "${content.headline}"
${content.description ? `    - Text:
        children: "${content.description}"` : ''}
    - HStack:
        spacing: 4
        children:
          - Button:
              variant: "primary"
              size: "lg"
              children: "${content.primaryCTA}"
${content.secondaryCTA ? `          - Button:
              variant: "default"
              size: "lg"
              children: "${content.secondaryCTA}"` : ''}`;

  const componentCount = 4 + // VStack + Heading + HStack + Button
    (content.description ? 1 : 0) +
    (content.secondaryCTA ? 1 : 0);

  return { yamlContent, componentCount };
}

// Helper: Build component tree from YAML structure
async function buildComponentTree(yamlObj: any, context: ToolContext): Promise<ComponentNode[]> {
  // This is a simplified version - in production, reuse the buildFromYAML logic
  const nodes: ComponentNode[] = [];

  function buildNode(obj: any, parent?: ComponentNode): ComponentNode {
    const type = Object.keys(obj)[0];
    const props = obj[type] || {};

    const { semanticId, uuid, displayName } = generateSemanticId(type, {
      purpose: parent?.type,
      content: getContentPreview(props),
    });

    const node: ComponentNode = {
      id: semanticId,
      type,
      name: '',
      props: { ...props },
      children: [],
      interactions: [],
    };

    if (props.children && Array.isArray(props.children)) {
      node.children = props.children.map((child: any) => buildNode(child, node));
      delete node.props.children; // Remove from props as it's in children array
    }

    return node;
  }

  nodes.push(buildNode(yamlObj));
  return nodes;
}
