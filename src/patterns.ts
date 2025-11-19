import { ComponentNode } from './types';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  category: string;
  tree: Omit<ComponentNode, 'id'>; // Pattern template without ID (will be generated on insert)
}

// Helper to generate unique IDs for pattern nodes
const generateId = () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to assign IDs to pattern trees
export const assignIds = (node: Omit<ComponentNode, 'id'>): ComponentNode => ({
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
          props: { level: 1, content: 'Welcome to Your Site' },
          children: [],
        },
        {
          type: 'Text',
          props: { content: 'Create beautiful pages with ease using our intuitive design system.' },
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
              props: { level: 1, content: 'Build Something Amazing' },
              children: [],
            },
            {
              type: 'Text',
              props: { content: 'Transform your ideas into reality with our powerful design tools and components.' },
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
                  props: { content: 'Image placeholder - Add your hero image here' },
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
                  props: { level: 3, content: 'Fast Performance' },
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
                  props: { content: 'Lightning-fast load times and optimized performance for the best user experience.' },
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
                  props: { level: 3, content: 'Easy to Use' },
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
                  props: { content: 'Intuitive interface that makes building beautiful pages a breeze.' },
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
                  props: { level: 3, content: 'Fully Responsive' },
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
                  props: { content: 'Looks great on all devices, from mobile phones to desktop screens.' },
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
                      props: { level: 3, content: 'Starter' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 2, content: '$9/mo' },
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
                      props: { content: '✓ 5 Projects' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { content: '✓ Basic Support' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { content: '✓ 1GB Storage' },
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
                      props: { level: 3, content: 'Pro' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 2, content: '$29/mo' },
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
                      props: { content: '✓ Unlimited Projects' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { content: '✓ Priority Support' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { content: '✓ 10GB Storage' },
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
                      props: { level: 3, content: 'Enterprise' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 2, content: '$99/mo' },
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
                      props: { content: '✓ Unlimited Everything' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { content: '✓ 24/7 Support' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { content: '✓ 100GB Storage' },
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
              props: { level: 2, content: 'Get in Touch' },
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
                  props: { content: '"This product has transformed how we work. The interface is intuitive and the results are outstanding."' },
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
                          props: { content: 'Sarah Johnson' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { content: 'CEO, TechCorp' },
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
                      props: { level: 2, content: 'Ready to Get Started?' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { content: 'Join thousands of users already building amazing experiences.' },
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
              props: { level: 1, content: '10K+' },
              children: [],
            },
            {
              type: 'Text',
              props: { content: 'Active Users' },
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
              props: { level: 1, content: '50+' },
              children: [],
            },
            {
              type: 'Text',
              props: { content: 'Countries' },
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
              props: { level: 1, content: '99.9%' },
              children: [],
            },
            {
              type: 'Text',
              props: { content: 'Uptime' },
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
              props: { level: 1, content: '24/7' },
              children: [],
            },
            {
              type: 'Text',
              props: { content: 'Support' },
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
                  props: { level: 4, content: 'Advanced Analytics' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { content: 'Track and measure your performance with detailed insights.' },
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
                  props: { level: 4, content: 'Team Collaboration' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { content: 'Work together seamlessly with your team members.' },
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
                  props: { level: 4, content: 'Secure & Reliable' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { content: 'Enterprise-grade security and 99.9% uptime guarantee.' },
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
