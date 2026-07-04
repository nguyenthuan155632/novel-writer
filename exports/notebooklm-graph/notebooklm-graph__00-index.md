# Novel graph — 00-index

## 00 Overview

`00-index/00 Overview.md`

---
type: index
---



Novel Factory — Atomic Code Graph Architecture Overview
> **Novel Factory** is a single-user local application for generating long-form (500–1,000 chapter) Vietnamese xianxia/fantasy novels.
> **Target cost:** ≤ $0.05 per chapter using a "system remembers, model writes" architecture.
---
The monorepo is divided into three **apps** and three **packages**. Generation is driven by a BullMQ **worker** that orchestrates a multi-stage pipeline: plan → write → validate → memory update. Every LLM call is routed through a swappable **provider abstraction**, logged to Postgres, and checked against hard **budget guardrails**. Context is assembled from a **3-tier cache** (HOT/WARM/COLD) so stable bible data is never re-sent unnecessarily. Canon integrity is maintained by staging all new facts as `pending_canon_updates` before merging.
---



Novel Factory — Atomic Code Graph Entry Points by Section Apps
- [[apps/app-api]] — Fastify 5 REST server
- [[apps/app-web]] — Next.js 15 dashboard
- [[apps/app-worker]] — BullMQ background processor



Novel Factory — Atomic Code Graph Entry Points by Section Packages
- [[packages/package-ai]] — All LLM agent logic, prompts, context builder, providers
- [[packages/package-core]] — Domain config, budget guardrails, model routing, shared utilities
- [[packages/package-db]] — Drizzle ORM schema, PostgreSQL client, migrations



Novel Factory — Atomic Code Graph Entry Points by Section API Routes
- [[routes/stories]] · [[routes/chapters]] · [[routes/batches]]
- [[routes/sagas]] · [[routes/arcs]] · [[routes/bible]]
- [[routes/canon-facts]] · [[routes/pending-updates]] · [[routes/seeds]]
- [[routes/timeline]] · [[routes/costs]] · [[routes/exports]]
- [[routes/reviews]] · [[routes/story-settings]] · [[routes/health]]
- [[routes/admin]]



Novel Factory — Atomic Code Graph Entry Points by Section Agents (11)
- [[agents/writer]] · [[agents/bible-generator]] · [[agents/packet-generator]]
- [[agents/saga-planner]] · [[agents/arc-planner]] · [[agents/canon-extractor]]
- [[agents/llm-validator]] · [[agents/auto-fixer]] · [[agents/summary-compactor]]
- [[agents/arc-summary-compactor]] · [[agents/high-stakes-reviewer]]



Novel Factory — Atomic Code Graph Entry Points by Section Validators (14)
- [[validators/deterministic-runner]] · [[validators/packet-auditor]]
- [[validators/check-word-count]] · [[validators/check-dead-character]] · [[validators/check-unknown-character]]
- [[validators/check-unknown-location]] · [[validators/check-locked-fact]] · [[validators/check-forbidden-move]]
- [[validators/check-realm-jump]] · [[validators/check-new-bloodline-source]] · [[validators/check-cliffhanger]]
- [[validators/check-conflict-presence]] · [[validators/check-repetition]] · [[validators/check-style-red-flags]]



Novel Factory — Atomic Code Graph Entry Points by Section AI Providers (5)
- [[ai-providers/provider-interface]] · [[ai-providers/provider-openrouter]]
- [[ai-providers/provider-openai-compatible]] · [[ai-providers/provider-ollama]]
- [[ai-providers/provider-vmlx]] · [[ai-providers/provider-mock]]



Novel Factory — Atomic Code Graph Entry Points by Section Jobs (6) & Workers (2)
- [[jobs/job-generate-chapter]] · [[jobs/job-generate-batch]]
- [[jobs/job-generate-export]] · [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]] · [[jobs/job-high-stakes-review]]
- [[workers/worker-main]] · [[workers/queues]]



