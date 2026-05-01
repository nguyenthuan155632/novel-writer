import { getDb } from '@novel/db';
import { llmProviderSettings, llmProviderState } from '@novel/db/schema';
import {
  MODEL_HINTS,
  MODEL_OPTIONS,
  parseLlmProvider,
  type AgentRole,
  type LlmProviderId,
  type ModelRoutes,
  type ModelStatus,
} from '@novel/core';
import { eq } from 'drizzle-orm';

function defaultModelRoutes(): ModelRoutes {
  const id = 'google/gemini-2.5-flash';
  return Object.fromEntries(MODEL_OPTIONS.map((o) => [o.role, id])) as ModelRoutes;
}

function mergeWithDefaults(stored: Record<string, string>): ModelRoutes {
  return { ...defaultModelRoutes(), ...stored } as ModelRoutes;
}

export async function getActiveProviderFromDb(databaseUrl?: string): Promise<LlmProviderId> {
  const db = getDb(databaseUrl);
  const [row] = await db
    .select({ activeProvider: llmProviderState.activeProvider })
    .from(llmProviderState)
    .where(eq(llmProviderState.id, 'global'))
    .limit(1);
  if (!row) throw new Error('llm_provider_state missing global row');
  return parseLlmProvider(row.activeProvider);
}

export async function setActiveProviderInDb(provider: LlmProviderId, databaseUrl?: string): Promise<void> {
  const db = getDb(databaseUrl);
  const updated = await db
    .update(llmProviderState)
    .set({ activeProvider: provider, updatedAt: new Date() })
    .where(eq(llmProviderState.id, 'global'))
    .returning({ id: llmProviderState.id });
  if (updated.length === 0) throw new Error('llm_provider_state missing global row');
}

export async function getModelStatusForActiveProviderFromDb(databaseUrl?: string): Promise<ModelStatus> {
  const db = getDb(databaseUrl);
  const active = await getActiveProviderFromDb(databaseUrl);
  const [row] = await db
    .select()
    .from(llmProviderSettings)
    .where(eq(llmProviderSettings.provider, active))
    .limit(1);
  if (!row) throw new Error(`llm_provider_settings missing row for ${active}`);
  const routes = mergeWithDefaults(row.modelRoutes as Record<string, string>);
  return {
    routes,
    options: MODEL_OPTIONS,
    hints: MODEL_HINTS,
  };
}

export async function getQueueLlmSnapshotFromDb(databaseUrl?: string): Promise<{
  llmProvider: LlmProviderId;
  modelRoutes: ModelRoutes;
}> {
  const db = getDb(databaseUrl);
  return db.transaction(async (tx) => {
    const [state] = await tx
      .select({ activeProvider: llmProviderState.activeProvider })
      .from(llmProviderState)
      .where(eq(llmProviderState.id, 'global'))
      .limit(1);
    if (!state) throw new Error('llm_provider_state missing global row');

    const llmProvider = parseLlmProvider(state.activeProvider);
    const [settings] = await tx
      .select({ modelRoutes: llmProviderSettings.modelRoutes })
      .from(llmProviderSettings)
      .where(eq(llmProviderSettings.provider, llmProvider))
      .limit(1);
    if (!settings) throw new Error(`llm_provider_settings missing row for ${llmProvider}`);

    return {
      llmProvider,
      modelRoutes: mergeWithDefaults(settings.modelRoutes as Record<string, string>),
    };
  });
}

export async function setModelRoutesForActiveProviderInDb(
  routes: Partial<Record<AgentRole, string>>,
  databaseUrl?: string,
): Promise<ModelStatus> {
  const db = getDb(databaseUrl);
  await db.transaction(async (tx) => {
    const [state] = await tx
      .select({ activeProvider: llmProviderState.activeProvider })
      .from(llmProviderState)
      .where(eq(llmProviderState.id, 'global'))
      .limit(1);
    if (!state) throw new Error('llm_provider_state missing global row');

    const provider = parseLlmProvider(state.activeProvider);
    const [settings] = await tx
      .select()
      .from(llmProviderSettings)
      .where(eq(llmProviderSettings.provider, provider))
      .limit(1);
    if (!settings) throw new Error(`llm_provider_settings missing row for ${provider}`);

    const current = mergeWithDefaults(settings.modelRoutes as Record<string, string>);
    const merged: ModelRoutes = { ...current };
    for (const [role, model] of Object.entries(routes) as Array<[AgentRole, string]>) {
      merged[role] = model;
    }

    await tx
      .update(llmProviderSettings)
      .set({
        modelRoutes: merged as Record<string, string>,
        updatedAt: new Date(),
      })
      .where(eq(llmProviderSettings.provider, provider));
  });

  return getModelStatusForActiveProviderFromDb(databaseUrl);
}

/** Restores seed-equivalent provider state and per-provider model routes (for tests). */
export async function resetLlmSettingsForTests(databaseUrl?: string): Promise<void> {
  const db = getDb(databaseUrl);
  const defaults = defaultModelRoutes();
  const payload = defaults as unknown as Record<string, string>;

  await db
    .update(llmProviderState)
    .set({ activeProvider: 'opencode', updatedAt: new Date() })
    .where(eq(llmProviderState.id, 'global'));

  for (const provider of ['opencode', 'openrouter', 'ollama', 'vmlx'] as const) {
    await db
      .update(llmProviderSettings)
      .set({
        modelRoutes: { ...payload },
        updatedAt: new Date(),
      })
      .where(eq(llmProviderSettings.provider, provider));
  }
}
