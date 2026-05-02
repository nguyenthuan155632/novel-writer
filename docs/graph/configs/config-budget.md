---
type: config
source: packages/core/src/config/budget.ts
---

# Config: Budget Guardrails

**Type:** Configuration Module  
**Source:** `packages/core/src/config/budget.ts`

## Responsibility
Defines the hard monetary caps and alert threshold used throughout the system to prevent runaway LLM spending. These constants are the single source of truth for per-chapter, daily, and monthly spend limits.

## Key Constants

| Constant | Value | Description |
|---|---|---|
| `PER_CHAPTER_HARD_CAP_USD` | `$0.05` | Maximum cost allowed per single chapter generation |
| `PER_STORY_DAILY_CAP_USD` | `$5.00` | Maximum aggregate daily spend per story |
| `PER_STORY_MONTHLY_CAP_USD` | `$50.00` | Maximum aggregate monthly spend per story |
| `ALERT_THRESHOLD_PERCENT` | `80` | Percentage of a cap at which an 'alert' state is raised (before breach) |

## Exported Types
- `BudgetGuardrails` — TypeScript type inferred via `typeof BUDGET_GUARDRAILS`

## Depends on
- [[packages/package-core]]

## Used by
- [[configs/policy-budget-guardrails]] — `checkAgainstCaps()` reads these caps directly; also re-exports `BUDGET_GUARDRAILS`
- [[configs/config-effective]] — included as the `budget` slice of `EffectiveConfig`
- [[modules/budget-guard]] — enforces caps before dispatching generation jobs
- [[modules/cost-tracker]] — accumulates story spend that is subsequently checked against these caps

## Related domain concepts
- [[configs/config-effective]] — per-story overrides in `story_settings.overrides.budget` can loosen or tighten these caps
- [[modules/admin-metrics]] — exposes budget state via the admin dashboard

## Notes
- The `PER_CHAPTER_HARD_CAP_USD: $0.05` is the primary design constraint driving model selection. The default model (`google/gemini-2.5-flash`) has $0 input/output pricing, making it the safe default.
- The per-chapter cap is enforced at the `LoggedLLMProvider` level per-call; the daily/monthly caps are enforced by [[configs/policy-budget-guardrails]] before dispatching jobs.
- Per-story `budget` overrides are deep-merged by `getEffectiveConfig()` — see [[configs/config-effective]].
