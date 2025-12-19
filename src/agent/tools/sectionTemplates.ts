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
    // DEBUG: Log section_create execution
    console.log('\n[section_create] ========== EXECUTING ==========');
    console.log('[section_create] Template:', params.template);
    console.log('[section_create] Content:', JSON.stringify(params.content, null, 2));
    console.log('[section_create] ParentId:', params.parentId);
    console.log('[section_create] Placement:', params.placement);

    // Generate section based on template
    let markupContent: string;
    let componentCount = 0;

    try {
      console.log(`[section_create] Routing to build${params.template.charAt(0).toUpperCase() + params.template.slice(1)}Section...`);
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

      console.log(`[section_create] Successfully generated markup for ${params.template}, length:`, markupContent.length);

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
      // Validate parentId - must be a component ID (starts with 'root-' or 'node-'), not a page ID
      let targetParentId = params.parentId;
      if (targetParentId && targetParentId.startsWith('page-')) {
        console.warn(`[section_create] Invalid parentId "${targetParentId}" (page ID, not component ID). Defaulting to root-grid.`);
        targetParentId = 'root-grid';
      }

      // Handle placement
      if (!targetParentId && params.placement?.startsWith('after:')) {
        targetParentId = params.placement.replace('after:', '');
      }

      // Default to root-grid if no valid parent
      if (!targetParentId) {
        targetParentId = 'root-grid';
      }

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
      console.error('[section_create] ERROR:', error);
      console.error('[section_create] Stack:', error.stack);
      return {
        success: false,
        message: `Failed to create ${params.template} section: ${error.message}`,
        error: error.message,
      };
    }
  },
};

// Template builders

function buildPricingSection(content: { tiers?: PricingTier[] }): { markupContent: string; componentCount: number } {
  // Provide default tiers if none given, and filter out invalid entries
  const validTiers = content?.tiers
    ? content.tiers.filter(t => t && (t.name || t.price))
    : [];

  const tiers = validTiers.length > 0
    ? validTiers
    : [
        { name: 'Free', price: '$0', features: ['Basic features', '1 user'], cta: 'Get Started', highlighted: false },
        { name: 'Pro', price: '$29/mo', features: ['Advanced features', '10 users', 'Priority support'], cta: 'Start Trial', highlighted: true },
        { name: 'Enterprise', price: '$99/mo', features: ['Unlimited users', 'Custom features', '24/7 support'], cta: 'Contact Sales', highlighted: false },
      ];

  const cards = tiers.map(tier => {
    // Provide defaults for missing fields
    const name = tier.name || 'Plan';
    const price = tier.price || '$0';
    const features = tier.features && Array.isArray(tier.features) ? tier.features : ['Features included'];
    const cta = tier.cta || 'Get Started';
    const highlighted = tier.highlighted || false;

    return `  <Card variant="${highlighted ? 'elevated' : 'outlined'}">
    <CardHeader>
      <Heading level={3}>${name}</Heading>
    </CardHeader>
    <CardBody>
      <VStack spacing={4}>
        <Heading level={2}>${price}</Heading>
        <VStack spacing={2}>
${features.map(f => `          <Text>✓ ${f}</Text>`).join('\n')}
        </VStack>
        <Button variant="${highlighted ? 'primary' : 'default'}">${cta}</Button>
      </VStack>
    </CardBody>
  </Card>`;
  }).join('\n');

  const markupContent = `<Grid columns={${Math.min(tiers.length, 4)}} gap={6}>
${cards}
</Grid>`;

  const componentCount = tiers.reduce((count, tier) => {
    const features = tier.features && Array.isArray(tier.features) ? tier.features : ['Features included'];
    return count + 5 + features.length; // Card + Header + Heading + Body + VStack + Price + Features + Button
  }, 1); // +1 for Grid

  return { markupContent, componentCount };
}

