import { Pattern } from './types';

export const featurePatterns: Pattern[] = [
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
];
