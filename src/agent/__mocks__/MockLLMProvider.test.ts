import {
  MockLLMProvider,
  createToolCallResponse,
  createTextResponse,
  createMultiToolResponse,
} from './MockLLMProvider';

describe('MockLLMProvider', () => {
  describe('basic functionality', () => {
    it('returns queued responses in order', async () => {
      const provider = new MockLLMProvider({
        responses: [
          createTextResponse('First response'),
          createTextResponse('Second response'),
        ],
      });

      const first = await provider.chat({ messages: [] });
      const second = await provider.chat({ messages: [] });

      expect(first.content).toBe('First response');
      expect(second.content).toBe('Second response');
    });

    it('returns default response when queue is empty', async () => {
      const provider = new MockLLMProvider();

      const response = await provider.chat({ messages: [] });

      expect(response.content).toBe('Mock response');
      expect(response.finish_reason).toBe('stop');
    });

    it('tracks call history', async () => {
      const provider = new MockLLMProvider({
        responses: [createTextResponse('Response')],
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o-mini',
      });

      const calls = provider.getCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0].messages).toEqual([{ role: 'user', content: 'Hello' }]);
      expect(calls[0].model).toBe('gpt-4o-mini');
    });
  });

  describe('tool call responses', () => {
    it('creates single tool call response', async () => {
      const provider = new MockLLMProvider({
        responses: [
          createToolCallResponse('createPage', { name: 'Dashboard' }),
        ],
      });

      const response = await provider.chat({ messages: [] });

      expect(response.finish_reason).toBe('tool_calls');
      expect(response.tool_calls).toHaveLength(1);
      expect(response.tool_calls![0].function.name).toBe('createPage');
      expect(JSON.parse(response.tool_calls![0].function.arguments)).toEqual({
        name: 'Dashboard',
      });
    });

    it('creates multiple tool calls in one response', async () => {
      const provider = new MockLLMProvider({
        responses: [
          createMultiToolResponse([
            { name: 'createPage', args: { name: 'Dashboard' } },
            { name: 'buildFromMarkup', args: { markup: '<Card />' } },
          ]),
        ],
      });

      const response = await provider.chat({ messages: [] });

      expect(response.finish_reason).toBe('tool_calls');
      expect(response.tool_calls).toHaveLength(2);
      expect(response.tool_calls![0].function.name).toBe('createPage');
      expect(response.tool_calls![1].function.name).toBe('buildFromMarkup');
    });
  });

  describe('helper methods', () => {
    it('getLastCall returns last call', async () => {
      const provider = new MockLLMProvider({
        responses: [
          createTextResponse('First'),
          createTextResponse('Second'),
        ],
      });

      await provider.chat({ messages: [{ role: 'user', content: 'First' }] });
      await provider.chat({ messages: [{ role: 'user', content: 'Second' }] });

      const lastCall = provider.getLastCall();
      expect(lastCall?.messages).toEqual([{ role: 'user', content: 'Second' }]);
    });

    it('reset clears call history', async () => {
      const provider = new MockLLMProvider({
        responses: [createTextResponse('Response')],
      });

      await provider.chat({ messages: [] });
      expect(provider.getCalls()).toHaveLength(1);

      provider.reset();
      expect(provider.getCalls()).toHaveLength(0);
    });

    it('wasToolCalled checks if tool was used', async () => {
      const provider = new MockLLMProvider({
        responses: [
          createToolCallResponse('createPage', { name: 'Dashboard' }),
        ],
      });

      await provider.chat({ messages: [] });

      expect(provider.wasToolCalled('createPage')).toBe(true);
      expect(provider.wasToolCalled('buildFromMarkup')).toBe(false);
    });
  });

  describe('delay simulation', () => {
    it('simulates network delay', async () => {
      const provider = new MockLLMProvider({
        responses: [createTextResponse('Response')],
        delay: 100,
      });

      const startTime = Date.now();
      await provider.chat({ messages: [] });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });
});
