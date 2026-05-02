---
type: external-service
---

# Service: OpenCode

## Role

Alternative LLM API gateway exposing an OpenAI-compatible chat completions endpoint. Configured as the **default provider** for the system (see [[modules/provider-switcher]]).

## Base URL

`https://opencode.ai/zen/go/v1`

## Authentication

`OPENCODE_API_KEY` — sent as `Authorization: Bearer <key>` header. Required; [[ai-providers/provider-opencode]] throws at construction if absent.

## Request Format

Standard OpenAI-compatible `POST /chat/completions`.  
Token usage read from `prompt_tokens`, `completion_tokens`, `prompt_tokens_details.cached_tokens`.  
JSON structured output via `response_format.json_schema` with `strict: true`.

## Retry Logic

None. Single attempt only. On non-2xx response: `Error("OpenCode error <status>: <body>")` thrown immediately.

## Cost Tracking

Per-token cost estimated via `estimateCostUsd()` and written to [[database/tables/llm-calls]] by [[modules/llm-call-logger]].

## Provider Implementation

[[ai-providers/provider-opencode]] — `packages/ai/src/providers/opencode.ts`

## Used By

All AI agents when `providerName = 'opencode'` — see [[flows/llm-provider-flow]].  
Switched at runtime via `PUT /api/admin/provider` (→ [[routes/admin]]).

## Related

- [[flows/llm-provider-flow]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-calls]]
