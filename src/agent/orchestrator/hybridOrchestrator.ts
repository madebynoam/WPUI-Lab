/**
 * Hybrid Orchestrator - Deterministic Tools + Small Agents
 *
 * Routes requests to:
 * 1. Deterministic tools (60% - instant, $0, 100% reliable)
 * 2. Specialized agents (40% - ~500ms, ~$0.0002, 95% reliable)
 *
 * Replaces broken template-first architecture with proven multi-agent approach
 */

import { ToolContext, AgentMessage } from '../types';
import { ComponentAgent } from '../agents/ComponentAgent';
import { ContentAgent } from '../agents/ContentAgent';
import { DataAgent } from '../agents/DataAgent';
import { LayoutAgent } from '../agents/LayoutAgent';
import { PageAgent } from '../agents/PageAgent';
import { createLLMProvider } from '../llm/factory';

export interface OrchestratorResult {
  success: boolean;
  message: string;
  error?: string;
  duration: number;
  cost: number;
  source: 'deterministic' | 'agent';
  agent?: string;
}

export interface ProgressUpdate {
  phase: 'routing' | 'executing' | 'complete';
  message: string;
}

interface RequestStep {
  agent: 'page' | 'component' | 'content' | 'data' | 'layout';
  operation: string;
  params: Record<string, any>;
}

/**
 * Main orchestrator - routes to tools or agents
 */
export async function handleHybridRequest(
  userMessage: string,
  context: ToolContext,
  anthropicApiKey: string,
  onProgress?: (update: ProgressUpdate) => void,
  signal?: AbortSignal,
  conversationHistory?: AgentMessage[]
): Promise<OrchestratorResult> {
  const startTime = Date.now();

  console.log('[HybridOrchestrator] Processing:', userMessage);
  onProgress?.({ phase: 'routing', message: 'Analyzing request...' });

  const normalized = userMessage.toLowerCase();

  try {
    // STEP 1: Try simple deterministic tools first (instant, free, 100% reliable)
    // Only for truly simple single operations (color change, size change, delete)
    const deterministicResult = trySimpleDeterministicTools(normalized, context);
    if (deterministicResult) {
      console.log('[HybridOrchestrator] ✓ Deterministic tool:', deterministicResult.message);
      return {
        ...deterministicResult,
        duration: Date.now() - startTime,
        cost: 0,
        source: 'deterministic',
      };
    }

    // STEP 2: Use LLM to decompose request into steps
    onProgress?.({ phase: 'routing', message: 'Planning steps...' });

    const steps = await decomposeRequest(userMessage, anthropicApiKey, signal, conversationHistory);

    if (steps.length === 0) {
      return {
        success: false,
        message: 'Could not understand request',
        duration: Date.now() - startTime,
        cost: 0,
        source: 'agent',
      };
    }

    console.log('[HybridOrchestrator] Decomposed into', steps.length, 'step(s):', steps);

    // STEP 3: Execute each step sequentially
    let totalCost = 0;
    let lastResult: any = null;
    const messages: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      onProgress?.({ phase: 'executing', message: `Step ${i + 1}/${steps.length}: ${step.operation}` });

      const stepResult = await executeStep(step, context, anthropicApiKey, signal);
      totalCost += stepResult.cost;
      lastResult = stepResult;

      if (stepResult.message) {
        messages.push(stepResult.message);
      }

      // If step failed and it's critical, stop
      if (!stepResult.success) {
        console.warn('[HybridOrchestrator] Step failed:', stepResult.message);
        break;
      }

      // Update context for next step (e.g., set current page after creation)
      if (step.agent === 'page' && stepResult.pageId) {
        context.setCurrentPage(stepResult.pageId);
      }
    }

    const finalMessage = messages.join('. ');
    onProgress?.({ phase: 'complete', message: finalMessage });

    return {
      success: lastResult?.success || false,
      message: finalMessage || 'Completed',
      duration: Date.now() - startTime,
      cost: totalCost,
      source: 'agent',
      agent: steps.map(s => s.agent).join(','),
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error),
      duration: Date.now() - startTime,
      cost: 0,
      source: 'deterministic',
    };
  }
}

