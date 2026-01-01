# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note**: Additional path-scoped rules are in `.claude/rules/`:
- `code-generation.md` - Code export rules, prop filtering
- `tree-operations.md` - Immutability, tree helpers, history
- `agent-system.md` - Multi-agent architecture, memory, context preservation
- `grid-layout.md` - Grid-first layout, width control, resize handles

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
  tree: ComponentNode[]  // Always starts with ROOT_GRID_ID
}

ComponentNode {
  id: string              // "node-{timestamp}-{random}"
  type: string           // "Button", "Card", "VStack", etc.
  props: Record<string, any>
  children?: ComponentNode[]
  interactions?: Interaction[]  // onClick navigate/showModal
}
```

### The Root Grid Pattern

**Every page has exactly one root ComponentNode** - a 12-column auto-flow Grid. All components are children of this root. You cannot delete the root Grid.

```typescript
// src/utils/treeHelpers.ts
export const ROOT_GRID_ID = 'root-grid';
```

**Layout Model**: iOS Today View style - components have width presets (Full, 2/3, Half, 1/3, 1/4) that map to column spans (12, 8, 6, 4, 3). Items automatically flow to next row.

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

### Architecture (Memory-Based Multi-Agent System)

The AI system uses specialized agents that communicate through shared memory, providing better decomposition, testability, and cost efficiency.

```
User Message → AgentPanel → messageHandler.ts
     ↓
CLASSIFIER (cheap, fast)
  - Analyzes request type and complexity
  - Determines required agents
  - Model: GPT-4o-mini (~$0.0002)
     ↓
SPECIALIST AGENTS (parallel execution where possible)
  - PageAgent: Page creation, switching, deletion
  - CreatorAgent: Component creation (buildFromMarkup, sections, tables)
  - UpdateAgent: Component updates, moves, deletes
  - Each agent:
    * Has 3-5 specialized tools (not all 19)
    * Reads/writes shared memory
    * Streams progress messages to UI
    * Focused prompt (~500 tokens)
     ↓
VALIDATOR (cheap, final check)
  - Reads memory log
  - Validates against user intent
  - Returns success summary: "Completed 3/3 tasks"
  - Model: GPT-4o-mini (~$0.0006)
     ↓
NextJSProxyProvider → /app/api/chat/route.ts (server-side)
     ↓
OpenAI API (GPT-4o-mini for classifier/validator, GPT-5-Mini for agents)
```

**Key Files**:
- `src/agent/messageHandler.ts` - Multi-agent orchestration
- `src/agent/memory/MemoryStore.ts` - Shared memory system
- `src/agent/classifier/Classifier.ts` - Request classification
- `src/agent/agents/PageAgent.ts` - Page operations specialist
- `src/agent/agents/CreatorAgent.ts` - Component creation specialist
- `src/agent/agents/UpdateAgent.ts` - Component update specialist
- `src/agent/agents/ValidatorAgent.ts` - Result validation
- `src/agent/prompts/` - Specialized prompts per agent
- `src/agent/tools/registry.ts` - Tool registration
- `app/api/chat/route.ts` - LLM proxy (keeps API keys server-side)

**Memory System**:
Each agent writes structured entries to shared memory:
```typescript
interface MemoryEntry {
  id: string;
  timestamp: number;
  agent: string;  // 'PageAgent', 'CreatorAgent', etc.
  action: 'page_created' | 'component_created' | 'component_updated' | 'validation_passed' | 'error';
  entityId?: string;  // pageId, componentId, etc.
  entityType?: string;  // 'Page', 'Card', 'Button'
  details: any;
  parentAction?: string;  // Link to previous action
}

// Memory operations (cheap - returns 20-200 tokens):
memory.search({ action: 'page_created', latest: true })
memory.search({ entityId: 'page-123' })
memory.get({ id: 'mem-456' })
```

**Domain Context Preservation**:

The system prevents "context amnesia" in multi-step workflows through layered context preservation:

1. **Memory as Source of Truth**: When Orchestrator receives a request, it stores the original user message in memory with action type `user_request`. All agents can read this as fallback context.

2. **Classifier as Initializer**: The Classifier doesn't just route—it creates a structured agenda for multi-step workflows. When splitting requests like "Create a 'Tiers' page with three tier cards for WordPress agencies", it:
   - Preserves domain keywords ("WordPress agencies") in EVERY instruction
   - Uses prompt engineering with few-shot BAD vs GOOD examples
   - Outputs: `[{agent: "PageAgent", instruction: "Create a 'Tiers' page"}, {agent: "CreatorAgent", instruction: "Add three tier cards showing progression for WordPress agencies"}]`

3. **Context Threading Through ALL LLM Calls**: Each agent includes full context in both initial AND follow-up LLM calls. Critical bug fixed: CreatorAgent's follow-up call after `design_getHeuristics` tool was losing context—now includes `pageContext + contextNote` in all calls.

4. **Decomposition with Context**: When CreatorAgent splits complex requests internally (e.g., "hero and testimonials" → two buildFromMarkup calls), the Decomposer prompt explicitly instructs the LLM to carry forward domain details to each fragment.

**Example Flow**:
```
User: "Create WordPress agency hero section"
↓
Orchestrator writes to memory: {action: 'user_request', details: {fullMessage: "Create WordPress agency hero section"}}
↓
Classifier routes to CreatorAgent with preserved context: "Add hero section explaining WordPress agency program benefits"
↓
CreatorAgent LLM Call #1: Includes contextNote from memory + instruction
↓
LLM calls design_getHeuristics tool
↓
CreatorAgent LLM Call #2 (Follow-up): ALSO includes contextNote (bug was here—was losing "WordPress agency" and generating generic coaching content)
↓
Result: Hero with "WordPress Agency Partner Program" heading, not generic "Career Coaching"
```

**Key Files**:
- [agentOrchestrator.ts:143-151](src/agent/agentOrchestrator.ts#L143-L151) - Stores original user_request in memory
- [Classifier.ts:166-184](src/agent/agents/Classifier.ts#L166-L184) - Prompt engineering for context preservation
- [decomposer.ts:25-38](src/agent/prompts/decomposer.ts#L25-L38) - Decomposer context preservation rules
- [CreatorAgent.ts:350](src/agent/agents/CreatorAgent.ts#L350) - Fixed follow-up LLM call to include full context

**Agent UI Feedback**:
Agents stream progress messages to the UI in real-time:
```
🔍 Classifier: Analyzing request... requires PageAgent + CreatorAgent

