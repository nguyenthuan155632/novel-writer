# Novel graph — modules

## admin-metrics

`modules/admin-metrics.md`

---
type: module
source: packages/core/src/services/admin-metrics.ts
---



Module: Admin Metrics Service Responsibility
SQL queries for 5 types of operational metrics exposed on the admin dashboard.



Module: Admin Metrics Service Source Evidence
`packages/core/src/services/admin-metrics.ts` — `AdminMetricsService`



Module: Admin Metrics Service Metrics Provided
1. `cacheHitRates` — from [[database/tables/context-packets]]
2. `costRolling7d` — from [[database/tables/llm-calls]] grouped by day
3. `validatorFailures` — from [[database/tables/validations]] grouped by severity
4. `autoFix` — from [[database/tables/llm-calls]] for `auto_fixer` role
5. `pendingCanonAging` — from [[database/tables/pending-canon-updates]] bucketed by age



Module: Admin Metrics Service Used By
- [[routes/route-admin]] (`GET /admin/metrics`)



Module: Admin Metrics Service Related Tables
- [[database/tables/context-packets]]
- [[database/tables/llm-calls]]
- [[database/tables/validations]]
- [[database/tables/pending-canon-updates]]
---
type: module
source: packages/core/src/services/admin-metrics.ts
---



Module: Admin Metrics Service Responsibility
SQL queries for 5 operational metric types used on the admin dashboard.



Module: Admin Metrics Service Source Evidence
`packages/core/src/services/admin-metrics.ts` — `AdminMetricsService`



Module: Admin Metrics Service Metrics
1. `cacheHitRates` — from [[database/tables/context-packets]]
2. `costRolling7d` — from [[database/tables/llm-calls]] grouped by day
3. `validatorFailures` — from [[database/tables/validations]] grouped by severity
4. `autoFix` — from [[database/tables/llm-calls]] for `auto_fixer` role
5. `pendingCanonAging` — from [[database/tables/pending-canon-updates]] bucketed by age



Module: Admin Metrics Service Used By
- [[routes/route-admin]] (GET /admin/metrics)

---

## budget-guard

`modules/budget-guard.md`

---
type: module
source: apps/api/src/services/budget-guard.ts
---



Module: Budget Guard Responsibility
Checks daily and monthly LLM spend against hard caps before allowing chapter generation. Raises error if caps exceeded.



Module: Budget Guard Source Evidence
`apps/api/src/services/budget-guard.ts` — `BudgetGuard`



Module: Budget Guard Inputs
- `storyId`
- Queries [[database/tables/llm-calls]] for rolling totals



Module: Budget Guard Outputs
- Passes (no-op) or throws budget exceeded error



Module: Budget Guard Budget Caps (from [[configs/config-budget]])
- Per-chapter: $0.05
- Daily: $5.00
- Monthly: $50.00



Module: Budget Guard Used By
- [[routes/route-chapters]] — before enqueueing generate job
- [[routes/route-batches]] — before starting batch



Module: Budget Guard Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
---
type: module
source: apps/api/src/services/budget-guard.ts
---



Module: Budget Guard Responsibility
Checks daily and monthly LLM spend against hard caps before allowing generation. Throws if caps exceeded.



Module: Budget Guard Source Evidence
`apps/api/src/services/budget-guard.ts` — `BudgetGuard`



Module: Budget Guard Caps (from [[configs/config-budget]])
- Per-chapter: $0.05
- Daily: $5.00
- Monthly: $50.00



Module: Budget Guard Inputs
- `storyId`
- Queries [[database/tables/llm-calls]] for rolling totals



Module: Budget Guard Used By
- [[routes/route-chapters]]
- [[routes/route-batches]]



Module: Budget Guard Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]

---

## canon-merger

`modules/canon-merger.md`

---
type: module
source: packages/ai/src/reconciliation/canon-merger.ts
---



Module: Canon Merger Responsibility
Stages or auto-applies canon extractor output. Handles conflict detection. Routes clean updates directly to DB; routes conflicting or review-mode updates to `pending_canon_updates`.



Module: Canon Merger Source Evidence
`packages/ai/src/reconciliation/canon-merger.ts`



Module: Canon Merger Inputs
- Extractor output (character updates, canon facts, thread updates, timeline events, resolved seeds)
- Conflict detection results from [[modules/conflict-detector]]
- `mode`: `auto` (apply non-conflicting) or `review` (all → pending)



Module: Canon Merger Outputs
- Direct writes to: [[database/tables/characters]], [[database/tables/canon-facts]], [[database/tables/open-threads]], [[database/tables/timeline-events]], [[database/tables/planted-seeds]]
- Staged writes to: [[database/tables/pending-canon-updates]]
- Embeddings for new canon facts via [[modules/embedding-service]]



Module: Canon Merger Conflict Handling
- Clean updates in `auto` mode: applied directly
- All updates in `review` mode: → `pending_canon_updates`
- Any conflict: always → `pending_canon_updates`



Module: Canon Merger Depends On
- [[modules/conflict-detector]]
- [[modules/embedding-service]]
- [[packages/package-db]]



Module: Canon Merger Used By
- [[jobs/job-generate-chapter]] (Stage 10)
- [[pipelines/chapter-generation-pipeline]]



Module: Canon Merger Related Tables
- [[database/tables/pending-canon-updates]]
- [[database/tables/characters]]
- [[database/tables/canon-facts]]
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/planted-seeds]]



Module: Canon Merger Related Flows
- [[flows/canon-reconciliation-flow]]
- [[flows/chapter-generation-flow]]
---
type: module
source: packages/ai/src/reconciliation/canon-merger.ts
---



Module: Canon Merger Responsibility
Stages or auto-applies canon extractor output. Routes clean updates to DB directly. Routes conflicting or review-mode updates to pending_canon_updates.



Module: Canon Merger Source Evidence
`packages/ai/src/reconciliation/canon-merger.ts`



Module: Canon Merger Merge Modes
- `auto` — apply non-conflicting rows directly to DB
- `review` — all rows → pending_canon_updates
- Any conflict → always → pending_canon_updates



Module: Canon Merger Inputs
- Extractor output (characters, facts, threads, events, seeds)
- Conflict detection results from [[modules/conflict-detector]]



Module: Canon Merger Outputs
Writes to:
- [[database/tables/characters]]
- [[database/tables/canon-facts]] (+ embedding via [[modules/embedding-service]])
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/planted-seeds]] (paid_off)
- [[database/tables/pending-canon-updates]] (on conflict or review mode)



Module: Canon Merger Used By
- [[jobs/job-generate-chapter]] (Stage 10)



Module: Canon Merger Related Flows
- [[flows/canon-reconciliation-flow]]
- [[flows/chapter-generation-flow]]

---

## conflict-detector

`modules/conflict-detector.md`

---
type: module
source: packages/ai/src/reconciliation/conflict-detector.ts
---



Module: Conflict Detector Responsibility
Pure function that detects 7 types of canon conflicts between proposed updates and existing DB state. No LLM calls.



Module: Conflict Detector Source Evidence
`packages/ai/src/reconciliation/conflict-detector.ts` — `detectConflicts()`



Module: Conflict Detector Conflict Types Detected
1. `locked_field` — updating a locked character field
2. `realm_regression` — downgrading a character's cultivation realm
3. `locked_fact` — duplicate fact marked locked
4. `duplicate_fact` — exact fact text already exists
5. `dead_character_action` — updating a dead character's non-status fields
6. `thread_status_invalid` — reopening a resolved thread
7. `realm_jump_excess` — too many realm breakthroughs in one packet (from PacketAuditor)



