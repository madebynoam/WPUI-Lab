# Memory-Based Multi-Agent Architecture

## Overview

This document describes the memory-based multi-agent system for WP-Designer's AI assistant. This architecture replaces the previous single-agent approach with specialized agents that communicate through shared memory.

## Why This Architecture?

### Problems with Previous Approach (v2.0)

1. **Single agent doing everything** - One LLM agent with all 19 tools, leading to:
   - Large prompts (~2,500 tokens)
   - Confusion about which tool to use
   - No validation before returning to user
   - Errors discovered too late

2. **Not testable** - Monolithic design made it impossible to:
   - Test individual components in isolation
   - Mock LLM responses for fast tests
   - Run regression tests affordably
   - Catch errors before deployment

3. **Cost inefficient** - Every request paid for:
   - Full tool set in prompt (even for simple tasks)
   - Full context re-sent on each iteration
   - No separation between cheap/expensive operations

4. **Poor user feedback** - All results dumped at the end:
   - No progress updates during execution
   - Can't see what agent is doing
   - Failures discovered only after waiting

### Benefits of New Approach

1. **Specialized agents** - Each agent knows 3-5 tools, leading to:
   - Smaller prompts (~500 tokens vs 2,500)
   - Clear responsibility boundaries
   - Better at their specific job
   - Easier to debug and improve

2. **Fully testable** - Everything can be tested:
   - Unit tests: Memory, tools, agents (2s, $0)
   - Integration tests: Multi-agent workflows (10s, $0.004)
   - Eval suite: 25 regression scenarios (60s, $0.07)
   - Fast feedback loop

3. **Cost efficient** - Pay only for what you need:
   - Simple task: 1 cheap agent (~$0.0010)
   - Medium task: 1 specialized agent (~$0.0020)
   - Complex task: Multiple agents + validation (~$0.0030)
   - Memory search: 20-200 tokens vs 2,000-5,000 tokens

4. **Great user feedback** - Real-time progress:
   - See which agent is working
   - Progress messages as tasks complete
   - Clear success/failure summary
   - Know what went wrong immediately

## Architecture Diagram

```
User: "Create dashboard page with table and 3 cards"
    ↓
┌─────────────────────────────────────────────────────────┐
│ CLASSIFIER (GPT-4o-mini, ~$0.0002)                      │
│ Analyzes: "dashboard page" → PageAgent needed           │
│           "table and cards" → CreatorAgent needed       │
│ Output: { agents: ['PageAgent', 'CreatorAgent'],        │
│           complexity: 4 }                                │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ SHARED MEMORY (In-Memory Store)                         │
│ - Session-scoped (cleared after request)                │
│ - Structured entries with timestamps                    │
│ - Searchable by action, entityId, agent                 │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────┐  ┌─────────────────────────────┐
│ PAGE AGENT          │  │ CREATOR AGENT               │
│ (GPT-5-Mini)        │  │ (GPT-5-Mini)                │
│                     │  │                             │
│ 1. Search memory:   │  │ 1. Search memory:           │
│    "page exists?"   │  │    "active page?"           │
│    → No             │  │    → Found page-123         │
│                     │  │                             │
│ 2. Tool: createPage │  │ 2. Tool: table_create       │
│    → page-123       │  │    → table-abc              │
│                     │  │                             │
│ 3. Write memory:    │  │ 3. Tool: buildFromMarkup    │
│    page_created     │  │    → 3 cards                │
│                     │  │                             │
│ 4. Emit: "✓ Page   │  │ 4. Write memory:            │
│    created"         │  │    component_created        │
│                     │  │                             │
│ Cost: $0.0012       │  │ 5. Emit: "✓ Created 4       │
│                     │  │    components"              │
│                     │  │                             │
│                     │  │ Cost: $0.0015               │
└─────────────────────┘  └─────────────────────────────┘
    ↓                           ↓
    └───────────┬───────────────┘
                ↓
┌─────────────────────────────────────────────────────────┐
│ VALIDATOR (GPT-4o-mini, ~$0.0006)                       │
│                                                          │
│ 1. Read memory log:                                     │
│    - page_created (page-123)                            │
│    - component_created (table-abc + 3 cards)            │
│                                                          │
│ 2. Compare to user intent:                              │
│    Expected: 1 page + 1 table + 3 cards                 │
│    Actual: 1 page + 1 table + 3 cards                   │
│    → MATCH                                               │
│                                                          │
│ 3. Emit: "✅ Completed 4/4 tasks"                       │
│                                                          │
│ Total cost: $0.0033 | Time: 4.8s                        │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Memory System

**File**: `src/agent/memory/MemoryStore.ts`

**Purpose**: Shared state between agents without re-prompting entire context.

**Interface**:
```typescript
interface MemoryEntry {
  id: string;              // "mem-{timestamp}-{random}"
  timestamp: number;       // Date.now()
  agent: string;           // 'PageAgent', 'CreatorAgent', etc.
  action: ActionType;      // 'page_created', 'component_created', etc.
  entityId?: string;       // 'page-123', 'card-abc', etc.
  entityType?: string;     // 'Page', 'Card', 'Button', etc.
  details: any;            // Action-specific data
  parentAction?: string;   // ID of parent memory entry
}

