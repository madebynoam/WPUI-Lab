import { ComponentNode } from '../types';

// Conditionally import componentRegistry
let componentRegistry: Record<string, any> = {};
try {
  if (typeof window !== 'undefined') {
    componentRegistry = require('../componentRegistry').componentRegistry;
  } else {
    componentRegistry = require('../componentRegistry/index.node').componentRegistry;
  }
} catch {
  // Component registry unavailable during SSR - acceptable
}

interface CodeGeneratorOptions {
  includeInteractions?: boolean;
  indent?: number;
}

/**
 * Sanitize a component name to be a valid HTML id/class name
 * - Convert to lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove leading/trailing hyphens
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-') // Replace invalid chars with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-'); // Collapse multiple hyphens
}

/**
 * Collect all component names in the tree to detect duplicates
 */
function collectComponentNames(nodes: ComponentNode[]): Map<string, number> {
  const nameCount = new Map<string, number>();

  function traverse(node: ComponentNode) {
    if (node.name) {
      const sanitized = sanitizeName(node.name);
      nameCount.set(sanitized, (nameCount.get(sanitized) || 0) + 1);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return nameCount;
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

  // Collect all names to detect duplicates
  const nameCount = collectComponentNames(nodes);

  return nodes
    .map((n) => generateNodeCode(n, indent, includeInteractions, undefined, nameCount))
    .join('\n');
};

/**
 * Generate code for a single node
 */
function generateNodeCode(
  node: ComponentNode,
  indent: number,
  includeInteractions: boolean,
  handlerMap?: Record<string, string>,
  nameCount?: Map<string, number>,
  globalComponentMap?: Map<string, ComponentNode>
): string {
  const indentStr = '  '.repeat(indent);

  // Handle global component instances - render as component call
  if (node.isGlobalInstance && node.globalComponentId && globalComponentMap) {
    const globalComp = globalComponentMap.get(node.globalComponentId);
    if (globalComp) {
      const functionName = (globalComp.name || globalComp.type).replace(/[^a-zA-Z0-9]/g, '');
      const props: string[] = [];

      // Pass through grid props
      if (node.props.gridColumnSpan) {
        props.push(`gridColumnSpan={${node.props.gridColumnSpan}}`);
      }
      if (node.props.gridRowSpan) {
        props.push(`gridRowSpan={${node.props.gridRowSpan}}`);
      }

      const propsStr = props.length > 0 ? ' ' + props.join(' ') : '';
      return `${indentStr}<${functionName}${propsStr} />`;
    }
  }

  const componentName = node.type;

  // Check if component has custom code generation
  const definition = componentRegistry[componentName];
  if (definition?.codeGeneration?.generateCode) {
    // Use custom code generation
    const generateChildrenFunc = () => {
      if (!node.children || node.children.length === 0) return '';
      return node.children
        .map((child) => generateNodeCode(child, indent + 1, includeInteractions, handlerMap, nameCount, globalComponentMap))
        .join('\n');
    };

    const customCode = definition.codeGeneration.generateCode(node, generateChildrenFunc);
    // Apply indentation to each line
    return customCode
      .split('\n')
      .map((line: string, index: number) => (index === 0 ? indentStr + line : indentStr + line))
      .join('\n');
  }

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
  delete props.gridGuideColor; // Editor-only prop for grid line visualization

  // Handle component names: add as id if unique, className if duplicate
  if (node.name && nameCount) {
    const sanitized = sanitizeName(node.name);
    const count = nameCount.get(sanitized) || 0;

    if (count === 1) {
      // Unique name: use as id
      props.id = sanitized;
    } else if (count > 1) {
      // Duplicate name: use as className
      props.className = sanitized;
    }
  }

  // Convert gridColumnSpan/gridRowSpan/gridColumnStart to CSS Grid styles
  const gridColumnSpan = props.gridColumnSpan;
  const gridColumnStart = props.gridColumnStart;
  const gridRowSpan = props.gridRowSpan;
  delete props.gridColumnSpan;
  delete props.gridColumnStart;
  delete props.gridRowSpan;

  // Extract height props for Grid containers and children
  const minHeight = props.minHeight;
  const customMinHeight = props.customMinHeight;
  const height = props.height;
  const customHeight = props.customHeight;
  delete props.minHeight;
  delete props.customMinHeight;
  delete props.height;
  delete props.customHeight;

  // Extract layout constraint props for VStack/HStack/Grid
  const maxWidth = props.maxWidth;
  const maxWidthCustom = props.maxWidthCustom;
  const alignSelf = props.alignSelf;
  const padding = props.padding;
  delete props.maxWidth;
  delete props.maxWidthCustom;
  delete props.alignSelf;
  delete props.padding;

  // Add explicit width prop for layout containers to make intent clear in generated code
  if ((componentName === 'VStack' || componentName === 'HStack' || componentName === 'Grid' || componentName === 'Card') && node.width) {
    props.width = node.width; // 'content' or 'full'
  }

  // Track if Button has stretchFullWidth for comment generation
  const hasStretchFullWidth = componentName === 'Button' && props.stretchFullWidth;

  // Build style object for special props
  let styleObj: Record<string, any> = props.style ? { ...props.style } : {};

  // Handle gridColumnSpan and gridColumnStart - convert to CSS Grid style
  if (gridColumnStart !== undefined && gridColumnSpan !== undefined) {
    // Both start and span: use "start / span X" syntax
    styleObj.gridColumn = `${gridColumnStart} / span ${gridColumnSpan}`;
  } else if (gridColumnSpan !== undefined) {
    // Only span: use "span X" syntax (auto-flow)
    styleObj.gridColumn = `span ${gridColumnSpan}`;
  }

  // Handle gridRowSpan - convert to CSS Grid style
  if (gridRowSpan !== undefined) {
    styleObj.gridRow = `span ${gridRowSpan}`;
  }

  // Add grid-auto-flow: dense to Grid components to allow items to fill gaps
  if (componentName === 'Grid') {
    styleObj.gridAutoFlow = 'dense';
  }

  // Handle minHeight for Grid containers
  if (minHeight === '100vh') {
    styleObj.height = '100vh'; // Use height instead of minHeight for definite grid sizing
    styleObj.gridAutoRows = '1fr'; // Make rows stretch to fill grid height
  } else if (minHeight === 'custom' && customMinHeight) {
    styleObj.height = customMinHeight; // Use height instead of minHeight
    styleObj.gridAutoRows = '1fr'; // Make rows stretch for custom heights too
  }

  // Handle height for Grid children
  if (height === 'fill') {
    styleObj.height = '100%';
  } else if (height === 'custom' && customHeight) {
    styleObj.height = customHeight;
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

    // Grid-first: Simplified width control (no Hug/Fill complexity)
    // - Grid children: Use grid-column style (handled below with gridColumnSpan)
    // - VStack/HStack: Content grouping only, no width control
    // - Top-level containers: width control (content=maxWidth or full=100%)

    // Apply maxWidth for layout containers
    if (maxWidth === 'custom' && maxWidthCustom) {
      styleObj.maxWidth = maxWidthCustom;
      // Center constrained containers
      if (alignSelf === 'center') {
        styleObj.marginLeft = 'auto';
        styleObj.marginRight = 'auto';
      } else if (alignSelf === 'start') {
        styleObj.marginRight = 'auto';
      } else if (alignSelf === 'end') {
        styleObj.marginLeft = 'auto';
      }
    } else if (maxWidth && maxWidth !== 'full') {
      styleObj.maxWidth = maxWidthPresets[maxWidth] || '100%';
      // Center constrained containers
      if (alignSelf === 'center') {
        styleObj.marginLeft = 'auto';
        styleObj.marginRight = 'auto';
      } else if (alignSelf === 'start') {
        styleObj.marginRight = 'auto';
      } else if (alignSelf === 'end') {
        styleObj.marginLeft = 'auto';
      }
    } else if (maxWidth === 'full') {
      styleObj.width = '100%';
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
  let comment = hasStretchFullWidth
    ? `${indentStr}{/* WordPress Button does not have a native full-width prop, so we use inline styles */}\n`
    : '';

  // Add comment for layout containers showing width mode
  if ((componentName === 'VStack' || componentName === 'HStack' || componentName === 'Grid' || componentName === 'Card') && node.width) {
    const widthMode = node.width === 'content' ? 'Content Width (1344px max)' : 'Full Width (100%)';
    comment += `${indentStr}{/* ${widthMode} */}\n`;
  }

  // Handle components with children
  if (node.children && node.children.length > 0) {
    const childrenCode = node.children
      .map((child) => generateNodeCode(child, indent + 1, includeInteractions, handlerMap, nameCount, globalComponentMap))
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
      // Keep prop names in camelCase for JSX (don't convert to lowercase)
      const jsxKey = key;

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
export const generatePageCode = (
  nodes: ComponentNode[],
  globalComponents?: Array<{ id: string; type: string; name?: string } & ComponentNode>
): string => {
  // Collect all unique component types used
  const componentTypes = new Set<string>();
  const globalComponentIds = new Set<string>();
  const collectComponents = (node: ComponentNode) => {
    // Track global component instances
    if (node.isGlobalInstance && node.globalComponentId) {
      globalComponentIds.add(node.globalComponentId);
    } else {
      componentTypes.add(node.type);
    }
    if (node.children) {
      node.children.forEach(collectComponents);
    }
  };
  nodes.forEach(collectComponents);

  // Collect all interactions and create handler map (skip global component instances)
  const handlerMap: Record<string, string> = {};
  const handlers: string[] = [];
  const collectInteractions = (node: ComponentNode, skipGlobalInstances = true) => {
    // Skip global component instances - their interactions are handled in the global component function
    if (skipGlobalInstances && node.isGlobalInstance && node.globalComponentId) {
      return;
    }

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
      node.children.forEach((child) => collectInteractions(child, skipGlobalInstances));
    }
  };
  nodes.forEach((node) => collectInteractions(node, true));

  // Generate imports
  const imports: string[] = [];

  // Collect custom imports from component definitions
  const customImports = new Map<string, Set<string>>();
  componentTypes.forEach((type) => {
    const definition = componentRegistry[type];
    if (definition?.codeGeneration?.imports) {
      const { package: pkg, components } = definition.codeGeneration.imports;
      if (pkg && components) {
        if (!customImports.has(pkg)) {
          customImports.set(pkg, new Set());
        }
        components.forEach((comp: string) => customImports.get(pkg)!.add(comp));
      }
    }
  });

  // Add custom imports
  customImports.forEach((components, pkg) => {
    imports.push(`import { ${Array.from(components).join(', ')} } from '${pkg}';`);
  });

  // Regular WordPress components (excluding those with custom imports)
  const componentsWithCustomImports = new Set<string>();
  componentTypes.forEach((type) => {
    if (componentRegistry[type]?.codeGeneration?.imports) {
      componentsWithCustomImports.add(type);
    }
  });

  const wpComponents = Array.from(componentTypes).filter(
    (type) =>
      !componentsWithCustomImports.has(type) &&
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

  // Collect component names to detect duplicates
  const nameCount = collectComponentNames(nodes);

  // Generate global component function definitions
  const globalComponentFunctions: string[] = [];
  const globalComponentMap = new Map<string, ComponentNode>();

  if (globalComponents && globalComponentIds.size > 0) {
    globalComponentIds.forEach((gcId) => {
      const globalComp = globalComponents.find((gc) => gc.id === gcId);
      if (globalComp) {
        globalComponentMap.set(gcId, globalComp);

        // Collect component types used in this global component
        const gcComponentTypes = new Set<string>();
        const collectGCComponents = (node: ComponentNode) => {
          gcComponentTypes.add(node.type);
          if (node.children) {
            node.children.forEach(collectGCComponents);
          }
        };
        collectGCComponents(globalComp);

        // Add these types to the main componentTypes set for imports
        gcComponentTypes.forEach((type) => componentTypes.add(type));

        // Generate function name from component name
        const functionName = (globalComp.name || globalComp.type).replace(/[^a-zA-Z0-9]/g, '');

        // Collect interactions from this global component
        const gcHandlerMap: Record<string, string> = {};
        const gcHandlers: string[] = [];

        // Create handler map and handlers for this global component
        const collectGCInteractions = (node: ComponentNode) => {
          if (node.interactions && node.interactions.length > 0) {
            node.interactions.forEach((interaction) => {
              const triggerBase = interaction.trigger.replace('on', '');
              const uniqueSuffix = interaction.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4);
              const handlerName = `handle${triggerBase}_${uniqueSuffix}`;

              gcHandlerMap[node.id] = handlerName;

              if (interaction.trigger === 'onClick' && interaction.action === 'navigate') {
                gcHandlers.push(
                  `    const ${handlerName} = (e) => {\n      e?.stopPropagation();\n      window.location.pathname = window.location.pathname.replace(/\\/[^\\/]+$/, '/${interaction.targetId}');\n    };`
                );
              }
            });
          }
          if (node.children) {
            node.children.forEach(collectGCInteractions);
          }
        };
        collectGCInteractions(globalComp);

        // Generate the component body with handlers
        const gcCode = generateNodeCode(globalComp, 1, true, gcHandlerMap, new Map());

        const gcHandlersSection = gcHandlers.length > 0 ? `${gcHandlers.join('\n\n')}\n\n` : '';

        globalComponentFunctions.push(`function ${functionName}({ gridColumnSpan, gridRowSpan }: any = {}) {
  const gridStyles = {
    ...(gridColumnSpan ? { gridColumn: \`span \${gridColumnSpan}\` } : {}),
    ...(gridRowSpan ? { gridRow: \`span \${gridRowSpan}\` } : {}),
  };

${gcHandlersSection}  return (
    <div style={gridStyles}>
${gcCode.split('\n').map((line) => '      ' + line).join('\n')}
    </div>
  );
}`);
      }
    });
  }

  // Generate component code with handlers (pass globalComponentMap for instance replacement)
  const componentCode = nodes
    .map((n) => generateNodeCode(n, 0, true, handlerMap, nameCount, globalComponentMap))
    .join('\n');

  // Build handler section
  const handlersSection = handlers.length > 0 ? `${handlers.join('\n\n')}\n\n` : '';

  // Build global components section
  const globalComponentsSection = globalComponentFunctions.length > 0
    ? `// Global component definitions\n${globalComponentFunctions.join('\n\n')}\n\n`
    : '';

  // Wrap in a component
  const fullCode = `${imports.join('\n')}
${globalComponentsSection}export default function Page() {
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
