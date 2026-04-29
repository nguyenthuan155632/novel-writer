import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildLiveProvider,
  getActiveProvider,
  getProviderStatus,
  resetActiveProviderForTests,
  setActiveProvider,
} from '../../src/lib/provider-switcher.ts';

const OLD_ENV = process.env;

afterEach(() => {
  process.env = { ...OLD_ENV };
  resetActiveProviderForTests();
  vi.restoreAllMocks();
});

describe('provider switcher', () => {
  it('defaults to opencode when NOVEL_LLM_PROVIDER is unset', () => {
    delete process.env.NOVEL_LLM_PROVIDER;
    resetActiveProviderForTests();

    expect(getActiveProvider()).toBe('opencode');
    expect(getProviderStatus().provider).toBe('opencode');
  });

  it('uses openrouter as the startup default when configured', () => {
    process.env.NOVEL_LLM_PROVIDER = 'openrouter';
    resetActiveProviderForTests();

    expect(getActiveProvider()).toBe('openrouter');
  });

  it('updates the active provider', () => {
    setActiveProvider('openrouter');

    expect(getActiveProvider()).toBe('openrouter');
    expect(getProviderStatus().options.map((o) => o.id)).toEqual(['opencode', 'openrouter']);
  });

  it('builds an opencode live provider when selected', () => {
    setActiveProvider('opencode');
    process.env.OPENCODE_API_KEY = 'opencode-key';

    const provider = buildLiveProvider();

    expect(provider.name).toBe('opencode');
  });

  it('builds an openrouter live provider when selected', () => {
    setActiveProvider('openrouter');
    process.env.OPENROUTER_API_KEY = 'openrouter-key';

    const provider = buildLiveProvider();

    expect(provider.name).toBe('openrouter');
  });

  it('requires the selected provider api key', () => {
    setActiveProvider('openrouter');
    delete process.env.OPENROUTER_API_KEY;

    expect(() => buildLiveProvider()).toThrow(/OPENROUTER_API_KEY is required/);
  });
});
