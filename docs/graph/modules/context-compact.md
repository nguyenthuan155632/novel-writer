---
type: module
source: packages/ai/src/context/compact.ts
---

# Module: Context Compact

**Type:** Module  
**Source:** `packages/ai/src/context/compact.ts`

## Responsibility
Converts full database row objects into compact/abbreviated representations (stripping noise, capping array lengths) to save tokens in the LLM context window.

## Key exports / functions
- `compactCharacter(c, opts?: { stripOptional? }): CharacterCompact` — trims traits to 5, strips optional fields when `stripOptional=true`
- `compactThread(t): ThreadCompact` — maps DB `status` to `state: 'open' | 'partial' | 'resolved'`
- `compactSeed(s): SeedCompact` — maps DB seed row to `SeedCompact` with validated status enum
- `compactSummary(s): ChapterSummaryCompact` — extracts `chapterNumber` + `summary`
- `compactFact(f): CanonFactCompact` — extracts `id`, `topic`, `importance`, `fact`

## Inputs
- Raw database row objects from Drizzle queries

## Outputs
- Typed compact objects: `CharacterCompact`, `ThreadCompact`, `SeedCompact`, `ChapterSummaryCompact`, `CanonFactCompact`

## Implementation notes
- `compactCharacter` caps `shortTraits` at 5 entries
- Character `status` is coerced to valid enum values; unknown values fall back to `'unknown'`
- Thread `status` → `state` field rename with validation
- `stripOptional` removes `currentRealm`, `faction` for ultra-compact mode (used during shrink)

## Depends on
- [[modules/context-types]] — for all compact type definitions

## Used by
- [[modules/context-retrieval]] — called on every DB row before building context

## Related flows
- [[flows/chapter-generation-flow]]
