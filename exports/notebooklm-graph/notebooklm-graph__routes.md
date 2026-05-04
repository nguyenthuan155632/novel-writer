# Novel graph — routes

## admin

`routes/admin.md`

---
type: route
source: apps/api/src/routes/admin.ts
---



Route: Admin Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/admin.ts`
Exposes operational controls for switching LLM providers, overriding per-role model routes, and reading system-wide metrics snapshots.



Route: Admin Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/metrics` | Returns a system metrics snapshot via `AdminMetricsService.snapshot()` |
| GET | `/api/admin/provider` | Returns the current active provider and its status |
| PUT | `/api/admin/provider` | Switches the active LLM provider; body validated by `ProviderBodySchema` |
| GET | `/api/admin/models` | Returns per-role model routes for the active provider |
| PUT | `/api/admin/models` | Overrides per-role model routes for the active provider; body validated by `ModelRoutesSchema` |



Route: Admin Inputs
- **`ProviderBodySchema`** — `{ provider: 'opencode' | 'openrouter' | 'ollama' | 'vmlx' }`
- **`ModelRoutesSchema`** — `{ routes: { [AgentRole]: string? } }` — roles enumerated dynamically from `MODEL_OPTIONS`
- No URL params



Route: Admin Outputs
- `GET /admin/metrics` → arbitrary metrics object from `AdminMetricsService`
- `GET /api/admin/provider` → provider status object
- `PUT /api/admin/provider` → updated provider status object
- `GET /api/admin/models` → `{ routes: Record }`
- `PUT /api/admin/models` → updated model routes object



Route: Admin Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()` (used inside `AdminMetricsService`)
- [[package-core]] — `AdminMetricsService`, `MODEL_OPTIONS`
- [[modules/provider-switcher]] — `getProviderStatus`, `setActiveProvider`, `getModelStatusForActiveProvider`, `setModelRoutesForActiveProvider`



Route: Admin Used by
- [[app-web]] — admin dashboard calls these endpoints
- [[app-api]] — registered here



Route: Admin Related database tables
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]



Route: Admin Related flows
- (none — purely synchronous control-plane operations)



Route: Admin Related domain concepts
- LLM provider switching (runtime hot-swap of the active provider)
- Model routing (mapping `AgentRole` → model string at runtime)

---

## arcs

`routes/arcs.md`

---
type: route
source: apps/api/src/routes/arcs.ts
---



Route: Arcs Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/arcs.ts`
Lists arcs within a saga, fetches a single arc by ID, and triggers AI-driven arc planning via `ArcPlannerAgent`.



Route: Arcs Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/sagas/:sagaId/arcs` | Lists all arcs for a saga, ordered by `arcNumber` asc |
| GET | `/api/stories/:storyId/arcs/:arcId` | Fetches a single arc by ID; 404 if not found |
| POST | `/api/stories/:storyId/sagas/:sagaId/arcs/plan` | Runs `ArcPlannerAgent` and persists resulting arcs; 404 if saga not found |



Route: Arcs Inputs
- **`SagaParam`** — `{ storyId: UUID, sagaId: UUID }`
- **`ArcParam`** — `{ storyId: UUID, arcId: UUID }`
- **`PlanBody`** — `{ currentState: string (1–4000 chars) }` — description of current story state passed to the planner



Route: Arcs Outputs
- `GET .../arcs` → `{ arcs: Arc[] }`
- `GET .../arcs/:arcId` → `{ arc: Arc }` or `404 arc_not_found`
- `POST .../arcs/plan` → `{ promptVersion, usage, ...persistCounts }`



Route: Arcs Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `arcs`, `sagas` tables
- [[agents/arc-planner]] — `ArcPlannerAgent` class; prompt registered via `arc-planner.v2`
- [[modules/story-domain]] — `loadStoryDomainContext()` to load `genreDef` and `storyOptions`
- `lib/llm-provider.ts` → `buildLoggedProvider()` — constructs the `LoggedLLMProvider` instance
- `lib/llm-settings.ts` → `getModelStatusForActiveProviderFromDb()` — resolves the `arc_planner` model route



Route: Arcs Used by
- [[app-web]] — arc planning and listing UI
- [[app-api]] — registered here



Route: Arcs Related database tables
- [[database/tables/arcs]]
- [[database/tables/sagas]]



Route: Arcs Related flows
- [[flows/chapter-generation-flow]] — arcs must exist before a chapter can be generated



Route: Arcs Related domain concepts
- Arc planning (AI-generated narrative structure within a saga)
- Story domain context (genre definition, story options)

---

## batches

`routes/batches.md`

---
type: route
source: apps/api/src/routes/batches.ts
---



Route: Batches Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/batches.ts`
Manages multi-chapter batch generation jobs — creates, lists, cancels, and retries batches by inserting `batches` rows and enqueuing `generate-batch` BullMQ jobs.



