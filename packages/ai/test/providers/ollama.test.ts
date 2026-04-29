import { describe, it, expect, vi } from 'vitest';
import { OllamaProvider } from '../../src/providers/ollama.ts';

function makeFetchStub(payload: unknown, status = 200) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  })) as unknown as typeof fetch;
}

describe('OllamaProvider', () => {
  it('parses successful response', async () => {
    const fetchImpl = makeFetchStub({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 7 } },
    });
    const p = new OllamaProvider({ fetchImpl });
    const r = await p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] });
    expect(r.content).toBe('ok');
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 7 });
    expect(r.finishReason).toBe('stop');
  });

  it('throws on non-OK response', async () => {
    const fetchImpl = makeFetchStub({ error: 'bad' }, 500);
    const p = new OllamaProvider({ fetchImpl });
    await expect(p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] }))
      .rejects.toThrow(/Ollama error 500/);
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
    const p = new OllamaProvider({ fetchImpl });
    await p.complete({
      model: 'm',
      messages: [{ role: 'user', content: 'hi' }],
      responseSchema: { type: 'object', properties: { a: { type: 'string' } } },
    });
    expect(captured.body).toMatch(/"response_format"/);
    expect(captured.body).toMatch(/"json_schema"/);
  });

  it('sends Authorization when apiKey is set', async () => {
    let headers: HeadersInit | undefined;
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      headers = init.headers;
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({ choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
      };
    }) as unknown as typeof fetch;
    const p = new OllamaProvider({ apiKey: 'secret', fetchImpl });
    await p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] });
    expect(new Headers(headers).get('Authorization')).toBe('Bearer secret');
  });

  it('does not require apiKey', async () => {
    const fetchImpl = makeFetchStub({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
    });
    const p = new OllamaProvider({ fetchImpl });
    await expect(p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] })).resolves.toBeDefined();
  });
});
