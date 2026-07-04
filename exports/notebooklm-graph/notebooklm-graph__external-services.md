# Novel graph — external-services

## service-bullmq

`external-services/service-bullmq.md`

---
type: external-service
---



Service: BullMQ Role
Job queue framework built on top of [[external-services/service-redis]]. Provides reliable background job processing with durable persistence, retries, concurrency control, progress tracking, and graceful shutdown. All long-running work in the system is processed through BullMQ.



Service: BullMQ Key Features Used
| Feature | How Used |
|---------|---------|
| **Job persistence** | Jobs survive worker/API restarts (stored atomically in Redis) |
| **Concurrency control** | Each queue has explicit `concurrency` (most queues = 1 to prevent race conditions) |
| **Stall detection** | `lockDuration: 600_000` ms, `maxStalledCount: 5` — stalled jobs are automatically requeued |
| **Job progress** | Workers call `job.updateProgress()` for SSE-compatible status polling from frontend |
| **Delayed jobs** | Used for scheduling follow-up jobs (arc/saga summaries) |
| **Graceful shutdown** | `worker.close()` called on `SIGTERM`/`SIGINT` — in-flight jobs complete before exit |



Service: BullMQ Queues
| Queue Name | Concurrency | Job Handler |
|-----------|------------|------------|
| `generate-chapter` | 1 | [[jobs/job-generate-chapter]] |
| `generate-batch` | 1 | [[jobs/job-generate-batch]] |
| `generate-export` | 2 | [[jobs/job-generate-export]] |
| `high-stakes-review` | 1 | [[jobs/job-high-stakes-review]] |
| `refresh-arc-summary` | 1 | [[jobs/job-refresh-arc-summary]] |
| `refresh-saga-summary` | 1 | [[jobs/job-refresh-saga-summary]] |



Service: BullMQ Backing Store
[[external-services/service-redis]] — all queue state persisted to Redis



Service: BullMQ Worker Bootstrap
[[workers/worker-main]] — spawns all 6 BullMQ `Worker` instances at startup + stale job detector (polls every 5 min)



Service: BullMQ Producer Side
[[modules/queue-client]] — wraps BullMQ `Queue` instances; used by API handlers to enqueue jobs



Service: BullMQ Queue Type Declarations
[[workers/queues]] — exports typed `Queue` instances for each queue name



Service: BullMQ Related
- [[flows/job-worker-flow]]
- [[apps/app-worker]]
- [[apps/app-api]]

---

## service-ollama

`external-services/service-ollama.md`

---
type: external-service
---



Service: Ollama Role
Local LLM inference server enabling fully offline chapter generation without cloud API costs. Exposes an OpenAI-compatible `/v1/chat/completions` endpoint on `localhost`. Ideal for development and cost-free experimentation.



Service: Ollama Default URL
`http://localhost:11434/v1` — overridable via provider config `baseUrl`



Service: Ollama Authentication
None required for local instances. An optional `apiKey` field exists in `OllamaConfig` and is sent as `Authorization: Bearer ` only when provided — typically omitted for local use.



Service: Ollama Models
| Model | Size | Use Case |
|-------|------|---------|
| `gemma4:e2b` | Smaller / faster | Development, cost-free testing |
| `gemma4:e4b` | Larger / more capable | Higher quality local generation |
Models must be pulled locally: `ollama pull gemma4:e2b`



Service: Ollama Cost
Zero monetary cost. [[modules/llm-call-logger]] still fires for every call but records `$0` cost — consistent logging across all providers.



Service: Ollama Retry Logic
None. Single attempt only. On non-2xx: `Error("Ollama error : ")`.



Service: Ollama JSON Structured Output
Via `response_format.json_schema` with `strict: true`. Supported from Ollama v0.5+.



Service: Ollama Provider Implementation
[[ai-providers/provider-ollama]] — `packages/ai/src/providers/ollama.ts`
Constructor accepts empty config: `new OllamaProvider()` — all fields optional.



Service: Ollama Used By
All AI agents when `providerName = 'ollama'` — see [[flows/llm-provider-flow]].
Switched at runtime via `PUT /api/admin/provider` (→ [[routes/admin]]).



Service: Ollama Related
- [[flows/llm-provider-flow]]
- [[external-services/service-vmlx]] — alternative local inference (Apple Silicon)
- [[database/tables/llm-provider-settings]]

---

## service-openai-compatible

`external-services/service-openai-compatible.md`

---
type: external-service
---



Service: OpenAI compatible Role
Alternative LLM API gateway exposing an OpenAI-compatible chat completions endpoint. Configured as the **default provider** for the system (see [[modules/provider-switcher]]).



Service: OpenAI compatible Base URL
`https://api.openai.com/v1`



Service: OpenAI compatible Authentication
`OPENAI_COMPATIBLE_API_KEY` — sent as `Authorization: Bearer ` header. Required; [[ai-providers/provider-openai-compatible]] throws at construction if absent.