Route: Batches Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/batches` | Lists all batches for a story, ordered by `startedAt` desc |
| POST | `/api/stories/:storyId/batches` | Creates a batch row and enqueues a `generate-batch` job; returns 202 with `{ batch, jobId }` |
| POST | `/api/stories/:storyId/batches/:batchId/cancel` | Marks the batch `cancelled` and sets `finishedAt` |
| POST | `/api/stories/:storyId/batches/:batchId/retry` | Re-enqueues a `failed` or `paused` batch; 409 if batch is not retryable |



Route: Batches Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`BatchParam`** — `{ storyId: UUID, batchId: UUID }`
- **`StartBody`** — `{ startChapter: int, endChapter: int (≥ startChapter), mode: 'safe' | 'semi_auto' | 'full_auto' }`



Route: Batches Outputs
- `GET .../batches` → `{ batches: Batch[] }`
- `POST .../batches` → `202 { batch: Batch, jobId: string }`
- `POST .../cancel` → `{ status: 'cancelled' }`
- `POST .../retry` → `202 { batch: Batch, jobId: string }` or `409 batch_not_retryable`



Route: Batches Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; inserts/updates `batches` table
- [[modules/queue-client]] — `getGenerateBatchQueue()` to enqueue `generate-batch` jobs
- [[modules/provider-switcher]] — `getQueueLlmSnapshot()` — snapshots current provider + model routes into job payload
- `@novel/core/trace` → `newTraceId()` — generates trace IDs for observability



Route: Batches Used by
- [[app-web]] — batch generation UI panel
- [[app-api]] — registered here



Route: Batches Related database tables
- [[database/tables/batches]]



Route: Batches Related flows
- [[flows/job-worker-flow]] — the enqueued `generate-batch` job is processed by the worker
- [[flows/chapter-generation-flow]] — a batch triggers sequential chapter generation



Route: Batches Related domain concepts
- Generation modes (`safe`, `semi_auto`, `full_auto`) — control batch size and escalation
- Trace ID propagation — every job carries a `traceId` for end-to-end observability

---

## bible

`routes/bible.md`

---
type: route
source: apps/api/src/routes/bible.ts
---



Route: Bible Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/bible.ts`
Generates, retrieves, and version-patches the story bible, and manages style few-shot examples; locks the story genre on first generation.



Route: Bible Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stories/:id/bible` | Runs `generateBible` agent, inserts a new `storyBibles` row (version+1), sets `stories.genreLockedAt`; returns 201 |
| GET | `/api/stories/:id/bible` | Returns the latest bible version; 404 if none exists |
| PUT | `/api/stories/:id/bible` | Applies a partial patch by inserting a new versioned row on top of the current one |
| PUT | `/api/stories/:storyId/bible/style-few-shots` | Replaces the `styleFewShots` array on a new versioned bible row; max 5 excerpts (20–2000 chars each) |



Route: Bible Inputs
- **`id` / `storyId`** — UUID path parameter
- **`UpdateBibleSchema`** (PUT bible) — optional fields: `worldRules`, `powerSystem`, `powerSystemKind`, `cultivationSystem`, `bloodlineSystem`, `styleGuide`, `forbiddenRules`, `endingDirection`, `compactSummary`, `styleFewShots`
- **`FewShotsSchema`** (PUT style-few-shots) — `{ fewShots: string[] }` — up to 5 strings, 20–2000 chars each
- POST has no body; all generation inputs come from the story record and loaded domain context



Route: Bible Outputs
- `POST` → `201 StoryBible` row (full object)
- `GET` → latest `StoryBible` row or `404 bible_not_found`
- `PUT bible` → new `StoryBible` row (bumped version)
- `PUT style-few-shots` → `200 { ok: true }` or `400 validation_failed`



Route: Bible Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; reads/writes `storyBibles`, updates `stories`
- [[agents/bible-generator]] — `generateBible()` function from `@novel/ai/agents/bible-generator`
- [[modules/story-domain]] — `loadStoryDomainContext()` to load `genreDef`, `personalityDef`, `storyOptions`
- `lib/llm-provider.ts` → `buildLoggedProvider()`
- `lib/llm-settings.ts` → `getModelStatusForActiveProviderFromDb()` — resolves `bible_generator` model route
- `@novel/core/trace` → `newTraceId()`



Route: Bible Used by
- [[app-web]] — story bible editor and generation trigger
- [[app-api]] — registered here



Route: Bible Related database tables
- [[database/tables/story-bibles]]
- [[database/tables/stories]]



Route: Bible Related flows
- [[flows/chapter-generation-flow]] — bible must exist before any chapter can be generated
- Saga planning gate — `sagas.ts` checks for a bible before calling `SagaPlannerAgent`



Route: Bible Related domain concepts
- Bible versioning (insert-only; latest version determined by `version DESC, createdAt DESC`)
- Genre locking (`stories.genreLockedAt` set on first bible generation; blocks genre changes thereafter)
- Power system taxonomy (`powerSystemKind` enum)
- Style few-shots (in-context writing style examples used by the writer agent)

---

## canon-facts

`routes/canon-facts.md`

---
type: route
source: apps/api/src/routes/canon-facts.ts
---



Route: Canon Facts Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/canon-facts.ts`
Provides manual management of canon fact records — listing, locking/unlocking importance level, and hard deletion.