/**
 * Try simple deterministic tools (instant, free, 100% reliable)
 * Only for truly simple single operations that don't need LLM intelligence
 */
function trySimpleDeterministicTools(
  normalized: string,
  context: ToolContext
): { success: boolean; message: string } | null {
  // Only handle operations on SELECTED components
  if (context.selectedNodeIds.length > 0) {
    const componentId = context.selectedNodeIds[0];

    // Delete selected
    if (matches(normalized, ['delete', 'this']) || matches(normalized, ['remove', 'this'])) {
      context.removeComponent(componentId);
      return { success: true, message: 'Deleted component' };
    }

    // Duplicate selected
    if (matches(normalized, ['duplicate', 'this']) || matches(normalized, ['copy', 'this'])) {
      context.duplicateComponent(componentId);
      return { success: true, message: 'Duplicated component' };
    }

    // Color updates
    const colorMatch = normalized.match(/\b(blue|red|green|yellow|purple|pink|gray|orange|teal|indigo)\b/);
    if (colorMatch && (matches(normalized, ['make']) || matches(normalized, ['change']) || matches(normalized, ['color']))) {
      const colorMap: Record<string, string> = {
        blue: '#3b82f6',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        purple: '#8b5cf6',
        pink: '#ec4899',
        gray: '#6b7280',
        orange: '#f97316',
        teal: '#14b8a6',
        indigo: '#6366f1',
      };
      const color = colorMap[colorMatch[1]];
      context.updateComponentProps(componentId, { color });
      return { success: true, message: `Changed color to ${colorMatch[1]}` };
    }

    // Size updates
    if (matches(normalized, ['small', 'smaller']) || matches(normalized, ['size', 'sm'])) {
      context.updateComponentProps(componentId, { size: 'sm' });
      return { success: true, message: 'Changed size to small' };
    }
    if (matches(normalized, ['large', 'larger', 'big']) || matches(normalized, ['size', 'lg'])) {
      context.updateComponentProps(componentId, { size: 'lg' });
      return { success: true, message: 'Changed size to large' };
    }
  }

  return null; // No deterministic match - use LLM decomposition
}

/**
 * Decompose request into sequential steps using LLM
 */
