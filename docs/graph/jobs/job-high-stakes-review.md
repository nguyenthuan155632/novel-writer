---
type: job
source: apps/worker/src/jobs/high-stakes-review.ts
---

# Job: high-stakes-review

## Responsibility
Deep LLM review of chapters at arc end, on critical severity validation findings, or manually triggered. Persists review to DB.

## Source Evidence
`apps/worker/src/jobs/high-stakes-review.ts` — `runHighStakesReviewJob()`

## Queue
`high-stakes-review` (concurrency 1)

## Trigger Reasons
- `arc_end` — last chapter of an arc
- `critical_severity` — LLM validator found critical issue
- `manual` — operator triggered via API

## Trigger Policy
`shouldRunReviewer()` from [[packages/package-core]] policy

## Calls
- [[agents/high-stakes-reviewer]]

## Writes
- [[database/tables/high-stakes-reviews]]

## Related Flows
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]
---
type: job
source: apps/worker/src/jobs/high-stakes-review.ts
---

# Job: high-stakes-review

## Responsibility
Deep LLM review at arc-end, critical-severity validation, or manual trigger. Persists result.

## Source Evidence
`apps/worker/src/jobs/high-stakes-review.ts` — `runHighStakesReviewJob()`

## Queue
`high-stakes-review` (concurrency 1)

## Trigger Reasons
- `arc_end` — last chapter of an arc
- `critical_severity` — LLM validator found critical issue
- `manual` — operator via API

## Trigger Policy
`shouldRunReviewer()` from [[packages/package-core]]

## Calls
- [[agents/high-stakes-reviewer]]

## Writes
- [[database/tables/high-stakes-reviews]]

## Related Flows
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]