Novel Factory — Atomic Code Graph Entry Points by Section Core Modules (26)
- [[modules/context-builder]] · [[modules/canon-merger]] · [[modules/conflict-detector]]
- [[modules/llm-call-logger]] · [[modules/budget-guard]] · [[modules/embedding-service]]
- [[modules/context-retrieval]] · [[modules/context-shrink]] · [[modules/context-cache-keys]]
- [[modules/context-types]] · [[modules/context-compact]] · [[modules/context-past-reference]]
- [[modules/context-serialize]] · [[modules/validation-logger]] · [[modules/parse-completion-json]]
- [[modules/provider-switcher]] · [[modules/queue-client]] · [[modules/story-domain]]
- [[modules/cost-tracker]] · [[modules/admin-metrics]] · [[modules/trace]] · [[modules/logger]]
- [[modules/epub-exporter]] · [[modules/markdown-exporter]]
- [[modules/policy-high-stakes-triggers]] · [[modules/policy-mode-escalation]]



Novel Factory — Atomic Code Graph Entry Points by Section Flows (4)
- [[flows/chapter-generation-flow]] · [[flows/validation-flow]]
- [[flows/llm-provider-flow]] · [[flows/job-worker-flow]]



Novel Factory — Atomic Code Graph Entry Points by Section Errors (5)
- [[errors/error-budget-exceeded]] · [[errors/error-canon-conflict]]
- [[errors/error-validation-failure]] · [[errors/error-generation-blocked]]
- [[errors/error-high-stakes-escalation]]



Novel Factory — Atomic Code Graph Entry Points by Section External Services (7)
- [[external-services/service-postgresql]] · [[external-services/service-redis]]
- [[external-services/service-bullmq]] · [[external-services/service-openrouter]]
- [[external-services/service-openai-compatible]] · [[external-services/service-ollama]]
- [[external-services/service-vmlx]]



Novel Factory — Atomic Code Graph Entry Points by Section Database (23 tables)
- [[database/database-erd]] — full ERD diagram
- [[database/tables/stories]] · [[database/tables/story-bibles]] · [[database/tables/chapters]]
- [[database/tables/sagas]] · [[database/tables/arcs]] · [[database/tables/canon-facts]]
- [[database/tables/pending-canon-updates]] · [[database/tables/llm-calls]] · [[database/tables/validations]]



Novel Factory — Atomic Code Graph Entry Points by Section Architecture & Domain
- [[architecture/system-architecture]]
- [[domain/story]] · [[domain/chapter]] · [[domain/xianxia]] · [[domain/story-bible]]
- [[domain/context-tiers]] · [[domain/generation-mode]] · [[domain/canon-fact]]
- [[domain/saga]] · [[domain/arc]] · [[domain/character]] · [[domain/planted-seed]]



Novel Factory — Atomic Code Graph Entry Points by Section Prompts (15)
- [[prompts/prompt-registry]] · [[prompts/prompt-writer-v2]] · [[prompts/prompt-bible-generator-v2]]
- [[prompts/contract-genre]] · [[prompts/contract-personality]] · [[prompts/contract-story-options]]



Novel Factory — Atomic Code Graph Entry Points by Section Configuration (11)
- [[configs/config-effective]] · [[configs/config-models]] · [[configs/config-budget]]
- [[configs/config-generation]] · [[configs/config-context]] · [[configs/config-long-form]]
- [[configs/policy-budget-guardrails]] · [[configs/policy-mode-escalation]] · [[configs/policy-high-stakes-triggers]]

---

## 01 Node Inventory

`00-index/01 Node Inventory.md`

---
type: index
---



Node Inventory Apps (3)
Complete list of every atomic note in the vault, organised by folder.
---
- [[apps/app-api]]
- [[apps/app-web]]
- [[apps/app-worker]]
---



Node Inventory Packages (3)
- [[packages/package-ai]]
- [[packages/package-core]]
- [[packages/package-db]]
---



Node Inventory Routes (16)
- [[routes/admin]]
- [[routes/arcs]]
- [[routes/batches]]
- [[routes/bible]]
- [[routes/canon-facts]]
- [[routes/chapters]]
- [[routes/costs]]
- [[routes/exports]]
- [[routes/health]]
- [[routes/pending-updates]]
- [[routes/reviews]]
- [[routes/sagas]]
- [[routes/seeds]]
- [[routes/stories]]
- [[routes/story-settings]]
- [[routes/timeline]]
---



