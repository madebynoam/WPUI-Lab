import { ComponentNode } from '@/types';
import { generateId } from './idGenerator';

// Conditionally import componentRegistry
let componentRegistry: Record<string, any> = {};
try {
  if (typeof window !== 'undefined') {
    componentRegistry = require('@/componentRegistry').componentRegistry;
  } else {
    componentRegistry = require('@/componentRegistry/index.node').componentRegistry;
  }
} catch (e) {
  console.log('[markupParser] Failed to load componentRegistry:', e);
}

/**
 * Parse error with location information
 */
export interface ParseError {
  message: string;
  line: number;
  column: number;
  context: string; // Surrounding lines for context
}

/**
 * Parse result - either success with nodes or failure with error
 */
export interface ParseResult {
  success: boolean;
  nodes?: ComponentNode[];
  error?: ParseError;
}

/**
 * Parse JSX-like markup into ComponentNode tree
 *
 * Supports:
 * - Self-closing tags: <Button variant="primary" />
 * - Text children: <Button>Click me</Button>
 * - Nested components: <VStack><Button /></VStack>
 * - Props: strings, numbers, booleans, objects
 *
 * Example:
 * ```jsx
 * <VStack spacing={4}>
 *   <Heading level={2}>Welcome</Heading>
 *   <Button variant="primary">Get Started</Button>
 * </VStack>
 * ```
 */
export function parseMarkup(markup: string): ParseResult {
  try {
    const trimmed = markup.trim();

    // Track position for error reporting
    const state = {
      pos: 0,
      line: 1,
      column: 1,
      source: trimmed,
    };

    // Parse all top-level nodes
    const nodes: ComponentNode[] = [];

    while (state.pos < state.source.length) {
      skipWhitespace(state);
      if (state.pos >= state.source.length) break;

      const node = parseElement(state);
      if (node) {
        nodes.push(node);
      }
    }

    if (nodes.length === 0) {
      return {
        success: false,
        error: {
          message: 'No valid components found in markup',
          line: 1,
          column: 1,
          context: getContext(state, 0),
        },
      };
    }

    return {
      success: true,
      nodes,
    };
  } catch (error) {
    if (error instanceof Error && 'line' in error && 'column' in error && 'context' in error) {
      return {
        success: false,
        error: error as unknown as ParseError,
      };
    }

    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown parse error',
        line: 1,
        column: 1,
        context: markup.split('\n').slice(0, 3).join('\n'),
      },
    };
  }
}

/**
 * Parse state for tracking position in source
 */
interface ParseState {
  pos: number;
  line: number;
  column: number;
  source: string;
}

/**
 * Skip whitespace and update line/column tracking
 */
function skipWhitespace(state: ParseState) {
  while (state.pos < state.source.length) {
    const char = state.source[state.pos];
    if (char === ' ' || char === '\t') {
      state.pos++;
      state.column++;
    } else if (char === '\n') {
      state.pos++;
      state.line++;
      state.column = 1;
    } else if (char === '\r') {
      state.pos++;
      // Handle \r\n as single line break
      if (state.source[state.pos] === '\n') {
        state.pos++;
      }
      state.line++;
      state.column = 1;
    } else {
      break;
    }
  }
}

/**
 * Create parse error with context
 */
function createError(state: ParseState, message: string): ParseError {
  return {
    message,
    line: state.line,
    column: state.column,
    context: getContext(state, state.pos),
  };
}

/**
 * Get context around error position (3 lines before and after)
 */
function getContext(state: ParseState, pos: number): string {
  const lines = state.source.split('\n');
  const currentLine = state.line - 1; // Convert to 0-based

  const start = Math.max(0, currentLine - 1);
  const end = Math.min(lines.length, currentLine + 2);

  const contextLines = lines.slice(start, end).map((line, idx) => {
    const lineNum = start + idx + 1;
    const marker = lineNum === state.line ? ' ← ERROR' : '';
    return `${lineNum}: ${line}${marker}`;
  });

  return contextLines.join('\n');
}

/**
 * Parse a single element (opening tag, children, closing tag)
 */
