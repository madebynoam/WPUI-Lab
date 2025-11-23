import React from 'react';
import { SearchControl, Icon } from '@wordpress/components';
import {
  paragraph,
  heading,
  table,
  column,
  button as buttonIcon,
  box,
  tag,
  brush,
  settings,
  blockDefault,
  pages,
  textColor,
  quote,
  search,
  shield,
  check,
  calendar,
  color,
  border,
  published,
  chevronDown,
} from '@wordpress/icons';
import { patterns, patternCategories } from '../patterns';
import { componentGroups } from './TreePanel';
import { TabContainer } from './TabContainer';

// Map component types to WordPress icons
const componentIconMap: Record<string, any> = {
  // Layout
  VStack: column,
  HStack: column,
  Grid: table,
  Flex: column,
  FlexBlock: column,
  FlexItem: column,
  // Containers
  Card: box,
  CardBody: box,
  CardHeader: box,
  Panel: box,
  PanelBody: box,
  PanelRow: box,
  // Content
  Text: paragraph,
  Heading: heading,
  Button: buttonIcon,
  Icon: pages,
  // Form Inputs
  TextControl: textColor,
  TextareaControl: quote,
  SelectControl: chevronDown,
  NumberControl: tag,
  SearchControl: search,
  ToggleControl: shield,
  CheckboxControl: check,
  RadioControl: published,
  RangeControl: tag,
  DateTimePicker: calendar,
  FontSizePicker: textColor,
  AnglePickerControl: tag,
  // Color
  ColorPicker: brush,
  ColorPalette: color,
  // Advanced
  BoxControl: box,
  BorderControl: border,
  FormTokenField: settings,
  TabPanel: settings,
  // Interactive
  Modal: pages,
  Popover: pages,
  Dropdown: settings,
  MenuGroup: settings,
  MenuItem: settings,
  Tooltip: pages,
  Notice: pages,
  // Utilities
  Spacer: blockDefault,
  Divider: blockDefault,
  Spinner: blockDefault,
  Truncate: blockDefault,
  // Data Display
  DataViews: table,
};

interface ComponentInserterProps {
  showInserter: boolean;
  onCloseInserter: () => void;
  onAddComponent: (componentType: string) => void;
  onAddPattern: (patternId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  inserterTab: 'blocks' | 'patterns';
  onTabChange: (tab: 'blocks' | 'patterns') => void;
}

export const ComponentInserter: React.FC<ComponentInserterProps> = ({
  showInserter,
  onCloseInserter,
  onAddComponent,
  onAddPattern,
  searchTerm,
  onSearchChange,
  inserterTab,
  onTabChange,
}) => {
  if (!showInserter) {
    return null;
  }

  // Primitive components to hide (auto-created by parent components)
  const hiddenPrimitives = new Set([
    'CardHeader',
    'CardBody',
    'PanelBody',
    'PanelRow',
    'FlexItem',
    'FlexBlock',
  ]);

  // Filter components based on search term and hide primitives
  const filteredGroups = componentGroups
    .map((group) => ({
      ...group,
      components: group.components.filter((comp) =>
        !hiddenPrimitives.has(comp) &&
        comp.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((group) => group.components.length > 0);

  // Filter patterns based on search term
  const filteredPatternCategories = patternCategories
    .map((category) => ({
      category,
      patterns: patterns.filter(
        (p) =>
          p.category === category &&
          (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    }))
    .filter((cat) => cat.patterns.length > 0);

  const handleAddComponent = (componentType: string) => {
    onAddComponent(componentType);
  };

  const handleAddPattern = (patternId: string) => {
    onAddPattern(patternId);
  };

  // Format component name for display (strip "Control" suffix)
  const formatComponentName = (name: string): string => {
    return name.endsWith('Control') ? name.slice(0, -7) : name;
  };

  const renderBlocksContent = () => (
    <>
      {/* Search */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
        <SearchControl
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search blocks..."
          __nextHasNoMarginBottom
        />
      </div>

      {/* Scrollable blocks */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px' }}>
        {filteredGroups.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              color: '#757575',
              fontSize: '13px',
            }}
          >
            No blocks found
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.name} style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  color: '#1e1e1e',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <Icon icon={group.icon} size={16} />
                {group.name}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                {group.components.map((comp) => (
                  <button
                    key={comp}
                    onClick={() => handleAddComponent(comp)}
                    style={{
                      padding: '8px 4px',
                      border: 'none',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textAlign: 'center',
                      transition: 'all 0.05s ease-in-out',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      minHeight: '64px',
                      justifyContent: 'center',
                      color: '#1e1e1e',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#3858e9';
                      e.currentTarget.style.backgroundColor = 'rgba(56, 88, 233, 0.04)';
                      // Change icon color by updating SVG fill
                      const svg = e.currentTarget.querySelector('svg');
                      if (svg) {
                        svg.style.fill = '#3858e9';
                        svg.style.color = '#3858e9';
                        // Also update any path elements inside
                        svg.querySelectorAll('path').forEach(path => {
                          path.style.fill = '#3858e9';
                        });
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#1e1e1e';
                      e.currentTarget.style.backgroundColor = '#fff';
                      const svg = e.currentTarget.querySelector('svg');
                      if (svg) {
                        svg.style.fill = 'currentColor';
                        svg.style.color = 'currentColor';
                        svg.querySelectorAll('path').forEach(path => {
                          path.style.fill = '';
                        });
                      }
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #3858e9';
                      e.currentTarget.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Icon icon={componentIconMap[comp] || blockDefault} size={24} />
                    <span style={{ whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2 }}>{formatComponentName(comp)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderPatternsContent = () => (
    <>
      {/* Search */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
        <SearchControl
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search patterns..."
          __nextHasNoMarginBottom
        />
      </div>

      {/* Scrollable patterns */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px' }}>
        {filteredPatternCategories.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              color: '#757575',
              fontSize: '13px',
            }}
          >
            No patterns found
          </div>
        ) : (
          filteredPatternCategories.map((cat) => (
            <div key={cat.category} style={{ marginBottom: '24px' }}>
              <div
                style={{
                  marginBottom: '12px',
                  color: '#757575',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {cat.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cat.patterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => handleAddPattern(pattern.id)}
                    style={{
                      padding: '12px',
                      border: 'none',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      textAlign: 'left',
                      transition: 'all 0.05s ease-in-out',
                    }}
                    onMouseEnter={(e) => {
                      const title = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                      if (title) {
                        title.style.color = '#3858e9';
                      }
                      e.currentTarget.style.backgroundColor = 'rgba(56, 88, 233, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      const title = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                      if (title) {
                        title.style.color = '#1e1e1e';
                      }
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #3858e9';
                      e.currentTarget.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        color: '#1e1e1e',
                        marginBottom: '4px',
                      }}
                    >
                      {pattern.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {pattern.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const tabsConfig = [
    {
      name: 'blocks',
      title: 'Blocks',
      panel: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {renderBlocksContent()}
        </div>
      ),
    },
    {
      name: 'patterns',
      title: 'Patterns',
      panel: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {renderPatternsContent()}
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid #e0e0e0',
        minHeight: 0,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <TabContainer
          tabs={tabsConfig}
          onClose={onCloseInserter}
          onSelect={(tabId: string) => onTabChange(tabId as 'blocks' | 'patterns')}
          selectedTab={inserterTab}
          defaultTabId="blocks"
          closeButtonLabel="Close inserter"
        />
      </div>
    </div>
  );
};
