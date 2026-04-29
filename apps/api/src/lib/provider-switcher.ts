import { OpenCodeProvider } from '@novel/ai/providers/opencode';
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import type { LLMProvider } from '@novel/ai/providers/types';
import { parseLlmProvider, type LlmProviderId } from '@novel/core';

export interface ProviderOption {
  id: LlmProviderId;
  label: string;
}

export interface ProviderStatus {
  provider: LlmProviderId;
  options: ProviderOption[];
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  { id: 'opencode', label: 'OpenCode' },
  { id: 'openrouter', label: 'OpenRouter' },
];

let activeProvider: LlmProviderId = readProviderFromEnv();

export function getActiveProvider(): LlmProviderId {
  return activeProvider;
}

export function setActiveProvider(provider: LlmProviderId): ProviderStatus {
  activeProvider = provider;
  return getProviderStatus();
}

export function getProviderStatus(): ProviderStatus {
  return {
    provider: activeProvider,
    options: PROVIDER_OPTIONS,
  };
}

export function buildLiveProvider(): LLMProvider {
  if (activeProvider === 'openrouter') {
    return new OpenRouterProvider({
      apiKey: requireEnv('OPENROUTER_API_KEY'),
      baseUrl: process.env.OPENROUTER_BASE_URL,
      httpReferer: process.env.OPENROUTER_HTTP_REFERER,
      xTitle: process.env.OPENROUTER_X_TITLE,
    });
  }

  return new OpenCodeProvider({
    apiKey: requireEnv('OPENCODE_API_KEY'),
    baseUrl: process.env.OPENCODE_BASE_URL,
  });
}

export function resetActiveProviderForTests(): void {
  activeProvider = readProviderFromEnv();
}

function readProviderFromEnv(): LlmProviderId {
  return parseLlmProvider(process.env.NOVEL_LLM_PROVIDER);
}

function requireEnv(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is required`);
  return v;
}
