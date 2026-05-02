---
type: ai-agent
source: packages/ai/src/agents/saga-planner.ts
---

# Agent: Saga Planner

## Responsibility
Plans the saga structure (5–8 sagas) for an entire story. Also creates initial planted seeds (10–30 per saga plan). Persists sagas and seeds to DB.

## Source Evidence
`packages/ai/src/agents/saga-planner.ts` — `SagaPlannerAgent`
`packages/ai/src/agents/saga-planner.types.ts`

## Inputs
- Story premise, genre, personality, tone
- `genreDef`, `personalityDef`, `storyOptions`
- Target chapter count
- LLM provider

## Outputs
- `SagaPlannerOutputSchema` validated — array of sagas + planted seeds
- Persists to [[database/tables/sagas]], [[database/tables/planted-seeds]]

## Prompt
- [[prompts/prompt-saga-planner-v2]] — `DualPromptTemplate`

## Schema
`packages/ai/src/schemas/saga.ts` — `SagaPlannerOutputSchema`

## Depends On
- [[packages/package-ai]] providers
- [[prompts/prompt-saga-planner-v2]]
- [[configs/config-long-form]]

## Used By
- [[routes/route-sagas]] (`POST /api/stories/:id/sagas/plan`)

## Related Tables
- [[database/tables/sagas]]
- [[database/tables/planted-seeds]]
---
type: ai-agent
source: packages/ai/src/agents/saga-planner.ts
---

# Agent: Saga Planner

## Responsibility
Plans saga structure (5–8 sagas) for the whole story. Creates planted seeds (10–30 per saga). Persists to DB.

## Source Evidence
`packages/ai/src/agents/saga-planner.ts` — `SagaPlannerAgent`
`packages/ai/src/agents/saga-planner.types.ts`

## Inputs
- Story premise, genre, personality, tone
- `genreDef`, `personalityDef`, `storyOptions`
- Target chapter count
- LLM provider

## Outputs
- `SagaPlannerOutputSchema` validated — array of sagas + planted seeds
- Persists to [[database/tables/sagas]], [[database/tables/planted-seeds]]

## Prompt
[[prompts/prompt-saga-planner-v2]] — DualPromptTemplate

## Schema
`packages/ai/src/schemas/saga.ts` — `SagaPlannerOutputSchema`

## Config
[[configs/config-long-form]] — SAGA_COUNT_RANGE, SEEDS_PER_SAGA_PLAN_RANGE

## Used By
- [[routes/route-sagas]] (POST /api/stories/:id/sagas/plan)

## Related Tables
- [[database/tables/sagas]]
- [[database/tables/planted-seeds]]
