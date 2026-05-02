---
type: database-table
source: packages/db/src/schema/llm-settings.ts
---

# Table: `llm_provider_settings`

## Purpose
Stores per-provider model route maps — the mapping of `AgentRole` to model identifier for each registered LLM provider. Overrides the compile-time `MODEL_CONFIG.routes` at runtime.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `provider` | text | PK — provider name (e.g. `google-direct`, `openrouter`) |
| `modelRoutes` | jsonb | Map of `AgentRole` → model string for this provider |

## Primary Key
`provider` (text)

## Foreign Keys
None.

## Read By
- [[modules/provider-switcher]]
- [[configs/config-models]]

## Written By
- [[routes/route-admin]] (`PUT /api/admin/models`)

## Updated By
- [[routes/route-admin]]

## Related Domain Concepts
- [[domain-agent-role]]

## Related Flows
- [[flows/llm-provider-flow]]
---
type: database-table
source: packages/db/src/schema/llm-settings.ts
---

# Table: `llm_provider_settings`

## Purpose
Per-provider model route overrides — maps agent roles to specific model names.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| provider | text | PK — provider name string (e.g. `google-direct`, `openrouter`) |
| modelRoutes | jsonb | Map of `AgentRole` → model name string |

## Primary Key
`provider` (text — one row per provider)

## Foreign Keys
None

## Read By
- [[modules/provider-switcher]]
- [[configs/config-models]]

## Written By
- [[routes/route-admin]] (`PUT /api/admin/models`)

## Related Domain Concepts
- [[domain/agent-role]]

## Related Flows
- [[flows/llm-provider-flow]]
