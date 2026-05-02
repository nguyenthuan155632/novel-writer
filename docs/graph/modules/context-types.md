---
type: module
source: packages/ai/src/context/types.ts
---

# Module: Context Types

**Type:** Module  
**Source:** `packages/ai/src/context/types.ts`

## Responsibility
Central TypeScript type definitions for the 3-tier context system used by all LLM agents.

## Key exports / types
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

## `ChapterContext.meta` fields
- `storyId`, `chapterNumber`, `arcId`
- `hotHash`, `warmHash` — SHA-256 hashes for cache detection (set by [[modules/context-cache-keys]])
- `targetInputBudget` — token cap for this context

## Depends on
- `packages/ai/src/schemas/packet.ts` — for `ChapterPacket` (used in `ColdTier.packet`)

## Used by
- [[modules/context-builder]]
- [[modules/context-compact]]
- [[modules/context-retrieval]]
- [[modules/context-shrink]]
- [[modules/context-cache-keys]]
- All LLM agents that receive a `ChapterContext`

## Related domain concepts
- [[domain/context-tiers]]
- [[domain/chapter-packet]]
