# Novel graph — configs

## config-budget

`configs/config-budget.md`

---
type: config
source: packages/core/src/config/budget.ts
---



Config: Budget Guardrails Responsibility
**Type:** Configuration Module
**Source:** `packages/core/src/config/budget.ts`
Defines the hard monetary caps and alert threshold used throughout the system to prevent runaway LLM spending. These constants are the single source of truth for per-chapter, daily, and monthly spend limits.



Config: Budget Guardrails Key Constants
| Constant | Value | Description |
|---|---|---|
| `PER_CHAPTER_HARD_CAP_USD` | `$0.05` | Maximum cost allowed per single chapter generation |
| `PER_STORY_DAILY_CAP_USD` | `$5.00` | Maximum aggregate daily spend per story |
| `PER_STORY_MONTHLY_CAP_USD` | `$50.00` | Maximum aggregate monthly spend per story |
| `ALERT_THRESHOLD_PERCENT` | `80` | Percentage of a cap at which an 'alert' state is raised (before breach) |



Config: Budget Guardrails Exported Types
- `BudgetGuardrails` — TypeScript type inferred via `typeof BUDGET_GUARDRAILS`



Config: Budget Guardrails Depends on
- [[packages/package-core]]



Config: Budget Guardrails Used by
- [[configs/policy-budget-guardrails]] — `checkAgainstCaps()` reads these caps directly; also re-exports `BUDGET_GUARDRAILS`
- [[configs/config-effective]] — included as the `budget` slice of `EffectiveConfig`
- [[modules/budget-guard]] — enforces caps before dispatching generation jobs
- [[modules/cost-tracker]] — accumulates story spend that is subsequently checked against these caps



Config: Budget Guardrails Related domain concepts
- [[configs/config-effective]] — per-story overrides in `story_settings.overrides.budget` can loosen or tighten these caps
- [[modules/admin-metrics]] — exposes budget state via the admin dashboard



Config: Budget Guardrails Notes
- The `PER_CHAPTER_HARD_CAP_USD: $0.05` is the primary design constraint driving model selection. The default model (`google/gemini-2.5-flash`) has $0 input/output pricing, making it the safe default.
- The per-chapter cap is enforced at the `LoggedLLMProvider` level per-call; the daily/monthly caps are enforced by [[configs/policy-budget-guardrails]] before dispatching jobs.
- Per-story `budget` overrides are deep-merged by `getEffectiveConfig()` — see [[configs/config-effective]].

---

## config-context

`configs/config-context.md`

---
type: config
source: packages/core/src/config/context.ts
---



Config: Context Responsibility
**Type:** Configuration Module
**Source:** `packages/core/src/config/context.ts`
Governs how the 3-tier context cache (HOT / WARM / COLD) is assembled for each chapter generation call. Sets token budgets per tier and in aggregate, retrieval counts for vector search, rolling-summary refresh cadences, style few-shot limits, and the shrink order used when the context exceeds its token budget. Also holds Vietnamese past-reference keywords for flashback detection.



Config: Context Key Constants Token Budgets
| Constant | Value | Usage |
|---|---|---|
| `TOKEN_BUDGET_NORMAL` | 6000 | Standard chapter context total |
| `TOKEN_BUDGET_IMPORTANT` | 10000 | High-stakes chapter context total |
| `TOKEN_BUDGET_HOT_TARGET` | 2500 | HOT tier (bible, style guide, contracts) |
| `TOKEN_BUDGET_WARM_TARGET` | 2000 | WARM tier (saga/arc summaries, characters, threads, seeds) |
| `TOKEN_BUDGET_COLD_TARGET` | 1500 | COLD tier (recent summaries, retrieved facts, packet) |



Config: Context Key Constants Retrieval Counts
| Constant | Value | Description |
|---|---|---|
| `RECENT_CHAPTER_SUMMARIES_COUNT` | 5 | Number of most-recent chapter summaries in COLD tier |
| `RETRIEVED_CANON_FACTS_TOP_K` | 8 | Top-K vector hits for canon fact retrieval |
| `RETRIEVED_PAST_CHAPTERS_TOP_K` | 3 | Top-K vector hits for past-chapter reference retrieval |
| `RETRIEVED_PAST_CHAPTERS_MIN_GAP` | 5 | Minimum chapter gap before a past chapter is eligible for retrieval |
| `RETRIEVAL_MIN_IMPORTANCE` | `['high', 'locked']` | Only facts with these importance levels are retrieved |



Config: Context Key Constants Style Few-Shot
| Constant | Value |
|---|---|
| `STYLE_FEWSHOT_COUNT` | 3 |
| `STYLE_FEWSHOT_MAX_TOKENS_EACH` | 250 |



Config: Context Key Constants Rolling Summary Refresh Cadence
| Constant | Value |
|---|---|
| `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` | 5 |
| `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` | 20 |
| `CHAPTER_SHORT_SUMMARY_TARGET_TOKENS` | 200 |
| `CHAPTER_DETAILED_SUMMARY_TARGET_TOKENS` | 500 |