Node Inventory Agents (11)
- [[agents/writer]]
- [[agents/bible-generator]]
- [[agents/packet-generator]]
- [[agents/saga-planner]]
- [[agents/arc-planner]]
- [[agents/canon-extractor]]
- [[agents/llm-validator]]
- [[agents/auto-fixer]]
- [[agents/summary-compactor]]
- [[agents/arc-summary-compactor]]
- [[agents/high-stakes-reviewer]]
---



Node Inventory Validators (14)
- [[validators/deterministic-runner]]
- [[validators/packet-auditor]]
- [[validators/check-word-count]]
- [[validators/check-dead-character]]
- [[validators/check-unknown-character]]
- [[validators/check-unknown-location]]
- [[validators/check-forbidden-move]]
- [[validators/check-locked-fact]]
- [[validators/check-realm-jump]]
- [[validators/check-repetition]]
- [[validators/check-cliffhanger]]
- [[validators/check-conflict-presence]]
- [[validators/check-style-red-flags]]
- [[validators/check-new-bloodline-source]]
---



Node Inventory Jobs (6)
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]
- [[jobs/job-generate-export]]
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]
- [[jobs/job-high-stakes-review]]
---



Node Inventory Workers (2)
- [[workers/worker-main]]
- [[workers/queues]]
---



Node Inventory AI Providers (6)
- [[ai-providers/provider-interface]]
- [[ai-providers/provider-openrouter]]
- [[ai-providers/provider-openai-compatible]]
- [[ai-providers/provider-ollama]]
- [[ai-providers/provider-vmlx]]
- [[ai-providers/provider-mock]]
---



Node Inventory Prompts (15)
- [[prompts/prompt-registry]]
- [[prompts/prompt-writer-v2]]
- [[prompts/prompt-bible-generator-v2]]
- [[prompts/prompt-packet-generator-v2]]
- [[prompts/prompt-saga-planner-v2]]
- [[prompts/prompt-arc-planner-v2]]
- [[prompts/prompt-canon-extractor-v2]]
- [[prompts/prompt-llm-validator-v2]]
- [[prompts/prompt-auto-fixer-v2]]
- [[prompts/prompt-summary-compactor-v2]]
- [[prompts/prompt-arc-summary-compactor-v2]]
- [[prompts/prompt-high-stakes-reviewer-v2]]
- [[prompts/contract-genre]]
- [[prompts/contract-personality]]
- [[prompts/contract-story-options]]
---



Node Inventory Modules (26) Context sub-system (8)
- [[modules/context-builder]]
- [[modules/context-cache-keys]]
- [[modules/context-compact]]
- [[modules/context-past-reference]]
- [[modules/context-retrieval]]
- [[modules/context-serialize]]
- [[modules/context-shrink]]
- [[modules/context-types]]



Node Inventory Modules (26) Canon & validation (3)
- [[modules/canon-merger]]
- [[modules/conflict-detector]]
- [[modules/validation-logger]]



Node Inventory Modules (26) LLM infrastructure (4)
- [[modules/parse-completion-json]]
- [[modules/llm-call-logger]]
- [[modules/provider-switcher]]
- [[modules/embedding-service]]



Node Inventory Modules (26) Policy (3)
- [[modules/policy-high-stakes-triggers]]
- [[modules/policy-mode-escalation]]
- [[modules/budget-guard]]



Node Inventory Modules (26) Export (2)
- [[modules/epub-exporter]]
- [[modules/markdown-exporter]]



Node Inventory Modules (26) Cost & metrics (2)
- [[modules/cost-tracker]]
- [[modules/admin-metrics]]



Node Inventory Modules (26) Queue & domain (2)
- [[modules/queue-client]]
- [[modules/story-domain]]



Node Inventory Modules (26) Utilities (2)
- [[modules/logger]]
- [[modules/trace]]
---



