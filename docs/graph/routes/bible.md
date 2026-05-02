---
type: route
source: apps/api/src/routes/bible.ts
---

# Route: Bible

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/bible.ts`

## Responsibility
Generates, retrieves, and version-patches the story bible, and manages style few-shot examples; locks the story genre on first generation.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stories/:id/bible` | Runs `generateBible` agent, inserts a new `storyBibles` row (version+1), sets `stories.genreLockedAt`; returns 201 |
| GET | `/api/stories/:id/bible` | Returns the latest bible version; 404 if none exists |
| PUT | `/api/stories/:id/bible` | Applies a partial patch by inserting a new versioned row on top of the current one |
| PUT | `/api/stories/:storyId/bible/style-few-shots` | Replaces the `styleFewShots` array on a new versioned bible row; max 5 excerpts (20–2000 chars each) |

## Inputs
- **`id` / `storyId`** — UUID path parameter
- **`UpdateBibleSchema`** (PUT bible) — optional fields: `worldRules`, `powerSystem`, `powerSystemKind`, `cultivationSystem`, `bloodlineSystem`, `styleGuide`, `forbiddenRules`, `endingDirection`, `compactSummary`, `styleFewShots`
- **`FewShotsSchema`** (PUT style-few-shots) — `{ fewShots: string[] }` — up to 5 strings, 20–2000 chars each
- POST has no body; all generation inputs come from the story record and loaded domain context

## Outputs
- `POST` → `201 StoryBible` row (full object)
- `GET` → latest `StoryBible` row or `404 bible_not_found`
- `PUT bible` → new `StoryBible` row (bumped version)
- `PUT style-few-shots` → `200 { ok: true }` or `400 validation_failed`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; reads/writes `storyBibles`, updates `stories`
- [[agents/bible-generator]] — `generateBible()` function from `@novel/ai/agents/bible-generator`
- [[modules/story-domain]] — `loadStoryDomainContext()` to load `genreDef`, `personalityDef`, `storyOptions`
- `lib/llm-provider.ts` → `buildLoggedProvider()`
- `lib/llm-settings.ts` → `getModelStatusForActiveProviderFromDb()` — resolves `bible_generator` model route
- `@novel/core/trace` → `newTraceId()`

## Used by
- [[app-web]] — story bible editor and generation trigger
- [[app-api]] — registered here

## Related database tables
- [[database/tables/story-bibles]]
- [[database/tables/stories]]

## Related flows
- [[flows/chapter-generation-flow]] — bible must exist before any chapter can be generated
- Saga planning gate — `sagas.ts` checks for a bible before calling `SagaPlannerAgent`

## Related domain concepts
- Bible versioning (insert-only; latest version determined by `version DESC, createdAt DESC`)
- Genre locking (`stories.genreLockedAt` set on first bible generation; blocks genre changes thereafter)
- Power system taxonomy (`powerSystemKind` enum)
- Style few-shots (in-context writing style examples used by the writer agent)
