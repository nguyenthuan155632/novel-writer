---
type: route
source: apps/api/src/routes/chapters.ts
---

# Route: Chapters

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/chapters.ts`

## Responsibility
Manages chapter records and orchestrates chapter generation — listing, reading, triggering generation, streaming live job status via SSE, and deleting the latest chapter with transactional cleanup.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/chapters` | Lists all chapters (id, number, title, status, wordCount) ordered by chapter number desc |
| GET | `/api/stories/:storyId/chapters/:chapterNumber` | Fetches a full chapter record; 404 if not found |
| POST | `/api/stories/:storyId/chapters/generate` | Validates bible/saga/arc exist, enqueues `generate-chapter` job; 202 on success, 409 if planning steps missing |
| GET | `/api/stories/:storyId/chapters/:chapterNumber/status` | Returns BullMQ job status; 404 if no active job |
| GET | `/api/stories/:storyId/chapters/:chapterNumber/stream` | SSE stream that polls job status every 2 s; closes on `completed` or `failed` |
| DELETE | `/api/stories/:storyId/chapters/:chapterNumber` | Deletes the latest chapter only; transactional cleanup of timeline events, open threads, and canon facts; 409 if currently generating |

## Inputs
- **`ChapterParams`** — `{ storyId: UUID }`
- **`ChapterDetailParams`** — `{ storyId: UUID, chapterNumber: int (coerced) }`
- **`PostGenerateBody`** — `{ chapterNumber: int, mode: 'safe' | 'semi_auto' | 'full_auto' (default: 'safe') }`

## Outputs
- `GET .../chapters` → `{ chapters: ChapterSummary[] }` (partial fields)
- `GET .../chapters/:n` → `{ chapter: Chapter }` or `404`
- `POST .../generate` → `202 { jobId, storyId, chapterNumber }` or `409 { error: 'planning_required', missing: Array<'bible'|'saga'|'arc'> }`
- `GET .../status` → BullMQ status object or `404 no_active_job`
- `GET .../stream` → `text/event-stream` — events: `connected`, `status`
- `DELETE` → `204` or `400 only_latest_chapter_can_be_deleted` or `409 chapter_is_generating`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `chapters`, `storyBibles`, `sagas`, `arcs`, `timelineEvents`, `openThreads`, `canonFacts`
- [[modules/queue-client]] — `enqueueGenerateChapter()`, `getGenerateChapterStatus()`
- [[modules/provider-switcher]] — `getQueueLlmSnapshot()` — snapshots provider + model routes into job payload
- `@novel/core/trace` → `newTraceId()`

## Used by
- [[app-web]] — chapter list, reader, generation controls, live status indicator
- [[app-api]] — registered here

## Related database tables
- [[database/tables/chapters]]
- [[database/tables/story-bibles]]
- [[database/tables/sagas]]
- [[database/tables/arcs]]
- [[database/tables/timeline-events]]
- [[database/tables/open-threads]]
- [[database/tables/canon-facts]]

## Related flows
- [[flows/chapter-generation-flow]] — the `generate-chapter` job is the main pipeline
- [[flows/job-worker-flow]] — BullMQ job lifecycle

## Related domain concepts
- Planning gate (`getMissingPlanningSteps`) — enforces bible → saga → arc prerequisite order
- Generation modes (`safe`, `semi_auto`, `full_auto`)
- SSE streaming — live chapter generation progress without WebSockets
- Transactional chapter deletion — rolls back associated timeline events and open thread references
