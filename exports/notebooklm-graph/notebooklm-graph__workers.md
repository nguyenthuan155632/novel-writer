# Novel graph — workers

## queues

`workers/queues.md`

---
type: worker
source: apps/worker/src/queues.ts
---



Worker: Queue Definitions Responsibility
Defines BullMQ Queue instances and TypeScript job type declarations for all 6 queues.



Worker: Queue Definitions Source Evidence
`apps/worker/src/queues.ts`



Worker: Queue Definitions Queues Defined
| Queue Name | Job Type |
|-----------|---------|
| `generate-chapter` | `GenerateChapterJob` |
| `generate-batch` | `GenerateBatchJob` |
| `refresh-arc-summary` | `RefreshArcSummaryJob` |
| `refresh-saga-summary` | `RefreshSagaSummaryJob` |
| `high-stakes-review` | `HighStakesReviewJob` |
| `generate-export` | `GenerateExportJobData` |



Worker: Queue Definitions Depends On
- [[external-services/redis-bullmq]]



Worker: Queue Definitions Used By
- [[workers/worker-main]]
- [[modules/queue-client]] (API side enqueues to these queues)
---
type: worker
source: apps/worker/src/queues.ts
---



Worker: Queue Definitions Responsibility
Defines BullMQ Queue instances and TypeScript job type declarations for all 6 queues.



Worker: Queue Definitions Source Evidence
`apps/worker/src/queues.ts`



Worker: Queue Definitions Queues
| Queue Name | Job Type |
|-----------|---------|
| `generate-chapter` | `GenerateChapterJob` |
| `generate-batch` | `GenerateBatchJob` |
| `refresh-arc-summary` | `RefreshArcSummaryJob` |
| `refresh-saga-summary` | `RefreshSagaSummaryJob` |
| `high-stakes-review` | `HighStakesReviewJob` |
| `generate-export` | `GenerateExportJobData` |



Worker: Queue Definitions Depends On
- [[external-services/redis-bullmq]]



Worker: Queue Definitions Used By
- [[workers/worker-main]]
- [[modules/queue-client]]

---

## worker-main

`workers/worker-main.md`

---
type: worker
source: apps/worker/src/index.ts
---



Worker: Main Entry Point Responsibility
Bootstraps all 6 BullMQ worker instances and the stale job detector. Handles graceful shutdown.



Worker: Main Entry Point Source Evidence
`apps/worker/src/index.ts`



Worker: Main Entry Point Workers Started
- `generate-chapter` (concurrency 1)
- `generate-batch` (concurrency 1)
- `refresh-arc-summary` (concurrency 1)
- `refresh-saga-summary` (concurrency 1)
- `high-stakes-review` (concurrency 1)
- `generate-export` (concurrency 2)



Worker: Main Entry Point Stale Job Detector
Polls every 5 min. Finds chapters in `generating` status with no active job. Resets them to `failed`.



Worker: Main Entry Point Depends On
- [[external-services/redis-bullmq]]
- [[workers/queues]]



Worker: Main Entry Point Related Flows
- [[flows/job-worker-flow]]
---
type: worker
source: apps/worker/src/index.ts
---



Worker: Main Entry Point Responsibility
Bootstraps all 6 BullMQ worker instances and stale job detector. Handles graceful shutdown on SIGTERM/SIGINT.



Worker: Main Entry Point Source Evidence
`apps/worker/src/index.ts`



Worker: Main Entry Point Workers Started
- `generate-chapter` (concurrency 1) → [[jobs/job-generate-chapter]]
- `generate-batch` (concurrency 1) → [[jobs/job-generate-batch]]
- `refresh-arc-summary` (concurrency 1) → [[jobs/job-refresh-arc-summary]]
- `refresh-saga-summary` (concurrency 1) → [[jobs/job-refresh-saga-summary]]
- `high-stakes-review` (concurrency 1) → [[jobs/job-high-stakes-review]]
- `generate-export` (concurrency 2) → [[jobs/job-generate-export]]



Worker: Main Entry Point Stale Job Detector
Polls every 5 min. Finds chapters in `generating` status with no active BullMQ job. Resets to `failed`.



Worker: Main Entry Point Depends On
- [[external-services/redis-bullmq]]
- [[workers/queues]]



Worker: Main Entry Point Related Flows
- [[flows/job-worker-flow]]

---
