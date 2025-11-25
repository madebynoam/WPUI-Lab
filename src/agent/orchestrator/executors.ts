/**
 * Direct Execution Paths
 *
 * Replaces multi-agent orchestration with simple, focused executors.
 * 70% of requests use deterministic executors (instant, $0)
 * 30% of requests use AI-powered executors (~500ms, $0.0005)
 *
 * This is the core of the template-first architecture.
 */

import { ToolContext } from '../types';
import { patterns, assignIds } from '../../patterns/';
import { generateTableData, generateCopy, generateComponentProps, generateComponentStructure } from './aiHelpers';
import { ComponentNode } from '../../types';

/**
 * Execution result - simple, consistent interface for all executors
 */
export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;

  // Metrics
  duration: number; // milliseconds
  llmCalls: number; // 0 for deterministic, 1+ for AI-powered
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/**
 * DETERMINISTIC EXECUTOR 1: Template Insertion
 *
 * Instantly insert a pre-built pattern (70% of create requests)
 * Target: <50ms, $0.0000
 */
export async function executeTemplateInsertion(params: {
  patternId: string;
  parentId?: string;
  index?: number;
  context: ToolContext;
}): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { patternId, parentId, index, context } = params;

  console.log(`[Executor] Template insertion: ${patternId}`);
  console.log(`[Executor] Available patterns:`, patterns.map(p => p.id));

  try {
    // Find pattern
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) {
      return {
        success: false,
        message: `Pattern "${patternId}" not found. Available: ${patterns.map(p => p.id).join(', ')}`,
        error: 'Pattern not found',
        duration: Date.now() - startTime,
        llmCalls: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      };
    }

    // Assign IDs and insert
    const componentTree: ComponentNode = assignIds(pattern.tree);
    context.addComponent(componentTree, parentId, index);

    const duration = Date.now() - startTime;
    console.log(`[Executor] ✓ Template inserted in ${duration}ms`);

    return {
      success: true,
      message: `Created ${pattern.name.toLowerCase()}`,
      data: {
        patternId: pattern.id,
        patternName: pattern.name,
        rootId: componentTree.id,
      },
      duration,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to insert template: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error),
      duration: Date.now() - startTime,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  }
}

/**
 * DETERMINISTIC EXECUTOR 2: Property Update
 *
 * Directly update component properties (no LLM needed)
 * Target: <20ms, $0.0000
 */
export async function executePropertyUpdate(params: {
  componentId: string;
  props: Record<string, any>;
  context: ToolContext;
}): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { componentId, props, context } = params;

  console.log(`[Executor] Property update: ${componentId}`, props);

  try {
    // Update properties directly
    context.updateComponent(componentId, { props });

    const duration = Date.now() - startTime;
    console.log(`[Executor] ✓ Properties updated in ${duration}ms`);

    return {
      success: true,
      message: `Updated component properties`,
      data: { componentId, props },
      duration,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update properties: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error),
      duration: Date.now() - startTime,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  }
}

/**
 * DETERMINISTIC EXECUTOR 3: Component Deletion
 *
 * Directly delete components (no LLM needed)
 * Target: <20ms, $0.0000
 */
export async function executeComponentDeletion(params: {
  componentIds: string[];
  context: ToolContext;
}): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { componentIds, context } = params;

  console.log(`[Executor] Deleting ${componentIds.length} component(s)`);

  try {
    // Delete each component
    for (const id of componentIds) {
      context.deleteComponent(id);
    }

    const duration = Date.now() - startTime;
    console.log(`[Executor] ✓ Components deleted in ${duration}ms`);

    return {
      success: true,
      message: `Deleted ${componentIds.length} component(s)`,
      data: { deletedIds: componentIds },
      duration,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete components: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error),
      duration: Date.now() - startTime,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  }
}

/**
 * AI-POWERED EXECUTOR 1: Custom Table Creation
 *
 * Create table with custom data using gpt-4o-mini (30% case)
 * Target: ~500ms, ~$0.0005
 */
