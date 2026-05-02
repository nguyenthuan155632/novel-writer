---
type: domain-concept
---

# Domain: Context Tiers

**Type:** Domain Concept

## Description
The 3-tier context cache is the system that assembles the full prompt context for each chapter generation call. Rather than sending all story data to the LLM on every call, context is classified into three tiers by stability and recency. This keeps token usage predictable, enables caching of stable content (HOT tier), and ensures the most relevant recent facts occupy the variable (COLD) tier.

## The Three Tiers

### HOT Tier (target: ~2500 tokens)
Stable, world-level content that rarely changes. Hashed for cache detection — if the hash matches the previous call, the LLM provider can potentially cache the prefix.
- [[domain/story-bible]]: world rules, power system, cultivation system, bloodline system
- Style guide and style few-shots
- Genre contract ([[prompts/contract-genre]])
- Personality contract ([[prompts/contract-personality]])

### WARM Tier (target: ~2000 tokens)
Story-progress-level content that changes on the scale of arcs or sagas.
- [[domain/saga]] `rollingContext` (refreshed every 20 chapters)
- [[domain/arc]] `rollingContext` (refreshed every 5 chapters)
- Active [[domain/character]] list (compact mode if over budget)
- Open [[domain/open-thread|open threads]] (`status = open`)
- Active [[domain/planted-seed|planted seeds]] (summary)

### COLD Tier (target: ~1500 tokens)
Highly specific, chapter-level content assembled fresh for every generation.
- Recent chapter summaries (last 5) from [[database/tables/chapter-summaries]]
- Vector-retrieved [[domain/canon-fact|canon facts]] (top 8 by embedding similarity)
- [[domain/planted-seed|Seeds]] with `status = due` at current chapter
- The [[domain/chapter-packet]] for the chapter being written

## Budget Rules
- Total **normal** budget: **6000 tokens**
- Total **important** budget: **10000 tokens**
- **Shrink order** (when over budget): `retrievedPastChapters` → `retrievedFacts` → `recentSummaries` → `activeCharactersCompactMode`
- Token budgets defined as: `TOKEN_BUDGET_HOT_TARGET`, `TOKEN_BUDGET_WARM_TARGET`, `TOKEN_BUDGET_COLD_TARGET`

## Related Database Tables
- [[database/tables/context-packets]] — every context build logged here
- [[database/tables/chapter-summaries]]
- [[database/tables/story-bibles]]

## Related Flows
- [[jobs/job-generate-chapter]] — triggers context build before writing

## Related Domain Concepts
- [[domain/story-bible]]
- [[domain/saga]]
- [[domain/arc]]
- [[domain/chapter-packet]]
- [[domain/canon-fact]]
- [[domain/planted-seed]]
- [[domain/open-thread]]
- [[domain/character]]

## Implemented By
- `packages/ai/src/context/` — `buildContext()`, `serializeContextForWriter()`
- [[modules/context-builder]]
- [[packages/package-ai]]