function buildHeroSection(content: {
  headline?: string;
  subheadline?: string;
  cta?: { text?: string; variant?: string } | string;
}): { markupContent: string; componentCount: number } {
  // Provide defaults if missing
  const headline = content?.headline || 'Welcome';
  const subheadline = content?.subheadline;

  let componentCount = 2; // VStack + Heading

  const children: string[] = [
    `  <Heading level={1} size="2xl">${headline}</Heading>`
  ];

  if (subheadline) {
    children.push(`  <Text size="lg">${subheadline}</Text>`);
    componentCount++;
  }

  if (content.cta) {
    const ctaText = typeof content.cta === 'string' ? content.cta : (content.cta.text || 'Get Started');
    const ctaVariant = typeof content.cta === 'object' ? (content.cta.variant || 'primary') : 'primary';
    children.push(`  <Button variant="${ctaVariant}" size="lg">${ctaText}</Button>`);
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
  features?: Feature[];
}): { markupContent: string; componentCount: number } {
  // Provide default features if none given, and filter out invalid entries
  const validFeatures = content?.features
    ? content.features.filter(f => f && f.title && f.description)
    : [];

  const features = validFeatures.length > 0
    ? validFeatures
    : [
        { title: 'Fast', description: 'Lightning fast performance', icon: '⚡' },
        { title: 'Secure', description: 'Bank-level security', icon: '🔒' },
        { title: 'Reliable', description: '99.9% uptime guarantee', icon: '✓' }
      ];

  const header = content.title || content.description
    ? `  <VStack spacing={2} alignment="center">
${content.title ? `    <Heading level={2}>${content.title}</Heading>` : ''}
${content.description ? `    <Text>${content.description}</Text>` : ''}
  </VStack>`
    : '';

  const featureCards = features.map(feature => `    <Card>
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
  <Grid columns={${Math.min(features.length, 3)}} gap={6}>
${featureCards}
  </Grid>
</VStack>`;

  const componentCount = 2 + // VStack + Grid
    (content.title ? 1 : 0) +
    (content.description ? 1 : 0) +
    features.reduce((count, f) => count + 4 + (f.icon ? 1 : 0), 0); // Card + Body + VStack + Heading + Text (+ icon)

  return { markupContent, componentCount };
}

function buildTestimonialsSection(content: {
  title?: string;
  testimonials?: Testimonial[];
}): { markupContent: string; componentCount: number } {
  // DEBUG: Log testimonials section build
  console.log('[buildTestimonialsSection] Called with content:', JSON.stringify(content, null, 2));

  // Provide default testimonials if none given, and filter out invalid entries
  const validTestimonials = content?.testimonials
    ? content.testimonials.filter(t => t && t.quote && t.author)
    : [];

  console.log('[buildTestimonialsSection] Valid testimonials count:', validTestimonials.length);

  const testimonials = validTestimonials.length > 0
    ? validTestimonials
    : [
        { quote: 'Amazing product! It changed everything for us.', author: 'Jane Smith', role: 'CEO', company: 'Acme Corp' },
        { quote: 'Best decision we ever made. Highly recommended!', author: 'John Doe', role: 'CTO', company: 'Tech Inc' }
      ];

  console.log('[buildTestimonialsSection] Using testimonials:', testimonials.length, 'testimonials');

  const header = content.title
    ? `  <Heading level={2} alignment="center">${content.title}</Heading>`
    : '';

  const testimonialCards = testimonials.map(t => `    <Card>
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
  <Grid columns={${Math.min(testimonials.length, 3)}} gap={6}>
${testimonialCards}
  </Grid>
</VStack>`;

  const componentCount = 2 + // VStack + Grid
    (content.title ? 1 : 0) +
    testimonials.reduce((count, t) => count + 6 + (t.role || t.company ? 1 : 0), 0);

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

function buildNavSection(content: { links?: NavLink[] | any[] }): { markupContent: string; componentCount: number } {
  // Provide default links if none given or malformed
  const rawLinks = content?.links || [];
  const links = rawLinks.length > 0
    ? rawLinks.map(link => ({
        label: typeof link === 'string' ? link : (link?.label || link?.text || 'Link'),
        href: typeof link === 'object' ? (link?.href || '#') : '#'
      }))
    : [
        { label: 'Home', href: '#' },
        { label: 'About', href: '#' },
        { label: 'Services', href: '#' },
        { label: 'Contact', href: '#' }
      ];

  const linkButtons = links.map(link => `  <Button variant="link">${link.label}</Button>`).join('\n');

  const markupContent = `<HStack spacing={4} padding={4}>
${linkButtons}
</HStack>`;

  const componentCount = 1 + links.length; // HStack + Buttons

  return { markupContent, componentCount };
}

function buildCTASection(content: {
  headline?: string;
  description?: string;
  primaryCTA?: string;
  secondaryCTA?: string;
}): { markupContent: string; componentCount: number } {
  // Provide defaults
  const headline = content?.headline || 'Ready to Get Started?';
  const description = content?.description;
  const primaryCTA = content?.primaryCTA || 'Get Started';
  const secondaryCTA = content?.secondaryCTA;

  const markupContent = `<VStack spacing={6} alignment="center" padding={12}>
  <Heading level={2}>${headline}</Heading>
${description ? `  <Text>${description}</Text>` : ''}
  <HStack spacing={4}>
    <Button variant="primary" size="lg">${primaryCTA}</Button>
${secondaryCTA ? `    <Button variant="default" size="lg">${secondaryCTA}</Button>` : ''}
  </HStack>
</VStack>`;

  const componentCount = 4 + // VStack + Heading + HStack + Button
    (description ? 1 : 0) +
    (secondaryCTA ? 1 : 0);

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
