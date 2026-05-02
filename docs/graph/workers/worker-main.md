---
type: worker
source: apps/worker/src/index.ts
---

# Worker: Main Entry Point

## Responsibility
Bootstraps all 6 BullMQ worker instances and the stale job detector. Handles graceful shutdown.

## Source Evidence
`apps/worker/src/index.ts`

## Workers Started
- `generate-chapter` (concurrency 1)
- `generate-batch` (concurrency 1)
- `refresh-arc-summary` (concurrency 1)
- `refresh-saga-summary` (concurrency 1)
- `high-stakes-review` (concurrency 1)
- `generate-export` (concurrency 2)

## Stale Job Detector
Polls every 5 min. Finds chapters in `generating` status with no active job. Resets them to `failed`.

## Depends On
- [[external-services/redis-bullmq]]
- [[workers/queues]]

## Related Flows
- [[flows/job-worker-flow]]
---
type: worker
source: apps/worker/src/index.ts
---

# Worker: Main Entry Point

## Responsibility
Bootstraps all 6 BullMQ worker instances and stale job detector. Handles graceful shutdown on SIGTERM/SIGINT.

## Source Evidence
`apps/worker/src/index.ts`

## Workers Started
- `generate-chapter` (concurrency 1) → [[jobs/job-generate-chapter]]
- `generate-batch` (concurrency 1) → [[jobs/job-generate-batch]]
- `refresh-arc-summary` (concurrency 1) → [[jobs/job-refresh-arc-summary]]
- `refresh-saga-summary` (concurrency 1) → [[jobs/job-refresh-saga-summary]]
- `high-stakes-review` (concurrency 1) → [[jobs/job-high-stakes-review]]
- `generate-export` (concurrency 2) → [[jobs/job-generate-export]]

## Stale Job Detector
Polls every 5 min. Finds chapters in `generating` status with no active BullMQ job. Resets to `failed`.

## Depends On
- [[external-services/redis-bullmq]]
- [[workers/queues]]

## Related Flows
- [[flows/job-worker-flow]]