type ActionType =
  | 'page_created'
  | 'page_switched'
  | 'component_created'
  | 'component_updated'
  | 'component_deleted'
  | 'component_moved'
  | 'validation_passed'
  | 'validation_failed'
  | 'error';

class MemoryStore {
  private entries: MemoryEntry[] = [];

  write(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): MemoryEntry;
  search(query: MemoryQuery): MemoryEntry[];
  get(id: string): MemoryEntry | null;
  getAll(): MemoryEntry[];
  clear(): void;
}

interface MemoryQuery {
  action?: ActionType;
  agent?: string;
  entityId?: string;
  entityType?: string;
  latest?: boolean;       // Return only most recent
  since?: number;         // Timestamp filter
}
```

**Example Usage**:
```typescript
// PageAgent writes
memory.write({
  agent: 'PageAgent',
  action: 'page_created',
  entityId: 'page-123',
  entityType: 'Page',
  details: { name: 'Dashboard' }
});

// CreatorAgent searches
const pages = memory.search({
  action: 'page_created',
  latest: true
});
// Returns: [{ entityId: 'page-123', ... }]
```

**Token Savings**:
- Without memory: Send full page state (2,000+ tokens)
- With memory: Search returns 20-200 tokens
- **10x reduction** in context size

### 2. Classifier

**File**: `src/agent/classifier/Classifier.ts`

**Purpose**: Analyze user request and determine which agents are needed.

**Model**: GPT-4o-mini (cheap, fast)

**Input**: User message

**Output**:
```typescript
interface ClassifierResult {
  taskType: 'simple_update' | 'page_creation' | 'bulk_creation' | 'complex_task';
  complexity: 1 | 2 | 3 | 4 | 5;
  requiredAgents: ('PageAgent' | 'CreatorAgent' | 'UpdateAgent')[];
  reasoning: string;
}
```

**Examples**:
```typescript
// User: "Change button color to blue"
{
  taskType: 'simple_update',
  complexity: 1,
  requiredAgents: ['UpdateAgent'],
  reasoning: 'Simple prop update, no creation needed'
}

// User: "Create pricing page with 3 tiers"
{
  taskType: 'page_creation',
  complexity: 3,
  requiredAgents: ['PageAgent', 'CreatorAgent'],
  reasoning: 'New page creation + section template'
}

// User: "Add dashboard with user table and 3 metric cards"
{
  taskType: 'complex_task',
  complexity: 4,
  requiredAgents: ['PageAgent', 'CreatorAgent'],
  reasoning: 'Page creation + multiple component types'
}
```

**Cost**: ~$0.0002 per classification

### 3. Specialist Agents

Each agent is a specialized LLM with focused tools and prompt.

#### PageAgent

**File**: `src/agent/agents/PageAgent.ts`

**Responsibility**: Page creation, switching, deletion

**Tools** (3 total):
- `createPage` - Create new page
- `switchPage` - Switch to different page
- `deletePage` - Delete page

**Prompt** (~500 tokens):
```
You are the Page Agent for WP-Designer.

Your ONLY job is managing pages:
- Create new pages
- Switch between pages
- Delete pages

WORKFLOW:
1. Search memory: Check if page already exists
   memory.search({ action: 'page_created', entityType: 'Page' })