Config: Context Key Constants Vietnamese Past-Reference Keywords
Used by `past-reference.ts` to detect flashback/callback prose patterns without an LLM call:
```
['lần trước', 'trước đây', 'năm xưa', 'thuở nhỏ', 'kiếp trước', 'callback']
```
- `PAST_REFERENCE_USE_LLM_CLASSIFIER`: `false` — keyword matching only; LLM classifier disabled by default to save cost.



Config: Context Key Constants Shrink Order
When the assembled context exceeds its token budget, slots are trimmed in this priority order (first trimmed first):
1. `retrievedPastChapters`
2. `retrievedFacts`
3. `recentSummaries`
4. `activeCharactersCompactMode`



Config: Context Exported Types
- `ContextConfig` — TypeScript type inferred via `typeof CONTEXT_CONFIG`



Config: Context Depends on
- [[packages/package-core]]



Config: Context Used by
- [[configs/config-effective]] — included as the `context` slice of `EffectiveConfig`
- [[modules/context-builder]] — primary consumer; assembles the full `ChapterContext` using these budgets, retrieval counts, and shrink order
- [[agents/summary-compactor]] — reads `CHAPTER_SHORT_SUMMARY_TARGET_TOKENS`, `CHAPTER_DETAILED_SUMMARY_TARGET_TOKENS`
- [[agents/arc-summary-compactor]] — reads `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`
- [[jobs/job-refresh-arc-summary]] — triggered every `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` chapters
- [[jobs/job-refresh-saga-summary]] — triggered every `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` chapters



Config: Context Related domain concepts
- [[configs/config-long-form]] — mirrors the rolling-summary cadence constants. `config-context` is authoritative for context assembly; `config-long-form` is authoritative for structural planning decisions.
- [[modules/embedding-service]] — powers the vector retrieval that populates the COLD tier canon facts and past-chapter slots



Config: Context Notes
- `PAST_REFERENCE_USE_LLM_CLASSIFIER: false` keeps per-chapter cost low; the six Vietnamese keywords cover the most common flashback / past-life patterns in xianxia prose.
- `RETRIEVAL_MIN_IMPORTANCE: ['high', 'locked']` deliberately excludes `medium` and `low` importance canon facts to reduce noise in the retrieved context.
- The `SHRINK_ORDER` is intentional: retrieved past chapters are the lowest-value COLD-tier slot; the active characters compact-mode representation is preserved longest because it is structurally critical to coherent prose.

---

## config-effective

`configs/config-effective.md`

---
type: config
source: packages/core/src/config/effective.ts
---



Config: Effective Config Responsibility
**Type:** Configuration Module
**Source:** `packages/core/src/config/effective.ts`
Aggregates all five config slices (`context`, `generation`, `budget`, `model`, `longForm`) into a single `EffectiveConfig` object, then deep-merges per-story overrides loaded from the database. This is the **single mandatory entry point** for all worker jobs — importing raw config constants directly silently ignores per-story overrides.



Config: Effective Config Key Exports `EffectiveConfig` (interface)
```typescript
interface EffectiveConfig {
  context:    ContextConfig;
  generation: GenerationConfig;
  budget:     BudgetGuardrails;
  model:      ModelConfig;
  longForm:   LongFormConfig;
}
```



Config: Effective Config Key Exports `ConfigOverrides` (interface)
Each slice is `DeepPartial` of the corresponding config type — only supply the fields you want to override. Arrays are replaced wholesale (not element-merged).



Config: Effective Config Key Exports `getEffectiveConfig(storyId, provider)` — async
```
getEffectiveConfig(storyId: string, provider: StoryOverridesProvider): Promise
```
1. Calls `provider.load(storyId)` → reads `story_settings.overrides` JSON from the DB
2. Passes result to `mergeOverrides()`
3. Returns fully merged `EffectiveConfig`



Config: Effective Config Key Exports `mergeOverrides(overrides)` — sync
```
mergeOverrides(overrides: ConfigOverrides): EffectiveConfig
```
Deep-merges each config slice's defaults with the supplied overrides. Primitives are replaced; nested objects are recursively merged; arrays are replaced wholesale.



Config: Effective Config Key Exports `StoryOverridesProvider` (interface)
```typescript
interface StoryOverridesProvider {
  load(storyId: string): Promise;
}
```
Abstracts the database read for testability. The production implementation reads `story_settings.overrides` via Drizzle.



Config: Effective Config Key Exports `deepMerge<T>(base, patch)` — internal helper
Recursive merge utility. Key behaviours:
- `undefined` patch values are skipped (base defaults are preserved)
- Arrays are replaced wholesale (no element-level merge)
- Primitive widening via `Widen` allows overriding `as const` literals (e.g. `0.85 as const`) with plain `number` values in override payloads



Config: Effective Config Depends on
- [[configs/config-context]]
- [[configs/config-generation]]
- [[configs/config-budget]]
- [[configs/config-models]]
- [[configs/config-long-form]]
- [[packages/package-core]]



Config: Effective Config Used by
- [[jobs/job-generate-chapter]] — calls `getEffectiveConfig()` at job start to obtain per-story config
- [[jobs/job-generate-batch]] — calls `getEffectiveConfig()` to determine batch size and budget
- [[jobs/job-high-stakes-review]] — reads effective model and budget config
- [[jobs/job-refresh-arc-summary]] — reads effective context config for refresh cadence
- [[jobs/job-refresh-saga-summary]] — reads effective context config for refresh cadence
- [[workers/worker-main]] — bootstraps config resolution per story at job dispatch time



