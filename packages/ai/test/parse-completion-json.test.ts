import { describe, it, expect } from 'vitest';
import { parseCompletionJsonObject } from '../src/parse-completion-json.ts';
import type { CompletionResponse } from '../src/providers/types.ts';

function base(over: Partial<CompletionResponse>): CompletionResponse {
  return {
    content: '{}',
    usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
    finishReason: 'stop',
    raw: {},
    ...over,
  };
}

describe('parseCompletionJsonObject', () => {
  it('parses a normal JSON object string', () => {
    const obj = { pass: true, issues: [], summary: 'ok' };
    const out = parseCompletionJsonObject(
      base({ content: JSON.stringify(obj) }),
      'test',
    );
    expect(out).toEqual(obj);
  });

  it('uses message.parsed when content is the literal null JSON', () => {
    const nested = { pass: true, issues: [], summary: 'fallback' };
    const out = parseCompletionJsonObject(
      base({
        content: 'null',
        raw: {
          choices: [{ message: { parsed: nested } }],
        },
      }),
      'test',
    );
    expect(out).toEqual(nested);
  });

  it('uses message.parsed when content is empty', () => {
    const nested = { foo: 'bar' };
    const out = parseCompletionJsonObject(
      base({
        content: '',
        raw: {
          choices: [{ message: { parsed: nested } }],
        },
      }),
      'test',
    );
    expect(out).toEqual(nested);
  });

  it('throws a clear error when content is null JSON and no fallback exists', () => {
    expect(() =>
      parseCompletionJsonObject(base({ content: 'null', raw: {} }), 'ctx'),
    ).toThrow(/ctx: expected JSON object, got null/);
  });
});
