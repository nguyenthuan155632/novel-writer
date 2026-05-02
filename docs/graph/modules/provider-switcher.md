---
type: module
source: apps/api/src/lib/provider-switcher.ts
---

# Module: Provider Switcher

## Responsibility
Runtime LLM provider factory. Reads active provider from DB (`llm_provider_state`), instantiates the correct provider class, wraps in [[modules/llm-call-logger]].

## Source Evidence
- `apps/api/src/lib/provider-switcher.ts`
- `apps/api/src/lib/llm-settings.ts` — DB read/write for settings

## Inputs
- [[database/tables/llm-provider-state]] — `activeProvider` name
- [[database/tables/llm-provider-settings]] — `modelRoutes` per provider

## Outputs
- Wrapped `LLMProvider` instance (`LoggedLLMProvider`)

## Provider Options
- [[ai-providers/provider-opencode]] (default)
- [[ai-providers/provider-openrouter]]
- [[ai-providers/provider-ollama]]
- [[ai-providers/provider-vmlx]]

## Used by
- [[apps/app-api]] routes that call LLM directly (bible gen, saga/arc planning)
- [[apps/app-worker]] job dispatcher (snapshots provider at job dispatch time)

## Related flows
- [[flows/llm-provider-flow]]
