import { Pattern } from './types';

export const activityPatterns: Pattern[] = [
  {
    id: 'activity-feed',
    name: 'Activity Feed',
    description: 'Recent activity log with timestamped events in a card',
    category: 'Activity',
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
              props: { level: 3, children: 'Recent Activity' },
              children: [],
            },
          ],
        },
        {
          type: 'CardBody',
          props: {},
          children: [
            {
              type: 'DataViews',
              props: {
                dataSource: 'custom',
                data: [
                  { id: 1, event: 'Deployment successful', user: 'Sarah Johnson', timestamp: '2 minutes ago', status: 'Success' },
                  { id: 2, event: 'Database backup completed', user: 'System', timestamp: '23 minutes ago', status: 'Success' },
                  { id: 3, event: 'SSL certificate renewed', user: 'Michael Chen', timestamp: '1 hour ago', status: 'Success' },
                  { id: 4, event: 'Failed login attempt', user: 'Unknown', timestamp: '2 hours ago', status: 'Warning' },
                  { id: 5, event: 'New user registered', user: 'Emily Davis', timestamp: '3 hours ago', status: 'Info' },
                ],
                columns: [
                  { id: 'event', label: 'Event' },
                  { id: 'user', label: 'User' },
                  { id: 'timestamp', label: 'Time' },
                  { id: 'status', label: 'Status' },
                ],
                viewType: 'table',
                itemsPerPage: 10,
              },
              children: [],
            },
          ],
        },
      ],
    },
  },
];
