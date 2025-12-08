import { Pattern } from './types';

/**
 * Modal & Dialog Patterns
 *
 * Pre-built modal dialog templates for user interactions.
 */

export const modalPatterns: Pattern[] = [
  // Confirm Dialog
  {
    id: 'confirm-dialog',
    name: 'Confirm Dialog',
    description: 'Simple confirmation dialog with yes/no buttons',
    category: 'Modals',
    tree: {
      type: 'Card',
      props: { maxW: '400px' },
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'Heading',
              props: { level: 3, children: 'Confirm Action' },
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
                  type: 'Text',
                  props: { children: 'Are you sure you want to proceed with this action?' },
                  children: [],
                },
                {
                  type: 'HStack',
                  props: { spacing: 2, justifyContent: 'flex-end' },
                  children: [
                    {
                      type: 'Button',
                      props: { variant: 'secondary', children: 'Cancel' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { variant: 'primary', children: 'Confirm' },
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

  // Form Modal
  {
    id: 'form-modal',
    name: 'Form Modal',
    description: 'Modal dialog containing a form',
    category: 'Modals',
    tree: {
      type: 'Card',
      props: { maxW: '500px' },
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'Heading',
              props: { level: 2, children: 'Add New Item' },
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
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Name' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { placeholder: 'Enter name' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Description' },
                      children: [],
                    },
                    {
                      type: 'Textarea',
                      props: { placeholder: 'Enter description', rows: 3 },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'HStack',
                  props: { spacing: 2, justifyContent: 'flex-end' },
                  children: [
                    {
                      type: 'Button',
                      props: { variant: 'secondary', children: 'Cancel' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { variant: 'primary', children: 'Save' },
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

  // Detail View Modal
  {
    id: 'detail-modal',
    name: 'Detail View Modal',
    description: 'Modal for displaying item details',
    category: 'Modals',
    tree: {
      type: 'Card',
      props: { maxW: '600px' },
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'HStack',
              props: { spacing: 4, justifyContent: 'space-between' },
              children: [
                {
                  type: 'Heading',
                  props: { level: 2, children: 'Item Details' },
                  children: [],
                },
                {
                  type: 'Button',
                  props: { variant: 'ghost', children: '×' },
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
              props: { spacing: 3, align: 'start' },
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
                  type: 'VStack',
                  props: { spacing: 1, align: 'start' },
                  children: [
                    {
                      type: 'Text',
                      props: { fontWeight: 'bold', children: 'Description:' },
                      children: [],
                    },
                    {
                      type: 'Text',
                      props: { children: 'This is a detailed description of the item.' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'HStack',
                  props: { spacing: 2, justifyContent: 'flex-end', w: 'full' },
                  children: [
                    {
                      type: 'Button',
                      props: { variant: 'primary', children: 'Edit' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { variant: 'secondary', children: 'Close' },
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

  // Delete Confirmation
  {
    id: 'delete-confirm-modal',
    name: 'Delete Confirmation',
    description: 'Warning dialog for delete operations',
    category: 'Modals',
    tree: {
      type: 'Card',
      props: { maxW: '400px', borderColor: 'red.500' },
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'Heading',
              props: { level: 3, color: 'red.600', children: '⚠️ Delete Item?' },
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
                  type: 'Text',
                  props: { children: 'This action cannot be undone. Are you sure you want to delete this item?' },
                  children: [],
                },
                {
                  type: 'HStack',
                  props: { spacing: 2, justifyContent: 'flex-end' },
                  children: [
                    {
                      type: 'Button',
                      props: { variant: 'secondary', children: 'Cancel' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { colorScheme: 'red', children: 'Delete' },
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

  // Bulk Action Modal
  {
    id: 'bulk-action-modal',
    name: 'Bulk Action Modal',
    description: 'Modal for performing actions on multiple items',
    category: 'Modals',
    tree: {
      type: 'Card',
      props: { maxW: '500px' },
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'Heading',
              props: { level: 3, children: 'Bulk Action' },
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
                  type: 'Text',
                  props: { children: '3 items selected' },
                  children: [],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Select Action' },
                      children: [],
                    },
                    {
                      type: 'Select',
                      props: { placeholder: 'Choose action' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'New Status' },
                      children: [],
                    },
                    {
                      type: 'Select',
                      props: { placeholder: 'Select status' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'HStack',
                  props: { spacing: 2, justifyContent: 'flex-end' },
                  children: [
                    {
                      type: 'Button',
                      props: { variant: 'secondary', children: 'Cancel' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { variant: 'primary', children: 'Apply' },
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

  // Filter Drawer
  {
    id: 'filter-drawer',
    name: 'Filter Drawer',
    description: 'Side drawer panel for filtering options',
    category: 'Modals',
    tree: {
      type: 'Card',
      props: { w: '300px', h: '100vh' },
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'HStack',
              props: { spacing: 4, justifyContent: 'space-between' },
              children: [
                {
                  type: 'Heading',
                  props: { level: 3, children: 'Filters' },
                  children: [],
                },
                {
                  type: 'Button',
                  props: { variant: 'ghost', children: '×' },
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
              props: { spacing: 4, align: 'stretch' },
              children: [
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Status' },
                      children: [],
                    },
                    {
                      type: 'VStack',
                      props: { spacing: 2, align: 'start' },
                      children: [
                        {
                          type: 'Checkbox',
                          props: { children: 'Active' },
                          children: [],
                        },
                        {
                          type: 'Checkbox',
                          props: { children: 'Inactive' },
                          children: [],
                        },
                        {
                          type: 'Checkbox',
                          props: { children: 'Draft' },
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'Divider',
                  props: {},
                  children: [],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Category' },
                      children: [],
                    },
                    {
                      type: 'Select',
                      props: { placeholder: 'All categories' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Date Range' },
                      children: [],
                    },
                    {
                      type: 'Select',
                      props: { placeholder: 'All time' },
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
                      props: { variant: 'primary', flex: 1, children: 'Apply' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { variant: 'secondary', children: 'Clear' },
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
