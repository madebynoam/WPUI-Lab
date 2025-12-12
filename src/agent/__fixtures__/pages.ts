/**
 * Test Fixtures: Pages and Projects
 *
 * Reusable page and project data for testing
 */

import { Page, Project } from '../../types';
import { rootVStack, simpleCard, heading, gridThreeColumns, dataViewsTable } from './components';

/**
 * Empty page (just root VStack)
 */
export const emptyPage: Page = {
  id: 'page-empty',
  name: 'Empty Page',
  tree: [{ ...rootVStack }],
};

/**
 * Dashboard page with heading and card
 */
export const dashboardPage: Page = {
  id: 'page-dashboard',
  name: 'Dashboard',
  tree: [
    {
      ...rootVStack,
      children: [
        { ...heading },
        { ...simpleCard },
      ],
    },
  ],
};

/**
 * Page with grid
 */
export const gridPage: Page = {
  id: 'page-grid',
  name: 'Grid Page',
  tree: [
    {
      ...rootVStack,
      children: [
        {
          ...heading,
          props: { level: 2, children: 'Three Column Grid' },
        },
        { ...gridThreeColumns },
      ],
    },
  ],
};

/**
 * Page with data table
 */
export const tablePage: Page = {
  id: 'page-table',
  name: 'Users Table',
  tree: [
    {
      ...rootVStack,
      children: [
        {
          ...heading,
          props: { level: 2, children: 'User Management' },
        },
        { ...dataViewsTable },
      ],
    },
  ],
};

/**
 * Pricing page (section template)
 */
export const pricingPage: Page = {
  id: 'page-pricing',
  name: 'Pricing',
  tree: [
    {
      ...rootVStack,
      children: [
        {
          id: 'pricing-heading',
          type: 'Heading',
          props: { level: 1, children: 'Choose Your Plan' },
        },
        {
          id: 'pricing-grid',
          type: 'Grid',
          props: { columns: 3, gap: 4 },
          children: [
            {
              id: 'pricing-card-1',
              type: 'Card',
              props: { gridColumnSpan: 1 },
              children: [
                {
                  id: 'pricing-card-header-1',
                  type: 'CardHeader',
                  props: {},
                  children: [
                    {
                      id: 'pricing-heading-1',
                      type: 'Heading',
                      props: { level: 3, children: 'Starter' },
                    },
                  ],
                },
                {
                  id: 'pricing-card-body-1',
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      id: 'pricing-price-1',
                      type: 'Text',
                      props: { children: '$9/month' },
                    },
                  ],
                },
              ],
            },
            {
              id: 'pricing-card-2',
              type: 'Card',
              props: { gridColumnSpan: 1 },
              children: [
                {
                  id: 'pricing-card-header-2',
                  type: 'CardHeader',
                  props: {},
                  children: [
                    {
                      id: 'pricing-heading-2',
                      type: 'Heading',
                      props: { level: 3, children: 'Pro' },
                    },
                  ],
                },
                {
                  id: 'pricing-card-body-2',
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      id: 'pricing-price-2',
                      type: 'Text',
                      props: { children: '$29/month' },
                    },
                  ],
                },
              ],
            },
            {
              id: 'pricing-card-3',
              type: 'Card',
              props: { gridColumnSpan: 1 },
              children: [
                {
                  id: 'pricing-card-header-3',
                  type: 'CardHeader',
                  props: {},
                  children: [
                    {
                      id: 'pricing-heading-3',
                      type: 'Heading',
                      props: { level: 3, children: 'Enterprise' },
                    },
                  ],
                },
                {
                  id: 'pricing-card-body-3',
                  type: 'CardBody',
                  props: {},
                  children: [
                    {
                      id: 'pricing-price-3',
                      type: 'Text',
                      props: { children: '$99/month' },
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
};

/**
 * Empty project (no pages)
 */
export const emptyProject: Project = {
  id: 'project-empty',
  name: 'Empty Project',
  version: 3,
  pages: [],
  currentPageId: '',
  createdAt: Date.now(),
  lastModified: Date.now(),
};

/**
 * Project with one empty page
 */
export const singlePageProject: Project = {
  id: 'project-single',
  name: 'Single Page Project',
  version: 3,
  pages: [emptyPage],
  currentPageId: 'page-empty',
  createdAt: Date.now(),
  lastModified: Date.now(),
};

/**
 * Project with multiple pages
 */
export const multiPageProject: Project = {
  id: 'project-multi',
  name: 'Multi Page Project',
  version: 3,
  pages: [dashboardPage, gridPage, tablePage, pricingPage],
  currentPageId: 'page-dashboard',
  createdAt: Date.now(),
  lastModified: Date.now(),
  theme: {
    primaryColor: '#0073aa',
    backgroundColor: '#ffffff',
  },
  layout: {
    maxWidth: 1200,
    padding: 20,
    spacing: 10,
  },
};

/**
 * Helper: Create a simple page with just a root VStack
 */
export function createSimplePage(id: string, name: string): Page {
  return {
    id,
    name,
    tree: [{ ...rootVStack }],
  };
}

/**
 * Helper: Create a project with specific pages
 */
export function createProject(
  id: string,
  name: string,
  pages: Page[],
  currentPageId?: string
): Project {
  return {
    id,
    name,
    version: 3,
    pages,
    currentPageId: currentPageId || (pages.length > 0 ? pages[0].id : ''),
    createdAt: Date.now(),
    lastModified: Date.now(),
  };
}
