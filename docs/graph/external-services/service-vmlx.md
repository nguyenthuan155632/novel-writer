---
type: external-service
---

# Service: vMLX

## Role

Apple Silicon MLX inference server for local model execution on M-series Macs. Exposes an OpenAI-compatible endpoint. The lightest provider in the system — no authentication whatsoever, zero config required.

## Default URL

`http://localhost:8000/v1` — overridable via provider config `baseUrl`

## Authentication

None. No API key field exists in `VmlxConfig`. The only request header sent is `Content-Type: application/json`.

## Models

| Model | Notes |
|-------|-------|
| `mlx-community/Qwen3-4B-4bit` | Default 4-bit quantised MLX model for Apple Silicon |

Any quantised model from the `mlx-community` HuggingFace org can be used by updating `MODEL_CONFIG.routes`.

## Cost

Zero monetary cost. [[modules/llm-call-logger]] still fires for every call but records `$0` cost.

## Retry Logic

None. Single attempt only. On non-2xx: `Error("vMLX error <status>: <body>")`.

## JSON Structured Output

Via `response_format.json_schema` with `strict: true`.

## Provider Implementation

[[ai-providers/provider-vmlx]] — `packages/ai/src/providers/vmlx.ts`  
Constructor accepts empty config: `new VmlxProvider()` — both fields optional.

## Used By

All AI agents when `providerName = 'vmlx'` — see [[flows/llm-provider-flow]].  
Switched at runtime via `PUT /api/admin/provider` (→ [[routes/admin]]).

## Related

- [[flows/llm-provider-flow]]
- [[external-services/service-ollama]] — alternative local inference (cross-platform)
- [[database/tables/llm-provider-settings]]
