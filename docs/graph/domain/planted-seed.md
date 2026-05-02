---
type: domain-concept
---

# Domain: Planted Seed

**Type:** Domain Concept

## Description
A planted seed is a narrative foreshadowing element — a detail, prophecy, object, or event introduced early in the story that is intended to pay off at a specific later chapter. Seeds enforce long-range narrative coherence by ensuring that setup and payoff are explicitly tracked rather than left to the LLM's context window. They are created during saga planning and delivered to the writer via the COLD context tier when their payoff chapter arrives.

## Key Properties / Rules
- `description` — what was planted (e.g., "The jade pendant given to the protagonist in ch. 3 has a dormant formation inside")
- `plantedAtChapter` — chapter where the seed was introduced
- `plannedPayoffChapter` — target chapter where the seed should resolve
- `status` — **`planted | due | paid_off | cancelled`**
  - `due` — the current generation chapter equals `plannedPayoffChapter`; seed is injected into COLD context tier
  - `paid_off` — seed resolved by a generated chapter
  - `cancelled` — seed abandoned (arc restructure, explicit cancel)
- **10–30 seeds per saga plan** (`LONG_FORM_CONFIG.SEEDS_PER_SAGA_PLAN_RANGE = [10, 30]`)
- Seeds with `status = due` are included in the **COLD context tier** for the writer

## Related Database Tables
- [[database/tables/planted-seeds]]

## Related Flows
- [[jobs/job-generate-chapter]] — seeds due now are loaded into COLD context
- [[jobs/job-generate-batch]] — [[agents/saga-planner]] creates seeds during saga planning

## Related Domain Concepts
- [[domain/saga]]
- [[domain/chapter]]
- [[domain/context-tiers]]
- [[domain/pending-canon-update]]

## Implemented By
- `packages/db/src/schema/planted-seeds.ts`
- `packages/core/src/config/generation.ts` — `LONG_FORM_CONFIG.SEEDS_PER_SAGA_PLAN_RANGE`
- [[agents/saga-planner]] — creates seeds during saga plan
- [[modules/context-builder]] — injects due seeds into COLD tier
