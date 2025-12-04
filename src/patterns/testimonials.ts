import { Pattern } from './types';

/**
 * Testimonial Patterns
 *
 * Pre-built testimonial templates for customer reviews and quotes.
 */

export const testimonialPatterns: Pattern[] = [
  {
    id: 'testimonials',
    name: 'Testimonials',
    description: 'Customer testimonials with quotes and attribution',
    category: 'Testimonials',
    tree: {
      type: 'Grid',
      props: { columns: 12, gap: 4 },
      children: [
        {
          type: 'Card',
          props: { gridColumnSpan: 6 },
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
                      type: 'Text',
                      props: { children: '"This product has transformed how we work. The interface is intuitive and the results are outstanding. It has streamlined collaboration across teams and shortened onboarding for new hires."' },
                      children: [],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 3 },
                      children: [
                        {
                          type: 'Icon',
                          props: {},
                          children: [],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 0 },
                          children: [
                            {
                              type: 'Text',
                              props: { children: 'Sarah Johnson' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'CEO, TechCorp — North America' },
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
          props: { gridColumnSpan: 6 },
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
                      type: 'Text',
                      props: { children: '"This product has changed how we approach work. The interface remains intuitive, and the outcomes have been impressive. It also accelerated cross-team collaboration and simplified training for new staff."' },
                      children: [],
                    },
                    {
                      type: 'HStack',
                      props: { spacing: 3 },
                      children: [
                        {
                          type: 'Icon',
                          props: {},
                          children: [],
                        },
                        {
                          type: 'VStack',
                          props: { spacing: 0 },
                          children: [
                            {
                              type: 'Text',
                              props: { children: 'Alex Kim' },
                              children: [],
                            },
                            {
                              type: 'Text',
                              props: { children: 'Founder & CEO, TechCorp' },
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

