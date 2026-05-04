# Novel graph — jobs

## job-generate-batch

`jobs/job-generate-batch.md`

---
type: job
source: apps/worker/src/jobs/generate-batch.ts
---



Job: generate-batch Responsibility
Sequential batch coordinator. Runs chapters one at a time up to batch size. Handles per-chapter retry (3x). Escalates to safe mode on failures.



Job: generate-batch Source Evidence
`apps/worker/src/jobs/generate-batch.ts` — `runGenerateBatchJob()`



Job: generate-batch Queue
`generate-batch` (concurrency 1)



Job: generate-batch Job Data
- `storyId`, `batchId`, `startChapter`, `endChapter`, `mode`



Job: generate-batch Behavior
- Iterates chapters sequentially
- Per-chapter retry: up to 3 attempts
- Auto-escalation to `safe` mode on: critical validation, canon conflict, chapter failure
- Reads/writes [[database/tables/batches]]



Job: generate-batch Triggers
- [[jobs/job-generate-chapter]] for each chapter in batch



Job: generate-batch Reads
- [[database/tables/batches]]
- [[database/tables/arcs]]



Job: generate-batch Writes
- [[database/tables/batches]] — completedChapters, status, pausedReason



Job: generate-batch Depends On
- [[modules/queue-client]]
- [[configs/config-generation]] — SEMI_AUTO_BATCH_SIZE, FULL_AUTO_BATCH_SIZE
- [[packages/package-core]] — resolveEffectiveMode()



Job: generate-batch Related Flows
- [[flows/batch-generation-flow]]
---
type: job
source: apps/worker/src/jobs/generate-batch.ts
---



Job: generate-batch Responsibility
Sequential batch coordinator. Runs chapters one-at-a-time up to batch size with per-chapter retry (3x). Auto-escalates to safe mode on failures.



Job: generate-batch Source Evidence
`apps/worker/src/jobs/generate-batch.ts` — `runGenerateBatchJob()`



Job: generate-batch Queue
`generate-batch` (concurrency 1)



Job: generate-batch Job Data
- `storyId`, `batchId`, `startChapter`, `endChapter`, `mode` (safe/semi_auto/full_auto)



Job: generate-batch Behavior
- Iterates chapters sequentially
- Per-chapter retry: up to 3 attempts
- Auto-escalates to `safe` mode on: critical validation, canon conflict, chapter failure
- Batch sizes: safe=1, semi_auto=5, full_auto=30 (from [[configs/config-generation]])



Job: generate-batch Reads
- [[database/tables/batches]]
- [[database/tables/arcs]]



Job: generate-batch Writes
- [[database/tables/batches]] — completedChapters, status, pausedReason



Job: generate-batch Triggers
- [[jobs/job-generate-chapter]] per chapter



Job: generate-batch Related Flows
- [[flows/batch-generation-flow]]

---

## job-generate-chapter

`jobs/job-generate-chapter.md`

---
type: job
source: apps/worker/src/jobs/generate-chapter.ts
---



Job: generate-chapter Responsibility
The main chapter generation pipeline. Orchestrates 13 stages from packet planning through canon extraction and async follow-ups.



Job: generate-chapter Source Evidence
`apps/worker/src/jobs/generate-chapter.ts` — `runGenerateChapterJob()`, `executeGenerateChapterPipeline()`
`apps/worker/src/jobs/generate-chapter.types.ts`



Job: generate-chapter Queue
`generate-chapter` (concurrency 1)



Job: generate-chapter Job Data
- `storyId`, `chapterNumber`, `arcId`, `batchId?`, `traceId`
- `providerName` — snapshotted at dispatch from [[database/tables/llm-provider-state]]



Job: generate-chapter Pipeline Stages
See [[pipelines/chapter-generation-pipeline]] for full 13-stage breakdown.



Job: generate-chapter Agents Called (in order)
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



Job: generate-chapter Writes To
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



Job: generate-chapter Async Follow-ups (fire-and-forget)
- Enqueues [[jobs/job-refresh-arc-summary]]
- If `shouldRunReviewer()` → enqueues [[jobs/job-high-stakes-review]]



Job: generate-chapter Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
- [[flows/canon-reconciliation-flow]]
---
type: job
source: apps/worker/src/jobs/generate-chapter.ts
---



Job: generate-chapter Responsibility
Main chapter generation pipeline. Orchestrates 13 stages: plan → audit → context → write → validate → fix → extract → merge → summarise → finalise.



Job: generate-chapter Source Evidence
`apps/worker/src/jobs/generate-chapter.ts` — `runGenerateChapterJob()`, `executeGenerateChapterPipeline()`
`apps/worker/src/jobs/generate-chapter.types.ts`



