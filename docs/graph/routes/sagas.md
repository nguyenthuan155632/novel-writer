---
type: route
source: apps/api/src/routes/sagas.ts
---

# Route: Sagas

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/sagas.ts`

## Responsibility
Lists sagas for a story, fetches a single saga by ID, and triggers AI-driven saga planning via `SagaPlannerAgent`; requires the story bible to exist before planning.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/sagas` | Lists all sagas for a story, ordered by `sagaNumber` asc |
| GET | `/api/stories/:storyId/sagas/:sagaId` | Fetches a single saga by ID; 404 if not found |
| POST | `/api/stories/:storyId/sagas/plan` | Runs `SagaPlannerAgent` and persists resulting sagas; 409 if bible not yet generated, 404 if story not found |

## Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`SagaParam`** — `{ storyId: UUID, sagaId: UUID }`
- **`PlanBody`** — `{ resetSeeds?: boolean }` — if `true`, clears existing planted seeds before persisting new ones

## Outputs
- `GET .../sagas` → `{ sagas: Saga[] }`
- `GET .../sagas/:sagaId` → `{ saga: Saga }` or `404 saga_not_found`
- `POST .../plan` → `{ promptVersion, usage, ...persistCounts }` or `404 story_not_found` or `409 bible_required`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `sagas`, `stories`, `storyBibles`
- [[agents/saga-planner]] — `SagaPlannerAgent` class; prompt registered via `saga-planner.v2`
- [[modules/story-domain]] — `loadStoryDomainContext()` to load `genreDef` and `storyOptions`
- `lib/llm-provider.ts` → `buildLoggedProvider()`
- `lib/llm-settings.ts` → `getModelStatusForActiveProviderFromDb()` — resolves `saga_planner` model route

## Used by
- [[app-web]] — saga planning and listing UI
- [[app-api]] — registered here

## Related database tables
- [[database/tables/sagas]]
- [[database/tables/story-bibles]]
- [[database/tables/planted-seeds]]

## Related flows
- [[flows/chapter-generation-flow]] — sagas must exist for a chapter to be generated

## Related domain concepts
- Saga planning (AI-generated multi-arc story structure)
- Bible prerequisite gate (saga planning blocked until bible exists)
- Seed reset (`resetSeeds`) — allows re-planning sagas without accumulating stale seeds
