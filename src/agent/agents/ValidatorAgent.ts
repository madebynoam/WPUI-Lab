/**
 * Validator Agent
 *
 * Validates that requested actions were completed successfully.
 * Reports "Completed X/Y tasks" or "I was only able to complete X out of Y tasks"
 */

import { BaseAgent } from './BaseAgent';
import { LLMProvider } from './types';
import { MemoryStore } from '../memory/MemoryStore';

export interface ValidationResult {
  success: boolean;
  completedTasks: number;
  totalTasks: number;
  message: string;
  tokensUsed: number;
  cost: number;
}

export class ValidatorAgent extends BaseAgent {
  name = 'ValidatorAgent';
  capabilities = ['validation'];
  tools = []; // No tools - validation only

  constructor(llm: LLMProvider, memory: MemoryStore) {
    super(llm, memory);
  }

  /**
   * ValidatorAgent doesn't use canHandle - it's always called at the end
   */
  async canHandle(): Promise<boolean> {
    return true;
  }

  /**
   * ValidatorAgent uses validate() instead of execute()
   * This is a stub to satisfy the Agent interface
   */
  async execute(): Promise<any> {
    throw new Error('ValidatorAgent should use validate() instead of execute()');
  }

  /**
   * Validate that the requested actions were completed
   *
   * @param userMessage - Original user request
   * @param memory - Memory store with action history
   * @returns ValidationResult
   */
  async validate(userMessage: string, memory: MemoryStore, signal?: AbortSignal): Promise<ValidationResult> {
    this.resetTokens();

    try {
      // Get all action entries (excluding errors for now)
      const successActions = memory.search({}).filter(entry =>
        entry.action !== 'error' &&
        entry.action !== 'validation_passed' &&
        entry.action !== 'validation_failed'
      );

      const errorActions = memory.search({ action: 'error' });

      // If there are errors and no successful actions, validation failed
      if (errorActions.length > 0 && successActions.length === 0) {
        return {
          success: false,
          completedTasks: 0,
          totalTasks: 1,
          message: `I encountered an error: ${errorActions[0].details.error || 'Unknown error'}`,
          tokensUsed: this.inputTokens + this.outputTokens,
          cost: this.calculateCost(),
        };
      }

      // If no actions were taken at all
      if (successActions.length === 0) {
        return {
          success: false,
          completedTasks: 0,
          totalTasks: 1,
          message: 'No actions were taken',
          tokensUsed: this.inputTokens + this.outputTokens,
          cost: this.calculateCost(),
        };
      }

      // Call LLM to validate the work
      const memoryContext = this.formatMemoryForValidation(successActions);

      const messages = [
        {
          role: 'system',
          content: `You are a validator. Compare what the user requested vs what was actually done.

CRITICAL: ONLY use the MEMORY ENTRIES below to determine what was completed. If an action appears in memory, it WAS completed.

Break down the user request into individual tasks and check if each was completed by looking for corresponding memory entries.

RULES FOR COUNTING TASKS:
1. ONLY count distinct items from the USER REQUEST, not internal operations
   - "Create a page with pricing cards and testimonials" = 3 tasks (page, pricing cards, testimonials)
   - "Add 3 pricing cards" = 1 task (multiple similar items count as one request)
   - "Add 4 pricing cards and 2 description cards" = 2 tasks (two different types of content)

2. IGNORE duplicate/repeated memory entries - only count if it matches a user task
   - If user asked for pricing cards (1 task) and you see 2 memory entries for cards, it's still 1 completed task

3. Match user tasks to memory entries:
   - "Create a page X" → Look for "page created: Page" memory entry
   - "Add pricing cards" → Look for ANY "component created" memory entry mentioning cards
   - "Add table" → Look for "component created: DataViews" or "component created: Grid" memory entry

4. Completion format:
   - If everything requested was done: respond with "X/X" format
   - If only some tasks completed: respond with "X out of Y" format

5. CRITICAL: Never return more completed tasks than total tasks (e.g., "3/2" is wrong!)

MEMORY ENTRIES (what was actually done):
${memoryContext}

USER REQUEST (what was asked for):
${userMessage}

IMPORTANT:
- If you see a memory entry for something, it WAS completed successfully
- Count ALL memory entries that match requested tasks
- Be specific about which tasks were/weren't completed

Respond with task counts and a brief specific summary of what was/wasn't completed.`,
        },
        {
          role: 'user',
          content: 'How many of the requested tasks were completed? List each task and whether it was done.',
        },
      ];

      const response = await this.callLLM({
        messages: messages as any,
        max_tokens: 400,  // Increased for detailed task-by-task breakdown
        signal,
      });

      // Parse the response to extract task counts
      const { completedTasks, totalTasks, success } = this.parseValidationResponse(
        response.content || '',
        successActions.length
      );

      // Format message according to user requirements
      let message = '';
      if (success && completedTasks === totalTasks) {
        message = `✓ Completed ${completedTasks}/${totalTasks} tasks. ${response.content}`;
      } else {
        message = `I was only able to complete ${completedTasks} out of ${totalTasks} tasks. ${response.content}`;
      }

      return {
        success,
        completedTasks,
        totalTasks,
        message,
        tokensUsed: this.inputTokens + this.outputTokens,
        cost: this.calculateCost(),
      };
    } catch (error: any) {
      return {
        success: false,
        completedTasks: 0,
        totalTasks: 1,
        message: `Validation error: ${error.message}`,
        tokensUsed: this.inputTokens + this.outputTokens,
        cost: this.calculateCost(),
      };
    }
  }

