---
type: policy
source: packages/core/src/policy/budget-guardrails.ts
---

# Policy: Budget Guardrails

**Type:** Policy Module  
**Source:** `packages/core/src/policy/budget-guardrails.ts`

## Responsibility
Runtime enforcement of the project's ≤$0.05/chapter cost target at the daily and monthly level. Evaluates accumulated story spend against the hard caps in [[configs/config-budget]] and returns a tri-state result (`ok` / `alert` / `breach`). This is the decision gate that blocks further LLM dispatching when caps are exceeded.

## Function Signature

```typescript
checkAgainstCaps(usage: {
  dailyUsd: number;
  monthlyUsd: number;
}): {
  state: 'ok' | 'alert' | 'breach';
  capHit?: 'daily' | 'monthly';
  pct: number;
}
```

## Logic

Priority order — first match wins:

| Priority | Condition | Returns |
|---|---|---|
| 1 | `dailyUsd / PER_STORY_DAILY_CAP_USD >= 1.0` | `{ state: 'breach', capHit: 'daily', pct }` |
| 2 | `monthlyUsd / PER_STORY_MONTHLY_CAP_USD >= 1.0` | `{ state: 'breach', capHit: 'monthly', pct }` |
| 3 | `(dailyUsd / dailyCap) * 100 >= ALERT_THRESHOLD_PERCENT (80)` | `{ state: 'alert', capHit: 'daily', pct }` |
| 4 | `(monthlyUsd / monthlyCap) * 100 >= ALERT_THRESHOLD_PERCENT (80)` | `{ state: 'alert', capHit: 'monthly', pct }` |
| 5 | Otherwise | `{ state: 'ok', pct: Math.max(dailyPct, monthlyPct) }` |

- In the `ok` case `pct` is the higher of the two ratios — a single "how close are we?" number for monitoring.
- Daily cap is checked before monthly cap at each tier.

## Depends on
- [[configs/config-budget]] — reads `PER_STORY_DAILY_CAP_USD`, `PER_STORY_MONTHLY_CAP_USD`, `ALERT_THRESHOLD_PERCENT`
- [[packages/package-core]]

## Used by
- [[modules/budget-guard]] — calls `checkAgainstCaps()` before dispatching each generation job; throws if `state === 'breach'`
- [[modules/admin-metrics]] — surfaces budget state in the admin dashboard UI

## Related flows
- [[jobs/job-generate-chapter]] — cost is accumulated in `story_costs` table; the worker reads rolling totals and passes them as `{dailyUsd, monthlyUsd}` before the chapter write begins
- [[configs/config-effective]] — per-story `budget` overrides (via `story_settings.overrides`) can raise the daily/monthly caps; this policy will respect whichever caps are in the effective config

## Notes
- Also re-exports `BUDGET_GUARDRAILS` constants for convenience, so consumers don't need a separate import from `config/budget.ts`.
- `breach` → hard stop; the worker **must not** dispatch further LLM calls for the story until the next billing period.
- `alert` → soft warning; generation continues but the admin UI highlights the threshold proximity.
- The **per-chapter** cap (`PER_CHAPTER_HARD_CAP_USD: $0.05`) is **not** checked by this function. It is enforced separately at the `LoggedLLMProvider` level as a per-call cost check.