Route: Canon Facts Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/canon-facts` | Lists all canon facts for a story, ordered by `importance` desc |
| PATCH | `/api/stories/:storyId/canon-facts/:factId/lock` | Sets `importance` to `'locked'` or `'medium'` and toggles the `locked` boolean flag |
| DELETE | `/api/stories/:storyId/canon-facts/:factId` | Hard-deletes a canon fact; 404 if not found |



Route: Canon Facts Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`FactParam`** — `{ storyId: UUID, factId: UUID }`
- **`LockBody`** (PATCH) — `{ locked: boolean }`



Route: Canon Facts Outputs
- `GET` → `{ facts: CanonFact[] }`
- `PATCH .../lock` → `{ fact: CanonFact }` or `404 fact_not_found`
- `DELETE` → `{ deleted: true }` or `404 fact_not_found`



Route: Canon Facts Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; reads/updates/deletes `canonFacts` table



Route: Canon Facts Used by
- [[app-web]] — canon review and management UI
- [[app-api]] — registered here



Route: Canon Facts Related database tables
- [[database/tables/canon-facts]]



Route: Canon Facts Related flows
- [[flows/chapter-generation-flow]] — canon facts are fed into the COLD tier of `buildContext()`



Route: Canon Facts Related domain concepts
- Canon integrity (facts extracted from generated chapters by `CanonExtractor`)
- Importance levels (`locked` > `high` > `medium` > `low`) — locked facts are never auto-overwritten
- Manual canon management (human override of AI-generated facts)

---

## chapters

`routes/chapters.md`

---
type: route
source: apps/api/src/routes/chapters.ts
---



Route: Chapters Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/chapters.ts`
Manages chapter records and orchestrates chapter generation — listing, reading, triggering generation, streaming live job status via SSE, and deleting the latest chapter with transactional cleanup.



