/**
 * Test Fixtures: Component Nodes
 *
 * Reusable component nodes for testing
 */

import { ComponentNode } from '../../types';

/**
 * Root VStack (required on every page)
 */
export const rootVStack: ComponentNode = {
  id: 'root-vstack',
  type: 'VStack',
  props: {
    spacing: 20,
    alignment: 'stretch',
  },
  children: [],
};

/**
 * Simple button
 */
export const simpleButton: ComponentNode = {
  id: 'btn-1',
  type: 'Button',
  props: {
    text: 'Click Me',
    variant: 'primary',
  },
};

/**
 * Submit button
 */
export const submitButton: ComponentNode = {
  id: 'btn-submit',
  type: 'Button',
  props: {
    text: 'Submit',
    variant: 'primary',
  },
};

/**
 * Cancel button
 */
export const cancelButton: ComponentNode = {
  id: 'btn-cancel',
  type: 'Button',
  props: {
    text: 'Cancel',
    variant: 'secondary',
  },
};

/**
 * Simple heading
 */
export const heading: ComponentNode = {
  id: 'heading-1',
  type: 'Heading',
  props: {
    level: 2,
    children: 'Welcome to Dashboard',
  },
};

/**
 * Simple text
 */
export const textNode: ComponentNode = {
  id: 'text-1',
  type: 'Text',
  props: {
    children: 'This is some text content',
  },
};

/**
 * Card with header and body
 */
export const simpleCard: ComponentNode = {
  id: 'card-1',
  type: 'Card',
  props: {
    elevation: 'medium',
  },
  children: [
    {
      id: 'card-header-1',
      type: 'CardHeader',
      props: {},
      children: [
        {
          id: 'card-heading-1',
          type: 'Heading',
          props: {
            level: 3,
            children: 'Card Title',
          },
        },
      ],
    },
    {
      id: 'card-body-1',
      type: 'CardBody',
      props: {},
      children: [
        {
          id: 'card-text-1',
          type: 'Text',
          props: {
            children: 'Card content goes here',
          },
        },
      ],
    },
  ],
};

/**
 * Grid with 3 columns
 */
export const gridThreeColumns: ComponentNode = {
  id: 'grid-1',
  type: 'Grid',
  props: {
    columns: 3,
    gap: 4,
  },
  children: [
    {
      id: 'grid-card-1',
      type: 'Card',
      props: { gridColumnSpan: 1 },
      children: [
        {
          id: 'grid-card-header-1',
          type: 'CardHeader',
          props: {},
          children: [
            {
              id: 'grid-heading-1',
              type: 'Heading',
              props: { level: 3, children: 'Item 1' },
            },
          ],
        },
        {
          id: 'grid-card-body-1',
          type: 'CardBody',
          props: {},
          children: [
            {
              id: 'grid-text-1',
              type: 'Text',
              props: { children: 'Content 1' },
            },
          ],
        },
      ],
    },
    {
      id: 'grid-card-2',
      type: 'Card',
      props: { gridColumnSpan: 1 },
      children: [
        {
          id: 'grid-card-header-2',
          type: 'CardHeader',
          props: {},
          children: [
            {
              id: 'grid-heading-2',
              type: 'Heading',
              props: { level: 3, children: 'Item 2' },
            },
          ],
        },
        {
          id: 'grid-card-body-2',
          type: 'CardBody',
          props: {},
          children: [
            {
              id: 'grid-text-2',
              type: 'Text',
              props: { children: 'Content 2' },
            },
          ],
        },
      ],
    },
    {
      id: 'grid-card-3',
      type: 'Card',
      props: { gridColumnSpan: 1 },
      children: [
        {
          id: 'grid-card-header-3',
          type: 'CardHeader',
          props: {},
          children: [
            {
              id: 'grid-heading-3',
              type: 'Heading',
              props: { level: 3, children: 'Item 3' },
            },
          ],
        },
        {
          id: 'grid-card-body-3',
          type: 'CardBody',
          props: {},
          children: [
            {
              id: 'grid-text-3',
              type: 'Text',
              props: { children: 'Content 3' },
            },
          ],
        },
      ],
    },
  ],
};

/**
 * HStack with buttons
 */
export const hstackButtons: ComponentNode = {
  id: 'hstack-1',
  type: 'HStack',
  props: {
    spacing: 10,
    justify: 'flex-start',
  },
  children: [
    { ...submitButton },
    { ...cancelButton },
  ],
};

/**
 * DataViews table (users)
 */
export const dataViewsTable: ComponentNode = {
  id: 'table-1',
  type: 'DataViews',
  props: {
    data: [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Editor' },
    ],
    fields: [
      { id: 'name', header: 'Name' },
      { id: 'email', header: 'Email' },
      { id: 'role', header: 'Role' },
    ],
    defaultView: { type: 'table' },
  },
};

/**
 * Helper: Create a root VStack with children
 */
export function createRootWithChildren(children: ComponentNode[]): ComponentNode {
  return {
    ...rootVStack,
    children,
  };
}

/**
 * Helper: Create a card with custom content
 */
export function createCard(
  id: string,
  title: string,
  content: string
): ComponentNode {
  return {
    id,
    type: 'Card',
    props: {},
    children: [
      {
        id: `${id}-header`,
        type: 'CardHeader',
        props: {},
        children: [
          {
            id: `${id}-heading`,
            type: 'Heading',
            props: { level: 3, children: title },
          },
        ],
      },
      {
        id: `${id}-body`,
        type: 'CardBody',
        props: {},
        children: [
          {
            id: `${id}-text`,
            type: 'Text',
            props: { children: content },
          },
        ],
      },
    ],
  };
}

/**
 * Helper: Create a button with custom props
 */
export function createButton(
  id: string,
  text: string,
  variant: 'primary' | 'secondary' | 'tertiary' = 'primary'
): ComponentNode {
  return {
    id,
    type: 'Button',
    props: { text, variant },
  };
}