Config: Effective Config Related flows
- Per-story overrides are stored in `story_settings.overrides` (JSON column managed by [[packages/package-db]])
- [[routes/admin]] — `PUT /api/admin/provider` and `PUT /api/admin/models` update in-memory routes; `getEffectiveConfig` merges these with DB-stored per-story overrides



Config: Effective Config Notes
- **Always use `getEffectiveConfig(storyId, provider)` in worker jobs.** Direct imports of `GENERATION_CONFIG`, `BUDGET_GUARDRAILS`, etc. bypass per-story overrides silently.
- `StoryOverridesProvider` is an interface (not a concrete class) so tests can inject a mock `load()` returning `{}` without touching Postgres.
- The `DeepPartial` + `Widen` type machinery is required because all config objects use `as const`, which produces narrow literal types. Without `Widen`, TypeScript would reject `{ WRITER_TEMPERATURE: 0.9 }` as an override because `0.85` and `0.9` are incompatible literals.
- `mergeOverrides({})` (empty overrides) is equivalent to calling `mergeOverrides` with no arguments — it simply returns all defaults.

---

## config-export

`configs/config-export.md`

---
type: config
source: packages/core/src/config/export-config.ts
---



Config: Export Responsibility
**Type:** Configuration Module
**Source:** `packages/core/src/config/export-config.ts`
Defines constants that govern chapter-export behaviour: the supported output formats, the chapter-count threshold for triggering a full sync, the EPUB language code, and the fallback author name for EPUB metadata.



Config: Export Key Constants
| Constant | Value | Description |
|---|---|---|
| `SYNC_CHAPTER_THRESHOLD` | `200` | Minimum chapter count before a full export sync is triggered |
| `SUPPORTED_FORMATS` | `['markdown', 'epub']` | Allowed export output formats (readonly tuple) |
| `EPUB_LANGUAGE` | `'vi'` | BCP-47 language code written into EPUB metadata (Vietnamese) |
| `EPUB_AUTHOR_FALLBACK` | `'AI Novel Factory'` | Author name used in EPUB metadata when no author is set on the story |



Config: Export Exported Types
- `ExportFormat` — `'markdown' | 'epub'` (derived from `SUPPORTED_FORMATS[number]`)



Config: Export Depends on
- [[packages/package-core]]



Config: Export Used by
- [[jobs/job-generate-export]] — reads all four constants: validates requested format against `SUPPORTED_FORMATS`, uses `EPUB_LANGUAGE` and `EPUB_AUTHOR_FALLBACK` when building EPUB metadata, checks `SYNC_CHAPTER_THRESHOLD` to decide whether a full sync is warranted



Config: Export Related domain concepts
- [[apps/app-api]] — export-related API endpoints validate the `format` query parameter against `SUPPORTED_FORMATS` before enqueuing the export job
- [[apps/app-web]] — the web dashboard surfaces export controls; available formats come from this config



Config: Export Notes
- `EPUB_LANGUAGE: 'vi'` is set specifically for the Vietnamese xianxia target audience and is embedded in the EPUB `` element.
- `SYNC_CHAPTER_THRESHOLD: 200` prevents expensive full-export operations on stories that are still early in their run.
- This config is **not** part of `EffectiveConfig` and has no per-story override path — export format settings are global.

---

## config-generation

`configs/config-generation.md`

---
type: config
source: packages/core/src/config/generation.ts
---



Config: Generation Responsibility
**Type:** Configuration Module
**Source:** `packages/core/src/config/generation.ts`
Controls all chapter-generation behaviour: word-count targets and hard-fail bounds, xianxia domain constraints, retry/fix attempt limits, validator severity routing, LLM sampling parameters, batch sizes per generation mode, high-stakes review triggers, and the full matrix of auto-escalation conditions.



Config: Generation Key Constants Word Count Targets & Hard Limits
| Constant | Value | Role |
|---|---|---|
| `CHAPTER_TARGET_WORDS_MIN` | 2000 | Soft lower bound for writer |
| `CHAPTER_TARGET_WORDS_MAX` | 3000 | Soft upper bound for writer |
| `CHAPTER_HARD_FAIL_WORDS_MIN` | 1500 | Below this → pipeline hard-fail |
| `CHAPTER_HARD_FAIL_WORDS_MAX` | 4000 | Above this → pipeline hard-fail |



Config: Generation Key Constants Xianxia Domain Constraints
| Constant | Value |
|---|---|
| `MAX_REALM_JUMP_PER_CHAPTER` | 1 |
| `MAX_REALM_JUMP_PER_ARC` | 1 |
| `MAX_NEW_BLOODLINES_PER_ARC` | 2 |



Config: Generation Key Constants Retry & Fix Attempt Limits
| Constant | Value |
|---|---|
| `PACKET_REGENERATE_MAX_ATTEMPTS` | 1 |
| `WRITER_RETRY_ON_API_ERROR` | 3 |
| `AUTO_FIX_MAX_ATTEMPTS` | 1 |



