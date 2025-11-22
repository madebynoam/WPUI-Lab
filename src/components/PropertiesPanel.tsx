import React, { useMemo, useState } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { componentRegistry } from '../componentRegistry';
import { findParent } from '../utils/treeHelpers';
import {
  TextControl,
  SelectControl,
  ToggleControl,
  __experimentalNumberControl as NumberControl,
  ColorPicker,
  Button,
  PanelBody,
  Popover,
} from '@wordpress/components';
import { plus as plusIcon, trash as trashIcon } from '@wordpress/icons';
import { IconPicker } from './IconPicker';
import { TabContainer } from './TabContainer';

// Color swatch button with popover
const ColorSwatchButton: React.FC<{
  color: string;
  label: string;
  onChange: (color: string) => void;
  help?: string;
}> = ({ color, label, onChange, help }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 500, color: '#1e1e1e' }}>
        {label}
      </div>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '40px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #ddd',
          borderRadius: '2px',
          backgroundColor: '#fff',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '2px',
            backgroundColor: color,
            border: '1px solid rgba(0, 0, 0, 0.1)',
          }}
        />
        <span style={{ fontSize: '13px', color: '#1e1e1e' }}>{color}</span>
      </Button>
      {isOpen && (
        <Popover
          placement="left-start"
          onClose={() => setIsOpen(false)}
        >
          <div style={{ padding: '16px' }}>
            <ColorPicker
              color={color}
              onChange={onChange}
              enableAlpha
            />
          </div>
        </Popover>
      )}
      {help && (
        <div style={{ fontSize: '11px', color: '#757575', marginTop: '4px' }}>
          {help}
        </div>
      )}
    </div>
  );
};