📄 PageAgent: Checking if Dashboard page exists...
✓ PageAgent: Created Dashboard page

🎨 CreatorAgent: Searching for active page...
🎨 CreatorAgent: Found page-123
🎨 CreatorAgent: Creating 3 pricing cards...
✓ CreatorAgent: Created 3 components

✅ Validator: Completed 3/3 tasks
Total cost: $0.0032 | Time: 4.2s
```

**Cost Efficiency**:
- Simple tasks (e.g., "change button color"): ~$0.0010 (UpdateAgent only)
- Medium tasks (e.g., "create pricing section"): ~$0.0020 (CreatorAgent only)
- Complex tasks (e.g., "create dashboard with table and cards"): ~$0.0030 (PageAgent + CreatorAgent + Validator)
- Memory search cheaper than re-sending context (20-200 tokens vs 2,000-5,000 tokens)

**Testing**:
- Unit tests for each component (memory, tools, agents) - Run in 2s, $0
- Integration tests for multi-agent workflows - Run in 10s, ~$0.004
- Eval suite with 25 regression scenarios - Run in 60s, ~$0.07
- Test commands: `npm test`, `npm run test:integration`, `npm run eval`

**Debug Mode**: Add `?debug_agent=true` to URL to enable AgentDebugUI showing:
- Memory log timeline
- Classifier decision
- Per-agent execution (tokens/cost/time)
- Progress messages
- Tool calls per agent

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
- **Grid-First Layout**:
  - Every page root is a 12-column Grid with auto-flow
  - Components in Grid: Simple width presets (Full/2/3/Half/1/3/1/4 = spans 12/8/6/4/3)
  - VStack/HStack: For content grouping only (gap + alignment, no width controls)
  - Stored as `gridColumnSpan` prop → CSS `grid-column: span X`

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

See `.claude/rules/code-generation.md` for detailed code export rules.

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

1. **Never mutate tree directly** - Always use immutable helpers (see `.claude/rules/tree-operations.md`)
2. **Always normalize AI-generated nodes** before inserting
3. **Root Grid cannot be deleted** - It's the required root (12-column auto-flow Grid)
4. **Card components must have CardHeader/CardBody/CardFooter** children
5. **Dynamic imports with ssr: false** for all Next.js pages using WordPress components
6. **API keys stay server-side** - Use `/app/api/chat/route.ts` proxy
7. **Max 50 history states** - Older states are dropped
8. **Grid layout** - Children use `gridColumnSpan`/`gridRowSpan` props (see `.claude/rules/grid-layout.md`)
9. **Agent context preservation** - ALL LLM calls include full context (see `.claude/rules/agent-system.md`)
10. **Grid-First Layout** - Simple, predictable (see `.claude/rules/grid-layout.md` for details):
   - Page root = 12-column Grid with auto-flow (columns={12}, gap={24})
   - Width control: Full (12), 2/3 (8), Half (6), 1/3 (4), 1/4 (3) → `gridColumnSpan`
   - VStack/HStack: Content grouping only (gap, alignment) - no width/height resize
   - Nest Grids for complex layouts (sidebar = Grid spanning 4 cols with own 12-col grid inside)
11. **WYSIWYG - Avoid Wrapper Divs** - This is meant to be WYSIWYG with core WordPress components:
   - Never wrap components in extra divs unless absolutely necessary
   - Extra wrappers break the visual match between editor and generated code
   - If editor-only UI is needed (resize handles, overlays), use portals or absolutely-positioned siblings
   - Exception: Wrappers are acceptable ONLY in play mode for runtime state management
   - Exception: DataViews and form fields (TextControl, SelectControl, etc.) require a wrapper div in RenderNode.tsx for selection to work (these WordPress components don't forward ref/event handlers). This is canvas-only, not in generated code.
12. **Exported code props** - Only real component props, no editor-only magic (see `.claude/rules/code-generation.md`)
13. **Clean code output** - Generated code must be usable as-is by developers:
   - Never use `!important` CSS overrides
   - Never add extra wrapper containers/divs for styling hacks
   - Use proper component props instead of inline style workarounds
   - If a WordPress component prop doesn't work, find the correct prop name (e.g., `align` vs `alignment`)

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

- `.claude/rules/` - Modular, path-scoped rules for specific files/directories
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
