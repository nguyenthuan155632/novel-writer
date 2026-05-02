---
type: module
source: packages/core/src/trace.ts
---

# Module: Trace

**Type:** Module  
**Source:** `packages/core/src/trace.ts`

## Responsibility
Provides unique trace IDs and `AsyncLocalStorage`-based context propagation for correlating all LLM calls and log entries belonging to a single generation request.

## Key exports / functions
- `newTraceId(): string` — generates a UUID v4 using `node:crypto.randomUUID()`
- `withTrace<T>(ctx: TraceContext, fn: () => T): T` — runs `fn` inside an `AsyncLocalStorage` scope carrying `ctx`
- `getTraceId(): string | undefined` — retrieves the `traceId` from the current async context (returns `undefined` if no trace active)

## Types
- `TraceContext = { traceId: string }`

## Implementation notes
- Uses `AsyncLocalStorage` from `node:async_hooks` — trace ID automatically propagates across `await` boundaries within the same async context
- No external dependencies; pure Node.js built-ins
- `withTrace` wraps a job/request; any code inside (even deep call stacks) can call `getTraceId()`

## Depends on
- `node:crypto` — `randomUUID()`
- `node:async_hooks` — `AsyncLocalStorage`

## Used by
- [[apps/app-api]] — wraps each HTTP request handler
- [[jobs/job-generate-chapter]] — wraps the full chapter pipeline
- [[modules/llm-call-logger]] — reads `getTraceId()` to attach to every `llm_calls` row

## Related database tables
- [[database/tables/llm-calls]] — `traceId` field links all LLM calls for a single generation run

## Related flows
- [[flows/llm-provider-flow]]
- [[flows/chapter-generation-flow]]
