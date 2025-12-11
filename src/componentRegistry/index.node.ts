/**
 * Mock Component Registry for Node.js
 *
 * This file is used when running in Node.js (e.g., eval suite)
 * Provides empty componentRegistry since WordPress components don't work in Node.js
 */

import { ComponentDefinition } from '../types';

export const componentRegistry: Record<string, ComponentDefinition> = {};

console.log('[componentRegistry] Using Node.js mock - componentRegistry empty');
