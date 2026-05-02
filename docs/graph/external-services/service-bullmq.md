---
type: external-service
---

# Service: BullMQ

## Role

Job queue framework built on top of [[external-services/service-redis]]. Provides reliable background job processing with durable persistence, retries, concurrency control, progress tracking, and graceful shutdown. All long-running work in the system is processed through BullMQ.

## Key Features Used

| Feature | How Used |
|---------|---------|
| **Job persistence** | Jobs survive worker/API restarts (stored atomically in Redis) |
| **Concurrency control** | Each queue has explicit `concurrency` (most queues = 1 to prevent race conditions) |
| **Stall detection** | `lockDuration: 600_000` ms, `maxStalledCount: 5` — stalled jobs are automatically requeued |
| **Job progress** | Workers call `job.updateProgress()` for SSE-compatible status polling from frontend |
| **Delayed jobs** | Used for scheduling follow-up jobs (arc/saga summaries) |
| **Graceful shutdown** | `worker.close()` called on `SIGTERM`/`SIGINT` — in-flight jobs complete before exit |

## Queues

| Queue Name | Concurrency | Job Handler |
|-----------|------------|------------|
| `generate-chapter` | 1 | [[jobs/job-generate-chapter]] |
| `generate-batch` | 1 | [[jobs/job-generate-batch]] |
| `generate-export` | 2 | [[jobs/job-generate-export]] |
| `high-stakes-review` | 1 | [[jobs/job-high-stakes-review]] |
| `refresh-arc-summary` | 1 | [[jobs/job-refresh-arc-summary]] |
| `refresh-saga-summary` | 1 | [[jobs/job-refresh-saga-summary]] |

## Backing Store

[[external-services/service-redis]] — all queue state persisted to Redis

## Worker Bootstrap

[[workers/worker-main]] — spawns all 6 BullMQ `Worker` instances at startup + stale job detector (polls every 5 min)

## Producer Side

[[modules/queue-client]] — wraps BullMQ `Queue` instances; used by API handlers to enqueue jobs

## Queue Type Declarations

[[workers/queues]] — exports typed `Queue<T>` instances for each queue name

## Related

- [[flows/job-worker-flow]]
- [[apps/app-worker]]
- [[apps/app-api]]
