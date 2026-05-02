---
type: job
source: apps/worker/src/jobs/refresh-saga-summary.ts
---

# Job: refresh-saga-summary

## Responsibility
Refreshes rolling saga summary from arc summaries.

## Source Evidence
`apps/worker/src/jobs/refresh-saga-summary.ts` — `runRefreshSagaSummaryJob()`

## Queue
`refresh-saga-summary` (concurrency 1)

## Trigger
Fire-and-forget from [[jobs/job-refresh-arc-summary]] every 20 chapters.
Refresh interval: `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` (=20).

## Calls
- [[agents/arc-summary-compactor]] (used for both arc and saga level)

## Reads
- [[database/tables/arcs]] — arc rollingSummaries
- [[database/tables/sagas]]

## Writes
- [[database/tables/sagas]] — `rollingSummary`, `summaryVersion`, `summaryUpdatedAt`

## Related Flows
- [[flows/job-worker-flow]]
---
type: job
source: apps/worker/src/jobs/refresh-saga-summary.ts
---

# Job: refresh-saga-summary

## Responsibility
Refreshes rolling saga summary from arc summaries every 20 chapters.

## Source Evidence
`apps/worker/src/jobs/refresh-saga-summary.ts` — `runRefreshSagaSummaryJob()`

## Queue
`refresh-saga-summary` (concurrency 1)

## Trigger
Fire-and-forget from [[jobs/job-refresh-arc-summary]] every 20 chapters.
Interval: `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` = 20

## Calls
- [[agents/arc-summary-compactor]] (reused for saga level)

## Reads
- [[database/tables/arcs]] — arc rollingSummaries
- [[database/tables/sagas]]

## Writes
- [[database/tables/sagas]] — rollingSummary, summaryVersion, summaryUpdatedAt

## Related Flows
- [[flows/job-worker-flow]]
