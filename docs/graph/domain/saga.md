---
type: domain-concept
---

# Domain: Saga

**Type:** Domain Concept

## Description
A "saga" is the largest structural division within a story, analogous to a book or major act. Stories are divided into 5–8 sagas (per `LONG_FORM_CONFIG`), each of which groups a set of related arcs. Sagas give the AI planner a high-level narrative frame and carry a rolling AI-maintained summary that keeps later chapters aware of earlier events without re-reading full content.

## Key Properties / Rules
- `sagaNumber` — ordinal position within the story (1-based)
- `startChapter` / `endChapter` — chapter range this saga covers
- `title` — brief name for the saga
- `summary` — human/AI summary of the saga's events
- `rollingContext` — AI-maintained rolling summary, **refreshed every 20 chapters** (`SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS = 20`)
- Each saga contains **2–5 arcs** (`LONG_FORM_CONFIG.ARCS_PER_SAGA_RANGE`)
- **10–30 planted seeds** are created per saga plan (`LONG_FORM_CONFIG.SEEDS_PER_SAGA_PLAN_RANGE`); these are foreshadowing elements linked to the saga
- `rollingContext` is part of the **WARM context tier** fed to the writer

## Related Database Tables
- [[database/tables/sagas]]
- [[database/tables/planted-seeds]]

## Related Flows
- [[jobs/job-refresh-saga-summary]] — triggers `rollingContext` refresh
- [[jobs/job-generate-batch]] — plans sagas before batch generation

## Related Domain Concepts
- [[domain/story]]
- [[domain/arc]]
- [[domain/planted-seed]]
- [[domain/context-tiers]]

## Implemented By
- `packages/db/src/schema/sagas.ts`
- `packages/core/src/config/generation.ts` — `LONG_FORM_CONFIG`
- [[agents/saga-planner]] — creates the saga plan
- [[prompts/prompt-saga-planner-v2]]
