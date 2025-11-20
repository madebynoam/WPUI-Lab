import {
  Card,
  CardBody,
  CardHeader,
  Button,
  __experimentalHStack as HStack,
  __experimentalVStack as VStack,
  __experimentalText as Text,
  __experimentalHeading as Heading,
  TextControl,
  TextareaControl,
  SelectControl,
  Icon,
  ToggleControl,
  CheckboxControl,
  SearchControl,
  __experimentalNumberControl as NumberControl,
  RadioControl,
  RangeControl,
  ColorPicker,
  ColorPalette,
  Panel,
  PanelBody,
  PanelRow,
  Flex,
  FlexBlock,
  FlexItem,
  __experimentalSpacer as Spacer,
  __experimentalDivider as Divider,
  Tooltip,
  __experimentalTruncate as Truncate,
  Modal,
  Popover,
  MenuGroup,
  MenuItem,
  TabPanel,
  Spinner,
  Notice,
  DateTimePicker,
  FontSizePicker,
  AnglePickerControl,
  __experimentalBoxControl as BoxControl,
  __experimentalBorderControl as BorderControl,
  FormTokenField,
  __experimentalGrid as Grid,
} from '@wordpress/components';
import { ComponentDefinition } from './types';

export const componentRegistry: Record<string, ComponentDefinition> = {
  Grid: {
    name: 'Grid',
    component: Grid,
    acceptsChildren: true,
    defaultProps: {
      columns: 3,
      gap: 4,
    },
    propDefinitions: [
      {
        name: 'columns',
        type: 'number',
        defaultValue: 3,
        description: 'Number of columns',
      },
      {
        name: 'rows',
        type: 'number',
        defaultValue: undefined,
        description: 'Number of rows',
      },
      {
        name: 'gap',
        type: 'number',
        defaultValue: 4,
        description: 'Gap between items (multiplier of 4px)',
      },
      {
        name: 'rowGap',
        type: 'string',
        defaultValue: '',
        description: 'Gap between rows (CSS value)',
      },
      {
        name: 'columnGap',
        type: 'string',
        defaultValue: '',
        description: 'Gap between columns (CSS value)',
      },
      {
        name: 'templateColumns',
        type: 'string',
        defaultValue: '',
        description: 'Custom grid-template-columns (e.g., "1fr 2fr 1fr")',
      },
      {
        name: 'templateRows',
        type: 'string',
        defaultValue: '',
        description: 'Custom grid-template-rows (e.g., "100px auto 100px")',
      },
      {
        name: 'align',
        type: 'select',
        options: ['start', 'center', 'end', 'stretch'],
        defaultValue: 'start',
        description: 'Vertical alignment of children',
      },
      {
        name: 'justify',
        type: 'select',
        options: ['start', 'center', 'end', 'space-between', 'space-around'],
        defaultValue: 'start',
        description: 'Horizontal alignment of children',
      },
      {
        name: 'isInline',
        type: 'boolean',
        defaultValue: false,
        description: 'Display as inline-grid',
      },
    ],
  },

  Card: {
    name: 'Card',
    component: Card,
    acceptsChildren: true,
    defaultProps: { size: 'medium' },
    propDefinitions: [
      {
        name: 'size',
        type: 'select',
        options: ['xSmall', 'small', 'medium', 'large'],
        defaultValue: 'medium',
        description: 'Card size'
      },
      {
        name: 'elevation',
        type: 'number',
        defaultValue: 0,
        description: 'Shadow depth (0-5)'
      },
      {
        name: 'isBorderless',
        type: 'boolean',
        defaultValue: false,
        description: 'Remove border'
      },
      {
        name: 'isRounded',
        type: 'boolean',
        defaultValue: true,
        description: 'Rounded corners'
      },
    ],
  },
  CardBody: {
    name: 'CardBody',
    component: CardBody,
    acceptsChildren: true,
    defaultProps: {},
    propDefinitions: [
      {
        name: 'size',
        type: 'select',
        options: ['xSmall', 'small', 'medium', 'large'],
        defaultValue: 'medium',
        description: 'Padding size'
      },
      {
        name: 'isShady',
        type: 'boolean',
        defaultValue: false,
        description: 'Light gray background'
      },
      {
        name: 'isScrollable',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable scrolling'
      },
    ],
  },
  CardHeader: {
    name: 'CardHeader',
    component: CardHeader,
    acceptsChildren: true,
    defaultProps: {},
    propDefinitions: [
      {
        name: 'size',
        type: 'select',
        options: ['xSmall', 'small', 'medium', 'large'],
        defaultValue: 'medium',
        description: 'Padding size'
      },
      {
        name: 'isShady',
        type: 'boolean',
        defaultValue: false,
        description: 'Light gray background'
      },
      {
        name: 'isBorderless',
        type: 'boolean',
        defaultValue: false,
        description: 'Remove border'
      },
    ],
  },
  Button: {
    name: 'Button',
    component: Button,
    acceptsChildren: true,
    defaultProps: { children: 'Button' },
    propDefinitions: [
      {
        name: 'text',
        type: 'string',
        defaultValue: 'Button',
        description: 'Button text content',
      },
      {
        name: 'variant',
        type: 'select',
        options: ['primary', 'secondary', 'tertiary', 'link'],
        defaultValue: 'secondary',
        description: 'Button style variant'
      },
      {
        name: 'size',
        type: 'select',
        options: ['small', 'default', 'compact'],
        defaultValue: 'default',
        description: 'Button size'
      },
      {
        name: 'isDestructive',
        type: 'boolean',
        defaultValue: false,
        description: 'Red destructive style'
      },
      {
        name: 'disabled',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable button'
      },
      {
        name: 'isBusy',
        type: 'boolean',
        defaultValue: false,
        description: 'Show loading state'
      },
      {
        name: 'isPressed',
        type: 'boolean',
        defaultValue: false,
        description: 'Pressed/active state'
      },
    ],
  },
  HStack: {
    name: 'HStack',
    component: HStack,
    acceptsChildren: true,
    defaultProps: { spacing: 2 },
    propDefinitions: [
      {
        name: 'spacing',
        type: 'number',
        defaultValue: 2,
        description: 'Space between items (multiplier of 4px)'
      },
      {
        name: 'alignment',
        type: 'select',
        options: ['top', 'topLeft', 'topRight', 'left', 'center', 'right', 'bottom', 'bottomLeft', 'bottomRight', 'edge', 'stretch'],
        defaultValue: 'center',
        description: 'Vertical alignment'
      },
      {
        name: 'justify',
        type: 'select',
        options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start',
        description: 'Horizontal distribution'
      },
      {
        name: 'direction',
        type: 'select',
        options: ['row', 'column'],
        defaultValue: 'row',
        description: 'Content flow direction'
      },
      {
        name: 'expanded',
        type: 'boolean',
        defaultValue: false,
        description: 'Expand to max width'
      },
      {
        name: 'wrap',
        type: 'boolean',
        defaultValue: false,
        description: 'Allow items to wrap'
      },
    ],
  },
  VStack: {
    name: 'VStack',
    component: VStack,
    acceptsChildren: true,
    defaultProps: { spacing: 2 },
    propDefinitions: [
      {
        name: 'spacing',
        type: 'number',
        defaultValue: 2,
        description: 'Space between items (multiplier of 4px)'
      },
      {
        name: 'alignment',
        type: 'select',
        options: ['top', 'topLeft', 'topRight', 'left', 'center', 'right', 'bottom', 'bottomLeft', 'bottomRight', 'edge', 'stretch'],
        defaultValue: 'stretch',
        description: 'Horizontal alignment'
      },
      {
        name: 'justify',
        type: 'select',
        options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start',
        description: 'Vertical distribution'
      },
      {
        name: 'direction',
        type: 'select',
        options: ['column', 'row'],
        defaultValue: 'column',
        description: 'Content flow direction'
      },
      {
        name: 'expanded',
        type: 'boolean',
        defaultValue: false,
        description: 'Expand to max height'
      },
      {
        name: 'wrap',
        type: 'boolean',
        defaultValue: false,
        description: 'Allow items to wrap'
      },
    ],
  },
  Text: {
    name: 'Text',
    component: Text,
    acceptsChildren: false,
    defaultProps: { children: 'Text content' },
    propDefinitions: [
      {
        name: 'content',
        type: 'string',
        defaultValue: 'Text content',
        description: 'Text content',
      },
      {
        name: 'variant',
        type: 'select',
        options: ['body', 'muted', 'subtitle'],
        defaultValue: 'body',
      },
    ],
  },
  Heading: {
    name: 'Heading',
    component: Heading,
    acceptsChildren: false,
    defaultProps: { children: 'Heading', level: 2 },
    propDefinitions: [
      {
        name: 'content',
        type: 'string',
        defaultValue: 'Heading',
        description: 'Heading content',
      },
      {
        name: 'level',
        type: 'select',
        options: ['1', '2', '3', '4', '5', '6'],
        defaultValue: '2',
      },
    ],
  },

  // PHASE 1: Form Foundation
  TextControl: {
    name: 'TextControl',
    component: TextControl,
    acceptsChildren: false,
    defaultProps: { label: 'Text Field', value: '' },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Text Field',
        description: 'Field label',
      },
      {
        name: 'value',
        type: 'string',
        defaultValue: '',
        description: 'Field value',
      },
      {
        name: 'placeholder',
        type: 'string',
        defaultValue: '',
        description: 'Placeholder text',
      },
      {
        name: 'help',
        type: 'string',
        defaultValue: '',
        description: 'Help text below field',
      },
      {
        name: 'disabled',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable field',
      },
    ],
  },

  TextareaControl: {
    name: 'TextareaControl',
    component: TextareaControl,
    acceptsChildren: false,
    defaultProps: { label: 'Textarea', value: '' },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Textarea',
        description: 'Field label',
      },
      {
        name: 'value',
        type: 'string',
        defaultValue: '',
        description: 'Field value',
      },
      {
        name: 'placeholder',
        type: 'string',
        defaultValue: '',
        description: 'Placeholder text',
      },
      {
        name: 'help',
        type: 'string',
        defaultValue: '',
        description: 'Help text below field',
      },
      {
        name: 'rows',
        type: 'number',
        defaultValue: 4,
        description: 'Number of rows',
      },
      {
        name: 'disabled',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable field',
      },
    ],
  },

  SelectControl: {
    name: 'SelectControl',
    component: SelectControl,
    acceptsChildren: false,
    defaultProps: { label: 'Select', value: '', options: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Select',
        description: 'Field label',
      },
      {
        name: 'value',
        type: 'string',
        defaultValue: '',
        description: 'Selected value',
      },
      {
        name: 'help',
        type: 'string',
        defaultValue: '',
        description: 'Help text below field',
      },
      {
        name: 'disabled',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable field',
      },
    ],
  },

  Icon: {
    name: 'Icon',
    component: Icon,
    acceptsChildren: false,
    defaultProps: { icon: 'wordpress', size: 24 },
    propDefinitions: [
      {
        name: 'size',
        type: 'number',
        defaultValue: 24,
        description: 'Icon size in pixels',
      },
    ],
  },

  // PHASE 2: More Form Controls
  ToggleControl: {
    name: 'ToggleControl',
    component: ToggleControl,
    acceptsChildren: false,
    defaultProps: { label: 'Toggle', checked: false },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Toggle',
        description: 'Toggle label',
      },
      {
        name: 'checked',
        type: 'boolean',
        defaultValue: false,
        description: 'Toggle state',
      },
      {
        name: 'help',
        type: 'string',
        defaultValue: '',
        description: 'Help text below toggle',
      },
      {
        name: 'disabled',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable toggle',
      },
    ],
  },

  CheckboxControl: {
    name: 'CheckboxControl',
    component: CheckboxControl,
    acceptsChildren: false,
    defaultProps: { label: 'Checkbox', checked: false },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Checkbox',
        description: 'Checkbox label',
      },
      {
        name: 'checked',
        type: 'boolean',
        defaultValue: false,
        description: 'Checkbox state',
      },
      {
        name: 'help',
        type: 'string',
        defaultValue: '',
        description: 'Help text below checkbox',
      },
      {
        name: 'disabled',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable checkbox',
      },
    ],
  },

  SearchControl: {
    name: 'SearchControl',
    component: SearchControl,
    acceptsChildren: false,
    defaultProps: { label: 'Search', value: '' },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Search',
        description: 'Search label',
      },
      {
        name: 'value',
        type: 'string',
        defaultValue: '',
        description: 'Search value',
      },
      {
        name: 'placeholder',
        type: 'string',
        defaultValue: 'Search...',
        description: 'Placeholder text',
      },
      {
        name: 'help',
        type: 'string',
        defaultValue: '',
        description: 'Help text below search',
      },
    ],
  },

  NumberControl: {
    name: 'NumberControl',
    component: NumberControl,
    acceptsChildren: false,
    defaultProps: { label: 'Number', value: 0 },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Number',
        description: 'Field label',
      },
      {
        name: 'value',
        type: 'number',
        defaultValue: 0,
        description: 'Number value',
      },
      {
        name: 'min',
        type: 'number',
        defaultValue: 0,
        description: 'Minimum value',
      },
      {
        name: 'max',
        type: 'number',
        defaultValue: 100,
        description: 'Maximum value',
      },
      {
        name: 'step',
        type: 'number',
        defaultValue: 1,
        description: 'Step increment',
      },
      {
        name: 'disabled',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable field',
      },
    ],
  },

  RadioControl: {
    name: 'RadioControl',
    component: RadioControl,
    acceptsChildren: false,
    defaultProps: { label: 'Radio', selected: 'option1', options: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Radio',
        description: 'Radio group label',
      },
      {
        name: 'selected',
        type: 'string',
        defaultValue: 'option1',
        description: 'Selected value',
      },
      {
        name: 'help',
        type: 'string',
        defaultValue: '',
        description: 'Help text below radio',
      },
    ],
  },

  RangeControl: {
    name: 'RangeControl',
    component: RangeControl,
    acceptsChildren: false,
    defaultProps: { label: 'Range', value: 50 },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Range',
        description: 'Range label',
      },
      {
        name: 'value',
        type: 'number',
        defaultValue: 50,
        description: 'Current value',
      },
      {
        name: 'min',
        type: 'number',
        defaultValue: 0,
        description: 'Minimum value',
      },
      {
        name: 'max',
        type: 'number',
        defaultValue: 100,
        description: 'Maximum value',
      },
      {
        name: 'step',
        type: 'number',
        defaultValue: 1,
        description: 'Step increment',
      },
      {
        name: 'help',
        type: 'string',
        defaultValue: '',
        description: 'Help text below slider',
      },
    ],
  },

  ColorPicker: {
    name: 'ColorPicker',
    component: ColorPicker,
    acceptsChildren: false,
    defaultProps: { color: '#000000' },
    propDefinitions: [
      {
        name: 'color',
        type: 'string',
        defaultValue: '#000000',
        description: 'Color value (hex)',
      },
    ],
  },

  ColorPalette: {
    name: 'ColorPalette',
    component: ColorPalette,
    acceptsChildren: false,
    defaultProps: { value: '#000000', colors: [{ name: 'Black', color: '#000000' }, { name: 'White', color: '#ffffff' }, { name: 'Red', color: '#ff0000' }, { name: 'Blue', color: '#0000ff' }] },
    propDefinitions: [
      {
        name: 'value',
        type: 'string',
        defaultValue: '#000000',
        description: 'Selected color',
      },
    ],
  },

  // PHASE 3: Layout & Display
  Panel: {
    name: 'Panel',
    component: Panel,
    acceptsChildren: true,
    defaultProps: { header: 'Panel Header' },
    propDefinitions: [
      {
        name: 'header',
        type: 'string',
        defaultValue: 'Panel Header',
        description: 'Panel header text',
      },
    ],
  },

  PanelBody: {
    name: 'PanelBody',
    component: PanelBody,
    acceptsChildren: true,
    defaultProps: { title: 'Panel Section', initialOpen: true },
    propDefinitions: [
      {
        name: 'title',
        type: 'string',
        defaultValue: 'Panel Section',
        description: 'Section title',
      },
      {
        name: 'initialOpen',
        type: 'boolean',
        defaultValue: true,
        description: 'Initially open',
      },
      {
        name: 'opened',
        type: 'boolean',
        defaultValue: undefined,
        description: 'Controlled open state',
      },
    ],
  },

  PanelRow: {
    name: 'PanelRow',
    component: PanelRow,
    acceptsChildren: true,
    defaultProps: {},
    propDefinitions: [],
  },

  Flex: {
    name: 'Flex',
    component: Flex,
    acceptsChildren: true,
    defaultProps: { gap: 2 },
    propDefinitions: [
      {
        name: 'gap',
        type: 'number',
        defaultValue: 2,
        description: 'Gap between items (multiplier of 4px)',
      },
      {
        name: 'align',
        type: 'select',
        options: ['top', 'center', 'bottom', 'stretch'],
        defaultValue: 'center',
        description: 'Vertical alignment',
      },
      {
        name: 'justify',
        type: 'select',
        options: ['flex-start', 'center', 'flex-end', 'space-between'],
        defaultValue: 'flex-start',
        description: 'Horizontal distribution',
      },
      {
        name: 'direction',
        type: 'select',
        options: ['row', 'column'],
        defaultValue: 'row',
        description: 'Flex direction',
      },
    ],
  },

  FlexBlock: {
    name: 'FlexBlock',
    component: FlexBlock,
    acceptsChildren: true,
    defaultProps: {},
    propDefinitions: [],
  },

  FlexItem: {
    name: 'FlexItem',
    component: FlexItem,
    acceptsChildren: true,
    defaultProps: {},
    propDefinitions: [
      {
        name: 'display',
        type: 'select',
        options: ['block', 'flex', 'inline-flex'],
        defaultValue: 'block',
        description: 'Display mode',
      },
    ],
  },

  Spacer: {
    name: 'Spacer',
    component: Spacer,
    acceptsChildren: false,
    defaultProps: { margin: 2 },
    propDefinitions: [
      {
        name: 'margin',
        type: 'number',
        defaultValue: 2,
        description: 'Margin (multiplier of 4px)',
      },
      {
        name: 'marginTop',
        type: 'number',
        defaultValue: 0,
        description: 'Top margin',
      },
      {
        name: 'marginBottom',
        type: 'number',
        defaultValue: 0,
        description: 'Bottom margin',
      },
      {
        name: 'padding',
        type: 'number',
        defaultValue: 0,
        description: 'Padding',
      },
    ],
  },

  Divider: {
    name: 'Divider',
    component: Divider,
    acceptsChildren: false,
    defaultProps: { margin: 2 },
    propDefinitions: [
      {
        name: 'margin',
        type: 'number',
        defaultValue: 2,
        description: 'Margin (multiplier of 4px)',
      },
    ],
  },

  Truncate: {
    name: 'Truncate',
    component: Truncate,
    acceptsChildren: true,
    defaultProps: { numberOfLines: 1 },
    propDefinitions: [
      {
        name: 'numberOfLines',
        type: 'number',
        defaultValue: 1,
        description: 'Max lines before truncate',
      },
    ],
  },

  Tooltip: {
    name: 'Tooltip',
    component: Tooltip,
    acceptsChildren: true,
    defaultProps: { text: 'Tooltip text' },
    propDefinitions: [
      {
        name: 'text',
        type: 'string',
        defaultValue: 'Tooltip text',
        description: 'Tooltip content',
      },
      {
        name: 'placement',
        type: 'select',
        options: ['top', 'bottom', 'left', 'right'],
        defaultValue: 'top',
        description: 'Tooltip placement',
      },
    ],
  },

  // PHASE 4: Interactive Components
  Modal: {
    name: 'Modal',
    component: Modal,
    acceptsChildren: true,
    defaultProps: { title: 'Modal Title', isDismissible: true },
    propDefinitions: [
      {
        name: 'title',
        type: 'string',
        defaultValue: 'Modal Title',
        description: 'Modal title',
      },
      {
        name: 'isDismissible',
        type: 'boolean',
        defaultValue: true,
        description: 'Show close button',
      },
      {
        name: 'size',
        type: 'select',
        options: ['small', 'medium', 'large', 'fill'],
        defaultValue: 'medium',
        description: 'Modal size',
      },
    ],
  },

  Popover: {
    name: 'Popover',
    component: Popover,
    acceptsChildren: true,
    defaultProps: {},
    propDefinitions: [
      {
        name: 'placement',
        type: 'select',
        options: ['top', 'bottom', 'left', 'right'],
        defaultValue: 'bottom',
        description: 'Popover placement',
      },
    ],
  },

  TabPanel: {
    name: 'TabPanel',
    component: TabPanel,
    acceptsChildren: false,
    defaultProps: { tabs: [{ name: 'tab1', title: 'Tab 1' }, { name: 'tab2', title: 'Tab 2' }] },
    propDefinitions: [
      {
        name: 'initialTabName',
        type: 'string',
        defaultValue: 'tab1',
        description: 'Initial tab',
      },
    ],
  },

  MenuGroup: {
    name: 'MenuGroup',
    component: MenuGroup,
    acceptsChildren: true,
    defaultProps: { label: 'Menu Group' },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Menu Group',
        description: 'Group label',
      },
    ],
  },

  MenuItem: {
    name: 'MenuItem',
    component: MenuItem,
    acceptsChildren: true,
    defaultProps: {},
    propDefinitions: [
      {
        name: 'isDestructive',
        type: 'boolean',
        defaultValue: false,
        description: 'Destructive style',
      },
    ],
  },

  Spinner: {
    name: 'Spinner',
    component: Spinner,
    acceptsChildren: false,
    defaultProps: {},
    propDefinitions: [],
  },

  Notice: {
    name: 'Notice',
    component: Notice,
    acceptsChildren: true,
    defaultProps: { status: 'info', isDismissible: true },
    propDefinitions: [
      {
        name: 'status',
        type: 'select',
        options: ['success', 'info', 'warning', 'error'],
        defaultValue: 'info',
        description: 'Notice status',
      },
      {
        name: 'isDismissible',
        type: 'boolean',
        defaultValue: true,
        description: 'Show dismiss button',
      },
    ],
  },

  // PHASE 6: Typography & Advanced Controls
  DateTimePicker: {
    name: 'DateTimePicker',
    component: DateTimePicker,
    acceptsChildren: false,
    defaultProps: { currentDate: new Date().toISOString() },
    propDefinitions: [
      {
        name: 'currentDate',
        type: 'string',
        defaultValue: new Date().toISOString(),
        description: 'Current date (ISO format)',
      },
    ],
  },

  FontSizePicker: {
    name: 'FontSizePicker',
    component: FontSizePicker,
    acceptsChildren: false,
    defaultProps: { value: 16 },
    propDefinitions: [
      {
        name: 'value',
        type: 'number',
        defaultValue: 16,
        description: 'Font size in pixels',
      },
    ],
  },

  AnglePickerControl: {
    name: 'AnglePickerControl',
    component: AnglePickerControl,
    acceptsChildren: false,
    defaultProps: { value: 0, label: 'Angle' },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Angle',
        description: 'Control label',
      },
      {
        name: 'value',
        type: 'number',
        defaultValue: 0,
        description: 'Angle value (0-360)',
      },
    ],
  },

  BoxControl: {
    name: 'BoxControl',
    component: BoxControl,
    acceptsChildren: false,
    defaultProps: { label: 'Box Control' },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Box Control',
        description: 'Control label',
      },
    ],
  },

  BorderControl: {
    name: 'BorderControl',
    component: BorderControl,
    acceptsChildren: false,
    defaultProps: { label: 'Border' },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Border',
        description: 'Control label',
      },
    ],
  },

  FormTokenField: {
    name: 'FormTokenField',
    component: FormTokenField,
    acceptsChildren: false,
    defaultProps: { label: 'Tags', value: [] },
    propDefinitions: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'Tags',
        description: 'Field label',
      },
    ],
  },
};
