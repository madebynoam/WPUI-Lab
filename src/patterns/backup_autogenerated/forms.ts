import { Pattern } from './types';

/**
 * Form Patterns
 *
 * Pre-built form templates for common web app operations.
 * All use standard form components with proper structure.
 */

export const formPatterns: Pattern[] = [
  // User Create Form
  {
    id: 'user-create-form',
    name: 'User Create Form',
    description: 'Form for creating new user accounts with role assignment',
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
              props: { level: 2, children: 'Create New User' },
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
                      props: { children: 'Full Name' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { placeholder: 'Enter full name' },
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
                      props: { children: 'Email Address' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { type: 'email', placeholder: 'user@example.com' },
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
                      props: { children: 'Role' },
                      children: [],
                    },
                    {
                      type: 'Select',
                      props: { placeholder: 'Select role' },
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
                      props: { children: 'Password' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { type: 'password', placeholder: 'Enter password' },
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
                      props: { variant: 'primary', children: 'Create User' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { variant: 'secondary', children: 'Cancel' },
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

  // User Edit Form
  {
    id: 'user-edit-form',
    name: 'User Edit Form',
    description: 'Form for editing existing user details and status',
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
              props: { level: 2, children: 'Edit User' },
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
                      props: { children: 'Full Name' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { defaultValue: 'John Doe' },
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
                      props: { children: 'Email Address' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { type: 'email', defaultValue: 'john@example.com' },
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
                      props: { children: 'Role' },
                      children: [],
                    },
                    {
                      type: 'Select',
                      props: { defaultValue: 'editor' },
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
                      props: { children: 'Status' },
                      children: [],
                    },
                    {
                      type: 'Select',
                      props: { defaultValue: 'active' },
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
                      props: { variant: 'primary', children: 'Save Changes' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { variant: 'secondary', children: 'Cancel' },
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

  // Product Create Form
  {
    id: 'product-create-form',
    name: 'Product Create Form',
    description: 'Form for adding new products with pricing and inventory',
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
              props: { level: 2, children: 'Add New Product' },
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
                      props: { children: 'Product Name' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { placeholder: 'Enter product name' },
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
                      props: { placeholder: 'Enter product description', rows: 3 },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Grid',
                  props: { columns: 2, gap: 4 },
                  children: [
                    {
                      type: 'FormControl',
                      props: {},
                      children: [
                        {
                          type: 'FormLabel',
                          props: { children: 'Price' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { type: 'number', placeholder: '0.00' },
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
                          props: { children: 'Stock Quantity' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { type: 'number', placeholder: '0' },
                          children: [],
                        },
                      ],
                    },
                  ],
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
                      props: { placeholder: 'Select category' },
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
                      props: { variant: 'primary', children: 'Create Product' },
                      children: [],
                    },
                    {
                      type: 'Button',
                      props: { variant: 'secondary', children: 'Cancel' },
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

  // Settings Form
  {
    id: 'settings-form',
    name: 'Settings Form',
    description: 'Application settings form with preferences and notifications',
    category: 'Forms',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'Heading',
          props: { level: 1, children: 'Settings' },
          children: [],
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
                  props: { level: 3, children: 'Preferences' },
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
                          props: { children: 'Language' },
                          children: [],
                        },
                        {
                          type: 'Select',
                          props: { defaultValue: 'en' },
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
                          props: { children: 'Timezone' },
                          children: [],
                        },
                        {
                          type: 'Select',
                          props: { defaultValue: 'UTC' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'FormControl',
                      props: {},
                      children: [
                        {
                          type: 'Checkbox',
                          props: { children: 'Enable dark mode' },
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
              type: 'CardHeader',
              props: {},
              children: [
                {
                  type: 'Heading',
                  props: { level: 3, children: 'Notifications' },
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
                      type: 'FormControl',
                      props: {},
                      children: [
                        {
                          type: 'Checkbox',
                          props: { children: 'Email notifications' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'FormControl',
                      props: {},
                      children: [
                        {
                          type: 'Checkbox',
                          props: { children: 'Push notifications' },
                          children: [],
                        },
                      ],
                    },
                    {
                      type: 'FormControl',
                      props: {},
                      children: [
                        {
                          type: 'Checkbox',
                          props: { children: 'Weekly digest' },
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
          type: 'Button',
          props: { variant: 'primary', children: 'Save Settings' },
          children: [],
        },
      ],
    },
  },

  // Login Form
  {
    id: 'login-form',
    name: 'Login Form',
    description: 'User authentication form with email and password',
    category: 'Forms',
    tree: {
      type: 'Card',
      props: { maxW: '400px' },
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'VStack',
              props: { spacing: 2 },
              children: [
                {
                  type: 'Heading',
                  props: { level: 2, children: 'Welcome Back' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { children: 'Sign in to your account' },
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
              props: { spacing: 4 },
              children: [
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Email' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { type: 'email', placeholder: 'your@email.com' },
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
                      props: { children: 'Password' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { type: 'password', placeholder: 'Enter password' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'Checkbox',
                      props: { children: 'Remember me' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Button',
                  props: { variant: 'primary', width: 'full', children: 'Sign In' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { textAlign: 'center', children: 'Forgot password?' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Registration Form
  {
    id: 'registration-form',
    name: 'Registration Form',
    description: 'New user registration with password confirmation',
    category: 'Forms',
    tree: {
      type: 'Card',
      props: { maxW: '500px' },
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'VStack',
              props: { spacing: 2 },
              children: [
                {
                  type: 'Heading',
                  props: { level: 2, children: 'Create Account' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { children: 'Sign up to get started' },
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
              props: { spacing: 4 },
              children: [
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Full Name' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { placeholder: 'Enter your name' },
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
                      props: { children: 'Email' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { type: 'email', placeholder: 'your@email.com' },
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
                      props: { children: 'Password' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { type: 'password', placeholder: 'Create password' },
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
                      props: { children: 'Confirm Password' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { type: 'password', placeholder: 'Confirm password' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'Checkbox',
                      props: { children: 'I agree to the Terms and Conditions' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Button',
                  props: { variant: 'primary', width: 'full', children: 'Create Account' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Search/Filter Form
  {
    id: 'search-filter-form',
    name: 'Search & Filter Form',
    description: 'Search bar with filter controls for data tables',
    category: 'Forms',
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
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'Input',
                      props: { placeholder: 'Search...', size: 'lg' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Grid',
                  props: { columns: 3, gap: 4 },
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
                          type: 'Select',
                          props: { placeholder: 'All' },
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
                          props: { children: 'Category' },
                          children: [],
                        },
                        {
                          type: 'Select',
                          props: { placeholder: 'All' },
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
                  ],
                },
                {
                  type: 'HStack',
                  props: { spacing: 2 },
                  children: [
                    {
                      type: 'Button',
                      props: { variant: 'primary', children: 'Apply Filters' },
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

  // Contact Form
  {
    id: 'contact-form',
    name: 'Contact Form',
    description: 'Simple contact form with name, email, and message',
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
            {
              type: 'Text',
              props: { children: 'Send us a message and we\'ll respond soon' },
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
                  type: 'Grid',
                  props: { columns: 2, gap: 4 },
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
                          props: { placeholder: 'Your name' },
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
                          props: { children: 'Email' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { type: 'email', placeholder: 'your@email.com' },
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Message' },
                      children: [],
                    },
                    {
                      type: 'Textarea',
                      props: { placeholder: 'Your message...', rows: 5 },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Button',
                  props: { variant: 'primary', children: 'Send Message' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Password Reset Form
  {
    id: 'password-reset-form',
    name: 'Password Reset Form',
    description: 'Simple password reset request form',
    category: 'Forms',
    tree: {
      type: 'Card',
      props: { maxW: '400px' },
      children: [
        {
          type: 'CardHeader',
          props: {},
          children: [
            {
              type: 'VStack',
              props: { spacing: 2 },
              children: [
                {
                  type: 'Heading',
                  props: { level: 2, children: 'Reset Password' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { children: 'Enter your email to receive a reset link' },
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
              props: { spacing: 4 },
              children: [
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Email Address' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { type: 'email', placeholder: 'your@email.com' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Button',
                  props: { variant: 'primary', width: 'full', children: 'Send Reset Link' },
                  children: [],
                },
                {
                  type: 'Text',
                  props: { textAlign: 'center', children: 'Back to login' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Profile Edit Form
  {
    id: 'profile-edit-form',
    name: 'Profile Edit Form',
    description: 'User profile editing with bio and social links',
    category: 'Forms',
    tree: {
      type: 'VStack',
      props: { spacing: 6 },
      children: [
        {
          type: 'Heading',
          props: { level: 1, children: 'Edit Profile' },
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
                  props: { spacing: 4 },
                  children: [
                    {
                      type: 'FormControl',
                      props: {},
                      children: [
                        {
                          type: 'FormLabel',
                          props: { children: 'Display Name' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { defaultValue: 'John Doe' },
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
                          props: { children: 'Bio' },
                          children: [],
                        },
                        {
                          type: 'Textarea',
                          props: { placeholder: 'Tell us about yourself...', rows: 4 },
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
                          props: { children: 'Website' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { placeholder: 'https://yourwebsite.com' },
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
                          props: { children: 'Twitter' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { placeholder: '@username' },
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
                          props: { variant: 'primary', children: 'Save Profile' },
                          children: [],
                        },
                        {
                          type: 'Button',
                          props: { variant: 'secondary', children: 'Cancel' },
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

  // Payment Form
  {
    id: 'payment-form',
    name: 'Payment Form',
    description: 'Credit card payment form with billing details',
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
              props: { level: 2, children: 'Payment Details' },
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
                      props: { children: 'Card Number' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { placeholder: '1234 5678 9012 3456' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Grid',
                  props: { columns: 2, gap: 4 },
                  children: [
                    {
                      type: 'FormControl',
                      props: {},
                      children: [
                        {
                          type: 'FormLabel',
                          props: { children: 'Expiry Date' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { placeholder: 'MM/YY' },
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
                          props: { children: 'CVV' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { placeholder: '123' },
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Cardholder Name' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { placeholder: 'Name on card' },
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
                  type: 'Heading',
                  props: { level: 3, children: 'Billing Address' },
                  children: [],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'FormLabel',
                      props: { children: 'Street Address' },
                      children: [],
                    },
                    {
                      type: 'Input',
                      props: { placeholder: '123 Main St' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Grid',
                  props: { columns: 2, gap: 4 },
                  children: [
                    {
                      type: 'FormControl',
                      props: {},
                      children: [
                        {
                          type: 'FormLabel',
                          props: { children: 'City' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { placeholder: 'City' },
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
                          props: { children: 'ZIP Code' },
                          children: [],
                        },
                        {
                          type: 'Input',
                          props: { placeholder: '12345' },
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'Button',
                  props: { variant: 'primary', width: 'full', children: 'Complete Payment' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // Feedback Form
  {
    id: 'feedback-form',
    name: 'Feedback Form',
    description: 'Customer feedback form with rating and comments',
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
              props: { level: 2, children: 'Share Your Feedback' },
              children: [],
            },
            {
              type: 'Text',
              props: { children: 'Help us improve our service' },
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
                      props: { children: 'How would you rate your experience?' },
                      children: [],
                    },
                    {
                      type: 'Select',
                      props: { placeholder: 'Select rating' },
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
                      props: { children: 'What did you like most?' },
                      children: [],
                    },
                    {
                      type: 'Textarea',
                      props: { placeholder: 'Tell us what you enjoyed...', rows: 3 },
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
                      props: { children: 'What could we improve?' },
                      children: [],
                    },
                    {
                      type: 'Textarea',
                      props: { placeholder: 'Share your suggestions...', rows: 3 },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'FormControl',
                  props: {},
                  children: [
                    {
                      type: 'Checkbox',
                      props: { children: 'I\'d like to be contacted about my feedback' },
                      children: [],
                    },
                  ],
                },
                {
                  type: 'Button',
                  props: { variant: 'primary', children: 'Submit Feedback' },
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
