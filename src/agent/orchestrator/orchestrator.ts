import { ToolContext } from '../types';
import {
  OrchestratorResult,
  AgentResult,
  UserIntent,
  MODEL_PRICING,
  ProgressUpdate,
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
  openaiApiKey: string,
  onProgress?: (update: ProgressUpdate) => void,
  signal?: AbortSignal
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const MAX_CALLS = 25;
  let totalCalls = 1; // Orchestrator itself counts as 1
  let orchestratorInputTokens = 0;
  let orchestratorOutputTokens = 0;
  let orchestratorCost = 0;

  console.log('[Orchestrator] Processing request:', userMessage);

  try {
    // Check if aborted before starting
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    // STEP 1: Parse user intent with gpt-5-nano
    console.log('[Orchestrator] Parsing intent with gpt-5-nano...');
    onProgress?.({ phase: 'intent', message: 'Parsing intent...' });

    const intentParser = createLLMProvider({
      provider: 'openai',
      apiKey: openaiApiKey,
      model: 'gpt-5-nano',
    });

    const selectionCount = context.selectedNodeIds.length;
    const intentSystemPrompt = `Parse user requests into JSON intent for WP-Designer.

Context: ${selectionCount} component(s) selected

Actions: create, update, delete, query, validate

Output JSON fields:
- action: create/update/delete/query/validate
- target: what to act on
- quantity: number (if specified)
- tone: professional/casual/playful (default: professional)
- usesSelection: true if refers to selected components
- needsClarity: true if ambiguous

Return ONLY raw JSON, no markdown.

Example: {"action":"create","target":"pricing cards","quantity":3,"tone":"professional","usesSelection":false,"needsClarity":false}`;

    const intentResponse = await intentParser.chat({
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
      signal,
    });

    // Track orchestrator costs
    orchestratorInputTokens = estimateTokens(intentSystemPrompt + userMessage);
    orchestratorOutputTokens = estimateTokens(intentResponse.content || '');

    const pricing = MODEL_PRICING['gpt-5-nano'];
    orchestratorCost = (orchestratorInputTokens / 1000000) * pricing.input +
                       (orchestratorOutputTokens / 1000000) * pricing.output;

    // Parse intent response
    let intent;
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      const content = intentResponse.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      intent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[Orchestrator] Failed to parse intent response:', parseError);
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

    // Check if aborted after intent parsing
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    // STEP 2: Plan tasks
    console.log('[Orchestrator] Planning tasks...');
    onProgress?.({ phase: 'planning', message: 'Planning tasks...' });
    const tasks = planTasks(intent);

    console.log('[Orchestrator] Planned tasks:', tasks.map(t => ({
      id: t.id,
      type: t.type,
      description: t.description,
    })));

    // STEP 3: Execute agents in parallel where possible
    console.log('[Orchestrator] Executing agents...');
    onProgress?.({
      phase: 'executing',
      message: 'Executing agents...',
      total: tasks.length
    });

    const agentResults: AgentResult[] = [];
    const completedTaskIds = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    // Group tasks by dependency level for parallel execution
    const levels: AgentTask[][] = [];
    const taskLevel = new Map<string, number>();

    // Calculate dependency level for each task
    const calculateLevel = (taskId: string, visited = new Set<string>()): number => {
      if (taskLevel.has(taskId)) return taskLevel.get(taskId)!;
      if (visited.has(taskId)) return 0; // Circular dependency, assign level 0

      visited.add(taskId);
      const task = taskMap.get(taskId);
      if (!task) return 0;

      if (!task.dependencies || task.dependencies.length === 0) {
        taskLevel.set(taskId, 0);
        return 0;
      }

      const maxDepLevel = Math.max(
        ...task.dependencies.map(depId => calculateLevel(depId, new Set(visited)))
      );
      const level = maxDepLevel + 1;
      taskLevel.set(taskId, level);
      return level;
    };

    // Assign tasks to levels
    for (const task of tasks) {
      const level = calculateLevel(task.id);
      if (!levels[level]) levels[level] = [];
      levels[level].push(task);
    }

    console.log(`[Orchestrator] Organized ${tasks.length} tasks into ${levels.length} parallel level(s)`);

    // Execute each level in parallel
    let taskIndex = 0;
    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
      const levelTasks = levels[levelIndex];

      // Check if aborted before each level
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      // Check if we've hit the call limit
      if (totalCalls >= MAX_CALLS) {
        console.warn('[Orchestrator] Max calls reached, stopping execution');
        break;
      }

      console.log(`[Orchestrator] Executing level ${levelIndex} with ${levelTasks.length} task(s) in parallel`);

      // Execute all tasks in this level in parallel
      const levelPromises = levelTasks.map(async (task) => {
        const config = getAgentConfig(task.type);
        const currentIndex = taskIndex++;

        console.log(`[Orchestrator] Starting ${task.type} agent for task ${task.id}...`);
        onProgress?.({
          phase: 'executing',
          agent: `${config.type} agent`,
          current: currentIndex + 1,
          total: tasks.length,
          message: `Running ${config.type} agent...`
        });

        // Execute agent
        const result = await executeAgent({
          task,
          config,
          context,
          apiKey: openaiApiKey,
          previousResults: agentResults.filter(r =>
            task.dependencies?.includes(taskMap.get(r.taskId)?.id || '')
          ),
          signal,
          onProgress: (message) => {
            onProgress?.({
              phase: 'executing',
              agent: `${config.type} agent`,
              current: currentIndex + 1,
              total: tasks.length,
              message,
            });
          },
        });

        console.log(`[Orchestrator] ${task.type} agent completed:`, {
          success: result.success,
          calls: result.callCount,
          tokens: result.inputTokens + result.outputTokens,
          cost: `$${result.cost.toFixed(4)}`,
        });

        return result;
      });

      // Wait for all tasks in this level to complete
      const levelResults = await Promise.all(levelPromises);

      // Add results and update completed tasks
      for (let i = 0; i < levelResults.length; i++) {
        const result = levelResults[i];
        const task = levelTasks[i];

        agentResults.push(result);
        completedTaskIds.add(task.id);
        totalCalls += result.callCount;

        // Stop if context agent failed critically
        if (!result.success && task.type === 'context') {
          console.error('[Orchestrator] Context agent failed, aborting');
          throw new Error('Context agent failed');
        }
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

    // Add orchestrator (gpt-5-nano) to breakdown
    if (!modelBreakdown.has('gpt-5-nano')) {
      modelBreakdown.set('gpt-5-nano', {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      });
    }
    const nanoBreakdown = modelBreakdown.get('gpt-5-nano')!;
    nanoBreakdown.calls += 1;
    nanoBreakdown.inputTokens += orchestratorInputTokens;
    nanoBreakdown.outputTokens += orchestratorOutputTokens;
    nanoBreakdown.cost += orchestratorCost;

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
