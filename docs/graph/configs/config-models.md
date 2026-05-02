---
type: config
source: packages/core/src/config/models.ts
---

# Config: Models

**Type:** Configuration Module  
**Source:** `packages/core/src/config/models.ts`

## Responsibility
Central model routing registry and cost calculator. Maps all 11 agent roles to model identifiers, stores per-1M-token USD pricing for 25+ models across 10 providers, and exposes runtime helpers to resolve routes, estimate costs, and hot-swap models without restarting the worker. The default model for every role is `google/gemini-2.5-flash`.

## Key Exports

### `AgentRole` (type)

Union of the 11 role keys (derived from `MODEL_CONFIG.routes`):

`bible_generator` | `saga_planner` | `arc_planner` | `packet_generator` | `writer` | `auto_fixer` | `llm_validator` | `canon_extractor` | `summary_compactor` | `arc_summary_compactor` | `high_stakes_reviewer`

### `MODEL_CONFIG`

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

### Helper Functions

| Function | Signature | Description |
|---|---|---|
| `modelFor(role)` | `(role: AgentRole) => string` | Resolves the current model string for an agent role |
| `estimateCostUsd(model, usage)` | `(model, {inputTokens, outputTokens, cachedInputTokens}) => number` | Calculates cost in USD from token usage |
| `pricingFor(model)` | `(model: string) => {input, cachedInput, output} \| undefined` | Returns the pricing record for a model |
| `getModelStatus()` | `() => ModelStatus` | Snapshot of current routes + options + hints |
| `setModelRoutes(routes)` | `(Partial<ModelRoutes>) => ModelStatus` | Hot-swaps one or more route entries at runtime |
| `resetModelRoutesForTests()` | `() => void` | Restores all routes to defaults (test teardown only) |

### `MODEL_OPTIONS`

Array of 11 `ModelOption` objects — `{ role, label, envVar, description }` — used by the admin UI to render the model-selection form. Each role also has a corresponding `envVar` for environment-variable overrides.

### `MODEL_HINTS`

Array of 25+ model identifier strings across OpenAI, Google, DeepSeek, Kimi, Meta Llama, Mistral, Cohere, Qwen, GLM, Grok, Ollama, vMLX — fed to the admin UI for autocomplete suggestions.

## Exported Types
- `AgentRole` — union of 11 role keys
- `ModelConfig` — `typeof MODEL_CONFIG`
- `ModelRoutes` — `Record<AgentRole, string>`
- `ModelOption` — `{ role, label, envVar, description }`
- `ModelStatus` — `{ routes, options, hints }`

## Depends on
- [[packages/package-core]]

## Used by
- [[configs/config-effective]] — `MODEL_CONFIG` is the `model` slice of `EffectiveConfig`
- All agent notes — every agent calls `modelFor(role)` to resolve its model before each LLM call:
  [[agents/writer]], [[agents/arc-planner]], [[agents/saga-planner]], [[agents/bible-generator]], [[agents/auto-fixer]], [[agents/llm-validator]], [[agents/canon-extractor]], [[agents/summary-compactor]], [[agents/arc-summary-compactor]], [[agents/high-stakes-reviewer]], [[agents/packet-generator]]
- [[modules/cost-tracker]] — calls `estimateCostUsd()` after every completion to accumulate `story_costs`
- [[routes/admin]] — `PUT /api/admin/models` calls `setModelRoutes()`; `GET /api/admin/models` calls `getModelStatus()`

## Related domain concepts
- [[configs/config-budget]] — the $0.05/chapter hard cap is why `google/gemini-2.5-flash` (free-tier) is the universal default
- [[configs/config-llm-provider]] — the resolved model string is passed alongside the provider ID to the active `LLMProvider` implementation

## Notes
- **Never hardcode model strings.** Always call `modelFor(role)`. Literal model strings anywhere outside this file are a project bug per convention.
- `setModelRoutes()` mutates `MODEL_CONFIG.routes` in-place, meaning the admin API can hot-swap any agent's model without a worker restart.
- `estimateCostUsd()` returns `0` for unknown/local models (e.g. Ollama, vMLX) rather than throwing — these are implicitly free.
- Cached-input tokens are priced separately from fresh input tokens in the cost formula, matching OpenRouter's billing model.
