---
type: ai-agent
source: packages/ai/src/agents/summary-compactor.ts
---

# Agent: Summary Compactor

## Responsibility
Compacts a full chapter into a short summary (paragraph-level). The summary is embedded via [[modules/embedding-service]] and stored for future context retrieval.

## Source Evidence
`packages/ai/src/agents/summary-compactor.ts` — `SummaryCompactor`

## Inputs
- Full chapter content
- LLM provider

## Outputs
- `SummaryCompactorOutputSchema`: `{ summary: string }`
- Summary + embedding written to [[database/tables/chapter-summaries]]

## Prompt
- [[prompts/prompt-summary-compactor-v2]]

## Schema
`packages/ai/src/schemas/summary.ts` — `SummaryCompactorOutputSchema`

## Depends On
- [[prompts/prompt-summary-compactor-v2]]
- [[modules/embedding-service]] — embeds the summary

## Used By
- [[jobs/job-generate-chapter]] (Stage 11 — SUMMARY COMPACTION)

## Related Tables
- [[database/tables/chapter-summaries]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/summary-compactor.ts
---

# Agent: Summary Compactor

## Responsibility
Compacts full chapter content into a short summary. Summary is then embedded via [[modules/embedding-service]] for future vector retrieval.

## Source Evidence
`packages/ai/src/agents/summary-compactor.ts` — `SummaryCompactor`

## Inputs
- Full chapter content
- LLM provider

## Outputs
- `SummaryCompactorOutputSchema`: `{ summary: string }`
- Summary + 1536-dim embedding → [[database/tables/chapter-summaries]]

## Prompt
[[prompts/prompt-summary-compactor-v2]]

## Schema
`packages/ai/src/schemas/summary.ts`

## Used By
- [[jobs/job-generate-chapter]] (Stage 11 — SUMMARY)

## Related Tables
- [[database/tables/chapter-summaries]]
