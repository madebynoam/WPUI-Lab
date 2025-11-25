import { Pattern } from './types';

/**
 * Navigation Patterns
 *
 * Pre-built navigation components for app structure.
 */

export const navigationPatterns: Pattern[] = [
  // Sidebar Collapsed
  {
    id: 'sidebar-collapsed',
    name: 'Sidebar (Collapsed)',
    description: 'Minimized sidebar navigation with icons',
    category: 'Navigation',
    tree: {
      type: 'VStack',
      props: { spacing: 2, w: '60px', bg: 'gray.100', p: 2, h: '100vh' },
      children: [
        {
          type: 'Button',
          props: { variant: 'ghost', children: '☰' },
          children: [],
        },
        {
          type: 'Button',
          props: { variant: 'ghost', children: '🏠' },
          children: [],
        },
        {
          type: 'Button',
          props: { variant: 'ghost', children: '📊' },
          children: [],
        },
        {
          type: 'Button',
          props: { variant: 'ghost', children: '⚙️' },
          children: [],
        },
      ],
    },
  },

  // Sidebar Expanded
  {
    id: 'sidebar-expanded',
    name: 'Sidebar (Expanded)',
    description: 'Full sidebar navigation with labels',
    category: 'Navigation',
    tree: {
      type: 'VStack',
      props: { spacing: 3, w: '250px', bg: 'gray.100', p: 4, h: '100vh', align: 'stretch' },
      children: [
        {
          type: 'Heading',
          props: { level: 3, children: 'My App' },
          children: [],
        },
        {
          type: 'Divider',
          props: {},
          children: [],
        },
        {
          type: 'Button',
          props: { variant: 'ghost', justifyContent: 'flex-start', children: '🏠 Dashboard' },
          children: [],
        },
        {
          type: 'Button',
          props: { variant: 'ghost', justifyContent: 'flex-start', children: '📊 Analytics' },
          children: [],
        },
        {
          type: 'Button',
          props: { variant: 'ghost', justifyContent: 'flex-start', children: '👥 Users' },
          children: [],
        },
        {
          type: 'Button',
          props: { variant: 'ghost', justifyContent: 'flex-start', children: '⚙️ Settings' },
          children: [],
        },
      ],
    },
  },

  // Top Navigation Bar
  {
    id: 'topbar-nav',
    name: 'Top Navigation Bar',
    description: 'Horizontal navigation bar with logo and menu',
    category: 'Navigation',
    tree: {
      type: 'HStack',
      props: { spacing: 4, justifyContent: 'space-between', bg: 'white', p: 4, borderBottom: '1px solid', borderColor: 'gray.200' },
      children: [
        {
          type: 'Heading',
          props: { level: 2, children: 'MyApp' },
          children: [],
        },
        {
          type: 'HStack',
          props: { spacing: 4 },
          children: [
            {
              type: 'Button',
              props: { variant: 'ghost', children: 'Home' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'ghost', children: 'Products' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'ghost', children: 'About' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'ghost', children: 'Contact' },
              children: [],
            },
          ],
        },
        {
          type: 'HStack',
          props: { spacing: 2 },
          children: [
            {
              type: 'Button',
              props: { variant: 'secondary', children: 'Login' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'primary', children: 'Sign Up' },
              children: [],
            },
          ],
        },
      ],
    },
  },

  // Breadcrumbs
  {
    id: 'breadcrumbs-nav',
    name: 'Breadcrumbs',
    description: 'Hierarchical breadcrumb navigation',
    category: 'Navigation',
    tree: {
      type: 'HStack',
      props: { spacing: 2, fontSize: 'sm' },
      children: [
        {
          type: 'Text',
          props: { color: 'blue.600', cursor: 'pointer', children: 'Home' },
          children: [],
        },
        {
          type: 'Text',
          props: { children: '/' },
          children: [],
        },
        {
          type: 'Text',
          props: { color: 'blue.600', cursor: 'pointer', children: 'Products' },
          children: [],
        },
        {
          type: 'Text',
          props: { children: '/' },
          children: [],
        },
        {
          type: 'Text',
          props: { color: 'blue.600', cursor: 'pointer', children: 'Electronics' },
          children: [],
        },
        {
          type: 'Text',
          props: { children: '/' },
          children: [],
        },
        {
          type: 'Text',
          props: { fontWeight: 'bold', children: 'Laptop' },
          children: [],
        },
      ],
    },
  },

  // Horizontal Tabs
  {
    id: 'horizontal-tabs',
    name: 'Horizontal Tabs',
    description: 'Tab navigation for content sections',
    category: 'Navigation',
    tree: {
      type: 'VStack',
      props: { spacing: 4, align: 'stretch' },
      children: [
        {
          type: 'HStack',
          props: { spacing: 0, borderBottom: '2px solid', borderColor: 'gray.200' },
          children: [
            {
              type: 'Button',
              props: { variant: 'ghost', borderBottom: '2px solid', borderColor: 'blue.500', borderRadius: 0, children: 'Overview' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'ghost', borderRadius: 0, children: 'Details' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'ghost', borderRadius: 0, children: 'Analytics' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'ghost', borderRadius: 0, children: 'Settings' },
              children: [],
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
                  props: { children: 'Tab content goes here' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Vertical Tabs
  {
    id: 'vertical-tabs',
    name: 'Vertical Tabs',
    description: 'Side tab navigation',
    category: 'Navigation',
    tree: {
      type: 'Grid',
      props: { columns: 2, gap: 4 },
      children: [
        {
          type: 'VStack',
          props: { spacing: 2, align: 'stretch', borderRight: '2px solid', borderColor: 'gray.200', pr: 4 },
          children: [
            {
              type: 'Button',
              props: { variant: 'solid', justifyContent: 'flex-start', children: 'General' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'ghost', justifyContent: 'flex-start', children: 'Security' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'ghost', justifyContent: 'flex-start', children: 'Notifications' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'ghost', justifyContent: 'flex-start', children: 'Billing' },
              children: [],
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
                  props: { children: 'Tab panel content goes here' },
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
