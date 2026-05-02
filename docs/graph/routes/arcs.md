---
type: route
source: apps/api/src/routes/arcs.ts
---

# Route: Arcs

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/arcs.ts`

## Responsibility
Lists arcs within a saga, fetches a single arc by ID, and triggers AI-driven arc planning via `ArcPlannerAgent`.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/sagas/:sagaId/arcs` | Lists all arcs for a saga, ordered by `arcNumber` asc |
| GET | `/api/stories/:storyId/arcs/:arcId` | Fetches a single arc by ID; 404 if not found |
| POST | `/api/stories/:storyId/sagas/:sagaId/arcs/plan` | Runs `ArcPlannerAgent` and persists resulting arcs; 404 if saga not found |

## Inputs
- **`SagaParam`** — `{ storyId: UUID, sagaId: UUID }`
- **`ArcParam`** — `{ storyId: UUID, arcId: UUID }`
- **`PlanBody`** — `{ currentState: string (1–4000 chars) }` — description of current story state passed to the planner

## Outputs
- `GET .../arcs` → `{ arcs: Arc[] }`
- `GET .../arcs/:arcId` → `{ arc: Arc }` or `404 arc_not_found`
- `POST .../arcs/plan` → `{ promptVersion, usage, ...persistCounts }`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `arcs`, `sagas` tables
- [[agents/arc-planner]] — `ArcPlannerAgent` class; prompt registered via `arc-planner.v2`
- [[modules/story-domain]] — `loadStoryDomainContext()` to load `genreDef` and `storyOptions`
- `lib/llm-provider.ts` → `buildLoggedProvider()` — constructs the `LoggedLLMProvider` instance
- `lib/llm-settings.ts` → `getModelStatusForActiveProviderFromDb()` — resolves the `arc_planner` model route

## Used by
- [[app-web]] — arc planning and listing UI
- [[app-api]] — registered here

## Related database tables
- [[database/tables/arcs]]
- [[database/tables/sagas]]

## Related flows
- [[flows/chapter-generation-flow]] — arcs must exist before a chapter can be generated

## Related domain concepts
- Arc planning (AI-generated narrative structure within a saga)
- Story domain context (genre definition, story options)