Config: Generation Key Constants Validator Severity Routing
| Constant | Value | Meaning |
|---|---|---|
| `AUTO_FIX_TRIGGER_SEVERITIES` | `['low', 'medium']` | These severities trigger `AutoFixerAgent` |
| `STOP_SEVERITIES` | `['high', 'critical']` | These severities halt the pipeline |
| `DETERMINISTIC_VALIDATOR_BLOCKING_ON_FAIL` | `true` | A deterministic check failure is a hard block |



Config: Generation Key Constants Temperature / Sampling Parameters
| Constant | Value |
|---|---|
| `LLM_VALIDATOR_TEMPERATURE` | 0.1 |
| `WRITER_TEMPERATURE` | 0.85 |
| `WRITER_TOP_P` | 0.95 |



Config: Generation Key Constants Batch Sizes per Generation Mode
| Constant | Value |
|---|---|
| `SAFE_MODE_BATCH_SIZE` | 1 |
| `SEMI_AUTO_BATCH_SIZE` | 5 |
| `FULL_AUTO_BATCH_SIZE` | 30 |



Config: Generation Key Constants High-Stakes Review Triggers
| Constant | Value |
|---|---|
| `HIGH_STAKES_REVIEW_AT_ARC_END` | `true` |
| `HIGH_STAKES_REVIEW_ON_CRITICAL` | `true` |



Config: Generation Key Constants Auto-Escalate to Safe Mode (sub-object)
| Sub-key | Value |
|---|---|
| `FIRST_CHAPTER_OF_STORY` | `true` |
| `FIRST_CHAPTER_OF_ARC` | `true` |
| `LAST_CHAPTER_OF_ARC` | `true` |
| `ON_VALIDATOR_HIGH` | `true` |
| `ON_VALIDATOR_CRITICAL` | `true` |
| `ON_BLOCKING_CONFLICT` | `true` |



Config: Generation Exported Types
- `GenerationConfig` — TypeScript type inferred via `typeof GENERATION_CONFIG`



Config: Generation Depends on
- [[packages/package-core]]



Config: Generation Used by
- [[configs/config-effective]] — included as the `generation` slice of `EffectiveConfig`
- [[jobs/job-generate-chapter]] — reads batch sizes, retry counts, severity routing
- [[agents/writer]] — reads `WRITER_TEMPERATURE`, `WRITER_TOP_P`, word targets
- [[agents/auto-fixer]] — reads `AUTO_FIX_TRIGGER_SEVERITIES`, `AUTO_FIX_MAX_ATTEMPTS`
- [[agents/llm-validator]] — reads `LLM_VALIDATOR_TEMPERATURE`, `STOP_SEVERITIES`
- [[agents/packet-generator]] — reads `PACKET_REGENERATE_MAX_ATTEMPTS`
- [[configs/policy-mode-escalation]] — escalation flags in `AUTO_ESCALATE_TO_SAFE_MODE`



Config: Generation Related domain concepts
- [[configs/policy-mode-escalation]] — implements the safe-mode escalation logic driven by `AUTO_ESCALATE_TO_SAFE_MODE`
- [[configs/policy-high-stakes-triggers]] — determines when to queue the high-stakes reviewer based on severity
- [[configs/config-long-form]] — carries overlapping `HIGH_STAKES_REVIEW_AT_ARC_END` flag at the structural planning level



Config: Generation Notes
- `AUTO_FIX_MAX_ATTEMPTS: 1` is intentionally low — the system prefers hard-stopping on unresolvable issues over retry loops.
- The hard-fail word window (1500–4000) is intentionally wider than the target window (2000–3000) to give the writer latitude before triggering a pipeline failure.
- `DETERMINISTIC_VALIDATOR_BLOCKING_ON_FAIL: true` means the deterministic check (word counts, realm jumps, bloodlines) acts as a hard gate before the LLM validator runs.

---

## config-llm-provider

`configs/config-llm-provider.md`

---
type: config
source: packages/core/src/config/llm-provider.ts
---



Config: LLM Provider Responsibility
**Type:** Configuration Module
**Source:** `packages/core/src/config/llm-provider.ts`
Defines the `LlmProviderId` union type for the four user-selectable provider backends and provides `parseLlmProvider()` — a safe string parser that normalises raw env-var or DB string values into a valid `LlmProviderId`, defaulting to `'opencode'` for any unrecognised input.



Config: LLM Provider Key Exports `LlmProviderId` (type)
```typescript
type LlmProviderId = 'opencode' | 'openrouter' | 'ollama' | 'vmlx';
```



Config: LLM Provider Key Exports `parseLlmProvider(value)` — function
```
parseLlmProvider(value: string | undefined): LlmProviderId
```
**Logic (exhaustive match, first hit wins):**
| Input value | Returns |
|---|---|
| `'openrouter'` | `'openrouter'` |
| `'ollama'` | `'ollama'` |
| `'vmlx'` | `'vmlx'` |
| anything else / `undefined` | `'opencode'` (default) |



Config: LLM Provider Depends on
- [[packages/package-core]]



