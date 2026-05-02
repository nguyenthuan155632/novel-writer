---
type: external-service
---

# Service: OpenRouter

## Role

LLM API aggregator providing access to 100+ models from multiple providers (OpenAI, Anthropic, Google, Mistral, Meta, etc.) through a single OpenAI-compatible endpoint. Primary cloud LLM gateway in this system; the most featureful provider with full retry logic.

## Base URL

`https://openrouter.ai/api/v1`

## Authentication

`OPENROUTER_API_KEY` — sent as `Authorization: Bearer <key>` header. Required; [[ai-providers/provider-openrouter]] throws at construction if absent.

## Request Format

Standard OpenAI-compatible `POST /chat/completions`.  
JSON structured output via `response_format: { type: 'json_schema', json_schema: { name: 'response', schema, strict: true } }`.  
Optional attribution headers: `HTTP-Referer`, `X-Title` (for OpenRouter dashboard attribution).

## Retry Logic

| Aspect | Detail |
|--------|--------|
| Max attempts | 6 |
| Retryable statuses | `429` (rate limit), `502`, `503` (transient server errors) |
| Backoff — rate limit with server hint | `min(hint_ms, 120_000 ms)` (reads `retry_after_seconds` from body) |
| Backoff — rate limit no hint | `min(1000 × 2^attempt, 60_000 ms)` |
| Backoff — server error | `min(500 × 2^attempt, 30_000 ms)` |
| Non-retryable 4xx | Throws immediately (single attempt) |

## Cost Tracking

Per-token pricing tracked in `MODEL_CONFIG.pricing`. Every call: `estimateCostUsd(model, usage)` written to [[database/tables/llm-calls]] by [[modules/llm-call-logger]].

## Provider Implementation

[[ai-providers/provider-openrouter]] — `packages/ai/src/providers/openrouter.ts`

## Used By

All AI agents when `providerName = 'openrouter'` — see [[flows/llm-provider-flow]].  
Switched at runtime via `PUT /api/admin/provider` (→ [[routes/admin]]).

## Related

- [[flows/llm-provider-flow]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-calls]]