Route: Chapters Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/chapters` | Lists all chapters (id, number, title, status, wordCount) ordered by chapter number desc |
| GET | `/api/stories/:storyId/chapters/:chapterNumber` | Fetches a full chapter record; 404 if not found |
| POST | `/api/stories/:storyId/chapters/generate` | Validates bible/saga/arc exist, enqueues `generate-chapter` job; 202 on success, 409 if planning steps missing |
| GET | `/api/stories/:storyId/chapters/:chapterNumber/status` | Returns BullMQ job status; 404 if no active job |
| GET | `/api/stories/:storyId/chapters/:chapterNumber/stream` | SSE stream that polls job status every 2 s; closes on `completed` or `failed` |
| DELETE | `/api/stories/:storyId/chapters/:chapterNumber` | Deletes the latest chapter only; transactional cleanup of timeline events, open threads, and canon facts; 409 if currently generating |



Route: Chapters Inputs
- **`ChapterParams`** — `{ storyId: UUID }`
- **`ChapterDetailParams`** — `{ storyId: UUID, chapterNumber: int (coerced) }`
- **`PostGenerateBody`** — `{ chapterNumber: int, mode: 'safe' | 'semi_auto' | 'full_auto' (default: 'safe') }`



Route: Chapters Outputs
- `GET .../chapters` → `{ chapters: ChapterSummary[] }` (partial fields)
- `GET .../chapters/:n` → `{ chapter: Chapter }` or `404`
- `POST .../generate` → `202 { jobId, storyId, chapterNumber }` or `409 { error: 'planning_required', missing: Array }`
- `GET .../status` → BullMQ status object or `404 no_active_job`
- `GET .../stream` → `text/event-stream` — events: `connected`, `status`
- `DELETE` → `204` or `400 only_latest_chapter_can_be_deleted` or `409 chapter_is_generating`



Route: Chapters Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `chapters`, `storyBibles`, `sagas`, `arcs`, `timelineEvents`, `openThreads`, `canonFacts`
- [[modules/queue-client]] — `enqueueGenerateChapter()`, `getGenerateChapterStatus()`
- [[modules/provider-switcher]] — `getQueueLlmSnapshot()` — snapshots provider + model routes into job payload
- `@novel/core/trace` → `newTraceId()`



Route: Chapters Used by
- [[app-web]] — chapter list, reader, generation controls, live status indicator
- [[app-api]] — registered here



Route: Chapters Related database tables
- [[database/tables/chapters]]
- [[database/tables/story-bibles]]
- [[database/tables/sagas]]
- [[database/tables/arcs]]
- [[database/tables/timeline-events]]
- [[database/tables/open-threads]]
- [[database/tables/canon-facts]]



Route: Chapters Related flows
- [[flows/chapter-generation-flow]] — the `generate-chapter` job is the main pipeline
- [[flows/job-worker-flow]] — BullMQ job lifecycle



Route: Chapters Related domain concepts
- Planning gate (`getMissingPlanningSteps`) — enforces bible → saga → arc prerequisite order
- Generation modes (`safe`, `semi_auto`, `full_auto`)
- SSE streaming — live chapter generation progress without WebSockets
- Transactional chapter deletion — rolls back associated timeline events and open thread references

---

## costs

`routes/costs.md`

---
type: route
source: apps/api/src/routes/costs.ts
---



Route: Costs Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/costs.ts`
Exposes LLM cost and token usage data for a story — overall budget summary against guardrail caps, per-agent breakdowns, and per-chapter breakdowns.



Route: Costs Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/costs/summary` | Returns `BudgetGuard.getStoryUsage()` alongside the static `BUDGET_GUARDRAILS` caps |
| GET | `/api/stories/:storyId/costs/by-agent` | Aggregates call count, total tokens, and total cost per `agentRole` over the last 30 days |
| GET | `/api/stories/:storyId/costs/by-chapter` | Aggregates total tokens and cost per `chapterId` across all time |



Route: Costs Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- No request bodies



Route: Costs Outputs
- `GET .../summary` → `{ usage: StoryUsage, caps: BudgetGuardrails }`
- `GET .../by-agent` → `{ rows: Array }`
- `GET .../by-chapter` → `{ rows: Array }`



Route: Costs Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `llmCalls` table with aggregates
- [[modules/budget-guard]] — `BudgetGuard` service class and `BUDGET_GUARDRAILS` constants (imported from `../services/budget-guard.ts`)



Route: Costs Used by
- [[app-web]] — cost dashboard and budget status panel
- [[app-api]] — registered here



Route: Costs Related database tables
- [[database/tables/llm-calls]]



Route: Costs Related flows
- (none — read-only analytics)



Route: Costs Related domain concepts
- Budget guardrails (per-chapter $0.05, daily $5.00, monthly $50.00)
- Cost attribution by agent role and chapter
- 30-day rolling window for per-agent aggregation

---

## exports

`routes/exports.md`

---
type: route
source: apps/api/src/routes/exports.ts
---



Route: Exports Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/exports.ts`
Exports a story's completed chapters as a downloadable Markdown or EPUB file; delegates to an async queue job when the chapter count exceeds the synchronous threshold.