2. If exists: Use existing page
3. If not: Create new page
4. Write to memory: Record your actions
5. Emit progress: Keep user informed

TOOLS AVAILABLE:
- createPage({ name: string })
- switchPage({ pageId: string })
- deletePage({ pageId: string })

MEMORY WRITES:
After createPage: { action: 'page_created', entityId, entityType: 'Page' }
After switchPage: { action: 'page_switched', entityId }
```

**Example Execution**:
```
User: "Create dashboard page"

Agent workflow:
1. Search memory for 'Dashboard' page → Not found
2. Call createPage({ name: 'Dashboard' }) → page-123
3. Write memory: { action: 'page_created', entityId: 'page-123' }
4. Emit: "✓ PageAgent: Created Dashboard page"

Cost: ~$0.0010
```

#### CreatorAgent

**File**: `src/agent/agents/CreatorAgent.ts`

**Responsibility**: Component creation (bulk and templates)

**Tools** (3 total):
- `buildFromMarkup` - Create from JSX syntax
- `section_create` - Create section templates (pricing, hero, etc.)
- `table_create` - Create DataViews tables

**Prompt** (~500 tokens):
```
You are the Creator Agent for WP-Designer.

Your ONLY job is creating components:
- Build components from markup (JSX syntax)
- Create section templates (pricing, hero, features, etc.)
- Create data tables (users, orders, products, etc.)

WORKFLOW:
1. Search memory: Find active page
   memory.search({ action: 'page_created', latest: true })
2. Search memory: Check if parent component selected
3. Choose creation method:
   - Bulk/custom: buildFromMarkup
   - Section template: section_create
   - Data table: table_create
4. Create components
5. Write to memory: Record what you created
6. Emit progress: Keep user informed

TOOLS AVAILABLE:
- buildFromMarkup({ markup: string, parentId?: string })
- section_create({ template: 'pricing' | 'hero' | ..., content: any })
- table_create({ template: 'users' | 'orders' | ..., parentId?: string })

MEMORY WRITES:
After creation: {
  action: 'component_created',
  entityId: string | string[],
  entityType: 'Card' | 'Button' | ...,
  details: { count: number, parentId: string }
}
```

**Example Execution**:
```
User: "Add 3 pricing cards"

Agent workflow:
1. Search memory for active page → page-123
2. Determine method: bulk creation (custom layout)
3. Call buildFromMarkup({
     markup: '<Grid columns={3}><Card>...</Card></Grid>'
   })
   → Created 3 cards
4. Write memory: {
     action: 'component_created',
     entityId: ['card-1', 'card-2', 'card-3'],
     entityType: 'Card',
     details: { count: 3, method: 'buildFromMarkup' }
   }
5. Emit: "✓ CreatorAgent: Created 3 pricing cards"

Cost: ~$0.0018
```

#### UpdateAgent

**File**: `src/agent/agents/UpdateAgent.ts`

**Responsibility**: Component updates, moves, deletes

**Tools** (3 total):
- `component_update` - Update props or text
- `component_move` - Move to different parent
- `component_delete` - Delete component

**Prompt** (~500 tokens):
```
You are the Update Agent for WP-Designer.

Your ONLY job is modifying existing components:
- Update component props (color, text, variant, etc.)
- Move components to different parents
- Delete components

WORKFLOW:
1. Search memory: Find recently created components
   memory.search({ action: 'component_created' })
2. Use component_update with selector or ID
3. Write to memory: Record your changes
4. Emit progress: Keep user informed

TOOLS AVAILABLE:
- component_update({ selector: string | { id: string }, updates: any })
- component_move({ componentId: string, newParentId: string, position?: number })
- component_delete({ componentId: string })

MEMORY WRITES:
After update: { action: 'component_updated', entityId, details: { changes } }
After move: { action: 'component_moved', entityId, details: { from, to } }
After delete: { action: 'component_deleted', entityId }
```

**Example Execution**:
```
User: "Change submit button to blue"

Agent workflow:
1. Search memory for button → Not in recent memory
2. Call component_update({
     selector: { type: 'Button', text: 'Submit' },
     updates: { variant: 'primary' }
   })
   → Updated button-abc
3. Write memory: {
     action: 'component_updated',
     entityId: 'button-abc',
     details: { variant: 'primary' }
   }