Service: OpenAI compatible Request Format
Standard OpenAI-compatible `POST /chat/completions`.
Token usage read from `prompt_tokens`, `completion_tokens`, `prompt_tokens_details.cached_tokens`.
JSON structured output via `response_format.json_schema` with `strict: true`.



Service: OpenAI compatible Retry Logic
None. Single attempt only. On non-2xx response: `Error("OpenAI-compatible error : ")` thrown immediately.



Service: OpenAI compatible Cost Tracking
Per-token cost estimated via `estimateCostUsd()` and written to [[database/tables/llm-calls]] by [[modules/llm-call-logger]].



Service: OpenAI compatible Provider Implementation
[[ai-providers/provider-openai-compatible]] — `packages/ai/src/providers/openai-compatible.ts`



Service: OpenAI compatible Used By
All AI agents when `providerName = 'openai-compatible'` — see [[flows/llm-provider-flow]].
Switched at runtime via `PUT /api/admin/provider` (→ [[routes/admin]]).



Service: OpenAI compatible Related
- [[flows/llm-provider-flow]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-calls]]

---

## service-openrouter

`external-services/service-openrouter.md`

---
type: external-service
---



Service: OpenRouter Role
LLM API aggregator providing access to 100+ models from multiple providers (OpenAI, Anthropic, Google, Mistral, Meta, etc.) through a single OpenAI-compatible endpoint. Primary cloud LLM gateway in this system; the most featureful provider with full retry logic.



Service: OpenRouter Base URL
`https://openrouter.ai/api/v1`



Service: OpenRouter Authentication
`OPENROUTER_API_KEY` — sent as `Authorization: Bearer ` header. Required; [[ai-providers/provider-openrouter]] throws at construction if absent.



Service: OpenRouter Request Format
Standard OpenAI-compatible `POST /chat/completions`.
JSON structured output via `response_format: { type: 'json_schema', json_schema: { name: 'response', schema, strict: true } }`.
Optional attribution headers: `HTTP-Referer`, `X-Title` (for OpenRouter dashboard attribution).



Service: OpenRouter Retry Logic
| Aspect | Detail |
|--------|--------|
| Max attempts | 6 |
| Retryable statuses | `429` (rate limit), `502`, `503` (transient server errors) |
| Backoff — rate limit with server hint | `min(hint_ms, 120_000 ms)` (reads `retry_after_seconds` from body) |
| Backoff — rate limit no hint | `min(1000 × 2^attempt, 60_000 ms)` |
| Backoff — server error | `min(500 × 2^attempt, 30_000 ms)` |
| Non-retryable 4xx | Throws immediately (single attempt) |



Service: OpenRouter Cost Tracking
Per-token pricing tracked in `MODEL_CONFIG.pricing`. Every call: `estimateCostUsd(model, usage)` written to [[database/tables/llm-calls]] by [[modules/llm-call-logger]].



Service: OpenRouter Provider Implementation
[[ai-providers/provider-openrouter]] — `packages/ai/src/providers/openrouter.ts`



Service: OpenRouter Used By
All AI agents when `providerName = 'openrouter'` — see [[flows/llm-provider-flow]].
Switched at runtime via `PUT /api/admin/provider` (→ [[routes/admin]]).



Service: OpenRouter Related
- [[flows/llm-provider-flow]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-calls]]

---

## service-postgresql

`external-services/service-postgresql.md`

---
type: external-service
---



Service: PostgreSQL Role
Primary relational data store for all persistent application data. Every entity in the system — stories, chapters, characters, canon facts, LLM call logs — lives exclusively in PostgreSQL. There is no cache layer; all reads go directly to the DB.



Service: PostgreSQL Connection
- Environment variable: `DATABASE_URL` (connection string, e.g. `postgres://user:pass@host:5432/dbname`)
- Accessed exclusively through Drizzle ORM via [[packages/package-db]]
- Connection pool managed by Drizzle / `node-postgres` driver



Service: PostgreSQL Schema — 23 Tables Story Domain
[[database/tables/stories]], [[database/tables/story-bibles]], [[database/tables/story-settings]], [[database/tables/sagas]], [[database/tables/arcs]], [[database/tables/batches]]



Service: PostgreSQL Schema — 23 Tables Chapter Domain
[[database/tables/chapters]], [[database/tables/chapter-packets]], [[database/tables/chapter-summaries]], [[database/tables/context-packets]]



Service: PostgreSQL Schema — 23 Tables Canon Domain
[[database/tables/characters]], [[database/tables/bloodlines]], [[database/tables/factions]], [[database/tables/canon-facts]], [[database/tables/pending-canon-updates]], [[database/tables/planted-seeds]], [[database/tables/open-threads]], [[database/tables/timeline-events]]



Service: PostgreSQL Schema — 23 Tables Validation Domain
[[database/tables/validations]], [[database/tables/high-stakes-reviews]]



