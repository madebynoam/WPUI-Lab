import { Pattern } from './types';

export const dashboardPatterns: Pattern[] = [
  {
    id: 'dashboard-overview-cards',
    name: 'Dashboard Overview Cards',
    description: 'Overview cards with metrics and status indicators',
    category: 'Dashboard',
    tree: {
      type: 'Grid',
      props: { columns: 12, gap: 4 },
      children: [
        {
          type: 'VStack',
          props: { spacing: 4, alignment: 'stretch', justify: 'flex-start', expanded: false, gridColumnSpan: 3 },
          children: [
            {
              type: 'Card',
              props: { size: 'medium' },
              children: [
                {
                  type: 'CardHeader',
                  props: { isBorderless: false },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 2, justify: 'flex-start' },
                      children: [
                        {
                          type: 'Icon',
                          props: { icon: 'published', size: 24 },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 5, children: 'Visibility' },
                          children: [],
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
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 2, alignment: 'stretch', justify: 'flex-start' },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: 'Public' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { variant: 'muted', children: 'Anyone can view your site' },
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
              props: { size: 'medium' },
              children: [
                {
                  type: 'CardHeader',
                  props: { isBorderless: false },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 2, justify: 'flex-start' },
                      children: [
                        {
                          type: 'Icon',
                          props: { icon: 'backup', size: 24 },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 5, children: 'Last backup' },
                          children: [],
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
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 2, alignment: 'stretch', justify: 'flex-start' },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: '23 mins ago' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { variant: 'muted', children: 'Today at 7:00 AM' },
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
          type: 'VStack',
          props: { spacing: 4, alignment: 'stretch', justify: 'flex-start', expanded: false, gridColumnSpan: 3 },
          children: [
            {
              type: 'Card',
              props: { size: 'medium' },
              children: [
                {
                  type: 'CardHeader',
                  props: { isBorderless: false },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 2, justify: 'flex-start' },
                      children: [
                        {
                          type: 'Icon',
                          props: { icon: 'trendingUp', size: 24 },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 5, children: 'Performance' },
                          children: [],
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
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 2, alignment: 'stretch', justify: 'flex-start' },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: 'Needs improvement' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { variant: 'muted', children: '4 recommendations available' },
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
              props: { size: 'medium' },
              children: [
                {
                  type: 'CardHeader',
                  props: { isBorderless: false },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 2, justify: 'flex-start' },
                      children: [
                        {
                          type: 'Icon',
                          props: { icon: 'lock', size: 24 },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 5, children: 'Security scan' },
                          children: [],
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
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 2, alignment: 'stretch', justify: 'flex-start' },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: 'No threats found' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { variant: 'muted', children: 'Scanned 1 hr ago' },
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
          type: 'Card',
          props: { size: 'medium', gridColumnSpan: 6 },
          children: [
            {
              type: 'CardHeader',
              props: { isBorderless: false },
              children: [
                {
                  type: 'HStack',
                  props: { spacing: 2, justify: 'flex-start' },
                  children: [
                    {
                      type: 'Icon',
                      props: { icon: 'starFilled', size: 24 },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 5, children: 'Plan' },
                      children: [],
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
            {
              type: 'CardBody',
              props: {},
              children: [
                {
                  type: 'VStack',
                  props: { spacing: 2, alignment: 'stretch', justify: 'flex-start' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Business' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { variant: 'muted', children: 'Renews on 23 December, 2026' },
                      children: [],
                    },
                    {
                      type: 'Spacer',
                      props: { margin: 0 },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { variant: 'muted', children: 'STORAGE' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 4, children: '5.6GB' },
                      children: [],
                    },
                    {
                      type: 'Spacer',
                      props: { margin: 0 },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { variant: 'muted', children: 'BANDWIDTH' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 4, children: '5.6GB' },
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
