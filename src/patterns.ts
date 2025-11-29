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
          props: { level: 1, children: 'Welcome to Your Site' },
          children: [],
        },
        {
          type: 'Text',
          props: { children: 'Create beautiful pages with ease using our intuitive design system.' },
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
              props: { level: 1, children: 'Build Something Amazing' },
              children: [],
            },
            {
              type: 'Text',
              props: { children: 'Transform your ideas into reality with our powerful design tools and components.' },
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
                  props: { children: 'Image placeholder - Add your hero image here' },
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
                      props: { level: 3, children: 'Starter' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 2, children: '$9/mo' },
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
                      props: { level: 3, children: 'Pro' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 2, children: '$29/mo' },
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
                      props: { children: '✓ Unlimited Projects' },
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
                      props: { level: 3, children: 'Enterprise' },
                      children: [],
                    },
                    {
                      type: 'Heading',
                      props: { level: 2, children: '$99/mo' },
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
                      props: { children: '✓ Unlimited Everything' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 24/7 Support' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '✓ 100GB Storage' },
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
                  props: { children: '"This product has transformed how we work. The interface is intuitive and the results are outstanding."' },
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
                          props: { children: 'CEO, TechCorp' },
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
                  props: { level: 4, children: 'Advanced Analytics' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { children: 'Track and measure your performance with detailed insights.' },
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
                  props: { level: 4, children: 'Team Collaboration' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { children: 'Work together seamlessly with your team members.' },
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
                  props: { level: 4, children: 'Secure & Reliable' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { children: 'Enterprise-grade security and 99.9% uptime guarantee.' },
                  children: [],
                },
              ],
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

  {
    id: 'dashboard-analytics',
    name: 'Analytics Dashboard',
    description: 'Analytics dashboard with KPI cards and chart placeholders',
    category: 'Dashboards',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'Heading',
          props: { level: 4, children: 'Analytics' },
          children: [],
        },
        {
          type: 'Grid',
          props: { columns: 3, gap: 4 },
          children: [
            {
              type: 'Card',
              props: {},
              children: [
                {
                  type: 'CardHeader',
                  props: { size: 'small' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 4, children: 'Page views' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: { size: 'small' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 2, children: '45,231' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '+20.1% from last month', variant: 'muted' },
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
                  props: { size: 'small' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 4, children: 'Avg Session' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: { size: 'small' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 2, children: '3m 24s' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '+12% from last month', variant: 'muted' },
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
                  props: { size: 'small' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 4, children: 'Bounce Rate' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: { size: 'small' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 2, children: '42%' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '-5.4% from last month', variant: 'muted' },
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