Job: generate-chapter Queue
`generate-chapter` (concurrency 1)



Job: generate-chapter Job Data
- `storyId`, `chapterNumber`, `arcId`, `batchId?`, `traceId`
- `providerName` — snapshotted from [[database/tables/llm-provider-state]] at dispatch



Job: generate-chapter Pipeline
See [[pipelines/chapter-generation-pipeline]]



Job: generate-chapter Agents (in order)
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



Job: generate-chapter Writes To
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



Job: generate-chapter Async Follow-ups
- Always: enqueues [[jobs/job-refresh-arc-summary]]
- If `shouldRunReviewer()`: enqueues [[jobs/job-high-stakes-review]]



Job: generate-chapter Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
- [[flows/canon-reconciliation-flow]]

---

## job-generate-export

`jobs/job-generate-export.md`

---
type: job
source: apps/worker/src/jobs/generate-export.ts
---



Job: generate-export Responsibility
Async export of story chapters to markdown or epub file.



Job: generate-export Source Evidence
`apps/worker/src/jobs/generate-export.ts` — `runGenerateExportJob()`



Job: generate-export Queue
`generate-export` (concurrency 2)



Job: generate-export Job Data
- `storyId`, `format` (markdown/epub), `chapterRange?`



Job: generate-export Behavior
- For >200 chapters: always async (enqueued from [[routes/route-exports]])
- For ≤200 chapters: can be sync from API
- Writes output to `EXPORT_OUTPUT_DIR` (default `./exports`)



Job: generate-export Depends On
- [[packages/package-core]] exporters: `epub-exporter.ts`, `markdown-exporter.ts`
- [[database/tables/chapters]]
- [[configs/config-export]]
---
type: job
source: apps/worker/src/jobs/generate-export.ts
---



Job: generate-export Responsibility
Async export of story chapters to markdown or epub file format.



Job: generate-export Source Evidence
`apps/worker/src/jobs/generate-export.ts` — `runGenerateExportJob()`



Job: generate-export Queue
`generate-export` (concurrency 2)



Job: generate-export Job Data
- `storyId`, `format` (markdown/epub), optional `chapterRange`



Job: generate-export Behavior
- Triggered async for >200 chapters (sync threshold from [[configs/config-export]])
- Output dir: `EXPORT_OUTPUT_DIR` (default `./exports`)



Job: generate-export Depends On
- [[packages/package-core]] — epub-exporter, markdown-exporter
- [[database/tables/chapters]]
- [[configs/config-export]]

---

## job-high-stakes-review

`jobs/job-high-stakes-review.md`

---
type: job
source: apps/worker/src/jobs/high-stakes-review.ts
---



Job: high-stakes-review Responsibility
Deep LLM review of chapters at arc end, on critical severity validation findings, or manually triggered. Persists review to DB.



Job: high-stakes-review Source Evidence
`apps/worker/src/jobs/high-stakes-review.ts` — `runHighStakesReviewJob()`



Job: high-stakes-review Queue
`high-stakes-review` (concurrency 1)



Job: high-stakes-review Trigger Reasons
- `arc_end` — last chapter of an arc
- `critical_severity` — LLM validator found critical issue
- `manual` — operator triggered via API



Job: high-stakes-review Trigger Policy
`shouldRunReviewer()` from [[packages/package-core]] policy



Job: high-stakes-review Calls
- [[agents/high-stakes-reviewer]]



Job: high-stakes-review Writes
- [[database/tables/high-stakes-reviews]]



Job: high-stakes-review Related Flows
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]
---
type: job
source: apps/worker/src/jobs/high-stakes-review.ts
---



Job: high-stakes-review Responsibility
Deep LLM review at arc-end, critical-severity validation, or manual trigger. Persists result.



Job: high-stakes-review Source Evidence
`apps/worker/src/jobs/high-stakes-review.ts` — `runHighStakesReviewJob()`



Job: high-stakes-review Queue
`high-stakes-review` (concurrency 1)



Job: high-stakes-review Trigger Reasons
- `arc_end` — last chapter of an arc
- `critical_severity` — LLM validator found critical issue
- `manual` — operator via API



Job: high-stakes-review Trigger Policy
`shouldRunReviewer()` from [[packages/package-core]]



Job: high-stakes-review Calls
- [[agents/high-stakes-reviewer]]



Job: high-stakes-review Writes
- [[database/tables/high-stakes-reviews]]



Job: high-stakes-review Related Flows
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]

---

## job-refresh-arc-summary

`jobs/job-refresh-arc-summary.md`

---
type: job
source: apps/worker/src/jobs/refresh-arc-summary.ts
---



