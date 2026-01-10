import { parseMarkup } from './markupParser';

// Mock generateId for predictable test IDs
jest.mock('./idGenerator', () => {
  let counter = 0;
  return {
    generateId: jest.fn(() => `test-id-${++counter}`),
  };
});

// Mock componentRegistry to include common components
jest.mock('@/componentRegistry/index.node', () => ({
  componentRegistry: {
    Grid: { acceptsChildren: true },
    VStack: { acceptsChildren: true },
    HStack: { acceptsChildren: true },
    Card: { acceptsChildren: true },
    CardBody: { acceptsChildren: true },
    CardHeader: { acceptsChildren: true },
    CardFooter: { acceptsChildren: true },
    Button: { acceptsChildren: false },
    Text: { acceptsChildren: false },
    Heading: { acceptsChildren: false },
    Icon: { acceptsChildren: false },
    Badge: { acceptsChildren: false },
    Spacer: { acceptsChildren: false },
    TextControl: { acceptsChildren: false },
    SelectControl: { acceptsChildren: false },
  },
}));

// Also mock the browser version since the parser tries both
jest.mock('@/componentRegistry', () => ({
  componentRegistry: {
    Grid: { acceptsChildren: true },
    VStack: { acceptsChildren: true },
    HStack: { acceptsChildren: true },
    Card: { acceptsChildren: true },
    CardBody: { acceptsChildren: true },
    CardHeader: { acceptsChildren: true },
    CardFooter: { acceptsChildren: true },
    Button: { acceptsChildren: false },
    Text: { acceptsChildren: false },
    Heading: { acceptsChildren: false },
    Icon: { acceptsChildren: false },
    Badge: { acceptsChildren: false },
    Spacer: { acceptsChildren: false },
    TextControl: { acceptsChildren: false },
    SelectControl: { acceptsChildren: false },
  },
}));

// Reset ID counter before each test
beforeEach(() => {
  jest.clearAllMocks();
  const idGenerator = require('./idGenerator');
  let counter = 0;
  idGenerator.generateId.mockImplementation(() => `test-id-${++counter}`);
});

