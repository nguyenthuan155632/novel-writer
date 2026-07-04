import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLoggedProvider } from '../../src/lib/llm-provider.ts';
import {
  buildLiveProvider,
  getActiveProvider,
  getModelStatusForActiveProvider,
  getProviderStatus,
  resetActiveProviderForTests,
  setActiveProvider,
  setModelRoutesForActiveProvider,
} from '../../src/lib/provider-switcher.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;

const OLD_ENV = process.env;

afterEach(async () => {
  process.env = { ...OLD_ENV };
  await resetActiveProviderForTests();
  vi.restoreAllMocks();
});

describe('provider switcher', () => {
  it('defaults to the reusable OpenAI-compatible provider from database seed', async () => {
    await resetActiveProviderForTests();

    expect(await getActiveProvider()).toBe('openai-compatible');
    expect((await getProviderStatus()).provider).toBe('openai-compatible');
  });

  it('updates the active provider', async () => {
    await setActiveProvider('openrouter');

    expect(await getActiveProvider()).toBe('openrouter');
    expect((await getProviderStatus()).options.map((o) => o.id)).toEqual([
      'openai-compatible',
      'openrouter',
      'ollama',
      'vmlx',
    ]);
  });

  it('builds an OpenAI-compatible live provider when selected', async () => {
    await setActiveProvider('openai-compatible');
    process.env.OPENAI_COMPATIBLE_API_KEY = 'compatible-key';
    process.env.OPENAI_COMPATIBLE_BASE_URL = 'https://llm.example/v1';

    const provider = await buildLiveProvider();

    expect(provider.name).toBe('openai-compatible');
  });

  it('builds an openrouter live provider when selected', async () => {
    await setActiveProvider('openrouter');
    process.env.OPENROUTER_API_KEY = 'openrouter-key';

    const provider = await buildLiveProvider();

    expect(provider.name).toBe('openrouter');
  });

  it('builds an ollama live provider when selected', async () => {
    await setActiveProvider('ollama');

    const provider = await buildLiveProvider();

    expect(provider.name).toBe('ollama');
  });

  it('builds a vMLX live provider when selected without an api key', async () => {
    await setActiveProvider('vmlx');
    process.env.VMLX_BASE_URL = 'http://127.0.0.1:8000/v1';

    const provider = await buildLiveProvider();

    expect(provider.name).toBe('vmlx');
  });

  it('requires the selected provider api key', async () => {
    await setActiveProvider('openrouter');
    delete process.env.OPENROUTER_API_KEY;

    await expect(buildLiveProvider()).rejects.toThrow(/OPENROUTER_API_KEY is required/);
  });

  it('keeps separate model routes for each provider', async () => {
    await setActiveProvider('openrouter');
    await setModelRoutesForActiveProvider({ writer: 'openrouter/model-a' });
    await setActiveProvider('ollama');
    await setModelRoutesForActiveProvider({ writer: 'ollama/model-b' });
    await setActiveProvider('openrouter');
    const status = await getModelStatusForActiveProvider();
    expect(status.routes.writer).toBe('openrouter/model-a');
  });
});

describe('buildLoggedProvider', () => {
  it('uses the selected live provider under the logger wrapper', async () => {
    await setActiveProvider('openrouter');
    process.env.OPENROUTER_API_KEY = 'openrouter-key';
    process.env.DATABASE_URL = TEST_DB;

    const provider = await buildLoggedProvider();

    expect(provider.name).toBe('logged(openrouter)');
  });

  it('uses mock provider when a mock response is supplied', async () => {
    await setActiveProvider('openrouter');
    delete process.env.OPENROUTER_API_KEY;
    process.env.DATABASE_URL = TEST_DB;

    const provider = await buildLoggedProvider({ mockResponse: '{"ok":true}' });

    expect(provider.name).toBe('logged(mock)');
  });
});
