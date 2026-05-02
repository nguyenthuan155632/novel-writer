---
type: database-table
source: packages/db/src/schema/llm-settings.ts
---

# Table: `llm_provider_state`

## Purpose
Single-row global state table that tracks which LLM provider is currently active. All worker jobs snapshot this at dispatch time to ensure consistent provider selection within a job run.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | text | PK — always `'global'` (singleton row) |
| `activeProvider` | text | Name of the currently active LLM provider |
| `updatedAt` | timestamptz | Last time the active provider was changed |

## Primary Key
`id` (text) — singleton, always `'global'`.

## Foreign Keys
None.

## Read By
- [[modules/provider-switcher]]
- All worker jobs (snapshot at dispatch)

## Written By
- [[routes/route-admin]] (`PUT /api/admin/provider`)

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

# Table: `llm_provider_state`

## Purpose
Global singleton row that tracks which LLM provider is currently active.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | text | PK — always `'global'` (singleton pattern) |
| activeProvider | text | Name of the currently active provider |
| updatedAt | timestamp | When the active provider was last changed |

## Primary Key
`id` = `'global'` (singleton — exactly one row)

## Foreign Keys
None

## Read By
- [[modules/provider-switcher]]
- All worker jobs (snapshot at dispatch)

## Written By
- [[routes/route-admin]] (`PUT /api/admin/provider`)

## Related Domain Concepts
- [[domain/agent-role]]

## Related Flows
- [[flows/llm-provider-flow]]
