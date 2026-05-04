# Novel graph — apps

## app-api

`apps/app-api.md`

---
type: app
source: apps/api/src/
---



App: API Server Type
Fastify 5 REST server



App: API Server Source Evidence
`apps/api/src/server.ts` — registers all routes, plugins
`apps/api/src/routes/` — 15 route files



App: API Server Responsibility
Exposes REST endpoints for story management, LLM provider switching, generation triggering, canon review, cost reporting, and export.



App: API Server Key Entry Points
- `server.ts` — app bootstrap, plugin registration
- `lib/llm-provider.ts` — `buildLoggedProvider()` for API handlers
- `lib/provider-switcher.ts` — runtime provider factory
- `lib/llm-settings.ts` — DB read/write for provider/model settings



App: API Server Routes Registered
- [[routes/route-health]]
- [[routes/route-admin]]
- [[routes/route-stories]]
- [[routes/route-bible]]
- [[routes/route-chapters]]
- [[routes/route-sagas]]
- [[routes/route-arcs]]
- [[routes/route-batches]]
- [[routes/route-canon-facts]]
- [[routes/route-pending-updates]]
- [[routes/route-seeds]]
- [[routes/route-reviews]]
- [[routes/route-costs]]
- [[routes/route-timeline]]
- [[routes/route-exports]]
- [[routes/route-story-settings]]



App: API Server Services
- [[modules/budget-guard]] — checks daily/monthly usage before generation
- [[modules/queue-client]] — BullMQ queue wrapper for enqueueing jobs
- [[modules/provider-switcher]] — builds LLM provider from DB state



App: API Server Plugins
- `plugins/error-handler.ts` — global Fastify error plugin
- `plugins/logger.ts` — Pino logger



App: API Server Port
Default: 4000 (env `API_PORT`)



App: API Server Depends On
- [[packages/package-db]] — Drizzle ORM
- [[packages/package-core]] — config, policy
- [[packages/package-ai]] — LLM agents (bible generation, saga/arc planning)
- [[external-services/redis-bullmq]] — job queue
- [[external-services/postgresql]]



App: API Server Used By
- [[apps/app-web]] — frontend dashboard (calls REST API)
- Human operators via curl/browser



App: API Server Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
- [[flows/llm-provider-flow]]
---
type: app
source: apps/api/src/
---



App: API Server Type
Fastify 5 REST server (port 4000)



App: API Server Source Evidence
`apps/api/src/server.ts` — app bootstrap, plugin registration
`apps/api/src/routes/` — 16 route files
`apps/api/src/lib/` — provider/settings helpers
`apps/api/src/services/` — budget guard, queue client



App: API Server Responsibility
Exposes REST endpoints for story management, LLM provider switching, generation triggering, canon review, cost reporting, and export.



App: API Server Routes Registered
- [[routes/route-health]]
- [[routes/route-admin]]
- [[routes/route-stories]]
- [[routes/route-bible]]
- [[routes/route-chapters]]
- [[routes/route-sagas]]
- [[routes/route-arcs]]
- [[routes/route-batches]]
- [[routes/route-canon-facts]]
- [[routes/route-pending-updates]]
- [[routes/route-seeds]]
- [[routes/route-reviews]]
- [[routes/route-costs]]
- [[routes/route-timeline]]
- [[routes/route-exports]]
- [[routes/route-story-settings]]



App: API Server Key Lib Modules
- `lib/llm-provider.ts` — `buildLoggedProvider()`
- `lib/provider-switcher.ts` — [[modules/provider-switcher]]
- `lib/llm-settings.ts` — DB read/write for settings



App: API Server Services
- [[modules/budget-guard]]
- [[modules/queue-client]]



App: API Server Plugins
- `plugins/error-handler.ts` — global Fastify error plugin
- `plugins/logger.ts` — Pino logger



App: API Server Port
Default 4000 (env `API_PORT`)



App: API Server Depends On
- [[packages/package-db]]
- [[packages/package-core]]
- [[packages/package-ai]]
- [[external-services/redis-bullmq]]
- [[external-services/postgresql]]



App: API Server Used By
- [[apps/app-web]] — frontend calls REST API



App: API Server Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
- [[flows/llm-provider-flow]]

---

## app-web

`apps/app-web.md`

---
type: app
source: apps/web/
---



App: Web Dashboard Type
Next.js 15 (App Router) frontend



App: Web Dashboard Source Evidence
`apps/web/app/` — pages
`apps/web/lib/api-client.ts` — REST API client
`apps/web/app/globals.css` — vanilla CSS (no utility frameworks)



App: Web Dashboard Responsibility
Single-user dashboard for reading generated chapters, reviewing canon, managing seeds, monitoring costs, configuring providers, and triggering generation.



App: Web Dashboard Key Pages
- `/` — stories list
- `/stories/:id` — story dashboard
- `/read/:storyId/:chapterNumber` — chapter reader
- `/admin/` — LLM provider + model management
- `/preview/` — chapter preview