Route: Exports Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stories/:storyId/exports` | Exports the story; renders synchronously for small stories, enqueues `generate-export` job for large ones |



Route: Exports Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`ExportBody`** — `{ format: 'markdown' | 'epub' }` — validated against `EXPORT_CONFIG.SUPPORTED_FORMATS`



Route: Exports Outputs
- **Synchronous (small story):**
- `markdown` → `200` with `Content-Type: text/markdown`, `Content-Disposition: attachment; filename=".md"`
- `epub` → `200` with `Content-Type: application/epub+zip`, `Content-Disposition: attachment; filename=".epub"`
- **Async (large story, > `SYNC_CHAPTER_THRESHOLD`):**
- `202 { status: 'queued', jobId }`
- Error responses: `400 invalid_format`, `404 not_found`



Route: Exports Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; reads `stories` and `chapters` (content + non-null filter)
- [[package-core]] — `EXPORT_CONFIG`, `renderMarkdown()`, `renderEpub()` (epub-exporter, markdown-exporter)
- [[modules/queue-client]] — `enqueueGenerateExport()` for async large-story exports



Route: Exports Used by
- [[app-web]] — export button in story toolbar
- [[app-api]] — registered here



Route: Exports Related database tables
- [[database/tables/stories]]
- [[database/tables/chapters]]



Route: Exports Related flows
- [[flows/job-worker-flow]] — async export job processed by the worker when chapter count exceeds threshold



Route: Exports Related domain concepts
- Synchronous vs async export threshold (`EXPORT_CONFIG.SYNC_CHAPTER_THRESHOLD`)
- Slug generation (Unicode normalization + ASCII-safe kebab-case from story title)
- EPUB rendering (binary buffer returned directly)

---

## health

`routes/health.md`

---
type: route
source: apps/api/src/routes/health.ts
---



Route: Health Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/health.ts`
Provides a lightweight liveness check endpoint that confirms the API process is running and returns the current server timestamp.



Route: Health Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{ status: 'ok', ts:  }` |



Route: Health Inputs
- No request body
- No URL params



Route: Health Outputs
- `200 { status: 'ok', ts: string }` — always succeeds as long as the process is alive



Route: Health Depends on
- [[app-api]] — registered as Fastify plugin
- (no database access, no external services)



Route: Health Used by
- [[app-web]] — may be polled for server connectivity detection
- [[app-api]] — registered here
- Load balancers / uptime monitors (primary consumer)



Route: Health Related database tables
- (none)



Route: Health Related flows
- (none)



Route: Health Related domain concepts
- Liveness probing (does not check database or Redis connectivity — use a dedicated readiness check for that)

---

## pending-updates

`routes/pending-updates.md`

---
type: route
source: apps/api/src/routes/pending-updates.ts
---



Route: Pending Updates Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/pending-updates.ts`
Provides human-in-the-loop review of staged canon updates — listing pending items and approving or rejecting them, with automatic chapter state transition when all updates for a chapter are resolved.



Route: Pending Updates Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/pending-updates` | Lists pending canon updates filtered by `?resolution=` (default: `pending`) |
| POST | `/api/stories/:storyId/pending-updates/:updateId/approve` | Applies the update to its target table, marks it `approved`/`edited`, then calls `maybeAutoCompleteChapter()` |
| POST | `/api/stories/:storyId/pending-updates/:updateId/reject` | Marks the update `rejected` with a reason, then calls `maybeAutoCompleteChapter()` |



Route: Pending Updates Inputs
- **`StoryParams`** — `{ storyId: UUID }`
- **`UpdateParams`** — `{ storyId: UUID, updateId: UUID }`
- **`ApproveBody`** — `{ resolution: 'approved' | 'edited' }` (default `'approved'`)
- **`RejectBody`** — `{ reason: string (1–1000 chars) }`
- **Query param** `resolution` — filters the GET list (e.g. `pending`, `approved`, `rejected`)



Route: Pending Updates Outputs
- `GET` → `{ pendingUpdates: PendingCanonUpdate[] }` ordered by `createdAt` asc
- `POST .../approve` → `{ pendingUpdate: PendingCanonUpdate }` or `404 pending_update_not_found`
- `POST .../reject` → `{ pendingUpdate: PendingCanonUpdate }` or `404 pending_update_not_found`



Route: Pending Updates Depends on Internal helpers (defined in-file)
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; reads/writes `pendingCanonUpdates`, `characters`, `canonFacts`, `openThreads`, `timelineEvents`, `plantedSeeds`, `chapters`
- `applyPendingUpdate(db, update)` — dispatches on `targetTable` + `updateType` to insert/update the target entity
- `maybeAutoCompleteChapter(db, chapterId)` — transitions a `paused_pending_updates` chapter to `completed` when no pending updates remain



Route: Pending Updates Used by
- [[app-web]] — canon review queue UI
- [[app-api]] — registered here



Route: Pending Updates Related database tables
- [[database/tables/pending-canon-updates]]
- [[database/tables/characters]]
- [[database/tables/canon-facts]]
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/planted-seeds]]
- [[database/tables/chapters]]



Route: Pending Updates Related flows
- [[flows/chapter-generation-flow]] — `CanonMerger` stages updates as `pending_canon_updates`; this route resolves them



Route: Pending Updates Related domain concepts
- Canon integrity — staged updates reviewed before being committed
- `paused_pending_updates` chapter state — chapter completion gated on human review
- `applyPendingUpdate` dispatch table — handles `characters`, `canon_facts`, `open_threads`, `timeline_events`, `planted_seeds` target tables
- Human-in-the-loop review (`reviewedBy: 'human'`)

---

## reviews

`routes/reviews.md`

---
type: route
source: apps/api/src/routes/reviews.ts
---



Route: Reviews Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/reviews.ts`
Lists completed high-stakes reviews for a story and allows manually triggering a new high-stakes review job for a specific chapter.



