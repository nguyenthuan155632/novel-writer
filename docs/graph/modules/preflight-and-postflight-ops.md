---
type: module
source: apps/api/src/services/preflight.ts; apps/worker/src/services/post-flight-audit.ts; apps/worker/src/services/metrics.ts
---

# Module: Preflight and Post-flight Ops

## Responsibility
Adds operational gates before chapter enqueue and nightly audit checks after generation.

## Preflight
- `runGeneratePreflight({ storyId, chapterNumber })`
- Checks: latest story bible exists, chapter falls inside an arc range, budget guard passes, active provider row exists.
- Route hook: `POST /api/stories/:storyId/chapters/generate` returns `preflight_failed` before enqueue when any check fails.

## Post-flight audit
- `runPostFlightAudit({ db, logger })`
- Finds chapter summaries missing embeddings.
- Re-runs stale generating chapter reset once.
- Warns when pending canon updates older than 7 days exceed 50.
- Worker loop runs daily and only executes at 04:00 UTC.

## Metrics
- In-memory worker counters: `stale_jobs_reset_total`, `audit_regenerate_total`, `polish_pass_applied_total`, `slot_based_chapters_total`, `anti_llm_pattern_hits_total`, `parse_recovery_total`.
- Stale reset path warns when count reaches 3 within 1 hour.

## Batch resume
- `batches` now track `checkpoint_chapter` and `resumed_from_chapter`.
- Worker persists checkpoint after each completed chapter.
- Admin resume endpoint: `POST /api/admin/batches/:batchId/resume`.

## Phase 7 seed activation
- Saga planner output now allows `parallelThreads[]` and `convergencePoints[]` per saga.
- `sagas` schema stores `parent_timeline_id`, `parallel_threads`, and `convergence_points`.
- `timeline_events` schema stores optional `thread_id` and `parallel_saga_id` for later cross-thread retrieval.
