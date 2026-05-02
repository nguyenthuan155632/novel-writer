---
type: route
source: apps/api/src/routes/pending-updates.ts
---

# Route: Pending Updates

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/pending-updates.ts`

## Responsibility
Provides human-in-the-loop review of staged canon updates — listing pending items and approving or rejecting them, with automatic chapter state transition when all updates for a chapter are resolved.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/pending-updates` | Lists pending canon updates filtered by `?resolution=<value>` (default: `pending`) |
| POST | `/api/stories/:storyId/pending-updates/:updateId/approve` | Applies the update to its target table, marks it `approved`/`edited`, then calls `maybeAutoCompleteChapter()` |
| POST | `/api/stories/:storyId/pending-updates/:updateId/reject` | Marks the update `rejected` with a reason, then calls `maybeAutoCompleteChapter()` |

## Inputs
- **`StoryParams`** — `{ storyId: UUID }`
- **`UpdateParams`** — `{ storyId: UUID, updateId: UUID }`
- **`ApproveBody`** — `{ resolution: 'approved' | 'edited' }` (default `'approved'`)
- **`RejectBody`** — `{ reason: string (1–1000 chars) }`
- **Query param** `resolution` — filters the GET list (e.g. `pending`, `approved`, `rejected`)

## Outputs
- `GET` → `{ pendingUpdates: PendingCanonUpdate[] }` ordered by `createdAt` asc
- `POST .../approve` → `{ pendingUpdate: PendingCanonUpdate }` or `404 pending_update_not_found`
- `POST .../reject` → `{ pendingUpdate: PendingCanonUpdate }` or `404 pending_update_not_found`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; reads/writes `pendingCanonUpdates`, `characters`, `canonFacts`, `openThreads`, `timelineEvents`, `plantedSeeds`, `chapters`

### Internal helpers (defined in-file)
- `applyPendingUpdate(db, update)` — dispatches on `targetTable` + `updateType` to insert/update the target entity
- `maybeAutoCompleteChapter(db, chapterId)` — transitions a `paused_pending_updates` chapter to `completed` when no pending updates remain

## Used by
- [[app-web]] — canon review queue UI
- [[app-api]] — registered here

## Related database tables
- [[database/tables/pending-canon-updates]]
- [[database/tables/characters]]
- [[database/tables/canon-facts]]
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/planted-seeds]]
- [[database/tables/chapters]]

## Related flows
- [[flows/chapter-generation-flow]] — `CanonMerger` stages updates as `pending_canon_updates`; this route resolves them

## Related domain concepts
- Canon integrity — staged updates reviewed before being committed
- `paused_pending_updates` chapter state — chapter completion gated on human review
- `applyPendingUpdate` dispatch table — handles `characters`, `canon_facts`, `open_threads`, `timeline_events`, `planted_seeds` target tables
- Human-in-the-loop review (`reviewedBy: 'human'`)
