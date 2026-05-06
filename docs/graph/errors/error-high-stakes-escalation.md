---
type: error
---

# Error: High-Stakes Escalation

## Trigger

`shouldRunReviewer()` from `packages/core/src/policy/high-stakes-triggers.ts` returns `true` at the end of [[jobs/job-generate-chapter]] (after the chapter has been written and validated).

## Causes

| Cause | Condition |
|-------|-----------|
| Critical severity finding | LLM validator returned `severity = 'critical'` during [[flows/validation-flow]] |
| Arc-end chapter | The chapter number is the last chapter in its arc |
| Arc-start chapter | The chapter is the first of a new arc |
| Manual trigger | Human requests review via `POST /api/stories/:storyId/chapters/:num/review` (→ [[routes/reviews]]) |

## Effect

- [[jobs/job-high-stakes-review]] enqueued **asynchronously** (fire-and-forget) at the end of [[jobs/job-generate-chapter]]
- The chapter itself **is still completed** before the review runs — this is a post-completion check, not a blocking one
- [[agents/high-stakes-reviewer]] runs the deep review
- Result stored in [[database/tables/high-stakes-reviews]] with `{ approve, concerns, recommendedActions }`
- If reviewer does **not** approve: generation mode may auto-escalate to `safe` for subsequent chapters

## Timeline

```
chapter generation → chapter completed → HighStakesReview enqueued (async)
                                                ↓
                                    high-stakes-review job picked up
                                                ↓
                                    HighStakesReviewerAgent runs
                                                ↓
                                    Result in high_stakes_reviews table
```

This is a non-blocking review. The next chapter in a batch may already be queued by the time the review completes.

## Related

- [[jobs/job-high-stakes-review]]
- [[agents/high-stakes-reviewer]]
- [[database/tables/high-stakes-reviews]]
- [[errors/error-validation-failure]] — critical severity is one trigger cause
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
## Correction (2026-05-06) — "Arc-start chapter" Is Not a Separate Trigger
The Causes table lists "Arc-start chapter" as a separate trigger. This is not accurate — `shouldRunReviewer()` only fires on `arc_end` (last chapter of arc). Arc-start chapters do not independently trigger the high-stakes review. The 6 actual trigger reasons in the system are: `arc_boundary` (covers arc start/end boundary detection in the worker job), `arc_climax`, `critical_severity`, `breakthrough_or_death`, `packet_high_stakes`, `manual`. Remove "Arc-start chapter" from the Causes table or clarify it only fires as part of arc boundary detection when the preceding arc ended.