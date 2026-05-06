---
type: policy
source: packages/core/src/policy/high-stakes-triggers.ts
---

# Policy: High-Stakes Triggers

**Type:** Policy Module  
**Source:** `packages/core/src/policy/high-stakes-triggers.ts`

## Responsibility
Determines whether the [[agents/high-stakes-reviewer]] should be queued for a completed chapter. Evaluates two independent triggers: a critical validator severity finding and an arc-end boundary match.

## Function Signature

```typescript
shouldRunReviewer(ctx: TriggerContext): {
  run: boolean;
  reason?: 'arc_end' | 'critical_severity';
}
```

### `TriggerContext`

```typescript
interface TriggerContext {
  chapterNumber:          number;
  arcEndChapter:          number | null;
  worstValidatorSeverity: 'low' | 'medium' | 'high' | 'critical' | 'none';
}
```

## Logic

Priority order — first match wins:

| Priority | Condition | Returns |
|---|---|---|
| 1 | `worstValidatorSeverity === 'critical'` | `{ run: true, reason: 'critical_severity' }` |
| 2 | `LONG_FORM_CONFIG.HIGH_STAKES_REVIEW_AT_ARC_END === true` AND `arcEndChapter === chapterNumber` | `{ run: true, reason: 'arc_end' }` |
| 3 | Otherwise | `{ run: false }` |

## Depends on
- [[configs/config-long-form]] — reads `HIGH_STAKES_REVIEW_AT_ARC_END` to gate the arc-end trigger
- [[packages/package-core]]

## Used by
- [[jobs/job-generate-chapter]] — called after [[agents/llm-validator]] completes; if `run === true`, enqueues [[jobs/job-high-stakes-review]] as an async follow-up

## Related flows
- [[jobs/job-high-stakes-review]] — the async job that runs when this policy returns `{ run: true }`
- [[agents/high-stakes-reviewer]] — the agent executed by that job
- [[configs/config-generation]] — also carries `HIGH_STAKES_REVIEW_AT_ARC_END` and `HIGH_STAKES_REVIEW_ON_CRITICAL` flags at the generation-config level (separate concept; this policy reads from `LONG_FORM_CONFIG` only)

## Notes
- `arcEndChapter === null` makes the arc-end branch evaluate to `false` cleanly — chapters not part of any planned arc never trigger an arc-end review.
- The `critical_severity` trigger is **unconditional** — it fires regardless of the `HIGH_STAKES_REVIEW_AT_ARC_END` flag. Only the arc-end trigger is gated by the config flag.
- This function is a pure function (no DB calls, no async) — straightforward to unit-test in isolation.
- The `high_stakes_reviewer` agent typically uses a stronger / more expensive model (configured separately via `modelFor('high_stakes_reviewer')`).
## Correction (2026-05-06) — only 2 trigger reasons shown; source has 6
This file's `shouldRunReviewer()` signature and Outputs section describe only `arc_end` and `critical_severity`. The source `packages/core/src/policy/high-stakes-triggers.ts` defines 6 reasons: `arc_boundary`, `arc_climax`, `critical_severity`, `breakthrough_or_death`, `packet_high_stakes`, `manual`. The `shouldRunReviewer()` function in core only gates on `critical_severity` and `arc_boundary` (using the LONG_FORM config flag), but the high-stakes-reviewer agent itself is called with all 6 reason types (some computed in the worker job, not in the policy function). Do not conflate the policy-gating function with the agent trigger reasons — they serve different layers.