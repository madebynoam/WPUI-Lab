import { Pattern } from './types';

export const authPatterns: Pattern[] = [
  {
    id: 'login-form',
    name: 'Login Form',
    description: 'Professional sign-in form with email and password fields',
    category: 'Auth',
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
              props: { level: 3, children: 'Sign In' },
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
              props: { spacing: 4, alignment: 'stretch' },
              children: [
                {
                  type: 'TextControl',
                  props: { label: 'Email', placeholder: 'you@example.com', type: 'email' },
                  children: [],
                },
                {
                  type: 'TextControl',
                  props: { label: 'Password', placeholder: 'Enter your password', type: 'password' },
                  children: [],
                },
                {
                  type: 'HStack',
                  props: { spacing: 2, justify: 'space-between' },
                  children: [
                    {
                      type: 'CheckboxControl',
                      props: { label: 'Remember me', checked: false },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { text: 'Forgot password?', variant: 'link' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Button',
                  props: { text: 'Sign In', variant: 'primary' },
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'CardFooter',
          props: {},
          children: [
            {
              type: 'HStack',
              props: { spacing: 2, justify: 'center' },
              children: [
                {
                  type: 'Text',
                  props: { children: "Don't have an account?" },
                  children: [],
                },
                {
                  type: 'Button',
                  props: { text: 'Sign up', variant: 'link' },
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
