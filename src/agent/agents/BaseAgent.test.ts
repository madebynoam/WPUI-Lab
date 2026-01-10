/**
 * BaseAgent Tests
 *
 * Tests the shared functionality in BaseAgent:
 * - Token tracking and cost calculation
 * - Memory operations
 * - Message emission
 * - LLM call wrapper
 */

import { BaseAgent } from './BaseAgent';
import { AgentResult, AgentProgressMessage } from './types';
import { ToolContext, AgentTool } from '../types';
import { MemoryStore } from '../memory/MemoryStore';
import { MockLLMProvider, createTextResponse } from '../__mocks__/MockLLMProvider';

/**
 * Concrete implementation of BaseAgent for testing
 */
class TestAgent extends BaseAgent {
  name = 'TestAgent';
  capabilities = ['test_capability'];
  tools: AgentTool[] = [];

  async canHandle(): Promise<boolean> {
    return true;
  }

  async execute(
    userMessage: string,
    context: ToolContext,
    memory: MemoryStore,
    onMessage?: (message: AgentProgressMessage) => void
  ): Promise<AgentResult> {
    this.onMessage = onMessage;
    this.memory = memory;
    this.resetTokens();

    this.emit('progress', 'Starting test execution');

    // Make an LLM call to test token tracking
    const response = await this.callLLM({
      messages: [
        { role: 'system', content: 'Test system message' },
        { role: 'user', content: userMessage },
      ],
    });

    this.emit('success', response.content || 'Done');

    return this.createSuccessResult('Test completed', { response: response.content }, 1);
  }

  // Expose protected methods for testing
  public testEstimateTokens(text: string): number {
    return this.estimateTokens(text);
  }

  public testTrackInputTokens(tokens: number): void {
    this.trackInputTokens(tokens);
  }

  public testTrackOutputTokens(tokens: number): void {
    this.trackOutputTokens(tokens);
  }

  public testCalculateCost(): number {
    return this.calculateCost();
  }

  public testGetTotalTokens(): number {
    return this.getTotalTokens();
  }

  public testResetTokens(): void {
    this.resetTokens();
  }

  public testWriteMemory(entry: {
    action: any;
    entityId?: string;
    entityType?: string;
    details: any;
  }): void {
    this.writeMemory(entry);
  }

  public testSearchMemory(query: any): any[] {
    return this.searchMemory(query);
  }

