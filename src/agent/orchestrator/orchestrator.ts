/**
 * Simplified Orchestrator (Template-First Architecture)
 *
 * Replaces complex multi-agent orchestration with simple routing:
 * 1. Classify intent (deterministic, <10ms)
 * 2. Route to executor
 * 3. Return result
 *
 * Performance targets:
 * - 70% of requests: <50ms, $0 (template insertion)
 * - 30% of requests: ~500ms, ~$0.0005 (AI-powered)
 *
 * This eliminates:
 * - LLM-based intent parsing (claude-haiku-4-5 call)
 * - Multi-agent task planning
 * - 6 specialized agents
 * - YAML generation
 * - Parallel execution complexity
 */

import { ToolContext } from '../types';
import { OrchestratorResult, ProgressUpdate } from './types';
import { classifyIntent, validateClassification } from './intentClassifier';
import {
  executeTemplateInsertion,
  executePropertyUpdate,
  executeComponentDeletion,
  executeCustomTableCreation,
  executeCustomCopyUpdate,
  executeCustomPropsUpdate,
  executeComponentMove,
  executeCustomComponentCreation,
  ExecutionResult,
} from './executors';

/**
 * Main Orchestrator (Simplified)
 *
 * Routes user requests to appropriate executors based on intent classification.
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

  console.log('[Orchestrator] Processing request:', userMessage);

  try {
    // Check if aborted before starting
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    // STEP 1: Classify intent (deterministic, <10ms)
    console.log('[Orchestrator] Classifying intent...');
    onProgress?.({ phase: 'intent', message: 'Analyzing request...' });

    const classification = classifyIntent(userMessage, context);

    console.log('[Orchestrator] Intent classified:', {
      type: classification.type,
      confidence: classification.confidence,
    });

    // Validate classification
    const validation = validateClassification(classification);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || 'Invalid request',
        agentResults: [],
        totalCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        totalDuration: Date.now() - startTime,
        modelBreakdown: [],
      };
    }

    // Check if aborted after classification
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    // STEP 2: Route to appropriate executor
    console.log('[Orchestrator] Routing to executor:', classification.type);
    onProgress?.({ phase: 'executing', message: `Executing ${classification.type}...` });

    let result: ExecutionResult;

    switch (classification.type) {
      case 'template':
        // 70% case: Instant template insertion
        result = await executeTemplateInsertion({
          patternId: classification.patternId!,
          context,
        });
        break;

      case 'custom_table':
        // 30% case: AI-generated table data
        result = await executeCustomTableCreation({
          topic: classification.tableTopic!,
          rowCount: classification.rowCount,
          context,
          apiKey: claudeApiKey,
          signal,
        });
        break;

      case 'update_props':
        // Check if needs AI or can be deterministic
        // For now, use AI-powered executor for all prop updates
        const componentId = classification.componentIds![0]; // Use first selected
        result = await executeCustomPropsUpdate({
          componentId,
          request: classification.updateRequest!,
          context,
          apiKey: claudeApiKey,
          signal,
        });
        break;

      case 'update_copy':
        // 30% case: AI-generated copy
        const copyComponentId = classification.componentIds![0]; // Use first selected
        result = await executeCustomCopyUpdate({
          componentId: copyComponentId,
          request: classification.updateRequest!,
          tone: classification.tone,
          context,
          apiKey: claudeApiKey,
          signal,
        });
        break;

      case 'delete':
        // Deterministic: Delete components
        result = await executeComponentDeletion({
          componentIds: classification.componentIds!,
          context,
        });
        break;

      case 'move':
        // Deterministic: Move component
        // For now, just move first component
        result = await executeComponentMove({
          componentId: classification.componentIds![0],
          context,
        });
        break;

      case 'custom_component':
        // 30% case: AI-powered component creation
        result = await executeCustomComponentCreation({
          request: classification.componentSpec || userMessage,
          context,
          apiKey: claudeApiKey,
          signal,
        });
        break;

      default:
        throw new Error(`Unknown classification type: ${(classification as any).type}`);
    }

    // STEP 3: Return result
    const totalDuration = Date.now() - startTime;

    console.log('[Orchestrator] Request completed:', {
      success: result.success,
      duration: `${totalDuration}ms`,
      llmCalls: result.llmCalls,
      cost: `$${result.cost.toFixed(6)}`,
    });

    // Build model breakdown (if AI was used)
    const modelBreakdown = [];
    if (result.llmCalls > 0) {
      // Determine which model was used based on executor type
      let model = 'claude-haiku-4-5'; // default
      if (classification.type === 'update_copy') {
        model = 'claude-haiku-4-5';
      }

      modelBreakdown.push({
        model,
        calls: result.llmCalls,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost: result.cost,
      });
    }

    return {
      success: result.success,
      message: result.message,
      agentResults: [], // No longer using multi-agent system
      totalCalls: result.llmCalls,
      totalInputTokens: result.inputTokens,
      totalOutputTokens: result.outputTokens,
      totalCost: result.cost,
      totalDuration,
      modelBreakdown,
    };
  } catch (error) {
    console.error('[Orchestrator] Error:', error);

    return {
      success: false,
      message: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      agentResults: [],
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      totalDuration: Date.now() - startTime,
      modelBreakdown: [],
    };
  }
}
