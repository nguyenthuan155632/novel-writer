---
type: domain-concept
---

# Domain: Canon Fact

**Type:** Domain Concept

## Description
A canon fact is an established story truth that **must remain consistent** across all future chapters. Canon facts are extracted automatically after each chapter is generated, staged as [[domain/pending-canon-update]] entries, and — after human approval or auto-merge — become permanent constraints on the story world. They form the ground truth that deterministic validators check against during [[domain/chapter-packet]] auditing and chapter validation.

## Key Properties / Rules
- `content` — the factual statement (e.g., "Elder Huang died in chapter 42", "The Azure Sect is located in the Northern Mountains")
- `importance` — **`'low' | 'medium' | 'high' | 'locked'`**
  - `locked` facts **cannot be contradicted** under any circumstance; checked by [[validators/check-locked-fact]]
  - `high` facts trigger a warning if contradicted
- `tags` — topic classification array (e.g., `['character', 'death']`, `['location', 'sect']`)
- `storyId` + `chapterNumber` — origin tracking
- Facts are **never written directly** to the canon table; they always pass through [[domain/pending-canon-update]] first (via [[modules/canon-merger]])
- `locked` facts are used as hard constraints by the deterministic validator suite

## Canon Integrity Rule
> Never write directly to canon tables. New facts are staged as `pending_canon_updates` and processed through [[modules/canon-merger]].

## Related Database Tables
- [[database/tables/canon-facts]]
- [[database/tables/pending-canon-updates]]

## Related Flows
- [[jobs/job-generate-chapter]] — Stage 7 (MEMORY: canon extraction)

## Related Domain Concepts
- [[domain/pending-canon-update]]
- [[domain/chapter]]
- [[domain/character]]

## Implemented By
- `packages/db/src/schema/canon-facts.ts`
- [[agents/canon-extractor]] — extracts facts from generated chapter prose
- [[modules/canon-merger]] — stages and merges extracted facts
- [[validators/check-locked-fact]] — enforces `locked` importance level
- [[prompts/prompt-canon-extractor-v2]]
