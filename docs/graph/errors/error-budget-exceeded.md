---
type: error
---

# Error: Budget Exceeded

## Trigger

`checkAgainstCaps()` in [[modules/budget-guard]] (API side) or `packages/core/src/policy/budget-guardrails.ts` (worker side) returns `state = 'breach'` when accumulated LLM spend reaches a hard cap.

Checked at **two points**:
1. **Pre-enqueue** (API): [[modules/budget-guard]] blocks the HTTP request before the job is even queued
2. **Mid-pipeline** (Worker): `checkAgainstCaps()` evaluated during generation; job fails if breach detected

## Hard Caps

| Scope | Default Limit |
|-------|--------------|
| Per-chapter | $0.05 |
| Daily (rolling) | $5.00 |
| Monthly (rolling) | $50.00 |

Per-story overrides are possible via [[database/tables/story-settings]], loaded with `getEffectiveConfig(storyId, provider)`.

## Effect

- Chapter generation blocked before it starts (API pre-check) — HTTP 402 returned to caller
- OR chapter job fails mid-pipeline (worker check) — chapter status set to `failed`
- [[database/tables/chapters]] — `status = 'failed'`, `failureReason` field populated
- No further LLM calls are made after the breach is detected

## Logged To

- [[database/tables/llm-calls]] — all prior LLM costs for the current period are tracked here; the rollup is what triggers the cap
- [[database/tables/chapters]] — `failureReason` field

## Recovery

- Wait for the daily/monthly cap period to reset (rolling window)
- Increase per-story budget overrides in [[database/tables/story-settings]]
- Switch to a cheaper model via `PUT /api/admin/models` (→ [[routes/admin]])
- Reduce context window sizes in `story_settings` to lower token usage per call

## Related

- [[modules/budget-guard]] — API-side pre-enqueue check
- [[modules/cost-tracker]] — accumulates rolling costs into `story_costs`
- [[database/tables/llm-calls]] — source of truth for spend data
- [[flows/chapter-generation-flow]]
- [[flows/llm-provider-flow]]
