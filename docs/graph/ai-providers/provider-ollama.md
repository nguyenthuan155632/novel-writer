---
type: ai-provider
source: packages/ai/src/providers/ollama.ts
---

# Provider: Ollama

**Type:** LLM Provider
**Source:** `packages/ai/src/providers/ollama.ts`
**Provider name:** `"ollama"`

## Responsibility
Sends completion requests to a locally-running Ollama instance via its OpenAI-compatible `/v1/chat/completions` endpoint, enabling fully offline inference.

## Base URL
`http://localhost:11434/v1` (default; overridable via config)

## Authentication
Optional `apiKey` (sent as `Authorization: Bearer <key>`). Typically not required for local Ollama instances — omit for unauthenticated local use.

## Config interface (`OllamaConfig`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | `string` | — | Optional Bearer token; usually omitted for local use |
| `baseUrl` | `string` | — | Override default base URL (e.g. remote Ollama host) |
| `fetchImpl` | `typeof fetch` | — | Injectable fetch for testing |

## Retry / Error handling
No retry logic. Single attempt only. On non-2xx response, throws `Error("Ollama error <status>: <body>")`.

## Inputs
- Implements [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] wraps every call

## Outputs
- `CompletionResponse` with content, usage tokens, finishReason

## Depends on
- [[ai-providers/provider-interface]]
- [[modules/llm-call-logger]] (wraps this provider)

## Used by
- [[jobs/job-generate-chapter]] — instantiated based on job.llmProvider
- [[app-worker]] — selected at runtime

## Related database tables
- [[database/tables/llm-calls]] — every call logged here
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]

## Related flows
- [[flows/llm-provider-flow]]

## Notes
- Intended for local model inference; tested with `gemma4:e2b` and `gemma4:e4b`.
- Constructor accepts empty config (`new OllamaProvider()`) — all fields are optional.
- JSON structured output via `response_format.json_schema` with `strict: true` (Ollama supports this from v0.5+).
- `Authorization` header is only added when `apiKey` is provided; otherwise omitted entirely.
- `finishReason` values other than `'stop'`, `'length'`, `'content_filter'` are normalised to `'error'`.
- Cost logging via [[modules/llm-call-logger]] still fires but local models have zero monetary cost.
