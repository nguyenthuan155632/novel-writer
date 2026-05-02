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
