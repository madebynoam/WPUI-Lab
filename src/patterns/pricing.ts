import { Pattern } from './types';

/**
 * Pricing Patterns
 *
 * Pre-built pricing table templates for subscription and product pricing.
 */

export const pricingPatterns: Pattern[] = [
  {
    id: 'pricing-3col',
    name: 'Pricing Table - 4 Plans',
    description: 'Four-column pricing table with features and badges',
    category: 'Pricing',
    tree: {
      type: 'Grid',
      props: { columns: 12, gap: 6 },
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
                      props: { level: 2, children: 'Free' },
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
                      props: { level: 2, children: 'Premium' },
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
                      props: { level: 2, children: 'Business' },
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
                      props: { level: 2, children: 'Commerce' },
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
];