describe('markupParser', () => {
  describe('parseMarkup - basic parsing', () => {
    it('parses self-closing component', () => {
      const result = parseMarkup('<Button variant="primary" />');

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes![0].type).toBe('Button');
      expect(result.nodes![0].props.variant).toBe('primary');
      expect(result.nodes![0].children).toEqual([]);
    });

    it('parses component with text children', () => {
      const result = parseMarkup('<Button>Click me</Button>');

      expect(result.success).toBe(true);
      expect(result.nodes![0].type).toBe('Button');
      expect(result.nodes![0].props.text).toBe('Click me');
    });

    it('parses nested components', () => {
      const result = parseMarkup(`
        <VStack spacing={4}>
          <Button variant="primary" />
          <Button variant="secondary" />
        </VStack>
      `);

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes![0].type).toBe('VStack');
      expect(result.nodes![0].children).toHaveLength(2);
      expect(result.nodes![0].children![0].type).toBe('Button');
      expect(result.nodes![0].children![1].type).toBe('Button');
    });

    it('parses multiple top-level components', () => {
      const result = parseMarkup(`
        <Button variant="primary" />
        <Button variant="secondary" />
      `);

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(2);
    });

    it('generates unique IDs for each node', () => {
      const result = parseMarkup(`
        <VStack>
          <Button />
          <Button />
        </VStack>
      `);

      expect(result.success).toBe(true);
      const ids = new Set([
        result.nodes![0].id,
        result.nodes![0].children![0].id,
        result.nodes![0].children![1].id,
      ]);
      expect(ids.size).toBe(3);
    });
  });

  describe('parseMarkup - props parsing', () => {
    it('parses string props with double quotes', () => {
      const result = parseMarkup('<Button variant="primary" />');

      expect(result.nodes![0].props.variant).toBe('primary');
    });

    it('parses string props with single quotes', () => {
      const result = parseMarkup("<Button variant='secondary' />");

      expect(result.nodes![0].props.variant).toBe('secondary');
    });

    it('parses numeric props', () => {
      const result = parseMarkup('<VStack spacing={4} />');

      expect(result.nodes![0].props.spacing).toBe(4);
    });

    it('parses boolean true props (explicit)', () => {
      const result = parseMarkup('<Button disabled={true} />');

      expect(result.nodes![0].props.disabled).toBe(true);
    });

    it('parses boolean false props', () => {
      const result = parseMarkup('<Button disabled={false} />');

      expect(result.nodes![0].props.disabled).toBe(false);
    });

    it('parses boolean shorthand props', () => {
      const result = parseMarkup('<Button disabled />');

      expect(result.nodes![0].props.disabled).toBe(true);
    });

    it('parses null props', () => {
      const result = parseMarkup('<Button value={null} />');

      expect(result.nodes![0].props.value).toBeNull();
    });

    it('parses object props', () => {
      const result = parseMarkup('<Card style={{ color: "red" }} />');

      expect(result.nodes![0].props.style).toEqual({ color: 'red' });
    });

    it('parses array props', () => {
      const result = parseMarkup('<SelectControl options={["a", "b", "c"]} />');

      expect(result.nodes![0].props.options).toEqual(['a', 'b', 'c']);
    });

    it('parses negative numbers', () => {
      const result = parseMarkup('<Spacer margin={-2} />');

      expect(result.nodes![0].props.margin).toBe(-2);
    });

    it('parses decimal numbers', () => {
      const result = parseMarkup('<Icon size={1.5} />');

      expect(result.nodes![0].props.size).toBe(1.5);
    });
  });

  describe('parseMarkup - text content handling', () => {
    it('puts text content in children prop for Text component', () => {
      const result = parseMarkup('<Text>Hello world</Text>');

      expect(result.nodes![0].type).toBe('Text');
      expect(result.nodes![0].props.children).toBe('Hello world');
      expect(result.nodes![0].children).toEqual([]);
    });

    it('puts text content in children prop for Heading component', () => {
      const result = parseMarkup('<Heading level={2}>Welcome</Heading>');

      expect(result.nodes![0].type).toBe('Heading');
      expect(result.nodes![0].props.children).toBe('Welcome');
      expect(result.nodes![0].props.level).toBe(2);
    });

    it('puts text content in children prop for Badge component', () => {
      const result = parseMarkup('<Badge intent="success">New</Badge>');

      expect(result.nodes![0].type).toBe('Badge');
      expect(result.nodes![0].props.children).toBe('New');
    });

    it('puts text content in text prop for Button component', () => {
      const result = parseMarkup('<Button>Submit</Button>');

      expect(result.nodes![0].type).toBe('Button');
      expect(result.nodes![0].props.text).toBe('Submit');
    });

    it('trims whitespace from text content', () => {
      const result = parseMarkup(`<Text>
        Hello
      </Text>`);

      expect(result.nodes![0].props.children).toBe('Hello');
    });
  });

  describe('parseMarkup - design token validation', () => {
    it('accepts valid spacing values', () => {
      const validValues = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];

      for (const value of validValues) {
        const result = parseMarkup(`<VStack spacing={${value}} />`);
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid spacing values', () => {
      const result = parseMarkup('<VStack spacing={7} />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid spacing value');
    });

    it('accepts valid gap values', () => {
      const result = parseMarkup('<Grid columns={12} gap={4} />');

      expect(result.success).toBe(true);
    });

    it('rejects invalid gap values', () => {
      const result = parseMarkup('<Grid columns={12} gap={7} />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid gap value');
    });

    it('accepts valid gridColumnSpan (1-12)', () => {
      const result = parseMarkup('<Card gridColumnSpan={6} />');

      expect(result.success).toBe(true);
    });

    it('rejects gridColumnSpan less than 1', () => {
      const result = parseMarkup('<Card gridColumnSpan={0} />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid gridColumnSpan');
    });

    it('rejects gridColumnSpan greater than 12', () => {
      const result = parseMarkup('<Card gridColumnSpan={13} />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid gridColumnSpan');
    });

    it('rejects non-integer gridColumnSpan', () => {
      const result = parseMarkup('<Card gridColumnSpan={3.5} />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid gridColumnSpan');
    });

    it('accepts valid gridRowSpan', () => {
      const result = parseMarkup('<Card gridRowSpan={2} />');

      expect(result.success).toBe(true);
    });

    it('rejects gridRowSpan less than 1', () => {
      const result = parseMarkup('<Card gridRowSpan={0} />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid gridRowSpan');
    });

    it('requires Grid to use columns={12}', () => {
      const result = parseMarkup('<Grid columns={6} />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Grid must use columns={12}');
    });

    it('accepts Grid with columns={12}', () => {
      const result = parseMarkup('<Grid columns={12} />');

      expect(result.success).toBe(true);
    });
  });

  describe('parseMarkup - error handling', () => {
    it('returns error for empty markup', () => {
      const result = parseMarkup('');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No valid components found');
    });

    it('returns error for whitespace-only markup', () => {
      const result = parseMarkup('   \n  \t  ');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No valid components found');
    });

    it('returns error for lowercase component name', () => {
      const result = parseMarkup('<button />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Component name must start with uppercase');
    });

    it('returns error for mismatched closing tag', () => {
      const result = parseMarkup('<VStack></HStack>');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Mismatched closing tag');
    });

    it('returns error for unclosed string literal', () => {
      const result = parseMarkup('<Button variant="primary />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unclosed string literal');
    });

    it('returns error for unclosed expression', () => {
      const result = parseMarkup('<VStack spacing={4 />');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unclosed expression');
    });

    it('returns error for unexpected closing tag', () => {
      const result = parseMarkup('</Button>');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unexpected closing tag');
    });

    it('includes line and column in error', () => {
      const result = parseMarkup(`<VStack>
  <Button />
  <invalid />
</VStack>`);

      expect(result.success).toBe(false);
      expect(result.error?.line).toBeGreaterThan(1);
    });

    it('includes context in error', () => {
      const result = parseMarkup('<VStack spacing={7} />');

      expect(result.success).toBe(false);
      expect(result.error?.context).toContain('VStack');
    });
  });

  describe('parseMarkup - pre-composed components', () => {
    it('expands ActionCard shortcut', () => {
      const result = parseMarkup('<ActionCard title="Settings" description="Configure your app" icon="cog" />');

      expect(result.success).toBe(true);
      expect(result.nodes![0].type).toBe('Card');
      expect(result.nodes![0].props.gridColumnSpan).toBe(4);
      // ActionCard expands to a nested structure
      expect(result.nodes![0].children!.length).toBeGreaterThan(0);
    });

    it('expands MetricCard shortcut', () => {
      const result = parseMarkup('<MetricCard label="Revenue" value="$12,345" icon="chartBar" />');

      expect(result.success).toBe(true);
      expect(result.nodes![0].type).toBe('Card');
      expect(result.nodes![0].props.gridColumnSpan).toBe(3);
    });

    it('expands PricingCard shortcut', () => {
      const result = parseMarkup('<PricingCard title="Pro" price="$29" features=\'["Feature 1", "Feature 2"]\' />');

      expect(result.success).toBe(true);
      expect(result.nodes![0].type).toBe('Card');
      expect(result.nodes![0].props.gridColumnSpan).toBe(3);
    });

    it('expands InfoCard shortcut', () => {
      const result = parseMarkup('<InfoCard title="Status" description="All systems operational" icon="check" />');

      expect(result.success).toBe(true);
      expect(result.nodes![0].type).toBe('Card');
      expect(result.nodes![0].props.gridColumnSpan).toBe(3);
    });

    it('requires pre-composed components to be self-closing', () => {
      const result = parseMarkup('<ActionCard title="Test"></ActionCard>');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('must be self-closing');
    });

    it('allows custom gridColumnSpan on pre-composed components', () => {
      const result = parseMarkup('<ActionCard title="Test" gridColumnSpan={6} />');

      expect(result.success).toBe(true);
      expect(result.nodes![0].props.gridColumnSpan).toBe(6);
    });
  });

  describe('parseMarkup - Table special component', () => {
    it('allows Table as a valid component type', () => {
      const result = parseMarkup('<Table columns={["Name", "Age"]} rows={[["John", "30"]]} />');

      expect(result.success).toBe(true);
      expect(result.nodes![0].type).toBe('Table');
    });
  });

  describe('parseMarkup - complex structures', () => {
    it('parses deeply nested structure', () => {
      const result = parseMarkup(`
        <Card>
          <CardHeader>
            <Heading level={3}>Title</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Text>Description</Text>
              <HStack spacing={2}>
                <Button variant="primary">Save</Button>
                <Button variant="secondary">Cancel</Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      `);

      expect(result.success).toBe(true);
      expect(result.nodes![0].type).toBe('Card');

      const cardHeader = result.nodes![0].children![0];
      expect(cardHeader.type).toBe('CardHeader');
      expect(cardHeader.children![0].type).toBe('Heading');

      const cardBody = result.nodes![0].children![1];
      expect(cardBody.type).toBe('CardBody');

      const vstack = cardBody.children![0];
      expect(vstack.type).toBe('VStack');
      expect(vstack.props.spacing).toBe(4);
    });

    it('parses multiline text content', () => {
      const result = parseMarkup(`<Text>
        This is a
        multiline
        text
      </Text>`);

      expect(result.success).toBe(true);
      // Text should be trimmed to just the content
      expect(result.nodes![0].props.children).toBe('This is a\n        multiline\n        text');
    });

    it('preserves props from all nested levels', () => {
      const result = parseMarkup(`
        <VStack spacing={4} alignment="center">
          <Button variant="primary" disabled />
        </VStack>
      `);

      expect(result.success).toBe(true);
      expect(result.nodes![0].props.spacing).toBe(4);
      expect(result.nodes![0].props.alignment).toBe('center');
      expect(result.nodes![0].children![0].props.variant).toBe('primary');
      expect(result.nodes![0].children![0].props.disabled).toBe(true);
    });
  });
});
