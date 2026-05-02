---
type: domain-concept
---

# Domain: Arc

**Type:** Domain Concept

## Description
An "arc" is a story division within a saga, representing a contained narrative unit with a specific theme or conflict. Each saga contains 2–5 arcs. Arcs are the primary structural unit for triggering high-stakes reviews and safe-mode escalations, making them critical control points in the generation pipeline.

## Key Properties / Rules
- `arcNumber` — ordinal position within its parent saga (1-based)
- `startChapter` / `endChapter` — chapter range this arc covers
- `theme` — short description of the arc's central narrative theme
- `summary` — human/AI summary of the arc's events
- `rollingContext` — AI-maintained rolling summary, **refreshed every 5 chapters** (`ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS = 5`)
- **Arc boundaries are special**: the first and last chapter of an arc automatically trigger:
  - Escalation to `safe` [[domain/generation-mode]] (human approval required)
  - [[jobs/job-high-stakes-review]] queued asynchronously
- `rollingContext` is part of the **WARM context tier** fed to the writer
- Arcs per saga: **2–5** (`LONG_FORM_CONFIG.ARCS_PER_SAGA_RANGE`)

## Related Database Tables
- [[database/tables/arcs]]

## Related Flows
- [[jobs/job-refresh-arc-summary]] — triggers `rollingContext` refresh
- [[jobs/job-high-stakes-review]] — triggered at arc boundaries
- [[jobs/job-generate-chapter]] — checks arc boundary for mode escalation

## Related Domain Concepts
- [[domain/story]]
- [[domain/saga]]
- [[domain/chapter]]
- [[domain/generation-mode]]
- [[domain/context-tiers]]

## Implemented By
- `packages/db/src/schema/arcs.ts`
- `packages/core/src/config/generation.ts` — `LONG_FORM_CONFIG`, `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`
- [[agents/arc-planner]] — creates the arc plan
- [[prompts/prompt-arc-planner-v2]]
