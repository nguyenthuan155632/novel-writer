---
type: ai-provider
source: packages/ai/src/providers/types.ts
---

# Provider: LLMProvider Interface

**Type:** TypeScript Interface (contract)  
**Source:** `packages/ai/src/providers/types.ts`  
**Provider name:** N/A — this is the shared interface, not a concrete provider

## Responsibility
Defines the single contract all LLM providers must satisfy: a `name` string and a `complete()` method that turns a `CompletionRequest` into a `CompletionResponse`.

## Base URL
N/A

## Authentication
N/A — each concrete provider handles its own auth

## Interface Definitions

### `LLMProvider`
| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique provider identifier (e.g. `"openrouter"`, `"ollama"`) |
| `complete` | `(req: CompletionRequest) => Promise<CompletionResponse>` | Execute a chat completion |

### `CompletionRequest`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | `string` | ✓ | Model identifier string (resolved via `modelFor()`) |
| `messages` | `Message[]` | ✓ | Ordered list of conversation turns |
| `temperature` | `number` | — | Sampling temperature |
| `topP` | `number` | — | Top-p nucleus sampling |
| `maxOutputTokens` | `number` | — | Hard token cap for the completion |
| `responseSchema` | `JsonSchema` | — | Forces structured JSON output (type: 'object') |
| `cacheBreakpoints` | `number[]` | — | Message indices where prompt caching should break |
| `metadata` | `object` | — | Tracing metadata: `agentRole`, `promptVersion`, `traceId`, `storyId` |

### `Message`
| Field | Type | Values |
|-------|------|--------|
| `role` | `Role` | `'system'` \| `'user'` \| `'assistant'` |
| `content` | `string` | Raw text content of the turn |

### `CompletionResponse`
| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | Generated text from the model |
| `usage.inputTokens` | `number` | Prompt tokens consumed |
| `usage.outputTokens` | `number` | Completion tokens generated |
| `usage.cachedInputTokens` | `number` | Prompt tokens served from cache |
| `finishReason` | `'stop' \| 'length' \| 'error' \| 'content_filter'` | Why the model stopped |
| `raw` | `unknown` | Unmodified provider API response for debugging |

### `JsonSchema`
Constrained to `type: 'object'` with `properties`, optional `required[]`, and `additionalProperties` flag. Passed as `responseSchema` to force structured output.

## Retry / Error handling
N/A — retry logic is the responsibility of each concrete provider implementation

## Inputs
- Implemented by all concrete providers in `packages/ai/src/providers/`

## Outputs
- `CompletionResponse` with content, usage tokens, finishReason

## Depends on
- Nothing — this is the root contract

## Used by
- [[ai-providers/provider-openrouter]] — implements this interface
- [[ai-providers/provider-opencode]] — implements this interface
- [[ai-providers/provider-ollama]] — implements this interface
- [[ai-providers/provider-vmlx]] — implements this interface
- [[ai-providers/provider-mock]] — implements this interface (tests only)
- [[modules/llm-call-logger]] — wraps any `LLMProvider` implementor
- [[modules/provider-switcher]] — returns `LLMProvider` instances
- All agents in `packages/ai/src/agents/` — receive an `LLMProvider` and call `complete()`

## Related database tables
- [[database/tables/llm-calls]] — every `complete()` call is logged here via [[modules/llm-call-logger]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]

## Related flows
- [[flows/llm-provider-flow]]

## Notes
- `model` strings must never be hardcoded by callers; use `modelFor(role: AgentRole)` from `@novel/core` which resolves routes from DB at runtime.
- `cacheBreakpoints` is a Novel-specific extension — providers that don't support prompt caching should silently ignore it.
- `responseSchema` maps directly to OpenAI-style `response_format.json_schema` in all current concrete providers.
