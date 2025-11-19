import React, { useState, useRef, useEffect, useCallback } from "react";
import { useComponentTree, ROOT_VSTACK_ID } from "../ComponentTreeContext";
import { ComponentNode } from "../types";
import { componentRegistry } from "../componentRegistry";
import { patterns, patternCategories, assignIds } from "../patterns";
import "./TreePanel.css";
import {
	Button,
	DropdownMenu,
	MenuGroup,
	MenuItem,
	SearchControl,
	Icon,
} from "@wordpress/components";
import {
	moreVertical,
	layout,
	box,
	pencil,
	tag,
	brush,
	settings,
	plugins,
	plus,
	blockDefault,
} from "@wordpress/icons";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import type { DropTargetMonitor } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Component groups for the inserter
interface ComponentGroup {
	name: string;
	icon: JSX.Element;
	components: string[];
}

const componentGroups: ComponentGroup[] = [
	{
		name: "Layout",
		icon: layout,
		components: ["VStack", "HStack", "Grid", "Flex", "FlexBlock", "FlexItem"],
	},
	{
		name: "Containers",
		icon: box,
		components: [
			"Card",
			"CardBody",
			"CardHeader",
			"Panel",
			"PanelBody",
			"PanelRow",
		],
	},
	{
		name: "Content",
		icon: pencil,
		components: ["Text", "Heading", "Button", "Icon"],
	},
	{
		name: "Form Inputs",
		icon: tag,
		components: [
			"TextControl",
			"TextareaControl",
			"SelectControl",
			"NumberControl",
			"SearchControl",
			"ToggleControl",
			"CheckboxControl",
			"RadioControl",
			"RangeControl",
			"DateTimePicker",
			"FontSizePicker",
			"AnglePickerControl",
		],
	},
	{
		name: "Color",
		icon: brush,
		components: ["ColorPicker", "ColorPalette"],
	},
	{
		name: "Advanced",
		icon: settings,
		components: ["BoxControl", "BorderControl", "FormTokenField", "TabPanel"],
	},
	{
		name: "Interactive",
		icon: plugins,
		components: [
			"Modal",
			"Popover",
			"Dropdown",
			"MenuGroup",
			"MenuItem",
			"Tooltip",
			"Notice",
		],
	},
	{
		name: "Utilities",
		icon: plus,
		components: ["Spacer", "Divider", "Spinner", "Truncate"],
	},
];

// Interactive component types that should be rendered in isolation when selected
export const INTERACTIVE_COMPONENT_TYPES = [
	"Modal",
	"Popover",
	"Dropdown",
	"Tooltip",
	"Notice",
];

interface TreePanelProps {
	showInserter: boolean;
	onCloseInserter: () => void;
}

const ITEM_TYPE = "TREE_NODE";
type DropPosition = "before" | "after" | "inside";

interface DragItem {
	id: string;
	type: string;
}

