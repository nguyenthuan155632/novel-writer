---
type: config
source: packages/core/src/config/effective.ts
---

# Config: Effective Config

**Type:** Configuration Module  
**Source:** `packages/core/src/config/effective.ts`

## Responsibility
Aggregates all five config slices (`context`, `generation`, `budget`, `model`, `longForm`) into a single `EffectiveConfig` object, then deep-merges per-story overrides loaded from the database. This is the **single mandatory entry point** for all worker jobs — importing raw config constants directly silently ignores per-story overrides.

## Key Exports

### `EffectiveConfig` (interface)

```typescript
interface EffectiveConfig {
  context:    ContextConfig;
  generation: GenerationConfig;
  budget:     BudgetGuardrails;
  model:      ModelConfig;
  longForm:   LongFormConfig;
}
```

### `ConfigOverrides` (interface)

Each slice is `DeepPartial<T>` of the corresponding config type — only supply the fields you want to override. Arrays are replaced wholesale (not element-merged).

### `getEffectiveConfig(storyId, provider)` — async

```
getEffectiveConfig(storyId: string, provider: StoryOverridesProvider): Promise<EffectiveConfig>
```

1. Calls `provider.load(storyId)` → reads `story_settings.overrides` JSON from the DB
2. Passes result to `mergeOverrides()`
3. Returns fully merged `EffectiveConfig`

### `mergeOverrides(overrides)` — sync

```
mergeOverrides(overrides: ConfigOverrides): EffectiveConfig
```

Deep-merges each config slice's defaults with the supplied overrides. Primitives are replaced; nested objects are recursively merged; arrays are replaced wholesale.

### `StoryOverridesProvider` (interface)

```typescript
interface StoryOverridesProvider {
  load(storyId: string): Promise<ConfigOverrides>;
}
```

Abstracts the database read for testability. The production implementation reads `story_settings.overrides` via Drizzle.

### `deepMerge<T>(base, patch)` — internal helper

Recursive merge utility. Key behaviours:
- `undefined` patch values are skipped (base defaults are preserved)
- Arrays are replaced wholesale (no element-level merge)
- Primitive widening via `Widen<T>` allows overriding `as const` literals (e.g. `0.85 as const`) with plain `number` values in override payloads

## Depends on
- [[configs/config-context]]
- [[configs/config-generation]]
- [[configs/config-budget]]
- [[configs/config-models]]
- [[configs/config-long-form]]
- [[packages/package-core]]

## Used by
- [[jobs/job-generate-chapter]] — calls `getEffectiveConfig()` at job start to obtain per-story config
- [[jobs/job-generate-batch]] — calls `getEffectiveConfig()` to determine batch size and budget
- [[jobs/job-high-stakes-review]] — reads effective model and budget config
- [[jobs/job-refresh-arc-summary]] — reads effective context config for refresh cadence
- [[jobs/job-refresh-saga-summary]] — reads effective context config for refresh cadence
- [[workers/worker-main]] — bootstraps config resolution per story at job dispatch time

## Related flows
- Per-story overrides are stored in `story_settings.overrides` (JSON column managed by [[packages/package-db]])
- [[routes/admin]] — `PUT /api/admin/provider` and `PUT /api/admin/models` update in-memory routes; `getEffectiveConfig` merges these with DB-stored per-story overrides

## Notes
- **Always use `getEffectiveConfig(storyId, provider)` in worker jobs.** Direct imports of `GENERATION_CONFIG`, `BUDGET_GUARDRAILS`, etc. bypass per-story overrides silently.
- `StoryOverridesProvider` is an interface (not a concrete class) so tests can inject a mock `load()` returning `{}` without touching Postgres.
- The `DeepPartial` + `Widen<T>` type machinery is required because all config objects use `as const`, which produces narrow literal types. Without `Widen`, TypeScript would reject `{ WRITER_TEMPERATURE: 0.9 }` as an override because `0.85` and `0.9` are incompatible literals.
- `mergeOverrides({})` (empty overrides) is equivalent to calling `mergeOverrides` with no arguments — it simply returns all defaults.
