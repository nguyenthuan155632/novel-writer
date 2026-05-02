---
type: route
source: apps/api/src/routes/stories.ts
---

# Route: Stories

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/stories.ts`

## Responsibility
Core CRUD for story records — creates stories with initial settings, lists and fetches stories, and partially updates story config while enforcing genre-lock after bible generation.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stories` | Creates a story row and a linked `storySettings` row; returns 201 |
| GET | `/api/stories` | Lists up to 100 stories ordered by `createdAt` desc |
| GET | `/api/stories/:id` | Fetches a single story; 404 if not found |
| PATCH | `/api/stories/:id` | Partial update; 409 if attempting to change a locked genre |

## Inputs
- **`CreateStorySchema`** (POST body) — `{ title: string (1–200), premise: string (20–5000), genre: GenreSlugSchema (default: 'tien_hiep'), mainCharacterPersonality: PersonalitySlugSchema (default: 'tram_on'), tone?: string, storyOptions: StoryOptionsSchema (default: {}), targetChapterCount: int 1–10000 (default: 1000) }`
- **`PatchStorySchema`** (PATCH body) — `{ genre?, mainCharacterPersonality?, tone?, storyOptions? }` — at least one field required
- **`:id`** — UUID path parameter

## Outputs
- `POST` → `201 Story` row or `400 validation_failed` or `500 insert_failed`
- `GET /api/stories` → `Story[]`
- `GET /api/stories/:id` → `Story` or `404 not_found`
- `PATCH` → `{ ok: true }` or `404 not_found` or `409 genre_locked` or `400 validation_failed`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; inserts/reads/updates `stories` and `storySettings`
- [[package-core]] — `GenreSlugSchema`, `PersonalitySlugSchema`, `StoryOptionsSchema` for validation

## Used by
- [[app-web]] — story creation wizard, story list, story detail page
- [[app-api]] — registered here

## Related database tables
- [[database/tables/stories]]
- [[database/tables/story-settings]]

## Related flows
- (none — this is the entry point; all other flows begin after story creation)

## Related domain concepts
- Genre locking — `stories.genreLockedAt` is set when a bible is generated; this route enforces the lock on PATCH
- `storyOptions` — stored in `storySettings.overrides.storyOptions`; deep-merged on partial update
- `GenreSlugSchema` — validates xianxia/fantasy genre identifiers (e.g. `tien_hiep`)
- `PersonalitySlugSchema` — validates protagonist personality archetypes (e.g. `tram_on`)