Route: Reviews Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/reviews` | Lists all high-stakes review records for a story, ordered by `createdAt` desc |
| POST | `/api/stories/:storyId/reviews/trigger` | Enqueues a `high-stakes-review` BullMQ job for the specified chapter; returns 202 |



Route: Reviews Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`TriggerBody`** — `{ chapterId: UUID }`



Route: Reviews Outputs
- `GET` → `{ reviews: HighStakesReview[] }`
- `POST .../trigger` → `202 { status: 'queued', jobId, storyId, chapterId, triggerReason: 'manual' }` or `404 chapter_not_found`



Route: Reviews Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `highStakesReviews` and `chapters`
- [[modules/queue-client]] — `enqueueHighStakesReview()` — enqueues the review job
- [[modules/provider-switcher]] — `getQueueLlmSnapshot()` — snapshots provider + model routes
- `@novel/core/trace` → `newTraceId()`



Route: Reviews Used by
- [[app-web]] — review history panel and manual review trigger button
- [[app-api]] — registered here



Route: Reviews Related database tables
- [[database/tables/high-stakes-reviews]]
- [[database/tables/chapters]]



Route: Reviews Related flows
- [[flows/validation-flow]] — high-stakes review is triggered automatically at arc boundaries or on `high`/`critical` validator findings; this route provides the manual trigger path



Route: Reviews Related domain concepts
- High-stakes review (deep narrative coherence check by [[agents/high-stakes-reviewer]])
- Auto-escalation — normally triggered automatically; manual trigger via this route
- `triggerReason: 'manual'` — distinguishes human-triggered reviews from automatic ones

---

## sagas

`routes/sagas.md`

---
type: route
source: apps/api/src/routes/sagas.ts
---



Route: Sagas Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/sagas.ts`
Lists sagas for a story, fetches a single saga by ID, and triggers AI-driven saga planning via `SagaPlannerAgent`; requires the story bible to exist before planning.



Route: Sagas Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/sagas` | Lists all sagas for a story, ordered by `sagaNumber` asc |
| GET | `/api/stories/:storyId/sagas/:sagaId` | Fetches a single saga by ID; 404 if not found |
| POST | `/api/stories/:storyId/sagas/plan` | Runs `SagaPlannerAgent` and persists resulting sagas; 409 if bible not yet generated, 404 if story not found |



Route: Sagas Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`SagaParam`** — `{ storyId: UUID, sagaId: UUID }`
- **`PlanBody`** — `{ resetSeeds?: boolean }` — if `true`, clears existing planted seeds before persisting new ones



Route: Sagas Outputs
- `GET .../sagas` → `{ sagas: Saga[] }`
- `GET .../sagas/:sagaId` → `{ saga: Saga }` or `404 saga_not_found`
- `POST .../plan` → `{ promptVersion, usage, ...persistCounts }` or `404 story_not_found` or `409 bible_required`



Route: Sagas Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `sagas`, `stories`, `storyBibles`
- [[agents/saga-planner]] — `SagaPlannerAgent` class; prompt registered via `saga-planner.v2`
- [[modules/story-domain]] — `loadStoryDomainContext()` to load `genreDef` and `storyOptions`
- `lib/llm-provider.ts` → `buildLoggedProvider()`
- `lib/llm-settings.ts` → `getModelStatusForActiveProviderFromDb()` — resolves `saga_planner` model route



Route: Sagas Used by
- [[app-web]] — saga planning and listing UI
- [[app-api]] — registered here



Route: Sagas Related database tables
- [[database/tables/sagas]]
- [[database/tables/story-bibles]]
- [[database/tables/planted-seeds]]



Route: Sagas Related flows
- [[flows/chapter-generation-flow]] — sagas must exist for a chapter to be generated



Route: Sagas Related domain concepts
- Saga planning (AI-generated multi-arc story structure)
- Bible prerequisite gate (saga planning blocked until bible exists)
- Seed reset (`resetSeeds`) — allows re-planning sagas without accumulating stale seeds

---

## seeds

`routes/seeds.md`

---
type: route
source: apps/api/src/routes/seeds.ts
---



Route: Seeds Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/seeds.ts`
Full CRUD for planted seed records — the foreshadowing elements that the writer agent plants in chapters and pays off later.



