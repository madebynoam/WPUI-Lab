import React from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { componentRegistry } from '../componentRegistry';
import {
  TextControl,
  SelectControl,
  ToggleControl,
  __experimentalNumberControl as NumberControl,
  ColorPicker,
} from '@wordpress/components';

export const PropertiesPanel: React.FC = () => {
  const { selectedNodeId, getNodeById, updateComponentProps, updateComponentName, tree, gridLinesVisible, toggleGridLines } = useComponentTree();

  if (!selectedNodeId) {
    return (
      <div
        style={{
          width: '280px',
          borderLeft: '1px solid rgba(0, 0, 0, 0.133)',
          backgroundColor: '#fff',
          padding: '16px',
        }}
      >
        <div style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>
          Select a component to edit properties
        </div>
      </div>
    );
  }

  const node = getNodeById(selectedNodeId);
  if (!node) return null;

  // Special case: Page-level properties for root VStack
  if (selectedNodeId === ROOT_VSTACK_ID) {
    const maxWidth = node.props.maxWidth ?? 1440;
    const backgroundColor = node.props.backgroundColor ?? 'rgb(249, 250, 251)';
    const padding = node.props.padding ?? 20;

    return (
      <div
        style={{
          width: '280px',
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
              onChange={(value) => updateComponentProps(selectedNodeId, { maxWidth: Number(value) })}
              help="Maximum width of the page content (px)"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 500, color: '#1e1e1e' }}>
              Background Color
            </div>
            <ColorPicker
              color={backgroundColor}
              onChange={(color) => updateComponentProps(selectedNodeId, { backgroundColor: color })}
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
              onChange={(value) => updateComponentProps(selectedNodeId, { padding: Number(value) })}
              help="Padding around the page content (px)"
            />
          </div>
        </div>
      </div>
    );
  }

  const definition = componentRegistry[node.type];
  if (!definition) return null;

  // Find parent to check if it's a Grid
  const findParent = (nodes: any[], targetId: string): any => {
    for (const n of nodes) {
      if (n.children) {
        if (n.children.find((c: any) => c.id === targetId)) {
          return n;
        }
        const found = findParent(n.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const parent = findParent(tree, selectedNodeId);
  const isChildOfGrid = parent?.type === 'Grid';

  const handlePropChange = (propName: string, value: any) => {
    updateComponentProps(selectedNodeId, { [propName]: value });
  };

  return (
    <div
      style={{
        width: '280px',
        borderLeft: '1px solid rgba(0, 0, 0, 0.133)',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Properties</h3>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{node.type}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Layer Name */}
        <div style={{ marginBottom: '16px' }}>
          <TextControl
            label="Layer Name"
            value={node.name || ''}
            onChange={(value) => updateComponentName(selectedNodeId, value)}
            help="Custom name for this layer"
            placeholder={node.type}
          />
        </div>

        {definition.propDefinitions.map((propDef) => {
          const currentValue = node.props[propDef.name] ?? propDef.defaultValue;

          return (
            <div key={propDef.name} style={{ marginBottom: '16px' }}>
              {propDef.type === 'string' && (
                <TextControl
                  label={propDef.name}
                  value={currentValue || ''}
                  onChange={(value) => handlePropChange(propDef.name, value)}
                  help={propDef.description}
                />
              )}

              {propDef.type === 'number' && (
                <NumberControl
                  label={propDef.name}
                  value={currentValue}
                  onChange={(value) => handlePropChange(propDef.name, Number(value))}
                  help={propDef.description}
                />
              )}

              {propDef.type === 'boolean' && (
                <ToggleControl
                  label={propDef.name}
                  checked={currentValue || false}
                  onChange={(value) => handlePropChange(propDef.name, value)}
                  help={propDef.description}
                />
              )}

              {propDef.type === 'select' && propDef.options && (
                <SelectControl
                  label={propDef.name}
                  value={currentValue}
                  options={propDef.options.map((opt) => ({ label: opt, value: opt }))}
                  onChange={(value) => handlePropChange(propDef.name, value)}
                  help={propDef.description}
                />
              )}
            </div>
          );
        })}

        {/* Grid Lines Toggle - only for Grid components */}
        {node.type === 'Grid' && (
          <>
            <div style={{
              marginTop: definition.propDefinitions.length > 0 ? '24px' : '0',
              paddingTop: definition.propDefinitions.length > 0 ? '16px' : '0',
              borderTop: definition.propDefinitions.length > 0 ? '1px solid #e0e0e0' : 'none',
              marginBottom: '16px',
            }}>
              <ToggleControl
                label="Show Grid Lines"
                checked={gridLinesVisible.has(selectedNodeId)}
                onChange={() => toggleGridLines(selectedNodeId)}
                help="Toggle grid overlay (Control+G)"
              />
            </div>
          </>
        )}

        {/* Grid child properties */}
        {isChildOfGrid && (
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
                value={node.props.gridColumnSpan || 1}
                onChange={(value) => handlePropChange('gridColumnSpan', Number(value))}
                help="Number of columns to span"
                min={1}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <NumberControl
                label="Row Span"
                value={node.props.gridRowSpan || 1}
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
    </div>
  );
};
