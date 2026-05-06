---
type: ai-agent
source: packages/ai/src/agents/high-stakes-reviewer.ts
---

# Agent: High Stakes Reviewer

## Responsibility
Deep review agent for arc-end chapters or chapters with critical severity validator findings. Outputs approve/reject with concerns and recommended actions.

## Source Evidence
`packages/ai/src/agents/high-stakes-reviewer.ts` — `HighStakesReviewerAgent`

## Inputs
- Chapter content + context
- Trigger reason: `arc_end`, `critical_severity`, `manual`
- LLM provider

## Outputs
- `HighStakesReviewSchema`: `{ approve, concerns, recommendedActions, tokens, costUsd }`
- Persisted to [[database/tables/high-stakes-reviews]]

## Prompt
- [[prompts/prompt-high-stakes-reviewer-v2]]

## Schema
`packages/ai/src/schemas/high-stakes-review.ts` — `HighStakesReviewSchema`

## Depends On
- [[prompts/prompt-high-stakes-reviewer-v2]]

## Used By
- [[jobs/job-high-stakes-review]]

## Related Tables
- [[database/tables/high-stakes-reviews]]

## Related Flows
- [[flows/validation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/high-stakes-reviewer.ts
---

# Agent: High Stakes Reviewer

## Responsibility
Deep review agent for arc-end chapters or critical validator findings. Approve/reject with concerns and recommended actions.

## Source Evidence
`packages/ai/src/agents/high-stakes-reviewer.ts` — `HighStakesReviewerAgent`

## Inputs
- Chapter content + context
- Trigger reason: arc_end / critical_severity / manual
- LLM provider

## Outputs
- `HighStakesReviewSchema`: `{ approve, concerns, recommendedActions, tokens, costUsd }`
- Persisted to [[database/tables/high-stakes-reviews]]

## Prompt
[[prompts/prompt-high-stakes-reviewer-v2]]

## Schema
`packages/ai/src/schemas/high-stakes-review.ts`

## Used By
- [[jobs/job-high-stakes-review]]

## Related Tables
- [[database/tables/high-stakes-reviews]]

## Related Flows
- [[flows/validation-flow]]
## High Stakes Reviewer — Phase 5 Routing (2026-05-05)
Now supports `critical_severity` trigger (in addition to `arc_end` and `manual`). Agent updated to handle higher throughput routing from the slot pipeline. Review schema unchanged.
## Trigger Reasons (corrected)
Source defines 6 trigger reasons (not 3):
- `arc_boundary` — arc start/end
- `arc_climax` — arc climax chapter
- `critical_severity` — critical validator finding
- `breakthrough_or_death` — cultivation milestone event
- `packet_high_stakes` — high-stakes packet flag
- `manual` — human-initiated review

Previously documented only `arc_end` and `critical_severity` + `manual`. `arc_boundary` and `arc_climax` are distinct from `arc_end`.
## Correction (2026-05-06) — First Block Still Shows 3 Trigger Reasons
The first frontmatter+markdown block (and the first Inputs line) still say trigger reasons are `arc_end`, `critical_severity`, `manual` (3 total). The "Trigger Reasons (corrected)" section at the bottom correctly lists 6: `arc_boundary`, `arc_climax`, `critical_severity`, `breakthrough_or_death`, `packet_high_stakes`, `manual`. Consolidate the first block to match the corrected list.