Node Inventory Configs (11)
- [[configs/config-effective]]
- [[configs/config-models]]
- [[configs/config-budget]]
- [[configs/config-generation]]
- [[configs/config-context]]
- [[configs/config-long-form]]
- [[configs/config-export]]
- [[configs/config-llm-provider]]
- [[configs/policy-budget-guardrails]]
- [[configs/policy-high-stakes-triggers]]
- [[configs/policy-mode-escalation]]
---



Node Inventory Domain Concepts (16)
- [[domain/story]]
- [[domain/chapter]]
- [[domain/chapter-packet]]
- [[domain/arc]]
- [[domain/saga]]
- [[domain/planted-seed]]
- [[domain/character]]
- [[domain/canon-fact]]
- [[domain/pending-canon-update]]
- [[domain/bloodline]]
- [[domain/faction]]
- [[domain/open-thread]]
- [[domain/context-tiers]]
- [[domain/xianxia]]
- [[domain/generation-mode]]
- [[domain/story-bible]]
---



Node Inventory Database Tables (23)
- [[database/tables/stories]]
- [[database/tables/story-bibles]]
- [[database/tables/story-settings]]
- [[database/tables/sagas]]
- [[database/tables/arcs]]
- [[database/tables/chapters]]
- [[database/tables/chapter-packets]]
- [[database/tables/chapter-summaries]]
- [[database/tables/characters]]
- [[database/tables/canon-facts]]
- [[database/tables/pending-canon-updates]]
- [[database/tables/planted-seeds]]
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/bloodlines]]
- [[database/tables/factions]]
- [[database/tables/batches]]
- [[database/tables/validations]]
- [[database/tables/high-stakes-reviews]]
- [[database/tables/llm-calls]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]
- [[database/tables/context-packets]]
---



Node Inventory Flows (4)
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
- [[flows/llm-provider-flow]]
- [[flows/job-worker-flow]]
---



Node Inventory Errors (5)
- [[errors/error-budget-exceeded]]
- [[errors/error-canon-conflict]]
- [[errors/error-validation-failure]]
- [[errors/error-generation-blocked]]
- [[errors/error-high-stakes-escalation]]
---



Node Inventory External Services (7)
- [[external-services/service-postgresql]]
- [[external-services/service-redis]]
- [[external-services/service-bullmq]]
- [[external-services/service-openrouter]]
- [[external-services/service-openai-compatible]]
- [[external-services/service-ollama]]
- [[external-services/service-vmlx]]
---



Node Inventory Architecture (1)
- [[architecture/system-architecture]]
---



Node Inventory Database Overview (1)
- [[database/database-erd]]
---



Node Inventory Pipelines (1)
- [[pipelines/chapter-generation-pipeline]]

---

## 02 Edge Inventory

`00-index/02 Edge Inventory.md`

---
type: index
---



Edge Inventory Generation Pipeline Edges Main pipeline orchestration
All key relationships (directed edges) in the atomic code graph, organised by sub-system.
Format: **Source** → _relationship_ → **Target**
---
- [[jobs/job-generate-chapter]] → calls → [[agents/packet-generator]]
- [[jobs/job-generate-chapter]] → calls → [[validators/packet-auditor]]
- [[jobs/job-generate-chapter]] → calls → [[validators/deterministic-runner]]
- [[jobs/job-generate-chapter]] → calls → [[agents/writer]]
- [[jobs/job-generate-chapter]] → calls → [[agents/llm-validator]]
- [[jobs/job-generate-chapter]] → calls → [[agents/auto-fixer]] _(on low/medium severity)_
- [[jobs/job-generate-chapter]] → calls → [[agents/canon-extractor]]
- [[jobs/job-generate-chapter]] → calls → [[modules/canon-merger]]
- [[jobs/job-generate-chapter]] → calls → [[agents/summary-compactor]]
- [[jobs/job-generate-chapter]] → enqueues → [[jobs/job-refresh-arc-summary]]
- [[jobs/job-generate-chapter]] → enqueues → [[jobs/job-high-stakes-review]] _(conditional)_
- [[jobs/job-generate-batch]] → spawns → [[jobs/job-generate-chapter]]



