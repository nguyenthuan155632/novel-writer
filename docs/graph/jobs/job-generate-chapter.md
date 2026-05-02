---
type: job
source: apps/worker/src/jobs/generate-chapter.ts
---

# Job: generate-chapter

## Responsibility
The main chapter generation pipeline. Orchestrates 13 stages from packet planning through canon extraction and async follow-ups.

## Source Evidence
`apps/worker/src/jobs/generate-chapter.ts` — `runGenerateChapterJob()`, `executeGenerateChapterPipeline()`
`apps/worker/src/jobs/generate-chapter.types.ts`

## Queue
`generate-chapter` (concurrency 1)

## Job Data
- `storyId`, `chapterNumber`, `arcId`, `batchId?`, `traceId`
- `providerName` — snapshotted at dispatch from [[database/tables/llm-provider-state]]

## Pipeline Stages
See [[pipelines/chapter-generation-pipeline]] for full 13-stage breakdown.

## Agents Called (in order)
1. [[agents/packet-generator]] → Plan
2. [[validators/packet-auditor]] → Audit
3. [[modules/context-builder]] → Build context
4. [[agents/writer]] → Write chapter
5. [[validators/deterministic-runner]] → Deterministic validation
6. [[agents/llm-validator]] → LLM validation
7. [[agents/auto-fixer]] → Auto-fix (conditional)
8. [[agents/canon-extractor]] → Extract facts
9. [[modules/canon-merger]] → Merge canon
10. [[agents/summary-compactor]] → Compact summary

## Writes To
- [[database/tables/chapters]] — content, title, status, wordCount
- [[database/tables/chapter-packets]] — generated packet
- [[database/tables/context-packets]] — context snapshot
- [[database/tables/validations]] — deterministic + LLM results
- [[database/tables/characters]] — via canon merger
- [[database/tables/canon-facts]] — via canon merger
- [[database/tables/open-threads]] — via canon merger
- [[database/tables/planted-seeds]] — paid_off
- [[database/tables/timeline-events]] — via canon merger
- [[database/tables/chapter-summaries]] — compact summary + embedding
- [[database/tables/llm-calls]] — via LoggedLLMProvider

## Async Follow-ups (fire-and-forget)
- Enqueues [[jobs/job-refresh-arc-summary]]
- If `shouldRunReviewer()` → enqueues [[jobs/job-high-stakes-review]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
- [[flows/canon-reconciliation-flow]]
---
type: job
source: apps/worker/src/jobs/generate-chapter.ts
---

# Job: generate-chapter

## Responsibility
Main chapter generation pipeline. Orchestrates 13 stages: plan → audit → context → write → validate → fix → extract → merge → summarise → finalise.

## Source Evidence
`apps/worker/src/jobs/generate-chapter.ts` — `runGenerateChapterJob()`, `executeGenerateChapterPipeline()`
`apps/worker/src/jobs/generate-chapter.types.ts`

## Queue
`generate-chapter` (concurrency 1)

## Job Data
- `storyId`, `chapterNumber`, `arcId`, `batchId?`, `traceId`
- `providerName` — snapshotted from [[database/tables/llm-provider-state]] at dispatch

## Pipeline
See [[pipelines/chapter-generation-pipeline]]

## Agents (in order)
1. [[agents/packet-generator]]
2. [[validators/packet-auditor]]
3. [[modules/context-builder]]
4. [[agents/writer]]
5. [[validators/deterministic-runner]]
6. [[agents/llm-validator]]
7. [[agents/auto-fixer]] (conditional)
8. [[agents/canon-extractor]]
9. [[modules/canon-merger]]
10. [[agents/summary-compactor]]

## Writes To
- [[database/tables/chapters]]
- [[database/tables/chapter-packets]]
- [[database/tables/context-packets]]
- [[database/tables/validations]]
- [[database/tables/characters]]
- [[database/tables/canon-facts]]
- [[database/tables/open-threads]]
- [[database/tables/planted-seeds]]
- [[database/tables/timeline-events]]
- [[database/tables/chapter-summaries]]
- [[database/tables/llm-calls]]

## Async Follow-ups
- Always: enqueues [[jobs/job-refresh-arc-summary]]
- If `shouldRunReviewer()`: enqueues [[jobs/job-high-stakes-review]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
- [[flows/canon-reconciliation-flow]]
