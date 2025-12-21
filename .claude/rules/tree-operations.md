---
paths: "{src/ComponentTreeReducer.ts,src/utils/treeHelpers.ts,src/contexts/ComponentTreeContext.tsx}"
---

# Tree Operations Rules

## Immutability is CRITICAL

**NEVER mutate the tree directly. ALWAYS use immutable helpers.**

```typescript
// ❌ WRONG - Direct mutation
const node = findNodeById(tree, id);
node.props.text = 'New Text';

// ✅ CORRECT - Immutable update
const newTree = updateNodeInTree(tree, id, (node) => ({
  ...node,
  props: { ...node.props, text: 'New Text' }
}));
```

## Required Tree Helpers

Always use these helpers from `src/utils/treeHelpers.ts`:

### Find Operations
- `findNodeById(tree, id)` - Find node by ID
- `findParent(tree, targetId)` - Find parent of node
- `flattenTree(tree)` - BFS traversal for all nodes

### Update Operations (return new tree)
- `updateNodeInTree(tree, id, updater)` - Update single node
- `insertNodeInTree(tree, node, parentId?, index?)` - Insert node
- `removeNodeFromTree(tree, id)` - Remove node
- `duplicateNodeInTree(tree, id)` - Duplicate node with new IDs
- `moveNodeInTree(tree, id, 'up' | 'down')` - Reorder within parent

### Utility Functions
- `generateId()` - Generate unique ID: `"node-{timestamp}-{random}"`
- `deepCloneNode(node)` - Deep clone with new IDs for all descendants

## The Root VStack Pattern

Every page has exactly ONE root ComponentNode:
- `id: "root-vstack"` (or `ROOT_GRID_ID`)
- `type: "VStack"`
- Cannot be deleted
- All components are children of this root

```typescript
import { ROOT_GRID_ID } from '@/contexts/ComponentTreeContext';

// Don't delete root
if (id !== ROOT_GRID_ID) {
  removeComponent(id);
}
```

## State Management Flow

All mutations go through the reducer:

```
User Action → dispatch(action) → componentTreeReducer → New State → localStorage
                                        ↓
                                  updateHistory() (if applicable)
```

## History System

Actions that modify tree structure save to history (max 50 states):

```typescript
const HISTORY_ACTIONS = new Set([
  'UPDATE_COMPONENT_PROPS',
  'INSERT_COMPONENT',
  'REMOVE_COMPONENT',
  'GROUP_COMPONENTS',
  'UNGROUP_COMPONENTS',
  // ... see ComponentTreeReducer.ts line 45
]);
```

UI state changes (selection, collapsed nodes, grid lines) do NOT save to history.

## Normalization Before Insert

Always normalize AI-generated nodes before inserting:

```typescript
import { normalizeComponentNode } from '@/utils/normalizeComponent';

const normalizedNode = normalizeComponentNode(rawNode);
insertComponent(normalizedNode, parentId);
```

Normalization ensures:
- `children` array exists for containers
- `interactions` array exists
- Text content is converted to `children` prop
- Recursive normalization of all descendants

## ComponentNode Structure

```typescript
interface ComponentNode {
  id: string;              // "node-{timestamp}-{random}"
  type: string;            // "Button", "Card", "VStack", etc.
  props: Record<string, any>;
  children?: ComponentNode[];
  interactions?: Interaction[];
  width?: 'fill' | 'hug'; // For VStack/HStack children only
}
```

## Common Patterns

### Update Props
```typescript
dispatch({
  type: 'UPDATE_COMPONENT_PROPS',
  payload: { id: 'node-123', props: { text: 'New Text' } }
});
```

### Insert Component
```typescript
dispatch({
  type: 'INSERT_COMPONENT',
  payload: { node: newNode, parentId: 'node-456', index: 2 }
});
```

### Group Components
```typescript
dispatch({
  type: 'GROUP_COMPONENTS',
  payload: { ids: ['node-1', 'node-2', 'node-3'] }
});
```

### Ungroup Components
```typescript
dispatch({
  type: 'UNGROUP_COMPONENTS',
  payload: { id: 'vstack-container-id' }
});
```
