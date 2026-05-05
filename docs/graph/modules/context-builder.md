---
type: module
source: packages/ai/src/context/builder.ts
---

# Module: Context Builder

## Responsibility
Assembles the 3-tier `ChapterContext` from DB + embeddings for each chapter generation. Enforces token budgets via `shrinkToFit()`.

## Source Evidence
`packages/ai/src/context/builder.ts` — `buildContext()`
`packages/ai/src/context/types.ts` — `ChapterContext`, `HotTier`, `WarmTier`, `ColdTier`
`packages/ai/src/context/cache-keys.ts` — `computeHotHash()`, `computeWarmHash()`
`packages/ai/src/context/shrink.ts` — `shrinkToFit()` with shrink order
`packages/ai/src/context/retrieval.ts` — DB retrieval helpers
`packages/ai/src/context/past-reference.ts` — past reference keyword detection
`packages/ai/src/context/serialize.ts` — `canonicalJsonStringify()`

## Inputs
- `storyId`, `chapterNumber`, `arcId`
- DB: [[database/tables/story-bibles]], [[database/tables/characters]], [[database/tables/sagas]], [[database/tables/arcs]], [[database/tables/open-threads]], [[database/tables/planted-seeds]], [[database/tables/chapter-summaries]], [[database/tables/canon-facts]], [[database/tables/chapter-packets]]
- Embedding vectors (for fact and past chapter retrieval)

## Outputs
- `ChapterContext` with HOT + WARM + COLD tiers
- `hotTierHash`, `warmTierHash` (written to [[database/tables/context-packets]])

## Tier Structure
- **HOT** — Bible, style guide, power system, genre/personality contracts (hashed)
- **WARM** — Saga/arc summaries, active characters, open threads, planted seeds (hashed)
- **COLD** — Recent summaries (last 5), retrieved facts (top 8 by vector), past chapters (top 3 by vector), due seeds, packet

## Token Budget
- Normal: 6000 tokens (`TOKEN_BUDGET_NORMAL`)
- Important: 10000 tokens (`TOKEN_BUDGET_IMPORTANT`)
- Shrink order: `retrievedPastChapters` → `retrievedFacts` → `recentSummaries` → `activeCharactersCompactMode`

## Depends On
- [[packages/package-db]] — Drizzle queries
- [[modules/embedding-service]] — vector retrieval
- [[prompts/contract-genre]], [[prompts/contract-personality]], [[prompts/contract-story-options]]
- [[configs/config-context]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 4)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/context-packets]] (written after build)
- [[database/tables/chapter-summaries]] (COLD tier source)
- [[database/tables/canon-facts]] (COLD tier source)

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: module
source: packages/ai/src/context/builder.ts
---

# Module: Context Builder

## Responsibility
Assembles the 3-tier `ChapterContext` from DB + embeddings for chapter generation. Enforces token budgets via `shrinkToFit()`. Persists hash snapshot to context_packets.

## Source Evidence
`packages/ai/src/context/builder.ts` — `buildContext()`
`packages/ai/src/context/types.ts` — `ChapterContext`, `HotTier`, `WarmTier`, `ColdTier`
`packages/ai/src/context/cache-keys.ts` — `computeHotHash()`, `computeWarmHash()`
`packages/ai/src/context/shrink.ts` — `shrinkToFit()`
`packages/ai/src/context/retrieval.ts` — DB retrieval helpers
`packages/ai/src/context/past-reference.ts` — Vietnamese past-reference keyword detection
`packages/ai/src/context/serialize.ts` — `canonicalJsonStringify()`

## Tier Structure
- **HOT** — Bible, style guide, power system, genre/personality contracts (hashed, stable)
- **WARM** — Saga/arc summaries, active characters, open threads, planted seeds (hashed)
- **COLD** — Recent summaries (last 5), retrieved facts (top 8 by vector), past chapters (top 3 by vector), due seeds, packet

## Token Budgets (from [[configs/config-context]])
- Normal: 6000 tokens
- Important: 10000 tokens
- Shrink order: `retrievedPastChapters` → `retrievedFacts` → `recentSummaries` → `activeCharactersCompactMode`

## Inputs
- `storyId`, `chapterNumber`, `arcId`
- DB reads: [[database/tables/story-bibles]], [[database/tables/characters]], [[database/tables/sagas]], [[database/tables/arcs]], [[database/tables/open-threads]], [[database/tables/planted-seeds]], [[database/tables/chapter-summaries]], [[database/tables/canon-facts]], [[database/tables/chapter-packets]]
- Vector retrieval via [[modules/embedding-service]]

## Outputs
- `ChapterContext` with HOT + WARM + COLD tiers
- Writes snapshot to [[database/tables/context-packets]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 4)
- [[pipelines/chapter-generation-pipeline]]