Edge Inventory Generation Pipeline Edges Mode escalation
- [[jobs/job-generate-chapter]] → calls → [[modules/policy-mode-escalation]]
- [[jobs/job-generate-batch]] → calls → [[modules/policy-mode-escalation]]
- [[modules/policy-mode-escalation]] → reads → [[database/tables/pending-canon-updates]] _(blocking check)_
- [[modules/policy-mode-escalation]] → reads → [[database/tables/arcs]] _(arc boundary check)_



Edge Inventory Generation Pipeline Edges High-stakes review trigger
- [[jobs/job-generate-chapter]] → calls → [[modules/policy-high-stakes-triggers]]
- [[modules/policy-high-stakes-triggers]] → reads arc boundary from → [[database/tables/arcs]]
- [[jobs/job-high-stakes-review]] → calls → [[agents/high-stakes-reviewer]]



Edge Inventory Generation Pipeline Edges Batch pipeline
- [[routes/batches]] → enqueues → [[jobs/job-generate-batch]]
- [[jobs/job-generate-batch]] → reads → [[database/tables/batches]]
- [[jobs/job-generate-batch]] → writes → [[database/tables/batches]]



Edge Inventory Generation Pipeline Edges Export pipeline
- [[routes/exports]] → enqueues → [[jobs/job-generate-export]]
- [[jobs/job-generate-export]] → calls → [[modules/epub-exporter]] _(epub format)_
- [[jobs/job-generate-export]] → calls → [[modules/markdown-exporter]] _(markdown format)_
- [[modules/epub-exporter]] → reads → [[database/tables/chapters]]
- [[modules/epub-exporter]] → reads → [[database/tables/stories]]
- [[modules/markdown-exporter]] → reads → [[database/tables/chapters]]
- [[modules/markdown-exporter]] → reads → [[database/tables/stories]]
---



Edge Inventory Context Build Edges Context builder assembly
- [[modules/context-builder]] → calls → [[modules/context-retrieval]]
- [[modules/context-builder]] → calls → [[modules/context-shrink]] _(when over token budget)_
- [[modules/context-builder]] → calls → [[modules/context-cache-keys]] _(hash HOT + WARM tiers)_
- [[modules/context-builder]] → calls → [[modules/context-past-reference]] _(detect flashback keywords)_
- [[modules/context-builder]] → calls → [[modules/embedding-service]] _(for vector canon retrieval)_
- [[modules/context-builder]] → writes → [[database/tables/context-packets]]



Edge Inventory Context Build Edges HOT tier retrieval
- [[modules/context-retrieval]] → reads → [[database/tables/story-bibles]] _(HOT)_



Edge Inventory Context Build Edges WARM tier retrieval
- [[modules/context-retrieval]] → reads → [[database/tables/sagas]] _(WARM)_
- [[modules/context-retrieval]] → reads → [[database/tables/arcs]] _(WARM)_
- [[modules/context-retrieval]] → reads → [[database/tables/characters]] _(WARM)_
- [[modules/context-retrieval]] → reads → [[database/tables/open-threads]] _(WARM)_
- [[modules/context-retrieval]] → reads → [[database/tables/planted-seeds]] _(WARM + COLD)_



Edge Inventory Context Build Edges COLD tier retrieval
- [[modules/context-retrieval]] → reads → [[database/tables/chapter-summaries]] _(COLD — recent summaries)_
- [[modules/context-retrieval]] → reads → [[database/tables/canon-facts]] _(COLD — pgvector top-K)_



Edge Inventory Context Build Edges Context compaction & injection
- [[modules/context-compact]] → is called by → [[modules/context-retrieval]]
- [[modules/context-shrink]] → applies SHRINK_ORDER from → [[configs/config-context]]
- [[modules/context-serialize]] → is called by → [[modules/context-cache-keys]]
- [[modules/context-builder]] → provides ChapterContext to → [[agents/writer]]
- [[modules/context-builder]] → provides ChapterContext to → [[agents/packet-generator]]
- [[modules/context-builder]] → provides ChapterContext to → [[agents/llm-validator]]
---



