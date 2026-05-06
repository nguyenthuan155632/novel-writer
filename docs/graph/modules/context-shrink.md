---
type: module
source: packages/ai/src/context/shrink.ts
---

# Module: Context Shrink

**Type:** Module  
**Source:** `packages/ai/src/context/shrink.ts`

## Responsibility
Implements `shrinkToFit()` — progressively removes context items in a priority-ordered sequence until the serialized context fits within the target token budget.

## Key exports / functions
- `shrinkToFit(ctx: ChapterContext, targetBudget: number): ChapterContext`
  - Iterates `CONTEXT_CONFIG.SHRINK_ORDER`, applying each shrink action until the token estimate is within budget
  - Returns a new `ChapterContext` (does not mutate input)

## Inputs
- `ctx: ChapterContext` — the full context object
- `targetBudget: number` — maximum token count (from `EffectiveConfig`)

## Outputs
- A new `ChapterContext` with progressively stripped content; original is not mutated (`structuredClone`)

## Shrink order (from `CONTEXT_CONFIG.SHRINK_ORDER`)
1. `retrievedPastChapters` → cleared to `[]`
2. `retrievedFacts` → cleared to `[]`
3. `recentSummaries` → truncated to first 2 entries
4. `activeCharactersCompactMode` → strips `bloodlines`, `shortTraits`, `currentRealm`, `faction` from each character

## Depends on
- [[modules/context-types]] — for `ChapterContext`, `CharacterCompact`
- `@novel/core` — for `CONTEXT_CONFIG.SHRINK_ORDER`
- `@novel/core/utils/tokens` — for `estimateTokensJson()`

## Used by
- [[modules/context-builder]] — called after context assembly if over token budget

## Related flows
- [[flows/chapter-generation-flow]]
## Shrink Order (updated 2026-05-05)
1. `retrievedPastChapters` → cleared to `[]`
2. `retrievedFacts` → cleared to `[]`
3. `recentSummaries` → truncated to first 2 entries
4. `activeCharactersCompactMode` → strips `bloodlines`, `shortTraits`, `currentRealm`, `faction`

Token estimation now uses `gpt-tokenizer` (via `packages/core/src/utils/tokens.ts`) with BPE fallback. Shrink is recursive — reruns after each removal until within budget.