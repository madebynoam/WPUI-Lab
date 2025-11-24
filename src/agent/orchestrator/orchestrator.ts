import { ToolContext } from '../types';
import {
  OrchestratorResult,
  AgentResult,
  TaskPlan,
  MODEL_PRICING,
} from './types';
import { parseIntent, planTasks, getAgentConfig } from './taskRouter';
import { executeAgent } from './agentExecutor';

/**
 * Main Orchestrator
 *
 * Uses Claude Haiku 4.5 to coordinate specialized agents.
 *
 * Flow:
 * 1. Parse user intent
 * 2. Plan task sequence
 * 3. Execute agents in order (respecting dependencies)
 * 4. Aggregate results
 * 5. Generate friendly response
 */
export async function handleOrchestratedRequest(
  userMessage: string,
  context: ToolContext,
  apiKey: string
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const MAX_CALLS = 25;
  let totalCalls = 1; // Orchestrator itself counts as 1

  console.log('[Orchestrator] Processing request:', userMessage);

  try {
    // STEP 1: Parse user intent
    console.log('[Orchestrator] Parsing intent...');
    const intent = parseIntent(userMessage);

    console.log('[Orchestrator] Parsed intent:', {
      action: intent.action,
      target: intent.target,
      quantity: intent.quantity,
      tone: intent.tone,
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
        apiKey,
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
    const totalInputTokens = agentResults.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = agentResults.reduce((sum, r) => sum + r.outputTokens, 0);
    const totalCost = agentResults.reduce((sum, r) => sum + r.cost, 0);
    const totalDuration = Date.now() - startTime;

    // Build model breakdown
    const modelBreakdown = new Map<string, {
      calls: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>();

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
  intent: any,
  results: AgentResult[]
): string {
  // Find builder result (if exists)
  const builderResult = results.find(r => r.agentType === 'builder');
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
    case 'create':
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

    case 'update':
      return `I've updated ${intent.target}.`;

    case 'delete':
      return `I've removed ${intent.target}.`;

    case 'query':
      if (contextResult && contextResult.success) {
        return contextResult.message || 'Here\\'s what I found.';
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
