---
type: database-table
source: packages/db/src/schema/llm-calls.ts
---

# Table: `llm_calls`

## Purpose
Immutable log of every LLM API call made by any agent. Used for cost tracking, debugging, and per-story spend aggregation. Written by `LoggedLLMProvider` which wraps every provider.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `chapterId` | uuid | FK → `chapters` (nullable) |
| `agentRole` | text | The `AgentRole` that made the call |
| `model` | text | Model identifier used |
| `promptVersion` | text | Version tag of the prompt template used |
| `inputTokens` | int | Number of input tokens consumed |
| `outputTokens` | int | Number of output tokens produced |
| `cachedInputTokens` | int | Input tokens served from provider cache |
| `estimatedCostUsd` | numeric | Computed cost for this call |
| `traceId` | text | Correlation ID for distributed tracing |
| `createdAt` | timestamptz | Row creation time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`
- `chapterId` → `chapters.id` (nullable)

## Read By
- [[modules/admin-metrics]]
- [[routes/route-costs]]

## Written By
- [[modules/llm-call-logger]] (LoggedLLMProvider)

## Updated By
N/A — append-only log table.

## Related Domain Concepts
- [[domain-agent-role]]
- [[domain-budget-guardrails]]

## Related Flows
- [[flows/llm-provider-flow]]
---
type: database-table
source: packages/db/src/schema/llm-calls.ts
---

# Table: `llm_calls`

## Purpose
Observability log of every LLM call — tokens, cost, model, agent role, trace id.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| chapterId | uuid | FK → chapters (nullable) |
| agentRole | text | The agent role that made the call |
| model | text | Model name used |
| promptVersion | text | Version of the prompt template |
| inputTokens | int | Number of input tokens |
| outputTokens | int | Number of output tokens |
| cachedInputTokens | int | Cached input tokens (if any) |
| estimatedCostUsd | numeric | Estimated cost of the call |
| traceId | text | Trace ID for grouping calls |
| createdAt | timestamp | Creation timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`
- `chapterId` → `chapters` (nullable)

## Read By
- [[modules/admin-metrics]]
- [[routes/route-costs]]
- [[modules/budget-guard]]

## Written By
- [[modules/llm-call-logger]] (LoggedLLMProvider — every LLM call)

## Related Domain Concepts
- [[domain/agent-role]]
- [[domain/budget-guardrails]]

## Related Flows
- [[flows/llm-provider-flow]]