export const TreePanel: React.FC<TreePanelProps> = ({
	showInserter,
	onCloseInserter,
}) => {
	const {
		tree,
		addComponent,
		selectedNodeId,
		setSelectedNodeId,
		resetTree,
		reorderComponent,
		removeComponent,
		duplicateComponent,
		moveComponent,
		pages,
		currentPageId,
		setCurrentPage,
		addPage,
		deletePage,
		renamePage,
		duplicatePage,
		setTree,
	} = useComponentTree();

	const [inserterTab, setInserterTab] = useState<"blocks" | "patterns">(
		"blocks"
	);
	const [searchTerm, setSearchTerm] = useState("");
	const [editingPageId, setEditingPageId] = useState<string | null>(null);
	const [editingPageName, setEditingPageName] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set([ROOT_VSTACK_ID])
  );
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const toggleExpand = (nodeId: string) => {
		setExpandedNodes((prev) => {
			const next = new Set(prev);
			if (next.has(nodeId)) {
				next.delete(nodeId);
			} else {
				next.add(nodeId);
			}
			return next;
		});
	};

	// Handle adding component
	const handleAddComponent = (componentType: string) => {
		const targetId = selectedNodeId || ROOT_VSTACK_ID;
		const findNode = (
			nodes: ComponentNode[],
			id: string
		): ComponentNode | null => {
			for (const node of nodes) {
				if (node.id === id) return node;
				if (node.children) {
					const found = findNode(node.children, id);
					if (found) return found;
				}
			}
			return null;
		};

		const targetNode = findNode(tree, targetId);
		const canAcceptChildren =
			targetNode && componentRegistry[targetNode.type]?.acceptsChildren;

		if (canAcceptChildren) {
			addComponent(componentType, targetId);
		} else {
			addComponent(componentType);
		}
		onCloseInserter();
		setSearchTerm("");
	};

	// Handle adding pattern
	const handleAddPattern = (patternId: string) => {
		const pattern = patterns.find((p) => p.id === patternId);
		if (!pattern) return;

		const patternWithIds = assignIds(pattern.tree);
		const targetId = selectedNodeId || ROOT_VSTACK_ID;

		const findNode = (
			nodes: ComponentNode[],
			id: string
		): ComponentNode | null => {
			for (const node of nodes) {
				if (node.id === id) return node;
				if (node.children) {
					const found = findNode(node.children, id);
					if (found) return found;
				}
			}
			return null;
		};

		const targetNode = findNode(tree, targetId);
		const canAcceptChildren =
			targetNode && componentRegistry[targetNode.type]?.acceptsChildren;

		if (canAcceptChildren) {
			const addToParent = (nodes: ComponentNode[]): ComponentNode[] => {
				return nodes.map((node) => {
					if (node.id === targetId) {
						return {
							...node,
							children: [...(node.children || []), patternWithIds],
						};
					}
					if (node.children) {
						return {
							...node,
							children: addToParent(node.children),
						};
					}
					return node;
				});
			};
			setTree(addToParent(tree));
		} else {
			setTree([...tree, patternWithIds]);
		}

		onCloseInserter();
		setSearchTerm("");
	};

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

  const registerNodeRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      nodeRefs.current.set(id, el);
    } else {
      nodeRefs.current.delete(id);
    }
  }, []);

  const findNodePath = useCallback(
    (nodes: ComponentNode[], targetId: string, path: string[] = []): string[] | null => {
      for (const node of nodes) {
        const nextPath = [...path, node.id];
        if (node.id === targetId) {
          return nextPath;
        }
        if (node.children) {
          const found = findNodePath(node.children, targetId, nextPath);
          if (found) {
            return found;
          }
        }
      }
      return null;
    },
    []
  );

  useEffect(() => {
    if (!selectedNodeId) return;
    const path = findNodePath(tree, selectedNodeId);
    if (!path) return;
    setExpandedNodes((prev) => {
      let changed = false;
      const next = new Set(prev);
      path.slice(0, -1).forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [selectedNodeId, tree, findNodePath]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const el = nodeRefs.current.get(selectedNodeId);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedNodeId]);

  // Render tree node with WordPress ListView styling
	const TreeNode: React.FC<{ node: ComponentNode; level: number }> = ({
		node,
		level,
	}) => {
		const [isHovered, setIsHovered] = useState(false);
		const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
		const ref = useRef<HTMLDivElement>(null);

		const isSelected = selectedNodeId === node.id;
		const hasChildren = node.children && node.children.length > 0;
		const isRootVStack = node.id === ROOT_VSTACK_ID;
		const isExpanded = expandedNodes.has(node.id);
		const canDropInside =
			componentRegistry[node.type]?.acceptsChildren !== false || isRootVStack;

		const [{ isDragging }, drag] = useDrag({
			type: ITEM_TYPE,
			item: { id: node.id, type: ITEM_TYPE } as DragItem,
			canDrag: !isRootVStack,
			collect: (monitor) => ({
				isDragging: monitor.isDragging(),
			}),
		});

		const determineDropPosition = (
			monitor: DropTargetMonitor<DragItem, void>
		): DropPosition | null => {
			if (!ref.current) return null;
			const clientOffset = monitor.getClientOffset();
			if (!clientOffset) return null;

			const rect = ref.current.getBoundingClientRect();
			const relativeY = clientOffset.y - rect.top;
			const height = rect.height || 1;

			if (!isRootVStack && relativeY < height * 0.25) {
				return "before";
			}

			if (!isRootVStack && relativeY > height * 0.75) {
				return "after";
			}

			if (canDropInside) {
				return "inside";
			}

			if (!isRootVStack) {
				return relativeY < height / 2 ? "before" : "after";
			}

			return "inside";
		};

		const [{ isOver, canDrop }, drop] = useDrop<
			DragItem,
			void,
			{ isOver: boolean; canDrop: boolean }
		>({
			accept: ITEM_TYPE,
			canDrop: (item) => item.id !== node.id,
			hover: (item, monitor) => {
				if (
					!monitor.canDrop() ||
					!monitor.isOver({ shallow: true }) ||
					item.id === node.id
				) {
					return;
				}
				const position = determineDropPosition(monitor);
				if (position && position !== dropPosition) {
					setDropPosition(position);
				}
			},
			drop: (item, monitor) => {
				if (item.id === node.id) return;
				const position =
					determineDropPosition(monitor) ||
					dropPosition ||
					(canDropInside ? "inside" : "after");
				const finalPosition: DropPosition = isRootVStack ? "inside" : position;
				reorderComponent(item.id, node.id, finalPosition);
				setDropPosition(null);
			},
			collect: (monitor) => ({
				isOver: monitor.isOver({ shallow: true }),
				canDrop: monitor.canDrop(),
			}),
		});

		useEffect(() => {
			if (!isOver && dropPosition) {
				setDropPosition(null);
			}
		}, [isOver, dropPosition]);

		// Combine drag and drop refs
		drag(drop(ref));

    useEffect(() => {
      if (ref.current) {
        registerNodeRef(node.id, ref.current);
        return () => registerNodeRef(node.id, null);
      }
      return () => registerNodeRef(node.id, null);
    }, [node.id, registerNodeRef]);

    const showBeforeIndicator = isOver && canDrop && dropPosition === "before";
		const showAfterIndicator = isOver && canDrop && dropPosition === "after";
		const showInsideIndicator = isOver && canDrop && dropPosition === "inside";
		const indentPx = level * 16 + 8;

		return (
			<div style={{ opacity: isDragging ? 0.5 : 1 }}>
        <div
          ref={ref}
					style={{
						position: "relative",
						display: "flex",
						alignItems: "center",
						height: "36px",
						paddingLeft: `${indentPx}px`,
						paddingRight: "8px",
						backgroundColor: isSelected
							? "#2271b1"
							: showInsideIndicator
							? "rgba(34, 113, 177, 0.12)"
							: isOver && canDrop
							? "#e5f5fa"
							: isHovered
							? "#f0f0f1"
							: "transparent",
						color: isSelected ? "#fff" : "#1e1e1e",
						cursor: "pointer",
						borderRadius: "2px",
						margin: "0 4px",
						transition: "background-color 0.05s ease",
						border: showInsideIndicator
							? "1px solid #2271b1"
							: "1px solid transparent",
					}}
					onClick={() => setSelectedNodeId(node.id)}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
				>
					{showBeforeIndicator && (
						<div
							className="tree-panel-drop-indicator"
							style={{
								position: "absolute",
								top: "-2px",
								left: `${indentPx}px`,
								right: "8px",
								pointerEvents: "none",
							}}
						/>
					)}
					{showInsideIndicator && (
						<div
							className="tree-panel-drop-indicator-inside"
							style={{
								position: "absolute",
								top: "2px",
								bottom: "2px",
								left: `${indentPx}px`,
								right: "8px",
								pointerEvents: "none",
							}}
						/>
					)}
					{showAfterIndicator && (
						<div
							className="tree-panel-drop-indicator"
							style={{
								position: "absolute",
								bottom: "-2px",
								left: `${indentPx}px`,
								right: "8px",
								pointerEvents: "none",
							}}
						/>
					)}
					{/* Drag Handle */}
					{!isRootVStack && (
						<div
							style={{
								padding: "4px",
								width: "20px",
								height: "20px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								opacity: isHovered || isDragging ? 0.6 : 0,
								cursor: "grab",
								transition: "opacity 0.1s ease",
								marginRight: "2px",
							}}
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M5 4v3h5.5v12h3V7H19V4z" />
								<path
									fillRule="evenodd"
									d="M11 14H6v-1h5v1zm8-1h-5v1h5v-1zm-8 4H6v-1h5v1zm8-1h-5v1h5v-1z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
					)}

					{/* Expander chevron */}
					{hasChildren ? (
						<button
							onClick={(e) => {
								e.stopPropagation();
								toggleExpand(node.id);
							}}
							style={{
								background: "none",
								border: "none",
								padding: "4px",
								width: "20px",
								height: "20px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								color: "inherit",
								marginRight: "4px",
								transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
								transition: "transform 0.1s ease",
							}}
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z" />
							</svg>
						</button>
					) : (
						<div style={{ width: "20px", marginRight: "4px" }} />
					)}

					{/* Block icon */}
					<div
						style={{
							width: "24px",
							height: "24px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							marginRight: "8px",
							opacity: 0.8,
						}}
					>
						<Icon icon={blockDefault} size={20} />
					</div>

					{/* Component Name */}
					<span
						style={{
							flex: 1,
							fontSize: "13px",
							fontWeight: 400,
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
						}}
					>
						{node.id === ROOT_VSTACK_ID
							? "Page"
							: node.name
							? `${node.name} (${node.type})`
							: node.type}
					</span>

					{/* Options Menu */}
					{!isRootVStack && (
						<div
							onClick={(e) => e.stopPropagation()}
							style={{
								opacity: isHovered || isSelected ? 1 : 0,
								transition: "opacity 0.1s ease",
							}}
						>
							<DropdownMenu
								icon={moreVertical}
								label="Options"
								popoverProps={{ placement: "left-start" }}
							>
								{() => (
									<MenuGroup>
										<MenuItem onClick={() => moveComponent(node.id, "up")}>
											Move up
										</MenuItem>
										<MenuItem onClick={() => moveComponent(node.id, "down")}>
											Move down
										</MenuItem>
										<MenuItem onClick={() => duplicateComponent(node.id)}>
											Duplicate
										</MenuItem>
										<MenuItem
											onClick={() => removeComponent(node.id)}
											isDestructive
										>
											Remove
										</MenuItem>
									</MenuGroup>
								)}
							</DropdownMenu>
						</div>
					)}
				</div>

				{/* Render children if expanded */}
				{isExpanded &&
					hasChildren &&
					node.children!.map((child) => (
						<TreeNode key={child.id} node={child} level={level + 1} />
					))}
			</div>
		);
	};

	return (
		<div
			style={{
				width: "280px",
				borderRight: "1px solid #ccc",
				backgroundColor: "#fff",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				position: "relative",
			}}
		>
			{/* Pages Section */}
			<div style={{ padding: "12px 8px", borderBottom: "1px solid #e0e0e0" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: "8px",
					}}
				>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 600,
							color: "#666",
							textTransform: "uppercase",
							letterSpacing: "0.5px",
						}}
					>
						Pages
					</span>
					<button
						onClick={() => addPage()}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: "4px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "2px",
							color: "#666",
						}}
						aria-label="Add page"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
						</svg>
					</button>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
					{pages.map((page) => (
						<div
							key={page.id}
							style={{
								display: "flex",
								alignItems: "center",
								padding: "6px 8px",
								backgroundColor:
									currentPageId === page.id ? "#e5f5fa" : "transparent",
								color: "#1e1e1e",
								borderRadius: "2px",
								cursor: "pointer",
								fontSize: "13px",
							}}
							onClick={() => {
								if (editingPageId !== page.id) {
									setCurrentPage(page.id);
								}
							}}
						>
							{editingPageId === page.id ? (
								<input
									type="text"
									value={editingPageName}
									onChange={(e) => setEditingPageName(e.target.value)}
									onBlur={() => {
										if (editingPageName.trim()) {
											renamePage(page.id, editingPageName.trim());
										}
										setEditingPageId(null);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											if (editingPageName.trim()) {
												renamePage(page.id, editingPageName.trim());
											}
											setEditingPageId(null);
										} else if (e.key === "Escape") {
											setEditingPageId(null);
										}
									}}
									autoFocus
									style={{
										flex: 1,
										fontSize: "13px",
										padding: "2px 4px",
										border: "1px solid #007cba",
										borderRadius: "2px",
										outline: "none",
										backgroundColor: "#fff",
									}}
									onClick={(e) => e.stopPropagation()}
								/>
							) : (
								<span
									style={{
										flex: 1,
										fontWeight: currentPageId === page.id ? 500 : 400,
									}}
								>
									{page.name}
								</span>
							)}
							<div onClick={(e) => e.stopPropagation()}>
								<DropdownMenu
									icon={moreVertical}
									label="Page options"
									popoverProps={{ placement: "left-start" }}
								>
									{() => (
										<MenuGroup>
											<MenuItem
												onClick={() => {
													setEditingPageId(page.id);
													setEditingPageName(page.name);
												}}
											>
												Rename
											</MenuItem>
											<MenuItem onClick={() => duplicatePage(page.id)}>
												Duplicate
											</MenuItem>
											<MenuItem
												onClick={() => {
													if (pages.length > 1) {
														if (confirm(`Delete page "${page.name}"?`)) {
															deletePage(page.id);
														}
													} else {
														alert("Cannot delete the last page");
													}
												}}
												isDestructive
												disabled={pages.length === 1}
											>
												Delete
											</MenuItem>
										</MenuGroup>
									)}
								</DropdownMenu>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Layers Label */}
			<div
				style={{
					padding: "12px 8px 8px 8px",
					borderBottom: "1px solid #e0e0e0",
				}}
			>
				<span
					style={{
						fontSize: "11px",
						fontWeight: 600,
						color: "#666",
						textTransform: "uppercase",
						letterSpacing: "0.5px",
					}}
				>
					Layers
				</span>
			</div>

			{/* Inserter Overlay */}
			{showInserter && (
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: "#fff",
						zIndex: 1000,
						display: "flex",
						flexDirection: "column",
						borderTop: "1px solid #e0e0e0",
					}}
				>
					{/* Tabs */}
					<div
						style={{
							display: "flex",
							borderBottom: "1px solid #e0e0e0",
							backgroundColor: "#f9f9f9",
						}}
					>
						<button
							onClick={() => setInserterTab("blocks")}
							style={{
								flex: 1,
								padding: "12px 16px",
								border: "none",
								backgroundColor:
									inserterTab === "blocks" ? "#fff" : "transparent",
								borderBottom:
									inserterTab === "blocks"
										? "2px solid #2271b1"
										: "2px solid transparent",
								cursor: "pointer",
								fontSize: "13px",
								fontWeight: inserterTab === "blocks" ? 600 : 400,
								color: inserterTab === "blocks" ? "#1e1e1e" : "#666",
								fontFamily: "inherit",
							}}
						>
							Blocks
						</button>
						<button
							onClick={() => setInserterTab("patterns")}
							style={{
								flex: 1,
								padding: "12px 16px",
								border: "none",
								backgroundColor:
									inserterTab === "patterns" ? "#fff" : "transparent",
								borderBottom:
									inserterTab === "patterns"
										? "2px solid #2271b1"
										: "2px solid transparent",
								cursor: "pointer",
								fontSize: "13px",
								fontWeight: inserterTab === "patterns" ? 600 : 400,
								color: inserterTab === "patterns" ? "#1e1e1e" : "#666",
								fontFamily: "inherit",
							}}
						>
							Patterns
						</button>
					</div>

					{/* Search */}
					<div style={{ padding: "16px", borderBottom: "1px solid #e0e0e0" }}>
						<SearchControl
							value={searchTerm}
							onChange={setSearchTerm}
							placeholder={
								inserterTab === "blocks"
									? "Search blocks..."
									: "Search patterns..."
							}
							__nextHasNoMarginBottom
						/>
					</div>

					{/* Content */}
					<div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
						{inserterTab === "blocks" ? (
							filteredGroups.length === 0 ? (
								<div
									style={{
										textAlign: "center",
										padding: "24px",
										color: "#757575",
										fontSize: "13px",
									}}
								>
									No blocks found
								</div>
							) : (
								filteredGroups.map((group) => (
									<div key={group.name} style={{ marginBottom: "24px" }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "8px",
												marginBottom: "12px",
												fontSize: "11px",
												fontWeight: 600,
												color: "#1e1e1e",
												textTransform: "uppercase",
												letterSpacing: "0.5px",
											}}
										>
											<Icon icon={group.icon} size={16} />
											{group.name}
										</div>
										<div
											style={{
												display: "grid",
												gridTemplateColumns: "repeat(2, 1fr)",
												gap: "8px",
											}}
										>
											{group.components.map((componentType) => (
												<button
													key={componentType}
													onClick={() => handleAddComponent(componentType)}
													style={{
														height: "64px",
														display: "flex",
														flexDirection: "column",
														alignItems: "center",
														justifyContent: "center",
														gap: "6px",
														fontSize: "11px",
														textAlign: "center",
														padding: "10px 6px",
														border: "1px solid #ddd",
														borderRadius: "2px",
														backgroundColor: "#fff",
														cursor: "pointer",
														transition: "all 0.1s ease",
														fontFamily: "inherit",
													}}
												>
													<Icon icon={blockDefault} size={24} />
													<span
														style={{
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
															maxWidth: "100%",
														}}
													>
														{componentType}
													</span>
												</button>
											))}
										</div>
									</div>
								))
							)
						) : filteredPatternCategories.length === 0 ? (
							<div
								style={{
									textAlign: "center",
									padding: "24px",
									color: "#757575",
									fontSize: "13px",
								}}
							>
								No patterns found
							</div>
						) : (
							filteredPatternCategories.map((cat) => (
								<div key={cat.category} style={{ marginBottom: "32px" }}>
									<div
										style={{
											marginBottom: "16px",
											fontSize: "11px",
											fontWeight: 600,
											color: "#1e1e1e",
											textTransform: "uppercase",
											letterSpacing: "0.5px",
										}}
									>
										{cat.category}
									</div>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "12px",
										}}
									>
										{cat.patterns.map((pattern) => (
											<button
												key={pattern.id}
												onClick={() => handleAddPattern(pattern.id)}
												style={{
													padding: "16px",
													border: "1px solid #ddd",
													borderRadius: "2px",
													backgroundColor: "#fff",
													cursor: "pointer",
													textAlign: "left",
													transition: "all 0.1s ease",
													fontFamily: "inherit",
												}}
											>
												<div
													style={{
														fontWeight: 600,
														fontSize: "13px",
														color: "#1e1e1e",
														marginBottom: "4px",
													}}
												>
													{pattern.name}
												</div>
												<div style={{ fontSize: "12px", color: "#666" }}>
													{pattern.description}
												</div>
											</button>
										))}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}

			{/* Tree */}
			<div style={{ flex: 1, overflow: "auto" }}>
				<DndProvider backend={HTML5Backend}>
					{tree.map((node) => (
						<TreeNode key={node.id} node={node} level={0} />
					))}
				</DndProvider>
			</div>

			{/* Reset Button */}
			{tree.length > 0 && (
				<div style={{ padding: "8px", borderTop: "1px solid #ccc" }}>
					<Button
						variant="secondary"
						size="small"
						onClick={() => {
							if (confirm("Are you sure you want to reset the entire tree?")) {
								resetTree();
							}
						}}
						isDestructive
						style={{ width: "100%" }}
					>
						Reset All
					</Button>
				</div>
			)}
		</div>
	);
};