  /**
   * Format memory entries for validation prompt
   */
  private formatMemoryForValidation(entries: any[]): string {
    return entries
      .map(entry => {
        const action = entry.action.replace(/_/g, ' ');
        const entityInfo = entry.entityType ? `${entry.entityType}` : '';
        const count = entry.details.count ? ` (count: ${entry.details.count})` : '';

        // Add more context to help validator understand what was done
        const method = entry.details.method ? ` via ${entry.details.method}` : '';
        const template = entry.details.template ? ` (template: ${entry.details.template})` : '';
        const subRequest = entry.details.subRequest ? ` for "${entry.details.subRequest}"` : '';

        return `- ${action}: ${entityInfo}${count}${method}${template}${subRequest}`;
      })
      .join('\n');
  }

  /**
   * Parse LLM response to extract task counts
   */
  private parseValidationResponse(
    content: string,
    actionCount: number
  ): { completedTasks: number; totalTasks: number; success: boolean } {
    // Try to extract "X/Y" or "X out of Y" or "X instead of Y" patterns
    const fractionMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
    const outOfMatch = content.match(/(\d+)\s+out of\s+(\d+)/);
    const insteadOfMatch = content.match(/(\d+)\s+\w+\s+instead of\s+(\d+)/);
    const onlyMatch = content.match(/only\s+(\d+).*?(\d+)/i);

    let completedTasks = actionCount;
    let totalTasks = actionCount;

    if (fractionMatch) {
      completedTasks = parseInt(fractionMatch[1], 10);
      totalTasks = parseInt(fractionMatch[2], 10);
    } else if (outOfMatch) {
      completedTasks = parseInt(outOfMatch[1], 10);
      totalTasks = parseInt(outOfMatch[2], 10);
    } else if (insteadOfMatch) {
      completedTasks = parseInt(insteadOfMatch[1], 10);
      totalTasks = parseInt(insteadOfMatch[2], 10);
    } else if (onlyMatch) {
      completedTasks = parseInt(onlyMatch[1], 10);
      totalTasks = parseInt(onlyMatch[2], 10);
    }

    // Check for negative indicators
    const hasNegativeIndicator =
      content.toLowerCase().includes('only able') ||
      content.toLowerCase().includes('only created') ||
      content.toLowerCase().includes('instead of') ||
      content.toLowerCase().includes('failed') ||
      content.toLowerCase().includes('incomplete') ||
      content.toLowerCase().includes('partial');

    const success = completedTasks === totalTasks && !hasNegativeIndicator;

    return { completedTasks, totalTasks, success };
  }
}
