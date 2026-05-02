---
type: module
source: packages/ai/src/context/past-reference.ts
---

# Module: Context Past Reference

**Type:** Module  
**Source:** `packages/ai/src/context/past-reference.ts`

## Responsibility
Detects whether a chapter packet contains past-reference keywords (flashback/callback signals) so the context builder can fetch relevant older chapter summaries for the COLD tier.

## Key exports / functions
- `detectPastReferences(text: string, keywords?: readonly string[]): string[]`
  - Returns the list of matched keywords found in `text`
  - Falls back to `CONTEXT_CONFIG.PAST_REFERENCE_KEYWORDS` when no custom keyword list is provided

## Inputs
- `text` — stringified chapter packet or chapter description
- Optional `keywords` override — custom keyword list (defaults to config)

## Outputs
- Array of matched keyword strings (empty if none found)
- When non-empty: caller should fetch past chapter summaries via `getPastChapterSummaries()` in [[modules/context-retrieval]]

## Configuration
- `CONTEXT_CONFIG.PAST_REFERENCE_KEYWORDS` — default Vietnamese flashback keywords list:
  `'lần trước'`, `'trước đây'`, `'năm xưa'`, `'thuở nhỏ'`, `'kiếp trước'`, `'callback'` and similar
- `CONTEXT_CONFIG.PAST_REFERENCE_USE_LLM_CLASSIFIER` — if `false` (default), uses regex-only matching; reserved for future LLM classifier upgrade

## Depends on
- `@novel/core` — for `CONTEXT_CONFIG`

## Used by
- [[modules/context-builder]] — gates fetching of past chapter summaries into the COLD tier

## Related flows
- [[flows/chapter-generation-flow]]
