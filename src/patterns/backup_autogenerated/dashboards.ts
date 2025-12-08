import { Pattern } from './types';

export const dashboardPatterns: Pattern[] = [
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
          props: { level: 1, children: 'Analytics' },
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
                  props: {},
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Page Views' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 1, children: '45,231' },
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
                  props: {},
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Bounce Rate' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 1, children: '42%' },
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
                      props: { level: 3, children: 'Avg Session' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 1, children: '3m 24s' },
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
          ],
        },
      ],
    },
  },

  {
    id: 'dashboard-sales',
    name: 'Sales Dashboard',
    description: 'Sales dashboard with revenue metrics and top products',
    category: 'Dashboards',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'Heading',
          props: { level: 1, children: 'Sales Dashboard' },
          children: [],
        },
        {
          type: 'Grid',
          props: { columns: 2, gap: 6 },
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
                      props: { level: 3, children: 'Monthly Revenue' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 1, children: '$124,563' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '+18.2% from last month', variant: 'muted' },
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
                      props: { level: 3, children: 'Orders' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 1, children: '1,247' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: '34 pending, 1,213 completed', variant: 'muted' },
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
    id: 'dashboard-users',
    name: 'Users Dashboard',
    description: 'User metrics dashboard with growth and activity stats',
    category: 'Dashboards',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'Heading',
          props: { level: 1, children: 'Users' },
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
                          props: { level: 2, children: '12,543' },
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
                          props: { children: 'Active Today', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '1,892' },
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
                          props: { children: 'New This Month', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '+423' },
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
    id: 'dashboard-admin',
    name: 'Admin Dashboard',
    description: 'System admin dashboard with health and activity metrics',
    category: 'Dashboards',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'Heading',
          props: { level: 1, children: 'System Admin' },
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
                          props: { children: 'Server Status', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: '✓ Online' },
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
                          props: { children: 'API Requests', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 3, children: '45.2K' },
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
                          props: { children: 'Errors (24h)', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 3, children: '12' },
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
                          props: { children: 'Uptime', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 3, children: '99.9%' },
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
    id: 'dashboard-ecommerce',
    name: 'E-commerce Dashboard',
    description: 'E-commerce dashboard with sales, inventory, and orders',
    category: 'Dashboards',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'Heading',
          props: { level: 1, children: 'Store Dashboard' },
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
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 2 },
                      children: [
                        {
                          type: 'Text',
                          props: { children: 'Total Sales', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '$89,432' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: '+24% vs last week', variant: 'muted' },
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
                          props: { children: 'Orders', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '456' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: '34 pending shipment', variant: 'muted' },
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
                          props: { children: 'Products', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '1,245' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: '23 low stock', variant: 'muted' },
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
    id: 'dashboard-saas',
    name: 'SaaS Dashboard',
    description: 'SaaS metrics dashboard with MRR, churn, and user growth',
    category: 'Dashboards',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'Heading',
          props: { level: 1, children: 'SaaS Metrics' },
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
                          props: { children: 'MRR', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '$142K' },
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
                          props: { children: 'Active Subscribers', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '1,834' },
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
                          props: { children: 'Churn Rate', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '3.2%' },
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
                          props: { children: 'Trial Conversions', variant: 'muted' },
                          children: [],
                        },
                        {
                          type: 'Heading',
                          props: { level: 2, children: '24%' },
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
    id: 'dashboard-minimal',
    name: 'Minimal Dashboard',
    description: 'Simple dashboard with key metrics in clean grid',
    category: 'Dashboards',
    tree: {
      type: 'Grid',
      props: { columns: 3, gap: 6 },
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
                  props: { spacing: 3, alignment: 'center' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 1, children: '2.5K' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: 'Users', variant: 'muted' },
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
                  props: { spacing: 3, alignment: 'center' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 1, children: '$45K' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: 'Revenue', variant: 'muted' },
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
                  props: { spacing: 3, alignment: 'center' },
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 1, children: '124' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: 'Online', variant: 'muted' },
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
