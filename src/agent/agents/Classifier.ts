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
   * Detect multi-step requests and return agents in execution order
   *
   * Examples of multi-step requests:
   * - "Create a page with pricing cards" → [PageAgent, CreatorAgent]
   * - "Add a dashboard page and show user stats" → [PageAgent, CreatorAgent]
   *
   * @param userMessage - The user's request
   * @param memory - Memory store for context
   * @returns Array of agent names in execution order, or null for single-step
   */
  async classifyMultiStep(userMessage: string, memory: MemoryStore): Promise<string[] | null> {
    const lowerMessage = userMessage.toLowerCase();

    // Multi-step patterns
    const multiStepPatterns = [
      // Page creation + component addition
      { pattern: /(create|add|new)\s+(a|an)?\s*\w*\s*page.*(with|and|add|including)/i, agents: ['PageAgent', 'CreatorAgent'] },
      // Sequential actions with "and"
      { pattern: /\band\b/i, requiresMultipleAgents: true },
    ];

    for (const { pattern, agents, requiresMultipleAgents } of multiStepPatterns) {
      if (pattern.test(lowerMessage)) {
        if (agents) {
          return agents;
        }

        if (requiresMultipleAgents) {
          // Check which agents can handle parts of the message
          const capableAgents: string[] = [];
          for (const agent of this.agents) {
            if (await agent.canHandle(userMessage, memory)) {
              capableAgents.push(agent.name);
            }
          }
          if (capableAgents.length > 1) {
            return capableAgents;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): Agent | null {
    return this.agents.find(a => a.name === name) || null;
  }
}
