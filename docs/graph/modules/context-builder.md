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
- Formula: `((currentChapter - startChapter) / (endChapter - startChapter + 1)) * 100`, rounded
- Returns `null` when saga/arc boundaries are not fully defined (startChapter or endChapter is null)

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
