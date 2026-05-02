---
type: external-service
---

# Service: Ollama

## Role

Local LLM inference server enabling fully offline chapter generation without cloud API costs. Exposes an OpenAI-compatible `/v1/chat/completions` endpoint on `localhost`. Ideal for development and cost-free experimentation.

## Default URL

`http://localhost:11434/v1` — overridable via provider config `baseUrl`

## Authentication

None required for local instances. An optional `apiKey` field exists in `OllamaConfig` and is sent as `Authorization: Bearer <key>` only when provided — typically omitted for local use.

## Models

| Model | Size | Use Case |
|-------|------|---------|
| `gemma4:e2b` | Smaller / faster | Development, cost-free testing |
| `gemma4:e4b` | Larger / more capable | Higher quality local generation |

Models must be pulled locally: `ollama pull gemma4:e2b`

## Cost

Zero monetary cost. [[modules/llm-call-logger]] still fires for every call but records `$0` cost — consistent logging across all providers.

## Retry Logic

None. Single attempt only. On non-2xx: `Error("Ollama error <status>: <body>")`.

## JSON Structured Output

Via `response_format.json_schema` with `strict: true`. Supported from Ollama v0.5+.

## Provider Implementation

[[ai-providers/provider-ollama]] — `packages/ai/src/providers/ollama.ts`  
Constructor accepts empty config: `new OllamaProvider()` — all fields optional.

## Used By

All AI agents when `providerName = 'ollama'` — see [[flows/llm-provider-flow]].  
Switched at runtime via `PUT /api/admin/provider` (→ [[routes/admin]]).

## Related

- [[flows/llm-provider-flow]]
- [[external-services/service-vmlx]] — alternative local inference (Apple Silicon)
- [[database/tables/llm-provider-settings]]
