# Novel graph — ai-providers

## provider-interface

`ai-providers/provider-interface.md`

---
type: ai-provider
source: packages/ai/src/providers/types.ts
---



Provider: LLMProvider Interface Responsibility
**Type:** TypeScript Interface (contract)
**Source:** `packages/ai/src/providers/types.ts`
**Provider name:** N/A — this is the shared interface, not a concrete provider
Defines the single contract all LLM providers must satisfy: a `name` string and a `complete()` method that turns a `CompletionRequest` into a `CompletionResponse`.



Provider: LLMProvider Interface Base URL
N/A



Provider: LLMProvider Interface Authentication
N/A — each concrete provider handles its own auth



Provider: LLMProvider Interface Interface Definitions `LLMProvider`
| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique provider identifier (e.g. `"openrouter"`, `"ollama"`) |
| `complete` | `(req: CompletionRequest) => Promise` | Execute a chat completion |



Provider: LLMProvider Interface Interface Definitions `CompletionRequest`
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



Provider: LLMProvider Interface Interface Definitions `Message`
| Field | Type | Values |
|-------|------|--------|
| `role` | `Role` | `'system'` \| `'user'` \| `'assistant'` |
| `content` | `string` | Raw text content of the turn |



Provider: LLMProvider Interface Interface Definitions `CompletionResponse`
| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | Generated text from the model |
| `usage.inputTokens` | `number` | Prompt tokens consumed |
| `usage.outputTokens` | `number` | Completion tokens generated |
| `usage.cachedInputTokens` | `number` | Prompt tokens served from cache |
| `finishReason` | `'stop' \| 'length' \| 'error' \| 'content_filter'` | Why the model stopped |
| `raw` | `unknown` | Unmodified provider API response for debugging |



Provider: LLMProvider Interface Interface Definitions `JsonSchema`
Constrained to `type: 'object'` with `properties`, optional `required[]`, and `additionalProperties` flag. Passed as `responseSchema` to force structured output.



Provider: LLMProvider Interface Retry / Error handling
N/A — retry logic is the responsibility of each concrete provider implementation



Provider: LLMProvider Interface Inputs
- Implemented by all concrete providers in `packages/ai/src/providers/`



Provider: LLMProvider Interface Outputs
- `CompletionResponse` with content, usage tokens, finishReason



Provider: LLMProvider Interface Depends on
- Nothing — this is the root contract



Provider: LLMProvider Interface Used by
- [[ai-providers/provider-openrouter]] — implements this interface
- [[ai-providers/provider-opencode]] — implements this interface
- [[ai-providers/provider-ollama]] — implements this interface
- [[ai-providers/provider-vmlx]] — implements this interface
- [[ai-providers/provider-mock]] — implements this interface (tests only)
- [[modules/llm-call-logger]] — wraps any `LLMProvider` implementor
- [[modules/provider-switcher]] — returns `LLMProvider` instances
- All agents in `packages/ai/src/agents/` — receive an `LLMProvider` and call `complete()`



Provider: LLMProvider Interface Related database tables
- [[database/tables/llm-calls]] — every `complete()` call is logged here via [[modules/llm-call-logger]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]



Provider: LLMProvider Interface Related flows
- [[flows/llm-provider-flow]]



Provider: LLMProvider Interface Notes
- `model` strings must never be hardcoded by callers; use `modelFor(role: AgentRole)` from `@novel/core` which resolves routes from DB at runtime.
- `cacheBreakpoints` is a Novel-specific extension — providers that don't support prompt caching should silently ignore it.
- `responseSchema` maps directly to OpenAI-style `response_format.json_schema` in all current concrete providers.

---

## provider-mock

`ai-providers/provider-mock.md`

---
type: ai-provider
source: packages/ai/src/providers/mock.ts
---



Provider: Mock Responsibility
**Type:** LLM Provider (test only)
**Source:** `packages/ai/src/providers/mock.ts`
**Provider name:** `"mock"`
In-memory test double for `LLMProvider` — returns deterministic or function-driven responses without any network calls, and records every request for assertion in tests.



