---
type: database-table
source: packages/db/src/schema/context-packets.ts
---

# Table: `context_packets`

## Purpose
Records each assembled `ChapterContext` snapshot, including tier hashes and token counts. Used by admin metrics to measure context cache hit rates and to debug context assembly.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `chapterId` | uuid | FK → `chapters` |
| `hotTierHash` | text | Hash of stable HOT tier content (bible, style, etc.) |
| `warmTierHash` | text | Hash of WARM tier content (summaries, threads, seeds) |
| `coldPayload` | jsonb | Serialised COLD tier content for this build |
| `totalInputTokens` | int | Total tokens passed to the LLM |
| `cachedInputTokens` | int | Tokens served from provider-side cache |
| `configSnapshot` | jsonb | Snapshot of `EffectiveConfig` at build time |
| `createdAt` | timestamptz | Row creation time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `chapterId` → `chapters.id`

## Read By
- [[modules/admin-metrics]] (cache hit rate statistics)

## Written By
- [[modules/context-builder]] via [[jobs/job-generate-chapter]]

## Updated By
N/A — append-only observability record.

## Related Domain Concepts
- [[domain-chapter-context]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: database-table
source: packages/db/src/schema/context-packets.ts
---

# Table: `context_packets`

## Purpose
Snapshot of context used for each chapter generation — hot/warm hashes for cache analysis, cold payload, token counts.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| chapterId | uuid | FK → chapters |
| hotTierHash | text | Hash of the HOT tier content |
| warmTierHash | text | Hash of the WARM tier content |
| coldPayload | jsonb | Full serialized COLD tier payload |
| totalInputTokens | int | Total tokens sent to the model |
| cachedInputTokens | int | Tokens served from cache |
| configSnapshot | jsonb | EffectiveConfig snapshot at generation time |
| createdAt | timestamp | Creation timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `chapterId` → `chapters`

## Read By
- [[modules/admin-metrics]] (cache hit rate stats)

## Written By
- [[modules/context-builder]] via [[jobs/job-generate-chapter]]

## Related Domain Concepts
- [[domain/chapter-context]]

## Related Flows
- [[flows/chapter-generation-flow]]
