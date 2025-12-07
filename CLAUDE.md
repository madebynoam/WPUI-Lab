# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WP-Designer is a visual UI builder for WordPress-style interfaces with AI assistance. It uses a tree-based architecture where everything is a `ComponentNode`, managed through a Redux-style reducer pattern with comprehensive undo/redo support.

## Framework Setup

**Framework**: Next.js 16 with App Router

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
```

**Directory Structure**:
- `/app` - Next.js App Router (routes, API endpoints)
- `/src` - Core application code
  - `/components` - UI components
  - `/agent` - AI agent system
  - `/utils` - Helper functions
  - `/patterns` - Pre-built UI patterns

**Important**: All Next.js pages use `dynamic` imports with `ssr: false` to avoid hydration issues:

```tsx
const DynamicEditor = dynamic(() => import('../../../../src/components/Editor'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});
```

## Core Architecture

### Data Model Hierarchy

```typescript
Project {
  id, name, pages[], currentPageId
  theme: { primaryColor, backgroundColor }
  layout: { maxWidth, padding, spacing }
}

Page {
  id, name
  tree: ComponentNode[]  // Always starts with ROOT_VSTACK_ID
}

ComponentNode {
  id: string              // "node-{timestamp}-{random}"
  type: string           // "Button", "Card", "VStack", etc.
  props: Record<string, any>
  children?: ComponentNode[]
  interactions?: Interaction[]  // onClick navigate/showModal
}
```

### The Root VStack Pattern

**Every page has exactly one root ComponentNode** with `id: "root-vstack"` and `type: "VStack"`. All components are children of this root. You cannot delete the root VStack.

```typescript
// src/utils/treeHelpers.ts
export const ROOT_VSTACK_ID = 'root-vstack';
```

### State Management Flow

All state lives in `ComponentTreeContext` and mutations go through `componentTreeReducer`:

```
User Action → dispatch(action) → componentTreeReducer → New State → localStorage
                                        ↓
                                  updateHistory() (if applicable)
```

**Key Files**:
- `src/ComponentTreeContext.tsx` (584 lines) - Provider, state, operations
- `src/ComponentTreeReducer.ts` (834 lines) - 30+ action types, immutable updates
- `src/ComponentTreeTypes.ts` - Action type definitions

### Component Registry

All 27+ available components are defined in `src/componentRegistry.tsx`:

```typescript
export const componentRegistry: Record<string, ComponentDefinition> = {
  Button: {
    component: Button,           // From @wordpress/components
    acceptsChildren: false,
    defaultProps: { text: 'Button', variant: 'primary' },
    propDefinitions: [...]       // For PropertiesPanel controls
  },
  Card: {
    component: Card,
    acceptsChildren: true,
    defaultChildren: [           // Pre-populated structure
      { type: 'CardHeader', ... },
      { type: 'CardBody', ... }
    ],
    propDefinitions: [...]
  }
}
```

Component categories for the UI inserter are in `src/config/availableComponents.ts`.

## Critical Tree Operations

### Immutable Tree Helpers

**File**: `src/utils/treeHelpers.ts` (356 lines)

Always use these helpers - never mutate the tree directly:

```typescript
// Find
findNodeById(tree, id)
findParent(tree, targetId)

// Update (returns new tree)
updateNodeInTree(tree, id, updater)
insertNodeInTree(tree, node, parentId?, index?)
removeNodeFromTree(tree, id)
duplicateNodeInTree(tree, id)
moveNodeInTree(tree, id, 'up' | 'down')

// Utility
generateId()              // "node-{timestamp}-{random}"
deepCloneNode(node)       // Deep clone with new IDs
flattenTree(tree)         // BFS traversal
```

**Pattern**: All tree mutations must be immutable:

```typescript
// ❌ WRONG
const node = findNodeById(tree, id);
node.props.text = 'New Text';

// ✅ CORRECT
const newTree = updateNodeInTree(tree, id, (node) => ({
  ...node,
  props: { ...node.props, text: 'New Text' }
}));
```

### Normalization

Before inserting nodes (especially AI-generated), normalize them:

```typescript
// src/utils/normalizeComponent.ts
normalizeComponentNode(node)
// - Ensures 'children' array exists for containers
// - Ensures 'interactions' array exists
// - Normalizes text content → children prop
// - Recursively normalizes children
```

### History System

The reducer maintains undo/redo history (max 50 states). Actions that modify tree structure save to history:

```typescript
// See HISTORY_ACTIONS set in ComponentTreeReducer.ts line 45
const HISTORY_ACTIONS = new Set([
  'UPDATE_COMPONENT_PROPS',
  'INSERT_COMPONENT',
  'REMOVE_COMPONENT',
  'ADD_PAGE',
  // ... 15+ more
]);
```

UI state changes (selection, collapsed nodes) don't save to history.

## AI Agent System

### Architecture (v3.0 Two-Phase System)

```
User Message → AgentPanel → messageHandler.ts
     ↓
