import { ToolContext } from '../types';
import {
  OrchestratorResult,
  AgentResult,
  UserIntent,
  MODEL_PRICING,
} from './types';
import { parseIntent, planTasks, getAgentConfig } from './taskRouter';
import { executeAgent } from './agentExecutor';
import { createLLMProvider } from '../llm/factory';

// Token estimation utility
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Main Orchestrator
 *
 * Uses Claude Haiku 4.5 to parse user intent and coordinate specialized agents.
 *
 * Flow:
 * 1. Parse user intent with Haiku (intelligent NLP, not rule-based)
 * 2. Plan task sequence (rule-based task router)
 * 3. Execute agents in order (respecting dependencies)
 * 4. Aggregate results (track costs per model)
 * 5. Generate friendly response
 */
export async function handleOrchestratedRequest(
  userMessage: string,
  context: ToolContext,
  claudeApiKey: string,
  openaiApiKey: string
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const MAX_CALLS = 25;
  let totalCalls = 1; // Orchestrator itself counts as 1
  let orchestratorInputTokens = 0;
  let orchestratorOutputTokens = 0;
  let orchestratorCost = 0;

  console.log('[Orchestrator] Processing request:', userMessage);

  try {
    // STEP 1: Parse user intent with Haiku
    console.log('[Orchestrator] Parsing intent with Haiku...');

    const haiku = createLLMProvider({
      provider: 'anthropic',
      apiKey: claudeApiKey,
      model: 'claude-haiku-4-5',
    });

    const intentSystemPrompt = `You are an intent parser for WP-Designer, a visual page builder tool.

Your job is to parse user requests into structured intent.

Available actions:
- create: Add new components (cards, buttons, forms, etc.)
- update: Modify existing components
- delete: Remove components
- query: Answer questions about current state
- validate: Check layout rules

Extract:
1. action: The action type (create/update/delete/query/validate)
2. target: What to act on (e.g., "pricing cards", "hero section", "contact form")
3. quantity: Number of items (if specified)
4. tone: Content tone (professional/casual/playful) - default: professional

CRITICAL: Return ONLY valid JSON with no markdown, no code blocks, no explanation.
Just the raw JSON object starting with { and ending with }.

Example:
{"action":"create","target":"pricing cards","quantity":3,"tone":"professional"}`;

    const intentResponse = await haiku.chat({
      messages: [
        {
          role: 'system',
          content: intentSystemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    // Track orchestrator costs
    orchestratorInputTokens = estimateTokens(intentSystemPrompt + userMessage);
    orchestratorOutputTokens = estimateTokens(intentResponse.content || '');

    const pricing = MODEL_PRICING['claude-haiku-4-5'];
    orchestratorCost = (orchestratorInputTokens / 1000000) * pricing.input +
                       (orchestratorOutputTokens / 1000000) * pricing.output;

    // Parse intent from Haiku response
    let intent;
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      const content = intentResponse.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      intent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[Orchestrator] Failed to parse Haiku intent response:', parseError);
      // Fallback to rule-based
      intent = parseIntent(userMessage);
    }

    console.log('[Orchestrator] Parsed intent:', {
      action: intent.action,
      target: intent.target,
      quantity: intent.quantity,
      tone: intent.tone,
      orchestratorTokens: orchestratorInputTokens + orchestratorOutputTokens,
      orchestratorCost: `$${orchestratorCost.toFixed(4)}`,
    });

    // STEP 2: Plan tasks
    console.log('[Orchestrator] Planning tasks...');
    const tasks = planTasks(intent);

    console.log('[Orchestrator] Planned tasks:', tasks.map(t => ({
      id: t.id,
      type: t.type,
      description: t.description,
    })));

    // STEP 3: Execute agents
    const agentResults: AgentResult[] = [];
    const completedTaskIds = new Set<string>();

    for (const task of tasks) {
      // Check if we've hit the call limit
      if (totalCalls >= MAX_CALLS) {
        console.warn('[Orchestrator] Max calls reached, stopping execution');
        break;
      }

      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        const allDepsCompleted = task.dependencies.every(depId =>
          completedTaskIds.has(depId)
        );

        if (!allDepsCompleted) {
          console.warn(`[Orchestrator] Skipping task ${task.id} - dependencies not met`);
          continue;
        }
      }

      // Get agent config
      const config = getAgentConfig(task.type);

      console.log(`[Orchestrator] Executing ${task.type} agent for task ${task.id}...`);

      // Execute agent
      const result = await executeAgent({
        task,
        config,
        context,
        apiKey: openaiApiKey,
        previousResults: agentResults,
      });

      agentResults.push(result);
      completedTaskIds.add(task.id);
      totalCalls += result.callCount;

      console.log(`[Orchestrator] ${task.type} agent completed:`, {
        success: result.success,
        calls: result.callCount,
        tokens: result.inputTokens + result.outputTokens,
        cost: `$${result.cost.toFixed(4)}`,
      });

      // Stop if agent failed critically
      if (!result.success && task.type === 'context') {
        console.error('[Orchestrator] Context agent failed, aborting');
        break;
      }
    }

    // STEP 4: Aggregate results
    const totalInputTokens = agentResults.reduce((sum, r) => sum + r.inputTokens, 0) + orchestratorInputTokens;
    const totalOutputTokens = agentResults.reduce((sum, r) => sum + r.outputTokens, 0) + orchestratorOutputTokens;
    const totalCost = agentResults.reduce((sum, r) => sum + r.cost, 0) + orchestratorCost;
    const totalDuration = Date.now() - startTime;

    // Build model breakdown
    const modelBreakdown = new Map<string, {
      calls: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>();

    // Add orchestrator (Haiku) to breakdown
    modelBreakdown.set('claude-haiku-4-5', {
      calls: 1,
      inputTokens: orchestratorInputTokens,
      outputTokens: orchestratorOutputTokens,
      cost: orchestratorCost,
    });

    for (const result of agentResults) {
      const config = getAgentConfig(result.agentType);
      const model = config.model.model;

      if (!modelBreakdown.has(model)) {
        modelBreakdown.set(model, {
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
        });
      }

      const breakdown = modelBreakdown.get(model)!;
      breakdown.calls += result.callCount;
      breakdown.inputTokens += result.inputTokens;
      breakdown.outputTokens += result.outputTokens;
      breakdown.cost += result.cost;
    }

    // STEP 5: Generate friendly response
    const message = generateResponse(intent, agentResults);

    console.log('[Orchestrator] Request completed:', {
      totalCalls,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost: `$${totalCost.toFixed(4)}`,
      duration: `${totalDuration}ms`,
    });

    console.log('[Orchestrator] 💰 Model Breakdown:', Array.from(modelBreakdown.entries()).map(([model, stats]) => ({
      model,
      ...stats,
      cost: `$${stats.cost.toFixed(4)}`,
    })));

    return {
      success: true,
      message,
      agentResults,
      totalCalls,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      totalDuration,
      modelBreakdown: Array.from(modelBreakdown.entries()).map(([model, stats]) => ({
        model,
        ...stats,
      })),
    };
  } catch (error) {
    console.error('[Orchestrator] Error:', error);

    return {
      success: false,
      message: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      agentResults: [],
      totalCalls: 1,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      totalDuration: Date.now() - startTime,
      modelBreakdown: [],
    };
  }
}

/**
 * Generate friendly response based on agent results
 */
function generateResponse(
  intent: UserIntent,
  results: AgentResult[]
): string {
  // Find relevant results
  const layoutResult = results.find(r => r.agentType === 'layout');
  const contextResult = results.find(r => r.agentType === 'context');

  // Check if any critical failures
  const hasCriticalFailure = results.some(r =>
    !r.success && (r.agentType === 'builder' || r.agentType === 'context')
  );

  if (hasCriticalFailure) {
    return `I encountered an issue while ${intent.action}ing ${intent.target}. ${results.find(r => !r.success)?.error || 'Please try again.'}`;
  }

  // Generate response based on action
  switch (intent.action) {
    case 'create': {
      let response = `I've created ${intent.quantity ? intent.quantity + ' ' : ''}${intent.target}`;

      // Add layout feedback
      if (layoutResult && layoutResult.success) {
        try {
          const layoutData = JSON.parse(layoutResult.data || '{}');
          if (layoutData.issues && layoutData.issues.length > 0) {
            response += `. Note: ${layoutData.issues[0].issue}`;
          }
        } catch {
          // Ignore parse errors
        }
      }

      return response + '.';
    }

    case 'update':
      return `I've updated ${intent.target}.`;

    case 'delete':
      return `I've removed ${intent.target}.`;

    case 'query':
      if (contextResult && contextResult.success) {
        return contextResult.message || "Here's what I found.";
      }
      return 'Let me check that for you.';

    case 'validate':
      if (layoutResult && layoutResult.success) {
        try {
          const layoutData = JSON.parse(layoutResult.data || '{}');
          if (layoutData.valid) {
            return 'Your layout looks good! All rules are passing.';
          } else {
            return `I found ${layoutData.issues?.length || 0} layout issue(s): ${layoutData.issues?.[0]?.issue || 'Check the console for details'}`;
          }
        } catch {
          return 'Layout validation completed.';
        }
      }
      return 'Layout validation completed.';

    default:
      return 'Done!';
  }
}