Config: LLM Provider Used by
- [[modules/provider-switcher]] — calls `parseLlmProvider()` when reading the active provider from DB or `LLM_PROVIDER` env var
- [[routes/admin]] — `PUT /api/admin/provider` validates the incoming provider string through `parseLlmProvider()` before persisting



Config: LLM Provider Related domain concepts
- The four `LlmProviderId` values map to concrete `LLMProvider` implementations: [[ai-providers/provider-opencode]], [[ai-providers/provider-openrouter]], [[ai-providers/provider-ollama]], [[ai-providers/provider-vmlx]]
- `mock` provider is test-only and not user-selectable
- [[configs/config-models]] — model route strings are provider-agnostic; `LlmProviderId` determines only which API endpoint receives the resolved model string



Config: LLM Provider Notes
- `'opencode'` is the default — reflects the primary development environment. Production deployments typically override via the `LLM_PROVIDER` env var or `PUT /api/admin/provider`.
- This module is intentionally minimal — it carries no config constants, only a type and a safe parse function.

---

## config-long-form

`configs/config-long-form.md`

---
type: config
source: packages/core/src/config/long-form.ts
---



Config: Long-Form Responsibility
**Type:** Configuration Module
**Source:** `packages/core/src/config/long-form.ts`
Controls the structural planning parameters for 500–1000-chapter xianxia novels: saga count ranges, arc count ranges, plot-seed planning ranges, rolling-summary refresh cadences, and the master switches for safe-mode auto-escalation and high-stakes arc-end reviews.



Config: Long-Form Key Constants Structural Planning Ranges
| Constant | Min | Max | Description |
|---|---|---|---|
| `SAGA_COUNT_RANGE` | 5 | 8 | Number of sagas in a complete novel |
| `SEEDS_PER_SAGA_PLAN_RANGE` | 10 | 30 | Plot seeds planted per saga during planning |
| `ARC_COUNT_PER_SAGA_RANGE` | 2 | 5 | Arcs within each saga |



Config: Long-Form Key Constants Rolling Summary Refresh Cadence
| Constant | Value |
|---|---|
| `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` | 5 |
| `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` | 20 |



Config: Long-Form Key Constants Policy Flags
| Constant | Value | Effect |
|---|---|---|
| `AUTO_ESCALATE_TO_SAFE_MODE` | `true` | Master switch — enables arc-boundary and blocking-conflict escalation in `resolveEffectiveMode()` |
| `HIGH_STAKES_REVIEW_AT_ARC_END` | `true` | Enables arc-end trigger in `shouldRunReviewer()` |



Config: Long-Form Exported Types
- `LongFormConfig` — TypeScript type inferred via `typeof LONG_FORM_CONFIG`



Config: Long-Form Depends on
- [[packages/package-core]]



Config: Long-Form Used by
- [[configs/config-effective]] — included as the `longForm` slice of `EffectiveConfig`
- [[configs/policy-high-stakes-triggers]] — reads `HIGH_STAKES_REVIEW_AT_ARC_END`
- [[configs/policy-mode-escalation]] — reads `AUTO_ESCALATE_TO_SAFE_MODE` as the master switch
- [[agents/saga-planner]] — uses `SAGA_COUNT_RANGE`, `SEEDS_PER_SAGA_PLAN_RANGE`, `ARC_COUNT_PER_SAGA_RANGE`
- [[agents/arc-planner]] — uses `ARC_COUNT_PER_SAGA_RANGE`
- [[jobs/job-refresh-arc-summary]] — governed by `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`
- [[jobs/job-refresh-saga-summary]] — governed by `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`



Config: Long-Form Related domain concepts
- [[configs/config-context]] — mirrors the rolling-summary cadence constants; `config-long-form` is authoritative for structural planning, `config-context` is authoritative for token-budget assembly
- [[configs/config-generation]] — also carries `HIGH_STAKES_REVIEW_AT_ARC_END` and `HIGH_STAKES_REVIEW_ON_CRITICAL` flags at the per-chapter generation level



Config: Long-Form Notes
- `AUTO_ESCALATE_TO_SAFE_MODE: true` is the global master switch. When set to `false` (e.g. via a per-story override), `resolveEffectiveMode()` short-circuits immediately and returns the user-chosen mode without any DB queries.
- `SEEDS_PER_SAGA_PLAN_RANGE` (10–30) is intentionally broad to allow [[agents/saga-planner]] to seed rich narrative threads that future arcs can pick up.
- Per-story overrides can adjust `SAGA_COUNT_RANGE` etc. to produce shorter/longer novels via `story_settings.overrides.longForm`.

---

## config-models

`configs/config-models.md`

---
type: config
source: packages/core/src/config/models.ts
---



Config: Models Responsibility
**Type:** Configuration Module
**Source:** `packages/core/src/config/models.ts`
Central model routing registry and cost calculator. Maps all 11 agent roles to model identifiers, stores per-1M-token USD pricing for 25+ models across 10 providers, and exposes runtime helpers to resolve routes, estimate costs, and hot-swap models without restarting the worker. The default model for every role is `google/gemini-2.5-flash`.



Config: Models Key Exports `AgentRole` (type)
Union of the 11 role keys (derived from `MODEL_CONFIG.routes`):
`bible_generator` | `saga_planner` | `arc_planner` | `packet_generator` | `writer` | `auto_fixer` | `llm_validator` | `canon_extractor` | `summary_compactor` | `arc_summary_compactor` | `high_stakes_reviewer`



