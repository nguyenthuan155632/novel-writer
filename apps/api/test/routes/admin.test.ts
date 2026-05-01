import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../src/server.ts';
import { resetActiveProviderForTests, setActiveProvider } from '../../src/lib/provider-switcher.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;

afterEach(async () => {
  await resetActiveProviderForTests();
});

describe('admin provider routes', () => {
  it('returns the active provider and options', async () => {
    await setActiveProvider('opencode');
    const app = buildServer();

    const res = await app.inject({ method: 'GET', url: '/api/admin/provider' });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      provider: 'opencode',
      options: [
        { id: 'opencode', label: 'OpenCode' },
        { id: 'openrouter', label: 'OpenRouter' },
        { id: 'ollama', label: 'Ollama (local)' },
        { id: 'vmlx', label: 'vMLX (local)' },
      ],
    });
  });

  it('updates the active provider', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/provider',
      payload: { provider: 'openrouter' },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().provider).toBe('openrouter');
  });

  it('rejects unsupported providers', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/provider',
      payload: { provider: 'bad-provider' },
    });
    await app.close();

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('admin model routes', () => {
  it('returns model routes, options, and copyable hints', async () => {
    const app = buildServer();

    const res = await app.inject({ method: 'GET', url: '/api/admin/models' });
    await app.close();

    expect(res.statusCode).toBe(200);
    const body = res.json() as { routes: Record<string, string>; options: unknown[]; hints: string[] };
    expect(body.routes.writer).toBe('google/gemini-2.5-flash');
    expect(
      (body.options as Array<{ role: string }>).some((option) => option.role === 'writer'),
    ).toBe(true);
    expect(
      (body.options as Array<{ role: string }>).some((option) => option.role === 'arc_summary_compactor'),
    ).toBe(true);
    expect(body.hints).toContain('google/gemini-2.5-flash');
  });

  it('updates model routes', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/models',
      payload: {
        routes: {
          writer: 'google/gemini-2.5-flash',
          llm_validator: 'google/gemini-2.5-flash-lite',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { routes: Record<string, string> };
    expect(body.routes.writer).toBe('google/gemini-2.5-flash');
    expect(body.routes.llm_validator).toBe('google/gemini-2.5-flash-lite');

    const getRes = await app.inject({ method: 'GET', url: '/api/admin/models' });
    await app.close();
    expect(getRes.json().routes.writer).toBe('google/gemini-2.5-flash');
    expect(getRes.json().routes.llm_validator).toBe('google/gemini-2.5-flash-lite');
  });

  it('persists per-provider model routes when switching active provider', async () => {
    const app = buildServer();

    const switchOpenrouter = await app.inject({ method: 'PUT', url: '/api/admin/provider', payload: { provider: 'openrouter' } });
    expect(switchOpenrouter.statusCode).toBe(200);
    const setOpenrouterModel = await app.inject({
      method: 'PUT',
      url: '/api/admin/models',
      payload: { routes: { writer: 'openrouter/writer' } },
    });
    expect(setOpenrouterModel.statusCode).toBe(200);

    const switchOllama = await app.inject({ method: 'PUT', url: '/api/admin/provider', payload: { provider: 'ollama' } });
    expect(switchOllama.statusCode).toBe(200);
    const setOllamaModel = await app.inject({
      method: 'PUT',
      url: '/api/admin/models',
      payload: { routes: { writer: 'ollama/writer' } },
    });
    expect(setOllamaModel.statusCode).toBe(200);

    const switchBack = await app.inject({ method: 'PUT', url: '/api/admin/provider', payload: { provider: 'openrouter' } });
    expect(switchBack.statusCode).toBe(200);
    const res = await app.inject({ method: 'GET', url: '/api/admin/models' });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().routes.writer).toBe('openrouter/writer');
  });

  it('applies PUT /api/admin/models only to the active provider', async () => {
    const app = buildServer();

    expect((await app.inject({ method: 'PUT', url: '/api/admin/provider', payload: { provider: 'openrouter' } })).statusCode).toBe(200);
    expect((await app.inject({
      method: 'PUT',
      url: '/api/admin/models',
      payload: { routes: { writer: 'only-openrouter' } },
    })).statusCode).toBe(200);

    expect((await app.inject({ method: 'PUT', url: '/api/admin/provider', payload: { provider: 'ollama' } })).statusCode).toBe(200);
    const onOllama = await app.inject({ method: 'GET', url: '/api/admin/models' });
    expect(onOllama.json().routes.writer).toBe('google/gemini-2.5-flash');

    expect((await app.inject({
      method: 'PUT',
      url: '/api/admin/models',
      payload: { routes: { writer: 'only-ollama' } },
    })).statusCode).toBe(200);
    const afterOllamaPut = await app.inject({ method: 'GET', url: '/api/admin/models' });
    expect(afterOllamaPut.json().routes.writer).toBe('only-ollama');

    expect((await app.inject({ method: 'PUT', url: '/api/admin/provider', payload: { provider: 'openrouter' } })).statusCode).toBe(200);
    const backOnOpenrouter = await app.inject({ method: 'GET', url: '/api/admin/models' });
    await app.close();

    expect(backOnOpenrouter.json().routes.writer).toBe('only-openrouter');
  });

  it('rejects empty model ids', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/models',
      payload: { routes: { writer: '' } },
    });
    await app.close();

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('rejects whitespace-only model ids', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/models',
      payload: { routes: { writer: '   ' } },
    });
    await app.close();

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('keeps provider and model settings across server restart', async () => {
    const first = buildServer();

    expect((await first.inject({
      method: 'PUT',
      url: '/api/admin/provider',
      payload: { provider: 'openrouter' },
    })).statusCode).toBe(200);
    expect((await first.inject({
      method: 'PUT',
      url: '/api/admin/models',
      payload: { routes: { writer: 'openrouter/persisted' } },
    })).statusCode).toBe(200);
    await first.close();

    const second = buildServer();
    const providerRes = await second.inject({ method: 'GET', url: '/api/admin/provider' });
    const modelsRes = await second.inject({ method: 'GET', url: '/api/admin/models' });
    await second.close();

    expect(providerRes.statusCode).toBe(200);
    expect(modelsRes.statusCode).toBe(200);
    expect(providerRes.json().provider).toBe('openrouter');
    expect(modelsRes.json().routes.writer).toBe('openrouter/persisted');
  });
});
