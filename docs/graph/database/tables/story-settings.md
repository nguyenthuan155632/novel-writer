---
type: database-table
source: packages/db/src/schema/story-settings.ts
---

# Table: `story_settings`

## Purpose
Stores per-story JSON overrides for the global `EffectiveConfig` — model routes, budget caps, context window sizes, and generation parameters. Loaded via `getEffectiveConfig()` before every worker job.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `storyId` | uuid | PK and FK → `stories` |
| `overrides` | jsonb | `ConfigOverrides` object with selective field overrides |
| `updatedAt` | timestamptz | Last modification time |

## Primary Key
`storyId` (uuid) — one settings row per story.

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[configs/config-effective]] (`getEffectiveConfig()`)

## Written By
- [[routes/route-story-settings]]

## Updated By
- [[routes/route-story-settings]]

## Related Domain Concepts
- [[domain-story]]
- [[configs/config-effective]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: database-table
source: packages/db/src/schema/story-settings.ts
---

# Table: `story_settings`

## Purpose
Per-story config overrides for model routes, budget caps, context window sizes, generation params.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| storyId | uuid | PK and FK → stories |
| overrides | jsonb | `ConfigOverrides` — partial override of the global EffectiveConfig |
| updatedAt | timestamp | Last update timestamp |

## Primary Key
`storyId` (uuid — 1:1 with stories)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[configs/config-effective]] (`getEffectiveConfig()`)
- [[jobs/job-generate-chapter]]

## Written By
- [[routes/route-story-settings]]

## Related Domain Concepts
- [[domain/story]]
- [[configs/config-effective]]

## Related Flows
- [[flows/chapter-generation-flow]]
