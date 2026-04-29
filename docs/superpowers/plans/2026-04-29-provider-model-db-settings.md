# Provider/Model DB Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PostgreSQL the only runtime source of truth for active provider and model routes, with per-provider model settings and one globally active provider.

**Architecture:** Add two DB tables (`llm_provider_settings`, `llm_provider_state`) with strict constraints, then move API provider/model read/write paths from in-memory/env-backed state to DB-backed service functions. Queue enqueue points snapshot the active provider and its model routes from DB into payloads so running jobs stay consistent even if admin switches provider later.

**Tech Stack:** TypeScript, Fastify, Drizzle ORM/Postgres, BullMQ, Vitest, pnpm workspaces

---

## File Structure

- Create: `packages/db/src/schema/llm-settings.ts`  
  Owns schema definitions for provider settings + global active provider state.
- Modify: `packages/db/src/schema/index.ts`  
  Export new schema tables.
- Create: `packages/db/migrations/0004_llm_settings.sql`  
  Creates tables, constraints, and seed rows.
- Modify: `packages/core/src/config/models.ts`  
  Remove env-dependent runtime defaults for model routes; keep static defaults and helper validators.
- Modify: `apps/api/src/lib/provider-switcher.ts`  
  Replace process-memory state with DB-backed provider builder functions.
- Create: `apps/api/src/lib/llm-settings.ts`  
  Encapsulate DB-backed read/write operations for active provider + model routes.
- Modify: `apps/api/src/routes/admin.ts`  
  Use async DB-backed settings APIs.
- Modify: `apps/api/src/routes/chapters.ts`  
  Snapshot provider/routes from DB at enqueue time.
- Modify: `apps/api/src/routes/batches.ts`  
  Snapshot provider/routes from DB at enqueue time.
- Modify: `apps/api/test/routes/admin.test.ts`  
  Add per-provider persistence and restart-stable behavior tests.
- Modify: `apps/api/test/lib/provider-switcher.test.ts`  
  Convert tests to DB-backed logic and remove env reset assumptions.
- Modify: `README.md`  
  Update docs to state provider/models are DB-backed and persistent.
- Modify: `.env.example`
- Modify: `.env.local.example`  
  Remove/deprecate runtime provider/model selection envs.

## Task 1: Add DB schema and migration for LLM settings

