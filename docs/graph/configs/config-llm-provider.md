---
type: config
source: packages/core/src/config/llm-provider.ts
---

# Config: LLM Provider

**Type:** Configuration Module  
**Source:** `packages/core/src/config/llm-provider.ts`

## Responsibility
Defines the `LlmProviderId` union type for the four user-selectable provider backends and provides `parseLlmProvider()` — a safe string parser that normalises raw env-var or DB string values into a valid `LlmProviderId`, defaulting to `'opencode'` for any unrecognised input.

## Key Exports

### `LlmProviderId` (type)

```typescript
type LlmProviderId = 'opencode' | 'openrouter' | 'ollama' | 'vmlx';
```

### `parseLlmProvider(value)` — function

```
parseLlmProvider(value: string | undefined): LlmProviderId
```

**Logic (exhaustive match, first hit wins):**

| Input value | Returns |
|---|---|
| `'openrouter'` | `'openrouter'` |
| `'ollama'` | `'ollama'` |
| `'vmlx'` | `'vmlx'` |
| anything else / `undefined` | `'opencode'` (default) |

## Depends on
- [[packages/package-core]]

## Used by
- [[modules/provider-switcher]] — calls `parseLlmProvider()` when reading the active provider from DB or `LLM_PROVIDER` env var
- [[routes/admin]] — `PUT /api/admin/provider` validates the incoming provider string through `parseLlmProvider()` before persisting

## Related domain concepts
- The four `LlmProviderId` values map to concrete `LLMProvider` implementations: [[ai-providers/provider-opencode]], [[ai-providers/provider-openrouter]], [[ai-providers/provider-ollama]], [[ai-providers/provider-vmlx]]
- `mock` provider is test-only and not user-selectable
- [[configs/config-models]] — model route strings are provider-agnostic; `LlmProviderId` determines only which API endpoint receives the resolved model string

## Notes
- `'opencode'` is the default — reflects the primary development environment. Production deployments typically override via the `LLM_PROVIDER` env var or `PUT /api/admin/provider`.
- This module is intentionally minimal — it carries no config constants, only a type and a safe parse function.
