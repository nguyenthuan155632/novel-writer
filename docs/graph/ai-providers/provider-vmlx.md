---
type: ai-provider
source: packages/ai/src/providers/vmlx.ts
---

# Provider: vMLX

**Type:** LLM Provider
**Source:** `packages/ai/src/providers/vmlx.ts`
**Provider name:** `"vmlx"`

## Responsibility
Sends completion requests to a locally-running vMLX server (Apple Silicon MLX inference), exposed as an OpenAI-compatible endpoint on `localhost:8000`.

## Base URL
`http://localhost:8000/v1` (default; overridable via config)

## Authentication
None required. No `apiKey` field exists in the config. The `Content-Type: application/json` header is the only header sent.

## Config interface (`VmlxConfig`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baseUrl` | `string` | — | Override default base URL |
| `fetchImpl` | `typeof fetch` | — | Injectable fetch for testing |

## Retry / Error handling
No retry logic. Single attempt only. On non-2xx response, throws `Error("vMLX error <status>: <body>")`.

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
- Designed specifically for Apple Silicon local inference via the [vMLX](https://github.com/vmlx/vmlx) runtime.
- Tested with `mlx-community/Qwen3-4B-4bit` and similar quantised MLX models.
- Lightest config of all providers — no auth whatsoever, no optional auth field.
- Constructor accepts empty config (`new VmlxProvider()`) — both fields are optional.
- JSON structured output via `response_format.json_schema` with `strict: true`.
- `finishReason` values other than `'stop'`, `'length'`, `'content_filter'` are normalised to `'error'`.
- Cost logging via [[modules/llm-call-logger]] still fires but local models have zero monetary cost.