Config: Models Key Exports `MODEL_CONFIG`
- `.routes` — default routes; all 11 roles → `"google/gemini-2.5-flash"` (mutable at runtime via `setModelRoutes()`)
- `.pricing` — per-1M-token USD prices `{ input, cachedInput, output }` for 25+ model IDs
**Selected pricing entries:**
| Model | Input $/M | Cached $/M | Output $/M |
|---|---|---|---|
| `google/gemini-2.5-flash` | $0.00 | $0.00 | $0.00 |
| `google/gemini-2.5-flash-lite` | $0.10 | $0.025 | $0.40 |
| `google/gemini-2.5-pro` | $1.25 | $0.31 | $10.00 |
| `openai/gpt-4o` | $2.50 | $0.00 | $10.00 |
| `openai/gpt-4o-mini` | $0.15 | $0.075 | $0.60 |
| `deepseek/deepseek-v3.2` | $0.252 | $0.025 | $0.378 |
| `deepseek/deepseek-v4` | $0.435 | $0.004 | $0.87 |
| `kimi/kimi-k2` | $0.57 | $0.00 | $2.30 |
| `kimi/kimi-k2.5` | $0.44 | $0.22 | $2.00 |
| `x-ai/grok-3-mini` | $0.30 | $0.075 | $0.50 |
| `mistralai/mistral-large` | $2.00 | $0.20 | $6.00 |
| `gemma4:e2b` (Ollama) | $0.00 | $0.00 | $0.00 |
| `mlx-community/Qwen3-4B-4bit` (vMLX) | $0.00 | $0.00 | $0.00 |



Config: Models Key Exports Helper Functions
| Function | Signature | Description |
|---|---|---|
| `modelFor(role)` | `(role: AgentRole) => string` | Resolves the current model string for an agent role |
| `estimateCostUsd(model, usage)` | `(model, {inputTokens, outputTokens, cachedInputTokens}) => number` | Calculates cost in USD from token usage |
| `pricingFor(model)` | `(model: string) => {input, cachedInput, output} \| undefined` | Returns the pricing record for a model |
| `getModelStatus()` | `() => ModelStatus` | Snapshot of current routes + options + hints |
| `setModelRoutes(routes)` | `(Partial) => ModelStatus` | Hot-swaps one or more route entries at runtime |
| `resetModelRoutesForTests()` | `() => void` | Restores all routes to defaults (test teardown only) |



Config: Models Key Exports `MODEL_OPTIONS`
Array of 11 `ModelOption` objects — `{ role, label, envVar, description }` — used by the admin UI to render the model-selection form. Each role also has a corresponding `envVar` for environment-variable overrides.



Config: Models Key Exports `MODEL_HINTS`
Array of 25+ model identifier strings across OpenAI, Google, DeepSeek, Kimi, Meta Llama, Mistral, Cohere, Qwen, GLM, Grok, Ollama, vMLX — fed to the admin UI for autocomplete suggestions.



Config: Models Exported Types
- `AgentRole` — union of 11 role keys
- `ModelConfig` — `typeof MODEL_CONFIG`
- `ModelRoutes` — `Record`
- `ModelOption` — `{ role, label, envVar, description }`
- `ModelStatus` — `{ routes, options, hints }`



Config: Models Depends on
- [[packages/package-core]]



Config: Models Used by
- [[configs/config-effective]] — `MODEL_CONFIG` is the `model` slice of `EffectiveConfig`
- All agent notes — every agent calls `modelFor(role)` to resolve its model before each LLM call:
[[agents/writer]], [[agents/arc-planner]], [[agents/saga-planner]], [[agents/bible-generator]], [[agents/auto-fixer]], [[agents/llm-validator]], [[agents/canon-extractor]], [[agents/summary-compactor]], [[agents/arc-summary-compactor]], [[agents/high-stakes-reviewer]], [[agents/packet-generator]]
- [[modules/cost-tracker]] — calls `estimateCostUsd()` after every completion to accumulate `story_costs`
- [[routes/admin]] — `PUT /api/admin/models` calls `setModelRoutes()`; `GET /api/admin/models` calls `getModelStatus()`



Config: Models Related domain concepts
- [[configs/config-budget]] — the $0.05/chapter hard cap is why `google/gemini-2.5-flash` (free-tier) is the universal default
- [[configs/config-llm-provider]] — the resolved model string is passed alongside the provider ID to the active `LLMProvider` implementation



Config: Models Notes
- **Never hardcode model strings.** Always call `modelFor(role)`. Literal model strings anywhere outside this file are a project bug per convention.
- `setModelRoutes()` mutates `MODEL_CONFIG.routes` in-place, meaning the admin API can hot-swap any agent's model without a worker restart.
- `estimateCostUsd()` returns `0` for unknown/local models (e.g. Ollama, vMLX) rather than throwing — these are implicitly free.
- Cached-input tokens are priced separately from fresh input tokens in the cost formula, matching OpenRouter's billing model.

---

## policy-budget-guardrails

`configs/policy-budget-guardrails.md`