Edge Inventory Validation Flow Edges Deterministic validation
- [[validators/deterministic-runner]] → runs → [[validators/check-word-count]]
- [[validators/deterministic-runner]] → runs → [[validators/check-dead-character]]
- [[validators/deterministic-runner]] → runs → [[validators/check-unknown-character]]
- [[validators/deterministic-runner]] → runs → [[validators/check-unknown-location]]
- [[validators/deterministic-runner]] → runs → [[validators/check-forbidden-move]]
- [[validators/deterministic-runner]] → runs → [[validators/check-locked-fact]]
- [[validators/deterministic-runner]] → runs → [[validators/check-realm-jump]]
- [[validators/deterministic-runner]] → runs → [[validators/check-repetition]]
- [[validators/deterministic-runner]] → runs → [[validators/check-cliffhanger]]
- [[validators/deterministic-runner]] → runs → [[validators/check-conflict-presence]]
- [[validators/deterministic-runner]] → runs → [[validators/check-style-red-flags]]
- [[validators/deterministic-runner]] → runs → [[validators/check-new-bloodline-source]]
- [[validators/deterministic-runner]] → writes report via → [[modules/validation-logger]]
- [[validators/deterministic-runner]] → writes → [[database/tables/validations]]



Edge Inventory Validation Flow Edges LLM validation
- [[agents/llm-validator]] → calls → [[ai-providers/provider-interface]]
- [[agents/llm-validator]] → reads prompt from → [[prompts/prompt-llm-validator-v2]]
- [[agents/llm-validator]] → uses → [[modules/parse-completion-json]]
- [[agents/llm-validator]] → writes report via → [[modules/validation-logger]]
- [[agents/llm-validator]] → writes → [[database/tables/validations]]



Edge Inventory Validation Flow Edges Packet audit
- [[validators/packet-auditor]] → reads → [[database/tables/canon-facts]]
- [[validators/packet-auditor]] → reads → [[database/tables/characters]]
- [[validators/packet-auditor]] → reads → [[database/tables/arcs]]



Edge Inventory Validation Flow Edges Auto-fix
- [[agents/auto-fixer]] → calls → [[ai-providers/provider-interface]]
- [[agents/auto-fixer]] → reads prompt from → [[prompts/prompt-auto-fixer-v2]]
- [[agents/auto-fixer]] → uses → [[modules/parse-completion-json]]
- [[agents/auto-fixer]] → triggered by → [[agents/llm-validator]] _(low/medium severity)_
---



Edge Inventory LLM Provider Edges Provider abstraction
- [[agents/writer]] → calls → [[ai-providers/provider-interface]]
- [[agents/bible-generator]] → calls → [[ai-providers/provider-interface]]
- [[agents/packet-generator]] → calls → [[ai-providers/provider-interface]]
- [[agents/saga-planner]] → calls → [[ai-providers/provider-interface]]
- [[agents/arc-planner]] → calls → [[ai-providers/provider-interface]]
- [[agents/canon-extractor]] → calls → [[ai-providers/provider-interface]]
- [[agents/summary-compactor]] → calls → [[ai-providers/provider-interface]]
- [[agents/arc-summary-compactor]] → calls → [[ai-providers/provider-interface]]
- [[agents/high-stakes-reviewer]] → calls → [[ai-providers/provider-interface]]
- [[agents/llm-validator]] → calls → [[ai-providers/provider-interface]]
- [[agents/auto-fixer]] → calls → [[ai-providers/provider-interface]]



Edge Inventory LLM Provider Edges Logged provider wrapper
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-openrouter]]
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-openai-compatible]]
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-ollama]]
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-vmlx]]
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-mock]] _(tests)_
- [[modules/llm-call-logger]] → writes → [[database/tables/llm-calls]]
- [[modules/llm-call-logger]] → reads traceId from → [[modules/trace]]



Edge Inventory LLM Provider Edges Provider routing
- [[modules/provider-switcher]] → reads → [[database/tables/llm-provider-settings]]
- [[modules/provider-switcher]] → reads → [[database/tables/llm-provider-state]]
- [[routes/admin]] → switches provider via → [[modules/provider-switcher]]
- [[routes/admin]] → writes → [[database/tables/llm-provider-settings]]



Edge Inventory LLM Provider Edges Parse & retry
- [[modules/parse-completion-json]] → called by → all agents
- [[modules/parse-completion-json]] → retries on → finishReason=error responses
---



