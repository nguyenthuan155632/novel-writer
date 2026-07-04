import { describe, it, expect, vi } from 'vitest';
import { OpenAICompatibleProvider } from '../../src/providers/openai-compatible.ts';

function makeFetchStub(payload: unknown, status = 200) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  })) as unknown as typeof fetch;
}

describe('OpenAICompatibleProvider', () => {
  it('posts OpenAI-compatible chat completion requests to the configured base URL', async () => {
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

    const p = new OpenAICompatibleProvider({
      apiKey: 'k',
      baseUrl: 'https://llm.example/v1/',
      fetchImpl,
    });
    const r = await p.complete({
      model: 'provider/model-a',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 100,
    });

    expect(p.name).toBe('openai-compatible');
    expect(captured.url).toBe('https://llm.example/v1/chat/completions');
    expect(captured.init?.method).toBe('POST');
    expect(captured.init?.headers).toMatchObject({
      Authorization: 'Bearer k',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(captured.init?.body as string)).toEqual({
      model: 'provider/model-a',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 100,
      stream: false,
    });
    expect(r.content).toBe('ok');
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 7 });
    expect(r.finishReason).toBe('stop');
  });

  it('throws on non-OK response', async () => {
    const fetchImpl = makeFetchStub({ error: 'bad' }, 500);
    const p = new OpenAICompatibleProvider({
      apiKey: 'k',
      baseUrl: 'https://llm.example/v1',
      fetchImpl,
    });
    await expect(p.complete({ model: 'provider/model-a', messages: [{ role: 'user', content: 'hi' }] }))
      .rejects.toThrow(/OpenAI-compatible error 500/);
  });

  it('unwraps data-wrapped chat completion responses', async () => {
    const fetchImpl = makeFetchStub({
      success: true,
      data: {
        choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 4,
          prompt_tokens_details: { cached_tokens: 3 },
        },
      },
    });
    const p = new OpenAICompatibleProvider({
      apiKey: 'k',
      baseUrl: 'https://llm.example/v1',
      fetchImpl,
    });

    const r = await p.complete({
      model: 'provider/model-a',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(r.content).toBe('{"ok":true}');
    expect(r.usage).toEqual({ inputTokens: 12, outputTokens: 4, cachedInputTokens: 3 });
    expect(r.raw).toMatchObject({ choices: expect.any(Array), usage: expect.any(Object) });
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
    const p = new OpenAICompatibleProvider({
      apiKey: 'k',
      baseUrl: 'https://llm.example/v1',
      fetchImpl,
    });
    await p.complete({
      model: 'provider/model-a',
      messages: [{ role: 'user', content: 'hi' }],
      responseSchema: { type: 'object', properties: { a: { type: 'string' } } },
    });
    expect(captured.body).toMatch(/"response_format"/);
    expect(captured.body).toMatch(/"json_schema"/);
  });

  it('throws when apiKey is empty', () => {
    expect(() => new OpenAICompatibleProvider({
      apiKey: '',
      baseUrl: 'https://llm.example/v1',
    })).toThrow(/apiKey/);
  });

  it('throws when baseUrl is empty', () => {
    expect(() => new OpenAICompatibleProvider({
      apiKey: 'k',
      baseUrl: '',
    })).toThrow(/baseUrl/);
  });
});
