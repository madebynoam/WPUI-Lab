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
  TabPanel,
} from '@wordpress/components';
import { plus as plusIcon, trash as trashIcon } from '@wordpress/icons';
import { IconPicker } from './IconPicker';

export const PropertiesPanel: React.FC = () => {
  const PANEL_WIDTH = 280;
  const [activeTab, setActiveTab] = useState<'styles' | 'interactions'>('styles');
  const { selectedNodeIds, getNodeById, updateComponentProps, updateMultipleComponentProps, updateComponentName, tree, gridLinesVisible, toggleGridLines, pages, addInteraction, removeInteraction, updateInteraction } = useComponentTree();

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
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Canvas Layout</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <NumberControl
              label="Max Width"
              value={maxWidth}
              onChange={(value) => updateComponentProps(selectedNodeIds[0], { maxWidth: Number(value) })}
              help="Maximum width of the page content (px)"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 500, color: '#1e1e1e' }}>
              Background Color
            </div>
            <ColorPicker
              color={backgroundColor}
              onChange={(color) => updateComponentProps(selectedNodeIds[0], { backgroundColor: color })}
              enableAlpha
            />
            <div style={{ fontSize: '11px', color: '#757575', marginTop: '4px' }}>
              Page background color
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <NumberControl
              label="Padding"
              value={padding}
              onChange={(value) => updateComponentProps(selectedNodeIds[0], { padding: Number(value) })}
              help="Padding around the page content (px)"
            />
          </div>
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

  const renderStylesTab = () => (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
      {/* Layer Name - only for single select */}
      {!isMultiSelect && (
        <div style={{ marginBottom: '16px' }}>
          <TextControl
            label="Layer Name"
            value={firstNode.name || ''}
            onChange={(value) => updateComponentName(selectedNodeIds[0], value)}
            help="Custom name for this layer"
            placeholder={firstNode.type}
          />
        </div>
      )}

      {definition.propDefinitions.map((propDef) => {
        // For multi-select, show shared value if available, otherwise show first node's value
        // This allows setting properties even when they differ across selected nodes
        const currentValue = isMultiSelect
          ? (getSharedProps[propDef.name] !== undefined
              ? getSharedProps[propDef.name]
              : firstNode.props[propDef.name] ?? propDef.defaultValue)
          : firstNode.props[propDef.name] ?? propDef.defaultValue;

        // Show indicator if property is not shared in multi-select
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
        <>
          <div style={{
            marginTop: definition.propDefinitions.length > 0 ? '24px' : '0',
            paddingTop: definition.propDefinitions.length > 0 ? '16px' : '0',
            borderTop: definition.propDefinitions.length > 0 ? '1px solid #e0e0e0' : 'none',
            marginBottom: '16px',
          }}>
            <ToggleControl
              label="Show Grid Lines"
              checked={gridLinesVisible.has(selectedNodeIds[0])}
              onChange={() => toggleGridLines(selectedNodeIds[0])}
              help="Toggle grid overlay (Control+G)"
            />
          </div>
        </>
      )}

      {/* Grid child properties - only for single select */}
      {!isMultiSelect && isChildOfGrid && (
        <>
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #e0e0e0',
            marginBottom: '12px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>
              Grid Layout
            </div>
          </div>

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
        </>
      )}

      {definition.propDefinitions.length === 0 && !isChildOfGrid && (
        <div style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>
          No editable properties
        </div>
      )}
    </div>
  );

  const renderInteractionsTab = () => (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
      {/* List existing interactions */}
      <div style={{ marginBottom: '12px' }}>
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
      </div>

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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
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

          {/* WordPress TabPanel - part of header section */}
          <TabPanel
            className="wp-designer-properties__tabs"
            tabs={[
              {
                name: 'styles',
                title: 'Styles',
                className: 'wp-designer-tab-styles',
              },
              {
                name: 'interactions',
                title: 'Interactions',
                className: 'wp-designer-tab-interactions',
              },
            ]}
            onSelect={(tabName) => setActiveTab(tabName as 'styles' | 'interactions')}
            selectedTab={activeTab}
          >
            {(tab) => (
              <>
                {tab.name === 'styles' && renderStylesTab()}
                {tab.name === 'interactions' && renderInteractionsTab()}
              </>
            )}
          </TabPanel>
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