Provider: Mock Base URL
N/A — no HTTP calls made



Provider: Mock Authentication
None required



Provider: Mock Config interface (`MockProviderOptions`) `MockResponder` variants
The constructor takes a single `opts: MockProviderOptions` object:
| Field | Type | Description |
|-------|------|-------------|
| `responder` | `MockResponder` | Defines how responses are generated (see variants below) |
| Kind | Fields | Behaviour |
|------|--------|-----------|
| `'fixed'` | `content: string`, `usage?: Partial` | Returns the same content on every call; usage defaults to `{inputTokens:100, outputTokens:50, cachedInputTokens:0}` |
| `'fn'` | `fn: (req: CompletionRequest) => CompletionResponse \| Promise` | Calls the provided function, enabling per-request dynamic responses |



Provider: Mock Retry / Error handling
No retry logic. If the `fn` responder throws, the error propagates directly to the caller — useful for testing error-handling paths.



Provider: Mock Additional API (test helpers)
| Method | Description |
|--------|-------------|
| `getCalls()` | Returns a read-only array of every `CompletionRequest` passed to `complete()`, in order |
| `reset()` | Clears the call log (call between test cases) |



Provider: Mock Inputs
- Implements [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] wraps every call



Provider: Mock Outputs
- `CompletionResponse` with content, usage tokens, finishReason



Provider: Mock Depends on
- [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] (wraps this provider)



Provider: Mock Used by
- `packages/ai/test/` — agent and pipeline unit tests
- `apps/api/test/` — route integration tests
- `apps/worker/test/` — job processor tests
- **Never used in production pipelines**



Provider: Mock Related database tables
- [[database/tables/llm-calls]] — every call logged here (even in tests, if a real DB is wired up)
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]



Provider: Mock Related flows
- [[flows/llm-provider-flow]]



Provider: Mock Notes
- This provider must **never** be registered as an active provider in `llm_provider_state` in a production or staging environment.
- `finishReason` is hardcoded to `'stop'` for the `'fixed'` responder variant.
- The `raw` field in fixed responses is `{ mocked: true }` — useful as a sentinel in assertions.
- For testing error paths, use the `'fn'` responder and have the function throw or return a response with `finishReason: 'error'`.

---

## provider-ollama

`ai-providers/provider-ollama.md`

---
type: ai-provider
source: packages/ai/src/providers/ollama.ts
---



Provider: Ollama Responsibility
**Type:** LLM Provider
**Source:** `packages/ai/src/providers/ollama.ts`
**Provider name:** `"ollama"`
Sends completion requests to a locally-running Ollama instance via its OpenAI-compatible `/v1/chat/completions` endpoint, enabling fully offline inference.



Provider: Ollama Base URL
`http://localhost:11434/v1` (default; overridable via config)



Provider: Ollama Authentication
Optional `apiKey` (sent as `Authorization: Bearer `). Typically not required for local Ollama instances — omit for unauthenticated local use.



Provider: Ollama Config interface (`OllamaConfig`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | `string` | — | Optional Bearer token; usually omitted for local use |
| `baseUrl` | `string` | — | Override default base URL (e.g. remote Ollama host) |
| `fetchImpl` | `typeof fetch` | — | Injectable fetch for testing |



Provider: Ollama Retry / Error handling
No retry logic. Single attempt only. On non-2xx response, throws `Error("Ollama error : ")`.



Provider: Ollama Inputs
- Implements [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] wraps every call



Provider: Ollama Outputs
- `CompletionResponse` with content, usage tokens, finishReason



Provider: Ollama Depends on
- [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] (wraps this provider)



Provider: Ollama Used by
- [[jobs/job-generate-chapter]] — instantiated based on job.llmProvider
- [[app-worker]] — selected at runtime



Provider: Ollama Related database tables
- [[database/tables/llm-calls]] — every call logged here
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]



