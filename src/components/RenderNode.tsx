import React from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { usePlayModeState } from '../PlayModeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import * as wpIcons from '@wordpress/icons';
import { INTERACTIVE_COMPONENT_TYPES } from './TreePanel';
import { getMockData, getFieldDefinitions, DataSetType } from '../utils/mockDataGenerator';

export const RenderNode: React.FC<{ node: ComponentNode; renderInteractive?: boolean }> = ({ node, renderInteractive = true }) => {
  const { toggleNodeSelection, selectedNodeIds, tree, gridLinesVisible, isPlayMode, pages, currentPageId, setPlayMode, updateComponentProps, setCurrentPage } = useComponentTree();
  const playModeState = usePlayModeState();
  const definition = componentRegistry[node.type];

  if (!definition) {
    return <div>Unknown component: {node.type}</div>;
  }

  // Execute interactions on a component
  const executeInteractions = (nodeInteractions: any[] | undefined) => {
    if (!nodeInteractions || nodeInteractions.length === 0) return;

    nodeInteractions.forEach((interaction) => {
      if (interaction.trigger === 'onClick') {
        if (interaction.action === 'navigate') {
          // Navigate to the target page
          const targetPage = pages.find(p => p.id === interaction.targetId);
          if (targetPage) {
            setCurrentPage(interaction.targetId);
          }
        } else if (interaction.action === 'showModal') {
          // Find the target component (modal) and show it
          console.log('Show modal:', interaction.targetId);
          // This would require a more complex state management for modal visibility
        }
      }
    });
  };

  // Skip rendering interactive components unless explicitly allowed
  if (INTERACTIVE_COMPONENT_TYPES.includes(node.type) && !renderInteractive) {
    return null;
  }

  const Component = definition.component;
  let props = { ...node.props };

  // Extract grid child properties to apply to wrapper
  const gridColumnSpan = props.gridColumnSpan;
  const gridRowSpan = props.gridRowSpan;
  delete props.gridColumnSpan;
  delete props.gridRowSpan;

  // Convert span numbers to CSS grid syntax
  const gridColumn = gridColumnSpan && gridColumnSpan > 1 ? `span ${gridColumnSpan}` : undefined;
  const gridRow = gridRowSpan && gridRowSpan > 1 ? `span ${gridRowSpan}` : undefined;

  // Base wrapper style with grid child properties
  const isRootVStack = node.id === ROOT_VSTACK_ID;
  const isSelected = selectedNodeIds.includes(node.id);
  const getWrapperStyle = (additionalStyles: React.CSSProperties = {}) => ({
    outline: isSelected && !isRootVStack && !isPlayMode ? '2px solid #3858e9' : 'none',
    cursor: isPlayMode && node.interactions && node.interactions.length > 0 ? 'pointer' : 'default',
    ...(gridColumn && { gridColumn }),
    ...(gridRow && { gridRow }),
    ...additionalStyles,
  });

  // Handle components with special text/content props
  if (node.type === 'Text' || node.type === 'Heading') {
    // Data is normalized at the boundary, so content is always in props.children
    const content = props.children || definition.defaultProps?.children;

    return (
      <div
        data-component-id={node.id}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (isPlayMode) {
            executeInteractions(node.interactions);
          } else {
            const multiSelect = e.metaKey || e.ctrlKey;
            const rangeSelect = e.shiftKey;
            toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
          }
        }}
        style={getWrapperStyle()}
      >
        <Component {...props}>{content}</Component>
      </div>
    );
  }

  // Handle Button text prop
  if (node.type === 'Button') {
    // Merge with defaultProps to ensure variant='primary' is applied by default
    const mergedProps = { ...definition.defaultProps, ...props };
    const text = mergedProps.text || 'Button';
    delete mergedProps.text;

    return (
      <div
        data-component-id={node.id}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (isPlayMode) {
            executeInteractions(node.interactions);
          } else {
            const multiSelect = e.metaKey || e.ctrlKey;
            const rangeSelect = e.shiftKey;
            toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
          }
        }}
        style={getWrapperStyle({ display: 'inline-block' })}
      >
        <Component {...mergedProps}>{text}</Component>
      </div>
    );
  }

  // Handle Icon component - needs icon prop from @wordpress/icons
  if (node.type === 'Icon') {
    // Get icon name from props and map to actual icon object
    const iconName = props.icon || 'wordpress';
    const iconProp = (wpIcons as Record<string, any>)[iconName] || (wpIcons as Record<string, any>).wordpress;
    delete props.icon;

    return (
      <div
        data-component-id={node.id}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (isPlayMode) {
            executeInteractions(node.interactions);
          } else {
            const multiSelect = e.metaKey || e.ctrlKey;
            const rangeSelect = e.shiftKey;
            toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
          }
        }}
        style={getWrapperStyle({ display: 'inline-block' })}
      >
        <Component icon={iconProp} {...props} />
      </div>
    );
  }

  // Handle interactive components (Modal, Popover, etc.) specially
  if (INTERACTIVE_COMPONENT_TYPES.includes(node.type)) {
    // For Modal in isolated view, render content directly without the overlay
    if (node.type === 'Modal') {
      // Render Modal content directly without the blocking overlay
      return (
        <div
          data-component-id={node.id}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (isPlayMode) {
              executeInteractions(node.interactions);
            } else {
              const multiSelect = e.metaKey || e.ctrlKey;
              const rangeSelect = e.shiftKey;
              toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
            }
          }}
          style={{
            ...getWrapperStyle(),
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            minWidth: '400px',
            maxWidth: '600px',
          }}
        >
          {/* Modal header */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e0e0e0',
            fontWeight: 600,
            fontSize: '14px',
          }}>
            {props.title || 'Modal Title'}
          </div>

          {/* Modal content */}
          <div style={{ padding: '24px' }}>
            {node.children && node.children.length > 0
              ? node.children.map((child) => <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />)
              : <div style={{ padding: '20px', color: '#666', textAlign: 'center' }}>Add components inside this Modal</div>}
          </div>
        </div>
      );
    }

    // For other interactive components, render normally
    const mergedProps = { ...definition.defaultProps, ...props };
    return (
      <div
        data-component-id={node.id}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (isPlayMode) {
            executeInteractions(node.interactions);
          } else {
            const multiSelect = e.metaKey || e.ctrlKey;
            const rangeSelect = e.shiftKey;
            toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
          }
        }}
        style={getWrapperStyle()}
      >
        <Component {...mergedProps}>
          {node.children && node.children.length > 0
            ? node.children.map((child) => <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />)
            : null}
        </Component>
      </div>
    );
  }

  // DataViews component - special handling for data-driven component
  if (node.type === 'DataViews') {
    try {
      const dataSource = (props.dataSource || 'blog') as DataSetType;
      const viewType = props.viewType || 'table';
      const itemsPerPage = props.itemsPerPage || 10;

      // Auto-detect custom data or use mock data
      let mockData, fields;

      // SMART MODE: If data prop is provided, use it (regardless of dataSource)
      if (props.data && Array.isArray(props.data) && props.data.length > 0) {
        mockData = props.data;

        // Accept both 'columns' and 'fields' props (LLM might use either)
        const columnDefs = props.columns || props.fields;

        if (columnDefs && Array.isArray(columnDefs) && columnDefs.length > 0) {
          // Generate field definitions from column/field definitions
          fields = columnDefs.map((col: any) => {
            // Handle both string format and object format
            const id = typeof col === 'string' ? col : (col.id || col.accessor || col);
            const label = typeof col === 'string' ? col : (col.label || col.header || id);

            return {
              id,
              label,
              type: 'text',
              enableSorting: true,
              enableHiding: true,
              getValue: (item: any) => item[id],
              render: ({ item }: any) => String(item[id] || ''),
            };
          });
        } else {
          // Auto-detect columns from first data item
          const firstItem = mockData[0];
          fields = Object.keys(firstItem).map(key => ({
            id: key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            type: 'text',
            enableSorting: true,
            enableHiding: true,
            getValue: (item: any) => item[key],
            render: ({ item }: any) => String(item[key] || ''),
          }));
        }
      } else {
        // Fall back to mock data based on dataSource
        mockData = getMockData(dataSource);
        fields = getFieldDefinitions(dataSource);
      }

      // Validate data and fields exist
      if (!mockData || !Array.isArray(mockData) || mockData.length === 0) {
        console.warn(`DataViews: No data available for source "${dataSource}"`);
      }
      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        console.warn(`DataViews: No field definitions available for source "${dataSource}"`);
      }

      // Ensure valid sort field and visible fields
      const sortField = fields && fields.length > 0 ? fields[0].id : 'id';
      const visibleFieldIds = fields ? fields.map(f => f.id) : [];

      // Default view state based on design-time props
      const defaultView = {
        type: viewType,
        perPage: itemsPerPage,
        page: 1,
        filters: [],
        search: '',
        fields: visibleFieldIds,
        sort: {
          field: sortField,
          direction: 'asc' as const,
        },
      };

      // In play mode, use runtime view state; in design mode, use default
      const currentView = isPlayMode
        ? (playModeState.getState(node.id, 'view') ?? defaultView)
        : defaultView;

      // Apply search, filters, and sort to the data
      let processedData = mockData || [];

      // Apply search filter
      if (currentView.search) {
        const searchLower = currentView.search.toLowerCase();
        processedData = processedData.filter((item: any) => {
          // Search across all fields
          return fields.some((field: any) => {
            const value = field.getValue?.(item) ?? item[field.id];
            return String(value).toLowerCase().includes(searchLower);
          });
        });
      }

      // Apply filters
      if (currentView.filters && currentView.filters.length > 0) {
        try {
          processedData = processedData.filter((item: any) => {
            return currentView.filters.every((filter: any) => {
              try {
                // Get the field definition to use getValue if available
                const field = fields.find((f: any) => f.id === filter.field);
                const value = field?.getValue?.(item) ?? item[filter.field];
                const filterValue = filter.value;

                switch (filter.operator) {
                  // Equality operators
                  case 'is':
                    return value === filterValue;
                  case 'isNot':
                    return value !== filterValue;

                  // Array operators
                  case 'isAny':
                    return Array.isArray(filterValue) && filterValue.includes(value);
                  case 'isNone':
                    return Array.isArray(filterValue) && !filterValue.includes(value);
                  case 'isAll':
                    return Array.isArray(filterValue) && filterValue.every((v: any) => value.includes(v));

                  // Numerical comparison operators (without 'is' prefix)
                  case 'greaterThan':
                    return Number(value) > Number(filterValue);
                  case 'greaterThanOrEqual':
                    return Number(value) >= Number(filterValue);
                  case 'lessThan':
                    return Number(value) < Number(filterValue);
                  case 'lessThanOrEqual':
                    return Number(value) <= Number(filterValue);

                  // Text operators
                  case 'contains':
                    return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                  case 'notContains':
                    return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                  case 'startsWith':
                    return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());

                  // Default: pass filter if unknown operator
                  default:
                    console.warn(`Unknown filter operator: ${filter.operator}`);
                    return true;
                }
              } catch (error) {
                console.error('Error applying filter:', error, filter);
                return true; // Pass through on error to avoid crash
              }
            });
          });
        } catch (error) {
          console.error('Error in filter processing:', error);
          // Keep original data if filtering fails
        }
      }

      // Apply sorting
      if (currentView.sort) {
        const { field: sortField, direction } = currentView.sort;
        processedData = [...processedData].sort((a: any, b: any) => {
          const aValue = a[sortField];
          const bValue = b[sortField];

          if (aValue === bValue) return 0;

          const comparison = aValue < bValue ? -1 : 1;
          return direction === 'asc' ? comparison : -comparison;
        });
      }

      const mergedProps = {
        data: processedData,
        fields: fields || [],
        view: currentView,
        paginationInfo: {
          totalItems: processedData.length,
          totalPages: Math.ceil(processedData.length / (currentView.perPage || itemsPerPage)),
        },
        // REQUIRED: defaultLayouts tells DataViews which layout types are available
        // Without this, DataViews crashes with "Cannot convert undefined or null to object"
        defaultLayouts: {
          table: {},
          grid: {},
          list: {},
        },
        onChangeView: isPlayMode
          ? (newView: any) => playModeState.setState(node.id, 'view', newView)
          : () => {}, // Disabled in design mode
        getItemId: (item: any) => item?.id || `item-${Math.random()}`,
      };

      // Debug logging
      console.log('DataViews props:', {
        dataCount: mergedProps.data.length,
        fieldCount: mergedProps.fields.length,
        fieldIds: mergedProps.fields.map(f => f.id),
        fields: mergedProps.fields,
        sampleData: mergedProps.data.slice(0, 1),
        view: mergedProps.view,
        paginationInfo: mergedProps.paginationInfo,
        defaultLayouts: mergedProps.defaultLayouts,
      });

      // Test getValue functions on sample data
      if (mergedProps.data.length > 0) {
        const testItem = mergedProps.data[0];
        console.log('Testing getValue on first item:', {
          item: testItem,
          titleValue: mergedProps.fields[0]?.getValue?.(testItem),
        });
      }

      return (
        <div
          data-component-id={node.id}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (isPlayMode) {
              executeInteractions(node.interactions);
            } else {
              const multiSelect = e.metaKey || e.ctrlKey;
              const rangeSelect = e.shiftKey;
              toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
            }
          }}
          style={getWrapperStyle({ minHeight: '400px', height: '100%' })}
        >
          <Component {...mergedProps} />
        </div>
      );
    } catch (error) {
      console.error('DataViews rendering error:', error);
      return (
        <div
          data-component-id={node.id}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (isPlayMode) {
              executeInteractions(node.interactions);
            } else {
              const multiSelect = e.metaKey || e.ctrlKey;
              const rangeSelect = e.shiftKey;
              toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
            }
          }}
          style={{
            ...getWrapperStyle(),
            padding: '16px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#856404',
          }}
        >
          <strong>DataViews Error:</strong> Failed to render component. Check console for details.
        </div>
      );
    }
  }

  // Form controls and self-contained components (don't accept children)
  const formControls = [
    'TextControl',
    'TextareaControl',
    'SelectControl',
    'ToggleControl',
    'CheckboxControl',
    'SearchControl',
    'NumberControl',
    'RadioControl',
    'RangeControl',
    'ColorPicker',
    'ColorPalette',
    'Spacer',
    'Divider',
    'Spinner',
    'DateTimePicker',
    'FontSizePicker',
    'AnglePickerControl',
    'BoxControl',
    'BorderControl',
    'FormTokenField',
    'TabPanel',
  ];

  if (formControls.includes(node.type)) {
    const mergedProps = { ...definition.defaultProps, ...props };

    if (isPlayMode) {
      // In play mode: enable real interaction with runtime state
      // Determine the state prop name based on component type
      const statePropName = ['ToggleControl', 'CheckboxControl'].includes(node.type) ? 'checked' : 'value';

      // Get runtime value or fall back to design-time default
      const runtimeValue = playModeState.getState(node.id, statePropName) ?? props[statePropName];
      mergedProps[statePropName] = runtimeValue;

      // Wire up real onChange handler
      mergedProps.onChange = (newValue: any) => {
        playModeState.setState(node.id, statePropName, newValue);
      };
    } else {
      // In design mode: disable interaction
      mergedProps.onChange = () => {};
    }

    return (
      <div
        data-component-id={node.id}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (isPlayMode) {
            executeInteractions(node.interactions);
          } else {
            const multiSelect = e.metaKey || e.ctrlKey;
            const rangeSelect = e.shiftKey;
            toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
          }
        }}
        style={getWrapperStyle({ padding: '4px' })}
      >
        <Component {...mergedProps} />
      </div>
    );
  }

  // Regular components with children - merge with defaultProps
  const mergedProps = { ...definition.defaultProps, ...props };

  // Check if this is a Grid with grid lines enabled
  const showGridLines = node.type === 'Grid' && gridLinesVisible.has(node.id);

  // Check if Grid is empty
  const isEmptyGrid = node.type === 'Grid' && (!node.children || node.children.length === 0);

  return (
    <div
      data-component-id={node.id}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (isPlayMode) {
          executeInteractions(node.interactions);
        } else {
          const multiSelect = e.metaKey || e.ctrlKey;
          const rangeSelect = e.shiftKey;
          toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
        }
      }}
      style={{ ...getWrapperStyle(), position: showGridLines ? 'relative' : undefined }}
    >
      <Component {...mergedProps}>
        {node.children && node.children.length > 0
          ? node.children.map((child) => <RenderNode key={child.id} node={child} renderInteractive={renderInteractive} />)
          : isEmptyGrid && !isPlayMode ? (
              <div style={{
                minHeight: '120px',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '14px',
                borderRadius: '2px',
                gridColumn: `1 / -1`, // Span all columns
              }}>
                Add items to the grid
              </div>
            ) : null}
      </Component>

      {/* Grid Lines Overlay */}
      {showGridLines && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <svg
            width="100%"
            height="100%"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {(() => {
              // Get grid properties
              const columns = mergedProps.columns || 2;
              // gap is a multiplier of 4px in WordPress components
              const gapMultiplier = typeof mergedProps.gap === 'number' ? mergedProps.gap : 0;
              const gapPx = gapMultiplier * 4;

              const elements = [];

              // Draw column boundaries and gutters
              for (let i = 1; i < columns; i++) {
                if (gapPx > 0) {
                  // Calculate gutter position
                  // In CSS Grid, gaps are between columns, so position is at end of column i-1
                  const gutterXPercent = (100 / columns) * i;

                  elements.push(
                    <rect
                      key={`gutter-${i}`}
                      x={`calc(${gutterXPercent}% - ${gapPx / 2}px)`}
                      y="0"
                      width={`${gapPx}px`}
                      height="100%"
                      fill="#3858e9"
                      opacity="0.15"
                    />
                  );

                  // Draw line in the center of the gutter
                  elements.push(
                    <line
                      key={`col-${i}`}
                      x1={`${gutterXPercent}%`}
                      y1="0"
                      x2={`${gutterXPercent}%`}
                      y2="100%"
                      stroke="#3858e9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  );
                } else {
                  // No gap - just draw divider lines at column boundaries
                  const xPercent = (100 / columns) * i;
                  elements.push(
                    <line
                      key={`col-${i}`}
                      x1={`${xPercent}%`}
                      y1="0"
                      x2={`${xPercent}%`}
                      y2="100%"
                      stroke="#3858e9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  );
                }
              }

              return elements;
            })()}
          </svg>
        </div>
      )}
    </div>
  );
};
