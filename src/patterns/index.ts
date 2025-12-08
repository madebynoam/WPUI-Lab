// Modular pattern system - import patterns from individual modules
import { Pattern, assignIds } from './types';
import { featurePatterns } from './features';
import { pricingPatterns } from './pricing';
import { formPatterns } from './forms';
import { testimonialPatterns } from './testimonials';
import { tablePatterns } from './tables';
import { navigationPatterns } from './navigation';
import { actionPatterns } from './actions';

// Combine all patterns
export const patterns: Pattern[] = [
  ...featurePatterns,
  ...pricingPatterns,
  ...formPatterns,
  ...testimonialPatterns,
  ...tablePatterns,
  ...navigationPatterns,
  ...actionPatterns,
];

// Export pattern categories
export const patternCategories = [
  'Features',
  'Pricing',
  'Forms',
  'Testimonials',
  'Tables',
  'Navigation',
  'Actions',
];

// Re-export helper
export { assignIds };