Provider: Ollama Related flows
- [[flows/llm-provider-flow]]



Provider: Ollama Notes
- Intended for local model inference; tested with `gemma4:e2b` and `gemma4:e4b`.
- Constructor accepts empty config (`new OllamaProvider()`) — all fields are optional.
- JSON structured output via `response_format.json_schema` with `strict: true` (Ollama supports this from v0.5+).
- `Authorization` header is only added when `apiKey` is provided; otherwise omitted entirely.
- `finishReason` values other than `'stop'`, `'length'`, `'content_filter'` are normalised to `'error'`.
- Cost logging via [[modules/llm-call-logger]] still fires but local models have zero monetary cost.

---

## provider-opencode

`ai-providers/provider-opencode.md`

---
type: ai-provider
source: packages/ai/src/providers/opencode.ts
---



Provider: OpenCode Responsibility
**Type:** LLM Provider
**Source:** `packages/ai/src/providers/opencode.ts`
**Provider name:** `"opencode"`
Sends completion requests to the OpenCode AI gateway (`opencode.ai/zen`), which exposes an OpenAI-compatible chat completions endpoint.



Provider: OpenCode Base URL
`https://opencode.ai/zen/go/v1`



Provider: OpenCode Authentication
`OPENCODE_API_KEY` — required; sent as `Authorization: Bearer ` header. Constructor throws if absent.



Provider: OpenCode Config interface (`OpenCodeConfig`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | `string` | ✓ | OpenCode API key; throws on construction if absent |
| `baseUrl` | `string` | — | Override default base URL |
| `fetchImpl` | `typeof fetch` | — | Injectable fetch for testing |



Provider: OpenCode Retry / Error handling
No retry logic. Single attempt only. On non-2xx response, throws `Error("OpenCode error : ")`.



Provider: OpenCode Inputs
- Implements [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] wraps every call



Provider: OpenCode Outputs
- `CompletionResponse` with content, usage tokens, finishReason



Provider: OpenCode Depends on
- [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] (wraps this provider)



Provider: OpenCode Used by
- [[jobs/job-generate-chapter]] — instantiated based on job.llmProvider
- [[app-worker]] — selected at runtime



Provider: OpenCode Related database tables
- [[database/tables/llm-calls]] — every call logged here
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]



Provider: OpenCode Related flows
- [[flows/llm-provider-flow]]



Provider: OpenCode Notes
- Default provider for the system (see [[modules/provider-switcher]]).
- API shape is OpenAI-compatible: `POST /chat/completions` with standard `choices[0].message.content` response.
- JSON structured output via `response_format.json_schema` with `strict: true`.
- Token usage fields read from `prompt_tokens`, `completion_tokens`, and `prompt_tokens_details.cached_tokens`.
- `finishReason` values other than `'stop'`, `'length'`, `'content_filter'` are normalised to `'error'`.

---

## provider-openrouter

`ai-providers/provider-openrouter.md`

---
type: ai-provider
source: packages/ai/src/providers/openrouter.ts
---



Provider: OpenRouter Responsibility
**Type:** LLM Provider
**Source:** `packages/ai/src/providers/openrouter.ts`
**Provider name:** `"openrouter"`
Routes completion requests to any model available on OpenRouter's API gateway, with production-grade retry logic for rate limits and transient server errors.



Provider: OpenRouter Base URL
`https://openrouter.ai/api/v1`



Provider: OpenRouter Authentication
`OPENROUTER_API_KEY` — required; sent as `Authorization: Bearer ` header.



