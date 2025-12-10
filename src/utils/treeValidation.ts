import { ComponentNode } from '@/types';
import { componentRegistry } from '@/componentRegistry';

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Comprehensive tree validation to ensure safety and correctness
 */
export function validateTree(tree: ComponentNode[]): ValidationResult {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  // Must have at least one node
  if (!Array.isArray(tree) || tree.length === 0) {
    errors.push({
      path: 'root',
      message: 'Tree must be a non-empty array',
      severity: 'error',
    });
    return { valid: false, errors };
  }

  // Figma-style: Allow any top-level components, no root constraint

  // Validate each node recursively
  function validateNode(node: any, path: string): void {
    // Check required fields
    if (!node || typeof node !== 'object') {
      errors.push({
        path,
        message: 'Node must be an object',
        severity: 'error',
      });
      return;
    }

    if (!node.id || typeof node.id !== 'string') {
      errors.push({
        path,
        message: 'Node must have a string "id" field',
        severity: 'error',
      });
      return;
    }

    if (!node.type || typeof node.type !== 'string') {
      errors.push({
        path: `${path}[${node.id}]`,
        message: 'Node must have a string "type" field',
        severity: 'error',
      });
      return;
    }

    // Check for duplicate IDs
    if (seenIds.has(node.id)) {
      errors.push({
        path: `${path}[${node.id}]`,
        message: `Duplicate node ID: "${node.id}"`,
        severity: 'error',
      });
    }
    seenIds.add(node.id);

    // Verify component type exists in registry
    const definition = componentRegistry[node.type];
    if (!definition) {
      errors.push({
        path: `${path}[${node.id}]`,
        message: `Unknown component type: "${node.type}". Must be one of: ${Object.keys(componentRegistry).join(', ')}`,
        severity: 'error',
      });
      return; // Can't validate further without definition
    }

    // Validate props field
    if (!node.props || typeof node.props !== 'object' || Array.isArray(node.props)) {
      errors.push({
        path: `${path}[${node.id}]`,
        message: 'Node must have a "props" object',
        severity: 'error',
      });
    }

    // Validate children field
    if (node.children !== undefined && !Array.isArray(node.children)) {
      errors.push({
        path: `${path}[${node.id}]`,
        message: '"children" must be an array if present',
        severity: 'error',
      });
    }

    // Validate interactions field
    if (node.interactions !== undefined && !Array.isArray(node.interactions)) {
      errors.push({
        path: `${path}[${node.id}]`,
        message: '"interactions" must be an array if present',
        severity: 'error',
      });
    }

    // Business rule: Text and Heading components cannot have children
    if ((node.type === 'Text' || node.type === 'Heading') && node.children && node.children.length > 0) {
      errors.push({
        path: `${path}[${node.id}]`,
        message: `${node.type} components cannot have children. Text content should be in props.children property.`,
        severity: 'error',
      });
    }

    // Business rule: Container components should accept children
    if (definition.acceptsChildren && !node.children) {
      errors.push({
        path: `${path}[${node.id}]`,
        message: `${node.type} is a container component and should have a children array (can be empty)`,
        severity: 'warning',
      });
    }

    // Business rule: Non-container components shouldn't have children
    if (!definition.acceptsChildren && node.children && node.children.length > 0) {
      errors.push({
        path: `${path}[${node.id}]`,
        message: `${node.type} does not accept children but has ${node.children.length} child(ren)`,
        severity: 'error',
      });
    }

    // Validate name field if present
    if (node.name !== undefined && typeof node.name !== 'string') {
      errors.push({
        path: `${path}[${node.id}]`,
        message: '"name" must be a string if present',
        severity: 'warning',
      });
    }

    // Recursively validate children
    if (Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        validateNode(child, `${path}[${node.id}].children[${index}]`);
      });
    }

    // Validate interactions structure
    if (Array.isArray(node.interactions)) {
      node.interactions.forEach((interaction: any, index: number) => {
        if (!interaction.id || typeof interaction.id !== 'string') {
          errors.push({
            path: `${path}[${node.id}].interactions[${index}]`,
            message: 'Interaction must have a string "id"',
            severity: 'error',
          });
        }
        if (!interaction.trigger) {
          errors.push({
            path: `${path}[${node.id}].interactions[${index}]`,
            message: 'Interaction must have a "trigger" field',
            severity: 'error',
          });
        }
        if (!interaction.action) {
          errors.push({
            path: `${path}[${node.id}].interactions[${index}]`,
            message: 'Interaction must have an "action" field',
            severity: 'error',
          });
        }
      });
    }
  }

  // Validate all top-level nodes
  tree.forEach((node, index) => {
    validateNode(node, `tree[${index}]`);
  });

  // Check for circular references by tracking visited nodes during traversal
  const visitedInPath = new Set<string>();
  function checkCircular(node: ComponentNode, path: string): void {
    if (visitedInPath.has(node.id)) {
      errors.push({
        path,
        message: `Circular reference detected for node ID: "${node.id}"`,
        severity: 'error',
      });
      return;
    }

    visitedInPath.add(node.id);

    if (Array.isArray(node.children)) {
      node.children.forEach((child) => {
        checkCircular(child, `${path} -> ${child.id}`);
      });
    }

    visitedInPath.delete(node.id);
  }

  tree.forEach((node) => {
    if (node && node.id) {
      checkCircular(node, node.id);
    }
  });

  // Return validation result
  const hasErrors = errors.some(e => e.severity === 'error');
  return {
    valid: !hasErrors,
    errors,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid && result.errors.length === 0) {
    return 'Tree is valid';
  }

  const errorMessages = result.errors.map(err => {
    const prefix = err.severity === 'error' ? '❌ ERROR' : '⚠️  WARNING';
    return `${prefix} at ${err.path}: ${err.message}`;
  });

  return errorMessages.join('\n');
}
