import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { ComponentNode } from '../types';
import { componentRegistry } from '../componentRegistry';
import { patterns, assignIds } from '../patterns';
import './TreePanel.css';
import {
	Button,
	DropdownMenu,
	MenuGroup,
	MenuItem,
} from '@wordpress/components';
import { ComponentInserter } from './ComponentInserter';
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
	table,
} from '@wordpress/icons';
import {
	DndContext,
	closestCenter,
	DragEndEvent,
	DragMoveEvent,
	PointerSensor,
	useSensor,
	useSensors,
	DragStartEvent,
	DragOverlay,
	MeasuringStrategy,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import {
	flattenTree,
	buildTree,
	getProjection,
	removeChildrenOf,
	FlattenedNode,
	type Projection,
} from '../utils/dndTreeHelpers';
import { SortableTreeItem } from './TreeItem/SortableTreeItem';
import { TreeItem } from './TreeItem/TreeItem';

// Component groups for the inserter
export interface ComponentGroup {
	name: string;
	icon: JSX.Element;
	components: string[];
}

export const componentGroups: ComponentGroup[] = [
	{
		name: 'Layout',
		icon: layout,
		components: ['VStack', 'HStack', 'Grid', 'Flex', 'FlexBlock', 'FlexItem'],
	},
	{
		name: 'Containers',
		icon: box,
		components: [
			'Card',
			'CardBody',
			'CardHeader',
			'Panel',
			'PanelBody',
			'PanelRow',
		],
	},
	{
		name: 'Content',
		icon: pencil,
		components: ['Text', 'Heading', 'Button', 'Icon'],
	},
	{
		name: 'Form Inputs',
		icon: tag,
		components: [
			'TextControl',
			'TextareaControl',
			'SelectControl',
			'NumberControl',
			'SearchControl',
			'ToggleControl',
			'CheckboxControl',
			'RadioControl',
			'RangeControl',
			'DateTimePicker',
			'FontSizePicker',
			'AnglePickerControl',
		],
	},
	{
		name: 'Color',
		icon: brush,
		components: ['ColorPicker', 'ColorPalette'],
	},
	{
		name: 'Advanced',
		icon: settings,
		components: ['BoxControl', 'BorderControl', 'FormTokenField', 'TabPanel'],
	},
	{
		name: 'Interactive',
		icon: plugins,
		components: [
			'Modal',
			'Popover',
			'Dropdown',
			'MenuGroup',
			'MenuItem',
			'Tooltip',
			'Notice',
		],
	},
	{
		name: 'Utilities',
		icon: plus,
		components: ['Spacer', 'Divider', 'Spinner', 'Truncate'],
	},
	{
		name: 'Data Display',
		icon: table,
		components: ['DataViews'],
	},
];

// Interactive component types that should be rendered in isolation when selected
export const INTERACTIVE_COMPONENT_TYPES = [
	'Modal',
	'Popover',
	'Dropdown',
	'Tooltip',
	'Notice',
];

interface TreePanelProps {
	showInserter: boolean;
	onCloseInserter: () => void;
}

const indentationWidth = 16; // pixels per level of nesting

const measuring = {
	droppable: {
		strategy: MeasuringStrategy.Always,
	},
};

export const TreePanel: React.FC<TreePanelProps> = ({
	showInserter,
	onCloseInserter,
}) => {
	const {
		tree,
		addComponent,
		insertComponent,
		selectedNodeIds,
		toggleNodeSelection,
		resetTree,
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

	const [inserterTab, setInserterTab] = useState<'blocks' | 'patterns'>('blocks');
	const [searchTerm, setSearchTerm] = useState('');
	const [editingPageId, setEditingPageId] = useState<string | null>(null);
	const [editingPageName, setEditingPageName] = useState('');
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const [editingNodeName, setEditingNodeName] = useState('');

	const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const pageClickCountRef = useRef<Record<string, number>>({});
	const pageClickTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

	// dnd-kit state
	const [activeId, setActiveId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);
	const [offsetLeft, setOffsetLeft] = useState(0);
	const [currentProjection, setCurrentProjection] = useState<Projection | null>(null);

	// Configure dnd-kit sensors
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);

	// Get the current page object from the pages array
	const currentPage = pages.find((page) => page.id === currentPageId);

	// Flatten tree with collapsed filtering (matches dnd-kit SortableTree example)
	const flattenedItems = React.useMemo(() => {
		const flattenedTree = flattenTree(tree);

		// Simple collapsed detection - matches dnd-kit example exactly
		const collapsedItems = flattenedTree.reduce<string[]>(
			(acc, { children, collapsed, id }) =>
				collapsed && children && children.length ? [...acc, id] : acc,
			[]
		);

		// Remove children of activeId and collapsed nodes
		const filteredTree = removeChildrenOf(
			flattenedTree,
			activeId != null ? [activeId, ...collapsedItems] : collapsedItems
		);

		// Hide the root VStack (page node) from layers panel
		return filteredTree.filter(item => item.id !== ROOT_VSTACK_ID);
	}, [tree, activeId]);

	const sortedIds = React.useMemo(() => flattenedItems.map((item) => item.id), [flattenedItems]);

	// Toggle collapse state directly on tree items
	const handleCollapse = useCallback(
		(id: string) => {
			const updateNodeCollapsed = (nodes: ComponentNode[]): ComponentNode[] => {
				return nodes.map((node) => {
					if (node.id === id) {
						return { ...node, collapsed: !node.collapsed };
					}
					if (node.children) {
						return { ...node, children: updateNodeCollapsed(node.children) };
					}
					return node;
				});
			};

			setTree(updateNodeCollapsed(tree));
		},
		[tree, setTree]
	);

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
		setSearchTerm('');
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

		insertComponent(
			patternWithIds,
			parentId === ROOT_VSTACK_ID ? undefined : parentId
		);

		setSearchTerm('');
	};

	const registerNodeRef = useCallback((id: string, el: HTMLDivElement | null) => {
		if (el) {
			nodeRefs.current.set(id, el);
		} else {
			nodeRefs.current.delete(id);
		}
	}, []);

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

	// Scroll to selected node
	useEffect(() => {
		if (selectedNodeIds.length === 0) return;
		const el = nodeRefs.current.get(selectedNodeIds[0]);
		if (el) {
			el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}, [selectedNodeIds]);

	// Handle drag start
	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
		setOverId(null);
		setOffsetLeft(0);
		setCurrentProjection(null);
	};

	// Handle drag move - track horizontal offset for depth calculation
	const handleDragMove = (event: DragMoveEvent) => {
		const { delta, over } = event;

		if (over) {
			setOverId(over.id as string);
			setOffsetLeft(delta.x);

			// Calculate projection based on horizontal offset
			if (activeId && over.id) {
				const fullFlattenedTree = flattenTree(tree);
				const projection = getProjection(
					fullFlattenedTree,
					activeId,
					over.id as string,
					delta.x,
					indentationWidth,
					componentRegistry
				);
				setCurrentProjection(projection);
			}
		}
	};

	// Handle drag end - reorder component with depth
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		const resetState = () => {
			setActiveId(null);
			setOverId(null);
			setOffsetLeft(0);
			setCurrentProjection(null);
		};

		if (!over || active.id === over.id) {
			resetState();
			return;
		}

		const fullFlattenedTree = flattenTree(tree);
		const activeIndex = fullFlattenedTree.findIndex((n) => n.id === active.id);
		const overIndex = fullFlattenedTree.findIndex((n) => n.id === over.id);

		if (activeIndex === -1 || overIndex === -1) {
			resetState();
			return;
		}

		// Clone flattened tree
		const clonedItems: FlattenedNode[] = JSON.parse(
			JSON.stringify(fullFlattenedTree)
		);

		// Use arrayMove on flattened array
		const newItems = arrayMove(clonedItems, activeIndex, overIndex);

		// Update depth and parentId based on projection
		if (currentProjection) {
			newItems[overIndex].depth = currentProjection.depth;
			newItems[overIndex].parentId = currentProjection.parentId;
		}

		// Rebuild tree from flattened array
		const newTree = buildTree(newItems);

		// Update state once
		setTree(newTree);
		resetState();
	};

	// Get active item for DragOverlay
	const activeItem = activeId ? flattenedItems.find((item) => item.id === activeId) : null;

	return (
		<div
			style={{
				width: '280px',
				borderRight: '1px solid #ccc',
				backgroundColor: '#fff',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				position: 'relative',
			}}
		>
			{/* Pages Section */}
			<div style={{ padding: '12px 8px', borderBottom: '1px solid #e0e0e0' }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: '8px',
					}}
				>
					<span
						style={{
							fontSize: '11px',
							fontWeight: 600,
							color: '#666',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
						}}
					>
						Pages
					</span>
					<button
						onClick={() => addPage()}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							padding: '4px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							borderRadius: '2px',
							color: '#666',
						}}
						aria-label="Add page"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
						</svg>
					</button>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
					{pages.map((page) => (
						<div
							key={page.id}
							style={{
								display: 'flex',
								alignItems: 'center',
								height: '36px',
								paddingRight: '8px',
								paddingLeft: '8px',
								backgroundColor:
									currentPageId === page.id ? '#f0f0f0' : 'transparent',
								color: currentPageId === page.id ? '#1e1e1e' : '#1e1e1e',
								borderRadius: '2px',
								fontSize: '13px',
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
										if (e.key === 'Enter') {
											if (editingPageName.trim()) {
												renamePage(page.id, editingPageName.trim());
											}
											setEditingPageId(null);
										} else if (e.key === 'Escape') {
											setEditingPageId(null);
										}
									}}
									autoFocus
									style={{
										flex: 1,
										fontSize: '13px',
										padding: '2px 4px',
										border: '1px solid #3858e9',
										borderRadius: '2px',
										outline: 'none',
										backgroundColor: '#fff',
									}}
									onClick={(e) => e.stopPropagation()}
								/>
							) : (
								<span
									style={{
										flex: 1,
										fontWeight: currentPageId === page.id ? 500 : 400,
										userSelect: 'none',
										pointerEvents: 'auto',
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
							<div
								onClick={(e) => e.stopPropagation()}
								onMouseDown={(e) => e.stopPropagation()}
							>
								<DropdownMenu
									icon={moreVertical}
									label="Page options"
									popoverProps={{ placement: 'left-start' }}
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
														alert('Cannot delete the last page');
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
					padding: '12px 8px 8px 8px',
					borderBottom: '1px solid #e0e0e0',
				}}
			>
				<span
					style={{
						fontSize: '11px',
						fontWeight: 600,
						color: '#666',
						textTransform: 'uppercase',
						letterSpacing: '0.5px',
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

			{/* Tree */}
			<div style={{ flex: 1, overflow: 'auto' }}>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					measuring={measuring}
					onDragStart={handleDragStart}
					onDragMove={handleDragMove}
					onDragEnd={handleDragEnd}
				>
					<SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
						<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
							{flattenedItems.map((item) => {
								const isSelected = selectedNodeIds.includes(item.id);
								const isRootVStack = item.id === ROOT_VSTACK_ID;
								const isOverItem = overId === item.id;
								const projectedDepth = isOverItem && currentProjection ? currentProjection.depth : undefined;

								return (
									<SortableTreeItem
										key={item.id}
										id={item.id}
										value={item.id}
										depth={item.depth}
										indentationWidth={indentationWidth}
										itemType={item.type}
										itemName={item.name}
										collapsed={item.collapsed}
										childCount={item.children?.length || 0}
										isSelected={isSelected}
										isRootVStack={isRootVStack}
										currentPage={currentPage}
										canPaste={canPaste}
										indicator={isOverItem}
										projectedDepth={projectedDepth}
										onCollapse={() => handleCollapse(item.id)}
										onClick={(e: any) => {
											if (editingNodeId === item.id) {
												e.stopPropagation();
												return;
											}
											const multiSelect = e.metaKey || e.ctrlKey;
											const rangeSelect = e.shiftKey;
											toggleNodeSelection(item.id, multiSelect, rangeSelect, tree);
										}}
										onRemove={() => removeComponent(item.id)}
										onDuplicate={() => duplicateComponent(item.id)}
										onCopy={() => copyComponent(item.id)}
										onPaste={() => pasteComponent(item.id)}
										onMoveUp={() => moveComponent(item.id, 'up')}
										onMoveDown={() => moveComponent(item.id, 'down')}
										editingNodeId={editingNodeId}
										editingNodeName={editingNodeName}
										onEditStart={() => {
											setEditingNodeId(item.id);
											const node = findNodeInTree(item.id);
											setEditingNodeName(node?.name || '');
										}}
										onEditChange={(name) => setEditingNodeName(name)}
										onEditEnd={(save) => {
											if (save && editingNodeName.trim()) {
												updateComponentName(item.id, editingNodeName.trim());
											}
											setEditingNodeId(null);
										}}
									/>
								);
							})}
						</ul>
					</SortableContext>
					{createPortal(
						<DragOverlay dropAnimation={null}>
							{activeItem ? (
								<TreeItem
									clone
									depth={activeItem.depth}
									indentationWidth={indentationWidth}
									itemType={activeItem.type}
									itemName={activeItem.name}
									value={activeItem.id}
									childCount={activeItem.children?.length || 0}
								/>
							) : null}
						</DragOverlay>,
						document.body
					)}
				</DndContext>
			</div>

			{/* Reset Button */}
			{tree.length > 0 && (
				<div style={{ padding: '8px', borderTop: '1px solid #ccc' }}>
					<Button
						variant="secondary"
						size="small"
						onClick={() => {
							if (
								confirm(
									'Are you sure you want to reset the entire tree? This will also clear the AI assistant chat history.'
								)
							) {
								resetTree();
								window.location.reload();
							}
						}}
						isDestructive
						style={{ width: '100%' }}
					>
						Reset All
					</Button>
				</div>
			)}
		</div>
	);
};
