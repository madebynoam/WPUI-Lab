---
paths: "src/agent/**/*.ts"
---

# AI Agent System Rules

## Memory-Based Multi-Agent Architecture

The AI system uses specialized agents that communicate through shared memory for better decomposition, testability, and cost efficiency.

### Agent Flow

```
User Message → CLASSIFIER (cheap, fast)
     ↓
Determines required agents
     ↓
SPECIALIST AGENTS (parallel where possible)
  - PageAgent: Page operations
  - CreatorAgent: Component creation
  - UpdateAgent: Component updates
     ↓
VALIDATOR (cheap, final check)
     ↓
Success summary to user
```

### Cost Efficiency

- Simple tasks: ~$0.0010 (single agent)
- Medium tasks: ~$0.0020 (single agent)
- Complex tasks: ~$0.0030 (multiple agents + validator)
- Memory search is cheaper than re-sending context (20-200 tokens vs 2,000-5,000)

## Context Preservation

**Critical**: Prevent "context amnesia" in multi-step workflows through:

1. **Memory as Source of Truth**: Orchestrator stores original user message with `action: 'user_request'`
2. **Classifier Preservation**: Classifier includes domain keywords in EVERY instruction
3. **Context Threading**: ALL LLM calls (initial + follow-up) include full context
4. **Decomposition with Context**: Internal splits preserve domain details

### Example

```
User: "Create WordPress agency hero section"
↓
Orchestrator: Writes to memory {action: 'user_request', fullMessage: "..."}
↓
Classifier: Routes to CreatorAgent with "Add hero section explaining WordPress agency program benefits"
↓
CreatorAgent LLM Call #1: Includes contextNote from memory
↓
Tool calls design_getHeuristics
↓
CreatorAgent LLM Call #2: ALSO includes contextNote (CRITICAL - was bug location)
↓
Result: Hero with "WordPress Agency Partner Program", not generic content
```

**Key Files**:
- [agentOrchestrator.ts:143-151](src/agent/agentOrchestrator.ts#L143-L151) - Stores user_request
- [Classifier.ts:166-184](src/agent/agents/Classifier.ts#L166-L184) - Context preservation prompts
- [CreatorAgent.ts:350](src/agent/agents/CreatorAgent.ts#L350) - Follow-up call context fix

## Agent Tools

Each agent has access to a subset of tools (not all 19):

### Context Tools (read-only)
- `context_getProject` - Get current page state (AI should call FIRST)
- `context_searchComponents` - Find components by type/name

### Action Tools (mutations)
- `component_update` - Update component props
- `component_delete` - Remove component
- `component_move` - Reorder component
- `buildFromMarkup` - Create from JSX syntax (primary creation method)
- `table_create` - Create DataViews table
- `section_create` - Create common sections (hero, pricing, etc.)

## buildFromMarkup Tool

Primary method for AI to create components:

```typescript
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
```

### Markup Rules

- **Card structure**: Must contain CardHeader/CardBody/CardFooter (never direct children)
- **Nesting**: Use proper hierarchy (VStack contains children, Text doesn't)
- **Props syntax**: `variant="primary"`, `columns={3}`, `enabled={true}`
- **Grid children**: Use `gridColumnSpan={6}` for half-width in 12-column grid
- **NO placeholders**: Always generate realistic, production-ready content

## Memory System

Each agent writes structured entries:

```typescript
interface MemoryEntry {
  id: string;
  timestamp: number;
  agent: string;  // 'PageAgent', 'CreatorAgent', etc.
  action: 'page_created' | 'component_created' | 'component_updated' | 'validation_passed' | 'error';
  entityId?: string;  // pageId, componentId
  entityType?: string;  // 'Page', 'Card', 'Button'
  details: any;
  parentAction?: string;  // Link to previous action
}
```

### Memory Operations

```typescript
memory.search({ action: 'page_created', latest: true })
memory.search({ entityId: 'page-123' })
memory.get({ id: 'mem-456' })
```

## Agent UI Feedback

Stream progress messages in real-time:

```typescript
yield {
  type: 'text',
  text: '🎨 CreatorAgent: Creating 3 pricing cards...'
};

yield {
  type: 'text',
  text: '✓ CreatorAgent: Created 3 components'
};
```

## Debug Mode

Enable with `?debug_agent=true` URL parameter to show:
- Memory log timeline
- Classifier decision
- Per-agent execution (tokens/cost/time)
- Progress messages
- Tool calls per agent

## Testing

- **Unit tests**: Test each component (memory, tools, agents) - 2s, $0
- **Integration tests**: Multi-agent workflows - 10s, ~$0.004
- **Eval suite**: 25 regression scenarios - 60s, ~$0.07

```bash
npm test                 # Unit tests
npm run test:integration # Integration tests
npm run eval             # Full eval suite
```

## Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
```

API keys stay server-side via `/app/api/chat/route.ts` proxy.
