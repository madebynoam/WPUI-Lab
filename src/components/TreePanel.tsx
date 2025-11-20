import React, { useState, useRef, useEffect, useCallback } from "react";
import { useComponentTree, ROOT_VSTACK_ID } from "../ComponentTreeContext";
import { ComponentNode } from "../types";
import { componentRegistry } from "../componentRegistry";
import { patterns, assignIds } from "../patterns";
import "./TreePanel.css";
import {
	Button,
	DropdownMenu,
	MenuGroup,
	MenuItem,
	Icon,
} from "@wordpress/components";
import { ComponentInserter } from "./ComponentInserter";
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
	table,
	page,
} from "@wordpress/icons";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import type { DropTargetMonitor } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Component groups for the inserter
export interface ComponentGroup {
	name: string;
	icon: JSX.Element;
	components: string[];
}

export const componentGroups: ComponentGroup[] = [
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
	{
		name: "Data Display",
		icon: table,
		components: ["DataViews"],
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
		selectedNodeIds,
		toggleNodeSelection,
		resetTree,
		reorderComponent,
		removeComponent,
		duplicateComponent,
		moveComponent,
		updateComponentName,
		pages,
		currentPageId,
		setCurrentPage,
		addPage,
		deletePage,
		renamePage,
		duplicatePage,
		setTree,
		getParentById,
		getNodeById,
		copyComponent,
		pasteComponent,
		canPaste,
	} = useComponentTree();

	const [inserterTab, setInserterTab] = useState<"blocks" | "patterns">(
		"blocks"
	);
	const [searchTerm, setSearchTerm] = useState("");
	const [editingPageId, setEditingPageId] = useState<string | null>(null);
	const [editingPageName, setEditingPageName] = useState("");
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const [editingNodeName, setEditingNodeName] = useState("");

	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
		new Set([ROOT_VSTACK_ID])
	);
	const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const layerClickCountRef = useRef<Map<string, number>>(new Map());
	const layerClickTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
	const pageClickCountRef = useRef<Record<string, number>>({});
	const pageClickTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

	// Get the current page object from the pages array
	const currentPage = pages.find((page) => page.id === currentPageId);

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
		const targetId = selectedNodeIds[0] || ROOT_VSTACK_ID;
		const targetNode = getNodeById(targetId);
		const canAcceptChildren =
			targetNode && componentRegistry[targetNode.type]?.acceptsChildren;

		let parentId = targetId;

		// If target doesn't accept children, find the nearest parent container
		if (!canAcceptChildren && targetId !== ROOT_VSTACK_ID) {
			let currentNode = targetNode;
			while (currentNode) {
				const parent = getParentById(currentNode.id);
				if (!parent) break;
				if (componentRegistry[parent.type]?.acceptsChildren) {
					parentId = parent.id;
					break;
				}
				currentNode = parent;
			}
		}

		if (canAcceptChildren) {
			addComponent(componentType, targetId);
		} else {
			addComponent(componentType, parentId);
		}
		onCloseInserter();
		setSearchTerm("");
	};

	// Handle adding pattern
	const handleAddPattern = (patternId: string) => {
		const pattern = patterns.find((p) => p.id === patternId);
		if (!pattern) return;

		let patternWithIds = assignIds(pattern.tree);
		const targetId = selectedNodeIds[0] || ROOT_VSTACK_ID;
		const targetNode = getNodeById(targetId);
		const canAcceptChildren =
			targetNode && componentRegistry[targetNode.type]?.acceptsChildren;

		let parentId = targetId;

		// If target doesn't accept children, find the nearest parent container
		if (!canAcceptChildren && targetId !== ROOT_VSTACK_ID) {
			let currentNode = targetNode;
			while (currentNode) {
				const parent = getParentById(currentNode.id);
				if (!parent) break;
				if (componentRegistry[parent.type]?.acceptsChildren) {
					parentId = parent.id;
					break;
				}
				currentNode = parent;
			}
		}

		// If parent is a Grid, set default gridColumnSpan for the pattern root
		const parentNode = getNodeById(parentId);
		if (parentNode?.type === 'Grid') {
			patternWithIds = {
				...patternWithIds,
				props: {
					...patternWithIds.props,
					gridColumnSpan: 12,
				},
			};
		}

		const addToParent = (nodes: ComponentNode[]): ComponentNode[] => {
			return nodes.map((node) => {
				if (node.id === parentId) {
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

		onCloseInserter();
		setSearchTerm("");
	};


	const registerNodeRef = useCallback(
		(id: string, el: HTMLDivElement | null) => {
			if (el) {
				nodeRefs.current.set(id, el);
			} else {
				nodeRefs.current.delete(id);
			}
		},
		[]
	);

	// Helper to find node recursively in tree
	const findNodeInTree = useCallback(
		(nodeId: string): any => {
			const search = (nodes: ComponentNode[]): any => {
				for (const node of nodes) {
					if (node.id === nodeId) return node;
					if (node.children) {
						const found = search(node.children);
						if (found) return found;
					}
				}
				return null;
			};
			return search(tree);
		},
		[tree]
	);

	// Create a handler factory for layer double-click detection
	const createLayerNameClickHandler = useCallback(
		(nodeId: string) => (e: React.MouseEvent) => {
			if (nodeId === ROOT_VSTACK_ID) return;

			const count = (layerClickCountRef.current.get(nodeId) || 0) + 1;
			layerClickCountRef.current.set(nodeId, count);

			if (count === 1) {
				// First click - start timer (350ms allows normal double-click timing)
				const timeout = setTimeout(() => {
					layerClickCountRef.current.set(nodeId, 0);
				}, 350);
				layerClickTimeoutRef.current.set(nodeId, timeout);
			} else if (count === 2) {
				// Second click within 350ms - trigger edit mode
				e.stopPropagation();
				const timeout = layerClickTimeoutRef.current.get(nodeId);
				if (timeout) {
					clearTimeout(timeout);
					layerClickTimeoutRef.current.delete(nodeId);
				}
				layerClickCountRef.current.set(nodeId, 0);
				setEditingNodeId(nodeId);
				const node = findNodeInTree(nodeId);
				const nodeName = node?.name || "";
				setEditingNodeName(nodeName);
			}
		},
		[tree, setEditingNodeId, setEditingNodeName, findNodeInTree]
	);

	const findNodePath = useCallback(
		(
			nodes: ComponentNode[],
			targetId: string,
			path: string[] = []
		): string[] | null => {
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
		if (selectedNodeIds.length === 0) return;
		// Expand paths for all selected nodes
		selectedNodeIds.forEach((selectedId) => {
			const path = findNodePath(tree, selectedId);
			if (path) {
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
			}
		});
	}, [selectedNodeIds, tree, findNodePath]);

	useEffect(() => {
		if (selectedNodeIds.length === 0) return;
		// Scroll to first selected node
		const el = nodeRefs.current.get(selectedNodeIds[0]);
		if (el) {
			el.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, [selectedNodeIds]);

	// Render tree node with WordPress ListView styling
	const TreeNode: React.FC<{ node: ComponentNode; level: number }> = ({
		node,
		level,
	}) => {
		const [isHovered, setIsHovered] = useState(false);
		const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
		const ref = useRef<HTMLDivElement>(null);

		const isSelected = selectedNodeIds.includes(node.id);
		const hasChildren = node.children && node.children.length > 0;
		const isRootVStack = node.id === ROOT_VSTACK_ID;
		const isExpanded = expandedNodes.has(node.id);
		const canDropInside =
			componentRegistry[node.type]?.acceptsChildren !== false || isRootVStack;

		const handleNodeClick = (e: React.MouseEvent) => {
			const multiSelect = e.metaKey || e.ctrlKey;
			const rangeSelect = e.shiftKey;
			toggleNodeSelection(node.id, multiSelect, rangeSelect, tree);
		};

		const handleNameClick = createLayerNameClickHandler(node.id);

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
							? "#3858e9"
							: showInsideIndicator
							? "rgba(56, 88, 233, 0.12)"
							: isOver && canDrop
							? "#e5f5fa"
							: isHovered
							? "#f0f0f1"
							: "transparent",
						color: isSelected ? "#fff" : "#1e1e1e",
						borderRadius: "2px",
						margin: "0 4px",
						transition: "background-color 0.05s ease",
						border: showInsideIndicator
							? "1px solid #3858e9"
							: "1px solid transparent",
					}}
					onClick={(e) => {
						// Don't trigger selection if we're editing the name - prevents re-renders
						if (editingNodeId === node.id) {
							e.stopPropagation();
							return;
						}
						handleNodeClick(e);
					}}
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

					{/* Expander chevron */}
					{hasChildren ? (
						<button
							onClick={(e) => {
								e.stopPropagation();
								toggleExpand(node.id);
							}}
							onMouseDown={(e) => {
								e.stopPropagation();
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


					{/* Component Name */}
					{editingNodeId === node.id ? (
						<input
							type="text"
							value={editingNodeName}
							onChange={(e) => setEditingNodeName(e.target.value)}
							onBlur={() => {
								if (editingNodeName.trim()) {
									updateComponentName(node.id, editingNodeName.trim());
								}
								setEditingNodeId(null);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									if (editingNodeName.trim()) {
										updateComponentName(node.id, editingNodeName.trim());
									}
									setEditingNodeId(null);
								} else if (e.key === "Escape") {
									setEditingNodeId(null);
								}
							}}
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => e.stopPropagation()}
							autoFocus
							style={{
								flex: 1,
								fontSize: "13px",
								padding: "2px 4px",
								border: "1px solid #3858e9",
								borderRadius: "2px",
								outline: "none",
								backgroundColor: "#fff",
							}}
						/>
					) : (
						<span
							style={{
								flex: 1,
								fontSize: "13px",
								fontWeight: 400,
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								userSelect: "none",
								pointerEvents: "auto",
							}}
							onClick={handleNameClick}
						>
							{node.id === ROOT_VSTACK_ID
								? <><Icon icon={page} size={16} style={{ marginRight: "4px" }} />{currentPage?.name || "Untitled"}</>
								: node.name
								? `${node.name} (${node.type})`
								: node.type}
						</span>
					)}

					{/* Options Menu */}
					{!isRootVStack && (
						<div
							onClick={(e) => e.stopPropagation()}
							onMouseDown={(e) => e.stopPropagation()}
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
										<MenuItem onClick={() => copyComponent(node.id)}>
											Copy
										</MenuItem>
										<MenuItem onClick={() => pasteComponent(node.id)} disabled={!canPaste}>
											Paste
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
								height: "36px",
								paddingRight: "8px",
								paddingLeft: "8px",
								backgroundColor:
									currentPageId === page.id ? "#7b90ff" : "transparent",
								color: currentPageId === page.id ? "#fff" : "#1e1e1e",
								borderRadius: "2px",
								fontSize: "13px",
							}}
							onMouseDown={() => {
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
										border: "1px solid #3858e9",
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
										userSelect: "none",
										pointerEvents: "auto",
									}}
									onClick={(e: React.MouseEvent) => {
										if (!pageClickCountRef.current[page.id]) {
											pageClickCountRef.current[page.id] = 0;
										}
										pageClickCountRef.current[page.id] += 1;

										if (pageClickCountRef.current[page.id] === 1) {
											pageClickTimeoutRef.current[page.id] = setTimeout(() => {
												pageClickCountRef.current[page.id] = 0;
											}, 350);
										} else if (pageClickCountRef.current[page.id] === 2) {
											e.stopPropagation();
											clearTimeout(pageClickTimeoutRef.current[page.id]);
											pageClickCountRef.current[page.id] = 0;
											setEditingPageId(page.id);
											setEditingPageName(page.name);
										}
									}}
								>
									{page.name}
								</span>
							)}
							<div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
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
			<ComponentInserter
				showInserter={showInserter}
				onCloseInserter={onCloseInserter}
				onAddComponent={handleAddComponent}
				onAddPattern={handleAddPattern}
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				inserterTab={inserterTab}
				onTabChange={setInserterTab}
			/>

			{/* Old inserter JSX - to be deleted */}

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
