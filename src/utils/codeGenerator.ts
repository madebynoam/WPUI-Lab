import { ComponentNode } from '../types';

interface CodeGeneratorOptions {
  includeInteractions?: boolean;
  indent?: number;
}

/**
 * Convert a component node to React JSX code
 */
export const generateComponentCode = (
  node: ComponentNode | ComponentNode[],
  options: CodeGeneratorOptions = {}
): string => {
  const { includeInteractions = true, indent = 0 } = options;
  const nodes = Array.isArray(node) ? node : [node];

  return nodes
    .map((n) => generateNodeCode(n, indent, includeInteractions))
    .join('\n');
};

/**
 * Generate code for a single node
 */
function generateNodeCode(
  node: ComponentNode,
  indent: number,
  includeInteractions: boolean,
  handlerMap?: Record<string, string>
): string {
  const indentStr = '  '.repeat(indent);
  const componentName = node.type;

  // Check for text content BEFORE deleting from props
  const hasTextContent = node.props.content !== undefined || node.props.text !== undefined;
  const textContent = node.props.content !== undefined ? node.props.content : node.props.text;

  // Filter out special props that shouldn't be included
  const props = { ...node.props };
  delete props.content;
  delete props.text;
  delete props.gridColumnSpan;
  delete props.gridRowSpan;

  // Generate props string
  const propEntries = Object.entries(props).filter(([, value]) => value !== undefined);
  let propsStr = propEntries.length > 0 ? ` ${generatePropsString(propEntries)}` : '';

  // Add onClick handler if node has interactions and handler map provided
  if (handlerMap && node.id in handlerMap && node.interactions && node.interactions.length > 0) {
    const handlerName = handlerMap[node.id];
    propsStr += ` onClick={${handlerName}}`;
  }

  // Handle components with children
  if (node.children && node.children.length > 0) {
    const childrenCode = node.children
      .map((child) => generateNodeCode(child, indent + 1, includeInteractions, handlerMap))
      .join('\n');

    return `${indentStr}<${componentName}${propsStr}>\n${childrenCode}\n${indentStr}</${componentName}>`;
  }

  // Handle Text/Heading/Button with text content
  if (hasTextContent) {
    return `${indentStr}<${componentName}${propsStr}>${textContent}</${componentName}>`;
  }

  // Self-closing component
  return `${indentStr}<${componentName}${propsStr} />`;
}

/**
 * Generate props string from entries
 */
function generatePropsString(entries: [string, any][]): string {
  return entries
    .map(([key, value]) => {
      const jsxKey = key.replace(/([A-Z])/g, (match) => `${match.toLowerCase()}`);

      if (typeof value === 'string') {
        // Check if it looks like a variable/function call
        if (value.startsWith('function') || value.includes('(')) {
          return `${jsxKey}={${value}}`;
        }
        return `${jsxKey}="${value}"`;
      } else if (typeof value === 'boolean') {
        return value ? jsxKey : `${jsxKey}={false}`;
      } else if (typeof value === 'number') {
        return `${jsxKey}={${value}}`;
      } else if (value === null || value === undefined) {
        return '';
      } else {
        return `${jsxKey}={${JSON.stringify(value)}}`;
      }
    })
    .filter((prop) => prop.length > 0)
    .join(' ');
}

/**
 * Generate full page component code with imports and handlers
 */
export const generatePageCode = (nodes: ComponentNode[]): string => {
  // Collect all unique component types used
  const componentTypes = new Set<string>();
  const collectComponents = (node: ComponentNode) => {
    componentTypes.add(node.type);
    if (node.children) {
      node.children.forEach(collectComponents);
    }
  };
  nodes.forEach(collectComponents);

  // Collect all interactions and create handler map
  const handlerMap: Record<string, string> = {};
  const handlers: string[] = [];
  const collectInteractions = (node: ComponentNode) => {
    if (node.interactions && node.interactions.length > 0) {
      node.interactions.forEach((interaction) => {
        // Generate semantic handler name from trigger type
        const triggerBase = interaction.trigger.replace('on', '');

        // Add short unique ID suffix for uniqueness (last 4 chars of interaction ID, alphanumeric)
        const uniqueSuffix = interaction.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4);
        const handlerName = `handle${triggerBase}-${uniqueSuffix}`;

        handlerMap[node.id] = handlerName;

        if (interaction.trigger === 'onClick' && interaction.action === 'navigate') {
          handlers.push(
            `  const ${handlerName} = () => {\n    window.location.hash = '/${interaction.targetId}';\n  };`
          );
        }
      });
    }
    if (node.children) {
      node.children.forEach(collectInteractions);
    }
  };
  nodes.forEach(collectInteractions);

  // Generate imports
  const imports: string[] = [];
  const wpComponents = Array.from(componentTypes).filter((type) =>
    ['VStack', 'HStack', 'Grid', 'Button', 'Text', 'Heading', 'Icon', 'Spacer', 'Divider'].includes(type)
  );

  if (wpComponents.length > 0) {
    imports.push(`import { ${wpComponents.join(', ')} } from '@wordpress/components';`);
  }

  imports.push('');

  // Generate component code with handlers
  const componentCode = nodes
    .map((n) => generateNodeCode(n, 0, true, handlerMap))
    .join('\n');

  // Build handler section
  const handlersSection = handlers.length > 0 ? `${handlers.join('\n\n')}\n\n` : '';

  // Wrap in a component
  const fullCode = `${imports.join('\n')}
export default function Page() {
${handlersSection}  return (
    <>
${componentCode
  .split('\n')
  .map((line) => '      ' + line)
  .join('\n')}
    </>
  );
}`;

  return fullCode;
};

/**
 * Generate component code with interactions as hooks
 */
export const generateComponentWithInteractions = (node: ComponentNode): string => {
  if (!node.interactions || node.interactions.length === 0) {
    return generateComponentCode(node);
  }

  // Create handler map for this node
  const handlerMap: Record<string, string> = {};
  const handlers: string[] = [];

  node.interactions.forEach((interaction) => {
    // Generate semantic handler name from trigger type
    const triggerBase = interaction.trigger.replace('on', '');

    // Add short unique ID suffix for uniqueness (last 4 chars of interaction ID, alphanumeric)
    const uniqueSuffix = interaction.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4);
    const handlerName = `handle${triggerBase}-${uniqueSuffix}`;

    handlerMap[node.id] = handlerName;

    if (interaction.trigger === 'onClick' && interaction.action === 'navigate') {
      handlers.push(
        `  const ${handlerName} = () => {\n    window.location.hash = '/${interaction.targetId}';\n  };`
      );
    }
  });

  // Generate component code with handler
  const componentCode = generateNodeCode(node, 0, true, handlerMap);

  const handlersSection = handlers.length > 0 ? `${handlers.join('\n\n')}\n\n` : '';

  return `${handlersSection}${componentCode}`;
};
