---
type: ai-provider
source: packages/ai/src/providers/mock.ts
---

# Provider: Mock

**Type:** LLM Provider (test only)
**Source:** `packages/ai/src/providers/mock.ts`
**Provider name:** `"mock"`

## Responsibility
In-memory test double for `LLMProvider` — returns deterministic or function-driven responses without any network calls, and records every request for assertion in tests.

## Base URL
N/A — no HTTP calls made

## Authentication
None required

## Config interface (`MockProviderOptions`)
The constructor takes a single `opts: MockProviderOptions` object:

| Field | Type | Description |
|-------|------|-------------|
| `responder` | `MockResponder` | Defines how responses are generated (see variants below) |

### `MockResponder` variants
| Kind | Fields | Behaviour |
|------|--------|-----------|
| `'fixed'` | `content: string`, `usage?: Partial<CompletionUsage>` | Returns the same content on every call; usage defaults to `{inputTokens:100, outputTokens:50, cachedInputTokens:0}` |
| `'fn'` | `fn: (req: CompletionRequest) => CompletionResponse \| Promise<CompletionResponse>` | Calls the provided function, enabling per-request dynamic responses |

## Retry / Error handling
No retry logic. If the `fn` responder throws, the error propagates directly to the caller — useful for testing error-handling paths.

## Additional API (test helpers)
| Method | Description |
|--------|-------------|
| `getCalls()` | Returns a read-only array of every `CompletionRequest` passed to `complete()`, in order |
| `reset()` | Clears the call log (call between test cases) |

## Inputs
- Implements [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] wraps every call

## Outputs
- `CompletionResponse` with content, usage tokens, finishReason

## Depends on
- [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] (wraps this provider)

## Used by
- `packages/ai/test/` — agent and pipeline unit tests
- `apps/api/test/` — route integration tests
- `apps/worker/test/` — job processor tests
- **Never used in production pipelines**

## Related database tables
- [[database/tables/llm-calls]] — every call logged here (even in tests, if a real DB is wired up)
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]

## Related flows
- [[flows/llm-provider-flow]]

## Notes
- This provider must **never** be registered as an active provider in `llm_provider_state` in a production or staging environment.
- `finishReason` is hardcoded to `'stop'` for the `'fixed'` responder variant.
- The `raw` field in fixed responses is `{ mocked: true }` — useful as a sentinel in assertions.
- For testing error paths, use the `'fn'` responder and have the function throw or return a response with `finishReason: 'error'`.
