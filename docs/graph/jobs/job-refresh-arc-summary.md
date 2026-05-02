---
type: job
source: apps/worker/src/jobs/refresh-arc-summary.ts
---

# Job: refresh-arc-summary

## Responsibility
Refreshes the rolling arc summary from recent chapter summaries. Triggers saga summary refresh every 20 chapters.

## Source Evidence
`apps/worker/src/jobs/refresh-arc-summary.ts` — `runRefreshArcSummaryJob()`

## Queue
`refresh-arc-summary` (concurrency 1)

## Trigger
Fire-and-forget from [[jobs/job-generate-chapter]] after each chapter completes.
Refresh interval: every `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` (=5) chapters.

## Calls
- [[agents/arc-summary-compactor]]

## Reads
- [[database/tables/chapter-summaries]]
- [[database/tables/arcs]]

## Writes
- [[database/tables/arcs]] — `rollingSummary`, `summaryVersion`, `summaryUpdatedAt`

## Triggers
- [[jobs/job-refresh-saga-summary]] (every 20 chapters)

## Related Flows
- [[flows/job-worker-flow]]
---
type: job
source: apps/worker/src/jobs/refresh-arc-summary.ts
---

# Job: refresh-arc-summary

## Responsibility
Refreshes rolling arc summary from recent chapter summaries every 5 chapters. Then triggers saga summary refresh every 20 chapters.

## Source Evidence
`apps/worker/src/jobs/refresh-arc-summary.ts` — `runRefreshArcSummaryJob()`

## Queue
`refresh-arc-summary` (concurrency 1)

## Trigger
Fire-and-forget from [[jobs/job-generate-chapter]] after each chapter.
Interval: `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` = 5

## Calls
- [[agents/arc-summary-compactor]]

## Reads
- [[database/tables/chapter-summaries]]
- [[database/tables/arcs]]

## Writes
- [[database/tables/arcs]] — rollingSummary, summaryVersion, summaryUpdatedAt

## Triggers
- [[jobs/job-refresh-saga-summary]] (every 20 chapters)

## Related Flows
- [[flows/job-worker-flow]]
