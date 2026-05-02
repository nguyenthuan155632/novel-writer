---
type: package
source: packages/ai/src/
---

# Package: @novel/ai

## Responsibility
All LLM agent logic, prompt templates, context builder, provider abstraction, canon reconciliation, embedding service, and deterministic validators.

## Source Evidence
- `packages/ai/src/agents/` — 11 agent files
- `packages/ai/src/prompts/` — 12 prompt v2 files + 3 contract helpers + registry
- `packages/ai/src/providers/` — 5 provider implementations + interface
- `packages/ai/src/context/` — 8 context builder files
- `packages/ai/src/validators/` — packet auditor + deterministic runner + 12 checks
- `packages/ai/src/reconciliation/` — canon merger + conflict detector
- `packages/ai/src/embeddings/` — embedding service

## Key Agents
- [[agents/bible-generator]]
- [[agents/saga-planner]]
- [[agents/arc-planner]]
- [[agents/packet-generator]]
- [[agents/writer]]
- [[agents/llm-validator]]
- [[agents/auto-fixer]]
- [[agents/canon-extractor]]
- [[agents/summary-compactor]]
- [[agents/arc-summary-compactor]]
- [[agents/high-stakes-reviewer]]

## Key Modules
- [[modules/context-builder]] — assembles ChapterContext (HOT/WARM/COLD tiers)
- [[modules/canon-merger]] — stages/applies extracted canon facts
- [[modules/conflict-detector]] — detects canon conflict types
- [[modules/llm-call-logger]] — LoggedLLMProvider wraps all providers
- [[modules/embedding-service]] — vector embeddings for facts/summaries

## LLM Providers
- [[ai-providers/provider-interface]] — shared contract
- [[ai-providers/provider-opencode]]
- [[ai-providers/provider-openrouter]]
- [[ai-providers/provider-ollama]]
- [[ai-providers/provider-vmlx]]
- [[ai-providers/provider-mock]] _(tests only)_

## Validators
- [[validators/deterministic-runner]]
- [[validators/packet-auditor]]

## Depends on
- [[packages/package-db]]
- [[packages/package-core]]
- [[external-services/service-openrouter]]
- [[external-services/service-opencode]]
- [[external-services/service-ollama]]
- [[external-services/service-vmlx]]

## Used by
- [[apps/app-worker]] — all generation jobs
- [[apps/app-api]] — bible gen, saga/arc planning
