---
type: route
source: apps/api/src/routes/batches.ts
---

# Route: Batches

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/batches.ts`

## Responsibility
Manages multi-chapter batch generation jobs — creates, lists, cancels, and retries batches by inserting `batches` rows and enqueuing `generate-batch` BullMQ jobs.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/batches` | Lists all batches for a story, ordered by `startedAt` desc |
| POST | `/api/stories/:storyId/batches` | Creates a batch row and enqueues a `generate-batch` job; returns 202 with `{ batch, jobId }` |
| POST | `/api/stories/:storyId/batches/:batchId/cancel` | Marks the batch `cancelled` and sets `finishedAt` |
| POST | `/api/stories/:storyId/batches/:batchId/retry` | Re-enqueues a `failed` or `paused` batch; 409 if batch is not retryable |

## Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`BatchParam`** — `{ storyId: UUID, batchId: UUID }`
- **`StartBody`** — `{ startChapter: int, endChapter: int (≥ startChapter), mode: 'safe' | 'semi_auto' | 'full_auto' }`

## Outputs
- `GET .../batches` → `{ batches: Batch[] }`
- `POST .../batches` → `202 { batch: Batch, jobId: string }`
- `POST .../cancel` → `{ status: 'cancelled' }`
- `POST .../retry` → `202 { batch: Batch, jobId: string }` or `409 batch_not_retryable`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; inserts/updates `batches` table
- [[modules/queue-client]] — `getGenerateBatchQueue()` to enqueue `generate-batch` jobs
- [[modules/provider-switcher]] — `getQueueLlmSnapshot()` — snapshots current provider + model routes into job payload
- `@novel/core/trace` → `newTraceId()` — generates trace IDs for observability

## Used by
- [[app-web]] — batch generation UI panel
- [[app-api]] — registered here

## Related database tables
- [[database/tables/batches]]

## Related flows
- [[flows/job-worker-flow]] — the enqueued `generate-batch` job is processed by the worker
- [[flows/chapter-generation-flow]] — a batch triggers sequential chapter generation

## Related domain concepts
- Generation modes (`safe`, `semi_auto`, `full_auto`) — control batch size and escalation
- Trace ID propagation — every job carries a `traceId` for end-to-end observability