Provider: OpenRouter Config interface (`OpenRouterConfig`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | `string` | ✓ | OpenRouter API key; throws on construction if absent |
| `baseUrl` | `string` | — | Override default base URL |
| `httpReferer` | `string` | — | Sent as `HTTP-Referer` header (OpenRouter attribution) |
| `xTitle` | `string` | — | Sent as `X-Title` header (OpenRouter attribution) |
| `fetchImpl` | `typeof fetch` | — | Injectable fetch for testing |



Provider: OpenRouter Retry / Error handling
- **Max attempts:** 6
- **Retryable HTTP statuses:** `429` (rate limit), `502`, `503` (transient server errors)
- **Backoff strategy:**
- First checks response body for `retry_after_seconds` (walks nested JSON)
- Then checks `Retry-After` response header
- If server hint present: `min(hint × 1000ms, 120 000ms)`
- If `429` with no hint: exponential `min(1000 × 2^attempt, 60 000ms)`
- Otherwise: exponential `min(500 × 2^attempt, 30 000ms)`
- Non-retryable statuses (4xx other than 429) throw immediately after the first failure.



Provider: OpenRouter Inputs
- Implements [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] wraps every call



Provider: OpenRouter Outputs
- `CompletionResponse` with content, usage tokens, finishReason



Provider: OpenRouter Depends on
- [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] (wraps this provider)



Provider: OpenRouter Used by
- [[jobs/job-generate-chapter]] — instantiated based on job.llmProvider
- [[app-worker]] — selected at runtime



Provider: OpenRouter Related database tables
- [[database/tables/llm-calls]] — every call logged here
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]



Provider: OpenRouter Related flows
- [[flows/llm-provider-flow]]



Provider: OpenRouter Notes
- The most featureful provider: only one with retry logic.
- JSON structured output is passed as `response_format: { type: 'json_schema', json_schema: { name: 'response', schema, strict: true } }`.
- `cacheBreakpoints` from `CompletionRequest` is accepted but not forwarded to OpenRouter (OpenRouter manages caching internally).
- `HTTP-Referer` and `X-Title` are optional but recommended for OpenRouter dashboard attribution.
- `finishReason` values other than `'stop'`, `'length'`, `'content_filter'` are normalised to `'error'`.

---

## provider-vmlx

`ai-providers/provider-vmlx.md`

---
type: ai-provider
source: packages/ai/src/providers/vmlx.ts
---



Provider: vMLX Responsibility
**Type:** LLM Provider
**Source:** `packages/ai/src/providers/vmlx.ts`
**Provider name:** `"vmlx"`
Sends completion requests to a locally-running vMLX server (Apple Silicon MLX inference), exposed as an OpenAI-compatible endpoint on `localhost:8000`.



Provider: vMLX Base URL
`http://localhost:8000/v1` (default; overridable via config)



Provider: vMLX Authentication
None required. No `apiKey` field exists in the config. The `Content-Type: application/json` header is the only header sent.



Provider: vMLX Config interface (`VmlxConfig`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baseUrl` | `string` | — | Override default base URL |
| `fetchImpl` | `typeof fetch` | — | Injectable fetch for testing |



Provider: vMLX Retry / Error handling
No retry logic. Single attempt only. On non-2xx response, throws `Error("vMLX error : ")`.



Provider: vMLX Inputs
- Implements [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] wraps every call



Provider: vMLX Outputs
- `CompletionResponse` with content, usage tokens, finishReason



Provider: vMLX Depends on
- [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] (wraps this provider)



Provider: vMLX Used by
- [[jobs/job-generate-chapter]] — instantiated based on job.llmProvider
- [[app-worker]] — selected at runtime



Provider: vMLX Related database tables
- [[database/tables/llm-calls]] — every call logged here
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]



Provider: vMLX Related flows
- [[flows/llm-provider-flow]]



Provider: vMLX Notes
- Designed specifically for Apple Silicon local inference via the vMLX runtime.
- Tested with `mlx-community/Qwen3-4B-4bit` and similar quantised MLX models.
- Lightest config of all providers — no auth whatsoever, no optional auth field.
- Constructor accepts empty config (`new VmlxProvider()`) — both fields are optional.
- JSON structured output via `response_format.json_schema` with `strict: true`.
- `finishReason` values other than `'stop'`, `'length'`, `'content_filter'` are normalised to `'error'`.
- Cost logging via [[modules/llm-call-logger]] still fires but local models have zero monetary cost.

---