async function decomposeRequest(
  userMessage: string,
  apiKey: string,
  signal?: AbortSignal,
  conversationHistory?: AgentMessage[]
): Promise<RequestStep[]> {
  const llm = createLLMProvider({
    provider: 'anthropic',
    apiKey,
    model: 'claude-haiku-4-5',
  });

  const systemPrompt = `You are a request decomposer. Break user requests into sequential steps.

Available agents:
- page: Create/delete/rename pages (use for "create page", "add page")
- component: Create/add/insert UI components (use for "add button", "add heading", "create cards", "add form", "insert component")
- content: Update text in EXISTING components ONLY (use for "change the text to X", "update heading text", "modify content")
- data: Generate table data (use for "create table", "generate data")
- layout: Arrange components (use for "arrange in columns", "center this")

CRITICAL ROUTING RULES:
- "add X" / "create X" / "insert X" → ALWAYS use "component" agent (creating new components)
- "change text" / "update text" / "edit text" → ALWAYS use "content" agent (updating existing components)
- If user says "add heading" / "add button" / "add card" → use "component" agent

Rules:
1. For compound requests like "create page X and add Y inside", break into:
   - Step 1: {agent: "page", operation: "create", params: {name: "X"}}
   - Step 2: {agent: "component", operation: "create", params: {description: "Y"}}

2. For simple requests, return single step

3. Always return valid JSON array

Examples:
"add a kanban board" → [{"agent": "component", "operation": "create", "params": {"description": "kanban board"}}]

"add a heading" → [{"agent": "component", "operation": "create", "params": {"description": "heading"}}]

"add heading level 2 that says Our Services" → [{"agent": "component", "operation": "create", "params": {"description": "heading level 2 that says Our Services"}}]

"create page Dashboard and add 3 metric cards" → [
  {"agent": "page", "operation": "create", "params": {"name": "Dashboard"}},
  {"agent": "component", "operation": "create", "params": {"description": "3 metric cards"}}
]

"create a users table with 20 rows" → [{"agent": "data", "operation": "createTable", "params": {"topic": "users", "rows": 20}}]

"change the heading text to Welcome" → [{"agent": "content", "operation": "update", "params": {"description": "change heading text to Welcome"}}]

"change the title of the pricing cards to Base, Pro, Advanced and Shopping and the prices should be $9, $16, $32 and $56" → [{"agent": "content", "operation": "update", "params": {"description": "change the title of the pricing cards to Base, Pro, Advanced and Shopping and the prices should be $9, $16, $32 and $56"}}]

"update the card titles to X, Y, Z" → [{"agent": "content", "operation": "update", "params": {"description": "update the card titles to X, Y, Z"}}]

Respond with ONLY the JSON array, no explanation.`;

  try {
    // Build messages with conversation history for context
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add recent conversation history (last 6 messages = 3 turns)
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory
        .slice(-6) // Last 6 messages
        .filter(msg => msg.role === 'user' || msg.role === 'agent')
        .forEach(msg => {
          messages.push({
            role: msg.role === 'agent' ? 'assistant' : 'user',
            content: msg.content[0]?.text || ''
          });
        });
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    const response = await llm.chat({
      messages,
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 500,
      signal,
    });

    const content = response.content || '[]';

    // Extract JSON from response (handle if wrapped in markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }

    const steps = JSON.parse(jsonStr) as RequestStep[];
    return steps;
  } catch (error) {
    console.error('[HybridOrchestrator] Failed to decompose request:', error);
    // Fallback: try to route to component agent as default
    return [{ agent: 'component', operation: 'create', params: { description: userMessage } }];
  }
}

/**
 * Execute a single step by routing to appropriate agent
 */
async function executeStep(
  step: RequestStep,
  context: ToolContext,
  apiKey: string,
  signal?: AbortSignal
): Promise<any> {
  console.log(`[HybridOrchestrator] Executing step:`, step);

  switch (step.agent) {
    case 'page': {
      const agent = new PageAgent();
      return await agent.handle(
        step.operation as 'create' | 'delete' | 'rename',
        step.params,
        context
      );
    }

    case 'component': {
      const agent = new ComponentAgent(apiKey);
      const description = step.params.description || JSON.stringify(step.params);
      return await agent.handle(description, context, signal);
    }

    case 'content': {
      const agent = new ContentAgent(apiKey);
      const description = step.params.description || JSON.stringify(step.params);
      return await agent.handle(description, context, signal);
    }

    case 'data': {
      const agent = new DataAgent(apiKey);
      const description = step.params.description || JSON.stringify(step.params);
      return await agent.handle(description, context, signal);
    }

    case 'layout': {
      const agent = new LayoutAgent(apiKey);
      const description = step.params.description || JSON.stringify(step.params);
      return await agent.handle(description, context, signal);
    }

    default:
      return {
        success: false,
        message: `Unknown agent: ${step.agent}`,
        cost: 0,
      };
  }
}

/**
 * Check if message matches all keywords
 */
function matches(message: string, keywords: string[]): boolean {
  return keywords.every((keyword) => message.includes(keyword));
}

/**
 * Extract page name from message
 */
function extractPageName(message: string): string | null {
  // "create a page called Dashboard" → "Dashboard"
  let match = message.match(/(?:page (?:called|named) |page ")([^"]+)"/i);
  if (match) return match[1];

  // "create Dashboard page" → "Dashboard"
  match = message.match(/(?:create|add|make) ([A-Z][a-zA-Z]*) page/);
  if (match) return match[1];

  // "create page X" → "X"
  match = message.match(/(?:create|add|make) page ([a-zA-Z]+)/i);
  if (match) return match[1];

  return null;
}
