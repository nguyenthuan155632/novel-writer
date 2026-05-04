# Novel graph — packages

## package-ai

`packages/package-ai.md`

---
type: package
source: packages/ai/src/
---



Package: @novel/ai Responsibility
All LLM agent logic, prompt templates, context builder, provider abstraction, canon reconciliation, embedding service, and deterministic validators.



Package: @novel/ai Source Evidence
- `packages/ai/src/agents/` — 11 agent files
- `packages/ai/src/prompts/` — 12 prompt v2 files + 3 contract helpers + registry
- `packages/ai/src/providers/` — 5 provider implementations + interface
- `packages/ai/src/context/` — 8 context builder files
- `packages/ai/src/validators/` — packet auditor + deterministic runner + 12 checks
- `packages/ai/src/reconciliation/` — canon merger + conflict detector
- `packages/ai/src/embeddings/` — embedding service



Package: @novel/ai Key Agents
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



Package: @novel/ai Key Modules
- [[modules/context-builder]] — assembles ChapterContext (HOT/WARM/COLD tiers)
- [[modules/canon-merger]] — stages/applies extracted canon facts
- [[modules/conflict-detector]] — detects canon conflict types
- [[modules/llm-call-logger]] — LoggedLLMProvider wraps all providers
- [[modules/embedding-service]] — vector embeddings for facts/summaries



Package: @novel/ai LLM Providers
- [[ai-providers/provider-interface]] — shared contract
- [[ai-providers/provider-opencode]]
- [[ai-providers/provider-openrouter]]
- [[ai-providers/provider-ollama]]
- [[ai-providers/provider-vmlx]]
- [[ai-providers/provider-mock]] _(tests only)_



Package: @novel/ai Validators
- [[validators/deterministic-runner]]
- [[validators/packet-auditor]]



Package: @novel/ai Depends on
- [[packages/package-db]]
- [[packages/package-core]]
- [[external-services/service-openrouter]]
- [[external-services/service-opencode]]
- [[external-services/service-ollama]]
- [[external-services/service-vmlx]]



Package: @novel/ai Used by
- [[apps/app-worker]] — all generation jobs
- [[apps/app-api]] — bible gen, saga/arc planning

---

## package-core

`packages/package-core.md`

---
type: package
source: packages/core/src/
---



Package: @novel/core Responsibility
Domain configuration, budget guardrails, model routing, generation policy, catalog definitions, exporters, shared utilities.



Package: @novel/core Source Evidence
`packages/core/src/config/` — 7 config modules
`packages/core/src/policy/` — 3 policy modules
`packages/core/src/catalog/` — genres, personalities, story options
`packages/core/src/services/` — admin metrics, exporters



Package: @novel/core Key Exports
- `getEffectiveConfig(storyId, provider)` — merges global config with per-story DB overrides
- `checkAgainstCaps()` — budget hard caps
- `modelFor(role)` — resolves model string for agent role
- `shouldRunReviewer()` — high-stakes trigger
- `resolveEffectiveMode()` — mode escalation
- Genre catalog, personality catalog, story options



Package: @novel/core Config Modules
- [[configs/config-budget]]
- [[configs/config-generation]]
- [[configs/config-context]]
- [[configs/config-models]]
- [[configs/config-long-form]]
- [[configs/config-effective]]
- [[configs/config-export]]



Package: @novel/core Policy Modules
- `policy/budget-guardrails.ts` — [[configs/config-budget]]
- `policy/high-stakes-triggers.ts`
- `policy/mode-escalation.ts`



Package: @novel/core Services
- `services/admin-metrics.ts` — [[modules/admin-metrics]]
- `services/exporters/epub-exporter.ts`
- `services/exporters/markdown-exporter.ts`



Package: @novel/core Depends On
- [[packages/package-db]] — AdminMetricsService reads DB
- [[external-services/postgresql]] — indirect



Package: @novel/core Used By
- [[packages/package-ai]]
- [[apps/app-api]]
- [[apps/app-worker]]
---
type: package
source: packages/core/src/
---



Package: @novel/core Responsibility
Domain configuration, budget guardrails, model routing, generation policy, catalog definitions, exporters, shared utilities.



Package: @novel/core Source Evidence
`packages/core/src/config/` — 7 config modules
`packages/core/src/policy/` — 3 policy modules
`packages/core/src/catalog/` — genres, personalities, story options
`packages/core/src/services/` — admin metrics, exporters



