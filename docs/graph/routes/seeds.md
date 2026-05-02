---
type: route
source: apps/api/src/routes/seeds.ts
---

# Route: Seeds

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/seeds.ts`

## Responsibility
Full CRUD for planted seed records — the foreshadowing elements that the writer agent plants in chapters and pays off later.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/seeds` | Lists all seeds for a story, ordered by `payoffChapter` asc |
| POST | `/api/stories/:storyId/seeds` | Creates a new planted seed; returns 201 |
| PATCH | `/api/stories/:storyId/seeds/:seedId` | Partially updates a seed; 404 if not found |
| DELETE | `/api/stories/:storyId/seeds/:seedId` | Deletes a seed; 404 if not found |

## Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`SeedParam`** — `{ storyId: UUID, seedId: UUID }`
- **`SeedBody`** (POST, full) — `{ seedKey: string (3–120), description: string (20–600), plantWindowStart: int, plantWindowEnd: int, payoffChapter: int, importance: 'minor'|'major'|'climax', status?: 'pending'|'planted'|'paid_off'|'abandoned' }`
- **`SeedBody.partial()`** (PATCH) — same fields, all optional

## Outputs
- `GET` → `{ seeds: PlantedSeed[] }`
- `POST` → `201 { seed: PlantedSeed }`
- `PATCH` → `{ seed: PlantedSeed }` or `404 seed_not_found`
- `DELETE` → `{ deleted: seedId }` or `404 seed_not_found`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; full CRUD on `plantedSeeds` table

## Used by
- [[app-web]] — seed management UI (foreshadowing tracker)
- [[app-api]] — registered here

## Related database tables
- [[database/tables/planted-seeds]]

## Related flows
- [[flows/chapter-generation-flow]] — seeds due in the current chapter are injected into the COLD tier of `buildContext()`

## Related domain concepts
- Planted seeds (foreshadowing elements with plant window and payoff chapter)
- Seed status lifecycle: `pending` → `planted` → `paid_off` (or `abandoned`)
- Importance levels: `minor`, `major`, `climax`
- `createdByAgent: 'manual'` — marks seeds created via this route vs AI-generated ones
