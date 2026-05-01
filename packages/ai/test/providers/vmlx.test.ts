import { describe, expect, it, vi } from 'vitest';
import { VmlxProvider } from '../../src/providers/vmlx.ts';

describe('VmlxProvider', () => {
  it('posts OpenAI-compatible chat completion requests to local vMLX without auth', async () => {
    let captured: { url?: string; init?: RequestInit } = {};
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      captured = { url, init };
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({
          choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 7 } },
        }),
      };
    }) as unknown as typeof fetch;

    const p = new VmlxProvider({ fetchImpl });
    const r = await p.complete({
      model: 'mlx-community/Qwen3-8B-4bit',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 100,
    });

    expect(captured.url).toBe('http://localhost:8000/v1/chat/completions');
    expect(captured.init?.method).toBe('POST');
    expect(captured.init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(captured.init?.body as string)).toEqual({
      model: 'mlx-community/Qwen3-8B-4bit',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 100,
    });
    expect(r.content).toBe('ok');
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 7 });
    expect(r.finishReason).toBe('stop');
  });

  it('throws on non-OK response', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: 'bad' }),
      json: async () => ({ error: 'bad' }),
    })) as unknown as typeof fetch;
    const p = new VmlxProvider({ fetchImpl });

    await expect(p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] }))
      .rejects.toThrow(/vMLX error 500/);
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
    const p = new VmlxProvider({ fetchImpl });

    await p.complete({
      model: 'm',
      messages: [{ role: 'user', content: 'hi' }],
      responseSchema: { type: 'object', properties: { a: { type: 'string' } } },
    });

    expect(captured.body).toMatch(/"response_format"/);
    expect(captured.body).toMatch(/"json_schema"/);
  });
});