---
type: policy
source: packages/core/src/policy/budget-guardrails.ts
---



Policy: Budget Guardrails Responsibility
**Type:** Policy Module
**Source:** `packages/core/src/policy/budget-guardrails.ts`
Runtime enforcement of the project's ≤$0.05/chapter cost target at the daily and monthly level. Evaluates accumulated story spend against the hard caps in [[configs/config-budget]] and returns a tri-state result (`ok` / `alert` / `breach`). This is the decision gate that blocks further LLM dispatching when caps are exceeded.



Policy: Budget Guardrails Function Signature
```typescript
checkAgainstCaps(usage: {
  dailyUsd: number;
  monthlyUsd: number;
}): {
  state: 'ok' | 'alert' | 'breach';
  capHit?: 'daily' | 'monthly';
  pct: number;
}
```



Policy: Budget Guardrails Logic
Priority order — first match wins:
| Priority | Condition | Returns |
|---|---|---|
| 1 | `dailyUsd / PER_STORY_DAILY_CAP_USD >= 1.0` | `{ state: 'breach', capHit: 'daily', pct }` |
| 2 | `monthlyUsd / PER_STORY_MONTHLY_CAP_USD >= 1.0` | `{ state: 'breach', capHit: 'monthly', pct }` |
| 3 | `(dailyUsd / dailyCap) * 100 >= ALERT_THRESHOLD_PERCENT (80)` | `{ state: 'alert', capHit: 'daily', pct }` |
| 4 | `(monthlyUsd / monthlyCap) * 100 >= ALERT_THRESHOLD_PERCENT (80)` | `{ state: 'alert', capHit: 'monthly', pct }` |
| 5 | Otherwise | `{ state: 'ok', pct: Math.max(dailyPct, monthlyPct) }` |
- In the `ok` case `pct` is the higher of the two ratios — a single "how close are we?" number for monitoring.
- Daily cap is checked before monthly cap at each tier.



Policy: Budget Guardrails Depends on
- [[configs/config-budget]] — reads `PER_STORY_DAILY_CAP_USD`, `PER_STORY_MONTHLY_CAP_USD`, `ALERT_THRESHOLD_PERCENT`
- [[packages/package-core]]



Policy: Budget Guardrails Used by
- [[modules/budget-guard]] — calls `checkAgainstCaps()` before dispatching each generation job; throws if `state === 'breach'`
- [[modules/admin-metrics]] — surfaces budget state in the admin dashboard UI



Policy: Budget Guardrails Related flows
- [[jobs/job-generate-chapter]] — cost is accumulated in `story_costs` table; the worker reads rolling totals and passes them as `{dailyUsd, monthlyUsd}` before the chapter write begins
- [[configs/config-effective]] — per-story `budget` overrides (via `story_settings.overrides`) can raise the daily/monthly caps; this policy will respect whichever caps are in the effective config



Policy: Budget Guardrails Notes
- Also re-exports `BUDGET_GUARDRAILS` constants for convenience, so consumers don't need a separate import from `config/budget.ts`.
- `breach` → hard stop; the worker **must not** dispatch further LLM calls for the story until the next billing period.
- `alert` → soft warning; generation continues but the admin UI highlights the threshold proximity.
- The **per-chapter** cap (`PER_CHAPTER_HARD_CAP_USD: $0.05`) is **not** checked by this function. It is enforced separately at the `LoggedLLMProvider` level as a per-call cost check.

---

## policy-high-stakes-triggers

`configs/policy-high-stakes-triggers.md`

---
type: policy
source: packages/core/src/policy/high-stakes-triggers.ts
---



Policy: High-Stakes Triggers Responsibility
**Type:** Policy Module
**Source:** `packages/core/src/policy/high-stakes-triggers.ts`
Determines whether the [[agents/high-stakes-reviewer]] should be queued for a completed chapter. Evaluates two independent triggers: a critical validator severity finding and an arc-end boundary match.



Policy: High-Stakes Triggers Function Signature `TriggerContext`
```typescript
shouldRunReviewer(ctx: TriggerContext): {
  run: boolean;
  reason?: 'arc_end' | 'critical_severity';
}
```
```typescript
interface TriggerContext {
  chapterNumber:          number;
  arcEndChapter:          number | null;
  worstValidatorSeverity: 'low' | 'medium' | 'high' | 'critical' | 'none';
}
```



Policy: High-Stakes Triggers Logic
Priority order — first match wins:
| Priority | Condition | Returns |
|---|---|---|
| 1 | `worstValidatorSeverity === 'critical'` | `{ run: true, reason: 'critical_severity' }` |
| 2 | `LONG_FORM_CONFIG.HIGH_STAKES_REVIEW_AT_ARC_END === true` AND `arcEndChapter === chapterNumber` | `{ run: true, reason: 'arc_end' }` |
| 3 | Otherwise | `{ run: false }` |



Policy: High-Stakes Triggers Depends on
- [[configs/config-long-form]] — reads `HIGH_STAKES_REVIEW_AT_ARC_END` to gate the arc-end trigger
- [[packages/package-core]]



