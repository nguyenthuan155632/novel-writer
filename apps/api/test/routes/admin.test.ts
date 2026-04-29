import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../src/server.ts';
import { resetActiveProviderForTests, setActiveProvider } from '../../src/lib/provider-switcher.ts';

afterEach(() => {
  resetActiveProviderForTests();
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