Module: Conflict Detector Inputs
- Proposed update payload
- Snapshot of current DB state (characters, canon facts, threads)



Module: Conflict Detector Outputs
- Array of `ConflictResult` with type, reason, conflicting field



Module: Conflict Detector Depends On
- [[packages/package-db]] (reads snapshot)



Module: Conflict Detector Used By
- [[modules/canon-merger]]



Module: Conflict Detector Related Flows
- [[flows/canon-reconciliation-flow]]
---
type: module
source: packages/ai/src/reconciliation/conflict-detector.ts
---



Module: Conflict Detector Responsibility
Pure function detecting 7 types of canon conflicts. No LLM calls.



Module: Conflict Detector Source Evidence
`packages/ai/src/reconciliation/conflict-detector.ts` — `detectConflicts()`



Module: Conflict Detector Conflict Types
1. `locked_field` — updating a locked character field
2. `realm_regression` — downgrading cultivation realm
3. `locked_fact` — duplicate of a locked canon fact
4. `duplicate_fact` — exact fact text already exists
5. `dead_character_action` — updating a dead character's non-status fields
6. `thread_status_invalid` — reopening a resolved thread
7. `realm_jump_excess` — too many realm breakthroughs per packet



Module: Conflict Detector Inputs
- Proposed update payload
- Current DB snapshot (characters, facts, threads)



Module: Conflict Detector Outputs
- Array of `ConflictResult` with type + reason



Module: Conflict Detector Used By
- [[modules/canon-merger]]



Module: Conflict Detector Related Flows
- [[flows/canon-reconciliation-flow]]

---

## context-builder

`modules/context-builder.md`

---
type: module
source: packages/ai/src/context/builder.ts
---



Module: Context Builder Responsibility
Assembles the 3-tier `ChapterContext` from DB + embeddings for each chapter generation. Enforces token budgets via `shrinkToFit()`.



Module: Context Builder Source Evidence
`packages/ai/src/context/builder.ts` — `buildContext()`
`packages/ai/src/context/types.ts` — `ChapterContext`, `HotTier`, `WarmTier`, `ColdTier`
`packages/ai/src/context/cache-keys.ts` — `computeHotHash()`, `computeWarmHash()`
`packages/ai/src/context/shrink.ts` — `shrinkToFit()` with shrink order
`packages/ai/src/context/retrieval.ts` — DB retrieval helpers
`packages/ai/src/context/past-reference.ts` — past reference keyword detection
`packages/ai/src/context/serialize.ts` — `canonicalJsonStringify()`



Module: Context Builder Inputs
- `storyId`, `chapterNumber`, `arcId`
- DB: [[database/tables/story-bibles]], [[database/tables/characters]], [[database/tables/sagas]], [[database/tables/arcs]], [[database/tables/open-threads]], [[database/tables/planted-seeds]], [[database/tables/chapter-summaries]], [[database/tables/canon-facts]], [[database/tables/chapter-packets]]
- Embedding vectors (for fact and past chapter retrieval)



Module: Context Builder Outputs
- `ChapterContext` with HOT + WARM + COLD tiers
- `hotTierHash`, `warmTierHash` (written to [[database/tables/context-packets]])



Module: Context Builder Tier Structure
- **HOT** — Bible, style guide, power system, genre/personality contracts (hashed)
- **WARM** — Saga/arc summaries, active characters, open threads, planted seeds (hashed)
- **COLD** — Recent summaries (last 5), retrieved facts (top 8 by vector), past chapters (top 3 by vector), due seeds, packet



Module: Context Builder Token Budget
- Normal: 6000 tokens (`TOKEN_BUDGET_NORMAL`)
- Important: 10000 tokens (`TOKEN_BUDGET_IMPORTANT`)
- Shrink order: `retrievedPastChapters` → `retrievedFacts` → `recentSummaries` → `activeCharactersCompactMode`



Module: Context Builder Depends On
- [[packages/package-db]] — Drizzle queries
- [[modules/embedding-service]] — vector retrieval
- [[prompts/contract-genre]], [[prompts/contract-personality]], [[prompts/contract-story-options]]
- [[configs/config-context]]



Module: Context Builder Used By
- [[jobs/job-generate-chapter]] (Stage 4)
- [[pipelines/chapter-generation-pipeline]]



Module: Context Builder Related Tables
- [[database/tables/context-packets]] (written after build)
- [[database/tables/chapter-summaries]] (COLD tier source)
- [[database/tables/canon-facts]] (COLD tier source)



Module: Context Builder Related Flows
- [[flows/chapter-generation-flow]]
---
type: module
source: packages/ai/src/context/builder.ts
---



Module: Context Builder Responsibility
Assembles the 3-tier `ChapterContext` from DB + embeddings for chapter generation. Enforces token budgets via `shrinkToFit()`. Persists hash snapshot to context_packets.



Module: Context Builder Source Evidence
`packages/ai/src/context/builder.ts` — `buildContext()`
`packages/ai/src/context/types.ts` — `ChapterContext`, `HotTier`, `WarmTier`, `ColdTier`
`packages/ai/src/context/cache-keys.ts` — `computeHotHash()`, `computeWarmHash()`
`packages/ai/src/context/shrink.ts` — `shrinkToFit()`
`packages/ai/src/context/retrieval.ts` — DB retrieval helpers
`packages/ai/src/context/past-reference.ts` — Vietnamese past-reference keyword detection
`packages/ai/src/context/serialize.ts` — `canonicalJsonStringify()`



Module: Context Builder Tier Structure
- **HOT** — Bible, style guide, power system, genre/personality contracts (hashed, stable)
- **WARM** — Saga/arc summaries, active characters, open threads, planted seeds (hashed)
- **COLD** — Recent summaries (last 5), retrieved facts (top 8 by vector), past chapters (top 3 by vector), due seeds, packet



Module: Context Builder Token Budgets (from [[configs/config-context]])
- Normal: 6000 tokens
- Important: 10000 tokens
- Shrink order: `retrievedPastChapters` → `retrievedFacts` → `recentSummaries` → `activeCharactersCompactMode`



Module: Context Builder Inputs
- `storyId`, `chapterNumber`, `arcId`
- DB reads: [[database/tables/story-bibles]], [[database/tables/characters]], [[database/tables/sagas]], [[database/tables/arcs]], [[database/tables/open-threads]], [[database/tables/planted-seeds]], [[database/tables/chapter-summaries]], [[database/tables/canon-facts]], [[database/tables/chapter-packets]]
- Vector retrieval via [[modules/embedding-service]]



Module: Context Builder Outputs
- `ChapterContext` with HOT + WARM + COLD tiers
- Writes snapshot to [[database/tables/context-packets]]



Module: Context Builder Used By
- [[jobs/job-generate-chapter]] (Stage 4)
- [[pipelines/chapter-generation-pipeline]]



Module: Context Builder Related Flows
- [[flows/chapter-generation-flow]]



Module: Context Builder Recent Changes (Context Pipeline Improvement) Timeline Events Loading
- `buildContext()` now loads `timeline_events` from the database via `getTimelineEventsForChapter()`
- Timeline events are placed in the **COLD tier** as `timelineEvents: TimelineEventCompact[]`
- Limited to the 20 most recent events up to the current chapter



