/**
 * Classifier
 *
 * Routes user requests to appropriate specialist agents using LLM.
 */

import { BaseAgent } from './BaseAgent';
import { Agent, LLMProvider } from './types';
import { MemoryStore } from '../memory/MemoryStore';
import { CLASSIFIER_PROMPT } from '../prompts/classifier';

export class Classifier extends BaseAgent {
  name = 'Classifier';
  capabilities = ['routing', 'classification'];
  tools: any[] = [];
  agents: Agent[];

  constructor(agents: Agent[], llm: LLMProvider, memory: MemoryStore) {
    super(llm, memory);
    this.agents = agents;
  }

  async canHandle(): Promise<boolean> {
    // Classifier handles all routing, not specific messages
    return true;
  }

  async execute(): Promise<any> {
    // Classifier doesn't execute directly, use classify() or classifyMultiStep()
    throw new Error('Classifier.execute() should not be called directly');
  }

  /**
   * Classify user message and return which agent should handle it
   *
   * Uses LLM to understand intent and route to correct specialist agent.
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

    this.resetTokens();

    // Build agent capabilities context
    const agentList = this.agents.map(agent =>
      `- ${agent.name}: ${agent.capabilities.join(', ')}`
    ).join('\n');

    // Get recent memory context (last 5 actions)
    const recentActions = memory.search({});
    const memoryContext = recentActions.slice(-5).map(entry => {
      const entityInfo = entry.entityId ? ` (${entry.entityType || 'unknown'}: ${entry.entityId})` : '';
      return `${new Date(entry.timestamp).toLocaleTimeString()}: ${entry.agent} - ${entry.action}${entityInfo}`;
    }).join('\n');

    const memorySection = memoryContext
      ? `\n\nRECENT ACTIONS:\n${memoryContext}\n\nUse this context to resolve ambiguous requests.`
      : '';

    // Prepare LLM messages
    const messages = [
      {
        role: 'system',
        content: CLASSIFIER_PROMPT + memorySection,
      },
      {
        role: 'user',
        content: `Route this request: "${userMessage}"`,
      },
    ];

    // DEBUG: Log LLM request
    console.log('\n[Classifier] ========== LLM REQUEST ==========');
    console.log('[Classifier] User Message:', userMessage);
    console.log('[Classifier] Available Agents:', this.agents.map(a => a.name).join(', '));
    if (memoryContext) {
      console.log('[Classifier] Memory Context:', memoryContext);
    }

    try {
      // Call LLM for routing decision
      const response = await this.callLLM({
        messages: messages as any,
        temperature: 0.3,  // Low variance for deterministic routing
        max_tokens: 100,   // Short response needed
      });

      // DEBUG: Log LLM response
      console.log('\n[Classifier] ========== LLM RESPONSE ==========');
      console.log('[Classifier] Raw Response:', response.content);
      console.log('[Classifier] Tokens - Input:', this.inputTokens, 'Output:', this.outputTokens);
      console.log('[Classifier] Cost:', `$${this.calculateCost().toFixed(6)}`);

      const agentName = response.content?.trim();

      // Validate response
      if (!agentName || agentName === 'NO_MATCH') {
        console.log('[Classifier] Result: NO_MATCH');
        console.log('[Classifier] =======================================\n');
        return null;
      }

      // Verify agent exists
      const agentExists = this.agents.some(a => a.name === agentName);
      if (!agentExists) {
        console.log(`[Classifier] WARNING: LLM returned unknown agent "${agentName}"`);
        console.log('[Classifier] Result: NO_MATCH (invalid agent)');
        console.log('[Classifier] =======================================\n');
        return null;
      }

      console.log(`[Classifier] Result: ${agentName}`);
      console.log('[Classifier] =======================================\n');
      return agentName;

    } catch (error: any) {
      console.error('[Classifier] ERROR:', error.message);
      console.log('[Classifier] =======================================\n');
      return null;
    }
  }

  /**
   * Detect multi-step requests and return agents with specific instructions
   *
   * Uses LLM to identify complex requests requiring multiple agents and split the request.
   *
   * Examples of multi-step requests:
   * - "Create a page with pricing cards" → [{agent: PageAgent, instruction: "Create a page"}, {agent: CreatorAgent, instruction: "Add pricing cards"}]
   *
   * @param userMessage - The user's request
   * @param memory - Memory store for context
   * @returns Array of {agent, instruction} or null for single-step
   */
  async classifyMultiStep(userMessage: string, memory: MemoryStore): Promise<Array<{agent: string, instruction: string}> | null> {
    // Handle empty messages
    if (!userMessage || userMessage.trim() === '') {
      return null;
    }

    this.resetTokens();

    // Prepare LLM messages for multi-step detection and message splitting
    const messages = [
      {
        role: 'system',
        content: `You are a multi-step request splitter for WP-Designer.

Your job is to:
1. Identify if a request requires MULTIPLE agents in sequence
2. Split the request into agent-specific instructions

AVAILABLE AGENTS:
- PageAgent (creates/switches/deletes pages)
- CreatorAgent (creates components/sections/tables)
- UpdateAgent (modifies/moves/deletes components)

MULTI-STEP EXAMPLES:

"Create a dashboard page with pricing cards"
→ {"steps": [
    {"agent": "PageAgent", "instruction": "Create a dashboard page"},
    {"agent": "CreatorAgent", "instruction": "Add pricing cards"}
  ]}

"Add a dashboard page. 2. add hosting dashboard cards. 3. add a table with deployments"
→ {"steps": [
    {"agent": "PageAgent", "instruction": "Create a dashboard page"},
    {"agent": "CreatorAgent", "instruction": "Add hosting dashboard cards and deployment table"}
  ]}

"Switch to about page and update the heading"
→ {"steps": [
    {"agent": "PageAgent", "instruction": "Switch to about page"},
    {"agent": "UpdateAgent", "instruction": "Update the heading"}
  ]}

"Add a contact page and include a form"
→ {"steps": [
    {"agent": "PageAgent", "instruction": "Create a contact page"},
    {"agent": "CreatorAgent", "instruction": "Add a form"}
  ]}

SINGLE-STEP EXAMPLES:

"Create a pricing page"
→ SINGLE_STEP

"Add three testimonial cards"
→ SINGLE_STEP

"Make the button primary"
→ SINGLE_STEP

RESPONSE FORMAT:

For multi-step requests, return JSON object with "steps" array:
{"steps": [{"agent": "AgentName", "instruction": "specific instruction"}, ...]}

For single-step requests, return:
SINGLE_STEP

IMPORTANT:
- Each agent should receive ONLY its relevant instruction, not the full request
- Split complex requests so each agent gets focused, atomic tasks
- Do NOT include explanations, ONLY the JSON object or "SINGLE_STEP"`,
      },
      {
        role: 'user',
        content: `Analyze this request: "${userMessage}"`,
      },
    ];

    // DEBUG: Log LLM request
    console.log('\n[Classifier] ========== MULTI-STEP DETECTION ==========');
    console.log('[Classifier] User Message:', userMessage);

    try {
      const response = await this.callLLM({
        messages: messages as any,
        temperature: 0.3,
        max_tokens: 300,  // Increased for JSON response with instructions
      });

      // DEBUG: Log LLM response
      console.log('[Classifier] Multi-Step Response:', response.content);
      console.log('[Classifier] Finish Reason:', response.finish_reason);
      console.log('[Classifier] Tokens - Input:', this.inputTokens, 'Output:', this.outputTokens);
      console.log('[Classifier] Full Response Object:', JSON.stringify(response, null, 2));
      console.log('[Classifier] =======================================\n');

      const content = response.content?.trim();

      if (!content || content === 'SINGLE_STEP') {
        return null;
      }

      // Parse JSON response with agent-specific instructions
      try {
        const parsed = JSON.parse(content);
        if (parsed.steps && Array.isArray(parsed.steps) && parsed.steps.length > 1) {
          // Validate each step has required fields and agent exists
          const validSteps = parsed.steps.filter((step: any) =>
            step.agent &&
            step.instruction &&
            this.agents.some(a => a.name === step.agent)
          );

          if (validSteps.length > 1) {
            console.log('[Classifier] Parsed multi-step with instructions:', validSteps);
            return validSteps;
          }
        }
      } catch (error) {
        console.error('[Classifier] Failed to parse multi-step JSON:', error);
      }

      // If parsing failed or not enough valid steps, treat as single-step
      return null;

    } catch (error: any) {
      console.error('[Classifier] Multi-step detection ERROR:', error.message);
      console.log('[Classifier] =======================================\n');
      return null;
    }
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): Agent | null {
    return this.agents.find(a => a.name === name) || null;
  }
}
