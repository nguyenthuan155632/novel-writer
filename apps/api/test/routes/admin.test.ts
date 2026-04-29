import { afterEach, describe, expect, it } from 'vitest';
import { modelFor, resetModelRoutesForTests } from '@novel/core';
import { buildServer } from '../../src/server.ts';
import { resetActiveProviderForTests, setActiveProvider } from '../../src/lib/provider-switcher.ts';

afterEach(() => {
  resetActiveProviderForTests();
  resetModelRoutesForTests();
});

describe('admin provider routes', () => {
  it('returns the active provider and options', async () => {
    setActiveProvider('opencode');
    const app = buildServer();

    const res = await app.inject({ method: 'GET', url: '/api/admin/provider' });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      provider: 'opencode',
      options: [
        { id: 'opencode', label: 'OpenCode' },
        { id: 'openrouter', label: 'OpenRouter' },
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
    expect(res.json().routes.writer).toBe('google/gemini-2.5-flash');
    expect(res.json().options.some((option: { role: string }) => option.role === 'writer')).toBe(true);
    expect(res.json().hints).toContain('google/gemini-2.5-flash');
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
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().routes.writer).toBe('google/gemini-2.5-flash');
    expect(modelFor('writer')).toBe('google/gemini-2.5-flash');
    expect(modelFor('llm_validator')).toBe('google/gemini-2.5-flash-lite');
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
});
