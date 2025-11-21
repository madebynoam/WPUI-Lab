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
function generateNodeCode(node: ComponentNode, indent: number, includeInteractions: boolean): string {
  const indentStr = '  '.repeat(indent);
  const componentName = node.type;

  // Filter out special props that shouldn't be included
  const props = { ...node.props };
  delete props.content;
  delete props.text;
  delete props.gridColumnSpan;
  delete props.gridRowSpan;

  // Generate props string
  const propEntries = Object.entries(props).filter(([, value]) => value !== undefined);
  const propsStr = propEntries.length > 0 ? ` ${generatePropsString(propEntries)}` : '';

  // Handle components with children
  if (node.children && node.children.length > 0) {
    const childrenCode = node.children
      .map((child) => generateNodeCode(child, indent + 1, includeInteractions))
      .join('\n');

    return `${indentStr}<${componentName}${propsStr}>\n${childrenCode}\n${indentStr}</${componentName}>`;
  }

  // Handle Text/Heading with content
  if ((componentName === 'Text' || componentName === 'Heading') && props.content !== undefined) {
    const content = JSON.stringify(node.props.content);
    return `${indentStr}<${componentName}${propsStr}>${node.props.content}</${componentName}>`;
  }

  // Handle Button with text
  if (componentName === 'Button' && node.props.text !== undefined) {
    return `${indentStr}<${componentName}${propsStr}>${node.props.text}</${componentName}>`;
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
 * Generate full page component code with imports
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

  // Generate imports
  const imports: string[] = [];
  const wpComponents = Array.from(componentTypes).filter((type) =>
    ['VStack', 'HStack', 'Grid', 'Button', 'Text', 'Heading', 'Icon', 'Spacer', 'Divider'].includes(type)
  );

  if (wpComponents.length > 0) {
    imports.push(`import { ${wpComponents.join(', ')} } from '@wordpress/components';`);
  }

  imports.push('');

  // Generate component code
  const componentCode = generateComponentCode(nodes, { indent: 0 });

  // Wrap in a component
  const fullCode = `${imports.join('\n')}
export default function Page() {
  return (
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

  const indentStr = '  ';
  const componentName = node.type;

  // Generate interaction handlers
  const handlers = node.interactions
    .map((interaction) => {
      if (interaction.trigger === 'onClick' && interaction.action === 'navigate') {
        return `const navigate${interaction.id} = () => {\n${indentStr}${indentStr}// Navigate to page ${interaction.targetId}\n${indentStr}${indentStr}window.location.hash = '/${interaction.targetId}';\n${indentStr}};`;
      }
      return '';
    })
    .filter((h) => h.length > 0)
    .join('\n\n');

  // Generate onClick handler
  const onClickHandler = node.interactions
    .map((i) => `navigate${i.id}`)
    .join(' || ');

  const props = { ...node.props };
  delete props.content;
  delete props.text;

  const propsStr = generatePropsString(Object.entries(props));
  const finalProps = onClickHandler ? `${propsStr} onClick={${onClickHandler}}` : propsStr;

  const code = `${handlers}\n\nreturn <${node.type} ${finalProps} />;`;

  return code;
};