4. Emit: "✓ UpdateAgent: Changed submit button to blue"

Cost: ~$0.0008
```

### 4. Validator

**File**: `src/agent/agents/ValidatorAgent.ts`

**Purpose**: Validate execution results against user intent

**Model**: GPT-4o-mini (cheap, fast)

**Input**:
- User message
- Memory log (all actions from session)

**Output**:
```typescript
interface ValidationResult {
  success: boolean;
  completedTasks: number;
  totalTasks: number;
  summary: string;
  issues?: string[];
}
```

**Example**:
```typescript
// User: "Create dashboard page with table and 3 cards"

// Memory log:
[
  { action: 'page_created', entityId: 'page-123' },
  { action: 'component_created', entityId: 'table-abc', entityType: 'DataViews' },
  { action: 'component_created', entityId: ['card-1', 'card-2', 'card-3'], entityType: 'Card' }
]

// Validator output:
{
  success: true,
  completedTasks: 3,
  totalTasks: 3,
  summary: "✅ Completed 3/3 tasks:\n- Created Dashboard page\n- Created user table\n- Created 3 metric cards"
}
```

**Cost**: ~$0.0006 per validation

## Message Streaming

### Real-Time Progress Updates

Agents emit messages as they work, streamed to the UI immediately.

**Interface**:
```typescript
interface AgentMessage {
  agent: string;           // 'Classifier', 'PageAgent', etc.
  type: 'progress' | 'success' | 'error';
  message: string;
  timestamp: number;
  metadata?: any;
}

// Agent emits:
emitMessage({
  agent: 'PageAgent',
  type: 'progress',
  message: 'Checking if Dashboard page exists...'
});

emitMessage({
  agent: 'PageAgent',
  type: 'success',
  message: '✓ Created Dashboard page'
});
```

**UI Display**:
```
🔍 Classifier: Analyzing request... requires PageAgent + CreatorAgent

📄 PageAgent: Checking if Dashboard page exists...
✓ PageAgent: Created Dashboard page

🎨 CreatorAgent: Searching for active page...
🎨 CreatorAgent: Found page-123
🎨 CreatorAgent: Creating table and 3 cards...
✓ CreatorAgent: Created 4 components

✅ Validator: Completed 3/3 tasks
Total cost: $0.0032 | Time: 4.2s
```

**Benefits**:
- User sees progress in real-time
- Knows which agent is working
- Can cancel if wrong direction
- Clear success/failure per step

## Testing Strategy

### Testing Pyramid

```
         /\
        /  \  Eval Suite (25 scenarios)
       /    \  - Real LLM (cheap model)
      /------\  - Regression detection
     /        \  - 60s, $0.07
    / Integration \ (10 tests)
   /   Tests       \ - Multi-agent workflows
  /-----------------\ - Real LLM, cheap model
 /                   \ - 10s, $0.004
/   Unit Tests        \ (200+ tests)
-----------------------  - Mocked LLM
                         - Pure functions
                         - 2s, $0

```

### Unit Tests

**What**: Test individual components in isolation

**Tools**: Jest, mocked LLM, mocked memory

**Examples**:

```typescript
// Memory tests (src/agent/memory/MemoryStore.test.ts)
test('write and search', () => {
  const memory = new MemoryStore();
  memory.write({ action: 'page_created', entityId: 'page-1' });

  const result = memory.search({ action: 'page_created' });
  expect(result[0].entityId).toBe('page-1');
});

// Tool tests (src/agent/tools/createPage.test.ts)
test('createPage writes to memory', async () => {
  const mockMemory = new MemoryStore();
  const result = await createPageHandler(
    { name: 'Dashboard' },
    { memory: mockMemory, addPage: jest.fn() }
  );

  expect(result.success).toBe(true);
  const entries = mockMemory.search({ action: 'page_created' });
  expect(entries.length).toBe(1);
});

// Agent tests (src/agent/agents/PageAgent.test.ts)
test('PageAgent creates page when none exists', async () => {
  const mockLLM = {
    chat: jest.fn().mockResolvedValue({
      tool_calls: [{ name: 'createPage', arguments: { name: 'Dashboard' } }]
    })
  };
  const mockMemory = new MemoryStore();

  const agent = new PageAgent(mockLLM, mockMemory, pageTools);
  await agent.execute('Create dashboard page', mockContext);

  const entries = mockMemory.search({ action: 'page_created' });
  expect(entries.length).toBe(1);
});
```

**Run**: `npm test`
**Time**: 2 seconds
**Cost**: $0

### Integration Tests

**What**: Test multi-agent workflows

**Tools**: Jest, real LLM (cheap model), real memory

**Examples**:

```typescript
// src/agent/__tests__/integration.test.ts

