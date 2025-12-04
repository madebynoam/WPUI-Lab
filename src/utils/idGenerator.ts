/**
 * Generate a unique ID for components and other entities
 * Format: node-{timestamp}-{random}
 */
export const generateId = (): string => {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

