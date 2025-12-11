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
import { getTool } from './tools'; // Imports and registers all tools

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

  private constructor(
    memory: MemoryStore,
    pageAgent: PageAgent,
    creatorAgent: CreatorAgent,
    updateAgent: UpdateAgent,
    validatorAgent: ValidatorAgent,
    classifier: Classifier
  ) {
    this.memory = memory;
    this.pageAgent = pageAgent;
    this.creatorAgent = creatorAgent;
    this.updateAgent = updateAgent;
    this.validatorAgent = validatorAgent;
    this.classifier = classifier;
  }

  /**
   * Create a new AgentOrchestrator instance (async factory)
   */
  static async create(): Promise<AgentOrchestrator> {
    // Initialize shared memory
    const memory = new MemoryStore();

    // Create LLM provider using centralized agentConfig
    const config = getAgentModel('agent');
    const llm = await createLLMProvider(config);

    // Initialize specialist agents
    const pageAgent = new PageAgent(llm, memory);
    const creatorAgent = new CreatorAgent(llm, memory);
    const updateAgent = new UpdateAgent(llm, memory);
    const validatorAgent = new ValidatorAgent(llm, memory);

    // Initialize classifier with agent priority order
    const classifier = new Classifier(
      [
        pageAgent,      // Priority 1: Page operations
        creatorAgent,   // Priority 2: Component creation
        updateAgent,    // Priority 3: Modifications
      ],
      llm,    // LLM provider for routing decisions
      memory  // Memory for context-aware routing
    );

    // Create orchestrator instance
    const orchestrator = new AgentOrchestrator(
      memory,
      pageAgent,
      creatorAgent,
      updateAgent,
      validatorAgent,
      classifier
    );

    // Inject real tools from registry into each agent
    orchestrator.injectTools(pageAgent);
    orchestrator.injectTools(creatorAgent);
    orchestrator.injectTools(updateAgent);

    return orchestrator;
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

      // Try multi-step classification first
      const agentSteps = await this.classifier.classifyMultiStep(userMessage, this.memory);

      if (agentSteps && agentSteps.length > 1) {
        // Multi-step workflow with agent-specific instructions
        onProgress?.({
          agent: 'Classifier',
          type: 'success',
          message: `Multi-step workflow: ${agentSteps.map(s => s.agent).join(' → ')}`,
          timestamp: Date.now(),
        });

        // Execute agents sequentially with their specific instructions
        console.log(`[Orchestrator] Starting multi-step workflow with ${agentSteps.length} steps`);
        for (let i = 0; i < agentSteps.length; i++) {
          const { agent: agentName, instruction } = agentSteps[i];
          console.log(`[Orchestrator] ========== STEP ${i + 1}/${agentSteps.length} ==========`);
          console.log(`[Orchestrator] Agent: ${agentName}`);
          console.log(`[Orchestrator] Instruction: ${instruction}`);

          const agent = this.classifier.getAgent(agentName);
          if (!agent) {
            throw new Error(`Agent ${agentName} not found`);
          }

          console.log(`[Orchestrator] Executing ${agentName}...`);
          const agentResult: AgentResult = await agent.execute(
            instruction,  // ← AGENT-SPECIFIC INSTRUCTION, NOT FULL MESSAGE!
            context,
            this.memory,
            (message: AgentProgressMessage) => {
              // Forward agent messages to UI
              onProgress?.(message);
            }
          );

          console.log(`[Orchestrator] ${agentName} completed:`, {
            success: agentResult.success,
            message: agentResult.message,
            tokensUsed: agentResult.tokensUsed,
            memoryEntriesCreated: agentResult.memoryEntriesCreated,
          });

          totalTokens += agentResult.tokensUsed;
          totalCost += agentResult.cost;
          memoryEntriesCreated += agentResult.memoryEntriesCreated;

          if (!agentResult.success) {
            console.error(`[Orchestrator] Step ${i + 1} FAILED - stopping workflow`);
            return {
              success: false,
              message: agentResult.message,
              tokensUsed: totalTokens,
              cost: totalCost,
              duration: Date.now() - startTime,
              memoryEntriesCreated,
            };
          }
          console.log(`[Orchestrator] Step ${i + 1} SUCCESS - continuing`);
        }
        console.log(`[Orchestrator] All ${agentSteps.length} steps completed successfully`);
      } else {
        // Single-step workflow
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

      // NOTE: Don't emit validation message via onProgress here, as it will be
      // displayed via the final result.message to avoid duplicate messages

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
