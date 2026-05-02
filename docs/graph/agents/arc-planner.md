---
type: ai-agent
source: packages/ai/src/agents/arc-planner.ts
---

# Agent: Arc Planner

## Responsibility
Plans the arc breakdown (2–5 arcs) within a saga. Reads planted seeds from DB to include in arc planning.

## Source Evidence
`packages/ai/src/agents/arc-planner.ts` — `ArcPlannerAgent`

## Inputs
- `sagaId`, story context
- Planted seeds from [[database/tables/planted-seeds]]
- LLM provider

## Outputs
- `ArcPlannerOutputSchema` validated — array of arcs
- Persists to [[database/tables/arcs]]

## Prompt
- [[prompts/prompt-arc-planner-v2]] — `DualPromptTemplate`

## Schema
`packages/ai/src/schemas/arc.ts` — `ArcPlannerOutputSchema`

## Depends On
- [[prompts/prompt-arc-planner-v2]]
- [[database/tables/planted-seeds]]
- [[configs/config-long-form]]

## Used By
- [[routes/route-arcs]] (`POST /api/stories/:id/sagas/:sagaId/arcs/plan`)

## Related Tables
- [[database/tables/arcs]]
- [[database/tables/planted-seeds]]
---
type: ai-agent
source: packages/ai/src/agents/arc-planner.ts
---

# Agent: Arc Planner

## Responsibility
Plans arc breakdown (2–5 arcs) within a saga. Reads planted seeds from DB to include in arc planning.

## Source Evidence
`packages/ai/src/agents/arc-planner.ts` — `ArcPlannerAgent`

## Inputs
- `sagaId`, story context
- Planted seeds from [[database/tables/planted-seeds]]
- LLM provider

## Outputs
- `ArcPlannerOutputSchema` validated — array of arcs
- Persists to [[database/tables/arcs]]

## Prompt
[[prompts/prompt-arc-planner-v2]] — DualPromptTemplate

## Schema
`packages/ai/src/schemas/arc.ts` — `ArcPlannerOutputSchema`

## Config
[[configs/config-long-form]] — ARC_COUNT_PER_SAGA_RANGE

## Used By
- [[routes/route-arcs]] (POST /api/stories/:id/sagas/:sagaId/arcs/plan)

## Related Tables
- [[database/tables/arcs]]
- [[database/tables/planted-seeds]]