Policy: High-Stakes Triggers Used by
- [[jobs/job-generate-chapter]] — called after [[agents/llm-validator]] completes; if `run === true`, enqueues [[jobs/job-high-stakes-review]] as an async follow-up



Policy: High-Stakes Triggers Related flows
- [[jobs/job-high-stakes-review]] — the async job that runs when this policy returns `{ run: true }`
- [[agents/high-stakes-reviewer]] — the agent executed by that job
- [[configs/config-generation]] — also carries `HIGH_STAKES_REVIEW_AT_ARC_END` and `HIGH_STAKES_REVIEW_ON_CRITICAL` flags at the generation-config level (separate concept; this policy reads from `LONG_FORM_CONFIG` only)



Policy: High-Stakes Triggers Notes
- `arcEndChapter === null` makes the arc-end branch evaluate to `false` cleanly — chapters not part of any planned arc never trigger an arc-end review.
- The `critical_severity` trigger is **unconditional** — it fires regardless of the `HIGH_STAKES_REVIEW_AT_ARC_END` flag. Only the arc-end trigger is gated by the config flag.
- This function is a pure function (no DB calls, no async) — straightforward to unit-test in isolation.
- The `high_stakes_reviewer` agent typically uses a stronger / more expensive model (configured separately via `modelFor('high_stakes_reviewer')`).

---

## policy-mode-escalation

`configs/policy-mode-escalation.md`

---
type: policy
source: packages/core/src/policy/mode-escalation.ts
---



Policy: Mode Escalation Responsibility
**Type:** Policy Module
**Source:** `packages/core/src/policy/mode-escalation.ts`
Resolves the effective generation mode for a given chapter, potentially escalating from `semi_auto` or `full_auto` to `safe` based on arc boundaries, first-chapter status, and blocking canon conflicts. Implements the auto-escalation rules gated by the `AUTO_ESCALATE_TO_SAFE_MODE` master switch in [[configs/config-long-form]].



Policy: Mode Escalation Function Signature Types
```typescript
resolveEffectiveMode(
  ctx:  ModeContext,
  deps: ModeEscalationDeps
): Promise
```
```typescript
type Mode = 'safe' | 'semi_auto' | 'full_auto';

interface ModeContext {
  storyId:       string;
  chapterNumber: number;
  userMode:      Mode;
}

interface ArcBoundary {
  startChapter: number | null;
  endChapter:   number | null;
}

interface ModeEscalationDeps {
  getArcBoundaryForChapter(storyId: string, chapterNumber: number): Promise;
  hasBlockingPendingUpdates(storyId: string): Promise;
}
```
`ModeEscalationDeps` is an interface to abstract DB queries — inject stubs in tests.



Policy: Mode Escalation Logic Escalation Trigger Summary
```
if userMode === 'safe' OR AUTO_ESCALATE_TO_SAFE_MODE === false:
  → return { mode: userMode, reasons: [] }   // short-circuit; no DB queries

if chapterNumber === 1:
  → reasons.push('first_chapter')

arc = getArcBoundaryForChapter(storyId, chapterNumber)
if arc.startChapter === chapterNumber: → reasons.push('arc_start')
if arc.endChapter === chapterNumber:   → reasons.push('arc_end')

if hasBlockingPendingUpdates(storyId): → reasons.push('blocking_pending')

if reasons.length > 0: → return { mode: 'safe', reasons }
else:                  → return { mode: userMode, reasons: [] }
```
| Condition | `reasons` entry |
|---|---|
| Chapter 1 of the story | `'first_chapter'` |
| First chapter of an arc | `'arc_start'` |
| Last chapter of an arc | `'arc_end'` |
| Blocking `pending_canon_updates` exist for the story | `'blocking_pending'` |



Policy: Mode Escalation Depends on
- [[configs/config-long-form]] — reads `AUTO_ESCALATE_TO_SAFE_MODE` as the global master switch
- [[packages/package-core]]



Policy: Mode Escalation Used by
- [[jobs/job-generate-chapter]] — calls `resolveEffectiveMode()` before determining the approval flow and batch size
- [[jobs/job-generate-batch]] — uses the resolved mode to select the correct batch size from [[configs/config-generation]]



Policy: Mode Escalation Related flows
- [[modules/canon-merger]] — creates blocking `pending_canon_updates` entries for high-conflict canon facts; their presence triggers the `'blocking_pending'` escalation reason
- [[configs/config-generation]] — carries the `AUTO_ESCALATE_TO_SAFE_MODE` sub-object with per-condition boolean flags (overlapping concept; this policy reads the single boolean master switch from `LONG_FORM_CONFIG`)



Policy: Mode Escalation Notes
- **Short-circuit optimisation**: when `userMode === 'safe'` or the master switch is `false`, the function returns immediately without making any DB calls. This avoids unnecessary Postgres round-trips on the most conservative mode.
- Setting `AUTO_ESCALATE_TO_SAFE_MODE: false` in a per-story `longForm` override (via `story_settings.overrides`) completely disables all escalation for that story, giving the author full control.
- The `reasons` array is non-empty only when escalation occurs. Callers should log or surface it so authors understand why their chosen mode was overridden.
- `ModeEscalationDeps` as an injected interface allows unit tests to use synchronous stubs, avoiding real Postgres connections.

---
