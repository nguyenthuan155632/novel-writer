---
type: module
source: packages/ai/src/context/retrieval.ts
---

# Module: Context Retrieval

**Type:** Module  
**Source:** `packages/ai/src/context/retrieval.ts`

## Responsibility
All database retrieval functions for context building — the single authoritative layer for querying story data needed to assemble a `ChapterContext`.

## Key exports / functions
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

## Outputs
- Compact type objects (via [[modules/context-compact]])
- Also exports `RetrievalResult` aggregate type

## Implementation notes
- `getTopKCanonFacts` uses `pgvector` `<=>` (cosine distance) operator for embedding similarity search
- All functions take a `Db` (Drizzle client) as first parameter
- All return compact representations, not raw DB rows

## Depends on
- [[modules/context-compact]] — for compacting DB rows
- [[modules/context-types]] — for return types
- [[packages/package-db]] — for Drizzle schema and `Db` type

## Used by
- [[modules/context-builder]] — calls these functions to populate all three context tiers

## Related database tables
- [[database/tables/story-bibles]]
- [[database/tables/sagas]]
- [[database/tables/arcs]]
- [[database/tables/characters]]
- [[database/tables/open-threads]]
- [[database/tables/planted-seeds]]
- [[database/tables/chapter-summaries]]
- [[database/tables/canon-facts]] — vector search via pgvector

## Related flows
- [[flows/chapter-generation-flow]]
