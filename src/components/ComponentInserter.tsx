import React from 'react';
import { SearchControl, Icon, TabPanel } from '@wordpress/components';
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
} from '@wordpress/icons';
import { patterns, patternCategories } from '../patterns';
import { componentGroups } from './TreePanel';

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
  TextControl: tag,
  TextareaControl: tag,
  SelectControl: tag,
  NumberControl: tag,
  SearchControl: tag,
  ToggleControl: tag,
  CheckboxControl: tag,
  RadioControl: tag,
  RangeControl: tag,
  DateTimePicker: tag,
  FontSizePicker: tag,
  AnglePickerControl: tag,
  // Color
  ColorPicker: brush,
  ColorPalette: brush,
  // Advanced
  BoxControl: settings,
  BorderControl: settings,
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

  // Filter components based on search term
  const filteredGroups = componentGroups
    .map((group) => ({
      ...group,
      components: group.components.filter((comp) =>
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
    onCloseInserter();
    onSearchChange('');
  };

  const handleAddPattern = (patternId: string) => {
    onAddPattern(patternId);
    onCloseInserter();
    onSearchChange('');
  };

  const renderBlocksContent = () => (
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
                    padding: '12px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '2px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'center',
                    transition: 'all 0.1s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '64px',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0073aa';
                    e.currentTarget.style.boxShadow =
                      '0 2px 4px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.backgroundColor = '#f9f9f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#ddd';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  <Icon icon={componentIconMap[comp] || blockDefault} size={24} />
                  <span style={{ wordBreak: 'break-word' }}>{comp}</span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderPatternsContent = () => (
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
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2271b1';
                    e.currentTarget.style.boxShadow =
                      '0 2px 4px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
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
  );

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
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <TabPanel
          className="wp-designer-inserter-tabs"
          activeClass="is-active"
          onSelect={(tab) => onTabChange(tab as 'blocks' | 'patterns')}
          tabs={[
            { name: 'blocks', title: 'Blocks' },
            { name: 'patterns', title: 'Patterns' },
          ]}
          initialTabName={inserterTab}
        >
          {() => (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {/* Search */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
                <SearchControl
                  value={searchTerm}
                  onChange={onSearchChange}
                  placeholder={
                    inserterTab === 'blocks'
                      ? 'Search blocks...'
                      : 'Search patterns...'
                  }
                  __nextHasNoMarginBottom
                />
              </div>

              {/* Content */}
              {inserterTab === 'blocks'
                ? renderBlocksContent()
                : renderPatternsContent()}
            </div>
          )}
        </TabPanel>
      </div>
    </div>
  );
};
