---
type: route
source: apps/api/src/routes/canon-facts.ts
---

# Route: Canon Facts

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/canon-facts.ts`

## Responsibility
Provides manual management of canon fact records — listing, locking/unlocking importance level, and hard deletion.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/canon-facts` | Lists all canon facts for a story, ordered by `importance` desc |
| PATCH | `/api/stories/:storyId/canon-facts/:factId/lock` | Sets `importance` to `'locked'` or `'medium'` and toggles the `locked` boolean flag |
| DELETE | `/api/stories/:storyId/canon-facts/:factId` | Hard-deletes a canon fact; 404 if not found |

## Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`FactParam`** — `{ storyId: UUID, factId: UUID }`
- **`LockBody`** (PATCH) — `{ locked: boolean }`

## Outputs
- `GET` → `{ facts: CanonFact[] }`
- `PATCH .../lock` → `{ fact: CanonFact }` or `404 fact_not_found`
- `DELETE` → `{ deleted: true }` or `404 fact_not_found`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; reads/updates/deletes `canonFacts` table

## Used by
- [[app-web]] — canon review and management UI
- [[app-api]] — registered here

## Related database tables
- [[database/tables/canon-facts]]

## Related flows
- [[flows/chapter-generation-flow]] — canon facts are fed into the COLD tier of `buildContext()`

## Related domain concepts
- Canon integrity (facts extracted from generated chapters by `CanonExtractor`)
- Importance levels (`locked` > `high` > `medium` > `low`) — locked facts are never auto-overwritten
- Manual canon management (human override of AI-generated facts)