Phase 1: PLANNER (context tools only)
  - Calls context_getProject to understand current state
  - Creates JSON execution plan with steps
  - Uses: context_getProject, context_searchComponents
     ↓
Phase 2: BUILDER (action tools)
  - Executes plan step-by-step
  - Uses: buildFromMarkup, component_update, createPage, etc.
  - Follows plan EXACTLY, no verification/duplication
     ↓
NextJSProxyProvider → /app/api/chat/route.ts (server-side)
     ↓
OpenAI/Anthropic API (GPT-5-Mini or Claude Sonnet 4.5)
     ↓
Tool Calls → Execute Tools → Update Tree → Response
```

**Key Files**:
- `src/agent/messageHandler.ts` - Phase orchestration
- `src/agent/prompts/planner.ts` - Planner system prompt
- `src/agent/prompts/builder.ts` - Builder system prompt (generated dynamically with plan)
- `src/agent/agentConfig.ts` - Model configuration
- `src/agent/tools/registry.ts` - Tool registration
- `src/agent/tools/actions.ts` - Core action tools
- `src/agent/tools/consolidatedContext.ts` - Context tools
- `app/api/chat/route.ts` - LLM proxy (keeps API keys server-side)

**Debug Mode**: Add `?debug_agent=true` to URL to enable AgentDebugUI showing:
- Phase execution results with token/cost metrics
- Editable system prompts (can modify and rerun)
- Available tools per phase
- Copy buttons for prompts and outputs

### Agent Tools

**Context Tools** (read-only):
- `context_getProject` - Get current page state (AI should call this FIRST)
- `context_searchComponents` - Find components by type/name

**Action Tools** (mutations):
- `component_update` - Update component props
- `component_delete` - Remove component
- `component_move` - Reorder component
- `buildFromMarkup` - Create from JSX syntax (primary creation method)
- `table_create` - Create DataViews table
- `section_create` - Create common sections (hero, pricing, etc.)

### buildFromMarkup Tool

The AI generates JSX-like syntax that gets parsed into ComponentNodes:

```typescript
// AI calls:
buildFromMarkup({
  markup: `
    <Grid columns={12}>
      <Card gridColumnSpan={6}>
        <CardHeader>
          <Heading level={3}>Title</Heading>
        </CardHeader>
        <CardBody>
          <Text>Content</Text>
        </CardBody>
      </Card>
    </Grid>
  `
})

// Parser (src/utils/markupParser.ts) converts to ComponentNodes with IDs
```

**Important Markup Rules**:
- Card must contain CardHeader/CardBody/CardFooter (never direct children)
- Use proper nesting (VStack contains children, Text doesn't)
- Props syntax: `variant="primary"`, `columns={3}`, `enabled={true}`
- Grid children use `gridColumnSpan` and `gridRowSpan` props (e.g., `gridColumnSpan={6}` for half-width in 12-column grid)
- NEVER use placeholders - always generate realistic, production-ready content

### Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
```

## Rendering System

### Two Modes

**Design Mode** (`isPlayMode: false`):
- Figma-style selection/hover
- Drag & drop reordering
- Click to select, double-click to drill down
- Components are non-interactive

**Play Mode** (`isPlayMode: true`):
- Interactive components (buttons work, forms submit)
- Execute interactions (onClick navigate)
- Runtime state via `PlayModeContext`

### Key Components

**Canvas** (`src/components/Canvas.tsx`):
- Main rendering area
- Breadcrumb navigation
- Keyboard shortcuts
- Theme/layout integration

**RenderNode** (`src/components/RenderNode.tsx`, 2,088 lines):
- Recursively renders ComponentNode tree
- Handles both Design and Play modes
- Figma-style selection logic
- Drag & drop with @dnd-kit
- Executes interactions in Play mode

**TreePanel** (`src/components/TreePanel.tsx`):
- Left sidebar component hierarchy
- Drag & drop reordering
- Collapse/expand nodes
- Component inserter

**PropertiesPanel** (`src/components/PropertiesPanel.tsx`):
- Right sidebar props editor
- Single/multi-selection support
- Interactions editor
- Page/project settings

**AgentPanel** (`src/components/AgentPanel.tsx`):
- AI chat interface (Agenttic-UI)
- Streaming responses
- Tool call progress
- Token/cost tracking

**AgentDebugUI** (`src/components/AgentDebugUI.tsx`):
- Debug overlay (enabled with `?debug_agent=true`)
- Shows planner/builder phase results
- Editable system prompts with rerun capability
- Copy buttons for prompts and outputs
- Token usage and cost per phase

## Common Workflows

### Adding a New Component Type

1. Add to `src/componentRegistry.tsx`:
```typescript
MyComponent: {
  name: 'MyComponent',
  component: MyReactComponent,  // From @wordpress/components
  acceptsChildren: true,
  defaultProps: { ... },
  propDefinitions: [ ... ]
}
```

2. Add to `src/config/availableComponents.ts` if visible in inserter

3. Update `src/components/RenderNode.tsx` only if special rendering needed

### Adding a New Agent Tool

