import { Pattern } from './types';

/**
 * CRUD Interface Patterns
 *
 * Pre-built CRUD (Create, Read, Update, Delete) interface templates
 * for managing data in different view modes.
 */

export const crudPatterns: Pattern[] = [
  // List View
  {
    id: 'crud-list-view',
    name: 'CRUD List View',
    description: 'Table-based list view with action buttons',
    category: 'CRUD',
    tree: {
      type: 'VStack',
      props: { spacing: 4 },
      children: [
        {
          type: 'HStack',
          props: { spacing: 4, justifyContent: 'space-between' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: 'Items' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'primary', children: 'Add New' },
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
                  type: 'DataViews',
                  props: {
                    dataSource: 'custom',
                    data: [
                      { id: 1, name: 'Item 1', status: 'Active', date: '2025-01-20', actions: 'Edit | Delete' },
                      { id: 2, name: 'Item 2', status: 'Draft', date: '2025-01-21', actions: 'Edit | Delete' },
                      { id: 3, name: 'Item 3', status: 'Active', date: '2025-01-22', actions: 'Edit | Delete' },
                    ],
                    columns: [
                      { id: 'name', label: 'Name' },
                      { id: 'status', label: 'Status' },
                      { id: 'date', label: 'Date' },
                      { id: 'actions', label: 'Actions' },
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
      ],
    },
  },

  // Detail View
  {
    id: 'crud-detail-view',
    name: 'CRUD Detail View',
    description: 'Single record detail display with edit/delete actions',
    category: 'CRUD',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'HStack',
          props: { spacing: 4, justifyContent: 'space-between' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: 'Item Details' },
              children: [],
            },
            {
              type: 'HStack',
              props: { spacing: 2 },
              children: [
                {
                  type: 'Button',
                  props: { variant: 'primary', children: 'Edit' },
                  children: [],
                },
                {
                  type: 'Button',
                  props: { variant: 'secondary', children: 'Delete' },
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
                  type: 'VStack',
                  props: { spacing: 4 },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 2 },
                      children: [
                        {
                          type: 'Text',
                          props: { fontWeight: 'bold', children: 'Name:' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'Sample Item' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 2 },
                      children: [
                        {
                          type: 'Text',
                          props: { fontWeight: 'bold', children: 'Status:' },
                          children: [],
                        },
                        {
                          type: 'Badge',
                          props: { colorScheme: 'green', children: 'Active' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 2 },
                      children: [
                        {
                          type: 'Text',
                          props: { fontWeight: 'bold', children: 'Created:' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: '2025-01-20' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 2 },
                      children: [
                        {
                          type: 'Text',
                          props: { fontWeight: 'bold', children: 'Modified:' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: '2025-01-22' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'Divider',
                      props: {},
                      children: [],
                    },
                    {
                      type: 'VStack',
                      props: { spacing: 2, align: 'start' },
                      children: [
                        {
                          type: 'Text',
                          props: { fontWeight: 'bold', children: 'Description:' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'This is a detailed description of the item. It can contain multiple lines of text and provide comprehensive information about the record.' },
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

  // Split View
  {
    id: 'crud-split-view',
    name: 'CRUD Split View',
    description: 'List on left, detail on right for quick browsing',
    category: 'CRUD',
    tree: {
      type: 'VStack',
      props: { spacing: 4 },
      children: [
        {
          type: 'HStack',
          props: { spacing: 4, justifyContent: 'space-between' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: 'Items' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'primary', children: 'Add New' },
              children: [],
            },
          ],
        },
        {
          type: 'Grid',
          props: { columns: 2, gap: 4 },
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
                      props: { level: 3, children: 'All Items' },
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
                      props: { spacing: 2, align: 'stretch' },
                      children: [
                        {
                          type: 'Card',
                          props: { variant: 'outline' },
                          children: [
                            {
                              type: 'CardBody',
                              props: {},
                              children: [
                                {
                                  type: 'Text',
                                  props: { fontWeight: 'bold', children: 'Item 1' },
                                  children: [],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: 'Card',
                          props: { variant: 'outline' },
                          children: [
                            {
                              type: 'CardBody',
                              props: {},
                              children: [
                                {
                                  type: 'Text',
                                  props: { children: 'Item 2' },
                                  children: [],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: 'Card',
                          props: { variant: 'outline' },
                          children: [
                            {
                              type: 'CardBody',
                              props: {},
                              children: [
                                {
                                  type: 'Text',
                                  props: { children: 'Item 3' },
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
              props: {},
              children: [
                {
                  type: 'CardHeader',
                  props: {},
                  children: [
                    {
                      type: 'Heading',
                      props: { level: 3, children: 'Details' },
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
                      props: { spacing: 3 },
                      children: [
                        {
                          type: 'Text',
                          props: { fontWeight: 'bold', children: 'Item 1' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'Status: Active' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'Created: 2025-01-20' },
                          children: [],
                        },
                        {
                          type: 'Divider',
                          props: {},
                          children: [],
                        },
                        {
                          type: 'HStack',
                          props: { spacing: 2 },
                          children: [
                            {
                              type: 'Button',
                              props: { size: 'sm', children: 'Edit' },
                              children: [],
                            },
                            {
                              type: 'Button',
                              props: { size: 'sm', variant: 'secondary', children: 'Delete' },
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

  // Card View
  {
    id: 'crud-card-view',
    name: 'CRUD Card View',
    description: 'Grid of cards for visual browsing',
    category: 'CRUD',
    tree: {
      type: 'VStack',
      props: { spacing: 4 },
      children: [
        {
          type: 'HStack',
          props: { spacing: 4, justifyContent: 'space-between' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: 'Items' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'primary', children: 'Add New' },
              children: [],
            },
          ],
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
                      props: { spacing: 3 },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: 'Item 1' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'Description of item 1' },
                          children: [],
                        },
                        {
                          type: 'Badge',
                          props: { colorScheme: 'green', children: 'Active' },
                          children: [],
                        },
                        {
                          type: 'HStack',
                          props: { spacing: 2 },
                          children: [
                            {
                              type: 'Button',
                              props: { size: 'sm', children: 'View' },
                              children: [],
                            },
                            {
                              type: 'Button',
                              props: { size: 'sm', variant: 'secondary', children: 'Edit' },
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
              props: {},
              children: [
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 3 },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: 'Item 2' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'Description of item 2' },
                          children: [],
                        },
                        {
                          type: 'Badge',
                          props: { colorScheme: 'yellow', children: 'Draft' },
                          children: [],
                        },
                        {
                          type: 'HStack',
                          props: { spacing: 2 },
                          children: [
                            {
                              type: 'Button',
                              props: { size: 'sm', children: 'View' },
                              children: [],
                            },
                            {
                              type: 'Button',
                              props: { size: 'sm', variant: 'secondary', children: 'Edit' },
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
              props: {},
              children: [
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 3 },
                      children: [
                        {
                          type: 'Heading',
                          props: { level: 3, children: 'Item 3' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'Description of item 3' },
                          children: [],
                        },
                        {
                          type: 'Badge',
                          props: { colorScheme: 'green', children: 'Active' },
                          children: [],
                        },
                        {
                          type: 'HStack',
                          props: { spacing: 2 },
                          children: [
                            {
                              type: 'Button',
                              props: { size: 'sm', children: 'View' },
                              children: [],
                            },
                            {
                              type: 'Button',
                              props: { size: 'sm', variant: 'secondary', children: 'Edit' },
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

  // Timeline View
  {
    id: 'crud-timeline-view',
    name: 'CRUD Timeline View',
    description: 'Chronological timeline of items with timestamps',
    category: 'CRUD',
    tree: {
      type: 'VStack',
      props: { spacing: 4 },
      children: [
        {
          type: 'HStack',
          props: { spacing: 4, justifyContent: 'space-between' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: 'Timeline' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'primary', children: 'Add Event' },
              children: [],
            },
          ],
        },
        {
          type: 'VStack',
          props: { spacing: 4, align: 'stretch' },
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
                      type: 'HStack',
                      props: { spacing: 4 },
                      children: [
                        {
                          type: 'VStack',
                          props: { spacing: 1, align: 'start', minW: '120px' },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Jan 22, 2025' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', color: 'gray.600', children: '2:30 PM' },
                              children: [],
                            },
                          ],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 2, align: 'start', flex: 1 },
                          children: [
                            {
                              type: 'Heading',
                              props: { level: 4, children: 'Item Created' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'New item was added to the system' },
                              children: [],
                            },
                            {
                              type: 'Badge',
                              props: { colorScheme: 'blue', children: 'Created' },
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
              props: {},
              children: [
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 4 },
                      children: [
                        {
                          type: 'VStack',
                          props: { spacing: 1, align: 'start', minW: '120px' },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Jan 21, 2025' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', color: 'gray.600', children: '10:15 AM' },
                              children: [],
                            },
                          ],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 2, align: 'start', flex: 1 },
                          children: [
                            {
                              type: 'Heading',
                              props: { level: 4, children: 'Status Changed' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'Item status updated to Active' },
                              children: [],
                            },
                            {
                              type: 'Badge',
                              props: { colorScheme: 'green', children: 'Updated' },
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
              props: {},
              children: [
                {
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 4 },
                      children: [
                        {
                          type: 'VStack',
                          props: { spacing: 1, align: 'start', minW: '120px' },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Jan 20, 2025' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', color: 'gray.600', children: '9:00 AM' },
                              children: [],
                            },
                          ],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 2, align: 'start', flex: 1 },
                          children: [
                            {
                              type: 'Heading',
                              props: { level: 4, children: 'Record Deleted' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'Old item was removed from system' },
                              children: [],
                            },
                            {
                              type: 'Badge',
                              props: { colorScheme: 'red', children: 'Deleted' },
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

  // Kanban Board
  {
    id: 'crud-kanban-view',
    name: 'CRUD Kanban View',
    description: 'Kanban board with columns for different statuses',
    category: 'CRUD',
    tree: {
      type: 'VStack',
      props: { spacing: 4 },
      children: [
        {
          type: 'HStack',
          props: { spacing: 4, justifyContent: 'space-between' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: 'Kanban Board' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'primary', children: 'Add Task' },
              children: [],
            },
          ],
        },
        {
          type: 'Grid',
          props: { columns: 3, gap: 4 },
          children: [
            {
              type: 'VStack',
              props: { spacing: 3, align: 'stretch' },
              children: [
                {
                  type: 'Heading',
                  props: { level: 3, children: 'To Do' },
                  children: [],
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
                          props: { spacing: 2, align: 'start' },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Task 1' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', children: 'Description of task 1' },
                              children: [],
                            },
                            {
                              type: 'Badge',
                              props: { size: 'sm', colorScheme: 'blue', children: 'High Priority' },
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
                          props: { spacing: 2, align: 'start' },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Task 2' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', children: 'Description of task 2' },
                              children: [],
                            },
                            {
                              type: 'Badge',
                              props: { size: 'sm', colorScheme: 'gray', children: 'Low Priority' },
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
              props: { spacing: 3, align: 'stretch' },
              children: [
                {
                  type: 'Heading',
                  props: { level: 3, children: 'In Progress' },
                  children: [],
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
                          props: { spacing: 2, align: 'start' },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Task 3' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', children: 'Currently being worked on' },
                              children: [],
                            },
                            {
                              type: 'Badge',
                              props: { size: 'sm', colorScheme: 'yellow', children: 'Medium Priority' },
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
              props: { spacing: 3, align: 'stretch' },
              children: [
                {
                  type: 'Heading',
                  props: { level: 3, children: 'Done' },
                  children: [],
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
                          props: { spacing: 2, align: 'start' },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Task 4' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', children: 'Completed successfully' },
                              children: [],
                            },
                            {
                              type: 'Badge',
                              props: { size: 'sm', colorScheme: 'green', children: 'Completed' },
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

  // Calendar View
  {
    id: 'crud-calendar-view',
    name: 'CRUD Calendar View',
    description: 'Calendar layout for date-based items',
    category: 'CRUD',
    tree: {
      type: 'VStack',
      props: { spacing: 4 },
      children: [
        {
          type: 'HStack',
          props: { spacing: 4, justifyContent: 'space-between' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: 'Calendar' },
              children: [],
            },
            {
              type: 'HStack',
              props: { spacing: 2 },
              children: [
                {
                  type: 'Button',
                  props: { variant: 'secondary', children: '< Previous' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { fontWeight: 'bold', children: 'January 2025' },
                  children: [],
                },
                {
                  type: 'Button',
                  props: { variant: 'secondary', children: 'Next >' },
                  children: [],
                },
              ],
            },
            {
              type: 'Button',
              props: { variant: 'primary', children: 'Add Event' },
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
                  type: 'Grid',
                  props: { columns: 7, gap: 2 },
                  children: [
                    { type: 'Text', props: { fontWeight: 'bold', textAlign: 'center', children: 'Sun' }, children: [] },
                    { type: 'Text', props: { fontWeight: 'bold', textAlign: 'center', children: 'Mon' }, children: [] },
                    { type: 'Text', props: { fontWeight: 'bold', textAlign: 'center', children: 'Tue' }, children: [] },
                    { type: 'Text', props: { fontWeight: 'bold', textAlign: 'center', children: 'Wed' }, children: [] },
                    { type: 'Text', props: { fontWeight: 'bold', textAlign: 'center', children: 'Thu' }, children: [] },
                    { type: 'Text', props: { fontWeight: 'bold', textAlign: 'center', children: 'Fri' }, children: [] },
                    { type: 'Text', props: { fontWeight: 'bold', textAlign: 'center', children: 'Sat' }, children: [] },
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
                  type: 'Heading',
                  props: { level: 3, children: 'Upcoming Events' },
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
                  props: { spacing: 3, align: 'stretch' },
                  children: [
                    {
                      type: 'HStack',
                      props: { spacing: 3 },
                      children: [
                        {
                          type: 'Badge',
                          props: { colorScheme: 'blue', children: 'Jan 25' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'Team Meeting' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 3 },
                      children: [
                        {
                          type: 'Badge',
                          props: { colorScheme: 'green', children: 'Jan 27' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'Project Deadline' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 3 },
                      children: [
                        {
                          type: 'Badge',
                          props: { colorScheme: 'purple', children: 'Jan 30' },
                          children: [],
                        },
                        {
                          type: 'Text',
                          props: { children: 'Client Review' },
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

  // Gallery View
  {
    id: 'crud-gallery-view',
    name: 'CRUD Gallery View',
    description: 'Image gallery grid with item details',
    category: 'CRUD',
    tree: {
      type: 'VStack',
      props: { spacing: 4 },
      children: [
        {
          type: 'HStack',
          props: { spacing: 4, justifyContent: 'space-between' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, children: 'Gallery' },
              children: [],
            },
            {
              type: 'Button',
              props: { variant: 'primary', children: 'Upload' },
              children: [],
            },
          ],
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
                  props: { p: 0 },
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 0, align: 'stretch' },
                      children: [
                        {
                          type: 'Box',
                          props: { bg: 'gray.200', h: '200px', w: 'full' },
                          children: [],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 1, align: 'start', p: 3 },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Image 1' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', color: 'gray.600', children: '1920x1080' },
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
              props: {},
              children: [
                {
                  type: 'CardBody',
                  props: { p: 0 },
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 0, align: 'stretch' },
                      children: [
                        {
                          type: 'Box',
                          props: { bg: 'gray.200', h: '200px', w: 'full' },
                          children: [],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 1, align: 'start', p: 3 },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Image 2' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', color: 'gray.600', children: '1280x720' },
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
              props: {},
              children: [
                {
                  type: 'CardBody',
                  props: { p: 0 },
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 0, align: 'stretch' },
                      children: [
                        {
                          type: 'Box',
                          props: { bg: 'gray.200', h: '200px', w: 'full' },
                          children: [],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 1, align: 'start', p: 3 },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Image 3' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', color: 'gray.600', children: '1600x900' },
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
              props: {},
              children: [
                {
                  type: 'CardBody',
                  props: { p: 0 },
                  children: [
                    {
                      type: 'VStack',
                      props: { spacing: 0, align: 'stretch' },
                      children: [
                        {
                          type: 'Box',
                          props: { bg: 'gray.200', h: '200px', w: 'full' },
                          children: [],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 1, align: 'start', p: 3 },
                          children: [
                            {
                              type: 'Text',
                              props: { fontWeight: 'bold', children: 'Image 4' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { fontSize: 'sm', color: 'gray.600', children: '2560x1440' },
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
];