App: Web Dashboard Key Modules
- `lib/api-client.ts` — typed REST client for [[apps/app-api]]
- `lib/api/` — per-resource API functions
- `lib/hooks/` — React hooks



App: Web Dashboard Styling
Vanilla CSS only. No CSS-in-JS, no Tailwind.



App: Web Dashboard Depends On
- [[apps/app-api]] — all data via REST
- [[external-services/postgresql]] — (indirect, via API)



App: Web Dashboard Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/llm-provider-flow]]
---
type: app
source: apps/web/
---



App: Web Dashboard Type
Next.js 15 (App Router) frontend



App: Web Dashboard Source Evidence
`apps/web/app/` — pages (stories, read, admin, preview)
`apps/web/lib/api-client.ts` — typed REST API client
`apps/web/app/globals.css` — vanilla CSS only



App: Web Dashboard Responsibility
Single-user dashboard for reading generated chapters, reviewing canon, managing seeds, monitoring costs, configuring LLM providers, and triggering generation.



App: Web Dashboard Key Pages
- `/` — stories list
- `/stories/:id` — story dashboard
- `/read/:storyId/:chapterNumber` — chapter reader
- `/admin/` — LLM provider and model management
- `/preview/` — chapter preview



App: Web Dashboard Depends On
- [[apps/app-api]] — all data via REST



App: Web Dashboard Styling
Vanilla CSS only (`globals.css`, component `.css` files). No CSS-in-JS, no Tailwind.



App: Web Dashboard Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/llm-provider-flow]]

---

## app-worker

`apps/app-worker.md`

---
type: app
source: apps/worker/src/
---



App: Worker Type
BullMQ background processor



App: Worker Source Evidence
`apps/worker/src/index.ts` — spawns 6 BullMQ workers + stale job detector
`apps/worker/src/queues.ts` — queue definitions
`apps/worker/src/jobs/` — 7 job handler files



App: Worker Responsibility
Processes all long-running background jobs: chapter generation pipeline, batch coordination, export, high-stakes reviews, arc/saga summary refresh.



App: Worker Workers Spawned
| Queue | Concurrency |
|-------|-------------|
| generate-chapter | 1 |
| generate-batch | 1 |
| high-stakes-review | 1 |
| refresh-arc-summary | 1 |
| refresh-saga-summary | 1 |
| generate-export | 2 |



App: Worker Stale Job Detector
Runs every 5 minutes. Resets chapters stuck in `generating` status.



App: Worker Lock Configuration
`lockDuration: 600_000` (10 min), `maxStalledCount: 5`



App: Worker Jobs
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]
- [[jobs/job-generate-export]]
- [[jobs/job-high-stakes-review]]
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]



App: Worker Depends On
- [[packages/package-db]] — Drizzle ORM
- [[packages/package-core]] — getEffectiveConfig, policy
- [[packages/package-ai]] — all LLM agents
- [[external-services/redis-bullmq]] — job queue
- [[external-services/postgresql]]



App: Worker Environment Variables
- `REDIS_URL` — BullMQ connection
- `DATABASE_URL` — PostgreSQL
- `LOG_LLM_PROMPTS` — verbose prompt logging
- `NOVEL_LLM_PROVIDER` — fallback provider if DB missing
- `EXPORT_OUTPUT_DIR` — async export output (default `./exports`)



App: Worker Related Flows
- [[flows/job-worker-flow]]
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
---
type: app
source: apps/worker/src/
---



App: Worker Type
BullMQ background processor



App: Worker Source Evidence
`apps/worker/src/index.ts` — spawns 6 BullMQ workers + stale job detector
`apps/worker/src/queues.ts` — queue definitions
`apps/worker/src/jobs/` — 7 job handler files



App: Worker Responsibility
Processes all long-running background jobs: chapter generation pipeline, batch coordination, export, high-stakes reviews, arc/saga summary refresh.



App: Worker Workers Spawned
| Queue | Concurrency |
|-------|-------------|
| generate-chapter | 1 |
| generate-batch | 1 |
| high-stakes-review | 1 |
| refresh-arc-summary | 1 |
| refresh-saga-summary | 1 |
| generate-export | 2 |



App: Worker Stale Job Detector
Runs every 5 minutes. Resets chapters stuck in `generating` status to `failed`.



App: Worker Lock Configuration
`lockDuration: 600_000` (10 min), `maxStalledCount: 5`



App: Worker Jobs
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]
- [[jobs/job-generate-export]]
- [[jobs/job-high-stakes-review]]
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]



App: Worker Depends On
- [[packages/package-db]]
- [[packages/package-core]]
- [[packages/package-ai]]
- [[external-services/redis-bullmq]]
- [[external-services/postgresql]]



App: Worker Environment Variables
- `REDIS_URL` — BullMQ connection
- `DATABASE_URL` — PostgreSQL
- `LOG_LLM_PROMPTS` — verbose prompt logging
- `NOVEL_LLM_PROVIDER` — fallback provider if DB state missing
- `EXPORT_OUTPUT_DIR` — async export output dir (default `./exports`)



App: Worker Related Flows
- [[flows/job-worker-flow]]
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]

---
