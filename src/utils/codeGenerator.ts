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
  // Treat empty strings and null as no content
  // Check in order: content, text, children (children is where normalized text content lives)
  const contentValue = node.props.content ?? node.props.text ?? node.props.children;
  const hasTextContent = contentValue !== undefined && contentValue !== null && contentValue !== '';
  const textContent = contentValue;

  // Check for placeholder content if no text content exists
  const hasPlaceholder = !hasTextContent && node.props.placeholder !== undefined && node.props.placeholder !== '';
  const placeholderContent = hasPlaceholder ? node.props.placeholder : null;

  // Filter out special props that shouldn't be included
  const props = { ...node.props };
  delete props.content;
  delete props.text;
  delete props.placeholder;
  delete props.children;

  // Convert gridColumnSpan/gridRowSpan to CSS Grid styles
  const gridColumnSpan = props.gridColumnSpan;
  const gridRowSpan = props.gridRowSpan;
  delete props.gridColumnSpan;
  delete props.gridRowSpan;

  // Extract layout constraint props for VStack/HStack/Grid
  const maxWidth = props.maxWidth;
  const maxWidthCustom = props.maxWidthCustom;
  const alignSelf = props.alignSelf;
  const padding = props.padding;
  delete props.maxWidth;
  delete props.maxWidthCustom;
  delete props.alignSelf;
  delete props.padding;

  // Track if Button has stretchFullWidth for comment generation
  const hasStretchFullWidth = componentName === 'Button' && props.stretchFullWidth;

  // Build style object for special props
  let styleObj: Record<string, any> = props.style ? { ...props.style } : {};

  // Handle gridColumnSpan - convert to CSS Grid style
  if (gridColumnSpan !== undefined) {
    styleObj.gridColumn = `span ${gridColumnSpan}`;
  }

  // Handle gridRowSpan - convert to CSS Grid style
  if (gridRowSpan !== undefined) {
    styleObj.gridRow = `span ${gridRowSpan}`;
  }

  // Handle layout constraints for VStack/HStack/Grid
  if (componentName === 'VStack' || componentName === 'HStack' || componentName === 'Grid') {
    const maxWidthPresets: Record<string, string> = {
      sm: '640px',
      md: '960px',
      lg: '1280px',
      xl: '1440px',
      full: '100%',
    };

    // Apply maxWidth - always set width to 100% to ensure stretching
    if (maxWidth === 'custom' && maxWidthCustom) {
      styleObj.width = '100%';
      styleObj.maxWidth = maxWidthCustom;
    } else if (maxWidth && maxWidth !== 'full') {
      styleObj.width = '100%';
      styleObj.maxWidth = maxWidthPresets[maxWidth] || '100%';
    } else {
      // Even for 'full', ensure width is 100%
      styleObj.width = '100%';
    }

    // Apply alignSelf (for horizontal positioning when maxWidth is set)
    if (alignSelf === 'center') {
      styleObj.marginLeft = 'auto';
      styleObj.marginRight = 'auto';
    } else if (alignSelf === 'start') {
      styleObj.marginRight = 'auto';
    } else if (alignSelf === 'end') {
      styleObj.marginLeft = 'auto';
    }

    // Apply padding
    if (padding) {
      styleObj.padding = padding;
    }
  }

  // Handle Button stretchFullWidth - convert to style prop (not native to WordPress Button)
  if (hasStretchFullWidth) {
    styleObj.width = '100%';
    styleObj.justifyContent = 'center';
    delete props.stretchFullWidth;
  }

  // Apply style object if it has any properties
  if (Object.keys(styleObj).length > 0) {
    props.style = styleObj;
  }

  // Handle Icon colorVariant - convert to fill prop
  if (componentName === 'Icon' && props.colorVariant) {
    const colorVariant = props.colorVariant;
    const colorMap: Record<string, string> = {
      'default': 'currentColor',
      // Content colors
      'content-brand': 'var(--wpds-color-fg-content-brand)',
      'content-neutral': 'var(--wpds-color-fg-content-neutral)',
      'content-neutral-weak': 'var(--wpds-color-fg-content-neutral-weak)',
      'content-error': 'var(--wpds-color-fg-content-error)',
      'content-error-weak': 'var(--wpds-color-fg-content-error-weak)',
      'content-success': 'var(--wpds-color-fg-content-success)',
      'content-success-weak': 'var(--wpds-color-fg-content-success-weak)',
      'content-caution': 'var(--wpds-color-fg-content-caution)',
      'content-caution-weak': 'var(--wpds-color-fg-content-caution-weak)',
      'content-info': 'var(--wpds-color-fg-content-info)',
      'content-info-weak': 'var(--wpds-color-fg-content-info-weak)',
      'content-warning': 'var(--wpds-color-fg-content-warning)',
      'content-warning-weak': 'var(--wpds-color-fg-content-warning-weak)',
      // Interactive colors
      'interactive-brand': 'var(--wpds-color-fg-interactive-brand)',
      'interactive-brand-active': 'var(--wpds-color-fg-interactive-brand-active)',
      'interactive-brand-disabled': 'var(--wpds-color-fg-interactive-brand-disabled)',
      'interactive-brand-strong': 'var(--wpds-color-fg-interactive-brand-strong)',
      'interactive-brand-strong-active': 'var(--wpds-color-fg-interactive-brand-strong-active)',
      'interactive-brand-strong-disabled': 'var(--wpds-color-fg-interactive-brand-strong-disabled)',
      'interactive-neutral': 'var(--wpds-color-fg-interactive-neutral)',
      'interactive-neutral-active': 'var(--wpds-color-fg-interactive-neutral-active)',
      'interactive-neutral-disabled': 'var(--wpds-color-fg-interactive-neutral-disabled)',
      'interactive-neutral-strong': 'var(--wpds-color-fg-interactive-neutral-strong)',
      'interactive-neutral-strong-active': 'var(--wpds-color-fg-interactive-neutral-strong-active)',
      'interactive-neutral-strong-disabled': 'var(--wpds-color-fg-interactive-neutral-strong-disabled)',
      'interactive-neutral-weak': 'var(--wpds-color-fg-interactive-neutral-weak)',
      'interactive-neutral-weak-disabled': 'var(--wpds-color-fg-interactive-neutral-weak-disabled)',
    };

    // Only add fill if colorVariant is not default
    if (colorVariant !== 'default') {
      props.fill = colorMap[colorVariant] || colorMap['default'];
    }
    delete props.colorVariant;
  } else {
    delete props.colorVariant;
  }

  // Generate props string
  const propEntries = Object.entries(props).filter(([, value]) => value !== undefined);
  let propsStr = propEntries.length > 0 ? ` ${generatePropsString(propEntries)}` : '';

  // Add onClick handler if node has interactions and handler map provided
  if (handlerMap && node.id in handlerMap && node.interactions && node.interactions.length > 0) {
    const handlerName = handlerMap[node.id];
    propsStr += ` onClick={${handlerName}}`;
  }

  // Components that should always render with opening/closing tags
  const containerComponents = ['Text', 'Heading', 'Button', 'Badge', 'Label', 'Paragraph', 'Div', 'Span'];
  const isContainerComponent = containerComponents.includes(componentName);

  // Add comment for Button with stretchFullWidth
  const comment = hasStretchFullWidth
    ? `${indentStr}{/* WordPress Button does not have a native full-width prop, so we use inline styles */}\n`
    : '';

  // Handle components with children
  if (node.children && node.children.length > 0) {
    const childrenCode = node.children
      .map((child) => generateNodeCode(child, indent + 1, includeInteractions, handlerMap))
      .join('\n');

    return `${comment}${indentStr}<${componentName}${propsStr}>\n${childrenCode}\n${indentStr}</${componentName}>`;
  }

  // Handle Text/Heading/Button with text content
  if (hasTextContent) {
    return `${comment}${indentStr}<${componentName}${propsStr}>${textContent}</${componentName}>`;
  }

  // Handle container components with placeholder content
  if (hasPlaceholder) {
    return `${comment}${indentStr}<${componentName}${propsStr}>${placeholderContent}</${componentName}>`;
  }

  // For container components without content, render with empty opening/closing tags
  if (isContainerComponent) {
    return `${comment}${indentStr}<${componentName}${propsStr}></${componentName}>`;
  }

  // Self-closing component
  return `${comment}${indentStr}<${componentName}${propsStr} />`;
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
      } else if (key === 'style' && typeof value === 'object') {
        // Format style object with readable spacing
        const styleEntries = Object.entries(value)
          .map(([k, v]) => `${k}: "${v}"`)
          .join(', ');
        return `${jsxKey}={{ ${styleEntries} }}`;
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
        const handlerName = `handle${triggerBase}_${uniqueSuffix}`;

        handlerMap[node.id] = handlerName;

        if (interaction.trigger === 'onClick' && interaction.action === 'navigate') {
          handlers.push(
            `  const ${handlerName} = (e) => {\n    e?.stopPropagation();\n    window.location.pathname = window.location.pathname.replace(/\\/[^\\/]+$/, '/${interaction.targetId}');\n  };`
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

  // Regular WordPress components
  const wpComponents = Array.from(componentTypes).filter((type) =>
    ['VStack', 'HStack', 'Grid', 'Button', 'Text', 'Heading', 'Icon', 'Spacer', 'Divider'].includes(type)
  );

  // Private API components that need to be unlocked
  const privateComponents = Array.from(componentTypes).filter((type) =>
    ['Badge'].includes(type)
  );

  if (wpComponents.length > 0) {
    imports.push(`import { ${wpComponents.join(', ')} } from '@wordpress/components';`);
  }

  if (privateComponents.length > 0) {
    imports.push(`import { __dangerousOptInToUnstableAPIsOnlyForCoreModules } from '@wordpress/private-apis';`);
    imports.push(`import { privateApis as componentsPrivateApis } from '@wordpress/components';`);
    imports.push('');
    imports.push(`const { unlock } = __dangerousOptInToUnstableAPIsOnlyForCoreModules(`);
    imports.push(`  'I acknowledge private features are not for use in themes or plugins and doing so will break in the next version of WordPress.',`);
    imports.push(`  '@wordpress/components'`);
    imports.push(`);`);
    imports.push(`const { ${privateComponents.join(', ')} } = unlock(componentsPrivateApis);`);
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
