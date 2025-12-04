// Modular pattern system - import patterns from individual modules
import { Pattern, assignIds } from './types';
import { dashboardPatterns } from './dashboards';
import { tablePatterns } from './tables';
import { formPatterns } from './forms';
import { crudPatterns } from './crud';
import { navigationPatterns } from './navigation';
import { modalPatterns } from './modals';
import { pricingPatterns } from './pricing';
import { testimonialPatterns } from './testimonials';
import { statsPatterns } from './stats';
import { actionPatterns } from './actions';

// Combine all patterns
export const patterns: Pattern[] = [
  ...dashboardPatterns,
  ...tablePatterns,
  ...formPatterns,
  ...crudPatterns,
  ...navigationPatterns,
  ...modalPatterns,
  ...pricingPatterns,
  ...testimonialPatterns,
  ...statsPatterns,
  ...actionPatterns,
];

// Export pattern categories
export const patternCategories = [
  'Dashboards',
  'Tables',
  'Forms',
  'CRUD',
  'Navigation',
  'Modals',
  'Pricing',
  'Testimonials',
  'Stats',
  'Actions',
];

// Re-export helper
export { assignIds };
