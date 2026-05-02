---
type: ai-provider
source: packages/ai/src/providers/opencode.ts
---

# Provider: OpenCode

**Type:** LLM Provider
**Source:** `packages/ai/src/providers/opencode.ts`
**Provider name:** `"opencode"`

## Responsibility
Sends completion requests to the OpenCode AI gateway (`opencode.ai/zen`), which exposes an OpenAI-compatible chat completions endpoint.

## Base URL
`https://opencode.ai/zen/go/v1`

## Authentication
`OPENCODE_API_KEY` — required; sent as `Authorization: Bearer <key>` header. Constructor throws if absent.

## Config interface (`OpenCodeConfig`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | `string` | ✓ | OpenCode API key; throws on construction if absent |
| `baseUrl` | `string` | — | Override default base URL |
| `fetchImpl` | `typeof fetch` | — | Injectable fetch for testing |

## Retry / Error handling
No retry logic. Single attempt only. On non-2xx response, throws `Error("OpenCode error <status>: <body>")`.

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
- Default provider for the system (see [[modules/provider-switcher]]).
- API shape is OpenAI-compatible: `POST /chat/completions` with standard `choices[0].message.content` response.
- JSON structured output via `response_format.json_schema` with `strict: true`.
- Token usage fields read from `prompt_tokens`, `completion_tokens`, and `prompt_tokens_details.cached_tokens`.
- `finishReason` values other than `'stop'`, `'length'`, `'content_filter'` are normalised to `'error'`.
