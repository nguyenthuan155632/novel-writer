---
type: ai-agent
source: packages/ai/src/agents/arc-summary-compactor.ts
---

# Agent: Arc Summary Compactor

## Responsibility
Rolls per-chapter summaries into a rolling arc summary. Also reused for saga-level rolling summary. Max output: 1500 tokens.

## Source Evidence
`packages/ai/src/agents/arc-summary-compactor.ts` — `ArcSummaryCompactorAgent`

## Inputs
- Array of recent chapter summaries
- Existing rolling summary
- LLM provider

## Outputs
- Updated rolling summary string
- Written to [[database/tables/arcs]].`rollingSummary` or [[database/tables/sagas]].`rollingSummary`

## Prompt
- [[prompts/prompt-arc-summary-compactor-v2]]
- `maxOutputTokens: 1500`

## Depends On
- [[prompts/prompt-arc-summary-compactor-v2]]

## Used By
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]

## Related Tables
- [[database/tables/arcs]]
- [[database/tables/sagas]]
- [[database/tables/chapter-summaries]]
---
type: ai-agent
source: packages/ai/src/agents/arc-summary-compactor.ts
---

# Agent: Arc Summary Compactor

## Responsibility
Rolls per-chapter summaries into a rolling arc summary. Also reused for saga-level rolling summary. Max output tokens: 1500.

## Source Evidence
`packages/ai/src/agents/arc-summary-compactor.ts` — `ArcSummaryCompactorAgent`

## Inputs
- Array of recent chapter summaries
- Existing rolling summary
- LLM provider

## Outputs
- Updated rolling summary string
- Written to [[database/tables/arcs]].rollingSummary or [[database/tables/sagas]].rollingSummary

## Prompt
[[prompts/prompt-arc-summary-compactor-v2]] — maxOutputTokens: 1500

## Used By
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]

## Related Tables
- [[database/tables/arcs]]
- [[database/tables/sagas]]
- [[database/tables/chapter-summaries]]