Route: Seeds Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/seeds` | Lists all seeds for a story, ordered by `payoffChapter` asc |
| POST | `/api/stories/:storyId/seeds` | Creates a new planted seed; returns 201 |
| PATCH | `/api/stories/:storyId/seeds/:seedId` | Partially updates a seed; 404 if not found |
| DELETE | `/api/stories/:storyId/seeds/:seedId` | Deletes a seed; 404 if not found |



Route: Seeds Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`SeedParam`** — `{ storyId: UUID, seedId: UUID }`
- **`SeedBody`** (POST, full) — `{ seedKey: string (3–120), description: string (20–600), plantWindowStart: int, plantWindowEnd: int, payoffChapter: int, importance: 'minor'|'major'|'climax', status?: 'pending'|'planted'|'paid_off'|'abandoned' }`
- **`SeedBody.partial()`** (PATCH) — same fields, all optional



Route: Seeds Outputs
- `GET` → `{ seeds: PlantedSeed[] }`
- `POST` → `201 { seed: PlantedSeed }`
- `PATCH` → `{ seed: PlantedSeed }` or `404 seed_not_found`
- `DELETE` → `{ deleted: seedId }` or `404 seed_not_found`



Route: Seeds Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; full CRUD on `plantedSeeds` table



Route: Seeds Used by
- [[app-web]] — seed management UI (foreshadowing tracker)
- [[app-api]] — registered here



Route: Seeds Related database tables
- [[database/tables/planted-seeds]]



Route: Seeds Related flows
- [[flows/chapter-generation-flow]] — seeds due in the current chapter are injected into the COLD tier of `buildContext()`



Route: Seeds Related domain concepts
- Planted seeds (foreshadowing elements with plant window and payoff chapter)
- Seed status lifecycle: `pending` → `planted` → `paid_off` (or `abandoned`)
- Importance levels: `minor`, `major`, `climax`
- `createdByAgent: 'manual'` — marks seeds created via this route vs AI-generated ones

---

## stories

`routes/stories.md`

---
type: route
source: apps/api/src/routes/stories.ts
---



Route: Stories Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/stories.ts`
Core CRUD for story records — creates stories with initial settings, lists and fetches stories, and partially updates story config while enforcing genre-lock after bible generation.



