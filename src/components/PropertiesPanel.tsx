"use client";

import React, { useMemo, useState } from "react";
import { useComponentTree, ROOT_VSTACK_ID } from "../ComponentTreeContext";
import { componentRegistry } from "../componentRegistry";
import { findParent } from "../utils/treeHelpers";
import {
  TextControl,
  SelectControl,
  ToggleControl,
  __experimentalNumberControl as NumberControl,
  ColorPicker,
  Button,
  PanelBody,
  Popover,
  Icon,
  DropdownMenu,
  MenuGroup,
  MenuItem,
  __experimentalHStack as HStack,
  __experimentalVStack as VStack,
  __experimentalItemGroup as ItemGroup,
  __experimentalItem as Item,
} from "@wordpress/components";
import {
  plus as plusIcon,
  trash as trashIcon,
  blockDefault,
  moreVertical,
  chevronRight,
  button,
  seen,
  dragHandle,
  justifyTop,
} from "@wordpress/icons";
import { IconPicker } from "./IconPicker";
import { ColorVariantPicker } from "./ColorVariantPicker";
import { TabContainer } from "./TabContainer";
import { componentIconMap } from "./ComponentInserter";

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
    updateComponentName,
    tree,
    gridLinesVisible,
    toggleGridLines,
    pages,
    currentPageId,
    updatePageTheme,
    addInteraction,
    removeInteraction,
    updateInteraction,
    projects,
    currentProjectId,
    updateProjectTheme,
    updateProjectLayout,
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
    (selectedNodes.length === 1 && selectedNodes[0].id === ROOT_VSTACK_ID);

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
    const maxWidth = projectLayout.maxWidth ?? 0;
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
              label="Primary Color"
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
            <div style={{ marginBottom: "16px" }}>
              <SelectControl
                label="Max Width"
                value={maxWidth === 0 ? "none" : String(maxWidth)}
                options={[
                  { label: "None (100%)", value: "none" },
                  { label: "1920px", value: "1920" },
                  { label: "1440px", value: "1440" },
                  { label: "1200px", value: "1200" },
                  { label: "1024px", value: "1024" },
                  { label: "768px", value: "768" },
                ]}
                onChange={(value) =>
                  updateProjectLayout({
                    maxWidth: value === "none" ? 0 : Number(value),
                  })
                }
                help="Maximum width of the page content (applies to all pages)"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <NumberControl
                label="Padding"
                value={padding}
                onChange={(value) =>
                  updateProjectLayout({
                    padding: Number(value),
                  })
                }
                help="Padding around the page content (multiplier of 4, applies to all pages)"
                min={0}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <NumberControl
                label="Gap"
                value={spacing}
                onChange={(value) =>
                  updateProjectLayout({
                    spacing: Number(value),
                  })
                }
                help="Gap between page elements (multiplier of 4, applies to all pages)"
                min={0}
              />
            </div>
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

  // Find parent to check if it's a Grid (only for single select)
  const parent = !isMultiSelect ? findParent(tree, selectedNodeIds[0]) : null;
  const isChildOfGrid = parent?.type === "Grid";

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

  const renderStylesTab = () => {
    return (
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Properties */}
        {definition.propDefinitions.length > 0 && (
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
            {definition.propDefinitions.map((propDef) => {
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
                  {propDef.type === "string" && (
                    <TextControl
                      label={propDef.name}
                      value={currentValue || ""}
                      onChange={(value) =>
                        handlePropChange(propDef.name, value)
                      }
                      help={
                        isMultiSelect && !isShared
                          ? `${propDef.description} (applying to all ${selectedNodes.length} items)`
                          : propDef.description
                      }
                      placeholder={
                        isMultiSelect && !isShared ? "Mixed values" : undefined
                      }
                    />
                  )}

                  {propDef.type === "number" && (
                    <NumberControl
                      label={propDef.name}
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

                  {propDef.type === "boolean" && (
                    <ToggleControl
                      label={propDef.name}
                      checked={currentValue || false}
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
                      label={propDef.name}
                      value={currentValue}
                      onChange={(value) =>
                        handlePropChange(propDef.name, value)
                      }
                    />
                  )}

                  {propDef.type === "select" &&
                    propDef.name === "colorVariant" && (
                      <ColorVariantPicker
                        label={propDef.name}
                        value={currentValue || "default"}
                        onChange={(value) =>
                          handlePropChange(propDef.name, value)
                        }
                      />
                    )}

                  {propDef.type === "select" &&
                    propDef.name !== "icon" &&
                    propDef.name !== "colorVariant" &&
                    propDef.options && (
                      <SelectControl
                        label={propDef.name}
                        value={currentValue}
                        options={propDef.options.map((opt) =>
                          typeof opt === 'string'
                            ? { label: opt, value: opt }
                            : opt
                        )}
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
                </div>
              );
            })}

            {/* Grid Lines Toggle - only for Grid components, single select */}
            {!isMultiSelect && firstNode.type === "Grid" && (
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
            initialOpen={openPanels["gridLayout"]}
            onToggle={() =>
              setOpenPanels({
                ...openPanels,
                gridLayout: !openPanels["gridLayout"],
              })
            }
          >
            <div style={{ marginBottom: "16px" }}>
              <NumberControl
                label="Column Span"
                value={firstNode.props.gridColumnSpan || 1}
                onChange={(value) =>
                  handlePropChange("gridColumnSpan", Number(value))
                }
                help="Number of columns to span"
                min={1}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <NumberControl
                label="Row Span"
                value={firstNode.props.gridRowSpan || 1}
                onChange={(value) =>
                  handlePropChange("gridRowSpan", Number(value))
                }
                help="Number of rows to span"
                min={1}
              />
            </div>
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
                    <HStack
                      spacing={2}
                      style={{
                        alignItems: "center",
                        width: "100%",
                        justifyContent: "space-between",
                      }}
                    >
                      <VStack spacing={0} style={{ flex: 1, alignItems: "flex-start" }}>
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
                                trigger: type.trigger,
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
                        {isActive && existingInteraction && (
                          <div style={{ fontSize: "11px", color: "#757575", paddingLeft: "32px", marginTop: "-2px" }}>
                            {existingInteraction.action === "navigate" ? (
                              <>Go to: {pages.find(p => p.id === existingInteraction.targetId)?.name || existingInteraction.targetId}</>
                            ) : existingInteraction.action === "showModal" ? (
                              <>Show modal</>
                            ) : (
                              <>{existingInteraction.action}</>
                            )}
                          </div>
                        )}
                      </VStack>

                      {isActive && (
                        <HStack
                          spacing={1}
                          style={{ justifyContent: "flex-end" }}
                        >
                          <DropdownMenu
                            icon={moreVertical}
                            label="Interaction options"
                            popoverProps={{ placement: "left-start" }}
                          >
                            {() => (
                              <MenuGroup>
                                <MenuItem
                                  onClick={() => {
                                    if (existingInteraction) {
                                      removeInteraction(
                                        selectedNodeIds[0],
                                        existingInteraction.id
                                      );
                                    }
                                  }}
                                >
                                  Reset
                                </MenuItem>
                              </MenuGroup>
                            )}
                          </DropdownMenu>
                        </HStack>
                      )}
                    </HStack>
                  </Item>

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
      }}
    >
      {/* Header with component icon, name, description and tabs */}
      {!isMultiSelect && (
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
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

          {/* TabContainer */}
          <TabContainer
            tabs={[
              {
                name: "styles",
                title: "Styles",
                panel: renderStylesTab(),
              },
              {
                name: "interactions",
                title: "Interactions",
                panel: renderInteractionsTab(),
              },
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
