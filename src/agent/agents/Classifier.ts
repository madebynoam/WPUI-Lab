/**
 * Classifier
 *
 * Routes user requests to appropriate specialist agents.
 * Uses agent canHandle() methods for fast, zero-cost classification.
 */

import { Agent } from './types';
import { MemoryStore } from '../memory/MemoryStore';

export class Classifier {
  agents: Agent[];

  constructor(agents: Agent[]) {
    this.agents = agents;
  }

  /**
   * Classify user message and return which agent should handle it
   *
   * @param userMessage - The user's request
   * @param memory - Memory store for context
   * @returns Agent name or null if no agent can handle it
   */
  async classify(userMessage: string, memory: MemoryStore): Promise<string | null> {
    // Handle empty messages
    if (!userMessage || userMessage.trim() === '') {
      return null;
    }

    // Try each agent in order (priority: PageAgent > CreatorAgent > UpdateAgent)
    // This ensures page operations take precedence over component operations
    for (const agent of this.agents) {
      const canHandle = await agent.canHandle(userMessage, memory);
      if (canHandle) {
        return agent.name;
      }
    }

    // No agent can handle this request
    return null;
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): Agent | null {
    return this.agents.find(a => a.name === name) || null;
  }
}
