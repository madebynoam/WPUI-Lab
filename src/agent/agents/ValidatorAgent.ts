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
  async validate(userMessage: string, memory: MemoryStore): Promise<ValidationResult> {
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

RULES:
1. Count DISTINCT tasks completed (e.g., "page created" = 1 task, "3 components created" = 1 task)
2. If everything requested was done: report "Completed X/X tasks"
3. If only some tasks completed: report "I was only able to complete X out of Y tasks"
4. Be concise and specific

MEMORY ENTRIES (what was done):
${memoryContext}

USER REQUEST (what was asked for):
${userMessage}`,
        },
        {
          role: 'user',
          content: 'Validate whether the request was fully completed. Respond with the count and a brief summary.',
        },
      ];

      const response = await this.callLLM({
        messages: messages as any,
        max_tokens: 200,
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
        const details = entry.details.count ? ` (count: ${entry.details.count})` : '';
        return `- ${action}: ${entityInfo}${details}`;
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
