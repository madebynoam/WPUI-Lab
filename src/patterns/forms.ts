import { Pattern } from './types';

export const formPatterns: Pattern[] = [
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
              props: { level: 3, children: 'Get in Touch' },
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
];
