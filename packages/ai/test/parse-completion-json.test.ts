import { describe, it, expect, vi } from 'vitest';
import { parseCompletionJsonObject, withCompletionRetry } from '../src/parse-completion-json.ts';
import type { CompletionRequest, CompletionResponse } from '../src/providers/types.ts';

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

  it('strips markdown fences before parsing', () => {
    const recovered: Array<{ strategy: string; detail: string }> = [];
    const out = parseCompletionJsonObject(
      base({ content: '```json\n{"pass":true}\n```' }),
      'test',
      (event) => recovered.push(event),
    );
    expect(out).toEqual({ pass: true });
    expect(recovered[0]?.strategy).toBe('strip_fences');
  });

  it('extracts first JSON object from mixed content', () => {
    const recovered: Array<{ strategy: string; detail: string }> = [];
    const out = parseCompletionJsonObject(
      base({ content: 'Preface\n{"pass":true,"issues":[]}\nTail' }),
      'test',
      (event) => recovered.push(event),
    );
    expect(out).toEqual({ pass: true, issues: [] });
    expect(recovered[0]?.strategy).toBe('extract_object');
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

describe('withCompletionRetry', () => {
  it('re-prompts once after parse failure when request schema exists', async () => {
    const request: CompletionRequest = {
      model: 'test-model',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'user' },
      ],
      responseSchema: { type: 'object', properties: { pass: { type: 'boolean' } } },
      metadata: { agentRole: 'tester' },
    };
    const recoveries: string[] = [];
    const complete = vi
      .fn<(_: CompletionRequest | undefined) => Promise<CompletionResponse>>()
      .mockResolvedValueOnce(base({ content: 'not json' }))
      .mockResolvedValueOnce(base({ content: '{"pass":true}' }));

    const out = await withCompletionRetry('ctx', complete, 0, {
      request,
      onParseRecovery: (event) => recoveries.push(event.strategy),
    });

    expect(out).toEqual({ pass: true });
    expect(complete).toHaveBeenCalledTimes(2);
    expect(recoveries).toContain('re_prompt');
  });

  it('does not re-prompt without request schema', async () => {
    const complete = vi
      .fn<(_: CompletionRequest | undefined) => Promise<CompletionResponse>>()
      .mockResolvedValue(base({ content: 'not json' }));

    await expect(withCompletionRetry('ctx', complete, 0)).rejects.toThrow(/ctx: invalid JSON/);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