Module: Context Builder Recent Changes (Context Pipeline Improvement) Saga/Arc Progress Computation
- `buildContext()` now computes `sagaProgressPercent` and `arcProgressPercent` in `ChapterContext.meta`
- Exact planned-range formula: `round(clamp(currentChapter - startChapter + 1, 0, span) / span * 100)`, where `span = endChapter - startChapter + 1`
- `sagaProgressSource` / `arcProgressSource` records the basis used in prompt text
- Exact saga/arc ranges use `source=planned_range`
- Missing saga end falls back to `stories.targetChapterCount` with `source=story_target_fallback`
- Missing arc end falls back to the active saga end when available (`source=saga_end_fallback`), otherwise `stories.targetChapterCount` (`source=story_target_fallback`)
- If no end boundary can be derived, progress remains `null` and is omitted from writer context



Module: Context Builder Recent Changes (Context Pipeline Improvement) powerSystemKind Default Fix
- Default changed from `'cultivation'` to `'none'` when bible has no `powerSystemKind` set
- Prevents non-cultivation stories from inheriting cultivation-specific behavior



Module: Context Builder Recent Changes (Context Pipeline Improvement) serializeContextForWriter() Improvements
Now includes these previously-missing sections:
- `# GENRE CONTRACT` (from HOT tier)
- `# PROTAGONIST PERSONALITY CONTRACT` (from HOT tier)
- `# STORY OPTIONS` (from HOT tier)
- `# STORY PROGRESS` (saga/arc progress percentages)
- `# KNOWN FACTIONS` (from WARM tier)
- `# TIMELINE EVENTS` (from COLD tier)
- Character `shortTraits` and `bloodlines` in ACTIVE CHARACTERS section



Module: Context Builder Recent Changes (Context Pipeline Improvement) Progress Phase & Turning Point (Task 3)
- Added `progressPhaseFor(percent)` helper: maps percent → `setup` (<30) | `development` (30–59) | `climax_buildup` (60–79) | `climax` (≥80)
- `ChapterContext.meta` now includes:
- `sagaRange` / `arcRange` — e.g. `"3/20"` (current position / total span)
- `sagaPhase` / `arcPhase` — the `ProgressPhase` enum value (or null)
- `activeTurningPoint` — the saga turning point string active for the current chapter position (computed from `saga.expectedTurningPoints` evenly divided across the saga span)
- Purpose: let the serializer emit stable, enum-tagged signals so the writer LLM doesn't have to do threshold math on raw percentages
- Exported type: `ProgressPhase` from `packages/ai/src/context/builder.ts`



Module: Context Builder Recent Changes (Context Pipeline Improvement) Writer STORY PROGRESS Enrichment (Task 4)
- `serializeContextForWriter()` now renders enriched `# STORY PROGRESS` block
- Saga/Arc lines include: range (e.g. `chapter 3/20`), phase label (e.g. `phase=development`), and progress source (e.g. `source=planned_range`)
- `activeTurningPoint` rendered as its own line when present
- Replaces old bare-percent format (`Saga progress: 60%` → `Saga: 60% (chapter 3/20), phase=development`)
- Purpose: give the writer LLM stable, enum-tagged signals without requiring threshold math on raw percentages



Module: Context Builder Recent Changes (Context Pipeline Improvement) Pending Canon Updates in COLD Tier (Task 5)
- `buildContext()` now loads `pending_canon_updates` (resolution='pending') via `getPendingCanonUpdatesForStory()`
- Limited to 10 most recent pending updates per story
- Added `PendingCanonUpdateCompact` type to `types.ts` with fields: id, updateType, targetTable, conflictStatus, conflictReasons, summary
- Added `compactPendingCanonUpdate()` helper to `compact.ts` — derives a human-readable summary from the payload's `name` or `fact` field
- COLD tier now includes `pendingCanonUpdates: PendingCanonUpdateCompact[]`
- `serializeContextForWriter()` renders a `# PENDING CANON UPDATES (chưa apply — KHÔNG dựa vào để viết)` section
- Purpose: surface staged-but-unapplied canon changes to the writer so it's aware of what's pending, without treating them as established facts
- Closes the "pending canon updates" gap identified in the LLM context audit's required-context list

---

## context-cache-keys

`modules/context-cache-keys.md`

---
type: module
source: packages/ai/src/context/cache-keys.ts
---



Module: Context Cache Keys Responsibility
**Type:** Module
**Source:** `packages/ai/src/context/cache-keys.ts`
Generates deterministic SHA-256 hashes of the HOT and WARM context tiers to detect cache invalidation.



Module: Context Cache Keys Key exports / functions
- `computeHotHash(hot: HotTier): string` — SHA-256 of canonically serialized HOT tier
- `computeWarmHash(warm: WarmTier): string` — SHA-256 of canonically serialized WARM tier



Module: Context Cache Keys Inputs
- `HotTier` object (bible, style guide, power system, contracts, few-shots)
- `WarmTier` object (saga/arc summaries, active characters, threads, seeds)



Module: Context Cache Keys Outputs
- Hex-encoded SHA-256 hash string



Module: Context Cache Keys Implementation notes
- Delegates to `canonicalJsonStringify()` from [[modules/context-serialize]] to sort all object keys recursively before hashing — ensures identical data always produces identical hash regardless of key insertion order
- Then passes canonical string through `sha256()` from `@novel/core/utils/hash`
- Hash stored in `ChapterContext.meta.hotHash` and `ChapterContext.meta.warmHash`



Module: Context Cache Keys Depends on
- [[modules/context-serialize]] — for `canonicalJsonStringify()`
- [[modules/context-types]] — for `HotTier`, `WarmTier` types



Module: Context Cache Keys Used by
- [[modules/context-builder]] — stores hashes in `context_packets` for cache hit detection



Module: Context Cache Keys Related database tables
- [[database/tables/context-packets]] — `hotHash` / `warmHash` fields



Module: Context Cache Keys Related flows
- [[flows/chapter-generation-flow]]

---

## context-compact

`modules/context-compact.md`

---
type: module
source: packages/ai/src/context/compact.ts
---



Module: Context Compact Responsibility
**Type:** Module
**Source:** `packages/ai/src/context/compact.ts`
Converts full database row objects into compact/abbreviated representations (stripping noise, capping array lengths) to save tokens in the LLM context window.



Module: Context Compact Key exports / functions
- `compactCharacter(c, opts?: { stripOptional? }): CharacterCompact` — trims traits to 5, strips optional fields when `stripOptional=true`
- `compactThread(t): ThreadCompact` — maps DB `status` to `state: 'open' | 'partial' | 'resolved'`
- `compactSeed(s): SeedCompact` — maps DB seed row to `SeedCompact` with validated status enum
- `compactSummary(s): ChapterSummaryCompact` — extracts `chapterNumber` + `summary`
- `compactFact(f): CanonFactCompact` — extracts `id`, `topic`, `importance`, `fact`



Module: Context Compact Inputs
- Raw database row objects from Drizzle queries



Module: Context Compact Outputs
- Typed compact objects: `CharacterCompact`, `ThreadCompact`, `SeedCompact`, `ChapterSummaryCompact`, `CanonFactCompact`



Module: Context Compact Implementation notes
- `compactCharacter` caps `shortTraits` at 5 entries
- Character `status` is coerced to valid enum values; unknown values fall back to `'unknown'`
- Thread `status` → `state` field rename with validation
- `stripOptional` removes `currentRealm`, `faction` for ultra-compact mode (used during shrink)