test('PageAgent → CreatorAgent workflow', async () => {
  const memory = new MemoryStore();
  const realLLM = new OpenAIProvider({ model: 'gpt-4o-mini' });

  const pageAgent = new PageAgent(realLLM, memory, pageTools);
  const creatorAgent = new CreatorAgent(realLLM, memory, creatorTools);

  // Step 1: Create page
  await pageAgent.execute('Create dashboard page', context);

  // Step 2: Add components (should find page in memory)
  await creatorAgent.execute('Add user table', context);

  // Verify memory log
  const pages = memory.search({ action: 'page_created' });
  const components = memory.search({ action: 'component_created' });

  expect(pages.length).toBe(1);
  expect(components.length).toBe(1);
});

test('UpdateAgent finds recently created component', async () => {
  const memory = new MemoryStore();
  const realLLM = new OpenAIProvider({ model: 'gpt-4o-mini' });

  // Setup: Create button
  memory.write({
    action: 'component_created',
    entityId: 'btn-1',
    entityType: 'Button',
    details: { text: 'Submit' }
  });

  const updateAgent = new UpdateAgent(realLLM, memory, updateTools);
  await updateAgent.execute('Change submit button to blue', context);

  const updates = memory.search({ action: 'component_updated' });
  expect(updates.length).toBe(1);
  expect(updates[0].entityId).toBe('btn-1');
});
```

**Run**: `npm run test:integration`
**Time**: 10 seconds
**Cost**: ~$0.004

### Eval Suite

**What**: Regression test suite with 25 real-world scenarios

**Tools**: Real LLM (cheap where possible), eval runner, golden dataset

**Dataset** (`src/agent/eval/dataset.ts`):

```typescript
export const evalDataset: EvalScenario[] = [
  {
    id: 'simple-page-creation',
    userMessage: 'Create a dashboard page',
    expectedMemory: [
      { action: 'page_created', entityType: 'Page' }
    ],
    expectedComponentCount: 0,
    maxCost: 0.002,
    maxTime: 5000
  },
  {
    id: 'page-with-section',
    userMessage: 'Create pricing page with 3 tiers',
    expectedMemory: [
      { action: 'page_created', entityType: 'Page' },
      { action: 'component_created', count: 3 }
    ],
    expectedComponentCount: 3,
    maxCost: 0.004,
    maxTime: 8000
  },
  {
    id: 'simple-update',
    userMessage: 'Change button color to blue',
    setupState: {
      components: [{ id: 'btn-1', type: 'Button', props: { text: 'Submit' } }]
    },
    expectedMemory: [
      { action: 'component_updated', entityId: 'btn-1' }
    ],
    expectedComponentCount: 1,
    expectedProps: { variant: 'primary' },
    maxCost: 0.001,
    maxTime: 3000
  },
  // ... 22 more scenarios
];
```

**Runner** (`src/agent/eval/runner.ts`):

```typescript
async function runEvalSuite() {
  const results: EvalResult[] = [];

  for (const scenario of evalDataset) {
    const context = setupScenario(scenario);
    const memory = new MemoryStore();

    const startTime = Date.now();
    const result = await executeMultiAgent(
      scenario.userMessage,
      context,
      memory
    );
    const elapsed = Date.now() - startTime;

    const passed =
      validateMemory(memory, scenario.expectedMemory) &&
      validateComponents(context.tree, scenario.expectedComponentCount) &&
      result.totalCost <= scenario.maxCost &&
      elapsed <= scenario.maxTime;

    results.push({
      id: scenario.id,
      passed,
      actualCost: result.totalCost,
      actualTime: elapsed,
      memory: memory.getAll()
    });
  }

  return generateReport(results);
}
```

**Report**:
```
Running 25 eval scenarios...