Job: refresh-arc-summary Responsibility
Refreshes the rolling arc summary from recent chapter summaries. Triggers saga summary refresh every 20 chapters.



Job: refresh-arc-summary Source Evidence
`apps/worker/src/jobs/refresh-arc-summary.ts` — `runRefreshArcSummaryJob()`



Job: refresh-arc-summary Queue
`refresh-arc-summary` (concurrency 1)



Job: refresh-arc-summary Trigger
Fire-and-forget from [[jobs/job-generate-chapter]] after each chapter completes.
Refresh interval: every `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` (=5) chapters.



Job: refresh-arc-summary Calls
- [[agents/arc-summary-compactor]]



Job: refresh-arc-summary Reads
- [[database/tables/chapter-summaries]]
- [[database/tables/arcs]]



Job: refresh-arc-summary Writes
- [[database/tables/arcs]] — `rollingSummary`, `summaryVersion`, `summaryUpdatedAt`



Job: refresh-arc-summary Triggers
- [[jobs/job-refresh-saga-summary]] (every 20 chapters)



Job: refresh-arc-summary Related Flows
- [[flows/job-worker-flow]]
---
type: job
source: apps/worker/src/jobs/refresh-arc-summary.ts
---



Job: refresh-arc-summary Responsibility
Refreshes rolling arc summary from recent chapter summaries every 5 chapters. Then triggers saga summary refresh every 20 chapters.



Job: refresh-arc-summary Source Evidence
`apps/worker/src/jobs/refresh-arc-summary.ts` — `runRefreshArcSummaryJob()`



Job: refresh-arc-summary Queue
`refresh-arc-summary` (concurrency 1)



Job: refresh-arc-summary Trigger
Fire-and-forget from [[jobs/job-generate-chapter]] after each chapter.
Interval: `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` = 5



Job: refresh-arc-summary Calls
- [[agents/arc-summary-compactor]]



Job: refresh-arc-summary Reads
- [[database/tables/chapter-summaries]]
- [[database/tables/arcs]]



Job: refresh-arc-summary Writes
- [[database/tables/arcs]] — rollingSummary, summaryVersion, summaryUpdatedAt



Job: refresh-arc-summary Triggers
- [[jobs/job-refresh-saga-summary]] (every 20 chapters)



Job: refresh-arc-summary Related Flows
- [[flows/job-worker-flow]]

---

## job-refresh-saga-summary

`jobs/job-refresh-saga-summary.md`

---
type: job
source: apps/worker/src/jobs/refresh-saga-summary.ts
---



Job: refresh-saga-summary Responsibility
Refreshes rolling saga summary from arc summaries.



Job: refresh-saga-summary Source Evidence
`apps/worker/src/jobs/refresh-saga-summary.ts` — `runRefreshSagaSummaryJob()`



Job: refresh-saga-summary Queue
`refresh-saga-summary` (concurrency 1)



Job: refresh-saga-summary Trigger
Fire-and-forget from [[jobs/job-refresh-arc-summary]] every 20 chapters.
Refresh interval: `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` (=20).



Job: refresh-saga-summary Calls
- [[agents/arc-summary-compactor]] (used for both arc and saga level)



Job: refresh-saga-summary Reads
- [[database/tables/arcs]] — arc rollingSummaries
- [[database/tables/sagas]]



Job: refresh-saga-summary Writes
- [[database/tables/sagas]] — `rollingSummary`, `summaryVersion`, `summaryUpdatedAt`



Job: refresh-saga-summary Related Flows
- [[flows/job-worker-flow]]
---
type: job
source: apps/worker/src/jobs/refresh-saga-summary.ts
---



Job: refresh-saga-summary Responsibility
Refreshes rolling saga summary from arc summaries every 20 chapters.



Job: refresh-saga-summary Source Evidence
`apps/worker/src/jobs/refresh-saga-summary.ts` — `runRefreshSagaSummaryJob()`



Job: refresh-saga-summary Queue
`refresh-saga-summary` (concurrency 1)



Job: refresh-saga-summary Trigger
Fire-and-forget from [[jobs/job-refresh-arc-summary]] every 20 chapters.
Interval: `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` = 20



Job: refresh-saga-summary Calls
- [[agents/arc-summary-compactor]] (reused for saga level)



Job: refresh-saga-summary Reads
- [[database/tables/arcs]] — arc rollingSummaries
- [[database/tables/sagas]]



Job: refresh-saga-summary Writes
- [[database/tables/sagas]] — rollingSummary, summaryVersion, summaryUpdatedAt



Job: refresh-saga-summary Related Flows
- [[flows/job-worker-flow]]

---