**Files:**
- Create: `packages/db/src/schema/llm-settings.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `packages/db/migrations/0004_llm_settings.sql`
- Test: `packages/db/test/schema.test.ts`

- [ ] **Step 1: Write failing schema test for singleton + provider rows**

```ts
it('enforces one global provider state and provider enum constraints', async () => {
  const db = getDb();
  await expect(
    db.execute(sql`insert into llm_provider_state (id, active_provider) values ('not-global', 'opencode')`)
  ).rejects.toThrow();

  await expect(
    db.execute(sql`insert into llm_provider_settings (provider, model_routes) values ('bad-provider', '{}'::jsonb)`)
  ).rejects.toThrow();
});
```

- [ ] **Step 2: Run DB tests to confirm failure**

Run: `pnpm --filter @novel/db test`  
Expected: FAIL with relation/constraint missing for `llm_provider_state` and `llm_provider_settings`.

- [ ] **Step 3: Add new schema file**

```ts
// packages/db/src/schema/llm-settings.ts
import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const llmProviderSettings = pgTable('llm_provider_settings', {
  provider: text('provider').primaryKey(),
  modelRoutes: jsonb('model_routes').$type<Record<string, string>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const llmProviderState = pgTable('llm_provider_state', {
  id: text('id').primaryKey(),
  activeProvider: text('active_provider').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 4: Add migration with constraints and seed**

```sql
create table llm_provider_settings (
  provider text primary key,
  model_routes jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint llm_provider_settings_provider_check
    check (provider in ('opencode','openrouter','ollama')),
  constraint llm_provider_settings_model_routes_object_check
    check (jsonb_typeof(model_routes) = 'object')
);

create table llm_provider_state (
  id text primary key,
  active_provider text not null references llm_provider_settings(provider),
  updated_at timestamptz not null default now(),
  constraint llm_provider_state_singleton_check check (id = 'global')
);

insert into llm_provider_settings (provider, model_routes) values
  ('opencode', '{"writer":"google/gemini-2.5-flash"}'::jsonb),
  ('openrouter', '{"writer":"google/gemini-2.5-flash"}'::jsonb),
  ('ollama', '{"writer":"google/gemini-2.5-flash"}'::jsonb);

insert into llm_provider_state (id, active_provider) values ('global', 'opencode');
```

- [ ] **Step 5: Export schema from index**

```ts
// packages/db/src/schema/index.ts
export * from './llm-settings.ts';
```

- [ ] **Step 6: Run DB tests to verify pass**

Run: `pnpm --filter @novel/db test`  
Expected: PASS including new schema constraints test.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema/llm-settings.ts packages/db/src/schema/index.ts packages/db/migrations/0004_llm_settings.sql packages/db/test/schema.test.ts
git commit -m "feat(db): add persistent llm settings tables and constraints"
```

## Task 2: Make core model defaults static (no env runtime source)

**Files:**
- Modify: `packages/core/src/config/models.ts`
- Modify: `packages/core/test/models.test.ts`

- [ ] **Step 1: Write failing core test that model defaults do not depend on env**

```ts
it('uses static defaults regardless of process env', () => {
  process.env.WRITER_MODEL = 'custom/model';
  resetModelRoutesForTests();
  expect(modelFor('writer')).toBe('google/gemini-2.5-flash');
});
```

- [ ] **Step 2: Run core tests to confirm failure**

Run: `pnpm --filter @novel/core test`  
Expected: FAIL because defaults currently read env.

- [ ] **Step 3: Replace env-backed defaults with static constant**

```ts
const DEFAULT_MODEL_ROUTES = {
  bible_generator: 'google/gemini-2.5-flash',
  saga_planner: 'google/gemini-2.5-flash',
  arc_planner: 'google/gemini-2.5-flash',
  packet_generator: 'google/gemini-2.5-flash',
  writer: 'google/gemini-2.5-flash',
  auto_fixer: 'google/gemini-2.5-flash',
  llm_validator: 'google/gemini-2.5-flash',
  canon_extractor: 'google/gemini-2.5-flash',
  summary_compactor: 'google/gemini-2.5-flash',
  high_stakes_reviewer: 'google/gemini-2.5-flash',
} as const;
```

- [ ] **Step 4: Run core tests to verify pass**

Run: `pnpm --filter @novel/core test`  
Expected: PASS including new env-independence test.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/config/models.ts packages/core/test/models.test.ts
git commit -m "refactor(core): remove env-driven model route defaults"
```

## Task 3: Introduce DB-backed LLM settings service in API

**Files:**
- Create: `apps/api/src/lib/llm-settings.ts`
- Modify: `apps/api/src/lib/provider-switcher.ts`
- Test: `apps/api/test/lib/provider-switcher.test.ts`

- [ ] **Step 1: Write failing API lib test for per-provider persisted routes**

```ts
it('keeps separate model routes for each provider', async () => {
  await setActiveProvider('openrouter');
  await setModelRoutesForActiveProvider({ writer: 'openrouter/model-a' });
  await setActiveProvider('ollama');
  await setModelRoutesForActiveProvider({ writer: 'ollama/model-b' });
  await setActiveProvider('openrouter');
  const status = await getModelStatusForActiveProvider();
  expect(status.routes.writer).toBe('openrouter/model-a');
});
```

- [ ] **Step 2: Run API tests to verify failure**

Run: `pnpm --filter @novel/api test -- provider-switcher`  
Expected: FAIL because functions are synchronous in-memory today.

- [ ] **Step 3: Add DB-backed service functions**

```ts
// apps/api/src/lib/llm-settings.ts
export async function getActiveProviderFromDb(): Promise<LlmProviderId> { /* select llm_provider_state */ }
export async function setActiveProviderInDb(provider: LlmProviderId): Promise<ProviderStatus> { /* update state */ }
export async function getModelStatusForActiveProviderFromDb(): Promise<ModelStatus> { /* join state + settings */ }
export async function setModelRoutesForActiveProviderInDb(
  routes: Partial<Record<AgentRole, string>>
): Promise<ModelStatus> { /* tx: read active provider, merge routes, update */ }
```

- [ ] **Step 4: Update provider builder to read active provider from DB**

```ts
// apps/api/src/lib/provider-switcher.ts
export async function buildLiveProvider(): Promise<LLMProvider> {
  const provider = await getActiveProviderFromDb();
  if (provider === 'openrouter') return new OpenRouterProvider({ /* ... */ });
  if (provider === 'ollama') return new OllamaProvider({ /* ... */ });
  return new OpenCodeProvider({ /* ... */ });
}
```

- [ ] **Step 5: Run focused API tests**

Run: `pnpm --filter @novel/api test -- provider-switcher`  
Expected: PASS with async DB-backed behavior.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/llm-settings.ts apps/api/src/lib/provider-switcher.ts apps/api/test/lib/provider-switcher.test.ts
git commit -m "feat(api): back llm provider and models with postgres state"
```

## Task 4: Switch admin endpoints to DB-backed async settings

**Files:**
- Modify: `apps/api/src/routes/admin.ts`
- Test: `apps/api/test/routes/admin.test.ts`

- [ ] **Step 1: Add failing admin route test for provider-specific model persistence**

```ts
it('returns model routes for the currently active provider', async () => {
  await request(app.server).put('/api/admin/provider').send({ provider: 'openrouter' });
  await request(app.server).put('/api/admin/models').send({ routes: { writer: 'openrouter/writer' } });

  await request(app.server).put('/api/admin/provider').send({ provider: 'ollama' });
  await request(app.server).put('/api/admin/models').send({ routes: { writer: 'ollama/writer' } });

  await request(app.server).put('/api/admin/provider').send({ provider: 'openrouter' });
  const res = await request(app.server).get('/api/admin/models');
  expect(res.body.routes.writer).toBe('openrouter/writer');
});
```

- [ ] **Step 2: Run admin tests to verify failure**

Run: `pnpm --filter @novel/api test -- admin.test.ts`  
Expected: FAIL with current global in-memory route map.

- [ ] **Step 3: Update admin route handlers to async DB service**

```ts
app.get('/api/admin/provider', async () => getProviderStatusFromDb());
app.put('/api/admin/provider', async (req) => {
  const body = ProviderBodySchema.parse(req.body);
  return setActiveProviderInDb(body.provider);
});
app.get('/api/admin/models', async () => getModelStatusForActiveProviderFromDb());
app.put('/api/admin/models', async (req) => {
  const body = ModelRoutesSchema.parse(req.body);
  return setModelRoutesForActiveProviderInDb(body.routes);
});
```

- [ ] **Step 4: Re-run admin tests**

Run: `pnpm --filter @novel/api test -- admin.test.ts`  
Expected: PASS, including provider-separated model routes.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin.ts apps/api/test/routes/admin.test.ts
git commit -m "feat(api): persist admin provider and model updates in db"
```

## Task 5: Snapshot DB settings into chapter/batch queue payloads

**Files:**
- Modify: `apps/api/src/routes/chapters.ts`
- Modify: `apps/api/src/routes/batches.ts`
- Test: `apps/api/test/routes/chapters.test.ts`

- [ ] **Step 1: Write failing enqueue test that provider/routes come from DB-backed active provider**

```ts
it('enqueues with llmProvider and modelRoutes from current active provider settings', async () => {
  await request(app.server).put('/api/admin/provider').send({ provider: 'openrouter' });
  await request(app.server).put('/api/admin/models').send({ routes: { writer: 'openrouter/writer-v2' } });
  await request(app.server).post(`/api/stories/${storyId}/chapters/generate`).send({ chapterNumber: 3, mode: 'safe' });
  expect(enqueueGenerateChapterMock).toHaveBeenCalledWith(expect.objectContaining({
    llmProvider: 'openrouter',
    modelRoutes: expect.objectContaining({ writer: 'openrouter/writer-v2' }),
  }));
});
```

- [ ] **Step 2: Run chapter route test to verify failure**

Run: `pnpm --filter @novel/api test -- chapters.test.ts`  
Expected: FAIL if route still reads old memory state.

- [ ] **Step 3: Use async DB settings in enqueue call sites**

```ts
const activeProvider = await getActiveProviderFromDb();
const modelStatus = await getModelStatusForActiveProviderFromDb();
await enqueueGenerateChapter({
  storyId,
  chapterNumber: body.chapterNumber,
  mode: body.mode,
  llmProvider: activeProvider,
  modelRoutes: modelStatus.routes,
});
```

- [ ] **Step 4: Re-run chapters/batches tests**

Run: `pnpm --filter @novel/api test -- chapters.test.ts batches.test.ts`  
Expected: PASS with correct queue payload snapshots.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/chapters.ts apps/api/src/routes/batches.ts apps/api/test/routes/chapters.test.ts
git commit -m "fix(api): snapshot db-backed provider and routes into queue jobs"
```

## Task 6: Update docs/env templates and run full verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `.env.local.example`

- [ ] **Step 1: Write failing doc assertion test (optional lightweight script) or checklist gate**

```ts
// Optional: a docs consistency assertion script run in CI later
expect(readmeText).toContain('persisted in PostgreSQL');
expect(readmeText).not.toContain('process-local');
```

- [ ] **Step 2: Update docs and env examples**

```md
### Provider + model settings

Provider selection and model routes are persisted in PostgreSQL.
Header changes the globally active provider; Admin model inputs edit routes for the active provider.
These settings survive API restarts.
```

- [ ] **Step 3: Run verification test suites**

Run:

```bash
pnpm --filter @novel/db test
pnpm --filter @novel/core test
pnpm --filter @novel/api test
pnpm --filter @novel/worker test
pnpm test
```

Expected: PASS for all suites; no regressions in chapter/batch/worker flow.

- [ ] **Step 4: Commit**

```bash
git add README.md .env.example .env.local.example
git commit -m "docs: document db-backed provider and model settings"
```

## Final Integration Task: Smoke-check behavior end-to-end

**Files:**
- No code changes required unless smoke-check reveals a bug.

- [ ] **Step 1: Apply migrations locally**

Run: `pnpm --filter @novel/db migrate`

- [ ] **Step 2: Manual smoke script**

Run:

```bash
# 1) Set provider to openrouter
curl -s -X PUT localhost:3001/api/admin/provider -H 'content-type: application/json' -d '{"provider":"openrouter"}'
# 2) Set writer model for openrouter
curl -s -X PUT localhost:3001/api/admin/models -H 'content-type: application/json' -d '{"routes":{"writer":"openrouter/writer-v3"}}'
# 3) Switch to ollama and set different model
curl -s -X PUT localhost:3001/api/admin/provider -H 'content-type: application/json' -d '{"provider":"ollama"}'
curl -s -X PUT localhost:3001/api/admin/models -H 'content-type: application/json' -d '{"routes":{"writer":"ollama/writer-local"}}'
# 4) Restart API, switch back and verify preserved openrouter route
```

Expected: provider-specific writer models remain distinct and survive restart.

- [ ] **Step 3: Commit any smoke-test fixups**

```bash
git add <fixed-files>
git commit -m "fix(api): address smoke-test findings for llm settings persistence"
```

## Spec Coverage Check

- Per-provider model settings: covered in Tasks 1, 3, 4, and smoke-check.
- Exactly one active provider: covered by singleton state schema + admin provider route updates (Tasks 1, 4).
- No runtime env source for provider/models: covered in Task 2 and docs update in Task 6.
- Queue snapshot consistency: covered in Task 5.
- Restart persistence: covered in Tasks 4 and Final Integration smoke-check.

## Placeholder Scan

- No `TODO`/`TBD` markers.
- Every task includes explicit files, commands, expected outcomes, and concrete code snippets.

## Type/Contract Consistency

- Uses `LlmProviderId` contract (`opencode | openrouter | ollama`) consistently.
- Keeps existing admin response shape for models: `{ routes, options, hints }`.
- Queue payload fields remain `llmProvider` and `modelRoutes` to avoid worker contract breakage.