✓ simple-page-creation (0.8s, $0.0018)
✓ page-with-section (1.2s, $0.0032)
✓ simple-update (0.6s, $0.0010)
✓ complex-dashboard (2.4s, $0.0042)
✗ batch-update (1.1s, $0.0015) - FAILED: Expected 3 updates, got 1
✓ table-creation (1.5s, $0.0028)
...

23/25 PASSED (92% pass rate)
Total cost: $0.068
Total time: 32s

Failed scenarios:
- batch-update: UpdateAgent only updated 1 of 3 buttons
- nested-component-create: BuildFromMarkup failed to parse nested Grid
```

**Run**: `npm run eval`
**Time**: 60 seconds
**Cost**: ~$0.07

## Cost Analysis

### Per-Request Costs

| Task Type | Agents Used | Estimated Cost | Time |
|-----------|-------------|----------------|------|
| Simple update ("change button color") | Classifier + UpdateAgent + Validator | $0.0010 | 2s |
| Medium creation ("create pricing section") | Classifier + CreatorAgent + Validator | $0.0020 | 3s |
| Page creation ("create dashboard page") | Classifier + PageAgent + Validator | $0.0015 | 2.5s |
| Complex task ("dashboard with table and cards") | Classifier + PageAgent + CreatorAgent + Validator | $0.0032 | 5s |

### Breakdown by Component

| Component | Model | Input Tokens | Output Tokens | Cost |
|-----------|-------|--------------|---------------|------|
| Classifier | GPT-4o-mini | 200 | 100 | $0.0002 |
| PageAgent | GPT-5-Mini | 600 | 400 | $0.0012 |
| CreatorAgent | GPT-5-Mini | 700 | 500 | $0.0018 |
| UpdateAgent | GPT-5-Mini | 500 | 300 | $0.0010 |
| Validator | GPT-4o-mini | 600 | 200 | $0.0006 |

### Memory Search Savings

**Without Memory** (old approach):
```
Agent needs to know current state
→ Send full page tree (2,000 tokens)
→ Send all components (1,500 tokens)
→ Send selection state (200 tokens)
= 3,700 tokens per query
```

**With Memory** (new approach):
```
Agent searches memory
→ "What page was created?" (20 tokens query)
→ Returns page-123 (50 tokens result)
= 70 tokens per query

Savings: 98% reduction (3,700 → 70 tokens)
```

## Implementation Plan

See CLAUDE.md for the complete implementation plan, but here's the summary:

### Phase 1: Testing Infrastructure
- Setup Jest with TypeScript
- Create mock LLM provider
- Create test fixtures
- Create eval dataset

### Phase 2: Memory System (TDD)
- Write memory tests first
- Implement MemoryStore
- Add search functionality
- 100% test coverage before moving on

### Phase 3: Agents (One at a Time)
- PageAgent: Write tests → implement → pass tests
- CreatorAgent: Write tests → implement → pass tests
- UpdateAgent: Write tests → implement → pass tests
- Each agent fully tested before next

### Phase 4: Orchestration
- Classifier implementation
- Validator implementation
- Message streaming system
- Multi-agent coordinator

### Phase 5: UI & Integration
- Update AgentPanel for streaming messages
- Update AgentDebugUI for memory log
- Integration tests
- Eval suite

### Phase 6: Cleanup
- Remove old v2.0 code
- Update documentation
- Deploy new system

## Success Criteria

- ✅ 90%+ unit test coverage
- ✅ 100% contract test pass rate
- ✅ 90%+ eval suite pass rate
- ✅ Eval runs in <60s, costs <$0.10
- ✅ Simple tasks cost <$0.0015
- ✅ Complex tasks cost <$0.0035
- ✅ Agent messages stream to UI in real-time
- ✅ Validator gives clear summary

## Future Enhancements

### Short Term
- Add LayoutAgent for batch layout operations
- Add ContentAgent for content generation
- Implement memory persistence (beyond session)
- Add memory garbage collection

### Long Term
- Agent learning from failures (store corrections in memory)
- User feedback loop (thumbs up/down on validator results)
- Multi-turn conversations (agents ask clarifying questions)
- Agent collaboration (agents negotiate who does what)
- Cost optimization (dynamic model selection based on complexity)

## References

- Main docs: `CLAUDE.md`
- Agent evolution: `docs/AGENT_ARCHITECTURE.md`
- Testing guide: (this document)
