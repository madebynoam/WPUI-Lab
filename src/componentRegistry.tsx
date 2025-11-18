import {
  Card,
  CardBody,
  CardHeader,
  Button,
  __experimentalHStack as HStack,
  __experimentalVStack as VStack,
  __experimentalText as Text,
  __experimentalHeading as Heading,
} from '@wordpress/components';
import { ComponentDefinition } from './types';

export const componentRegistry: Record<string, ComponentDefinition> = {
  Card: {
    name: 'Card',
    component: Card,
    acceptsChildren: true,
    defaultProps: { size: 'medium' },
    propDefinitions: [
      {
        name: 'size',
        type: 'select',
        options: ['xSmall', 'small', 'medium', 'large'],
        defaultValue: 'medium',
        description: 'Card size'
      },
      {
        name: 'elevation',
        type: 'number',
        defaultValue: 0,
        description: 'Shadow depth (0-5)'
      },
      {
        name: 'isBorderless',
        type: 'boolean',
        defaultValue: false,
        description: 'Remove border'
      },
      {
        name: 'isRounded',
        type: 'boolean',
        defaultValue: true,
        description: 'Rounded corners'
      },
    ],
  },
  CardBody: {
    name: 'CardBody',
    component: CardBody,
    acceptsChildren: true,
    defaultProps: {},
    propDefinitions: [
      {
        name: 'size',
        type: 'select',
        options: ['xSmall', 'small', 'medium', 'large'],
        defaultValue: 'medium',
        description: 'Padding size'
      },
      {
        name: 'isShady',
        type: 'boolean',
        defaultValue: false,
        description: 'Light gray background'
      },
      {
        name: 'isScrollable',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable scrolling'
      },
    ],
  },
  CardHeader: {
    name: 'CardHeader',
    component: CardHeader,
    acceptsChildren: true,
    defaultProps: {},
    propDefinitions: [
      {
        name: 'size',
        type: 'select',
        options: ['xSmall', 'small', 'medium', 'large'],
        defaultValue: 'medium',
        description: 'Padding size'
      },
      {
        name: 'isShady',
        type: 'boolean',
        defaultValue: false,
        description: 'Light gray background'
      },
      {
        name: 'isBorderless',
        type: 'boolean',
        defaultValue: false,
        description: 'Remove border'
      },
    ],
  },
  Button: {
    name: 'Button',
    component: Button,
    acceptsChildren: true,
    defaultProps: { children: 'Button' },
    propDefinitions: [
      {
        name: 'text',
        type: 'string',
        defaultValue: 'Button',
        description: 'Button text content',
      },
      {
        name: 'variant',
        type: 'select',
        options: ['primary', 'secondary', 'tertiary', 'link'],
        defaultValue: 'secondary',
        description: 'Button style variant'
      },
      {
        name: 'size',
        type: 'select',
        options: ['small', 'default', 'compact'],
        defaultValue: 'default',
        description: 'Button size'
      },
      {
        name: 'isDestructive',
        type: 'boolean',
        defaultValue: false,
        description: 'Red destructive style'
      },
      {
        name: 'disabled',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable button'
      },
      {
        name: 'isBusy',
        type: 'boolean',
        defaultValue: false,
        description: 'Show loading state'
      },
      {
        name: 'isPressed',
        type: 'boolean',
        defaultValue: false,
        description: 'Pressed/active state'
      },
    ],
  },
  HStack: {
    name: 'HStack',
    component: HStack,
    acceptsChildren: true,
    defaultProps: { spacing: 2 },
    propDefinitions: [
      {
        name: 'spacing',
        type: 'number',
        defaultValue: 2,
        description: 'Space between items (multiplier of 4px)'
      },
      {
        name: 'alignment',
        type: 'select',
        options: ['top', 'topLeft', 'topRight', 'left', 'center', 'right', 'bottom', 'bottomLeft', 'bottomRight', 'edge', 'stretch'],
        defaultValue: 'center',
        description: 'Vertical alignment'
      },
      {
        name: 'justify',
        type: 'select',
        options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start',
        description: 'Horizontal distribution'
      },
      {
        name: 'direction',
        type: 'select',
        options: ['row', 'column'],
        defaultValue: 'row',
        description: 'Content flow direction'
      },
      {
        name: 'expanded',
        type: 'boolean',
        defaultValue: false,
        description: 'Expand to max width'
      },
      {
        name: 'wrap',
        type: 'boolean',
        defaultValue: false,
        description: 'Allow items to wrap'
      },
    ],
  },
  VStack: {
    name: 'VStack',
    component: VStack,
    acceptsChildren: true,
    defaultProps: { spacing: 2 },
    propDefinitions: [
      {
        name: 'spacing',
        type: 'number',
        defaultValue: 2,
        description: 'Space between items (multiplier of 4px)'
      },
      {
        name: 'alignment',
        type: 'select',
        options: ['top', 'topLeft', 'topRight', 'left', 'center', 'right', 'bottom', 'bottomLeft', 'bottomRight', 'edge', 'stretch'],
        defaultValue: 'stretch',
        description: 'Horizontal alignment'
      },
      {
        name: 'justify',
        type: 'select',
        options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start',
        description: 'Vertical distribution'
      },
      {
        name: 'direction',
        type: 'select',
        options: ['column', 'row'],
        defaultValue: 'column',
        description: 'Content flow direction'
      },
      {
        name: 'expanded',
        type: 'boolean',
        defaultValue: false,
        description: 'Expand to max height'
      },
      {
        name: 'wrap',
        type: 'boolean',
        defaultValue: false,
        description: 'Allow items to wrap'
      },
    ],
  },
  Text: {
    name: 'Text',
    component: Text,
    acceptsChildren: false,
    defaultProps: { children: 'Text content' },
    propDefinitions: [
      {
        name: 'content',
        type: 'string',
        defaultValue: 'Text content',
        description: 'Text content',
      },
      {
        name: 'variant',
        type: 'select',
        options: ['body', 'muted', 'subtitle'],
        defaultValue: 'body',
      },
    ],
  },
  Heading: {
    name: 'Heading',
    component: Heading,
    acceptsChildren: false,
    defaultProps: { children: 'Heading', level: 2 },
    propDefinitions: [
      {
        name: 'content',
        type: 'string',
        defaultValue: 'Heading',
        description: 'Heading content',
      },
      {
        name: 'level',
        type: 'select',
        options: ['1', '2', '3', '4', '5', '6'],
        defaultValue: '2',
      },
    ],
  },
};
