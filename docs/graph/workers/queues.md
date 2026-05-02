---
type: worker
source: apps/worker/src/queues.ts
---

# Worker: Queue Definitions

## Responsibility
Defines BullMQ Queue instances and TypeScript job type declarations for all 6 queues.

## Source Evidence
`apps/worker/src/queues.ts`

## Queues Defined
| Queue Name | Job Type |
|-----------|---------|
| `generate-chapter` | `GenerateChapterJob` |
| `generate-batch` | `GenerateBatchJob` |
| `refresh-arc-summary` | `RefreshArcSummaryJob` |
| `refresh-saga-summary` | `RefreshSagaSummaryJob` |
| `high-stakes-review` | `HighStakesReviewJob` |
| `generate-export` | `GenerateExportJobData` |

## Depends On
- [[external-services/redis-bullmq]]

## Used By
- [[workers/worker-main]]
- [[modules/queue-client]] (API side enqueues to these queues)
---
type: worker
source: apps/worker/src/queues.ts
---

# Worker: Queue Definitions

## Responsibility
Defines BullMQ Queue instances and TypeScript job type declarations for all 6 queues.

## Source Evidence
`apps/worker/src/queues.ts`

## Queues
| Queue Name | Job Type |
|-----------|---------|
| `generate-chapter` | `GenerateChapterJob` |
| `generate-batch` | `GenerateBatchJob` |
| `refresh-arc-summary` | `RefreshArcSummaryJob` |
| `refresh-saga-summary` | `RefreshSagaSummaryJob` |
| `high-stakes-review` | `HighStakesReviewJob` |
| `generate-export` | `GenerateExportJobData` |

## Depends On
- [[external-services/redis-bullmq]]

## Used By
- [[workers/worker-main]]
- [[modules/queue-client]]
