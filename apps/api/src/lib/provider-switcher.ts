import { OpenCodeProvider } from '@novel/ai/providers/opencode';
import { OllamaProvider } from '@novel/ai/providers/ollama';
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import { VmlxProvider } from '@novel/ai/providers/vmlx';
import type { LLMProvider } from '@novel/ai/providers/types';
import type { LlmProviderId } from '@novel/core';
import {
  getActiveProviderFromDb,
  resetLlmSettingsForTests,
  setActiveProviderInDb,
} from './llm-settings.ts';

export {
  getQueueLlmSnapshotFromDb as getQueueLlmSnapshot,
  getModelStatusForActiveProviderFromDb as getModelStatusForActiveProvider,
  setModelRoutesForActiveProviderInDb as setModelRoutesForActiveProvider,
} from './llm-settings.ts';

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
  { id: 'ollama', label: 'Ollama (local)' },
  { id: 'vmlx', label: 'vMLX (local)' },
];

export async function getActiveProvider(): Promise<LlmProviderId> {
  return getActiveProviderFromDb();
}

export async function setActiveProvider(provider: LlmProviderId): Promise<ProviderStatus> {
  await setActiveProviderInDb(provider);
  return getProviderStatus();
}

export async function getProviderStatus(): Promise<ProviderStatus> {
  const provider = await getActiveProviderFromDb();
  return {
    provider,
    options: PROVIDER_OPTIONS,
  };
}

export async function buildLiveProvider(): Promise<LLMProvider> {
  const activeProvider = await getActiveProviderFromDb();

  if (activeProvider === 'openrouter') {
    return new OpenRouterProvider({
      apiKey: requireEnv('OPENROUTER_API_KEY'),
      baseUrl: process.env.OPENROUTER_BASE_URL,
      httpReferer: process.env.OPENROUTER_HTTP_REFERER,
      xTitle: process.env.OPENROUTER_X_TITLE,
    });
  }

  if (activeProvider === 'ollama') {
    return new OllamaProvider({
      apiKey: process.env.OLLAMA_API_KEY,
      baseUrl: process.env.OLLAMA_BASE_URL,
    });
  }

  if (activeProvider === 'vmlx') {
    return new VmlxProvider({
      baseUrl: process.env.VMLX_BASE_URL,
    });
  }

  return new OpenCodeProvider({
    apiKey: requireEnv('OPENCODE_API_KEY'),
    baseUrl: process.env.OPENCODE_BASE_URL,
  });
}

export async function resetActiveProviderForTests(): Promise<void> {
  await resetLlmSettingsForTests();
}

function requireEnv(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is required`);
  return v;
}
