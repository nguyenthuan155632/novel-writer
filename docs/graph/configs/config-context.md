---
type: config
source: packages/core/src/config/context.ts
---

# Config: Context

**Type:** Configuration Module  
**Source:** `packages/core/src/config/context.ts`

## Responsibility
Governs how the 3-tier context cache (HOT / WARM / COLD) is assembled for each chapter generation call. Sets token budgets per tier and in aggregate, retrieval counts for vector search, rolling-summary refresh cadences, style few-shot limits, and the shrink order used when the context exceeds its token budget. Also holds Vietnamese past-reference keywords for flashback detection.

## Key Constants

### Token Budgets

| Constant | Value | Usage |
|---|---|---|
| `TOKEN_BUDGET_NORMAL` | 6000 | Standard chapter context total |
| `TOKEN_BUDGET_IMPORTANT` | 10000 | High-stakes chapter context total |
| `TOKEN_BUDGET_HOT_TARGET` | 2500 | HOT tier (bible, style guide, contracts) |
| `TOKEN_BUDGET_WARM_TARGET` | 2000 | WARM tier (saga/arc summaries, characters, threads, seeds) |
| `TOKEN_BUDGET_COLD_TARGET` | 1500 | COLD tier (recent summaries, retrieved facts, packet) |

### Retrieval Counts

| Constant | Value | Description |
|---|---|---|
| `RECENT_CHAPTER_SUMMARIES_COUNT` | 5 | Number of most-recent chapter summaries in COLD tier |
| `RETRIEVED_CANON_FACTS_TOP_K` | 8 | Top-K vector hits for canon fact retrieval |
| `RETRIEVED_PAST_CHAPTERS_TOP_K` | 3 | Top-K vector hits for past-chapter reference retrieval |
| `RETRIEVED_PAST_CHAPTERS_MIN_GAP` | 5 | Minimum chapter gap before a past chapter is eligible for retrieval |
| `RETRIEVAL_MIN_IMPORTANCE` | `['high', 'locked']` | Only facts with these importance levels are retrieved |

### Style Few-Shot

| Constant | Value |
|---|---|
| `STYLE_FEWSHOT_COUNT` | 3 |
| `STYLE_FEWSHOT_MAX_TOKENS_EACH` | 250 |

### Rolling Summary Refresh Cadence

| Constant | Value |
|---|---|
| `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` | 5 |
| `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` | 20 |
| `CHAPTER_SHORT_SUMMARY_TARGET_TOKENS` | 200 |
| `CHAPTER_DETAILED_SUMMARY_TARGET_TOKENS` | 500 |

### Vietnamese Past-Reference Keywords

Used by `past-reference.ts` to detect flashback/callback prose patterns without an LLM call:

```
['lần trước', 'trước đây', 'năm xưa', 'thuở nhỏ', 'kiếp trước', 'callback']
```

- `PAST_REFERENCE_USE_LLM_CLASSIFIER`: `false` — keyword matching only; LLM classifier disabled by default to save cost.

### Shrink Order

When the assembled context exceeds its token budget, slots are trimmed in this priority order (first trimmed first):

1. `retrievedPastChapters`
2. `retrievedFacts`
3. `recentSummaries`
4. `activeCharactersCompactMode`

## Exported Types
- `ContextConfig` — TypeScript type inferred via `typeof CONTEXT_CONFIG`

## Depends on
- [[packages/package-core]]

## Used by
- [[configs/config-effective]] — included as the `context` slice of `EffectiveConfig`
- [[modules/context-builder]] — primary consumer; assembles the full `ChapterContext` using these budgets, retrieval counts, and shrink order
- [[agents/summary-compactor]] — reads `CHAPTER_SHORT_SUMMARY_TARGET_TOKENS`, `CHAPTER_DETAILED_SUMMARY_TARGET_TOKENS`
- [[agents/arc-summary-compactor]] — reads `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`
- [[jobs/job-refresh-arc-summary]] — triggered every `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` chapters
- [[jobs/job-refresh-saga-summary]] — triggered every `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` chapters

## Related domain concepts
- [[configs/config-long-form]] — mirrors the rolling-summary cadence constants. `config-context` is authoritative for context assembly; `config-long-form` is authoritative for structural planning decisions.
- [[modules/embedding-service]] — powers the vector retrieval that populates the COLD tier canon facts and past-chapter slots

## Notes
- `PAST_REFERENCE_USE_LLM_CLASSIFIER: false` keeps per-chapter cost low; the six Vietnamese keywords cover the most common flashback / past-life patterns in xianxia prose.
- `RETRIEVAL_MIN_IMPORTANCE: ['high', 'locked']` deliberately excludes `medium` and `low` importance canon facts to reduce noise in the retrieved context.
- The `SHRINK_ORDER` is intentional: retrieved past chapters are the lowest-value COLD-tier slot; the active characters compact-mode representation is preserved longest because it is structurally critical to coherent prose.
