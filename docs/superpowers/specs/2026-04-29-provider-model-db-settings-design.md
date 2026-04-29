# Provider/Model Settings in DB Design

## Goal

Persist global LLM runtime settings in PostgreSQL so provider + model routes survive API restarts.

Each provider has its own model-route configuration, and exactly one provider is active at a time.

## Decisions

- Remove env vars as runtime source of truth for active provider and model routes.
- Keep current UI unchanged:
  - Header updates active provider.
  - Admin Models edits model routes for the current active provider.
- Keep API contract compatible where possible (`/api/admin/provider`, `/api/admin/models`).

## Data Model

### Table: `llm_provider_settings`

- `provider text primary key`
- `model_routes jsonb not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- `provider` check: one of `opencode`, `openrouter`, `ollama`
- `jsonb_typeof(model_routes) = 'object'`

### Table: `llm_provider_state`

- `id text primary key` (fixed to `global`)
- `active_provider text not null references llm_provider_settings(provider)`
- `updated_at timestamptz not null default now()`

Constraints:

- `id = 'global'` (singleton row)

## Seed Strategy

Migration seeds:

1. `llm_provider_settings` with 3 rows (`opencode`, `openrouter`, `ollama`)
2. Each row gets default model routes (same default route map currently used in code)
3. `llm_provider_state` with `id='global'`, `active_provider='opencode'`

No runtime fallback to provider/model env vars after migration.

## API Semantics

### `GET /api/admin/provider`

Returns current active provider and available options.

### `PUT /api/admin/provider`

Input: `{ provider }`

- Validates provider id
- Updates `llm_provider_state.active_provider`
- Does not mutate model routes

### `GET /api/admin/models`

- Reads active provider from `llm_provider_state`
- Returns model routes from `llm_provider_settings` for that provider
- Response shape stays compatible: `{ routes, options, hints }`

### `PUT /api/admin/models`

Input: `{ routes }` (partial map)

- Applies partial route updates to `llm_provider_settings` for active provider only
- Returns updated model status for active provider

## Runtime Flow

## API Process

Replace process-memory globals with DB-backed service functions:

- `getActiveProvider()`
- `setActiveProvider(provider)`
- `getModelStatusForActiveProvider()`
- `setModelRoutesForActiveProvider(routes)`

All admin routes and enqueue call sites use these DB-backed functions.

## Queue Snapshot Behavior

When enqueueing generation/batch jobs:

- Read active provider + its model routes from DB
- Include both in job payload (`llmProvider`, `modelRoutes`)

Worker keeps current behavior of preferring payload values, preserving snapshot consistency if active provider changes later.

## Concurrency and Consistency

For `PUT /api/admin/models`, read active provider and update its settings in one transaction to avoid accidental write to a newly switched provider during concurrent requests.

## Error Handling

- Missing singleton state row or missing provider row should return a clear server error code (`llm_settings_missing`) and structured logs.
- Provider validation remains strict.
- Model ids remain free-form non-empty strings (provider-specific model ids are allowed).

## Testing Plan

1. Schema/migration tests:
   - Seed rows exist
   - DB constraints reject invalid provider/singleton violations
2. API tests:
   - Switching provider preserves each provider's own model routes
   - Model update applies only to active provider
   - Restart simulation keeps settings via DB
3. Enqueue tests:
   - Payload captures provider/routes from active provider at enqueue time
   - Changing provider between enqueue calls changes subsequent payloads only

## Non-Goals

- No UI redesign.
- No per-story provider/model overrides in this change.
- No provider-specific model-validation allowlists at DB layer.
