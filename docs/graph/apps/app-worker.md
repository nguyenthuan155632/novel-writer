---
type: app
source: apps/worker/src/
---

# App: Worker

## Type
BullMQ background processor

## Source Evidence
`apps/worker/src/index.ts` — spawns 6 BullMQ workers + stale job detector
`apps/worker/src/queues.ts` — queue definitions
`apps/worker/src/jobs/` — 7 job handler files

## Responsibility
Processes all long-running background jobs: chapter generation pipeline, batch coordination, export, high-stakes reviews, arc/saga summary refresh.

## Workers Spawned
| Queue | Concurrency |
|-------|-------------|
| generate-chapter | 1 |
| generate-batch | 1 |
| high-stakes-review | 1 |
| refresh-arc-summary | 1 |
| refresh-saga-summary | 1 |
| generate-export | 2 |

## Stale Job Detector
Runs every 5 minutes. Resets chapters stuck in `generating` status.

## Lock Configuration
`lockDuration: 600_000` (10 min), `maxStalledCount: 5`

## Jobs
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]
- [[jobs/job-generate-export]]
- [[jobs/job-high-stakes-review]]
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]

## Depends On
- [[packages/package-db]] — Drizzle ORM
- [[packages/package-core]] — getEffectiveConfig, policy
- [[packages/package-ai]] — all LLM agents
- [[external-services/redis-bullmq]] — job queue
- [[external-services/postgresql]]

## Environment Variables
- `REDIS_URL` — BullMQ connection
- `DATABASE_URL` — PostgreSQL
- `LOG_LLM_PROMPTS` — verbose prompt logging
- `NOVEL_LLM_PROVIDER` — fallback provider if DB missing
- `EXPORT_OUTPUT_DIR` — async export output (default `./exports`)

## Related Flows
- [[flows/job-worker-flow]]
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
---
type: app
source: apps/worker/src/
---

# App: Worker

## Type
BullMQ background processor

## Source Evidence
`apps/worker/src/index.ts` — spawns 6 BullMQ workers + stale job detector
`apps/worker/src/queues.ts` — queue definitions
`apps/worker/src/jobs/` — 7 job handler files

## Responsibility
Processes all long-running background jobs: chapter generation pipeline, batch coordination, export, high-stakes reviews, arc/saga summary refresh.

## Workers Spawned
| Queue | Concurrency |
|-------|-------------|
| generate-chapter | 1 |
| generate-batch | 1 |
| high-stakes-review | 1 |
| refresh-arc-summary | 1 |
| refresh-saga-summary | 1 |
| generate-export | 2 |

## Stale Job Detector
Runs every 5 minutes. Resets chapters stuck in `generating` status to `failed`.

## Lock Configuration
`lockDuration: 600_000` (10 min), `maxStalledCount: 5`

## Jobs
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]
- [[jobs/job-generate-export]]
- [[jobs/job-high-stakes-review]]
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]

## Depends On
- [[packages/package-db]]
- [[packages/package-core]]
- [[packages/package-ai]]
- [[external-services/redis-bullmq]]
- [[external-services/postgresql]]

## Environment Variables
- `REDIS_URL` — BullMQ connection
- `DATABASE_URL` — PostgreSQL
- `LOG_LLM_PROMPTS` — verbose prompt logging
- `NOVEL_LLM_PROVIDER` — fallback provider if DB state missing
- `EXPORT_OUTPUT_DIR` — async export output dir (default `./exports`)

## Related Flows
- [[flows/job-worker-flow]]
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
