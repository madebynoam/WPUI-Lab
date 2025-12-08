import { Pattern } from './types';

/**
 * Action Card Patterns
 *
 * Pre-built interactive action card templates for navigation and CTAs.
 */

export const actionPatterns: Pattern[] = [
  {
    id: 'action-cards-3col',
    name: 'Action Cards - 3 Column',
    description: 'Three interactive action cards with icons, titles, descriptions, and chevrons',
    category: 'Actions',
    tree: {
      type: 'Grid',
      name: 'Action cards',
      props: { columns: 3, gap: 4 },
      children: [
        {
          type: 'Card',
          name: 'Deployments',
          props: { size: 'medium' },
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
          props: { size: 'medium' },
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
          props: { size: 'medium' },
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
    id: 'action-card-single',
    name: 'Action Card',
    description: 'Interactive card with icon, title, description, and chevron indicator',
    category: 'Actions',
    tree: {
      type: 'Card',
      props: { size: 'medium' },
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
                  props: { icon: 'chevronRight', size: 24 },
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

