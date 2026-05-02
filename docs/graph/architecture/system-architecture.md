---
type: reference
---

# Architecture: System Overview

Full system architecture of the Novel Writer monorepo — a single-user local application for generating long-form Vietnamese xianxia/fantasy novels (500–1000 chapters). Target cost ≤ $0.05/chapter using a "system remembers, model writes" design.

## Diagram

```mermaid
graph TB
    subgraph "apps/web — Next.js 15 App Router"
        WEB["Dashboard UI
Reading · Canon Review · Seeds
Cost Monitor · Provider Settings"]
    end

    subgraph "apps/api — Fastify 5 · port 4000"
        API[REST API Server]
        ROUTES["16 Route Groups
stories · chapters · arcs · sagas
batches · canon · seeds · exports
pending-updates · reviews · admin"]
        BGRD["Budget Guard
checkAgainstCaps()"]
        QCLI["Queue Client
BullMQ Queue wrappers"]
        API --- ROUTES
        API --- BGRD
        API --- QCLI
    end

    subgraph "apps/worker — BullMQ Processor"
        WRKR[Worker Process]
        JOBS["6 Job Types
generate-chapter · generate-batch
generate-export · high-stakes-review
refresh-arc-summary · refresh-saga-summary"]
        WRKR --- JOBS
    end

    subgraph "packages/ai"
        AGENTS["11 AI Agents
writer · llm-validator · auto-fixer
canon-extractor · summary-compactor
packet-generator · arc-planner · saga-planner
high-stakes-reviewer · bible-generator
arc-summary-compactor"]
        VALIDATORS["14 Validators
deterministic-runner + 12 checks
packet-auditor"]
        CTXBLD["Context Builder
HOT tier — bible + contracts
WARM tier — summaries + chars + threads
COLD tier — recent + vectors + packet
shrinkToFit() on budget overflow"]
        LOGGED["LoggedLLMProvider
wraps every provider call
writes llm_calls + story_costs"]
        PROVIDERS["5 LLM Providers
openrouter · opencode · ollama
vmlx · mock (test)"]
        AGENTS --> CTXBLD
        AGENTS --> LOGGED
        LOGGED --> PROVIDERS
    end

    subgraph "packages/core"
        EFFCFG["getEffectiveConfig()
per-story model + budget overrides"]
        BUDGRD["budget-guardrails
checkAgainstCaps()"]
        MODELRT["modelFor(role)
AgentRole → model string"]
        GENCFG["GENERATION_CONFIG
safe · semi_auto · full_auto
batch sizes + escalation logic"]
    end

    subgraph "packages/db"
        DRIZZLE["Drizzle ORM
23 tables · migrations
getDb() · accumulateStoryCost()"]
    end

    subgraph "External Services"
        PG[("PostgreSQL
All persistent data
pgvector embeddings")]
        REDIS[("Redis
BullMQ job queue
backing store")]
        OR["OpenRouter API
100+ cloud models
retry + rate limit handling"]
        OC["OpenCode API
Default cloud provider"]
        OL["Ollama
Local inference
gemma4:e2b / e4b"]
        VX["vMLX
Apple Silicon local
Qwen3-4B-4bit"]
    end

    WEB -->|"REST calls"| API
    QCLI -->|"BullMQ Queue.add()"| REDIS
    API --> DRIZZLE
    WRKR -->|"consume jobs"| REDIS
    WRKR --> AGENTS
    WRKR --> VALIDATORS
    WRKR --> DRIZZLE
    PROVIDERS --> OR & OC & OL & VX
    DRIZZLE --> PG
    BGRD --> DRIZZLE
```

## Package / App Roles

| Package / App | Type | Responsibility |
|--------------|------|----------------|
| [[apps/app-api]] | Fastify 5 server (port 4000) | REST API; validates requests; checks budget; snapshots LLM provider; enqueues jobs |
| [[apps/app-web]] | Next.js 15 App Router | Dashboard: read chapters, review canon, manage seeds, monitor costs, configure providers |
| [[apps/app-worker]] | BullMQ processor | Background job runner — full chapter generation pipeline + all async follow-ups |
| [[packages/package-ai]] | Library | All LLM agents, provider abstraction, validators, context builder, prompts |
| [[packages/package-core]] | Library | Config, budget policy, model routing, generation mode logic, per-story effective config |
| [[packages/package-db]] | Library | Drizzle ORM schema, PostgreSQL client, migrations, cost tracker |

## Key Architectural Principles

### "System remembers, model writes"
The LLM never sees conversation history. [[modules/context-builder]] assembles everything the model needs from the DB each time, in a carefully budgeted 3-tier context (HOT/WARM/COLD). The model's only job is to write prose from what the system explicitly gives it.

### Provider abstraction with DB-driven routing
All LLM calls go through [[ai-providers/provider-interface]]. The active provider is snapshotted at job-enqueue time (not at write time). `modelFor(role)` resolves model names — **no hardcoded model strings** outside `MODEL_CONFIG`. See [[flows/llm-provider-flow]].

### Canon integrity via staging
New facts extracted from chapters are **never written directly to canon**. [[agents/canon-extractor]] → [[modules/canon-merger]] → conflict check → either auto-apply (clean, `auto` mode) or stage to `pending_canon_updates` for human approval. See [[errors/error-canon-conflict]].

### Two-stage validation
Stage 1: 12 deterministic checks (no LLM, fast, blocks on critical). Stage 2: LLM soft validation. Auto-fixer handles low/medium issues; high/critical escalate. See [[flows/validation-flow]].

### Budget guardrails at two enforcement points
1. Pre-enqueue (API): [[modules/budget-guard]] rejects request before job is queued
2. Mid-pipeline (Worker): `checkAgainstCaps()` fails the job if cap breached during generation
See [[errors/error-budget-exceeded]].

### Generation modes with auto-escalation
| Mode | Batch Size | Human Approval |
|------|-----------|----------------|
| `safe` | 1 | Required |
| `semi_auto` | 5 | On escalation |
| `full_auto` | 30 | On escalation |

Auto-escalates to `safe` on: first/last chapter of arc, high/critical finding, blocking canon conflict. See [[jobs/job-generate-batch]].

## Data Flow Summary

1. User triggers generation via [[apps/app-web]] → `POST /api/stories/:id/chapters/:num/generate`
2. [[apps/app-api]]: validates request → checks budget → reads active LLM provider from DB → snapshots into job payload → enqueues to Redis
3. [[apps/app-worker]]: picks up `generate-chapter` job → runs 13-stage pipeline (plan → write → validate → memory → summarize)
4. Each stage reads context from PostgreSQL; [[modules/context-builder]] assembles HOT/WARM/COLD tiers
5. LLM calls go through `LoggedLLMProvider` → every call written to `llm_calls`
6. Canon updates staged or applied; summary + embedding stored
7. Chapter status → `completed`; follow-up jobs enqueued (arc summary, high-stakes review)
8. [[apps/app-web]] polls chapter status → displays completed chapter to user

## Related

- [[database/database-erd]] — full table diagram
- [[flows/chapter-generation-flow]] — detailed pipeline
- [[flows/validation-flow]] — validation stages
- [[flows/llm-provider-flow]] — provider routing
- [[flows/job-worker-flow]] — queue lifecycle
