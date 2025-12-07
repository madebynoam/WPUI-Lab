/**
 * Section Templates Tool
 * Based on Anthropic's principle: "Consolidate functionality, handling multiple discrete operations"
 * Reduces 15+ tool calls to 1 for common design patterns
 */

import { AgentTool, ToolContext, ToolResult } from '../types';
import { ComponentNode } from '../../types';
import { generateSemanticId, getContentPreview } from '../utils/semanticIds';
import { parseMarkupWithRepair } from '../utils/repairMarkup';

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
    parentId: {
      type: 'string',
      description: 'Parent component ID (optional, defaults to root)',
      required: false,
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
      parentId?: string;
      placement?: string;
    },
    context: ToolContext
  ): Promise<ToolResult> => {
    // Generate section based on template
    let markupContent: string;
    let componentCount = 0;

    try {
      switch (params.template) {
        case 'pricing':
          ({ markupContent, componentCount } = buildPricingSection(params.content));
          break;

        case 'hero':
          ({ markupContent, componentCount } = buildHeroSection(params.content));
          break;

        case 'features':
          ({ markupContent, componentCount } = buildFeaturesSection(params.content));
          break;

        case 'testimonials':
          ({ markupContent, componentCount } = buildTestimonialsSection(params.content));
          break;

        case 'footer':
          ({ markupContent, componentCount } = buildFooterSection(params.content));
          break;

        case 'nav':
          ({ markupContent, componentCount } = buildNavSection(params.content));
          break;

        case 'cta':
          ({ markupContent, componentCount } = buildCTASection(params.content));
          break;

        default:
          return {
            success: false,
            message: `Unknown template "${params.template}". Available templates: pricing, hero, features, testimonials, footer, nav, cta`,
            error: 'Invalid template',
          };
      }

      console.log(`[section_create] Generated markup for ${params.template}:`, markupContent);

      // Parse markup with repair loop
      const result = await parseMarkupWithRepair(markupContent);

      if (!result.success || !result.nodes) {
        return {
          success: false,
          message: `Failed to parse ${params.template} section markup: ${result.error}`,
          error: result.error || 'Parse error',
        };
      }

      // Add to tree based on parentId or placement
      const targetParentId = params.parentId ||
        (params.placement?.startsWith('after:')
          ? params.placement.replace('after:', '')
          : undefined);

      for (const node of result.nodes) {
        context.addComponent(node, targetParentId);
      }

      return {
        success: true,
        message: `Created ${params.template} section with ${componentCount} components${result.attempts > 0 ? ` (repaired in ${result.attempts} attempts, cost: $${result.cost.toFixed(6)})` : ''}`,
        data: {
          template: params.template,
          componentCount,
          nodes: result.nodes,
          repairAttempts: result.attempts,
          repairCost: result.cost,
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

function buildPricingSection(content: { tiers: PricingTier[] }): { markupContent: string; componentCount: number } {
  if (!content.tiers || content.tiers.length === 0) {
    throw new Error('Pricing section requires at least one tier in content.tiers');
  }

  const cards = content.tiers.map(tier => `  <Card variant="${tier.highlighted ? 'elevated' : 'outlined'}">
    <CardHeader>
      <Heading level={3}>${tier.name}</Heading>
    </CardHeader>
    <CardBody>
      <VStack spacing={4}>
        <Heading level={2}>${tier.price}</Heading>
        <VStack spacing={2}>
${tier.features.map(f => `          <Text>✓ ${f}</Text>`).join('\n')}
        </VStack>
        <Button variant="${tier.highlighted ? 'primary' : 'default'}">${tier.cta}</Button>
      </VStack>
    </CardBody>
  </Card>`).join('\n');

  const markupContent = `<Grid columns={${Math.min(content.tiers.length, 4)}} gap={6}>
${cards}
</Grid>`;

  const componentCount = content.tiers.reduce((count, tier) => {
    return count + 5 + tier.features.length; // Card + Header + Heading + Body + VStack + Price + Features + Button
  }, 1); // +1 for Grid

  return { markupContent, componentCount };
}

function buildHeroSection(content: {
  headline: string;
  subheadline?: string;
  cta?: { text: string; variant?: string };
}): { markupContent: string; componentCount: number } {
  if (!content.headline) {
    throw new Error('Hero section requires headline in content');
  }

  let componentCount = 2; // VStack + Heading

  const children: string[] = [
    `  <Heading level={1} size="2xl">${content.headline}</Heading>`
  ];

  if (content.subheadline) {
    children.push(`  <Text size="lg">${content.subheadline}</Text>`);
    componentCount++;
  }

  if (content.cta) {
    children.push(`  <Button variant="${content.cta.variant || 'primary'}" size="lg">${content.cta.text}</Button>`);
    componentCount++;
  }

  const markupContent = `<VStack spacing={6} alignment="center">
${children.join('\n')}
</VStack>`;

  return { markupContent, componentCount };
}

function buildFeaturesSection(content: {
  title?: string;
  description?: string;
  features: Feature[];
}): { markupContent: string; componentCount: number } {
  if (!content.features || content.features.length === 0) {
    throw new Error('Features section requires at least one feature in content.features');
  }

  const header = content.title || content.description
    ? `  <VStack spacing={2} alignment="center">
${content.title ? `    <Heading level={2}>${content.title}</Heading>` : ''}
${content.description ? `    <Text>${content.description}</Text>` : ''}
  </VStack>`
    : '';

  const featureCards = content.features.map(feature => `    <Card>
      <CardBody>
        <VStack spacing={3}>
${feature.icon ? `          <Text size="2xl">${feature.icon}</Text>` : ''}
          <Heading level={3}>${feature.title}</Heading>
          <Text>${feature.description}</Text>
        </VStack>
      </CardBody>
    </Card>`).join('\n');

  const markupContent = `<VStack spacing={8}>
${header}
  <Grid columns={${Math.min(content.features.length, 3)}} gap={6}>
${featureCards}
  </Grid>
</VStack>`;

  const componentCount = 2 + // VStack + Grid
    (content.title ? 1 : 0) +
    (content.description ? 1 : 0) +
    content.features.reduce((count, f) => count + 4 + (f.icon ? 1 : 0), 0); // Card + Body + VStack + Heading + Text (+ icon)

  return { markupContent, componentCount };
}

function buildTestimonialsSection(content: {
  title?: string;
  testimonials: Testimonial[];
}): { markupContent: string; componentCount: number } {
  if (!content.testimonials || content.testimonials.length === 0) {
    throw new Error('Testimonials section requires at least one testimonial');
  }

  const header = content.title
    ? `  <Heading level={2} alignment="center">${content.title}</Heading>`
    : '';

  const testimonialCards = content.testimonials.map(t => `    <Card>
      <CardBody>
        <VStack spacing={4}>
          <Text>${t.quote}</Text>
          <VStack spacing={1}>
            <Text weight="bold">${t.author}</Text>
${t.role || t.company ? `            <Text size="sm">${[t.role, t.company].filter(Boolean).join(', ')}</Text>` : ''}
          </VStack>
        </VStack>
      </CardBody>
    </Card>`).join('\n');

  const markupContent = `<VStack spacing={8}>
${header}
  <Grid columns={${Math.min(content.testimonials.length, 3)}} gap={6}>
${testimonialCards}
  </Grid>
</VStack>`;

  const componentCount = 2 + // VStack + Grid
    (content.title ? 1 : 0) +
    content.testimonials.reduce((count, t) => count + 6 + (t.role || t.company ? 1 : 0), 0);

  return { markupContent, componentCount };
}

function buildFooterSection(content: {
  copyright?: string;
  links?: NavLink[];
}): { markupContent: string; componentCount: number } {
  const linkButtons = content.links?.map(link => `      <Button variant="link">${link.label}</Button>`).join('\n') || '';

  const markupContent = `<VStack spacing={4} padding={8}>
${content.links ? `  <HStack spacing={4}>
${linkButtons}
  </HStack>` : ''}
${content.copyright ? `  <Text size="sm">${content.copyright}</Text>` : ''}
</VStack>`;

  const componentCount = 1 + // VStack
    (content.links ? content.links.length + 1 : 0) + // HStack + Buttons
    (content.copyright ? 1 : 0);

  return { markupContent, componentCount };
}

function buildNavSection(content: { links: NavLink[] }): { markupContent: string; componentCount: number } {
  if (!content.links || content.links.length === 0) {
    throw new Error('Nav section requires at least one link');
  }

  const linkButtons = content.links.map(link => `  <Button variant="link">${link.label}</Button>`).join('\n');

  const markupContent = `<HStack spacing={4} padding={4}>
${linkButtons}
</HStack>`;

  const componentCount = 1 + content.links.length; // HStack + Buttons

  return { markupContent, componentCount };
}

function buildCTASection(content: {
  headline: string;
  description?: string;
  primaryCTA: string;
  secondaryCTA?: string;
}): { markupContent: string; componentCount: number } {
  if (!content.headline || !content.primaryCTA) {
    throw new Error('CTA section requires headline and primaryCTA');
  }

  const markupContent = `<VStack spacing={6} alignment="center" padding={12}>
  <Heading level={2}>${content.headline}</Heading>
${content.description ? `  <Text>${content.description}</Text>` : ''}
  <HStack spacing={4}>
    <Button variant="primary" size="lg">${content.primaryCTA}</Button>
${content.secondaryCTA ? `    <Button variant="default" size="lg">${content.secondaryCTA}</Button>` : ''}
  </HStack>
</VStack>`;

  const componentCount = 4 + // VStack + Heading + HStack + Button
    (content.description ? 1 : 0) +
    (content.secondaryCTA ? 1 : 0);

  return { markupContent, componentCount };
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
      content: getContentPreview(props) || undefined,
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
