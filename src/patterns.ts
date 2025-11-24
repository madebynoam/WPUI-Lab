import { ComponentNode, PatternNode } from './types';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  category: string;
  tree: PatternNode;
}

// Helper to generate unique IDs for pattern nodes
const generateId = () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to assign IDs to pattern trees
export const assignIds = (node: PatternNode): ComponentNode => ({
  ...node,
  id: generateId(),
  children: node.children?.map(assignIds),
});

export const patterns: Pattern[] = [
  // Hero/CTA Patterns
  {
    id: 'hero-centered',
    name: 'Hero - Centered',
    description: 'Centered hero section with heading, text, and CTA button',
    category: 'Heroes',
    tree: {
      type: 'VStack',
      props: { spacing: 6, alignment: 'center' },
      children: [
        {
          type: 'Heading',
          props: { level: 1, children: 'Welcome to Your Site' },
          children: [],
        },
        {
          type: 'Text',
          props: { children: 'Create beautiful pages with ease using our intuitive design system.' },
          children: [],
        },
        {
          type: 'Button',
          props: { text: 'Get Started', variant: 'primary' },
          children: [],
        },
      ],
    },
  },
  {
    id: 'hero-two-column',
    name: 'Hero - Two Column',
    description: 'Hero section with content on left and space for image on right',
    category: 'Heroes',
    tree: {
      type: 'Grid',
      props: { columns: 2, gap: 8 },
      children: [
        {
          type: 'VStack',
          props: { spacing: 4 },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: 'Build Something Amazing' },
              children: [],
            },
            {
              type: 'Text',
              props: { children: 'Transform your ideas into reality with our powerful design tools and components.' },
              children: [],
            },
            {
              type: 'HStack',
              props: { spacing: 3 },
              children: [
                {
                  type: 'Button',
                  props: { text: 'Get Started', variant: 'primary' },
                  children: [],
                },
                {
                  type: 'Button',
                  props: { text: 'Learn More', variant: 'secondary' },
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'Card',
          props: {},
          children: [
            {
              type: 'CardBody',
              props: {},
              children: [
                {
                  type: 'Text',
                  props: { children: 'Image placeholder - Add your hero image here' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Card Grid Patterns
  {
    id: 'feature-cards-3col',
    name: 'Feature Cards - 3 Column',
    description: 'Three feature cards in a grid layout',
    category: 'Features',
    tree: {
      type: 'Grid',
      props: { columns: 3, gap: 6 },
      children: [
        {
          type: 'Card',
          props: {},
          children: [
            {
              type: 'CardHeader',
              props: {},
              children: [
                {
                  type: 'Heading',
                  props: { level: 3, children: 'Fast Performance' },
                  children: [],
                },
              ],
            },
            {
              type: 'CardBody',
              props: {},
              children: [
                {
                  type: 'Text',
                  props: { children: 'Lightning-fast load times and optimized performance for the best user experience.' },
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'Card',
          props: {},
          children: [
            {
              type: 'CardHeader',
              props: {},
              children: [
                {
                  type: 'Heading',
                  props: { level: 3, children: 'Easy to Use' },
                  children: [],
                },
              ],
            },
            {
              type: 'CardBody',
              props: {},
              children: [
                {
                  type: 'Text',
                  props: { children: 'Intuitive interface that makes building beautiful pages a breeze.' },
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'Card',
          props: {},
          children: [
            {
              type: 'CardHeader',
              props: {},
              children: [
                {
                  type: 'Heading',
                  props: { level: 3, children: 'Fully Responsive' },
                  children: [],
                },
              ],
            },
            {
              type: 'CardBody',
              props: {},
              children: [
                {
                  type: 'Text',
                  props: { children: 'Looks great on all devices, from mobile phones to desktop screens.' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Pricing Table
  {
    id: 'pricing-3col',
    name: 'Pricing Table - 3 Plans',
    description: 'Three-column pricing table with features',
    category: 'Pricing',
    tree: {
      type: 'Grid',
      props: { columns: 3, gap: 6 },
      children: [
        {
          type: 'Card',
          props: {},
          children: [
            {
              type: 'CardHeader',
              props: {},
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2, alignment: 'center' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Starter' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 2, children: '$9/mo' },
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              type: 'CardBody',
              props: {},
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2 },
                  children: [
                    {
                      type: 'Text',
                      props: { children: '✓ 5 Projects' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ Basic Support' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 1GB Storage' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { text: 'Choose Plan', variant: 'secondary' },
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Card',
          props: {},
          children: [
            {
              type: 'CardHeader',
              props: {},
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2, alignment: 'center' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Pro' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 2, children: '$29/mo' },
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              type: 'CardBody',
              props: {},
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2 },
                  children: [
                    {
                      type: 'Text',
                      props: { children: '✓ Unlimited Projects' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ Priority Support' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 10GB Storage' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { text: 'Choose Plan', variant: 'primary' },
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Card',
          props: {},
          children: [
            {
              type: 'CardHeader',
              props: {},
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2, alignment: 'center' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Enterprise' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 2, children: '$99/mo' },
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              type: 'CardBody',
              props: {},
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2 },
                  children: [
                    {
                      type: 'Text',
                      props: { children: '✓ Unlimited Everything' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 24/7 Support' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 100GB Storage' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { text: 'Contact Sales', variant: 'secondary' },
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Contact Form
  {
    id: 'contact-form',
    name: 'Contact Form',
    description: 'Basic contact form with name, email, and message fields',
    category: 'Forms',
    tree: {
      type: 'Card',
      props: {},
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'Heading',
              props: { level: 2, children: 'Get in Touch' },
              children: [],
            },
          ],
        },
        {
          type: 'CardBody',
          props: {},
          children: [
            {
              type: 'VStack',
              props: { spacing: 4 },
              children: [
                {
                  type: 'TextControl',
                  props: { label: 'Name', placeholder: 'Your name' },
                  children: [],
                },
                {
                  type: 'TextControl',
                  props: { label: 'Email', placeholder: 'your.email@example.com', type: 'email' },
                  children: [],
                },
                {
                  type: 'TextareaControl',
                  props: { label: 'Message', placeholder: 'Your message...', rows: 5 },
                  children: [],
                },
                {
                  type: 'Button',
                  props: { text: 'Send Message', variant: 'primary' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Testimonial Card
  {
    id: 'testimonial-card',
    name: 'Testimonial Card',
    description: 'Single testimonial with quote and attribution',
    category: 'Testimonials',
    tree: {
      type: 'Card',
      props: {},
      children: [
        {
          type: 'CardBody',
          props: {},
          children: [
            {
              type: 'VStack',
              props: { spacing: 4 },
              children: [
                {
                  type: 'Text',
                  props: { children: '"This product has transformed how we work. The interface is intuitive and the results are outstanding."' },
                  children: [],
                },
                {
                  type: 'HStack',
                  props: { spacing: 3 },
                  children: [
                    {
                      type: 'Icon',
                      props: {},
                      children: [],
                    },
                    {
                      type: 'VStack',
                      props: { spacing: 0 },
                      children: [
                        {
                          type: 'Text',
                          props: { children: 'Sarah Johnson' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'CEO, TechCorp' },
                          children: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Call to Action
  {
    id: 'cta-banner',
    name: 'CTA Banner',
    description: 'Full-width call-to-action banner',
    category: 'CTAs',
    tree: {
      type: 'Panel',
      props: {},
      children: [
        {
          type: 'PanelBody',
          props: {},
          children: [
            {
              type: 'HStack',
              props: { spacing: 6, alignment: 'center' },
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2 },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 2, children: 'Ready to Get Started?' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: 'Join thousands of users already building amazing experiences.' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Button',
                  props: { text: 'Start Free Trial', variant: 'primary' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Stats Section
  {
    id: 'stats-4col',
    name: 'Stats - 4 Column',
    description: 'Four-column statistics display',
    category: 'Stats',
    tree: {
      type: 'Grid',
      props: { columns: 4, gap: 6 },
      children: [
        {
          type: 'VStack',
          props: { spacing: 1, alignment: 'center' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: '10K+' },
              children: [],
            },
            {
              type: 'Text',
              props: { children: 'Active Users' },
              children: [],
            },
          ],
        },
        {
          type: 'VStack',
          props: { spacing: 1, alignment: 'center' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: '50+' },
              children: [],
            },
            {
              type: 'Text',
              props: { children: 'Countries' },
              children: [],
            },
          ],
        },
        {
          type: 'VStack',
          props: { spacing: 1, alignment: 'center' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: '99.9%' },
              children: [],
            },
            {
              type: 'Text',
              props: { children: 'Uptime' },
              children: [],
            },
          ],
        },
        {
          type: 'VStack',
          props: { spacing: 1, alignment: 'center' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: '24/7' },
              children: [],
            },
            {
              type: 'Text',
              props: { children: 'Support' },
              children: [],
            },
          ],
        },
      ],
    },
  },

  // Feature List
  {
    id: 'feature-list',
    name: 'Feature List',
    description: 'Vertical list of features with icons',
    category: 'Features',
    tree: {
      type: 'VStack',
      props: { spacing: 4 },
      children: [
        {
          type: 'HStack',
          props: { spacing: 3 },
          children: [
            {
              type: 'Icon',
              props: {},
              children: [],
            },
            {
              type: 'VStack',
              props: { spacing: 1 },
              children: [
                {
                  type: 'Heading',
                  props: { level: 4, children: 'Advanced Analytics' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { children: 'Track and measure your performance with detailed insights.' },
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'HStack',
          props: { spacing: 3 },
          children: [
            {
              type: 'Icon',
              props: {},
              children: [],
            },
            {
              type: 'VStack',
              props: { spacing: 1 },
              children: [
                {
                  type: 'Heading',
                  props: { level: 4, children: 'Team Collaboration' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { children: 'Work together seamlessly with your team members.' },
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'HStack',
          props: { spacing: 3 },
          children: [
            {
              type: 'Icon',
              props: {},
              children: [],
            },
            {
              type: 'VStack',
              props: { spacing: 1 },
              children: [
                {
                  type: 'Heading',
                  props: { level: 4, children: 'Secure & Reliable' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { children: 'Enterprise-grade security and 99.9% uptime guarantee.' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },
];

// Pattern categories for organization
export const patternCategories = [
  'Heroes',
  'Features',
  'Pricing',
  'Forms',
  'Testimonials',
  'CTAs',
  'Stats',
];
