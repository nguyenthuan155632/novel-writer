---
type: module
source: packages/db/src/services/cost-tracker.ts
---

# Module: Cost Tracker

## Responsibility
Accumulates LLM call costs into the story's running total.

## Source Evidence
`packages/db/src/services/cost-tracker.ts` — `accumulateStoryCost()`

## Inputs
- `storyId`, `costUsd` (delta)

## Outputs
- Updates [[database/tables/stories]].`totalCostUsd`

## Used By
- [[modules/llm-call-logger]] — called after every LLM call
---
type: module
source: packages/db/src/services/cost-tracker.ts
---

# Module: Cost Tracker

## Responsibility
Accumulates per-call LLM cost into the story's running total.

## Source Evidence
`packages/db/src/services/cost-tracker.ts` — `accumulateStoryCost(storyId, costUsd)`

## Inputs
- `storyId`, `costUsd` (delta)

## Outputs
- Increments [[database/tables/stories]].totalCostUsd

## Used By
- [[modules/llm-call-logger]]