1. Create tool in `src/agent/tools/`:
```typescript
export const myTool: AgentTool = {
  name: 'myTool',
  description: 'Does something useful',
  category: 'action',
  parameters: { ... },
  handler: async (args, context) => {
    const { tree, updateComponentProps } = context;
    // Validate, execute, return result
  }
};
```

2. Register in `src/agent/tools/registry.ts`:
```typescript
import { myTool } from './myTool';
registerTool(myTool);
```

### Working with Context

```tsx
import { useComponentTree } from '../ComponentTreeContext';

const MyComponent = () => {
  const {
    tree,                    // Current page's ComponentNode[]
    selectedNodeIds,         // Selected node IDs
    addComponent,            // Add new component
    updateComponentProps,    // Update props
    removeComponent,         // Delete component
    undo, redo              // History
  } = useComponentTree();

  // ...
};
```

### Dispatching Actions

```typescript
import { useComponentTreeDispatch } from '../ComponentTreeContext';

const dispatch = useComponentTreeDispatch();

// With history
dispatch({
  type: 'UPDATE_COMPONENT_PROPS',
  payload: { id: 'node-123', props: { text: 'New' } }
});

// Without history (UI state)
dispatch({
  type: 'SET_SELECTED_NODE_IDS',
  payload: { ids: ['node-123'] }
});
```

## Code Generation

```typescript
// src/utils/codeGenerator.ts (445 lines)
generateComponentCode(tree: ComponentNode[]): string

// Converts ComponentNode tree to React JSX code
// - Handles special props (gridColumnSpan → CSS Grid)
// - Converts layout constraints (maxWidth → inline styles)
// - Generates interaction handlers
// - Includes WordPress import statements
```

Used by CodePanel (`src/components/CodePanel.tsx`) to show generated code.

## Patterns System

Pre-built UI patterns in `src/patterns/*.ts`:
- `navigation.ts` - Hero, navbar, footer
- `dashboards.ts` - Dashboard layouts, stats
- `tables.ts` - Data tables with DataViews
- `forms.ts` - Login, signup, contact forms
- `crud.ts` - CRUD interfaces
- `modals.ts` - Confirmation, info modals

Patterns use `PatternNode` (no IDs), converted to `ComponentNode` on insert.

## Keyboard Shortcuts

```
Cmd+Z          Undo
Cmd+Shift+Z    Redo
Cmd+C          Copy component
Cmd+V          Paste component
Cmd+X          Cut component
Cmd+D          Duplicate component
Delete         Delete component
Cmd+\          Toggle UI panels
Escape         Deselect / Exit play mode
```

## Important Constraints

1. **Never mutate tree directly** - Always use immutable helpers
2. **Always normalize AI-generated nodes** before inserting
3. **Root VStack cannot be deleted** - It's the required root
4. **Card components must have CardHeader/CardBody/CardFooter** children
5. **Dynamic imports with ssr: false** for all Next.js pages using WordPress components
6. **API keys stay server-side** - Use `/app/api/chat/route.ts` proxy
7. **Max 50 history states** - Older states are dropped
8. **Grid layout** - Children use `gridColumnSpan`/`gridRowSpan` props, not `columnSpan`
9. **Agent phases** - Planner creates plan, Builder executes it (no duplication/verification)

## Debugging

Enable debug logging:

```typescript
// src/ComponentTreeReducer.ts line 21
const DEBUG = true;  // Logs all actions

// src/agent/messageHandler.ts
console.log('[Agent] Tool calls:', toolCalls);
```

Common issues:
- **"Component not found in registry"** - Check `componentRegistry.tsx`
- **Tree mutation detected** - Use `updateNodeInTree()` not direct mutation
- **Hydration mismatch** - Use `dynamic` imports with `ssr: false`
- **Agent not finding component** - AI must call `context_getProject` first

## Additional Documentation

- `docs/AGENT_ARCHITECTURE.md` - Agent system evolution and design decisions
- `README.md` - Project overview
- [@wordpress/components docs](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-components/)
- [@automattic/agenttic-ui](https://github.com/Automattic/agenttic-ui) - AI chat interface

## Critical Files Reference

**Must understand** (core architecture):
- `src/ComponentTreeContext.tsx` - State provider
- `src/ComponentTreeReducer.ts` - State mutations
- `src/types.ts` - Data model
- `src/componentRegistry.tsx` - Component definitions
- `src/components/RenderNode.tsx` - Rendering logic
- `src/utils/treeHelpers.ts` - Tree operations
- `src/agent/messageHandler.ts` - Agent orchestration
- `src/agent/tools/actions.ts` - Core agent tools
- `src/utils/markupParser.ts` - JSX parser

**Important** (features):
- `src/components/Canvas.tsx` - Main canvas
- `src/components/TreePanel.tsx` - Component tree UI
- `src/components/PropertiesPanel.tsx` - Props editor
- `src/components/AgentPanel.tsx` - AI chat
- `src/utils/codeGenerator.ts` - JSX code generation
- `app/api/chat/route.ts` - LLM proxy API