Edge Inventory Canon Integrity Edges Extraction
- [[agents/canon-extractor]] → reads prompt from → [[prompts/prompt-canon-extractor-v2]]
- [[agents/canon-extractor]] → calls → [[ai-providers/provider-interface]]
- [[agents/canon-extractor]] → writes → [[database/tables/pending-canon-updates]]



Edge Inventory Canon Integrity Edges Merging
- [[modules/canon-merger]] → reads → [[database/tables/pending-canon-updates]]
- [[modules/canon-merger]] → calls → [[modules/conflict-detector]]
- [[modules/conflict-detector]] → reads → [[database/tables/canon-facts]]
- [[modules/canon-merger]] → writes (auto-merge, low conflict) → [[database/tables/canon-facts]]
- [[modules/canon-merger]] → escalates (high conflict) → [[database/tables/pending-canon-updates]] _(human review)_



Edge Inventory Canon Integrity Edges Human review approval
- [[routes/pending-updates]] → approves/rejects → [[database/tables/pending-canon-updates]]
- [[routes/pending-updates]] → on approval: writes → [[database/tables/canon-facts]]
- [[routes/pending-updates]] → on approval: may update → [[database/tables/characters]]
- [[routes/pending-updates]] → on approval: may update → [[database/tables/open-threads]]
- [[routes/pending-updates]] → on approval: may update → [[database/tables/timeline-events]]
- [[routes/pending-updates]] → on approval: may update → [[database/tables/planted-seeds]]



Edge Inventory Canon Integrity Edges Canon read-back
- [[validators/check-locked-fact]] → reads → [[database/tables/canon-facts]]
- [[validators/check-dead-character]] → reads → [[database/tables/characters]]
- [[validators/check-realm-jump]] → reads → [[database/tables/characters]]
- [[modules/embedding-service]] → generates embeddings for → [[database/tables/canon-facts]]
---



Edge Inventory Budget & Cost Edges Budget enforcement
- [[modules/budget-guard]] → reads → [[database/tables/llm-calls]] _(daily/monthly totals)_
- [[modules/budget-guard]] → enforces caps from → [[configs/policy-budget-guardrails]]
- [[modules/budget-guard]] → throws → [[errors/error-budget-exceeded]] _(when cap exceeded)_
- [[jobs/job-generate-chapter]] → checks → [[modules/budget-guard]] _(before LLM call)_



Edge Inventory Budget & Cost Edges Cost accumulation
- [[modules/llm-call-logger]] → writes per-call cost → [[database/tables/llm-calls]]
- [[modules/cost-tracker]] → aggregates → [[database/tables/llm-calls]]
- [[routes/costs]] → reads → [[database/tables/llm-calls]]



Edge Inventory Budget & Cost Edges Admin metrics
- [[modules/admin-metrics]] → aggregates → [[database/tables/llm-calls]]
- [[routes/admin]] → reads via → [[modules/admin-metrics]]
---



Edge Inventory Memory Update Edges Summary compaction
- [[agents/summary-compactor]] → reads → [[database/tables/chapters]]
- [[agents/summary-compactor]] → reads prompt from → [[prompts/prompt-summary-compactor-v2]]
- [[agents/summary-compactor]] → writes → [[database/tables/chapter-summaries]]



Edge Inventory Memory Update Edges Arc summary refresh
- [[jobs/job-refresh-arc-summary]] → calls → [[agents/arc-summary-compactor]]
- [[agents/arc-summary-compactor]] → reads → [[database/tables/chapters]]
- [[agents/arc-summary-compactor]] → reads prompt from → [[prompts/prompt-arc-summary-compactor-v2]]
- [[agents/arc-summary-compactor]] → writes → [[database/tables/arcs]] _(summary field)_



Edge Inventory Memory Update Edges Saga summary refresh
- [[jobs/job-refresh-saga-summary]] → calls → [[agents/saga-planner]]
- [[agents/saga-planner]] → reads → [[database/tables/sagas]]
- [[agents/saga-planner]] → reads prompt from → [[prompts/prompt-saga-planner-v2]]
- [[agents/saga-planner]] → writes → [[database/tables/sagas]] _(summary field)_
---