function parseElement(state: ParseState): ComponentNode | null {
  skipWhitespace(state);

  // Must start with <
  if (state.source[state.pos] !== '<') {
    throw createError(state, `Expected '<' but found '${state.source[state.pos]}'`);
  }

  state.pos++;
  state.column++;

  // Check for closing tag (shouldn't happen at top level)
  if (state.source[state.pos] === '/') {
    throw createError(state, 'Unexpected closing tag');
  }

  // Parse component name
  const componentName = parseComponentName(state);

  // Validate component exists in registry
  if (!componentRegistry[componentName]) {
    throw createError(state, `Unknown component type: ${componentName}. Available components: ${Object.keys(componentRegistry).join(', ')}`);
  }

  skipWhitespace(state);

  // Parse props
  const props = parseProps(state);

  skipWhitespace(state);

  // Check for self-closing tag
  if (state.source[state.pos] === '/' && state.source[state.pos + 1] === '>') {
    state.pos += 2;
    state.column += 2;

    return {
      id: generateId(),
      type: componentName,
      name: '',
      props,
      children: [],
      interactions: [],
    };
  }

  // Must be >
  if (state.source[state.pos] !== '>') {
    throw createError(state, `Expected '>' or '/>' but found '${state.source[state.pos]}'`);
  }

  state.pos++;
  state.column++;

  // Parse children (text or nested elements)
  const children = parseChildren(state, componentName);

  // Parse closing tag
  parseClosingTag(state, componentName);

  // Handle components with text content
  if (typeof children === 'string') {
    // Text/Heading/Badge use 'children' prop
    if (['Text', 'Heading', 'Badge'].includes(componentName)) {
      return {
        id: generateId(),
        type: componentName,
        name: '',
        props: { ...props, children },
        children: [],
        interactions: [],
      };
    }

    // Button uses 'text' prop
    if (componentName === 'Button') {
      return {
        id: generateId(),
        type: componentName,
        name: '',
        props: { ...props, text: children },
        children: [],
        interactions: [],
      };
    }
  }

  return {
    id: generateId(),
    type: componentName,
    name: '',
    props,
    children: Array.isArray(children) ? children : [],
    interactions: [],
  };
}

/**
 * Parse component name (capitalized identifier)
 */
function parseComponentName(state: ParseState): string {
  const start = state.pos;

  // Component name must start with uppercase letter
  if (!/[A-Z]/.test(state.source[state.pos])) {
    throw createError(state, `Component name must start with uppercase letter, found: ${state.source[state.pos]}`);
  }

  while (state.pos < state.source.length && /[A-Za-z0-9_]/.test(state.source[state.pos])) {
    state.pos++;
    state.column++;
  }

  return state.source.slice(start, state.pos);
}

/**
 * Parse props in opening tag
 */
function parseProps(state: ParseState): Record<string, any> {
  const props: Record<string, any> = {};

  while (state.pos < state.source.length) {
    skipWhitespace(state);

    // Check for end of tag
    if (state.source[state.pos] === '>' || state.source[state.pos] === '/') {
      break;
    }

    // Parse prop name
    const propName = parsePropName(state);

    skipWhitespace(state);

    // Boolean prop (no value)
    if (state.source[state.pos] !== '=') {
      props[propName] = true;
      continue;
    }

    // Skip =
    state.pos++;
    state.column++;

    skipWhitespace(state);

    // Parse prop value
    const propValue = parsePropValue(state);
    props[propName] = propValue;
  }

  return props;
}

/**
 * Parse prop name (camelCase identifier)
 */
function parsePropName(state: ParseState): string {
  const start = state.pos;

  while (state.pos < state.source.length && /[A-Za-z0-9_]/.test(state.source[state.pos])) {
    state.pos++;
    state.column++;
  }

  const name = state.source.slice(start, state.pos);

  if (!name) {
    throw createError(state, 'Expected prop name');
  }

  return name;
}

/**
 * Parse prop value (string, number, boolean, object)
 */
function parsePropValue(state: ParseState): any {
  const char = state.source[state.pos];

  // String value
  if (char === '"' || char === "'") {
    return parseStringValue(state, char);
  }

  // Expression value (number, boolean, object)
  if (char === '{') {
    return parseExpressionValue(state);
  }

  throw createError(state, `Expected prop value but found '${char}'`);
}