Service: PostgreSQL Schema — 23 Tables Observability Domain
[[database/tables/llm-calls]], [[database/tables/llm-provider-settings]], [[database/tables/llm-provider-state]]



Service: PostgreSQL Special Column Types
- `chapter_summaries.embedding` — `vector(1536)` for past-chapter retrieval (pgvector)
- `canon_facts.embedding` — `vector(1536)` for fact retrieval (pgvector)



Service: PostgreSQL Management Commands
| Command | Effect |
|---------|--------|
| `pnpm db:generate` | Generate Drizzle migration after schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |



Service: PostgreSQL Managed By
[[packages/package-db]] — all schema definitions in `packages/db/src/schema/`, client in `packages/db/src/client.ts`



Service: PostgreSQL Used By
- [[apps/app-api]] — all REST handler DB reads/writes
- [[apps/app-worker]] — all job pipeline DB reads/writes
- [[packages/package-ai]] — vector retrieval, context retrieval for [[modules/context-builder]]



Service: PostgreSQL Related
- [[database/database-erd]]
- [[flows/chapter-generation-flow]]
- [[external-services/service-redis]] — the other external service (queue backing store)

---

## service-redis

`external-services/service-redis.md`

---
type: external-service
---



Service: Redis Role
Backing store for the BullMQ job queue system. Provides durable job persistence, retry tracking, progress events, and job state management across worker and API restarts. Redis holds **no application data** — all business data lives in [[external-services/service-postgresql]].



Service: Redis Connection
| Env Var | Format | Notes |
|---------|--------|-------|
| `REDIS_URL` | Full connection string | Preferred — used when set |
| `REDIS_HOST` | Hostname | Fallback — combined with `REDIS_PORT` |
| `REDIS_PORT` | Port number | Default: `6379` |



Service: Redis Usage Pattern
- **Producer (API side)**: [[modules/queue-client]] calls `queue.add()` on BullMQ `Queue` instances backed by this Redis
- **Consumer (Worker side)**: [[workers/worker-main]] spawns BullMQ `Worker` instances that poll Redis for available jobs



Service: Redis Data Stored in Redis
BullMQ manages all Redis structures internally:
| BullMQ Key Pattern | Contents |
|-------------------|----------|
| `bull:generate-chapter:*` | Chapter generation jobs |
| `bull:generate-batch:*` | Batch coordination jobs |
| `bull:generate-export:*` | Export jobs |
| `bull:refresh-arc-summary:*` | Arc summary refresh jobs |
| `bull:high-stakes-review:*` | High-stakes review jobs |
| `bull:refresh-saga-summary:*` | Saga summary refresh jobs |
Each job progresses through states: `waiting` → `active` → `completed` / `failed` / `delayed`



Service: Redis Not Used For
- Application data (all in [[external-services/service-postgresql]])
- Model response caching
- Session/auth storage
- Rate limiting



Service: Redis Related
- [[external-services/service-bullmq]] — the framework built on top of this Redis
- [[workers/queues]] — queue definitions
- [[workers/worker-main]] — consumer
- [[modules/queue-client]] — producer
- [[flows/job-worker-flow]]

---

## service-vmlx

`external-services/service-vmlx.md`

---
type: external-service
---



Service: vMLX Role
Apple Silicon MLX inference server for local model execution on M-series Macs. Exposes an OpenAI-compatible endpoint. The lightest provider in the system — no authentication whatsoever, zero config required.



Service: vMLX Default URL
`http://localhost:8000/v1` — overridable via provider config `baseUrl`



Service: vMLX Authentication
None. No API key field exists in `VmlxConfig`. The only request header sent is `Content-Type: application/json`.



Service: vMLX Models
| Model | Notes |
|-------|-------|
| `mlx-community/Qwen3-4B-4bit` | Default 4-bit quantised MLX model for Apple Silicon |
Any quantised model from the `mlx-community` HuggingFace org can be used by updating `MODEL_CONFIG.routes`.



Service: vMLX Cost
Zero monetary cost. [[modules/llm-call-logger]] still fires for every call but records `$0` cost.



Service: vMLX Retry Logic
None. Single attempt only. On non-2xx: `Error("vMLX error : ")`.



Service: vMLX JSON Structured Output
Via `response_format.json_schema` with `strict: true`.



Service: vMLX Provider Implementation
[[ai-providers/provider-vmlx]] — `packages/ai/src/providers/vmlx.ts`
Constructor accepts empty config: `new VmlxProvider()` — both fields optional.



Service: vMLX Used By
All AI agents when `providerName = 'vmlx'` — see [[flows/llm-provider-flow]].
Switched at runtime via `PUT /api/admin/provider` (→ [[routes/admin]]).



Service: vMLX Related
- [[flows/llm-provider-flow]]
- [[external-services/service-ollama]] — alternative local inference (cross-platform)
- [[database/tables/llm-provider-settings]]

---
