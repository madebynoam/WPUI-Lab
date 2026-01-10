"use client";

import React, { useMemo, useState } from "react";
import { useComponentTree, ROOT_GRID_ID } from "@/contexts/ComponentTreeContext";
import { componentRegistry } from "@/componentRegistry";
import { findParent } from "../utils/treeHelpers";
import {
  TextControl,
  TextareaControl,
  SelectControl,
  ToggleControl,
  __experimentalNumberControl as NumberControl,
  ColorPicker,
  Button,
  PanelBody,
  Popover,
  Icon,
  __experimentalHStack as HStack,
  __experimentalItemGroup as ItemGroup,
  __experimentalItem as Item,
  __experimentalToggleGroupControl as ToggleGroupControl,
  __experimentalToggleGroupControlOption as ToggleGroupControlOption,
  BaseControl,
} from "@wordpress/components";
import {
  plus as plusIcon,
  trash as trashIcon,
  close,
  blockDefault,
  button,
  seen,
  dragHandle,
} from "@wordpress/icons";
import { IconPicker } from "./IconPicker";
import { ColorVariantPicker } from "./ColorVariantPicker";
import { TabContainer } from "./TabContainer";
import { componentIconMap } from "./ComponentInserter";
import { RichTextControl } from "./RichTextControl";

// Helper function to format dates
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper function to format relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

import {
  AlignmentControl,
  SpacingControl,
  PaddingControl,
  WidthControl,
  HeightControl,
  GridHeightPreset,
  GridChildHeightPreset,
  VSTACK_PRIMARY_OPTIONS,
  VSTACK_CROSS_OPTIONS,
  HSTACK_PRIMARY_OPTIONS,
  HSTACK_CROSS_OPTIONS,
} from "./LayoutControls";

// Color swatch button with popover
const ColorSwatchButton: React.FC<{
  color: string;
  label: string;
  onChange: (color: string) => void;
  help?: string;
}> = ({ color, label, onChange, help }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          marginBottom: "8px",
          fontSize: "11px",
          fontWeight: 500,
          color: "#1e1e1e",
        }}
      >
        {label}
      </div>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          height: "40px",
          padding: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          border: "1px solid #ddd",
          borderRadius: "2px",
          backgroundColor: "#fff",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "2px",
            backgroundColor: color,
            border: "1px solid rgba(0, 0, 0, 0.1)",
          }}
        />
        <span style={{ fontSize: "13px", color: "#1e1e1e" }}>{color}</span>
      </Button>
      {isOpen && (
        <Popover placement="left-start" onClose={() => setIsOpen(false)}>
          <div style={{ padding: "16px" }}>
            <ColorPicker color={color} onChange={onChange} enableAlpha />
          </div>
        </Popover>
      )}
      {help && (
        <div style={{ fontSize: "11px", color: "#757575", marginTop: "4px" }}>
          {help}
        </div>
      )}
    </div>
  );
};