Module: Context Compact Depends on
- [[modules/context-types]] — for all compact type definitions



Module: Context Compact Used by
- [[modules/context-retrieval]] — called on every DB row before building context



Module: Context Compact Related flows
- [[flows/chapter-generation-flow]]

---

## context-past-reference

`modules/context-past-reference.md`

---
type: module
source: packages/ai/src/context/past-reference.ts
---



Module: Context Past Reference Responsibility
**Type:** Module
**Source:** `packages/ai/src/context/past-reference.ts`
Detects whether a chapter packet contains past-reference keywords (flashback/callback signals) so the context builder can fetch relevant older chapter summaries for the COLD tier.



Module: Context Past Reference Key exports / functions
- `detectPastReferences(text: string, keywords?: readonly string[]): string[]`
- Returns the list of matched keywords found in `text`
- Falls back to `CONTEXT_CONFIG.PAST_REFERENCE_KEYWORDS` when no custom keyword list is provided



Module: Context Past Reference Inputs
- `text` — stringified chapter packet or chapter description
- Optional `keywords` override — custom keyword list (defaults to config)



Module: Context Past Reference Outputs
- Array of matched keyword strings (empty if none found)
- When non-empty: caller should fetch past chapter summaries via `getPastChapterSummaries()` in [[modules/context-retrieval]]



Module: Context Past Reference Configuration
- `CONTEXT_CONFIG.PAST_REFERENCE_KEYWORDS` — default Vietnamese flashback keywords list:
`'lần trước'`, `'trước đây'`, `'năm xưa'`, `'thuở nhỏ'`, `'kiếp trước'`, `'callback'` and similar
- `CONTEXT_CONFIG.PAST_REFERENCE_USE_LLM_CLASSIFIER` — if `false` (default), uses regex-only matching; reserved for future LLM classifier upgrade



Module: Context Past Reference Depends on
- `@novel/core` — for `CONTEXT_CONFIG`



Module: Context Past Reference Used by
- [[modules/context-builder]] — gates fetching of past chapter summaries into the COLD tier



Module: Context Past Reference Related flows
- [[flows/chapter-generation-flow]]

---

## context-retrieval

`modules/context-retrieval.md`

---
type: module
source: packages/ai/src/context/retrieval.ts
---



Module: Context Retrieval Responsibility
**Type:** Module
**Source:** `packages/ai/src/context/retrieval.ts`
All database retrieval functions for context building — the single authoritative layer for querying story data needed to assemble a `ChapterContext`.



Module: Context Retrieval Key exports / functions
| Function | Purpose |
|----------|---------|
| `getStoryBible(db, storyId)` | Latest version of the story bible |
| `getSagaForChapter(db, storyId, chapterNumber)` | Saga containing the given chapter |
| `getArcForChapter(db, storyId, chapterNumber)` | Arc containing the given chapter |
| `getArcById(db, arcId)` | Arc by direct ID lookup |
| `getActiveCharacters(db, storyId, chapterNumber)` | Characters last seen within ±10 chapters |
| `getOpenThreadsForStory(db, storyId)` | All non-resolved open threads |
| `getPlantedSeedsForStory(db, storyId)` | All seeds for a story |
| `getSeedsDueForChapter(db, storyId, chapterNumber)` | Seeds with plant window covering the chapter |
| `getRecentSummaries(db, storyId, beforeChapter, limit)` | Most recent chapter summaries before a chapter |
| `getTopKCanonFacts(db, storyId, embedding, topK, minImportance?)` | pgvector cosine similarity search on canon facts |
| `getPastChapterSummaries(db, storyId, currentChapter, minGap, topK)` | Older chapter summaries (for flashback/callback) |



Module: Context Retrieval Outputs
- Compact type objects (via [[modules/context-compact]])
- Also exports `RetrievalResult` aggregate type



Module: Context Retrieval Implementation notes
- `getTopKCanonFacts` uses `pgvector` `` (cosine distance) operator for embedding similarity search
- All functions take a `Db` (Drizzle client) as first parameter
- All return compact representations, not raw DB rows



Module: Context Retrieval Depends on
- [[modules/context-compact]] — for compacting DB rows
- [[modules/context-types]] — for return types
- [[packages/package-db]] — for Drizzle schema and `Db` type



Module: Context Retrieval Used by
- [[modules/context-builder]] — calls these functions to populate all three context tiers



Module: Context Retrieval Related database tables
- [[database/tables/story-bibles]]
- [[database/tables/sagas]]
- [[database/tables/arcs]]
- [[database/tables/characters]]
- [[database/tables/open-threads]]
- [[database/tables/planted-seeds]]
- [[database/tables/chapter-summaries]]
- [[database/tables/canon-facts]] — vector search via pgvector



Module: Context Retrieval Related flows
- [[flows/chapter-generation-flow]]

---

## context-serialize

`modules/context-serialize.md`

---
type: module
source: packages/ai/src/context/serialize.ts
---



Module: Context Serialize Responsibility
**Type:** Module
**Source:** `packages/ai/src/context/serialize.ts`
Produces a deterministic (canonical) JSON string from any value by recursively sorting all object keys before stringifying — ensuring the same logical data always produces the same string regardless of insertion order.



Module: Context Serialize Key exports / functions
- `canonicalJsonStringify(value: unknown): string`
- Normalizes value recursively (sorts object keys, passes arrays as-is)
- Returns `JSON.stringify()` of the normalized result



Module: Context Serialize Inputs
- Any JavaScript value (object, array, primitive, `null`)



Module: Context Serialize Outputs
- A canonical JSON string with all object keys sorted alphabetically at every nesting level



Module: Context Serialize Implementation notes
- Internal `normalize(value)` function handles the recursive key-sorting
- Arrays are normalized element-by-element but not sorted (order matters for arrays)
- `null` / `undefined` are passed through as-is
- This is critical for cache-key stability: two `HotTier` objects that are semantically identical but built in different property orders will produce the same hash



Module: Context Serialize Depends on
- (none — pure utility)



Module: Context Serialize Used by
- [[modules/context-cache-keys]] — passes canonical JSON through SHA-256



Module: Context Serialize Related flows
- [[flows/chapter-generation-flow]]

---

## context-shrink

`modules/context-shrink.md`

---
type: module
source: packages/ai/src/context/shrink.ts
---



Module: Context Shrink Responsibility
**Type:** Module
**Source:** `packages/ai/src/context/shrink.ts`
Implements `shrinkToFit()` — progressively removes context items in a priority-ordered sequence until the serialized context fits within the target token budget.



Module: Context Shrink Key exports / functions
- `shrinkToFit(ctx: ChapterContext, targetBudget: number): ChapterContext`
- Iterates `CONTEXT_CONFIG.SHRINK_ORDER`, applying each shrink action until the token estimate is within budget
- Returns a new `ChapterContext` (does not mutate input)



Module: Context Shrink Inputs
- `ctx: ChapterContext` — the full context object
- `targetBudget: number` — maximum token count (from `EffectiveConfig`)



Module: Context Shrink Outputs
- A new `ChapterContext` with progressively stripped content; original is not mutated (`structuredClone`)



