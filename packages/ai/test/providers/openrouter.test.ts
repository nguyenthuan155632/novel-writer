import { describe, it, expect, vi } from 'vitest';
import { OpenRouterProvider } from '../../src/providers/openrouter.ts';

function makeFetchStub(payload: unknown, status = 200) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  })) as unknown as typeof fetch;
}

describe('OpenRouterProvider', () => {
  it('parses successful response', async () => {
    const fetchImpl = makeFetchStub({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 7 } },
    });
    const p = new OpenRouterProvider({ apiKey: 'k', fetchImpl });
    const r = await p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] });
    expect(r.content).toBe('ok');
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 7 });
    expect(r.finishReason).toBe('stop');
  });

  it('throws on non-OK response', async () => {
    const fetchImpl = makeFetchStub({ error: 'bad' }, 500);
    const p = new OpenRouterProvider({ apiKey: 'k', fetchImpl });
    await expect(p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] }))
      .rejects.toThrow(/OpenRouter error 500/);
  });

  it('passes responseSchema as response_format', async () => {
    let captured: { body?: string } = {};
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      captured.body = init?.body as string;
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({ choices: [{ message: { content: '{}' }, finish_reason: 'stop' }] }),
      };
    }) as unknown as typeof fetch;
    const p = new OpenRouterProvider({ apiKey: 'k', fetchImpl });
    await p.complete({
      model: 'm',
      messages: [{ role: 'user', content: 'hi' }],
      responseSchema: { type: 'object', properties: { a: { type: 'string' } } },
    });
    expect(captured.body).toMatch(/"response_format"/);
    expect(captured.body).toMatch(/"json_schema"/);
  });

  it('throws when apiKey is empty', () => {
    expect(() => new OpenRouterProvider({ apiKey: '' })).toThrow(/apiKey/);
  });

  it('retries on 429 with retry_after_seconds then succeeds', async () => {
    vi.useFakeTimers();
    const rateLimitedBody = {
      error: {
        message: 'Provider returned error',
        code: 429,
        metadata: { retry_after_seconds: 1, provider_name: 'Together' },
      },
    };
    const okPayload = {
      choices: [{ message: { content: 'after retry' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers(),
        text: async () => JSON.stringify(rateLimitedBody),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => JSON.stringify(okPayload),
        json: async () => okPayload,
      }) as unknown as typeof fetch;

    const p = new OpenRouterProvider({ apiKey: 'k', fetchImpl });
    const promise = p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] });
    await vi.advanceTimersByTimeAsync(1500);
    const r = await promise;
    expect(r.content).toBe('after retry');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('stops after max retries on persistent 429', async () => {
    vi.useFakeTimers();
    const body = JSON.stringify({
      error: { metadata: { retry_after_seconds: 1 } },
    });
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 429,
      headers: new Headers(),
      text: async () => body,
    })) as unknown as typeof fetch;

    const p = new OpenRouterProvider({ apiKey: 'k', fetchImpl });
    const completion = p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] });
    const failed = expect(completion).rejects.toThrow(/OpenRouter error 429/);
    await vi.advanceTimersByTimeAsync(120_000);
    await failed;
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    vi.useRealTimers();
  });
});