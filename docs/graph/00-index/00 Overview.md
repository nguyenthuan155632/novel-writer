---
type: index
---

# Novel Factory — Atomic Code Graph

> **Novel Factory** is a single-user local application for generating long-form (500–1,000 chapter) Vietnamese xianxia/fantasy novels.  
> **Target cost:** ≤ $0.05 per chapter using a "system remembers, model writes" architecture.

---

## Architecture Overview

The monorepo is divided into three **apps** and three **packages**. Generation is driven by a BullMQ **worker** that orchestrates a multi-stage pipeline: plan → write → validate → memory update. Every LLM call is routed through a swappable **provider abstraction**, logged to Postgres, and checked against hard **budget guardrails**. Context is assembled from a **3-tier cache** (HOT/WARM/COLD) so stable bible data is never re-sent unnecessarily. Canon integrity is maintained by staging all new facts as `pending_canon_updates` before merging.

---

## Entry Points by Section

### Apps
- [[apps/app-api]] — Fastify 5 REST server
- [[apps/app-web]] — Next.js 15 dashboard
- [[apps/app-worker]] — BullMQ background processor

### Packages
- [[packages/package-ai]] — All LLM agent logic, prompts, context builder, providers
- [[packages/package-core]] — Domain config, budget guardrails, model routing, shared utilities
- [[packages/package-db]] — Drizzle ORM schema, PostgreSQL client, migrations

### API Routes
- [[routes/stories]] · [[routes/chapters]] · [[routes/batches]]
- [[routes/sagas]] · [[routes/arcs]] · [[routes/bible]]
- [[routes/canon-facts]] · [[routes/pending-updates]] · [[routes/seeds]]
- [[routes/timeline]] · [[routes/costs]] · [[routes/exports]]
- [[routes/reviews]] · [[routes/story-settings]] · [[routes/health]]
- [[routes/admin]]

### Agents (11)
- [[agents/writer]] · [[agents/bible-generator]] · [[agents/packet-generator]]
- [[agents/saga-planner]] · [[agents/arc-planner]] · [[agents/canon-extractor]]
- [[agents/llm-validator]] · [[agents/auto-fixer]] · [[agents/summary-compactor]]
- [[agents/arc-summary-compactor]] · [[agents/high-stakes-reviewer]]

### Validators (14)
- [[validators/deterministic-runner]] · [[validators/packet-auditor]]
- [[validators/check-word-count]] · [[validators/check-dead-character]] · [[validators/check-unknown-character]]
- [[validators/check-unknown-location]] · [[validators/check-locked-fact]] · [[validators/check-forbidden-move]]
- [[validators/check-realm-jump]] · [[validators/check-new-bloodline-source]] · [[validators/check-cliffhanger]]
- [[validators/check-conflict-presence]] · [[validators/check-repetition]] · [[validators/check-style-red-flags]]

### AI Providers (5)
- [[ai-providers/provider-interface]] · [[ai-providers/provider-openrouter]]
- [[ai-providers/provider-opencode]] · [[ai-providers/provider-ollama]]
- [[ai-providers/provider-vmlx]] · [[ai-providers/provider-mock]]

### Jobs (6) & Workers (2)
- [[jobs/job-generate-chapter]] · [[jobs/job-generate-batch]]
- [[jobs/job-generate-export]] · [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]] · [[jobs/job-high-stakes-review]]
- [[workers/worker-main]] · [[workers/queues]]

### Core Modules (26)
- [[modules/context-builder]] · [[modules/canon-merger]] · [[modules/conflict-detector]]
- [[modules/llm-call-logger]] · [[modules/budget-guard]] · [[modules/embedding-service]]
- [[modules/context-retrieval]] · [[modules/context-shrink]] · [[modules/context-cache-keys]]
- [[modules/context-types]] · [[modules/context-compact]] · [[modules/context-past-reference]]
- [[modules/context-serialize]] · [[modules/validation-logger]] · [[modules/parse-completion-json]]
- [[modules/provider-switcher]] · [[modules/queue-client]] · [[modules/story-domain]]
- [[modules/cost-tracker]] · [[modules/admin-metrics]] · [[modules/trace]] · [[modules/logger]]
- [[modules/epub-exporter]] · [[modules/markdown-exporter]]
- [[modules/policy-high-stakes-triggers]] · [[modules/policy-mode-escalation]]

### Flows (4)
- [[flows/chapter-generation-flow]] · [[flows/validation-flow]]
- [[flows/llm-provider-flow]] · [[flows/job-worker-flow]]

### Errors (5)
- [[errors/error-budget-exceeded]] · [[errors/error-canon-conflict]]
- [[errors/error-validation-failure]] · [[errors/error-generation-blocked]]
- [[errors/error-high-stakes-escalation]]

### External Services (7)
- [[external-services/service-postgresql]] · [[external-services/service-redis]]
- [[external-services/service-bullmq]] · [[external-services/service-openrouter]]
- [[external-services/service-opencode]] · [[external-services/service-ollama]]
- [[external-services/service-vmlx]]

### Database (23 tables)
- [[database/database-erd]] — full ERD diagram
- [[database/tables/stories]] · [[database/tables/story-bibles]] · [[database/tables/chapters]]
- [[database/tables/sagas]] · [[database/tables/arcs]] · [[database/tables/canon-facts]]
- [[database/tables/pending-canon-updates]] · [[database/tables/llm-calls]] · [[database/tables/validations]]

### Architecture & Domain
- [[architecture/system-architecture]]
- [[domain/story]] · [[domain/chapter]] · [[domain/xianxia]] · [[domain/story-bible]]
- [[domain/context-tiers]] · [[domain/generation-mode]] · [[domain/canon-fact]]
- [[domain/saga]] · [[domain/arc]] · [[domain/character]] · [[domain/planted-seed]]

### Prompts (15)
- [[prompts/prompt-registry]] · [[prompts/prompt-writer-v2]] · [[prompts/prompt-bible-generator-v2]]
- [[prompts/contract-genre]] · [[prompts/contract-personality]] · [[prompts/contract-story-options]]

### Configuration (11)
- [[configs/config-effective]] · [[configs/config-models]] · [[configs/config-budget]]
- [[configs/config-generation]] · [[configs/config-context]] · [[configs/config-long-form]]
- [[configs/policy-budget-guardrails]] · [[configs/policy-mode-escalation]] · [[configs/policy-high-stakes-triggers]]
