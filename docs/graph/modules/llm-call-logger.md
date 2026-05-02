---
type: module
source: packages/ai/src/llm-call-logger.ts
---

# Module: LLM Call Logger (LoggedLLMProvider)

## Responsibility
Wraps any LLMProvider. Records every call to `llm_calls` table. Accumulates story cost in `story_costs`. Provides `makeDrizzleRecorder()` factory.

## Source Evidence
`packages/ai/src/llm-call-logger.ts`

## Class
`LoggedLLMProvider` — implements `LLMProvider`
- `name`: `logged(<inner.name>)`
- On every `complete()`: delegates to inner provider, then writes to DB

## Inputs
- Any `LLMProvider` instance (inner)
- DB instance

## Outputs
- Passes through `CompletionResponse` from inner provider
- Side-effect: inserts row into [[database/tables/llm-calls]]
- Side-effect: calls `accumulateStoryCost()` → updates `stories.totalCostUsd`

## Depends On
- [[ai-providers/provider-interface]] — wraps any provider
- [[packages/package-db]] — writes llm_calls
- [[modules/cost-tracker]]

## Used By
- All job workers (wraps active provider)
- [[apps/app-api]] (`lib/llm-provider.ts` — `buildLoggedProvider()`)

## Related Tables
- [[database/tables/llm-calls]]
- [[database/tables/stories]] (totalCostUsd updated)

## Related Flows
- [[flows/llm-provider-flow]]
---
type: module
source: packages/ai/src/llm-call-logger.ts
---

# Module: LLM Call Logger

## Class
`LoggedLLMProvider` — wraps any `LLMProvider`, implements the same interface.

## Responsibility
Records every LLM call to `llm_calls`. Accumulates story cost via `accumulateStoryCost()`.

## Source Evidence
`packages/ai/src/llm-call-logger.ts`
`packages/ai/src/llm-call-logger.ts` — `makeDrizzleRecorder()`

## Inputs
- Any `LLMProvider` inner instance
- DB handle

## Outputs
- Passthrough `CompletionResponse`
- Side-effect: inserts into [[database/tables/llm-calls]]
- Side-effect: updates [[database/tables/stories]].totalCostUsd

## Depends On
- [[ai-providers/provider-interface]]
- [[modules/cost-tracker]]
- [[packages/package-db]]

## Used By
- All jobs in [[apps/app-worker]]
- [[apps/app-api]] via `buildLoggedProvider()`

## Related Flows
- [[flows/llm-provider-flow]]