Route: Stories Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stories` | Creates a story row and a linked `storySettings` row; returns 201 |
| GET | `/api/stories` | Lists up to 100 stories ordered by `createdAt` desc |
| GET | `/api/stories/:id` | Fetches a single story; 404 if not found |
| PATCH | `/api/stories/:id` | Partial update; 409 if attempting to change a locked genre |



Route: Stories Inputs
- **`CreateStorySchema`** (POST body) — `{ title: string (1–200), premise: string (20–5000), genre: GenreSlugSchema (default: 'tien_hiep'), mainCharacterPersonality: PersonalitySlugSchema (default: 'tram_on'), tone?: string, storyOptions: StoryOptionsSchema (default: {}), targetChapterCount: int 1–10000 (default: 1000) }`
- **`PatchStorySchema`** (PATCH body) — `{ genre?, mainCharacterPersonality?, tone?, storyOptions? }` — at least one field required
- **`:id`** — UUID path parameter



Route: Stories Outputs
- `POST` → `201 Story` row or `400 validation_failed` or `500 insert_failed`
- `GET /api/stories` → `Story[]`
- `GET /api/stories/:id` → `Story` or `404 not_found`
- `PATCH` → `{ ok: true }` or `404 not_found` or `409 genre_locked` or `400 validation_failed`



Route: Stories Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; inserts/reads/updates `stories` and `storySettings`
- [[package-core]] — `GenreSlugSchema`, `PersonalitySlugSchema`, `StoryOptionsSchema` for validation



Route: Stories Used by
- [[app-web]] — story creation wizard, story list, story detail page
- [[app-api]] — registered here



Route: Stories Related database tables
- [[database/tables/stories]]
- [[database/tables/story-settings]]



Route: Stories Related flows
- (none — this is the entry point; all other flows begin after story creation)



Route: Stories Related domain concepts
- Genre locking — `stories.genreLockedAt` is set when a bible is generated; this route enforces the lock on PATCH
- `storyOptions` — stored in `storySettings.overrides.storyOptions`; deep-merged on partial update
- `GenreSlugSchema` — validates xianxia/fantasy genre identifiers (e.g. `tien_hiep`)
- `PersonalitySlugSchema` — validates protagonist personality archetypes (e.g. `tram_on`)

---

## story-settings

`routes/story-settings.md`

---
type: route
source: apps/api/src/routes/story-settings.ts
---



Route: Story Settings Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/story-settings.ts`
Reads and fully replaces the per-story configuration override blob, which controls model routes, budget caps, context window sizes, and generation parameters for a specific story.



Route: Story Settings Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/settings` | Returns the current `overrides` object; returns `{}` if no row exists |
| PUT | `/api/stories/:storyId/settings` | Replaces the entire `overrides` blob (upsert); 400 if body is invalid |



Route: Story Settings Inputs
- **`:storyId`** — UUID path parameter
- **`PutSettingsSchema`** (PUT body) — `{ overrides: Record }` — must be a plain object, not an array



Route: Story Settings Outputs
- `GET` → `{ overrides: Record }` (empty object if no row)
- `PUT` → `{ ok: true }` or `400 validation_failed`



Route: Story Settings Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; upserts `storySettings` table on `storyId` conflict



Route: Story Settings Used by
- [[app-web]] — advanced story settings panel
- [[app-api]] — registered here
- [[workers/chapter-pipeline]] — `getEffectiveConfig(storyId)` reads from this table to build per-story config



Route: Story Settings Related database tables
- [[database/tables/story-settings]]



Route: Story Settings Related flows
- (none — settings are consumed at job dispatch time, not during this route)



Route: Story Settings Related domain concepts
- [[configs/config-effective]] — `getEffectiveConfig(storyId, provider)` merges global config with these overrides; always use that function in worker jobs
- Per-story config overrides (model routes, budget, context window sizes, generation params)
- Full replacement semantics — PUT replaces the entire blob; use with caution

---

## timeline

`routes/timeline.md`

---
type: route
source: apps/api/src/routes/timeline.ts
---



Route: Timeline Responsibility
**Type:** API Route Handler
**Source:** `apps/api/src/routes/timeline.ts`
Returns a narrative timeline of completed chapters by joining chapter records with their AI-generated summaries, enabling a compact chapter-by-chapter story history view.



Route: Timeline Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/timeline` | Returns completed/paused chapters joined with `chapterSummaries`, ordered by chapter number desc |



Route: Timeline Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- No request body



Route: Timeline Outputs
- `{ timeline: Array }` — only chapters with status `completed` or `paused_pending_updates` that have a linked summary row



Route: Timeline Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; inner-joins `chapters` with `chapterSummaries` filtered by completion status



Route: Timeline Used by
- [[app-web]] — story timeline / reading history panel
- [[app-api]] — registered here



Route: Timeline Related database tables
- [[database/tables/chapters]]
- [[database/tables/chapter-summaries]]



Route: Timeline Related flows
- [[flows/chapter-generation-flow]] — `SummaryCompactor` writes to `chapterSummaries` after each chapter; this route reads those records



Route: Timeline Related domain concepts
- Chapter summaries (compact narrative summaries written by `SummaryCompactor` during the memory step)
- Completion states: only `completed` and `paused_pending_updates` chapters appear in the timeline
- Inner join semantics — chapters without a summary row are excluded from results

---