export const PropertiesPanel: React.FC = () => {
  const PANEL_WIDTH = 280;
  const [activeTab, setActiveTab] = useState<"styles" | "interactions">(
    "styles"
  );
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    settings: true,
    gridLayout: true,
    theme: true,
    guides: true,
  });
  const [openInteractionId, setOpenInteractionId] = useState<string | null>(
    null
  );
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const {
    selectedNodeIds,
    getNodeById,
    updateComponentProps,
    updateMultipleComponentProps,
    tree,
    gridLinesVisible,
    toggleGridLines,
    swapLayoutType,
    pages,
    addInteraction,
    removeInteraction,
    updateInteraction,
    projects,
    currentProjectId,
    updateProjectTheme,
    updateProjectLayout,
    updateProjectDescription,
    renameProject,
    isAgentExecuting,
    globalComponents,
    setEditingGlobalComponent,
  } = useComponentTree();

  const selectedNodes = useMemo(() => {
    return selectedNodeIds
      .map((id) => getNodeById(id))
      .filter(
        (n): n is NonNullable<ReturnType<typeof getNodeById>> => n !== null
      );
  }, [selectedNodeIds, getNodeById]);

  const isMultiSelect = selectedNodes.length > 1;
  const firstNode = selectedNodes[0];

  // Find shared properties for multi-select - must be called before any early returns
  const getSharedProps = useMemo(() => {
    if (!isMultiSelect || !firstNode) return firstNode?.props || {};

    const shared: Record<string, any> = {};
    const allPropNames = new Set<string>();

    // Collect all prop names from all nodes
    selectedNodes.forEach((node) => {
      Object.keys(node.props || {}).forEach((key) => allPropNames.add(key));
    });

    // Find props that have the same value across all nodes
    allPropNames.forEach((propName) => {
      const values = selectedNodes.map((node) => node.props[propName]);
      const firstValue = values[0];
      if (values.every((val) => val === firstValue)) {
        shared[propName] = firstValue;
      }
    });

    return shared;
  }, [selectedNodes, isMultiSelect, firstNode]);

  // Show Project Settings when nothing is selected OR when root VStack is selected
  const isProjectSettingsView =
    selectedNodes.length === 0 ||
    (selectedNodes.length === 1 && selectedNodes[0].id === ROOT_GRID_ID);

  if (isProjectSettingsView) {
    // Show Project Settings
    const currentProject = projects.find((p) => p.id === currentProjectId);
    const projectTheme = currentProject?.theme ?? {
      primaryColor: "#3858e9",
      backgroundColor: "#ffffff",
    };

    // Get layout settings from project (applies to all pages)
    const projectLayout = currentProject?.layout ?? {
      maxWidth: 0, // 0 means no constraint (100%)
      padding: 0,
      spacing: 4,
    };
    const padding = projectLayout.padding ?? 0;
    const spacing = projectLayout.spacing ?? 4;

    return (
      <div
        style={{
          width: `${PANEL_WIDTH}px`,
          borderLeft: "1px solid rgba(0, 0, 0, 0.133)",
          backgroundColor: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px", borderBottom: "1px solid #e0e0e0" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
            Project Settings
          </h3>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {/* Project Details Section */}
          <PanelBody
            title="Project Details"
            initialOpen={openPanels["details"] !== false}
            onToggle={() =>
              setOpenPanels({ ...openPanels, details: !openPanels["details"] })
            }
          >
            <TextControl
              label="NAME"
              value={currentProject?.name || ''}
              onChange={(value) => {
                if (currentProject) {
                  renameProject(currentProject.id, value);
                }
              }}
              placeholder="Project name"
            />

            <TextareaControl
              label="DESCRIPTION"
              value={currentProject?.description || ''}
              onChange={(value) => updateProjectDescription(value)}
              placeholder="Add a description..."
              rows={3}
            />

            <div style={{ 
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#f6f7f7',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#757575',
            }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 500, color: '#1e1e1e' }}>Created:</span>{' '}
                {currentProject?.createdAt ? formatDate(currentProject.createdAt) : 'Unknown'}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 500, color: '#1e1e1e' }}>Modified:</span>{' '}
                {currentProject?.lastModified ? formatRelativeTime(currentProject.lastModified) : 'Unknown'}
              </div>
              <div>
                <span style={{ fontWeight: 500, color: '#1e1e1e' }}>Pages:</span>{' '}
                {currentProject?.pages?.length || 0}
              </div>
            </div>
          </PanelBody>

          {/* Project Theme Section */}
          <PanelBody
            title="Project Theme"
            initialOpen={openPanels["theme"]}
            onToggle={() =>
              setOpenPanels({ ...openPanels, theme: !openPanels["theme"] })
            }
          >
            <ColorSwatchButton
              color={projectTheme.primaryColor || "#3858e9"}
              label="PRIMARY COLOR"
              onChange={(color) => updateProjectTheme({ primaryColor: color })}
              help="Theme primary color for buttons and interactive elements"
            />
          </PanelBody>

          {/* Canvas Layout Section */}
          <PanelBody
            title="Canvas Layout"
            initialOpen={openPanels["layout"]}
            onToggle={() =>
              setOpenPanels({ ...openPanels, layout: !openPanels["layout"] })
            }
          >
            {/* Padding Control with Presets */}
            <PaddingControl
              value={(() => {
                // Convert multiplier to CSS string
                const multiplierToCSS: Record<number, string> = {
                  0: '',
                  2: '8px',
                  4: '16px',
                  6: '24px',
                  8: '32px',
                };
                return multiplierToCSS[padding] ?? '';
              })()}
              onChange={(value) => {
                // Convert CSS string to multiplier
                const cssToMultiplier: Record<string, number> = {
                  '': 0,
                  '8px': 2,
                  '16px': 4,
                  '24px': 6,
                  '32px': 8,
                };
                updateProjectLayout({
                  padding: cssToMultiplier[value] ?? 0,
                });
              }}
            />
            <p style={{ margin: '4px 0 16px', fontSize: '11px', color: '#757575' }}>
              Padding around the page content (applies to all pages)
            </p>

            {/* Gap Control with Dropdown */}
            <SelectControl
              label="GAP"
              value={spacing.toString() as '0' | '2' | '4' | '6' | '8' | '12' | '16'}
              options={[
                { label: '0px', value: '0' },
                { label: '8px', value: '2' },
                { label: '16px', value: '4' },
                { label: '24px', value: '6' },
                { label: '32px', value: '8' },
                { label: '48px', value: '12' },
                { label: '64px', value: '16' },
              ]}
              onChange={(value) => updateProjectLayout({ spacing: parseInt(value) })}
              help={`Gap between elements in the root Grid (${spacing * 4}px)`}
            />

            {/* Height Control for Root Grid */}
            <HeightControl
              value={(selectedNodes[0]?.props.minHeight as GridHeightPreset) || 'auto'}
              customValue={selectedNodes[0]?.props.customMinHeight || ''}
              onChange={(preset, customValue) => {
                updateComponentProps(ROOT_GRID_ID, {
                  minHeight: preset,
                  customMinHeight: customValue || '',
                });
              }}
            />
          </PanelBody>
        </div>
      </div>
    );
  }

  if (!firstNode) return null;

  // For multi-select, only show properties if all nodes are the same type
  const allSameType = selectedNodes.every(
    (node) => node.type === firstNode.type
  );
  if (isMultiSelect && !allSameType) {
    return (
      <div
        style={{
          width: `${PANEL_WIDTH}px`,
          borderLeft: "1px solid rgba(0, 0, 0, 0.133)",
          backgroundColor: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px", borderBottom: "1px solid #e0e0e0" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
            Properties
          </h3>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
            {selectedNodes.length} items selected
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
          <div style={{ color: "#999", fontSize: "13px", textAlign: "center" }}>
            Select items of the same type to edit shared properties
          </div>
        </div>
      </div>
    );
  }

  const definition = componentRegistry[firstNode.type];
  if (!definition) return null;

  // Check if editing a global component instance
  const isGlobalInstance = !isMultiSelect && firstNode.isGlobalInstance;
  const globalComponent = isGlobalInstance
    ? globalComponents.find(gc => gc.id === firstNode.globalComponentId)
    : null;

  // Find parent to check if it's a Grid (only for single select)
  const parent = !isMultiSelect ? findParent(tree, selectedNodeIds[0]) : null;
  const isChildOfGrid = parent?.type === "Grid";
  const isChildOfVStackOrHStack = parent?.type === "VStack" || parent?.type === "HStack";

  const handlePropChange = (propName: string, value: any) => {
    // Special case: For Text and Heading components, 'content' prop should update 'children'
    const actualPropName =
      (firstNode.type === "Text" || firstNode.type === "Heading") &&
      propName === "content"
        ? "children"
        : propName;

    // Apply to all selected nodes using batch update
    if (selectedNodeIds.length > 1) {
      updateMultipleComponentProps(selectedNodeIds, {
        [actualPropName]: value,
      });
    } else {
      updateComponentProps(selectedNodeIds[0], { [actualPropName]: value });
    }
  };

  // Reset tab to styles for multi-select since interactions are only single-select
  if (isMultiSelect && activeTab === "interactions") {
    setActiveTab("styles");
  }

  // Reset tab to styles if interactions are disabled for this component
  if (definition.disableInteractions && activeTab === "interactions") {
    setActiveTab("styles");
  }

  const renderStylesTab = () => {
    // Layout containers that support width control
    const _layoutContainers = [
      "VStack",
      "HStack",
      "Grid",
      "Card",
      "Tabs",
      "Spacer",
      "Divider",
      "Spinner",
      "DataViews",
    ];

    return (
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Grid Settings - for Grid components */}
        {!isMultiSelect && firstNode.type === "Grid" && (
          <PanelBody
            title="Grid Settings"
            initialOpen={openPanels["gridSettings"]}
            onToggle={() =>
              setOpenPanels({
                ...openPanels,
                gridSettings: !openPanels["gridSettings"],
              })
            }
          >
            {/* Gap Control with Dropdown */}
            <SelectControl
              label="GAP"
              value={(firstNode.props.gap ?? 4).toString()}
              options={[
                { label: '0px', value: '0' },
                { label: '8px', value: '2' },
                { label: '16px', value: '4' },
                { label: '24px', value: '6' },
                { label: '32px', value: '8' },
                { label: '48px', value: '12' },
                { label: '64px', value: '16' },
              ]}
              onChange={(value) => updateComponentProps(firstNode.id, { gap: parseInt(value) })}
              help={`Gap between grid items (${(firstNode.props.gap ?? 4) * 4}px)`}
            />

            {/* Height Control */}
            <HeightControl
              value={(firstNode.props.minHeight as GridHeightPreset) || 'auto'}
              customValue={firstNode.props.customMinHeight || ''}
              onChange={(preset, customValue) => {
                updateComponentProps(firstNode.id, {
                  minHeight: preset,
                  customMinHeight: customValue || '',
                });
              }}
            />
          </PanelBody>
        )}

        {/* Grid child properties - only for single select */}
        {!isMultiSelect && isChildOfGrid && (
          <PanelBody
            title="Placement"
            initialOpen={openPanels["gridLayout"]}
            onToggle={() =>
              setOpenPanels({
                ...openPanels,
                gridLayout: !openPanels["gridLayout"],
              })
            }
          >
            {/* Drag hint */}
            {(firstNode.props.gridColumnSpan || 12) < (parent?.props?.columns || 12) && (
              <p style={{
                margin: '0 0 16px 0',
                fontSize: '12px',
                color: '#757575',
                fontStyle: 'italic'
              }}>
                Tip: Drag element horizontally to reposition, or vertically to reorder
              </p>
            )}

            <div style={{ marginBottom: '16px' }}>
              <BaseControl
                help={`Spans ${firstNode.props.gridColumnSpan || 12} of 12 columns in parent Grid`}
              >
                <ToggleGroupControl
                  label="SPAN"
                  value={(firstNode.props.gridColumnSpan || 12).toString()}
                  onChange={(value) => handlePropChange("gridColumnSpan", parseInt(String(value) || "12"))}
                  isBlock
                >
                  <ToggleGroupControlOption value="12" label="Full" />
                  <ToggleGroupControlOption value="9" label="3/4" />
                  <ToggleGroupControlOption value="8" label="2/3" />
                  <ToggleGroupControlOption value="6" label="Half" />
                  <ToggleGroupControlOption value="4" label="1/3" />
                  <ToggleGroupControlOption value="3" label="1/4" />
                </ToggleGroupControl>
              </BaseControl>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <BaseControl
                help={((firstNode.props.gridColumnSpan || 12) >= (parent?.props?.columns || 12))
                  ? 'Full-width items cannot be aligned'
                  : `Positions ${firstNode.props.gridColumnSpan || 12}-column item horizontally`}
              >
                <ToggleGroupControl
                  label="ALIGN"
                  value={(() => {
                    const disabled = (firstNode.props.gridColumnSpan || 12) >= (parent?.props?.columns || 12);
                    if (disabled) return 'start';

                    const gridColumnStart = firstNode.props.gridColumnStart || 1;
                    const gridColumnSpan = firstNode.props.gridColumnSpan || 12;
                    const parentColumns = parent?.props?.columns || 12;

                    if (gridColumnStart === 1) return 'start';
                    const centerStart = Math.ceil((parentColumns - gridColumnSpan) / 2) + 1;
                    const endStart = parentColumns - gridColumnSpan + 1;

                    if (gridColumnStart === centerStart) return 'center';
                    if (gridColumnStart === endStart) return 'end';
                    return 'start';
                  })()}
                  onChange={(value) => {
                    const gridColumnSpan = firstNode.props.gridColumnSpan || 12;
                    const parentColumns = parent?.props?.columns || 12;

                    let gridColumnStart = 1;
                    if (value === 'center') {
                      gridColumnStart = Math.ceil((parentColumns - gridColumnSpan) / 2) + 1;
                    } else if (value === 'end') {
                      gridColumnStart = parentColumns - gridColumnSpan + 1;
                    }

                    updateComponentProps(firstNode.id, { gridColumnStart });
                  }}
                  isBlock
                >
                  <ToggleGroupControlOption
                    value="start"
                    label="Left"
                    disabled={(firstNode.props.gridColumnSpan || 12) >= (parent?.props?.columns || 12)}
                  />
                  <ToggleGroupControlOption
                    value="center"
                    label="Center"
                    disabled={(firstNode.props.gridColumnSpan || 12) >= (parent?.props?.columns || 12)}
                  />
                  <ToggleGroupControlOption
                    value="end"
                    label="Right"
                    disabled={(firstNode.props.gridColumnSpan || 12) >= (parent?.props?.columns || 12)}
                  />
                </ToggleGroupControl>
              </BaseControl>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <BaseControl
                help={
                  ((firstNode.props.height as GridChildHeightPreset) || 'auto') === 'auto'
                    ? 'Height based on content'
                    : 'Fill Grid row height (100%)'
                }
              >
                <ToggleGroupControl
                  label="VERTICAL SIZING"
                  value={((firstNode.props.height as GridChildHeightPreset) || 'auto')}
                  onChange={(value) => {
                    updateComponentProps(firstNode.id, {
                      height: value as GridChildHeightPreset,
                      customHeight: '',
                    });
                  }}
                  isBlock
                >
                  <ToggleGroupControlOption value="auto" label="Fit Content" />
                  <ToggleGroupControlOption value="fill" label="Fill" />
                </ToggleGroupControl>
              </BaseControl>
            </div>
          </PanelBody>
        )}

        {/* Width Control for VStack/HStack children */}
        {!isMultiSelect && isChildOfVStackOrHStack && !isChildOfGrid && (
          <PanelBody
            title="Width"
            initialOpen={openPanels["width"]}
            onToggle={() =>
              setOpenPanels({
                ...openPanels,
                width: !openPanels["width"],
              })
            }
          >
            <WidthControl
              value={(firstNode as any).width || 'fill'}
              onChange={(value) => handlePropChange("width", value)}
            />
          </PanelBody>
        )}

        {/* Content Grouping Controls for VStack/HStack (Grid-first: no width/height resize) */}
        {!isMultiSelect && (firstNode.type === 'VStack' || firstNode.type === 'HStack') && (
          <PanelBody
            title="Content Grouping"
            initialOpen={openPanels["layout"] !== false}
            onToggle={() =>
              setOpenPanels({
                ...openPanels,
                layout: !openPanels["layout"],
              })
            }
          >
            {/* Layout Direction Switcher */}
            <div style={{ marginBottom: '16px' }}>
              <BaseControl>
                <ToggleGroupControl
                  label="LAYOUT DIRECTION"
                  value={firstNode.type === 'VStack' ? 'vertical' : 'horizontal'}
                  onChange={(value) => {
                    const newType = value === 'vertical' ? 'VStack' : 'HStack';
                    if (firstNode.type !== newType) {
                      swapLayoutType(firstNode.id, newType);
                    }
                  }}
                  isBlock
                >
                  <ToggleGroupControlOption value="vertical" label="Vertical" />
                  <ToggleGroupControlOption value="horizontal" label="Horizontal" />
                </ToggleGroupControl>
              </BaseControl>
            </div>

            {/* Alignment Controls */}
            <div style={{ marginBottom: "16px" }}>
              {/* Primary Axis Alignment */}
              <AlignmentControl
                label={firstNode.type === 'VStack' ? "VERTICAL ALIGN" : "HORIZONTAL ALIGN"}
                value={(() => {
                  const justify = firstNode.props.justify || 'flex-start';
                  if (justify === 'flex-start') return 'start';
                  if (justify === 'flex-end') return 'end';
                  if (justify === 'center') return 'center';
                  if (justify === 'space-between') return 'space-between';
                  return 'start';
                })()}
                onChange={(value) => {
                  let justify = 'flex-start';
                  if (value === 'start') justify = 'flex-start';
                  if (value === 'end') justify = 'flex-end';
                  if (value === 'center') justify = 'center';
                  if (value === 'space-between') justify = 'space-between';
                  updateComponentProps(firstNode.id, { justify });
                }}
                options={firstNode.type === 'VStack' ? VSTACK_PRIMARY_OPTIONS : HSTACK_PRIMARY_OPTIONS}
                direction="horizontal"
              />

              {/* Cross Axis Alignment */}
              <AlignmentControl
                label={firstNode.type === 'VStack' ? "HORIZONTAL ALIGN" : "VERTICAL ALIGN"}
                value={(() => {
                  const defaultAlignment = firstNode.type === 'VStack' ? 'stretch' : 'center';
                  const alignment = firstNode.props.alignment || defaultAlignment;
                  // HStack uses 'top'/'bottom', VStack uses 'flex-start'/'flex-end'
                  if (firstNode.type === 'HStack') {
                    if (alignment === 'top') return 'start';
                    if (alignment === 'bottom') return 'end';
                  } else {
                    if (alignment === 'flex-start') return 'start';
                    if (alignment === 'flex-end') return 'end';
                  }
                  if (alignment === 'center') return 'center';
                  if (alignment === 'stretch') return 'stretch';
                  return defaultAlignment === 'stretch' ? 'stretch' : 'center';
                })()}
                onChange={(value) => {
                  let alignment = 'center';
                  // HStack uses 'top'/'bottom', VStack uses 'flex-start'/'flex-end'
                  if (firstNode.type === 'HStack') {
                    if (value === 'start') alignment = 'top';
                    if (value === 'end') alignment = 'bottom';
                    if (value === 'center') alignment = 'center';
                    if (value === 'stretch') alignment = 'stretch';
                  } else {
                    if (value === 'start') alignment = 'flex-start';
                    if (value === 'end') alignment = 'flex-end';
                    if (value === 'center') alignment = 'center';
                    if (value === 'stretch') alignment = 'stretch';
                  }
                  updateComponentProps(firstNode.id, { alignment });
                }}
                options={firstNode.type === 'VStack' ? VSTACK_CROSS_OPTIONS : HSTACK_CROSS_OPTIONS}
                direction="horizontal"
              />
            </div>

            {/* Spacing Control */}
            <SpacingControl
              value={(() => {
                const spacing = firstNode.props.spacing ?? 2;
                return typeof spacing === 'number' ? spacing * 4 : 8;
              })()}
              onChange={(value) => {
                const spacing = Math.round(value / 4);
                updateComponentProps(firstNode.id, { spacing });
              }}
            />

            {/* Padding Control */}
            <PaddingControl
              value={firstNode.props.padding || ''}
              onChange={(value) => updateComponentProps(firstNode.id, { padding: value })}
            />
          </PanelBody>
        )}

        {/* Properties - Hide Settings panel for VStack/HStack (they use Content Grouping panel) */}
        {(() => {
          // Filter out grid layout props - low-level implementation details
          const gridLayoutProps = [
            'gridColumnSpan', 'gridRowSpan', // Grid child props
            'columns', 'rows', 'gap', 'rowGap', 'columnGap', // Grid layout props
            'templateColumns', 'templateRows', 'align', 'justify', // Grid template props
            'isInline', // Grid display mode (not needed in UI)
            'minHeight', 'customMinHeight', 'height', 'customHeight', // Height controls (custom UI in Grid Layout panel)
            'gridGuideColor', // Guide color (custom UI in Guides panel)
          ];
          const filteredProps = definition.propDefinitions.filter((propDef) => !gridLayoutProps.includes(propDef.name));

          return filteredProps.length > 0 &&
            firstNode.type !== 'VStack' &&
            firstNode.type !== 'HStack' && (
            <PanelBody
              title="Settings"
              initialOpen={openPanels["settings"]}
              onToggle={() =>
                setOpenPanels({
                  ...openPanels,
                  settings: !openPanels["settings"],
                })
              }
            >
              {filteredProps
              .map((propDef) => {
              // Special case: For Text and Heading, read 'content' from 'children' prop
              const actualPropToRead =
                (firstNode.type === "Text" || firstNode.type === "Heading") &&
                propDef.name === "content"
                  ? "children"
                  : propDef.name;

              const currentValue = isMultiSelect
                ? getSharedProps[actualPropToRead] !== undefined
                  ? getSharedProps[actualPropToRead]
                  : firstNode.props[actualPropToRead] ?? propDef.defaultValue
                : firstNode.props[actualPropToRead] ?? propDef.defaultValue;

              const isShared =
                !isMultiSelect || actualPropToRead in getSharedProps;

              return (
                <div key={propDef.name} style={{ marginBottom: "16px" }}>
                  {propDef.type === "string" && propDef.name === "content" && firstNode.type === "Text" && !isMultiSelect ? (
                    <RichTextControl
                      label={propDef.name.toUpperCase()}
                      value={currentValue || ""}
                      onChange={(value) =>
                        handlePropChange(propDef.name, value)
                      }
                      help={isGlobalInstance ? "Disabled for instances. Edit the master component to change this." : propDef.description}
                      placeholder="Type text... (Cmd+B for bold, Cmd+I for italic)"
                      disabled={isGlobalInstance}
                    />
                  ) : propDef.type === "string" ? (
                    <TextControl
                      label={propDef.name.toUpperCase()}
                      value={currentValue || ""}
                      onChange={(value) =>
                        handlePropChange(propDef.name, value)
                      }
                      help={
                        isGlobalInstance
                          ? "Disabled for instances. Edit the master component to change this."
                          : isMultiSelect && !isShared
                          ? `${propDef.description} (applying to all ${selectedNodes.length} items)`
                          : propDef.description
                      }
                      placeholder={
                        isMultiSelect && !isShared ? "Mixed values" : undefined
                      }
                      disabled={isGlobalInstance}
                    />
                  ) : null}

                  {propDef.type === "number" && propDef.name === "padding" && firstNode.type === "Spacer" && (
                    <>
                      <PaddingControl
                        value={(() => {
                          // Convert multiplier to CSS string
                          const multiplierToCSS: Record<number, string> = {
                            0: '',
                            2: '8px',
                            4: '16px',
                            6: '24px',
                            8: '32px',
                          };
                          return multiplierToCSS[currentValue] ?? '';
                        })()}
                        onChange={(value) => {
                          // Convert CSS string to multiplier
                          const cssToMultiplier: Record<string, number> = {
                            '': 0,
                            '8px': 2,
                            '16px': 4,
                            '24px': 6,
                            '32px': 8,
                          };
                          handlePropChange(propDef.name, cssToMultiplier[value] ?? 0);
                        }}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#757575' }}>
                        {isMultiSelect && !isShared
                          ? `${propDef.description} (applying to all ${selectedNodes.length} items)`
                          : propDef.description}
                      </p>
                    </>
                  )}

                  {propDef.type === "number" && (propDef.name !== "padding" || firstNode.type !== "Spacer") && (
                    <NumberControl
                      label={propDef.name.toUpperCase()}
                      value={currentValue}
                      onChange={(value) =>
                        handlePropChange(propDef.name, Number(value))
                      }
                      help={
                        isMultiSelect && !isShared
                          ? `${propDef.description} (applying to all ${selectedNodes.length} items)`
                          : propDef.description
                      }
                      min={0}
                    />
                  )}

                  {propDef.type === "boolean" && (() => {
                    // Check if this control should be disabled based on another prop's value
                    const disabledWhen = (propDef as any).disabledWhen;
                    const isDisabledByProp = disabledWhen &&
                      firstNode.props?.[disabledWhen.prop] === disabledWhen.value;
                    const isDisabled = isGlobalInstance || isDisabledByProp;

                    return (
                      <ToggleControl
                        label={propDef.name}
                        checked={currentValue || false}
                        onChange={(value) =>
                          handlePropChange(propDef.name, value)
                        }
                        disabled={isDisabled}
                        help={
                          isGlobalInstance
                            ? "Disabled for instances. Edit the master component to change this."
                            : isMultiSelect && !isShared
                            ? `${propDef.description} (applying to all ${selectedNodes.length} items)`
                            : isDisabledByProp
                            ? `${propDef.description} (requires ${disabledWhen.prop} to be enabled)`
                            : propDef.description
                        }
                      />
                    );
                  })()}

                  {propDef.type === "color" && (
                    <ColorSwatchButton
                      label={propDef.name.toUpperCase()}
                      color={currentValue || propDef.defaultValue || '#000000'}
                      onChange={(value) =>
                        handlePropChange(propDef.name, value)
                      }
                      help={
                        isMultiSelect && !isShared
                          ? `${propDef.description} (applying to all ${selectedNodes.length} items)`
                          : propDef.description
                      }
                    />
                  )}

                  {propDef.type === "select" && propDef.name === "icon" && (
                    <IconPicker
                      label={propDef.name.toUpperCase()}
                      value={currentValue}
                      onChange={(value) =>
                        handlePropChange(propDef.name, value)
                      }
                    />
                  )}

                  {propDef.type === "select" &&
                    propDef.name === "colorVariant" && (
                      <ColorVariantPicker
                        label={propDef.name.toUpperCase()}
                        value={currentValue || "default"}
                        onChange={(value) =>
                          handlePropChange(propDef.name, value)
                        }
                      />
                    )}

                  {propDef.type === "select" && propDef.name === "maxWidth" && (
                    <div style={{ marginBottom: '16px' }}>
                      <BaseControl help={propDef.description}>
                        <ToggleGroupControl
                          label="WIDTH"
                          value={
                            currentValue === "full" ? "full" : "content"
                          }
                          onChange={(value) => handlePropChange(propDef.name, value)}
                          isBlock
                        >
                          <ToggleGroupControlOption value="content" label="Content" aria-label="Content Width (1344px, centered)" />
                          <ToggleGroupControlOption value="full" label="Full" aria-label="Full Width (100%)" />
                        </ToggleGroupControl>
                      </BaseControl>
                    </div>
                  )}

                  {propDef.type === "select" &&
                    propDef.name !== "icon" &&
                    propDef.name !== "colorVariant" &&
                    propDef.name !== "maxWidth" &&
                    propDef.options && (
                      <SelectControl
                        label={propDef.name.toUpperCase()}
                        value={currentValue}
                        options={propDef.options.map((opt) =>
                          typeof opt === "string"
                            ? { label: opt, value: opt }
                            : opt
                        )}
                        onChange={(value) =>
                          handlePropChange(propDef.name, value)
                        }
                        disabled={isGlobalInstance}
                        help={
                          isGlobalInstance
                            ? "Disabled for instances. Edit the master component to change this."
                            : isMultiSelect && !isShared
                            ? `${propDef.description} (applying to all ${selectedNodes.length} items)`
                            : propDef.description
                        }
                      />
                    )}

                  {propDef.type === "selectOptions" && (
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "11px",
                          fontWeight: 500,
                          textTransform: "uppercase",
                        }}
                      >
                        {propDef.name}
                      </label>
                      {(currentValue || []).map(
                        (
                          option: { label: string; value: string },
                          index: number
                        ) => (
                          <HStack
                            key={index}
                            spacing={2}
                            style={{ marginBottom: "8px" }}
                          >
                            <TextControl
                              placeholder="Label"
                              value={option.label}
                              onChange={(newLabel) => {
                                const newOptions = [...(currentValue || [])];
                                newOptions[index] = {
                                  ...newOptions[index],
                                  label: newLabel,
                                };
                                handlePropChange(propDef.name, newOptions);
                              }}
                              __nextHasNoMarginBottom
                            />
                            <TextControl
                              placeholder="Value"
                              value={option.value}
                              onChange={(newValue) => {
                                const newOptions = [...(currentValue || [])];
                                newOptions[index] = {
                                  ...newOptions[index],
                                  value: newValue,
                                };
                                handlePropChange(propDef.name, newOptions);
                              }}
                              __nextHasNoMarginBottom
                            />
                            <Button
                              icon={trashIcon}
                              isDestructive
                              size="small"
                              onClick={() => {
                                const newOptions = (currentValue || []).filter(
                                  (_: any, i: number) => i !== index
                                );
                                handlePropChange(propDef.name, newOptions);
                              }}
                            />
                          </HStack>
                        )
                      )}
                      <Button
                        icon={plusIcon}
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          const newOptions = [
                            ...(currentValue || []),
                            {
                              label: `Option ${(currentValue || []).length + 1}`,
                              value: `option${(currentValue || []).length + 1}`,
                            },
                          ];
                          handlePropChange(propDef.name, newOptions);
                        }}
                      >
                        Add Option
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </PanelBody>
          );
        })()}

        {/* Guides - for Grid components */}
        {!isMultiSelect && firstNode.type === "Grid" && (
          <PanelBody
            title="Guides"
            initialOpen={openPanels["guides"]}
            onToggle={() =>
              setOpenPanels({
                ...openPanels,
                guides: !openPanels["guides"],
              })
            }
          >
            {/* Show Grid Lines Toggle */}
            <ToggleControl
              label="Show grid lines"
              checked={gridLinesVisible.has(selectedNodeIds[0])}
              onChange={() => toggleGridLines(selectedNodeIds[0])}
              help="Toggle grid overlay for this Grid (Control+G toggles all grids)"
            />

            {/* Grid Guide Color */}
            <ColorSwatchButton
              label="GUIDE COLOR"
              color={firstNode.props.gridGuideColor || '#3858e9'}
              onChange={(value) => updateComponentProps(firstNode.id, { gridGuideColor: value })}
              help="Color of grid guide lines (when grid lines are visible)"
            />
          </PanelBody>
        )}

        {definition.propDefinitions.length === 0 && !isChildOfGrid && (
          <div
            style={{
              color: "#999",
              fontSize: "13px",
              textAlign: "center",
              padding: "16px",
            }}
          >
            No editable properties
          </div>
        )}
      </div>
    );
  };

  const renderInteractionsTab = () => {
    const interactionTypes = [
      {
        id: "click",
        label: "Click",
        trigger: "onClick",
        icon: button,
        enabled: true,
      },
      {
        id: "appear",
        label: "Appear",
        trigger: "onAppear",
        icon: seen,
        enabled: false,
        comingSoon: true,
      },
      {
        id: "hover",
        label: "Hover",
        trigger: "onHover",
        icon: dragHandle,
        enabled: false,
        comingSoon: true,
      },
    ];

    const getExistingInteraction = (trigger: string) => {
      return (firstNode.interactions || []).find(
        (int) => int.trigger === trigger
      );
    };

    return (
      <div style={{ flex: 1, overflow: "auto" }}>
        <PanelBody title="Interactions" initialOpen={true}>
          <ItemGroup isBordered isSeparated>
            {interactionTypes.map((type) => {
              const existingInteraction = getExistingInteraction(type.trigger);
              const isActive = !!existingInteraction;

              return (
                <React.Fragment key={type.id}>
                  <Item
                    style={{
                      opacity: type.enabled ? 1 : 0.5,
                    }}
                  >
                    <Button
                      variant="tertiary"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        padding: "0",
                        minHeight: "auto",
                        textAlign: "left",
                      }}
                      disabled={!type.enabled}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        if (!type.enabled) return;

                        // If no interaction exists, create one
                        if (!existingInteraction) {
                          const targetPageId =
                            pages.length > 0 ? pages[0].id : "unknown";
                          addInteraction(selectedNodeIds[0], {
                            trigger: type.trigger as "onClick",
                            action: "navigate",
                            targetId: targetPageId,
                          });
                        }

                        // Open popover
                        setAnchorEl(e.currentTarget);
                        setOpenInteractionId(type.id);
                      }}
                      icon={type.icon}
                      title={type.comingSoon ? "Coming soon" : undefined}
                    >
                      {type.label}
                    </Button>
                  </Item>

                  {/* Interaction description row with X button */}
                  {isActive && existingInteraction && (
                    <Item
                      style={{
                        backgroundColor: "#f6f7f7",
                        padding: "8px 12px",
                        borderRadius: "2px",
                      }}
                    >
                      <HStack
                        spacing={2}
                        style={{
                          alignItems: "center",
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#1e1e1e",
                            flex: 1,
                          }}
                        >
                          {existingInteraction.action === "navigate" ? (
                            <>
                              Go to:{" "}
                              {pages.find(
                                (p) => p.id === existingInteraction.targetId
                              )?.name || existingInteraction.targetId}
                            </>
                          ) : existingInteraction.action === "showModal" ? (
                            <>Show modal</>
                          ) : (
                            <>{existingInteraction.action}</>
                          )}
                        </div>
                        <Button
                          icon={close}
                          iconSize={16}
                          variant="tertiary"
                          isSmall
                          onClick={() => {
                            if (existingInteraction) {
                              removeInteraction(
                                selectedNodeIds[0],
                                existingInteraction.id
                              );
                            }
                          }}
                          style={{
                            minWidth: "auto",
                            padding: "4px",
                          }}
                          label="Remove interaction"
                        />
                      </HStack>
                    </Item>
                  )}

                  {/* Popover for interaction settings */}
                  {openInteractionId === type.id &&
                    anchorEl &&
                    existingInteraction && (
                      <Popover
                        anchor={anchorEl}
                        placement="left-start"
                        onClose={() => {
                          setOpenInteractionId(null);
                          setAnchorEl(null);
                        }}
                      >
                        <div style={{ padding: "16px", minWidth: "280px" }}>
                          {existingInteraction.action === "navigate" && (
                            <SelectControl
                              label="Navigate to page"
                              value={existingInteraction.targetId}
                              options={pages.map((page) => ({
                                label: page.name,
                                value: page.id,
                              }))}
                              onChange={(newPageId) => {
                                updateInteraction(
                                  selectedNodeIds[0],
                                  existingInteraction.id,
                                  {
                                    trigger: existingInteraction.trigger,
                                    action: existingInteraction.action,
                                    targetId: newPageId,
                                  }
                                );
                              }}
                            />
                          )}
                        </div>
                      </Popover>
                    )}
                </React.Fragment>
              );
            })}
          </ItemGroup>

          <p
            style={{
              fontSize: "11px",
              color: "#666",
              margin: "12px 0 0",
              fontStyle: "italic",
            }}
          >
            Add interactions for the selected block.
          </p>
        </PanelBody>
      </div>
    );
  };

  return (
    <div
      style={{
        width: `${PANEL_WIDTH}px`,
        borderLeft: "1px solid rgba(0, 0, 0, 0.133)",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: isAgentExecuting ? 'none' : 'auto',
        opacity: isAgentExecuting ? 0.6 : 1,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      {/* Header with component icon, name, description and tabs */}
      {!isMultiSelect && (
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div style={{ padding: "16px", borderBottom: "0px solid #e0e0e0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "8px",
              }}
            >
              <div style={{ width: "32px", height: "32px", flexShrink: 0 }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: "none",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#666",
                  }}
                >
                  <Icon
                    icon={componentIconMap[firstNode.type] || blockDefault}
                    size={24}
                  />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1e1e1e",
                  }}
                >
                  {firstNode.type}
                </h3>
                {definition.description && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    {definition.description}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Global Component Instance Banner */}
          {isGlobalInstance && globalComponent && (
            <div
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 500 }}>
                Instance of: {globalComponent.name || globalComponent.type}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                Layout properties can be edited here. To edit content, double-click this instance or:
              </div>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setEditingGlobalComponent(firstNode.globalComponentId!)}
                style={{ fontSize: '11px' }}
              >
                Edit Master Component
              </Button>
            </div>
          )}

          {/* TabContainer */}
          <TabContainer
            tabs={[
              {
                name: "styles",
                title: "Styles",
                panel: renderStylesTab(),
              },
              // Only show interactions tab if not disabled
              ...(definition.disableInteractions ? [] : [{
                name: "interactions",
                title: "Interactions",
                panel: renderInteractionsTab(),
              }]),
            ]}
            selectedTab={activeTab}
            onSelect={(tabName) =>
              setActiveTab(tabName as "styles" | "interactions")
            }
          />
        </div>
      )}

      {/* Header for multi-select (no tabs) */}
      {isMultiSelect && (
        <div style={{ padding: "16px", borderBottom: "1px solid #e0e0e0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <div style={{ width: "32px", height: "32px", flexShrink: 0 }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#f0f0f0",
                  borderRadius: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666",
                }}
              >
                <Icon
                  icon={componentIconMap[firstNode.type] || blockDefault}
                  size={20}
                />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#1e1e1e",
                }}
              >
                {firstNode.type}
              </h3>
              {definition.description && (
                <div
                  style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
                >
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
