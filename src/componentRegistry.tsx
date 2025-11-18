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
        options: ['small', 'medium', 'large'],
        defaultValue: 'medium',
      },
      {
        name: 'elevation',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'isBorderless',
        type: 'boolean',
        defaultValue: false,
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
        name: 'isShady',
        type: 'boolean',
        defaultValue: false,
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
        name: 'isShady',
        type: 'boolean',
        defaultValue: false,
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
        name: 'variant',
        type: 'select',
        options: ['primary', 'secondary', 'tertiary', 'link'],
        defaultValue: 'secondary',
      },
      {
        name: 'size',
        type: 'select',
        options: ['small', 'default', 'compact'],
        defaultValue: 'default',
      },
      {
        name: 'isDestructive',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'disabled',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'text',
        type: 'string',
        defaultValue: 'Button',
        description: 'Button text content',
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
      },
      {
        name: 'alignment',
        type: 'select',
        options: ['top', 'center', 'bottom', 'stretch'],
        defaultValue: 'center',
      },
      {
        name: 'justify',
        type: 'select',
        options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
        defaultValue: 'flex-start',
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
      },
      {
        name: 'alignment',
        type: 'select',
        options: ['left', 'center', 'right', 'stretch'],
        defaultValue: 'stretch',
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
