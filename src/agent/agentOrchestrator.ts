/**
 * Multi-Agent Orchestrator
 *
 * Replaces the single-agent messageHandler with memory-based multi-agent system:
 * 1. Classifier routes to specialist agent (Page/Creator/Update)
 * 2. Specialist agent executes and writes to memory
 * 3. ValidatorAgent validates completion
 * 4. Streaming progress messages throughout
 */

import { ToolContext } from './types';
import { MemoryStore } from './memory/MemoryStore';
import { Classifier } from './agents/Classifier';
import { PageAgent } from './agents/PageAgent';
import { CreatorAgent } from './agents/CreatorAgent';
import { UpdateAgent } from './agents/UpdateAgent';
import { ValidatorAgent, ValidationResult } from './agents/ValidatorAgent';
import { createLLMProvider } from './llm/factory';
import { AgentResult, AgentProgressMessage } from './agents/types';
import { getAgentModel } from './agentConfig';
import { getTool } from './tools/registry';

export interface OrchestrationOptions {
  onProgress?: (message: AgentProgressMessage) => void;
}

export interface OrchestrationResult {
  success: boolean;
  message: string;
  tokensUsed: number;
  cost: number;
  duration: number;
  memoryEntriesCreated: number;
  validation?: ValidationResult;
}

/**
 * Main orchestrator for multi-agent workflow
 */
export class AgentOrchestrator {
  private memory: MemoryStore;
  private classifier: Classifier;
  private pageAgent: PageAgent;
  private creatorAgent: CreatorAgent;
  private updateAgent: UpdateAgent;
  private validatorAgent: ValidatorAgent;

  constructor() {
    // Initialize shared memory
    this.memory = new MemoryStore();

    // Create LLM provider using centralized agentConfig
    const config = getAgentModel('agent');
    const llm = createLLMProvider(config);

    // Initialize specialist agents
    this.pageAgent = new PageAgent(llm, this.memory);
    this.creatorAgent = new CreatorAgent(llm, this.memory);
    this.updateAgent = new UpdateAgent(llm, this.memory);
    this.validatorAgent = new ValidatorAgent(llm, this.memory);

    // Inject real tools from registry into each agent
    this.injectTools(this.pageAgent);
    this.injectTools(this.creatorAgent);
    this.injectTools(this.updateAgent);

    // Initialize classifier with agent priority order
    this.classifier = new Classifier([
      this.pageAgent,      // Priority 1: Page operations
      this.creatorAgent,   // Priority 2: Component creation
      this.updateAgent,    // Priority 3: Modifications
    ]);
  }

  /**
   * Inject real tools from registry into an agent
   */
  private injectTools(agent: PageAgent | CreatorAgent | UpdateAgent) {
    const tools = agent.requiredTools
      .map(toolName => getTool(toolName))
      .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined);

    if (tools.length !== agent.requiredTools.length) {
      const missing = agent.requiredTools.filter(name => !getTool(name));
      console.warn(`[AgentOrchestrator] Agent ${agent.name} missing tools: ${missing.join(', ')}`);
    }

    agent.setTools(tools);
  }

  /**
   * Handle user message with multi-agent orchestration
   */
  async handleMessage(
    userMessage: string,
    context: ToolContext,
    options: OrchestrationOptions = {}
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const { onProgress } = options;

    // Clear memory for new request
    this.memory.clear();

    let totalTokens = 0;
    let totalCost = 0;
    let memoryEntriesCreated = 0;

    try {
      // Phase 1: Classification
      onProgress?.({
        agent: 'Classifier',
        type: 'progress',
        message: 'Analyzing request...',
        timestamp: Date.now(),
      });

      const agentName = await this.classifier.classify(userMessage, this.memory);

      if (!agentName) {
        return {
          success: false,
          message: "I'm not sure how to handle that request. Could you please rephrase it?",
          tokensUsed: 0,
          cost: 0,
          duration: Date.now() - startTime,
          memoryEntriesCreated: 0,
        };
      }

      onProgress?.({
        agent: 'Classifier',
        type: 'success',
        message: `Routing to ${agentName}`,
        timestamp: Date.now(),
      });

      // Phase 2: Execute specialist agent
      const agent = this.classifier.getAgent(agentName);
      if (!agent) {
        throw new Error(`Agent ${agentName} not found`);
      }

      const agentResult: AgentResult = await agent.execute(
        userMessage,
        context,
        this.memory,
        (message: AgentProgressMessage) => {
          // Forward agent messages to UI
          onProgress?.(message);
        }
      );

      totalTokens += agentResult.tokensUsed;
      totalCost += agentResult.cost;
      memoryEntriesCreated += agentResult.memoryEntriesCreated;

      if (!agentResult.success) {
        return {
          success: false,
          message: agentResult.message,
          tokensUsed: totalTokens,
          cost: totalCost,
          duration: Date.now() - startTime,
          memoryEntriesCreated,
        };
      }

      // Phase 3: Validation
      onProgress?.({
        agent: 'ValidatorAgent',
        type: 'progress',
        message: 'Validating results...',
        timestamp: Date.now(),
      });

      const validation = await this.validatorAgent.validate(userMessage, this.memory);

      totalTokens += validation.tokensUsed;
      totalCost += validation.cost;

      // Write validation result to memory
      this.memory.write({
        agent: 'ValidatorAgent',
        action: validation.success ? 'validation_passed' : 'validation_failed',
        details: {
          completedTasks: validation.completedTasks,
          totalTasks: validation.totalTasks,
        },
      });
      memoryEntriesCreated++;

      // Send validation message
      onProgress?.({
        agent: 'ValidatorAgent',
        type: validation.success ? 'success' : 'error',
        message: validation.message,
        timestamp: Date.now(),
      });

      return {
        success: validation.success,
        message: validation.message,
        tokensUsed: totalTokens,
        cost: totalCost,
        duration: Date.now() - startTime,
        memoryEntriesCreated,
        validation,
      };
    } catch (error: any) {
      // Write error to memory
      this.memory.write({
        agent: 'Orchestrator',
        action: 'error',
        details: { error: error.message },
      });

      return {
        success: false,
        message: `Error: ${error.message}`,
        tokensUsed: totalTokens,
        cost: totalCost,
        duration: Date.now() - startTime,
        memoryEntriesCreated,
      };
    }
  }

  /**
   * Get memory for debugging/inspection
   */
  getMemory(): MemoryStore {
    return this.memory;
  }
}
