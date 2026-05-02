---
type: job
source: apps/worker/src/jobs/generate-batch.ts
---

# Job: generate-batch

## Responsibility
Sequential batch coordinator. Runs chapters one at a time up to batch size. Handles per-chapter retry (3x). Escalates to safe mode on failures.

## Source Evidence
`apps/worker/src/jobs/generate-batch.ts` — `runGenerateBatchJob()`

## Queue
`generate-batch` (concurrency 1)

## Job Data
- `storyId`, `batchId`, `startChapter`, `endChapter`, `mode`

## Behavior
- Iterates chapters sequentially
- Per-chapter retry: up to 3 attempts
- Auto-escalation to `safe` mode on: critical validation, canon conflict, chapter failure
- Reads/writes [[database/tables/batches]]

## Triggers
- [[jobs/job-generate-chapter]] for each chapter in batch

## Reads
- [[database/tables/batches]]
- [[database/tables/arcs]]

## Writes
- [[database/tables/batches]] — completedChapters, status, pausedReason

## Depends On
- [[modules/queue-client]]
- [[configs/config-generation]] — SEMI_AUTO_BATCH_SIZE, FULL_AUTO_BATCH_SIZE
- [[packages/package-core]] — resolveEffectiveMode()

## Related Flows
- [[flows/batch-generation-flow]]
---
type: job
source: apps/worker/src/jobs/generate-batch.ts
---

# Job: generate-batch

## Responsibility
Sequential batch coordinator. Runs chapters one-at-a-time up to batch size with per-chapter retry (3x). Auto-escalates to safe mode on failures.

## Source Evidence
`apps/worker/src/jobs/generate-batch.ts` — `runGenerateBatchJob()`

## Queue
`generate-batch` (concurrency 1)

## Job Data
- `storyId`, `batchId`, `startChapter`, `endChapter`, `mode` (safe/semi_auto/full_auto)

## Behavior
- Iterates chapters sequentially
- Per-chapter retry: up to 3 attempts
- Auto-escalates to `safe` mode on: critical validation, canon conflict, chapter failure
- Batch sizes: safe=1, semi_auto=5, full_auto=30 (from [[configs/config-generation]])

## Reads
- [[database/tables/batches]]
- [[database/tables/arcs]]

## Writes
- [[database/tables/batches]] — completedChapters, status, pausedReason

## Triggers
- [[jobs/job-generate-chapter]] per chapter

## Related Flows
- [[flows/batch-generation-flow]]