## Related Flows
- [[flows/chapter-generation-flow]]


## Recent Changes (Context Pipeline Improvement)

### Timeline Events Loading
- `buildContext()` now loads `timeline_events` from the database via `getTimelineEventsForChapter()`
- Timeline events are placed in the **COLD tier** as `timelineEvents: TimelineEventCompact[]`
- Limited to the 20 most recent events up to the current chapter

### Saga/Arc Progress Computation
- `buildContext()` now computes `sagaProgressPercent` and `arcProgressPercent` in `ChapterContext.meta`
- Exact planned-range formula: `round(clamp(currentChapter - startChapter + 1, 0, span) / span * 100)`, where `span = endChapter - startChapter + 1`
- `sagaProgressSource` / `arcProgressSource` records the basis used in prompt text
- Exact saga/arc ranges use `source=planned_range`
- Missing saga end falls back to `stories.targetChapterCount` with `source=story_target_fallback`
- Missing arc end falls back to the active saga end when available (`source=saga_end_fallback`), otherwise `stories.targetChapterCount` (`source=story_target_fallback`)
- If no end boundary can be derived, progress remains `null` and is omitted from writer context

### powerSystemKind Default Fix
- Default changed from `'cultivation'` to `'none'` when bible has no `powerSystemKind` set
- Prevents non-cultivation stories from inheriting cultivation-specific behavior

### serializeContextForWriter() Improvements
Now includes these previously-missing sections:
- `# GENRE CONTRACT` (from HOT tier)
- `# PROTAGONIST PERSONALITY CONTRACT` (from HOT tier)
- `# STORY OPTIONS` (from HOT tier)
- `# STORY PROGRESS` (saga/arc progress percentages)
- `# KNOWN FACTIONS` (from WARM tier)
- `# TIMELINE EVENTS` (from COLD tier)
- Character `shortTraits` and `bloodlines` in ACTIVE CHARACTERS section

### Progress Phase & Turning Point (Task 3)
- Added `progressPhaseFor(percent)` helper: maps percent → `setup` (<30) | `development` (30–59) | `climax_buildup` (60–79) | `climax` (≥80)
- `ChapterContext.meta` now includes:
  - `sagaRange` / `arcRange` — e.g. `"3/20"` (current position / total span)
  - `sagaPhase` / `arcPhase` — the `ProgressPhase` enum value (or null)
  - `activeTurningPoint` — the saga turning point string active for the current chapter position (computed from `saga.expectedTurningPoints` evenly divided across the saga span)
- Purpose: let the serializer emit stable, enum-tagged signals so the writer LLM doesn't have to do threshold math on raw percentages
- Exported type: `ProgressPhase` from `packages/ai/src/context/builder.ts`

### Writer STORY PROGRESS Enrichment (Task 4)
- `serializeContextForWriter()` now renders enriched `# STORY PROGRESS` block
- Saga/Arc lines include: range (e.g. `chapter 3/20`), phase label (e.g. `phase=development`), and progress source (e.g. `source=planned_range`)
- `activeTurningPoint` rendered as its own line when present
- Replaces old bare-percent format (`Saga progress: 60%` → `Saga: 60% (chapter 3/20), phase=development`)
- Purpose: give the writer LLM stable, enum-tagged signals without requiring threshold math on raw percentages

### Pending Canon Updates in COLD Tier (Task 5)
- `buildContext()` now loads `pending_canon_updates` (resolution='pending') via `getPendingCanonUpdatesForStory()`
- Limited to 10 most recent pending updates per story
- Added `PendingCanonUpdateCompact` type to `types.ts` with fields: id, updateType, targetTable, conflictStatus, conflictReasons, summary
- Added `compactPendingCanonUpdate()` helper to `compact.ts` — derives a human-readable summary from the payload's `name` or `fact` field
- COLD tier now includes `pendingCanonUpdates: PendingCanonUpdateCompact[]`
- `serializeContextForWriter()` renders a `# PENDING CANON UPDATES (chưa apply — KHÔNG dựa vào để viết)` section
- Purpose: surface staged-but-unapplied canon changes to the writer so it's aware of what's pending, without treating them as established facts
- Closes the "pending canon updates" gap identified in the LLM context audit's required-context list

### Parallel Thread Context (Phase 7)
- `WarmTier` now carries optional `parallelThreads` from `sagas.parallel_threads`
- `getTimelineEventsForChapter()` now filters thread-scoped timeline rows using active parallel threads plus same-chapter convergence points
- Base timeline events without `threadId` still always pass through
- `serializeContextForWriter()` now emits `# PARALLEL THREADS` with active/closed status and chapter window
- `writerPromptV2` now supports optional `<parallel_threads>` XML block so side-thread constraints survive prompt composition
