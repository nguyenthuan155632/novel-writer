import { getDb, type Db } from '@novel/db';
import { llmProviderSettings, llmProviderState } from '@novel/db/schema';
import { parseLlmProvider, type LlmProviderId, type ModelRoutes } from '@novel/core';
import { eq } from 'drizzle-orm';
import { OpenCodeProvider } from '@novel/ai/providers/opencode';
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import { OllamaProvider } from '@novel/ai/providers/ollama';
import type { LLMProvider } from '@novel/ai/providers/types';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';

export interface WorkerLlmSnapshot {
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
}

function buildProvider(provider: LlmProviderId): LLMProvider {
  if (provider === 'openrouter') {
    return new OpenRouterProvider({
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      baseUrl: process.env.OPENROUTER_BASE_URL,
      httpReferer: process.env.OPENROUTER_HTTP_REFERER,
      xTitle: process.env.OPENROUTER_X_TITLE,
    });
  }

  if (provider === 'ollama') {
    return new OllamaProvider({
      apiKey: process.env.OLLAMA_API_KEY,
      baseUrl: process.env.OLLAMA_BASE_URL,
    });
  }

  return new OpenCodeProvider({
    apiKey: process.env.OPENCODE_API_KEY ?? '',
    baseUrl: process.env.OPENCODE_BASE_URL,
  });
}

export async function resolveWorkerLlmSnapshot(data?: WorkerLlmSnapshot, db: Db = getDb()): Promise<{
  llmProvider: LlmProviderId;
  modelRoutes: Partial<ModelRoutes>;
}> {
  if (data?.llmProvider) {
    return {
      llmProvider: data.llmProvider,
      modelRoutes: data.modelRoutes ?? {},
    };
  }

  try {
    const [state] = await db
      .select({ activeProvider: llmProviderState.activeProvider })
      .from(llmProviderState)
      .where(eq(llmProviderState.id, 'global'))
      .limit(1);
    if (!state) throw new Error('llm_provider_state missing global row');

    const llmProvider = parseLlmProvider(state.activeProvider);
    const [settings] = await db
      .select({ modelRoutes: llmProviderSettings.modelRoutes })
      .from(llmProviderSettings)
      .where(eq(llmProviderSettings.provider, llmProvider))
      .limit(1);

    return {
      llmProvider,
      modelRoutes: (settings?.modelRoutes as Partial<ModelRoutes> | undefined) ?? {},
    };
  } catch {
    return {
      llmProvider: parseLlmProvider(process.env.NOVEL_LLM_PROVIDER),
      modelRoutes: {},
    };
  }
}

export async function buildLoggedWorkerProvider(db: Db, data?: WorkerLlmSnapshot): Promise<{
  provider: LLMProvider;
  modelRoutes: Partial<ModelRoutes>;
}> {
  const snapshot = await resolveWorkerLlmSnapshot(data, db);
  return {
    provider: new LoggedLLMProvider({
      inner: buildProvider(snapshot.llmProvider),
      recordCall: makeDrizzleRecorder(db),
    }),
    modelRoutes: snapshot.modelRoutes,
  };
}
