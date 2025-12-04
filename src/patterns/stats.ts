import { Pattern } from './types';

/**
 * Stats Patterns
 *
 * Pre-built statistics display templates for metrics and KPIs.
 */

export const statsPatterns: Pattern[] = [
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
];