export const PropertiesPanel: React.FC = () => {
  const PANEL_WIDTH = 280;
  const [activeTab, setActiveTab] = useState<'styles' | 'interactions'>('styles');
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({ settings: true, gridLayout: true, theme: true });
  const { selectedNodeIds, getNodeById, updateComponentProps, updateMultipleComponentProps, updateComponentName, tree, gridLinesVisible, toggleGridLines, pages, currentPageId, updatePageTheme, addInteraction, removeInteraction, updateInteraction } = useComponentTree();

  const selectedNodes = useMemo(() => {
    return selectedNodeIds.map(id => getNodeById(id)).filter((n): n is NonNullable<ReturnType<typeof getNodeById>> => n !== null);
  }, [selectedNodeIds, getNodeById]);

  const isMultiSelect = selectedNodes.length > 1;
  const firstNode = selectedNodes[0];

  // Find shared properties for multi-select - must be called before any early returns
  const getSharedProps = useMemo(() => {
    if (!isMultiSelect || !firstNode) return firstNode?.props || {};

    const shared: Record<string, any> = {};
    const allPropNames = new Set<string>();

    // Collect all prop names from all nodes
    selectedNodes.forEach(node => {
      Object.keys(node.props || {}).forEach(key => allPropNames.add(key));
    });

    // Find props that have the same value across all nodes
    allPropNames.forEach(propName => {
      const values = selectedNodes.map(node => node.props[propName]);
      const firstValue = values[0];
      if (values.every(val => val === firstValue)) {
        shared[propName] = firstValue;
      }
    });

    return shared;
  }, [selectedNodes, isMultiSelect, firstNode]);

  if (selectedNodes.length === 0) {
    return (
      <div
        style={{
          width: `${PANEL_WIDTH}px`,
          borderLeft: '1px solid rgba(0, 0, 0, 0.133)',
          backgroundColor: '#fff',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>
          Select a component to edit properties
        </div>
      </div>
    );
  }

  if (!firstNode) return null;

  // Special case: Page-level properties for root VStack (only single select)
  if (selectedNodeIds.length === 1 && selectedNodeIds[0] === ROOT_VSTACK_ID) {
    const maxWidth = firstNode.props.maxWidth ?? 1440;
    const backgroundColor = firstNode.props.backgroundColor ?? 'rgb(249, 250, 251)';
    const padding = firstNode.props.padding ?? 20;

    // Get current page theme
    const currentPage = pages.find(p => p.id === currentPageId);
    const pageTheme = currentPage?.theme ?? { primaryColor: '#3858e9', backgroundColor: '#ffffff' };

    return (
      <div
        style={{
          width: `${PANEL_WIDTH}px`,
          borderLeft: '1px solid rgba(0, 0, 0, 0.133)',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Page Settings</h3>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Page Theme Section */}
          <PanelBody
            title="Page Theme"
            initialOpen={openPanels['theme']}
            onToggle={() => setOpenPanels({...openPanels, theme: !openPanels['theme']})}
          >
            <ColorSwatchButton
              color={pageTheme.primaryColor || '#3858e9'}
              label="Primary Color"
              onChange={(color) => updatePageTheme(currentPageId, { primaryColor: color })}
              help="Theme primary color for buttons and interactive elements"
            />
            <ColorSwatchButton
              color={pageTheme.backgroundColor || '#ffffff'}
              label="Theme Background Color"
              onChange={(color) => updatePageTheme(currentPageId, { backgroundColor: color })}
              help="Theme background color (affects foreground color calculations)"
            />
          </PanelBody>

          {/* Canvas Layout Section */}
          <PanelBody
            title="Canvas Layout"
            initialOpen={openPanels['layout']}
            onToggle={() => setOpenPanels({...openPanels, layout: !openPanels['layout']})}
          >
            <div style={{ marginBottom: '16px' }}>
              <NumberControl
                label="Max Width"
                value={maxWidth}
                onChange={(value) => updateComponentProps(selectedNodeIds[0], { maxWidth: Number(value) })}
                help="Maximum width of the page content (px)"
              />
            </div>

            <ColorSwatchButton
              color={backgroundColor}
              label="Canvas Background Color"
              onChange={(color) => updateComponentProps(selectedNodeIds[0], { backgroundColor: color })}
              help="Canvas background color"
            />

            <div style={{ marginBottom: '16px' }}>
              <NumberControl
                label="Padding"
                value={padding}
                onChange={(value) => updateComponentProps(selectedNodeIds[0], { padding: Number(value) })}
                help="Padding around the page content (px)"
              />
            </div>
          </PanelBody>
        </div>
      </div>
    );
  }

  // For multi-select, only show properties if all nodes are the same type
  const allSameType = selectedNodes.every(node => node.type === firstNode.type);
  if (isMultiSelect && !allSameType) {
    return (
      <div
        style={{
          width: `${PANEL_WIDTH}px`,
          borderLeft: '1px solid rgba(0, 0, 0, 0.133)',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Properties</h3>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {selectedNodes.length} items selected
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>
            Select items of the same type to edit shared properties
          </div>
        </div>
      </div>
    );
  }

  const definition = componentRegistry[firstNode.type];
  if (!definition) return null;

  // Find parent to check if it's a Grid (only for single select)
  const parent = !isMultiSelect ? findParent(tree, selectedNodeIds[0]) : null;
  const isChildOfGrid = parent?.type === 'Grid';

  const handlePropChange = (propName: string, value: any) => {
    // Apply to all selected nodes using batch update
    if (selectedNodeIds.length > 1) {
      updateMultipleComponentProps(selectedNodeIds, { [propName]: value });
    } else {
      updateComponentProps(selectedNodeIds[0], { [propName]: value });
    }
  };

  // Reset tab to styles for multi-select since interactions are only single-select
  if (isMultiSelect && activeTab === 'interactions') {
    setActiveTab('styles');
  }

  const renderStylesTab = () => {
    return (
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Layer Name - only for single select */}
        {!isMultiSelect && (
          <PanelBody title="Layer Name" initialOpen={true}>
            <TextControl
              value={firstNode.name || ''}
              onChange={(value) => updateComponentName(selectedNodeIds[0], value)}
              placeholder={firstNode.type}
            />
          </PanelBody>
        )}

        {/* Properties */}
      {definition.propDefinitions.length > 0 && (
        <PanelBody
          title="Settings"
          initialOpen={openPanels['settings']}
          onToggle={() => setOpenPanels({...openPanels, settings: !openPanels['settings']})}
        >
          {definition.propDefinitions.map((propDef) => {
            const currentValue = isMultiSelect
              ? (getSharedProps[propDef.name] !== undefined
                  ? getSharedProps[propDef.name]
                  : firstNode.props[propDef.name] ?? propDef.defaultValue)
              : firstNode.props[propDef.name] ?? propDef.defaultValue;

            const isShared = !isMultiSelect || (propDef.name in getSharedProps);

            return (
              <div key={propDef.name} style={{ marginBottom: '16px' }}>
                {propDef.type === 'string' && (
                  <TextControl
                    label={propDef.name}
                    value={currentValue || ''}
                    onChange={(value) => handlePropChange(propDef.name, value)}
                    help={isMultiSelect && !isShared ? `${propDef.description} (applying to all ${selectedNodes.length} items)` : propDef.description}
                    placeholder={isMultiSelect && !isShared ? 'Mixed values' : undefined}
                  />
                )}

                {propDef.type === 'number' && (
                  <NumberControl
                    label={propDef.name}
                    value={currentValue}
                    onChange={(value) => handlePropChange(propDef.name, Number(value))}
                    help={isMultiSelect && !isShared ? `${propDef.description} (applying to all ${selectedNodes.length} items)` : propDef.description}
                  />
                )}

                {propDef.type === 'boolean' && (
                  <ToggleControl
                    label={propDef.name}
                    checked={currentValue || false}
                    onChange={(value) => handlePropChange(propDef.name, value)}
                    help={isMultiSelect && !isShared ? `${propDef.description} (applying to all ${selectedNodes.length} items)` : propDef.description}
                  />
                )}

                {propDef.type === 'select' && propDef.name === 'icon' && (
                  <IconPicker
                    label={propDef.name}
                    value={currentValue}
                    onChange={(value) => handlePropChange(propDef.name, value)}
                  />
                )}

                {propDef.type === 'select' && propDef.name !== 'icon' && propDef.options && (
                  <SelectControl
                    label={propDef.name}
                    value={currentValue}
                    options={propDef.options.map((opt) => ({ label: opt, value: opt }))}
                    onChange={(value) => handlePropChange(propDef.name, value)}
                    help={isMultiSelect && !isShared ? `${propDef.description} (applying to all ${selectedNodes.length} items)` : propDef.description}
                  />
                )}
              </div>
            );
          })}

          {/* Grid Lines Toggle - only for Grid components, single select */}
          {!isMultiSelect && firstNode.type === 'Grid' && (
            <ToggleControl
              label="Show Grid Lines"
              checked={gridLinesVisible.has(selectedNodeIds[0])}
              onChange={() => toggleGridLines(selectedNodeIds[0])}
              help="Toggle grid overlay (Control+G)"
            />
          )}
        </PanelBody>
      )}

      {/* Grid child properties - only for single select */}
      {!isMultiSelect && isChildOfGrid && (
        <PanelBody
          title="Grid Layout"
          initialOpen={openPanels['gridLayout']}
          onToggle={() => setOpenPanels({...openPanels, gridLayout: !openPanels['gridLayout']})}
        >
          <div style={{ marginBottom: '16px' }}>
            <NumberControl
              label="Column Span"
              value={firstNode.props.gridColumnSpan || 1}
              onChange={(value) => handlePropChange('gridColumnSpan', Number(value))}
              help="Number of columns to span"
              min={1}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <NumberControl
              label="Row Span"
              value={firstNode.props.gridRowSpan || 1}
              onChange={(value) => handlePropChange('gridRowSpan', Number(value))}
              help="Number of rows to span"
              min={1}
            />
          </div>
        </PanelBody>
      )}

      {definition.propDefinitions.length === 0 && !isChildOfGrid && (
        <div style={{ color: '#999', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
          No editable properties
        </div>
      )}
    </div>
    );
  };

  const renderInteractionsTab = () => (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <PanelBody title="Interactions" initialOpen={true}>
        {(firstNode.interactions || []).map((interaction) => (
          <div
            key={interaction.id}
            style={{
              padding: '12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '2px',
              marginBottom: '8px',
              fontSize: '12px',
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>
              {interaction.trigger === 'onClick' ? 'On Click' : interaction.trigger}
            </div>

            {interaction.action === 'navigate' && (
              <div style={{ marginBottom: '8px' }}>
                <SelectControl
                  label="Navigate to page"
                  value={interaction.targetId}
                  options={pages.map(page => ({
                    label: page.name,
                    value: page.id,
                  }))}
                  onChange={(newPageId) => {
                    updateInteraction(selectedNodeIds[0], interaction.id, {
                      trigger: interaction.trigger,
                      action: interaction.action,
                      targetId: newPageId,
                    });
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                icon={trashIcon}
                iconSize={16}
                onClick={() => removeInteraction(selectedNodeIds[0], interaction.id)}
                style={{ flexShrink: 0 }}
              />
            </div>
          </div>
        ))}

        {/* Add interaction button */}
        <Button
          variant="secondary"
          size="small"
          icon={plusIcon}
          onClick={() => {
            // Add default navigate interaction - use first page if available
            const targetPageId = pages.length > 0 ? pages[0].id : 'unknown';
            addInteraction(selectedNodeIds[0], {
              trigger: 'onClick',
              action: 'navigate',
              targetId: targetPageId,
            });
          }}
        >
          Add Interaction
        </Button>
      </PanelBody>
    </div>
  );

  return (
    <div
      style={{
        width: `${PANEL_WIDTH}px`,
        borderLeft: '1px solid rgba(0, 0, 0, 0.133)',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header with component icon, name, description and tabs */}
      {!isMultiSelect && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', flexShrink: 0 }}>
                {/* Placeholder for component icon - could be enhanced later */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#666'
                }}>
                  {firstNode.type.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e1e1e' }}>
                  {firstNode.type}
                </h3>
                {definition.description && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {definition.description}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TabContainer */}
          <TabContainer
            tabs={[
              {
                name: 'styles',
                title: 'Styles',
                panel: renderStylesTab(),
              },
              {
                name: 'interactions',
                title: 'Interactions',
                panel: renderInteractionsTab(),
              },
            ]}
            selectedTab={activeTab}
            onSelect={(tabName) => setActiveTab(tabName as 'styles' | 'interactions')}
          />
        </div>
      )}

      {/* Header for multi-select (no tabs) */}
      {isMultiSelect && (
        <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '32px', height: '32px', flexShrink: 0 }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#f0f0f0',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: '#666'
              }}>
                {firstNode.type.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e1e1e' }}>
                {firstNode.type}
              </h3>
              {definition.description && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {definition.description}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* For multi-select, just show styles */}
      {isMultiSelect && renderStylesTab()}
    </div>
  );
};
