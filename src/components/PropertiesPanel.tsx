import React from 'react';
import { useComponentTree } from '../ComponentTreeContext';
import { componentRegistry } from '../componentRegistry';
import {
  TextControl,
  SelectControl,
  ToggleControl,
  __experimentalNumberControl as NumberControl,
} from '@wordpress/components';

export const PropertiesPanel: React.FC = () => {
  const { selectedNodeId, getNodeById, updateComponentProps, tree } = useComponentTree();

  if (!selectedNodeId) {
    return (
      <div
        style={{
          width: '300px',
          borderLeft: '1px solid #ccc',
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
        width: '300px',
        borderLeft: '1px solid #ccc',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Properties</h3>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{node.type}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
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
              <TextControl
                label="gridColumn"
                value={node.props.gridColumn || ''}
                onChange={(value) => handlePropChange('gridColumn', value)}
                help="Column span (e.g., 'span 2' or '1 / 3')"
                placeholder="auto"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <TextControl
                label="gridRow"
                value={node.props.gridRow || ''}
                onChange={(value) => handlePropChange('gridRow', value)}
                help="Row span (e.g., 'span 2' or '1 / 3')"
                placeholder="auto"
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