/**
 * Parse string value in quotes
 */
function parseStringValue(state: ParseState, quote: string): any {
  // Skip opening quote
  state.pos++;
  state.column++;

  const start = state.pos;

  while (state.pos < state.source.length) {
    const char = state.source[state.pos];

    // Handle escape sequences
    if (char === '\\') {
      state.pos += 2;
      state.column += 2;
      continue;
    }

    // End of string
    if (char === quote) {
      const value = state.source.slice(start, state.pos);
      state.pos++;
      state.column++;

      // Try to parse JSON-like strings (arrays/objects)
      const trimmed = value.trim();
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          return JSON.parse(value);
        } catch {
          // If JSON parsing fails, return as string
          return value;
        }
      }

      return value;
    }

    if (char === '\n') {
      state.line++;
      state.column = 1;
    } else {
      state.column++;
    }

    state.pos++;
  }

  throw createError(state, `Unclosed string literal`);
}

/**
 * Parse expression value in braces (number, boolean, object, array)
 */
function parseExpressionValue(state: ParseState): any {
  // Skip {
  state.pos++;
  state.column++;

  skipWhitespace(state);

  const start = state.pos;
  let depth = 1;

  // Find matching closing brace
  while (state.pos < state.source.length && depth > 0) {
    const char = state.source[state.pos];

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        break;
      }
    } else if (char === '\n') {
      state.line++;
      state.column = 1;
      state.pos++;
      continue;
    }

    state.pos++;
    state.column++;
  }

  if (depth !== 0) {
    throw createError(state, 'Unclosed expression');
  }

  const expr = state.source.slice(start, state.pos).trim();

  // Skip closing }
  state.pos++;
  state.column++;

  // Try to parse as JSON
  try {
    return JSON.parse(expr);
  } catch {
    // Try to evaluate as JavaScript expression (numbers, booleans)
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);

    throw createError(state, `Invalid expression: ${expr}`);
  }
}

/**
 * Parse children (text content or nested elements)
 */
function parseChildren(state: ParseState, parentName: string): ComponentNode[] | string {
  const children: ComponentNode[] = [];
  let textContent = '';

  while (state.pos < state.source.length) {
    skipWhitespace(state);

    // Check for closing tag
    if (state.source[state.pos] === '<' && state.source[state.pos + 1] === '/') {
      break;
    }

    // Check for nested element
    if (state.source[state.pos] === '<') {
      const child = parseElement(state);
      if (child) {
        children.push(child);
      }
      continue;
    }

    // Text content
    const text = parseTextContent(state);
    if (text) {
      textContent += text;
    }
  }

  // Return text content for components that accept it
  if (['Text', 'Heading', 'Badge', 'Button'].includes(parentName) && textContent.trim()) {
    return textContent.trim();
  }

  return children;
}

/**
 * Parse text content between tags
 */
function parseTextContent(state: ParseState): string {
  const start = state.pos;

  while (state.pos < state.source.length) {
    const char = state.source[state.pos];

    // Stop at <
    if (char === '<') {
      break;
    }

    if (char === '\n') {
      state.line++;
      state.column = 1;
    } else {
      state.column++;
    }

    state.pos++;
  }

  return state.source.slice(start, state.pos);
}

/**
 * Parse closing tag
 */
function parseClosingTag(state: ParseState, expectedName: string) {
  skipWhitespace(state);

  // Must be </
  if (state.source[state.pos] !== '<' || state.source[state.pos + 1] !== '/') {
    throw createError(state, `Expected closing tag </${expectedName}>`);
  }

  state.pos += 2;
  state.column += 2;

  // Parse name
  const name = parseComponentName(state);

  if (name !== expectedName) {
    throw createError(state, `Mismatched closing tag: expected </${expectedName}> but found </${name}>`);
  }

  skipWhitespace(state);

  // Must be >
  if (state.source[state.pos] !== '>') {
    throw createError(state, `Expected '>' in closing tag`);
  }

  state.pos++;
  state.column++;
}
