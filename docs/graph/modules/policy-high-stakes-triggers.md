---
type: module
source: packages/core/src/policy/high-stakes-triggers.ts
---

# Module: Policy — High-Stakes Triggers

**Type:** Module  
**Source:** `packages/core/src/policy/high-stakes-triggers.ts`

## Responsibility
Determines whether a high-stakes review should be triggered for a chapter, based on validator severity and arc boundaries.

## Key exports / functions
- `shouldRunReviewer(ctx: TriggerContext): { run: boolean; reason?: 'arc_end' | 'critical_severity' }`

## Inputs (`TriggerContext`)
| Field | Type | Description |
|-------|------|-------------|
| `chapterNumber` | `number` | Current chapter being evaluated |
| `arcEndChapter` | `number \| null` | The last chapter of the current arc (null if unknown) |
| `worstValidatorSeverity` | `'low' \| 'medium' \| 'high' \| 'critical' \| 'none'` | Worst severity from validation passes |

## Outputs
- `{ run: false }` — no review needed
- `{ run: true, reason: 'critical_severity' }` — triggered by critical validator finding
- `{ run: true, reason: 'arc_end' }` — triggered by arc boundary (when `LONG_FORM_CONFIG.HIGH_STAKES_REVIEW_AT_ARC_END` is `true`)

## Trigger conditions (priority order)
1. `worstValidatorSeverity === 'critical'` → always triggers
2. `HIGH_STAKES_REVIEW_AT_ARC_END && arcEndChapter === chapterNumber` → arc boundary trigger

## Depends on
- `@novel/core` — for `LONG_FORM_CONFIG`

## Used by
- [[jobs/job-generate-chapter]] — decides whether to enqueue [[jobs/job-high-stakes-review]]

## Related flows
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]

## See also
- [[agents/high-stakes-reviewer]]
## Correction (2026-05-06) — only 2 trigger reasons shown; source has 6
This file (sister to configs/policy-high-stakes-triggers.md, same content) shows only `arc_end` and `critical_severity`. The actual `shouldRunReviewer()` in core uses only those two as gating signals, but `high-stakes-reviewer.ts` agent handles 6 reason types: `arc_boundary`, `arc_climax`, `critical_severity`, `breakthrough_or_death`, `packet_high_stakes`, `manual`. The worker job computes some of these reasons (e.g., `packet_high_stakes`, `breakthrough_or_death`) before calling the agent. Update to reflect the full 6-type picture or clarify the distinction between policy-gating triggers and agent routing triggers.