Module: Context Shrink Shrink order (from `CONTEXT_CONFIG.SHRINK_ORDER`)
1. `retrievedPastChapters` → cleared to `[]`
2. `retrievedFacts` → cleared to `[]`
3. `recentSummaries` → truncated to first 2 entries
4. `activeCharactersCompactMode` → strips `bloodlines`, `shortTraits`, `currentRealm`, `faction` from each character



Module: Context Shrink Depends on
- [[modules/context-types]] — for `ChapterContext`, `CharacterCompact`
- `@novel/core` — for `CONTEXT_CONFIG.SHRINK_ORDER`
- `@novel/core/utils/tokens` — for `estimateTokensJson()`



Module: Context Shrink Used by
- [[modules/context-builder]] — called after context assembly if over token budget



Module: Context Shrink Related flows
- [[flows/chapter-generation-flow]]

---

## context-types

`modules/context-types.md`

---
type: module
source: packages/ai/src/context/types.ts
---



Module: Context Types Responsibility
**Type:** Module
**Source:** `packages/ai/src/context/types.ts`
Central TypeScript type definitions for the 3-tier context system used by all LLM agents.



Module: Context Types Key exports / types
| Type | Description |
|------|-------------|
| `ChapterContext` | Root type with `hot`, `warm`, `cold` tiers + `meta` |
| `HotTier` | Stable data: systemRules, bibleCompact, styleGuide, powerSystem, styleFewShots, genreContract, personalityContract, storyOptionsBlock |
| `WarmTier` | Semi-stable: sagaSummary, arcSummary, activeCharacters, arcOpenThreads, arcPlantedSeeds |
| `ColdTier` | Dynamic: recentSummaries, retrievedFacts, retrievedPastChapters, seedsToPlantNow, packet |
| `CharacterCompact` | id, name, currentRealm?, status, bloodlines, faction?, shortTraits |
| `ThreadCompact` | id, title, state, introducedChapter, plannedResolutionChapter? |
| `SeedCompact` | id, seedText, payoffDescription, plantWindowStart/End, payoffChapter?, status |
| `ChapterSummaryCompact` | chapterNumber, summary |
| `CanonFactCompact` | id, topic, importance, fact |
| `StyleFewShot` | excerpt, sourceChapter? |



Module: Context Types `ChapterContext.meta` fields
- `storyId`, `chapterNumber`, `arcId`
- `hotHash`, `warmHash` — SHA-256 hashes for cache detection (set by [[modules/context-cache-keys]])
- `targetInputBudget` — token cap for this context



Module: Context Types Depends on
- `packages/ai/src/schemas/packet.ts` — for `ChapterPacket` (used in `ColdTier.packet`)



Module: Context Types Used by
- [[modules/context-builder]]
- [[modules/context-compact]]
- [[modules/context-retrieval]]
- [[modules/context-shrink]]
- [[modules/context-cache-keys]]
- All LLM agents that receive a `ChapterContext`



Module: Context Types Related domain concepts
- [[domain/context-tiers]]
- [[domain/chapter-packet]]

---

## cost-tracker

`modules/cost-tracker.md`

---
type: module
source: packages/db/src/services/cost-tracker.ts
---



Module: Cost Tracker Responsibility
Accumulates LLM call costs into the story's running total.



Module: Cost Tracker Source Evidence
`packages/db/src/services/cost-tracker.ts` — `accumulateStoryCost()`



Module: Cost Tracker Inputs
- `storyId`, `costUsd` (delta)



Module: Cost Tracker Outputs
- Updates [[database/tables/stories]].`totalCostUsd`



Module: Cost Tracker Used By
- [[modules/llm-call-logger]] — called after every LLM call
---
type: module
source: packages/db/src/services/cost-tracker.ts
---



Module: Cost Tracker Responsibility
Accumulates per-call LLM cost into the story's running total.



Module: Cost Tracker Source Evidence
`packages/db/src/services/cost-tracker.ts` — `accumulateStoryCost(storyId, costUsd)`



Module: Cost Tracker Inputs
- `storyId`, `costUsd` (delta)



Module: Cost Tracker Outputs
- Increments [[database/tables/stories]].totalCostUsd



Module: Cost Tracker Used By
- [[modules/llm-call-logger]]

---

## embedding-service

`modules/embedding-service.md`

---
type: module
source: packages/ai/src/embeddings/service.ts
---



Module: Embedding Service Responsibility
Vector embedding of text (canon facts, chapter summaries) for semantic retrieval.



Module: Embedding Service Source Evidence
`packages/ai/src/embeddings/service.ts` — `OpenRouterEmbeddingService`
`packages/ai/src/embeddings/types.ts` — `EmbeddingService` interface
`packages/ai/src/embeddings/mock.ts` — `MockEmbeddingService` (tests)



Module: Embedding Service Interface
`embed({ input, traceId }) → { vector: number[], usage, cost }`



Module: Embedding Service Production Implementation
- Class: `OpenRouterEmbeddingService`
- Endpoint: `https://openrouter.ai/api/v1/embeddings`
- Model: `openai/text-embedding-3-small` (dim 1536, env `EMBEDDING_MODEL`)
- Auth: `OPENROUTER_API_KEY`



Module: Embedding Service Inputs
- Text string(s)
- `traceId` for logging



Module: Embedding Service Outputs
- `vector: number[]` (1536 dimensions)
- Token usage + cost estimate



Module: Embedding Service Used By
- [[modules/canon-merger]] — embeds new canon facts
- [[modules/context-builder]] — queries for similar facts + past chapters



Module: Embedding Service Related Tables
- [[database/tables/canon-facts]] — stores embeddings
- [[database/tables/chapter-summaries]] — stores embeddings



Module: Embedding Service Related External Services
- [[external-services/openrouter-embeddings]]
---
type: module
source: packages/ai/src/embeddings/service.ts
---



Module: Embedding Service Responsibility
Vector embedding for canon facts and chapter summaries. Used for semantic retrieval in context building and similarity checks.



Module: Embedding Service Source Evidence
`packages/ai/src/embeddings/service.ts` — `OpenRouterEmbeddingService`
`packages/ai/src/embeddings/types.ts` — `EmbeddingService` interface
`packages/ai/src/embeddings/mock.ts` — `MockEmbeddingService`



Module: Embedding Service Interface
`embed({ input, traceId }) → { vector: number[], usage, cost }`



Module: Embedding Service Production Implementation
- Endpoint: `https://openrouter.ai/api/v1/embeddings`
- Model: `openai/text-embedding-3-small` (1536 dims, env `EMBEDDING_MODEL`)
- Auth: `OPENROUTER_API_KEY`



Module: Embedding Service Used By
- [[modules/canon-merger]] — embeds new canon facts
- [[modules/context-builder]] — vector retrieval for facts + past chapters



Module: Embedding Service Related Tables
- [[database/tables/canon-facts]] (stores embeddings)
- [[database/tables/chapter-summaries]] (stores embeddings)



Module: Embedding Service Related External Services
- [[external-services/openrouter-embeddings]]

---

## epub-exporter

`modules/epub-exporter.md`

---
type: module
source: packages/core/src/services/exporters/epub-exporter.ts
---



Module: EPUB Exporter Responsibility
**Type:** Module
**Source:** `packages/core/src/services/exporters/epub-exporter.ts`
Exports a story's chapters as an EPUB file, converting plain-text chapter content into structured HTML and packaging it via `epub-gen-memory`.



Module: EPUB Exporter Key exports / functions
- `renderEpub(input: EpubExportInput): Promise`
- Generates a complete EPUB file in memory
- Returns a `Buffer` containing the EPUB binary



