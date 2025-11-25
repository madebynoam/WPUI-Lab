// Modular pattern system - import patterns from individual modules
import { Pattern, assignIds } from './types';
import { dashboardPatterns } from './dashboards';
import { tablePatterns } from './tables';
import { formPatterns } from './forms';
import { crudPatterns } from './crud';
import { navigationPatterns } from './navigation';
import { modalPatterns } from './modals';

// TODO: Move these to separate modules (in progress)
// For now, re-importing from old patterns.ts to avoid breaking changes
import {
  patterns as legacyPatterns,
  patternCategories as legacyCategories
} from '../patterns';

// Filter out patterns from legacy that we've replaced with new modular versions
const replacedCategories = ['Dashboards', 'Tables', 'Forms', 'CRUD', 'Navigation', 'Modals'];
const filteredLegacy = legacyPatterns.filter(
  p => !replacedCategories.includes(p.category)
);

// Combine all patterns
export const patterns: Pattern[] = [
  ...filteredLegacy,
  ...dashboardPatterns,
  ...tablePatterns,
  ...formPatterns,
  ...crudPatterns,
  ...navigationPatterns,
  ...modalPatterns,
];

// Export pattern categories
export const patternCategories = [
  ...legacyCategories.filter(c => !replacedCategories.includes(c)),
  'Dashboards',
  'Tables',
  'Forms',
  'CRUD',
  'Navigation',
  'Modals',
];

// Re-export helper
export { assignIds };
