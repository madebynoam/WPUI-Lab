import { Pattern } from './types';

/**
 * Card Patterns
 *
 * Pre-built card templates for various use cases including actions, pricing, and info displays.
 */

export const cardPatterns: Pattern[] = [
  {
    id: 'action-cards-3col',
    name: 'Action Cards - 3 Column',
    description: 'Three interactive action cards with icons, titles, descriptions, and chevrons',
    category: 'Cards',
    tree: {
      type: 'Grid',
      name: 'Action cards',
      props: { columns: 12, gap: 16 },
      children: [
        {
          type: 'Card',
          name: 'Deployments',
          props: { size: 'medium', gridColumnSpan: 4 },
          children: [
            {
              type: 'CardBody',
              props: { size: 'small' },
              children: [
                {
                  type: 'HStack',
                  props: { spacing: 2, justify: 'space-between', alignment: 'center' },
                  children: [
                    {
                      type: 'HStack',
                      name: 'Content',
                      props: { spacing: 4, alignment: 'top', expanded: true },
                      children: [
                        {
                          type: 'Icon',
                          props: { icon: 'globe', size: 24 },
                          children: [],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 1 },
                          children: [
                            {
                              type: 'Heading',
                              props: { level: 4, children: 'Deployments' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { variant: 'muted', children: 'Automate deployments from GitHub to streamline your workflow.' },
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'Icon',
                      name: 'Chevron',
                      props: { icon: 'chevronRight', size: 24 },
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
          name: 'Analytics',
          props: { size: 'medium', gridColumnSpan: 4 },
          children: [
            {
              type: 'CardBody',
              props: { size: 'small' },
              children: [
                {
                  type: 'HStack',
                  props: { spacing: 2, justify: 'space-between', alignment: 'center' },
                  children: [
                    {
                      type: 'HStack',
                      name: 'Content',
                      props: { spacing: 4, alignment: 'top', expanded: true },
                      children: [
                        {
                          type: 'Icon',
                          props: { icon: 'chartBar', size: 24 },
                          children: [],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 1 },
                          children: [
                            {
                              type: 'Heading',
                              props: { level: 4, children: 'Analytics' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { variant: 'muted', children: 'Track visitor insights, traffic patterns, and user behavior across your entire site.' },
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'Icon',
                      name: 'Chevron',
                      props: { icon: 'chevronRight', size: 24 },
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
          name: 'Security',
          props: { size: 'medium', gridColumnSpan: 4 },
          children: [
            {
              type: 'CardBody',
              props: { size: 'small' },
              children: [
                {
                  type: 'HStack',
                  props: { spacing: 2, justify: 'space-between', alignment: 'center' },
                  children: [
                    {
                      type: 'HStack',
                      name: 'Content',
                      props: { spacing: 4, alignment: 'top', expanded: true },
                      children: [
                        {
                          type: 'Icon',
                          props: { icon: 'lock', size: 24 },
                          children: [],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 1 },
                          children: [
                            {
                              type: 'Heading',
                              props: { level: 4, children: 'Security' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { variant: 'muted', children: 'Manage SSL certificates, firewall rules, and access controls for your application.' },
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'Icon',
                      name: 'Chevron',
                      props: { icon: 'chevronRight', size: 24 },
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
  {
    id: 'pricing-cards',
    name: 'Pricing Cards',
    description: 'Four-column pricing cards with features and badges',
    category: 'Cards',
    tree: {
      type: 'Grid',
      props: { columns: 12, gap: 16 },
      children: [
        {
          type: 'Card',
          name: 'Free',
          props: { gridColumnSpan: 3 },
          children: [
            {
              type: 'CardHeader',
              props: { size: 'small', isBorderless: true },
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 1, alignment: 'left' },
                  children: [
                    {
                      type: 'Text',
                      props: { children: 'CURRENT PLAN', variant: 'muted' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Free' },
                      children: [],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 2, alignment: 'stretch', justify: 'space-between', expanded: true },
                      children: [
                        {
                          type: 'VStack',
                          props: { spacing: 2 },
                          children: [
                            {
                              type: 'Heading',
                              props: { level: 3, children: '$7' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'Per month, paid yearly', variant: 'muted' },
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
            {
              type: 'CardBody',
              props: { size: 'small' },
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2, alignment: 'stretch', justify: 'flex-start', expanded: true, wrap: false },
                  children: [
                    {
                      type: 'Button',
                      props: { text: 'Select', variant: 'secondary', disabled: true, stretchFullWidth: true },
                      children: [],
                    },
                    {
                      type: 'Spacer',
                      props: { margin: 0 },
                      children: [],
                    },
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
                      type: 'Text',
                      props: { children: '✓ 1GB Bandwidth' },
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
          name: 'Premium',
          props: { gridColumnSpan: 3, elevation: 0, isRounded: true, isBorderless: false },
          children: [
            {
              type: 'CardHeader',
              props: { size: 'small', isBorderless: true, isShady: false },
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 1, alignment: 'stretch', expanded: true },
                  children: [
                    {
                      type: 'Text',
                      props: { children: 'RECOMMENDED', variant: 'muted' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Premium' },
                      children: [],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 2, alignment: 'top', justify: 'space-between', expanded: true },
                      children: [
                        {
                          type: 'VStack',
                          props: { spacing: 2 },
                          children: [
                            {
                              type: 'HStack',
                              props: { spacing: 2, justify: 'flex-start' },
                              children: [
                                {
                                  type: 'Heading',
                                  props: { level: 3, children: '$12' },
                                  children: [],
                                },
                                {
                                  type: 'Badge',
                                  props: { children: '20% off', intent: 'success' },
                                  children: [],
                                },
                              ],
                            },
                            {
                              type: 'Text',
                              props: { children: 'Per month, paid yearly', variant: 'muted' },
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
            {
              type: 'CardBody',
              props: { size: 'small' },
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2, alignment: 'stretch', justify: 'flex-start', expanded: true, wrap: false },
                  children: [
                    {
                      type: 'Button',
                      props: { text: 'Upgrade to Premium', variant: 'primary', disabled: false, stretchFullWidth: true },
                      children: [],
                    },
                    {
                      type: 'Spacer',
                      props: { margin: 0 },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 10 Projects' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ Priority Support' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 5GB Storage' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 5GB Bandwidth' },
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
          name: 'Business',
          props: { gridColumnSpan: 3, elevation: 0, isRounded: true, isBorderless: false },
          children: [
            {
              type: 'CardHeader',
              props: { size: 'small', isBorderless: true, isShady: false },
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 1, alignment: 'stretch', expanded: true },
                  children: [
                    {
                      type: 'Spacer',
                      props: { margin: 0 },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Business' },
                      children: [],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 2, alignment: 'top', justify: 'space-between', expanded: true },
                      children: [
                        {
                          type: 'VStack',
                          props: { spacing: 2 },
                          children: [
                            {
                              type: 'Heading',
                              props: { level: 3, children: '$24' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'Per month, paid yearly', variant: 'muted' },
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
            {
              type: 'CardBody',
              props: { size: 'small' },
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2, alignment: 'stretch', justify: 'flex-start', expanded: true, wrap: false },
                  children: [
                    {
                      type: 'Button',
                      props: { text: 'Upgrade to Business', variant: 'secondary', disabled: false, stretchFullWidth: true },
                      children: [],
                    },
                    {
                      type: 'Spacer',
                      props: { margin: 0 },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 15 Projects' },
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
                      type: 'Text',
                      props: { children: '✓ 10GB Bandwidth' },
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
          name: 'Commerce',
          props: { gridColumnSpan: 3, elevation: 0, isRounded: true, isBorderless: false },
          children: [
            {
              type: 'CardHeader',
              props: { size: 'small', isBorderless: true, isShady: false },
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 1, alignment: 'stretch', expanded: true },
                  children: [
                    {
                      type: 'Spacer',
                      props: { margin: 0 },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Commerce' },
                      children: [],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 2, alignment: 'top', justify: 'space-between', expanded: true },
                      children: [
                        {
                          type: 'VStack',
                          props: { spacing: 2 },
                          children: [
                            {
                              type: 'Heading',
                              props: { level: 3, children: '$32' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'Per month, paid yearly', variant: 'muted' },
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
            {
              type: 'CardBody',
              props: { size: 'small' },
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2, alignment: 'stretch', justify: 'flex-start', expanded: true, wrap: false },
                  children: [
                    {
                      type: 'Button',
                      props: { text: 'Upgrade to Commerce', variant: 'secondary', disabled: false, stretchFullWidth: true },
                      children: [],
                    },
                    {
                      type: 'Spacer',
                      props: { margin: 0 },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 20 Projects' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ Priority Support' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 20GB Storage' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 20GB Bandwidth' },
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
  {
    id: 'info-cards-4col',
    name: 'Info Cards',
    description: 'Four-column informational cards with icon, title, and version info',
    category: 'Cards',
    tree: {
      type: 'Grid',
      name: 'Info cards',
      props: { columns: 12, gap: 16, rowGap: 0, align: 'start', justify: 'space-between', spacing: 4, gridColumnSpan: 8 },
      children: [
        {
          type: 'Card',
          name: 'React',
          props: { size: 'medium', isBorderless: false, gridColumnSpan: 3 },
          children: [
            {
              type: 'CardHeader',
              props: { isBorderless: true },
              children: [
                {
                  type: 'Heading',
                  props: { level: 4, children: 'React' },
                  children: [],
                },
                {
                  type: 'Icon',
                  props: { icon: 'published', size: 24 },
                  children: [],
                },
              ],
            },
            {
              type: 'CardFooter',
              props: { isBorderless: true },
              children: [
                {
                  type: 'Text',
                  props: { children: '<b><strong class="editor-text-bold" style="white-space: pre-wrap;">React&nbsp;&nbsp;</strong></b><br><span style="white-space: pre-wrap;">v19.1</span>' },
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'Card',
          name: 'Tailwind',
          props: { size: 'medium', isBorderless: false, gridColumnSpan: 3 },
          children: [
            {
              type: 'CardHeader',
              props: { isBorderless: true },
              children: [
                {
                  type: 'Heading',
                  props: { level: 4, children: 'Tailwind' },
                  children: [],
                },
                {
                  type: 'Icon',
                  props: { icon: 'published', size: 24 },
                  children: [],
                },
              ],
            },
            {
              type: 'CardFooter',
              props: { isBorderless: true },
              children: [
                {
                  type: 'Text',
                  props: { children: '<b><strong class="editor-text-bold" style="white-space: pre-wrap;">Tailwind</strong></b><br><span style="white-space: pre-wrap;">v4.2</span>' },
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'Card',
          name: 'Typescript',
          props: { size: 'medium', isBorderless: false, gridColumnSpan: 3 },
          children: [
            {
              type: 'CardHeader',
              props: { isBorderless: true },
              children: [
                {
                  type: 'Heading',
                  props: { level: 4, children: 'Typescript' },
                  children: [],
                },
                {
                  type: 'Icon',
                  props: { icon: 'published', size: 24 },
                  children: [],
                },
              ],
            },
            {
              type: 'CardFooter',
              props: { isBorderless: true },
              children: [
                {
                  type: 'Text',
                  props: { children: '<b><strong class="editor-text-bold" style="white-space: pre-wrap;">Typescript</strong></b><br><span style="white-space: pre-wrap;">v5.8</span>' },
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'Card',
          name: 'NextJS',
          props: { size: 'medium', isBorderless: false, gridColumnSpan: 3 },
          children: [
            {
              type: 'CardHeader',
              props: { isBorderless: true },
              children: [
                {
                  type: 'Heading',
                  props: { level: 4, children: 'NextJS' },
                  children: [],
                },
                {
                  type: 'Icon',
                  props: { icon: 'published', size: 24 },
                  children: [],
                },
              ],
            },
            {
              type: 'CardFooter',
              props: { isBorderless: true },
              children: [
                {
                  type: 'Text',
                  props: { children: '<b><strong class="editor-text-bold" style="white-space: pre-wrap;">Next</strong></b><br><span style="white-space: pre-wrap;">v7.8</span>' },
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