Module: EPUB Exporter Types
- `EpubExportInput`:
```
story: { title, author: string | null, synopsis: string | null }
chapters: Array
```



Module: EPUB Exporter Implementation notes
- Each paragraph (double-newline separated) is wrapped in `` tags with HTML escaping
- Chapter titles formatted as: `Chương {number} — {title}`
- Author falls back to `EXPORT_CONFIG.EPUB_AUTHOR_FALLBACK` when null
- Language from `EXPORT_CONFIG.EPUB_LANGUAGE`
- Uses `epub-gen-memory` npm package (handles the `.default` ESM/CJS interop)



Module: EPUB Exporter Depends on
- `@novel/core` — for `EXPORT_CONFIG`
- `epub-gen-memory` — third-party EPUB generation library



Module: EPUB Exporter Used by
- [[jobs/job-generate-export]] — when export format is `epub`



Module: EPUB Exporter Related database tables
- [[database/tables/chapters]] — source chapter content
- [[database/tables/stories]] — source story metadata



Module: EPUB Exporter Related flows
- [[flows/chapter-generation-flow]]

---

## llm-call-logger

`modules/llm-call-logger.md`

---
type: module
source: packages/ai/src/llm-call-logger.ts
---



Module: LLM Call Logger (LoggedLLMProvider) Responsibility
Wraps any LLMProvider. Records every call to `llm_calls` table. Accumulates story cost in `story_costs`. Provides `makeDrizzleRecorder()` factory.



Module: LLM Call Logger (LoggedLLMProvider) Source Evidence
`packages/ai/src/llm-call-logger.ts`



Module: LLM Call Logger (LoggedLLMProvider) Class
`LoggedLLMProvider` — implements `LLMProvider`
- `name`: `logged()`
- On every `complete()`: delegates to inner provider, then writes to DB



Module: LLM Call Logger (LoggedLLMProvider) Inputs
- Any `LLMProvider` instance (inner)
- DB instance



Module: LLM Call Logger (LoggedLLMProvider) Outputs
- Passes through `CompletionResponse` from inner provider
- Side-effect: inserts row into [[database/tables/llm-calls]]
- Side-effect: calls `accumulateStoryCost()` → updates `stories.totalCostUsd`



Module: LLM Call Logger (LoggedLLMProvider) Depends On
- [[ai-providers/provider-interface]] — wraps any provider
- [[packages/package-db]] — writes llm_calls
- [[modules/cost-tracker]]



Module: LLM Call Logger (LoggedLLMProvider) Used By
- All job workers (wraps active provider)
- [[apps/app-api]] (`lib/llm-provider.ts` — `buildLoggedProvider()`)



Module: LLM Call Logger (LoggedLLMProvider) Related Tables
- [[database/tables/llm-calls]]
- [[database/tables/stories]] (totalCostUsd updated)



Module: LLM Call Logger (LoggedLLMProvider) Related Flows
- [[flows/llm-provider-flow]]
---
type: module
source: packages/ai/src/llm-call-logger.ts
---



Module: LLM Call Logger Class
`LoggedLLMProvider` — wraps any `LLMProvider`, implements the same interface.



Module: LLM Call Logger Responsibility
Records every LLM call to `llm_calls`. Accumulates story cost via `accumulateStoryCost()`.



Module: LLM Call Logger Source Evidence
`packages/ai/src/llm-call-logger.ts`
`packages/ai/src/llm-call-logger.ts` — `makeDrizzleRecorder()`



Module: LLM Call Logger Inputs
- Any `LLMProvider` inner instance
- DB handle



Module: LLM Call Logger Outputs
- Passthrough `CompletionResponse`
- Side-effect: inserts into [[database/tables/llm-calls]]
- Side-effect: updates [[database/tables/stories]].totalCostUsd



Module: LLM Call Logger Depends On
- [[ai-providers/provider-interface]]
- [[modules/cost-tracker]]
- [[packages/package-db]]



Module: LLM Call Logger Used By
- All jobs in [[apps/app-worker]]
- [[apps/app-api]] via `buildLoggedProvider()`



Module: LLM Call Logger Related Flows
- [[flows/llm-provider-flow]]

---

## logger

`modules/logger.md`

---
type: module
source: packages/core/src/logger.ts
---



Module: Logger Responsibility
**Type:** Module
**Source:** `packages/core/src/logger.ts`
Pino-based structured JSON logger factory — provides a root logger and helpers to create named child loggers for every service, agent, and job in the monorepo.



Module: Logger Key exports / functions
- `rootLogger` — the singleton Pino logger instance
- `createLogger(name: string): Logger` — creates a child logger with `{ component: name }` binding
- `child(bindings: Record): Logger` — creates a child logger with arbitrary bindings
- `Logger` — type alias for the Pino logger instance type



Module: Logger Configuration
- Log level from `LOG_LEVEL` environment variable (default: `'info'`)
- Base fields: `{ service: 'novel-writer' }`
- Timestamps: ISO 8601 format (`pino.stdTimeFunctions.isoTime`)



Module: Logger Usage pattern
```ts
import { createLogger } from '@novel/core/logger';
const log = createLogger('WriterAgent');
log.info({ chapterId }, 'Writing chapter');
```



Module: Logger Depends on
- `pino` — structured logging library



Module: Logger Used by
- [[apps/app-api]] — HTTP request logging
- [[apps/app-worker]] — job execution logging
- All agents and jobs for structured output



Module: Logger Related flows
- (cross-cutting — used everywhere)

---

## markdown-exporter

`modules/markdown-exporter.md`

---
type: module
source: packages/core/src/services/exporters/markdown-exporter.ts
---



Module: Markdown Exporter Responsibility
**Type:** Module
**Source:** `packages/core/src/services/exporters/markdown-exporter.ts`
Exports a story's chapters as a single Markdown document with standard heading structure.



Module: Markdown Exporter Key exports / functions
- `renderMarkdown(input: MarkdownExportInput): string`
- Returns a complete Markdown string for the entire story
- Synchronous (pure function, no I/O)



Module: Markdown Exporter Types
- `MarkdownExportInput`:
```
story: { title, author: string | null, synopsis: string | null }
chapters: Array
```



Module: Markdown Exporter Output format
```
# {story.title}

_by {author}_

{synopsis}

---

## Chương {number} — {title}

{content}
```



Module: Markdown Exporter Implementation notes
- Author line omitted when `story.author` is null
- Synopsis omitted when `story.synopsis` is null
- A `---` separator follows the story header
- Chapter headings use `##` level
- Pure string concatenation — no external dependencies



Module: Markdown Exporter Used by
- [[jobs/job-generate-export]] — when export format is `markdown`



Module: Markdown Exporter Related database tables
- [[database/tables/chapters]] — source chapter content
- [[database/tables/stories]] — source story metadata



Module: Markdown Exporter Related flows
- [[flows/chapter-generation-flow]]

---

## parse-completion-json

`modules/parse-completion-json.md`

---
type: module
source: packages/ai/src/parse-completion-json.ts
---



Module: Parse Completion JSON Responsibility
**Type:** Module
**Source:** `packages/ai/src/parse-completion-json.ts`
Safely parses JSON objects from LLM completion responses and wraps all completion calls with retry logic for transient model errors.