Edge Inventory Story Initialisation Edges Bible generation
- [[routes/bible]] → triggers → [[agents/bible-generator]]
- [[agents/bible-generator]] → reads prompt from → [[prompts/prompt-bible-generator-v2]]
- [[agents/bible-generator]] → calls → [[ai-providers/provider-interface]]
- [[agents/bible-generator]] → writes → [[database/tables/story-bibles]]
- [[routes/bible]] → locks genre via → [[database/tables/stories]] _(genreLockedAt)_



Edge Inventory Story Initialisation Edges Saga planning
- [[routes/sagas]] → triggers → [[agents/saga-planner]]
- [[agents/saga-planner]] → reads prompt from → [[prompts/prompt-saga-planner-v2]]
- [[agents/saga-planner]] → writes → [[database/tables/sagas]]



Edge Inventory Story Initialisation Edges Arc planning
- [[routes/arcs]] → triggers → [[agents/arc-planner]]
- [[agents/arc-planner]] → reads prompt from → [[prompts/prompt-arc-planner-v2]]
- [[agents/arc-planner]] → writes → [[database/tables/arcs]]
---



Edge Inventory Prompt System Edges Registry
- [[prompts/prompt-registry]] → registers → all prompt templates
- All agents → load prompt from → [[prompts/prompt-registry]]



Edge Inventory Prompt System Edges Contract injection (HOT tier)
- [[prompts/contract-genre]] → injected into HOT tier by → [[modules/context-builder]]
- [[prompts/contract-personality]] → injected into HOT tier by → [[modules/context-builder]]
- [[prompts/contract-story-options]] → injected into HOT tier by → [[modules/context-builder]]
---



Edge Inventory Observability Edges Trace propagation
- [[apps/app-api]] → wraps requests with → [[modules/trace]]
- [[jobs/job-generate-chapter]] → wraps jobs with → [[modules/trace]]
- [[modules/llm-call-logger]] → reads traceId from → [[modules/trace]]
- [[modules/trace]] → writes traceId to → [[database/tables/llm-calls]]



Edge Inventory Observability Edges Structured logging
- All agents → use → [[modules/logger]]
- [[apps/app-api]] → uses → [[modules/logger]]
- [[apps/app-worker]] → uses → [[modules/logger]]
---



Edge Inventory External Service Edges
- [[apps/app-api]] → connects to → [[external-services/service-postgresql]]
- [[apps/app-worker]] → connects to → [[external-services/service-postgresql]]
- [[apps/app-api]] → enqueues via → [[external-services/service-redis]]
- [[apps/app-worker]] → consumes from → [[external-services/service-redis]]
- [[external-services/service-bullmq]] → backed by → [[external-services/service-redis]]
- [[ai-providers/provider-openrouter]] → calls → [[external-services/service-openrouter]]
- [[ai-providers/provider-openai-compatible]] → calls → [[external-services/service-openai-compatible]]
- [[ai-providers/provider-ollama]] → calls → [[external-services/service-ollama]]
- [[ai-providers/provider-vmlx]] → calls → [[external-services/service-vmlx]]
---



Edge Inventory Configuration Inheritance Edges
- [[configs/config-effective]] → merges → [[configs/config-generation]]
- [[configs/config-effective]] → merges → [[configs/config-budget]]
- [[configs/config-effective]] → merges → [[configs/config-models]]
- [[configs/config-effective]] → merges → [[configs/config-context]]
- [[configs/config-effective]] → merges → [[configs/config-long-form]]
- [[configs/config-effective]] → overridden by → [[database/tables/story-settings]] _(per-story)_
- [[jobs/job-generate-chapter]] → reads effective config via → [[configs/config-effective]]
- [[jobs/job-generate-batch]] → reads effective config via → [[configs/config-effective]]
- [[configs/policy-budget-guardrails]] → enforces → [[configs/config-budget]]
- [[configs/policy-mode-escalation]] → reads flags from → [[configs/config-long-form]]
- [[configs/policy-high-stakes-triggers]] → reads flags from → [[configs/config-long-form]]

---
