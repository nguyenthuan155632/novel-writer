import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../src/providers/mock.ts';

describe('MockProvider', () => {
  it('returns fixed content', async () => {
    const p = new MockProvider({
      responder: { kind: 'fixed', content: 'hello' },
    });
    const r = await p.complete({
      model: 'x',
      messages: [{ role: 'user', content: 'ping' }],
    });
    expect(r.content).toBe('hello');
    expect(r.usage.inputTokens).toBe(100);
    expect(p.getCalls()).toHaveLength(1);
  });

  it('uses function responder', async () => {
    const p = new MockProvider({
      responder: {
        kind: 'fn',
        fn: (req) => ({
          content: `echo: ${req.messages[0]!.content}`,
          usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 },
          finishReason: 'stop',
          raw: null,
        }),
      },
    });
    const r = await p.complete({ model: 'x', messages: [{ role: 'user', content: 'ping' }] });
    expect(r.content).toBe('echo: ping');
  });
});