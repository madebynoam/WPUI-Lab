import { AgentType, AgentConfig, AgentTask, UserIntent } from './types';
import { contextAgentConfig } from './agents/contextAgent';
import { creationAgentConfig } from './agents/creationAgent';
import { modifierAgentConfig } from './agents/modifierAgent';
import { deletionAgentConfig } from './agents/deletionAgent';
import { layoutAgentConfig } from './agents/layoutAgent';
import { copywriterAgentConfig } from './agents/copywriterAgent';

/**
 * Agent configuration registry
 */
const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  context: contextAgentConfig,
  creation: creationAgentConfig,
  modifier: modifierAgentConfig,
  deletion: deletionAgentConfig,
  layout: layoutAgentConfig,
  copywriter: copywriterAgentConfig,
  // TODO: Add remaining agents when implemented
  visual: {} as AgentConfig,
  design_system: {} as AgentConfig,
  accessibility: {} as AgentConfig,
  validation: {} as AgentConfig,
};

/**
 * Get agent configuration by type
 */
export function getAgentConfig(type: AgentType): AgentConfig {
  const config = AGENT_CONFIGS[type];
  if (!config || !config.systemPrompt) {
    throw new Error(`Agent configuration not found or incomplete for type: ${type}`);
  }
  return config;
}

/**
 * Plan tasks based on user intent
 *
 * This is the core routing logic that breaks down user requests
 * into agent tasks.
 */
export function planTasks(intent: UserIntent): AgentTask[] {
  const tasks: AgentTask[] = [];
  let taskId = 1;

  const nextId = () => `task-${taskId++}`;

  // STEP 1: Always start with context (understand current state)
  // If usesSelection is true, context will check selected components
  tasks.push({
    id: nextId(),
    type: 'context',
    description: intent.usesSelection
      ? `Check selected components and current state`
      : `Check current page state and existing components`,
    input: intent.usesSelection ? { useSelection: true } : undefined,
  });

  // STEP 2: Route based on action type
  switch (intent.action) {
    case 'create':
      // Generate text content first (if needed)
      if (needsCopywriting(intent.target)) {
        tasks.push({
          id: nextId(),
          type: 'copywriter',
          description: `Generate text content for ${intent.target}`,
          input: {
            pattern: detectPattern(intent.target),
            tone: intent.tone || 'professional',
            quantity: intent.quantity,
          },
          dependencies: [tasks[0].id], // Wait for context
        });
      }

      // Build components
      tasks.push({
        id: nextId(),
        type: 'creation',
        description: `Create ${intent.quantity || ''} ${intent.target}`,
        input: {
          target: intent.target,
          quantity: intent.quantity,
        },
        dependencies: tasks.length > 1 ? [tasks[tasks.length - 1].id] : [tasks[0].id],
      });

      // Validate layout
      tasks.push({
        id: nextId(),
        type: 'layout',
        description: `Validate layout rules for ${intent.target}`,
        dependencies: [tasks[tasks.length - 1].id], // Wait for creation
      });
      break;

    case 'update':
      // Update existing components
      tasks.push({
        id: nextId(),
        type: 'modifier',
        description: `Update ${intent.target}`,
        input: {
          action: 'update',
          target: intent.target,
        },
        dependencies: [tasks[0].id],
      });
      break;

    case 'delete':
      // Delete components
      tasks.push({
        id: nextId(),
        type: 'deletion',
        description: `Delete ${intent.target}`,
        input: {
          action: 'delete',
          target: intent.target,
        },
        dependencies: [tasks[0].id],
      });
      break;

    case 'query':
      // Just context is enough for queries
      // Context agent will handle the query
      break;

    case 'validate':
      // Run layout validation
      tasks.push({
        id: nextId(),
        type: 'layout',
        description: `Validate current page layout`,
        dependencies: [tasks[0].id],
      });
      break;
  }

  return tasks;
}

/**
 * Determine if target needs copywriting
 */
function needsCopywriting(target: string): boolean {
  const patterns = [
    'card',
    'pricing',
    'hero',
    'contact',
    'form',
    'cta',
    'button',
    'heading',
  ];

  return patterns.some(pattern =>
    target.toLowerCase().includes(pattern)
  );
}

/**
 * Detect content pattern from target
 */
function detectPattern(target: string): string {
  const lower = target.toLowerCase();

  if (lower.includes('pricing') || lower.includes('plan')) {
    return 'pricing';
  }
  if (lower.includes('hero')) {
    return 'hero';
  }
  if (lower.includes('contact') || lower.includes('form')) {
    return 'contact';
  }
  if (lower.includes('faq') || lower.includes('question')) {
    return 'faq';
  }
  if (lower.includes('feature')) {
    return 'features';
  }

  return 'generic';
}

/**
 * Parse user message into intent
 *
 * Simple intent parsing - in production you'd use a more sophisticated
 * NLP approach or let the orchestrator LLM do this.
 */
export function parseIntent(userMessage: string): UserIntent {
  const lower = userMessage.toLowerCase();

  // Detect action
  let action: UserIntent['action'] = 'query';

  if (
    lower.includes('add') ||
    lower.includes('create') ||
    lower.includes('build') ||
    lower.includes('make')
  ) {
    action = 'create';
  } else if (
    lower.includes('update') ||
    lower.includes('change') ||
    lower.includes('modify') ||
    lower.includes('edit')
  ) {
    action = 'update';
  } else if (
    lower.includes('delete') ||
    lower.includes('remove')
  ) {
    action = 'delete';
  } else if (
    lower.includes('validate') ||
    lower.includes('check')
  ) {
    action = 'validate';
  }

  // Extract target (what to act on)
  // This is simplified - you'd want more sophisticated extraction
  let target = userMessage;

  // Remove action words to get cleaner target
  target = target.replace(/\b(add|create|build|make|update|change|modify|edit|delete|remove)\b/gi, '').trim();

  // Extract quantity
  const quantityMatch = lower.match(/(\d+)\s+/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) : undefined;

  // Detect tone
  let tone: UserIntent['tone'] = 'professional';
  if (lower.includes('casual') || lower.includes('friendly')) {
    tone = 'casual';
  } else if (lower.includes('fun') || lower.includes('playful')) {
    tone = 'playful';
  }

  return {
    action,
    target,
    quantity,
    tone,
    context: {},
  };
}