Module: Parse Completion JSON Key exports / functions
- `parseCompletionJsonObject(res: CompletionResponse, context: string): unknown`
- Extracts and parses a JSON object from a completion response
- Falls back to `choices[0].message.parsed` (structured output) or `choices[0].message.content`
- Throws a descriptive error if response is empty, null literal, or not a JSON object
- `withCompletionRetry(context, complete, maxRetries?): Promise`
- Wraps `complete()` with retry + calls `parseCompletionJsonObject` on success
- Default: 3 retries with exponential backoff (1 s, 2 s, 4 s, capped at 30 s)
- `withCompletionRetryRaw(context, complete, maxRetries?): Promise`
- Same retry wrapper but returns raw `CompletionResponse` (caller parses)



Module: Parse Completion JSON Inputs
- `CompletionResponse` from any [[ai-providers/provider-interface]] implementation
- `context: string` — human-readable label for error messages



Module: Parse Completion JSON Outputs
- Parsed JSON object (`unknown`, cast by caller) or `CompletionResponse`



Module: Parse Completion JSON Retry behavior
- Retried conditions: `finishReason === 'error'` or `finishReason === 'content_filter'`
- **Not** retried: JSON parse errors, wrong type errors (programming/prompt bugs)
- Exponential backoff: `min(1000 * 2^attempt, 30000)` ms



Module: Parse Completion JSON Depends on
- [[ai-providers/provider-interface]] — for `CompletionResponse` type



Module: Parse Completion JSON Used by
- [[agents/writer]] — parses structured chapter output
- [[agents/packet-generator]] — parses `ChapterPacket` JSON
- [[agents/llm-validator]] — parses validation output
- [[agents/auto-fixer]] — parses fix instructions
- [[agents/canon-extractor]] — parses extracted facts
- All other LLM agents expecting structured JSON responses



Module: Parse Completion JSON Related flows
- [[flows/llm-provider-flow]]

---

## policy-high-stakes-triggers

`modules/policy-high-stakes-triggers.md`

---
type: module
source: packages/core/src/policy/high-stakes-triggers.ts
---



Module: Policy — High-Stakes Triggers Responsibility
**Type:** Module
**Source:** `packages/core/src/policy/high-stakes-triggers.ts`
Determines whether a high-stakes review should be triggered for a chapter, based on validator severity and arc boundaries.



Module: Policy — High-Stakes Triggers Key exports / functions
- `shouldRunReviewer(ctx: TriggerContext): { run: boolean; reason?: 'arc_end' | 'critical_severity' }`



Module: Policy — High-Stakes Triggers Inputs (`TriggerContext`)
| Field | Type | Description |
|-------|------|-------------|
| `chapterNumber` | `number` | Current chapter being evaluated |
| `arcEndChapter` | `number \| null` | The last chapter of the current arc (null if unknown) |
| `worstValidatorSeverity` | `'low' \| 'medium' \| 'high' \| 'critical' \| 'none'` | Worst severity from validation passes |



Module: Policy — High-Stakes Triggers Outputs
- `{ run: false }` — no review needed
- `{ run: true, reason: 'critical_severity' }` — triggered by critical validator finding
- `{ run: true, reason: 'arc_end' }` — triggered by arc boundary (when `LONG_FORM_CONFIG.HIGH_STAKES_REVIEW_AT_ARC_END` is `true`)



Module: Policy — High-Stakes Triggers Trigger conditions (priority order)
1. `worstValidatorSeverity === 'critical'` → always triggers
2. `HIGH_STAKES_REVIEW_AT_ARC_END && arcEndChapter === chapterNumber` → arc boundary trigger



Module: Policy — High-Stakes Triggers Depends on
- `@novel/core` — for `LONG_FORM_CONFIG`



Module: Policy — High-Stakes Triggers Used by
- [[jobs/job-generate-chapter]] — decides whether to enqueue [[jobs/job-high-stakes-review]]



Module: Policy — High-Stakes Triggers Related flows
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]



Module: Policy — High-Stakes Triggers See also
- [[agents/high-stakes-reviewer]]

---

## policy-mode-escalation

`modules/policy-mode-escalation.md`

---
type: module
source: packages/core/src/policy/mode-escalation.ts
---



Module: Policy — Mode Escalation Responsibility
**Type:** Module
**Source:** `packages/core/src/policy/mode-escalation.ts`
Resolves the *effective* generation mode — may escalate the user-requested mode to `'safe'` when special chapter conditions are detected.



Module: Policy — Mode Escalation Key exports / functions
- `resolveEffectiveMode(ctx: ModeContext, deps: ModeEscalationDeps): Promise`



Module: Policy — Mode Escalation Types
- `Mode = 'safe' | 'semi_auto' | 'full_auto'`
- `ModeContext` — `{ storyId, chapterNumber, userMode: Mode }`
- `ArcBoundary` — `{ startChapter: number | null, endChapter: number | null }`
- `ModeEscalationDeps` — injectable deps:
- `getArcBoundaryForChapter(storyId, chapterNumber): Promise`
- `hasBlockingPendingUpdates(storyId): Promise`



Module: Policy — Mode Escalation Escalation triggers (reasons)
| Reason | Condition |
|--------|-----------|
| `first_chapter` | `chapterNumber === 1` |
| `arc_start` | chapter is the first chapter of its arc |
| `arc_end` | chapter is the last chapter of its arc |
| `blocking_pending` | story has unresolved blocking `pending_canon_updates` |



Module: Policy — Mode Escalation Behavior
- If `userMode === 'safe'` OR `AUTO_ESCALATE_TO_SAFE_MODE` is `false`: returns user's mode unchanged
- If any escalation trigger fires: returns `{ mode: 'safe', reasons: [...] }`
- If no triggers: returns original `userMode`



Module: Policy — Mode Escalation Depends on
- `@novel/core` — for `LONG_FORM_CONFIG.AUTO_ESCALATE_TO_SAFE_MODE`



Module: Policy — Mode Escalation Used by
- [[jobs/job-generate-chapter]] — before starting chapter generation
- [[jobs/job-generate-batch]] — before scheduling a batch



Module: Policy — Mode Escalation Related database tables
- [[database/tables/pending-canon-updates]] — checked for blocking status
- [[database/tables/arcs]] — checked for arc boundaries



Module: Policy — Mode Escalation Related flows
- [[flows/chapter-generation-flow]]

---

## provider-switcher

`modules/provider-switcher.md`

---
type: module
source: apps/api/src/lib/provider-switcher.ts
---



Module: Provider Switcher Responsibility
Runtime LLM provider factory. Reads active provider from DB (`llm_provider_state`), instantiates the correct provider class, wraps in [[modules/llm-call-logger]].



Module: Provider Switcher Source Evidence
- `apps/api/src/lib/provider-switcher.ts`
- `apps/api/src/lib/llm-settings.ts` — DB read/write for settings



Module: Provider Switcher Inputs
- [[database/tables/llm-provider-state]] — `activeProvider` name
- [[database/tables/llm-provider-settings]] — `modelRoutes` per provider



Module: Provider Switcher Outputs
- Wrapped `LLMProvider` instance (`LoggedLLMProvider`)



Module: Provider Switcher Provider Options
- [[ai-providers/provider-opencode]] (default)
- [[ai-providers/provider-openrouter]]
- [[ai-providers/provider-ollama]]
- [[ai-providers/provider-vmlx]]



Module: Provider Switcher Used by
- [[apps/app-api]] routes that call LLM directly (bible gen, saga/arc planning)
- [[apps/app-worker]] job dispatcher (snapshots provider at job dispatch time)



