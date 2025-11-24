import { AgentConfig } from '../types';

/**
 * Copywriter Agent Configuration
 *
 * Responsibility: Generates compelling, contextual text content
 *
 * Tools:
 * - None (generates text, doesn't call tools)
 *
 * Use Cases:
 * - Generate headlines, body copy, CTAs
 * - Create form labels and placeholders
 * - Write error messages
 * - Adapt tone to context (professional, casual, playful)
 */
export const copywriterAgentConfig: AgentConfig = {
  type: 'copywriter',
  model: {
    provider: 'openai',
    model: 'gpt-5-nano',
  },
  systemPrompt: `You are a Copywriter Agent for WP-Designer. Your job is to generate compelling, clear text for UI components.

Your responsibilities:
1. Generate headlines that communicate value
2. Write clear, action-oriented CTAs
3. Create scannable body copy
4. Write helpful form labels and placeholders
5. Adapt tone to context

Writing Guidelines:

**Headlines:**
- Clear value proposition
- Benefit-focused, not feature-focused
- Keep under 60 characters
- Use title case

Good: "Build Beautiful Websites in Minutes"
Bad: "Our Website Building Platform Has Many Features"

**CTAs (Call-to-Action):**
- Action-oriented verbs
- Specific outcomes
- Create urgency when appropriate

Good: "Start Free Trial", "Get Started", "Download Now"
Bad: "Click Here", "Submit", "Go"

**Body Copy:**
- Short paragraphs (2-3 sentences max)
- Scannable bullet points
- Focus on benefits
- Use active voice

**Form Labels:**
- Clear, specific
- Helpful without being verbose
- Include placeholder examples when helpful

Good: "Email address" (label), "you@example.com" (placeholder)
Bad: "Enter your email address here"

**Tone Guidelines:**
- Professional: Clear, authoritative, trustworthy (SaaS, Enterprise)
- Casual: Friendly, conversational, approachable (Consumer apps)
- Playful: Fun, energetic, creative (Gaming, Creative tools)

Output Format:
Return JSON with text for each component:
{
  "card1_title": "Starter Plan",
  "card1_body": "Perfect for individuals and small projects",
  "card1_cta": "Start Free Trial",
  "card2_title": "Pro Plan",
  ...
}

IMPORTANT:
- No "lorem ipsum" or placeholder text
- Generate real, contextual content
- Match the specified tone
- Keep it concise`,
  maxCalls: 2,
  tools: [], // Copywriter generates text, doesn't need tools
};

/**
 * Content templates for common UI patterns
 */
export const CONTENT_TEMPLATES = {
  pricing: {
    tiers: {
      basic: {
        name: 'Basic',
        description: 'Perfect for individuals getting started',
        cta: 'Start Free',
      },
      pro: {
        name: 'Professional',
        description: 'Best for growing teams and businesses',
        cta: 'Start Trial',
      },
      enterprise: {
        name: 'Enterprise',
        description: 'For large organizations with advanced needs',
        cta: 'Contact Sales',
      },
    },
  },
  hero: {
    professional: {
      headline: 'Build Better Products Faster',
      subheadline: 'The modern platform for product teams to ship with confidence',
      primaryCTA: 'Get Started',
      secondaryCTA: 'View Demo',
    },
    casual: {
      headline: 'Create Something Amazing',
      subheadline: 'Everything you need to bring your ideas to life',
      primaryCTA: 'Start Creating',
      secondaryCTA: 'Learn More',
    },
    playful: {
      headline: 'Ready to Make Magic?',
      subheadline: 'Jump in and start building something awesome today',
      primaryCTA: 'Let\\'s Go!',
      secondaryCTA: 'See Examples',
    },
  },
  contact: {
    professional: {
      headline: 'Get In Touch',
      body: 'Have questions? Our team is here to help.',
      cta: 'Send Message',
    },
    casual: {
      headline: 'Let\\'s Talk',
      body: 'Drop us a line and we\\'ll get back to you soon.',
      cta: 'Say Hello',
    },
  },
  features: {
    verbs: ['Build', 'Create', 'Design', 'Launch', 'Ship', 'Deploy', 'Collaborate', 'Manage'],
    benefits: ['faster', 'better', 'easier', 'smarter', 'efficiently', 'confidently'],
  },
};

/**
 * Generate content for a specific pattern and tone
 */
export function generateContent(
  pattern: 'pricing' | 'hero' | 'contact' | 'features',
  tone: 'professional' | 'casual' | 'playful' = 'professional',
  customization?: any
): any {
  const template = CONTENT_TEMPLATES[pattern];

  if (pattern === 'pricing') {
    return customization?.tierCount === 3
      ? Object.values(template.tiers)
      : [template.tiers.basic, template.tiers.pro];
  }

  if (pattern === 'hero' || pattern === 'contact') {
    return template[tone] || template.professional;
  }

  return template;
}

/**
 * Analyze text for readability and best practices
 */
export function analyzeText(text: string): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check length
  if (text.length > 200) {
    issues.push('Text is too long (>200 chars)');
    suggestions.push('Break into shorter sentences or paragraphs');
    score -= 20;
  }

  // Check for passive voice
  if (text.match(/\b(was|were|been|being)\s+\w+ed\b/)) {
    issues.push('Contains passive voice');
    suggestions.push('Use active voice for clarity');
    score -= 10;
  }

  // Check for placeholder text
  if (text.toLowerCase().includes('lorem') || text.toLowerCase().includes('placeholder')) {
    issues.push('Contains placeholder text');
    suggestions.push('Replace with real, contextual content');
    score -= 30;
  }

  // Check for generic CTAs
  if (['Click here', 'Submit', 'Go'].some(cta => text.toLowerCase().includes(cta.toLowerCase()))) {
    issues.push('Generic CTA');
    suggestions.push('Use specific, action-oriented CTAs');
    score -= 15;
  }

  return {
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}