Package: @novel/core Key Exports
- `getEffectiveConfig(storyId, provider)` — [[configs/config-effective]]
- `checkAgainstCaps()` — [[configs/config-budget]]
- `modelFor(role)` — [[configs/config-models]]
- `shouldRunReviewer()` — high-stakes trigger policy
- `resolveEffectiveMode()` — mode escalation policy
- Genre/personality/story options catalogs



Package: @novel/core Config Modules
- [[configs/config-budget]]
- [[configs/config-generation]]
- [[configs/config-context]]
- [[configs/config-models]]
- [[configs/config-long-form]]
- [[configs/config-effective]]
- [[configs/config-export]]



Package: @novel/core Services
- [[modules/admin-metrics]]
- `services/exporters/epub-exporter.ts`
- `services/exporters/markdown-exporter.ts`



Package: @novel/core Depends On
- [[packages/package-db]]



Package: @novel/core Used By
- [[packages/package-ai]]
- [[apps/app-api]]
- [[apps/app-worker]]

---

## package-db

`packages/package-db.md`

---
type: package
source: packages/db/src/
---



Package: @novel/db Responsibility
Drizzle ORM schema definitions, PostgreSQL client, migration runner, cost tracking service.



Package: @novel/db Source Evidence
`packages/db/src/schema/` — 22 table definition files
`packages/db/src/client.ts` — `getSqlClient()`, `getDb()`, `Db` type
`packages/db/src/migrate.ts` — migration runner
`packages/db/src/services/cost-tracker.ts` — `accumulateStoryCost()`



Package: @novel/db Exports
- All schema table references
- `getDb()`, `getSqlClient()`
- `accumulateStoryCost()`
- Type: `Db`



Package: @novel/db Database Tables (all owned here)
- [[database/tables/stories]]
- [[database/tables/story-bibles]]
- [[database/tables/characters]]
- [[database/tables/factions]]
- [[database/tables/bloodlines]]
- [[database/tables/sagas]]
- [[database/tables/arcs]]
- [[database/tables/chapters]]
- [[database/tables/chapter-packets]]
- [[database/tables/chapter-summaries]]
- [[database/tables/timeline-events]]
- [[database/tables/open-threads]]
- [[database/tables/canon-facts]]
- [[database/tables/validations]]
- [[database/tables/llm-calls]]
- [[database/tables/planted-seeds]]
- [[database/tables/pending-canon-updates]]
- [[database/tables/context-packets]]
- [[database/tables/story-settings]]
- [[database/tables/batches]]
- [[database/tables/high-stakes-reviews]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]



Package: @novel/db Depends On
- [[external-services/postgresql]] — Drizzle over postgres
- `drizzle-orm`, `drizzle-kit`



Package: @novel/db Used By
- [[packages/package-ai]] — all agents read/write DB
- [[packages/package-core]] — AdminMetricsService
- [[apps/app-api]]
- [[apps/app-worker]]
---
type: package
source: packages/db/src/
---



Package: @novel/db Responsibility
Drizzle ORM schema, PostgreSQL client, migration runner, cost tracking service.



Package: @novel/db Source Evidence
`packages/db/src/client.ts` — `getSqlClient()`, `getDb()`, `Db` type
`packages/db/src/schema/` — 23 table definition files
`packages/db/src/migrate.ts` — migration runner
`packages/db/src/services/cost-tracker.ts` — `accumulateStoryCost()`



Package: @novel/db Database Tables Owned
- [[database/tables/stories]]
- [[database/tables/story-bibles]]
- [[database/tables/characters]]
- [[database/tables/factions]]
- [[database/tables/bloodlines]]
- [[database/tables/sagas]]
- [[database/tables/arcs]]
- [[database/tables/chapters]]
- [[database/tables/chapter-packets]]
- [[database/tables/chapter-summaries]]
- [[database/tables/timeline-events]]
- [[database/tables/open-threads]]
- [[database/tables/canon-facts]]
- [[database/tables/validations]]
- [[database/tables/llm-calls]]
- [[database/tables/planted-seeds]]
- [[database/tables/pending-canon-updates]]
- [[database/tables/context-packets]]
- [[database/tables/story-settings]]
- [[database/tables/batches]]
- [[database/tables/high-stakes-reviews]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]



Package: @novel/db Key Exports
- All schema table references
- `getDb()`, `getSqlClient()`
- `accumulateStoryCost()`
- Type: `Db`



Package: @novel/db Depends On
- [[external-services/postgresql]]
- `drizzle-orm`, `drizzle-kit`



Package: @novel/db Used By
- [[packages/package-ai]]
- [[packages/package-core]]
- [[apps/app-api]]
- [[apps/app-worker]]

---
