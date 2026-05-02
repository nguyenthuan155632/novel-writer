---
type: module
source: apps/api/src/services/budget-guard.ts
---

# Module: Budget Guard

## Responsibility
Checks daily and monthly LLM spend against hard caps before allowing chapter generation. Raises error if caps exceeded.

## Source Evidence
`apps/api/src/services/budget-guard.ts` — `BudgetGuard`

## Inputs
- `storyId`
- Queries [[database/tables/llm-calls]] for rolling totals

## Outputs
- Passes (no-op) or throws budget exceeded error

## Budget Caps (from [[configs/config-budget]])
- Per-chapter: $0.05
- Daily: $5.00
- Monthly: $50.00

## Used By
- [[routes/route-chapters]] — before enqueueing generate job
- [[routes/route-batches]] — before starting batch

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
---
type: module
source: apps/api/src/services/budget-guard.ts
---

# Module: Budget Guard

## Responsibility
Checks daily and monthly LLM spend against hard caps before allowing generation. Throws if caps exceeded.

## Source Evidence
`apps/api/src/services/budget-guard.ts` — `BudgetGuard`

## Caps (from [[configs/config-budget]])
- Per-chapter: $0.05
- Daily: $5.00
- Monthly: $50.00

## Inputs
- `storyId`
- Queries [[database/tables/llm-calls]] for rolling totals

## Used By
- [[routes/route-chapters]]
- [[routes/route-batches]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
