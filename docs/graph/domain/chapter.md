---
type: domain-concept
---

# Domain: Chapter

**Type:** Domain Concept

## Description
A chapter is the minimum atomic unit of generated content — a single prose section of the novel. Each chapter is written by the [[agents/writer]] from a [[domain/chapter-packet]] plan, targeting 2000–3000 words of Vietnamese xianxia prose. Chapters cannot be generated unless the story already has a [[domain/story-bible]], at least one [[domain/saga]], and an enclosing [[domain/arc]].

## Key Properties / Rules
- `chapterNumber` — global ordinal within the story (1-based)
- `title` — extracted from the `TITLE:` prefix line in the writer's output
- `content` — full Vietnamese prose (stored as text)
- `wordCount` — character count of generated prose; **2000–3000 target**, **1500–4000 hard fail range** (checked by [[validators/check-word-count]])
- `status` — lifecycle state:
  - `draft` → `generating` → `completed`
  - `failed` — generation error
  - `paused_pending_updates` — blocked by a [[domain/pending-canon-update]] with `conflictStatus = blocking`
- After generation, the pipeline automatically:
  1. Extracts summaries → [[database/tables/chapter-summaries]]
  2. Extracts [[domain/canon-fact]] entries via [[agents/canon-extractor]]
  3. Pays off any [[domain/planted-seed]] entries due at this chapter

## Related Database Tables
- [[database/tables/chapters]]
- [[database/tables/chapter-summaries]]
- [[database/tables/chapter-packets]]

## Related Flows
- [[jobs/job-generate-chapter]] — orchestrates the full pipeline
- [[pipelines/chapter-generation-pipeline]]

## Related Domain Concepts
- [[domain/chapter-packet]]
- [[domain/story-bible]]
- [[domain/saga]]
- [[domain/arc]]
- [[domain/canon-fact]]
- [[domain/planted-seed]]
- [[domain/pending-canon-update]]
- [[domain/generation-mode]]
- [[domain/context-tiers]]

## Implemented By
- `packages/db/src/schema/chapters.ts`
- `packages/core/src/config/generation.ts` — `CHAPTER_WORD_COUNT_*` constants
- [[agents/writer]] — Stage 5 of pipeline
- [[validators/check-word-count]]
