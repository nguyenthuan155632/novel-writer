---
type: ai-provider
source: packages/ai/src/providers/openrouter.ts
---

# Provider: OpenRouter

**Type:** LLM Provider
**Source:** `packages/ai/src/providers/openrouter.ts`
**Provider name:** `"openrouter"`

## Responsibility
Routes completion requests to any model available on OpenRouter's API gateway, with production-grade retry logic for rate limits and transient server errors.

## Base URL
`https://openrouter.ai/api/v1`

## Authentication
`OPENROUTER_API_KEY` — required; sent as `Authorization: Bearer <key>` header.

## Config interface (`OpenRouterConfig`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | `string` | ✓ | OpenRouter API key; throws on construction if absent |
| `baseUrl` | `string` | — | Override default base URL |
| `httpReferer` | `string` | — | Sent as `HTTP-Referer` header (OpenRouter attribution) |
| `xTitle` | `string` | — | Sent as `X-Title` header (OpenRouter attribution) |
| `fetchImpl` | `typeof fetch` | — | Injectable fetch for testing |

## Retry / Error handling
- **Max attempts:** 6
- **Retryable HTTP statuses:** `429` (rate limit), `502`, `503` (transient server errors)
- **Backoff strategy:**
  - First checks response body for `retry_after_seconds` (walks nested JSON)
  - Then checks `Retry-After` response header
  - If server hint present: `min(hint × 1000ms, 120 000ms)`
  - If `429` with no hint: exponential `min(1000 × 2^attempt, 60 000ms)`
  - Otherwise: exponential `min(500 × 2^attempt, 30 000ms)`
- Non-retryable statuses (4xx other than 429) throw immediately after the first failure.

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
- The most featureful provider: only one with retry logic.
- JSON structured output is passed as `response_format: { type: 'json_schema', json_schema: { name: 'response', schema, strict: true } }`.
- `cacheBreakpoints` from `CompletionRequest` is accepted but not forwarded to OpenRouter (OpenRouter manages caching internally).
- `HTTP-Referer` and `X-Title` are optional but recommended for OpenRouter dashboard attribution.
- `finishReason` values other than `'stop'`, `'length'`, `'content_filter'` are normalised to `'error'`.
