---
type: route
source: apps/api/src/routes/story-settings.ts
---

# Route: Story Settings

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/story-settings.ts`

## Responsibility
Reads and fully replaces the per-story configuration override blob, which controls model routes, budget caps, context window sizes, and generation parameters for a specific story.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/settings` | Returns the current `overrides` object; returns `{}` if no row exists |
| PUT | `/api/stories/:storyId/settings` | Replaces the entire `overrides` blob (upsert); 400 if body is invalid |

## Inputs
- **`:storyId`** — UUID path parameter
- **`PutSettingsSchema`** (PUT body) — `{ overrides: Record<string, unknown> }` — must be a plain object, not an array

## Outputs
- `GET` → `{ overrides: Record<string, unknown> }` (empty object if no row)
- `PUT` → `{ ok: true }` or `400 validation_failed`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; upserts `storySettings` table on `storyId` conflict

## Used by
- [[app-web]] — advanced story settings panel
- [[app-api]] — registered here
- [[workers/chapter-pipeline]] — `getEffectiveConfig(storyId)` reads from this table to build per-story config

## Related database tables
- [[database/tables/story-settings]]

## Related flows
- (none — settings are consumed at job dispatch time, not during this route)

## Related domain concepts
- [[configs/config-effective]] — `getEffectiveConfig(storyId, provider)` merges global config with these overrides; always use that function in worker jobs
- Per-story config overrides (model routes, budget, context window sizes, generation params)
- Full replacement semantics — PUT replaces the entire blob; use with caution
