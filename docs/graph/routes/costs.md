---
type: route
source: apps/api/src/routes/costs.ts
---

# Route: Costs

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/costs.ts`

## Responsibility
Exposes LLM cost and token usage data for a story — overall budget summary against guardrail caps, per-agent breakdowns, and per-chapter breakdowns.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/costs/summary` | Returns `BudgetGuard.getStoryUsage()` alongside the static `BUDGET_GUARDRAILS` caps |
| GET | `/api/stories/:storyId/costs/by-agent` | Aggregates call count, total tokens, and total cost per `agentRole` over the last 30 days |
| GET | `/api/stories/:storyId/costs/by-chapter` | Aggregates total tokens and cost per `chapterId` across all time |

## Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- No request bodies

## Outputs
- `GET .../summary` → `{ usage: StoryUsage, caps: BudgetGuardrails }`
- `GET .../by-agent` → `{ rows: Array<{ agent, callCount, tokens, cost }> }`
- `GET .../by-chapter` → `{ rows: Array<{ chapterNumber, cost, tokens }> }`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; queries `llmCalls` table with aggregates
- [[modules/budget-guard]] — `BudgetGuard` service class and `BUDGET_GUARDRAILS` constants (imported from `../services/budget-guard.ts`)

## Used by
- [[app-web]] — cost dashboard and budget status panel
- [[app-api]] — registered here

## Related database tables
- [[database/tables/llm-calls]]

## Related flows
- (none — read-only analytics)

## Related domain concepts
- Budget guardrails (per-chapter $0.05, daily $5.00, monthly $50.00)
- Cost attribution by agent role and chapter
- 30-day rolling window for per-agent aggregation
