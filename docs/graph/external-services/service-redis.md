---
type: external-service
---

# Service: Redis

## Role

Backing store for the BullMQ job queue system. Provides durable job persistence, retry tracking, progress events, and job state management across worker and API restarts. Redis holds **no application data** — all business data lives in [[external-services/service-postgresql]].

## Connection

| Env Var | Format | Notes |
|---------|--------|-------|
| `REDIS_URL` | Full connection string | Preferred — used when set |
| `REDIS_HOST` | Hostname | Fallback — combined with `REDIS_PORT` |
| `REDIS_PORT` | Port number | Default: `6379` |

## Usage Pattern

- **Producer (API side)**: [[modules/queue-client]] calls `queue.add()` on BullMQ `Queue` instances backed by this Redis
- **Consumer (Worker side)**: [[workers/worker-main]] spawns BullMQ `Worker` instances that poll Redis for available jobs

## Data Stored in Redis

BullMQ manages all Redis structures internally:

| BullMQ Key Pattern | Contents |
|-------------------|----------|
| `bull:generate-chapter:*` | Chapter generation jobs |
| `bull:generate-batch:*` | Batch coordination jobs |
| `bull:generate-export:*` | Export jobs |
| `bull:refresh-arc-summary:*` | Arc summary refresh jobs |
| `bull:high-stakes-review:*` | High-stakes review jobs |
| `bull:refresh-saga-summary:*` | Saga summary refresh jobs |

Each job progresses through states: `waiting` → `active` → `completed` / `failed` / `delayed`

## Not Used For

- Application data (all in [[external-services/service-postgresql]])
- Model response caching
- Session/auth storage
- Rate limiting

## Related

- [[external-services/service-bullmq]] — the framework built on top of this Redis
- [[workers/queues]] — queue definitions
- [[workers/worker-main]] — consumer
- [[modules/queue-client]] — producer
- [[flows/job-worker-flow]]
