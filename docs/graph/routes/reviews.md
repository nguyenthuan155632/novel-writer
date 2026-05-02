---
type: route
source: apps/api/src/routes/reviews.ts
---

# Route: Reviews

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/reviews.ts`

## Responsibility
Lists completed high-stakes reviews for a story and allows manually triggering a new high-stakes review job for a specific chapter.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/reviews` | Lists all high-stakes review records for a story, ordered by `createdAt` desc |
| POST | `/api/stories/:storyId/reviews/trigger` | Enqueues a `high-stakes-review` BullMQ job for the specified chapter; returns 202 |

## Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`TriggerBody`** — `{ chapterId: UUID }`

## Outputs
- `GET` → `{ reviews: HighStakesReview[] }`
- `POST .../trigger` → `202 { status: 'queued', jobId, storyId, chapterId, triggerReason: 'manual' }` or `404 chapter_not_found`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `highStakesReviews` and `chapters`
- [[modules/queue-client]] — `enqueueHighStakesReview()` — enqueues the review job
- [[modules/provider-switcher]] — `getQueueLlmSnapshot()` — snapshots provider + model routes
- `@novel/core/trace` → `newTraceId()`

## Used by
- [[app-web]] — review history panel and manual review trigger button
- [[app-api]] — registered here

## Related database tables
- [[database/tables/high-stakes-reviews]]
- [[database/tables/chapters]]

## Related flows
- [[flows/validation-flow]] — high-stakes review is triggered automatically at arc boundaries or on `high`/`critical` validator findings; this route provides the manual trigger path

## Related domain concepts
- High-stakes review (deep narrative coherence check by [[agents/high-stakes-reviewer]])
- Auto-escalation — normally triggered automatically; manual trigger via this route
- `triggerReason: 'manual'` — distinguishes human-triggered reviews from automatic ones