  public testEmit(type: 'progress' | 'success' | 'error', message: string): void {
    this.emit(type, message);
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let mockLLM: MockLLMProvider;
  let memory: MemoryStore;
  let messages: AgentProgressMessage[];

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    memory = new MemoryStore();
    messages = [];

    agent = new TestAgent(mockLLM, memory);
  });

  describe('token estimation', () => {
    it('estimates tokens based on character count', () => {
      // ~4 chars per token
      const text = 'Hello world'; // 11 chars = ~3 tokens
      const tokens = agent.testEstimateTokens(text);
      expect(tokens).toBe(3);
    });

    it('handles empty string', () => {
      const tokens = agent.testEstimateTokens('');
      expect(tokens).toBe(0);
    });

    it('handles long text', () => {
      const text = 'a'.repeat(400); // 400 chars = 100 tokens
      const tokens = agent.testEstimateTokens(text);
      expect(tokens).toBe(100);
    });
  });

  describe('token tracking', () => {
    it('tracks input tokens', () => {
      agent.testResetTokens();
      agent.testTrackInputTokens(100);
      agent.testTrackInputTokens(50);
      expect(agent.testGetTotalTokens()).toBe(150);
    });

    it('tracks output tokens', () => {
      agent.testResetTokens();
      agent.testTrackOutputTokens(200);
      expect(agent.testGetTotalTokens()).toBe(200);
    });

    it('tracks both input and output tokens', () => {
      agent.testResetTokens();
      agent.testTrackInputTokens(100);
      agent.testTrackOutputTokens(50);
      expect(agent.testGetTotalTokens()).toBe(150);
    });

    it('resets tokens correctly', () => {
      agent.testTrackInputTokens(100);
      agent.testTrackOutputTokens(200);
      agent.testResetTokens();
      expect(agent.testGetTotalTokens()).toBe(0);
    });
  });

  describe('cost calculation', () => {
    it('calculates cost based on tokens', () => {
      agent.testResetTokens();
      // Input: 1M tokens at $0.25/M = $0.25
      // Output: 1M tokens at $2.0/M = $2.0
      agent.testTrackInputTokens(1_000_000);
      agent.testTrackOutputTokens(1_000_000);

      const cost = agent.testCalculateCost();
      expect(cost).toBeCloseTo(2.25, 2);
    });

    it('calculates small costs correctly', () => {
      agent.testResetTokens();
      // 1000 input tokens
      agent.testTrackInputTokens(1000);
      // 500 output tokens
      agent.testTrackOutputTokens(500);

      const cost = agent.testCalculateCost();
      // Input: 1000/1M * 0.25 = 0.00025
      // Output: 500/1M * 2.0 = 0.001
      expect(cost).toBeCloseTo(0.00125, 5);
    });

    it('returns zero for no tokens', () => {
      agent.testResetTokens();
      expect(agent.testCalculateCost()).toBe(0);
    });
  });

  describe('memory operations', () => {
    it('writes to memory with agent attribution', () => {
      agent.testWriteMemory({
        action: 'test_action',
        entityId: 'entity-1',
        entityType: 'TestEntity',
        details: { foo: 'bar' },
      });

      const entries = memory.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0].agent).toBe('TestAgent');
      expect(entries[0].action).toBe('test_action');
      expect(entries[0].entityId).toBe('entity-1');
      expect(entries[0].details.foo).toBe('bar');
    });

    it('searches memory', () => {
      memory.write({
        agent: 'OtherAgent',
        action: 'other_action',
        details: {},
      });

      memory.write({
        agent: 'TestAgent',
        action: 'test_action',
        details: {},
      });

      const results = agent.testSearchMemory({ agent: 'TestAgent' });
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('test_action');
    });
  });

  describe('message emission', () => {
    it('emits progress messages', () => {
      agent['onMessage'] = (msg) => messages.push(msg);

      agent.testEmit('progress', 'Working on it...');

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('progress');
      expect(messages[0].message).toBe('Working on it...');
      expect(messages[0].agent).toBe('TestAgent');
      expect(messages[0].timestamp).toBeGreaterThan(0);
    });

    it('emits success messages', () => {
      agent['onMessage'] = (msg) => messages.push(msg);

      agent.testEmit('success', 'Task completed!');

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('success');
    });

    it('emits error messages', () => {
      agent['onMessage'] = (msg) => messages.push(msg);

      agent.testEmit('error', 'Something went wrong');

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('error');
    });

    it('handles missing onMessage callback gracefully', () => {
      // Should not throw when no callback is set
      expect(() => {
        agent.testEmit('progress', 'Test message');
      }).not.toThrow();
    });
  });

  describe('LLM call wrapper', () => {
    it('tracks tokens from LLM calls', async () => {
      mockLLM.setResponses([
        createTextResponse('This is a response'),
      ]);

      const mockContext = {
        tree: [],
        pages: [],
        currentPageId: '',
        selectedNodeIds: [],
      } as unknown as ToolContext;

      const result = await agent.execute('Hello', mockContext, memory);

      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    it('emits messages during execution', async () => {
      mockLLM.setResponses([
        createTextResponse('Done'),
      ]);

      const mockContext = {
        tree: [],
        pages: [],
        currentPageId: '',
        selectedNodeIds: [],
      } as unknown as ToolContext;

      await agent.execute('Test', mockContext, memory, (msg) => messages.push(msg));

      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(m => m.type === 'progress')).toBe(true);
      expect(messages.some(m => m.type === 'success')).toBe(true);
    });
  });

  describe('result creation', () => {
    it('creates success result with correct structure', async () => {
      mockLLM.setResponses([
        createTextResponse('Success'),
      ]);

      const mockContext = {
        tree: [],
        pages: [],
        currentPageId: '',
        selectedNodeIds: [],
      } as unknown as ToolContext;

      const result = await agent.execute('Test', mockContext, memory);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Test completed');
      expect(result.memoryEntriesCreated).toBe(1);
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.data).toHaveProperty('response');
    });
  });
});
