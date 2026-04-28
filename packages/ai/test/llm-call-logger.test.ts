import { describe, it, expect, vi } from 'vitest';
import { LoggedLLMProvider } from '../src/llm-call-logger.ts';
import { MockProvider } from '../src/providers/mock.ts';

describe('LoggedLLMProvider', () => {
  it('records a row per call with cost estimate', async () => {
    const recorder = vi.fn();
    const inner = new MockProvider({
      responder: { kind: 'fixed', content: 'ok', usage: { inputTokens: 1000, outputTokens: 500, cachedInputTokens: 800 } },
    });
    const wrapped = new LoggedLLMProvider({ inner, recordCall: recorder });

    await wrapped.complete({
      model: 'google/gemini-2.5-flash-lite',
      messages: [{ role: 'user', content: 'hi' }],
      metadata: { agentRole: 'writer', promptVersion: 'writer.v1', traceId: 'trace-1' },
    });

    expect(recorder).toHaveBeenCalledTimes(1);
    const row = recorder.mock.calls[0][0];
    expect(row.model).toBe('google/gemini-2.5-flash-lite');
    expect(row.agentRole).toBe('writer');
    expect(row.promptVersion).toBe('writer.v1');
    expect(row.inputTokens).toBe(1000);
    expect(row.outputTokens).toBe(500);
    expect(row.cachedInputTokens).toBe(800);
    expect(row.traceId).toBe('trace-1');
    expect(Number(row.estimatedCostUsd)).toBeGreaterThan(0);
  });

  it('still records on inner failure', async () => {
    const recorder = vi.fn();
    const inner = new MockProvider({
      responder: { kind: 'fn', fn: () => { throw new Error('boom'); } },
    });
    const wrapped = new LoggedLLMProvider({ inner, recordCall: recorder });

    await expect(wrapped.complete({
      model: 'google/gemini-2.5-flash-lite',
      messages: [{ role: 'user', content: 'hi' }],
      metadata: { agentRole: 'writer', traceId: 't' },
    })).rejects.toThrow('boom');

    expect(recorder).toHaveBeenCalledTimes(1);
    const row = recorder.mock.calls[0][0];
    expect(row.inputTokens).toBe(0);
    expect(row.outputTokens).toBe(0);
  });
});