export async function executeCustomTableCreation(params: {
  topic: string;
  rowCount?: number;
  parentId?: string;
  index?: number;
  context: ToolContext;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { topic, rowCount = 5, parentId, index, context, apiKey, signal } = params;

  console.log(`[Executor] Custom table creation: ${topic} (${rowCount} rows)`);

  try {
    // Generate custom data using AI helper
    const aiResult = await generateTableData({
      topic,
      rowCount,
      apiKey,
      signal,
    });

    // Create DataView component with AI-generated data
    const componentTree: ComponentNode = assignIds({
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: aiResult.data,
        columns: aiResult.columns,
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    });

    // Insert into tree
    context.addComponent(componentTree, parentId, index);

    const duration = Date.now() - startTime;
    console.log(`[Executor] ✓ Custom table created in ${duration}ms`);

    return {
      success: true,
      message: `Created ${topic} table with ${rowCount} rows`,
      data: {
        topic,
        rootId: componentTree.id,
        rowCount: aiResult.data.length,
        columnCount: aiResult.columns.length,
      },
      duration,
      llmCalls: 1,
      inputTokens: aiResult.inputTokens,
      outputTokens: aiResult.outputTokens,
      cost: aiResult.cost,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create custom table: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error),
      duration: Date.now() - startTime,
      llmCalls: 1,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  }
}

/**
 * AI-POWERED EXECUTOR 2: Custom Copy Update
 *
 * Generate custom text content using gpt-5-nano (30% case)
 * Target: ~300ms, ~$0.0001
 */
export async function executeCustomCopyUpdate(params: {
  componentId: string;
  request: string;
  context: ToolContext;
  tone?: 'professional' | 'casual' | 'playful';
  apiKey: string;
  signal?: AbortSignal;
}): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { componentId, request, context, tone = 'professional', apiKey, signal } = params;

  console.log(`[Executor] Custom copy update: ${componentId}`);

  try {
    // Get current component to understand context
    const component = context.getComponent(componentId);
    if (!component) {
      throw new Error('Component not found');
    }

    // Generate copy using AI helper
    const aiResult = await generateCopy({
      request,
      context: `Component type: ${component.type}`,
      tone,
      apiKey,
      signal,
    });

    // Update component with generated copy
    // Try to update 'children' prop first (for Text, Heading, etc.)
    // Fall back to a 'content' or 'text' prop if needed
    const updatedProps: any = {};
    if (component.type === 'Text' || component.type === 'Heading' || component.type === 'Button') {
      updatedProps.children = aiResult.text;
    } else if ('content' in (component.props || {})) {
      updatedProps.content = aiResult.text;
    } else if ('text' in (component.props || {})) {
      updatedProps.text = aiResult.text;
    } else {
      updatedProps.children = aiResult.text;
    }

    context.updateComponent(componentId, { props: updatedProps });

    const duration = Date.now() - startTime;
    console.log(`[Executor] ✓ Copy updated in ${duration}ms`);

    return {
      success: true,
      message: `Updated copy to: "${aiResult.text}"`,
      data: {
        componentId,
        text: aiResult.text,
      },
      duration,
      llmCalls: 1,
      inputTokens: aiResult.inputTokens,
      outputTokens: aiResult.outputTokens,
      cost: aiResult.cost,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update copy: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error),
      duration: Date.now() - startTime,
      llmCalls: 1,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  }
}

/**
 * AI-POWERED EXECUTOR 3: Custom Props Update
 *
 * Generate custom component properties using gpt-4o-mini (30% case)
 * Target: ~400ms, ~$0.0003
 */
export async function executeCustomPropsUpdate(params: {
  componentId: string;
  request: string;
  context: ToolContext;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { componentId, request, context, apiKey, signal } = params;

  console.log(`[Executor] Custom props update: ${componentId}`);

  try {
    // Get current component
    const component = context.getComponent(componentId);
    if (!component) {
      throw new Error('Component not found');
    }

    // Generate props using AI helper
    const aiResult = await generateComponentProps({
      componentType: component.type,
      request,
      currentProps: component.props || {},
      apiKey,
      signal,
    });

    // Update component with AI-generated props
    context.updateComponent(componentId, {
      props: { ...component.props, ...aiResult.props }
    });

    const duration = Date.now() - startTime;
    console.log(`[Executor] ✓ Props updated in ${duration}ms`);

    return {
      success: true,
      message: `Updated component properties`,
      data: {
        componentId,
        updatedProps: aiResult.props,
      },
      duration,
      llmCalls: 1,
      inputTokens: aiResult.inputTokens,
      outputTokens: aiResult.outputTokens,
      cost: aiResult.cost,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update props: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error),
      duration: Date.now() - startTime,
      llmCalls: 1,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  }
}

/**
 * DETERMINISTIC EXECUTOR 4: Move Component
 *
 * Move component to new parent/position (no LLM needed)
 * Target: <30ms, $0.0000
 */
export async function executeComponentMove(params: {
  componentId: string;
  newParentId?: string;
  newIndex?: number;
  context: ToolContext;
}): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { componentId, newParentId, newIndex, context } = params;

  console.log(`[Executor] Moving component ${componentId}`);

  try {
    // Get component
    const component = context.getComponent(componentId);
    if (!component) {
      throw new Error('Component not found');
    }

    // Delete from current location
    context.deleteComponent(componentId);

    // Re-add at new location
    context.addComponent(component, newParentId, newIndex);

    const duration = Date.now() - startTime;
    console.log(`[Executor] ✓ Component moved in ${duration}ms`);

    return {
      success: true,
      message: `Moved component`,
      data: { componentId, newParentId, newIndex },
      duration,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to move component: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error),
      duration: Date.now() - startTime,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  }
}

/**
 * AI-POWERED EXECUTOR 4: Custom Component Creation
 *
 * Generate and insert custom component structure using gpt-4o-mini (30% case)
 * Target: ~800ms, ~$0.0008
 */
export async function executeCustomComponentCreation(params: {
  request: string;
  parentId?: string;
  index?: number;
  context: ToolContext;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { request, parentId, index, context, apiKey, signal } = params;

  console.log(`[Executor] Custom component creation: ${request}`);

  try {
    // Generate component structure using AI helper
    const aiResult = await generateComponentStructure({
      request,
      apiKey,
      signal,
    });

    // Assign IDs to the generated tree
    const componentTree: ComponentNode = assignIds(aiResult.componentTree);

    // Insert into tree
    context.addComponent(componentTree, parentId, index);

    const duration = Date.now() - startTime;
    console.log(`[Executor] ✓ Custom component created in ${duration}ms`);

    return {
      success: true,
      message: `Created custom component`,
      data: {
        rootId: componentTree.id,
        rootType: componentTree.type,
      },
      duration,
      llmCalls: 1,
      inputTokens: aiResult.inputTokens,
      outputTokens: aiResult.outputTokens,
      cost: aiResult.cost,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create custom component: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error),
      duration: Date.now() - startTime,
      llmCalls: 1,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  }
}