Module: Provider Switcher Related flows
- [[flows/llm-provider-flow]]

---

## queue-client

`modules/queue-client.md`

---
type: module
source: apps/api/src/services/queue-client.ts
---



Module: Queue Client Responsibility
BullMQ queue wrappers used by API handlers to enqueue jobs to the worker.



Module: Queue Client Source Evidence
`apps/api/src/services/queue-client.ts`



Module: Queue Client Queues Wrapped
- `generate-chapter`
- `generate-batch`
- `generate-export`
- `high-stakes-review`



Module: Queue Client Depends On
- [[external-services/redis-bullmq]]



Module: Queue Client Used By
- [[routes/route-chapters]] — enqueue generate-chapter
- [[routes/route-batches]] — enqueue generate-batch
- [[routes/route-exports]] — enqueue generate-export
- [[routes/route-reviews]] — enqueue high-stakes-review



Module: Queue Client Related Flows
- [[flows/job-worker-flow]]
---
type: module
source: apps/api/src/services/queue-client.ts
---



Module: Queue Client Responsibility
BullMQ queue wrappers used by API handlers to enqueue jobs.



Module: Queue Client Source Evidence
`apps/api/src/services/queue-client.ts`



Module: Queue Client Queues Wrapped
- `generate-chapter`
- `generate-batch`
- `generate-export`
- `high-stakes-review`



Module: Queue Client Depends On
- [[external-services/redis-bullmq]]



Module: Queue Client Used By
- [[routes/route-chapters]]
- [[routes/route-batches]]
- [[routes/route-exports]]
- [[routes/route-reviews]]



Module: Queue Client Related Flows
- [[flows/job-worker-flow]]

---

## story-domain

`modules/story-domain.md`

---
type: module
source: packages/ai/src/story-domain.ts
---



Module: Story Domain Context Loader Responsibility
Loads story-level domain context from catalog definitions: genre definition, personality definition, story options.



Module: Story Domain Context Loader Source Evidence
`packages/ai/src/story-domain.ts` — `loadStoryDomainContext()`



Module: Story Domain Context Loader Inputs
- `storyId` (reads `stories` table for genre, personality, tone)



Module: Story Domain Context Loader Outputs
- `genreDef` — genre family, name, features
- `personalityDef` — protagonist archetype traits
- `storyOptions` — tone, pacing, POV, etc.



Module: Story Domain Context Loader Depends On
- [[packages/package-core]] catalog (genres.ts, personalities.ts, story-options.ts)
- [[database/tables/stories]]



Module: Story Domain Context Loader Used By
- [[jobs/job-generate-chapter]] (Stage 1 setup)
- [[modules/context-builder]]
---
type: module
source: packages/ai/src/story-domain.ts
---



Module: Story Domain Context Loader Responsibility
Loads story-level domain context (genre def, personality def, story options) from catalog.



Module: Story Domain Context Loader Source Evidence
`packages/ai/src/story-domain.ts` — `loadStoryDomainContext()`



Module: Story Domain Context Loader Inputs
- `storyId` → reads [[database/tables/stories]]



Module: Story Domain Context Loader Outputs
- `genreDef`, `personalityDef`, `storyOptions`



Module: Story Domain Context Loader Depends On
- [[packages/package-core]] catalogs (genres, personalities, story-options)



Module: Story Domain Context Loader Used By
- [[jobs/job-generate-chapter]] (Stage 1)
- [[modules/context-builder]]

---

## trace

`modules/trace.md`

---
type: module
source: packages/core/src/trace.ts
---



Module: Trace Responsibility
**Type:** Module
**Source:** `packages/core/src/trace.ts`
Provides unique trace IDs and `AsyncLocalStorage`-based context propagation for correlating all LLM calls and log entries belonging to a single generation request.



Module: Trace Key exports / functions
- `newTraceId(): string` — generates a UUID v4 using `node:crypto.randomUUID()`
- `withTrace(ctx: TraceContext, fn: () => T): T` — runs `fn` inside an `AsyncLocalStorage` scope carrying `ctx`
- `getTraceId(): string | undefined` — retrieves the `traceId` from the current async context (returns `undefined` if no trace active)



Module: Trace Types
- `TraceContext = { traceId: string }`



Module: Trace Implementation notes
- Uses `AsyncLocalStorage` from `node:async_hooks` — trace ID automatically propagates across `await` boundaries within the same async context
- No external dependencies; pure Node.js built-ins
- `withTrace` wraps a job/request; any code inside (even deep call stacks) can call `getTraceId()`



Module: Trace Depends on
- `node:crypto` — `randomUUID()`
- `node:async_hooks` — `AsyncLocalStorage`



Module: Trace Used by
- [[apps/app-api]] — wraps each HTTP request handler
- [[jobs/job-generate-chapter]] — wraps the full chapter pipeline
- [[modules/llm-call-logger]] — reads `getTraceId()` to attach to every `llm_calls` row



Module: Trace Related database tables
- [[database/tables/llm-calls]] — `traceId` field links all LLM calls for a single generation run



Module: Trace Related flows
- [[flows/llm-provider-flow]]
- [[flows/chapter-generation-flow]]

---

## validation-logger

`modules/validation-logger.md`

---
type: module
source: packages/ai/src/validators/validation-logger.ts
---



Module: Validation Logger Responsibility
**Type:** Module
**Source:** `packages/ai/src/validators/validation-logger.ts`
Formats deterministic and LLM validation results into a human-readable Vietnamese text report (`BÁO CÁO KIỂM TRA CHƯƠNG`) for logging and storage.



Module: Validation Logger Key exports / functions
- `formatValidationReport(input: ValidationReportInput): string`
- Renders a structured Vietnamese-language validation report
- Includes deterministic check table, LLM validator findings, and overall PASSED/FAILED verdict
- `ValidationReportInput` interface — input shape for the formatter



Module: Validation Logger Inputs (`ValidationReportInput`)
- `storyId`, `chapterNumber`, `chapterTitle?`, `wordCount?`
- `deterministicResult?: DeterministicValidatorResult` — from [[validators/deterministic-runner]]
- `llmResult?: LlmValidatorOutput` — from [[agents/llm-validator]]
- `timestamp?: Date`



Module: Validation Logger Outputs
- Formatted multi-line string (plain text) suitable for console output or DB storage
- Uses severity icons: 🔴 critical, 🟠 high, 🟡 medium, 🔵 low



Module: Validation Logger Implementation notes
- Vietnamese UI labels: "Thời gian", "Truyện", "Chương", "Tổng từ", "KẾT QUẢ CUỐI CÙNG"
- Deterministic section shows check-by-check pass/fail with issue details
- LLM section shows overall pass/fail, summary, and per-issue details
- Short-circuit warning shown if deterministic runner stopped early
- Does **not** write to the database directly — caller is responsible for persistence



Module: Validation Logger Depends on
- [[validators/deterministic-runner]] — for `DeterministicValidatorResult` type
- [[agents/llm-validator]] — for `LlmValidatorOutput` type



Module: Validation Logger Used by
- [[validators/deterministic-runner]] — to format and log results
- [[agents/llm-validator]] — to format and log results



Module: Validation Logger Related database tables
- [[database/tables/validations]] — report string may be persisted here by callers



Module: Validation Logger Related flows
- [[flows/validation-flow]]

---
