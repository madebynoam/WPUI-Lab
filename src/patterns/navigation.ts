import { Pattern } from './types';

export const navigationPatterns: Pattern[] = [
  {
    id: 'breadcrumbs-nav',
    name: 'Breadcrumbs',
    description: 'Hierarchical breadcrumb navigation',
    category: 'Navigation',
    tree: {
      type: 'HStack',
      props: { spacing: 2 },
      children: [
        {
          type: 'Button',
          props: { variant: 'link', text: 'Home' },
          children: [],
        },
        {
          type: 'Text',
          props: { children: '/' },
          children: [],
        },
        {
          type: 'Button',
          props: { variant: 'link', text: 'Products' },
          children: [],
        },
        {
          type: 'Text',
          props: { children: '/' },
          children: [],
        },
        {
          type: 'Button',
          props: { variant: 'link', text: 'Electronics' },
          children: [],
        },
        {
          type: 'Text',
          props: { children: '/' },
          children: [],
        },
        {
          type: 'Text',
          props: { children: 'Laptop' },
          children: [],
        },
      ],
    },
  },
];
