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
  // Pricing Table
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
                              type: 'Heading',
                              props: { level: 3, children: '$12' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'Per month, paid yearly', variant: 'muted' },
                              children: [],
                            },
                          ],
                        },
                        {
                          type: 'Badge',
                          props: { children: '20% off', intent: 'success' },
                          children: [],
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

  // Testimonials
  {
    id: 'testimonials',
    name: 'Testimonials',
    description: 'Customer testimonials with quotes and attribution',
    category: 'Testimonials',
    tree: {
      type: 'Grid',
      props: { columns: 12, gap: 4 },
      children: [
        {
          type: 'Card',
          props: { gridColumnSpan: 6 },
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
                      props: { children: '"This product has transformed how we work. The interface is intuitive and the results are outstanding. It has streamlined collaboration across teams and shortened onboarding for new hires."' },
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
                              props: { children: 'CEO, TechCorp — North America' },
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
        {
          type: 'Card',
          props: { gridColumnSpan: 6 },
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
                      props: { children: '"This product has changed how we approach work. The interface remains intuitive, and the outcomes have been impressive. It also accelerated cross-team collaboration and simplified training for new staff."' },
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
                              props: { children: 'Alex Kim' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'Founder & CEO, TechCorp' },
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

  // Data Tables (DataViews)
  {
    id: 'product-table',
    name: 'Product Table',
    description: 'Product catalog table with name, price, and stock status',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, name: 'Rose Bundle', price: '$39.99', stock: 'In Stock', category: 'Flowers' },
          { id: 2, name: 'Tulip Set', price: '$29.99', stock: 'Low Stock', category: 'Flowers' },
          { id: 3, name: 'Orchid Collection', price: '$49.99', stock: 'In Stock', category: 'Flowers' },
          { id: 4, name: 'Sunflower Bunch', price: '$24.99', stock: 'In Stock', category: 'Flowers' },
          { id: 5, name: 'Lily Arrangement', price: '$34.99', stock: 'Out of Stock', category: 'Flowers' },
        ],
        columns: [
          { id: 'name', label: 'Product Name' },
          { id: 'price', label: 'Price' },
          { id: 'stock', label: 'Availability' },
          { id: 'category', label: 'Category' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  {
    id: 'user-table',
    name: 'User Directory Table',
    description: 'User directory with name, email, and role',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Admin', status: 'Active' },
          { id: 2, name: 'Michael Chen', email: 'michael@example.com', role: 'Editor', status: 'Active' },
          { id: 3, name: 'Emily Davis', email: 'emily@example.com', role: 'Contributor', status: 'Active' },
          { id: 4, name: 'James Wilson', email: 'james@example.com', role: 'Subscriber', status: 'Inactive' },
          { id: 5, name: 'Lisa Anderson', email: 'lisa@example.com', role: 'Editor', status: 'Active' },
        ],
        columns: [
          { id: 'name', label: 'Name' },
          { id: 'email', label: 'Email' },
          { id: 'role', label: 'Role' },
          { id: 'status', label: 'Status' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  {
    id: 'invoice-table',
    name: 'Invoice Table',
    description: 'Invoice list with date, amount, and status',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, invoice: 'INV-001', date: '2025-01-15', amount: '$1,250.00', status: 'Paid', customer: 'Acme Corp' },
          { id: 2, invoice: 'INV-002', date: '2025-01-18', amount: '$890.50', status: 'Pending', customer: 'Tech Solutions' },
          { id: 3, invoice: 'INV-003', date: '2025-01-20', amount: '$2,100.00', status: 'Paid', customer: 'Global Industries' },
          { id: 4, invoice: 'INV-004', date: '2025-01-22', amount: '$675.25', status: 'Overdue', customer: 'SmallBiz LLC' },
          { id: 5, invoice: 'INV-005', date: '2025-01-24', amount: '$1,450.00', status: 'Paid', customer: 'Enterprise Inc' },
        ],
        columns: [
          { id: 'invoice', label: 'Invoice #' },
          { id: 'customer', label: 'Customer' },
          { id: 'date', label: 'Date' },
          { id: 'amount', label: 'Amount' },
          { id: 'status', label: 'Status' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  {
    id: 'flower-catalog',
    name: 'Flower Catalog',
    description: 'Comprehensive flower catalog with varieties and details',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, name: 'Red Roses', variety: 'Rosa', price: '$45.00', season: 'Year-round', availability: 'In Stock' },
          { id: 2, name: 'White Tulips', variety: 'Tulipa', price: '$32.00', season: 'Spring', availability: 'In Stock' },
          { id: 3, name: 'Purple Orchids', variety: 'Orchidaceae', price: '$58.00', season: 'Year-round', availability: 'Limited' },
          { id: 4, name: 'Yellow Sunflowers', variety: 'Helianthus', price: '$28.00', season: 'Summer', availability: 'In Stock' },
          { id: 5, name: 'Pink Peonies', variety: 'Paeonia', price: '$52.00', season: 'Spring', availability: 'Pre-order' },
          { id: 6, name: 'White Lilies', variety: 'Lilium', price: '$38.00', season: 'Year-round', availability: 'In Stock' },
        ],
        columns: [
          { id: 'name', label: 'Flower Name' },
          { id: 'variety', label: 'Variety' },
          { id: 'price', label: 'Price' },
          { id: 'season', label: 'Season' },
          { id: 'availability', label: 'Availability' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Dashboards
  /* Temporarily hidden - needs redesign
  {
    id: 'dashboard-overview',
    name: 'Dashboard Overview',
    description: 'Overview dashboard with stats cards and recent activity',
    category: 'Dashboards',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'Heading',
          props: { level: 1, children: 'Dashboard' },
          children: [],
        },
        {
          type: 'Grid',
          props: { columns: 4, gap: 4 },
          children: [
            {
              type: 'Card',
              props: {},
              children: [
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
                          props: { children: 'Total Users', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '2,543' },
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
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 2 },
                      children: [
                        {
                          type: 'Text',
                          props: { children: 'Revenue', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '$45,231' },
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
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 2 },
                      children: [
                        {
                          type: 'Text',
                          props: { children: 'Active Now', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '124' },
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
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 2 },
                      children: [
                        {
                          type: 'Text',
                          props: { children: 'Growth', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '+12.5%' },
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
  */

  {
    id: 'dashboard-analytics',
    name: 'Analytics Dashboard',
    description: 'Analytics dashboard with KPI cards and chart placeholders',
    category: 'Dashboards',
    tree: {
      type: 'VStack',
      props: { spacing: 4 },
      children: [
        {
          type: 'Heading',
          props: { level: 4, children: 'Analytics' },
          children: [],
        },
        {
          type: 'Grid',
          props: { columns: 12, gap: 4 },
          children: [
            {
              type: 'Card',
              props: { size: 'none', gridColumnSpan: 3 },
              children: [
                {
                  type: 'CardHeader',
                  props: { size: 'xSmall', isBorderless: true },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 5, children: 'Total visitors' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: { size: 'xSmall' },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 2, justify: 'flex-start' },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: '4,231' },
                          children: [],
                        },
                        {
                          type: 'Badge',
                          props: { children: '+12.5%', intent: 'success' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'Text',
                      props: { children: 'Since last month', variant: 'muted' },
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              type: 'Card',
              props: { size: 'none', gridColumnSpan: 3 },
              children: [
                {
                  type: 'CardHeader',
                  props: { size: 'xSmall', isBorderless: true },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 5, children: 'New users' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: { size: 'xSmall' },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 2, justify: 'flex-start' },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: '689' },
                          children: [],
                        },
                        {
                          type: 'Badge',
                          props: { children: '+8.2%', intent: 'success' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'Text',
                      props: { children: 'Since last month', variant: 'muted' },
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              type: 'Card',
              props: { size: 'none', gridColumnSpan: 3 },
              children: [
                {
                  type: 'CardHeader',
                  props: { size: 'xSmall', isBorderless: true },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 5, children: 'Bounce rate' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: { size: 'xSmall' },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 2, justify: 'flex-start' },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: '27.3%' },
                          children: [],
                        },
                        {
                          type: 'Badge',
                          props: { children: '-3.1%', intent: 'success' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'Text',
                      props: { children: 'Since last month', variant: 'muted' },
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              type: 'Card',
              props: { size: 'none', gridColumnSpan: 3 },
              children: [
                {
                  type: 'CardHeader',
                  props: { size: 'xSmall', isBorderless: true },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 5, children: 'Avg. Session' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: { size: 'xSmall' },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 2, justify: 'flex-start' },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: '2m 56s' },
                          children: [],
                        },
                        {
                          type: 'Badge',
                          props: { children: '-5.0%', intent: 'error' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'Text',
                      props: { children: 'Since last month', variant: 'muted' },
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

  // Action Cards
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
                  props: { spacing: 2, justify: 'flex-start', alignment: 'center' },
                  children: [
                    {
                      type: 'HStack',
                      name: 'Content',
                      props: { spacing: 4, alignment: 'top', expanded: false },
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
                  props: { spacing: 2, justify: 'flex-start', alignment: 'center' },
                  children: [
                    {
                      type: 'HStack',
                      name: 'Content',
                      props: { spacing: 4, alignment: 'top', expanded: false },
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
                  props: { spacing: 2, justify: 'flex-start', alignment: 'center' },
                  children: [
                    {
                      type: 'HStack',
                      name: 'Content',
                      props: { spacing: 4, alignment: 'top', expanded: false },
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

  // Single Action Card
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
              props: { spacing: 2, justify: 'flex-start', alignment: 'center' },
              children: [
                {
                  type: 'HStack',
                  props: { spacing: 4, alignment: 'top', expanded: false },
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

// Pattern categories for organization
export const patternCategories = [
  'Heroes',
  'Features',
  'Pricing',
  'Forms',
  'Testimonials',
  'CTAs',
  'Stats',
  'Tables',
  'Dashboards',
  'Actions',
];
