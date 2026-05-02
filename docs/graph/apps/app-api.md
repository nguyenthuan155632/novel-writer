---
type: app
source: apps/api/src/
---

# App: API Server

## Type
Fastify 5 REST server

## Source Evidence
`apps/api/src/server.ts` — registers all routes, plugins
`apps/api/src/routes/` — 15 route files

## Responsibility
Exposes REST endpoints for story management, LLM provider switching, generation triggering, canon review, cost reporting, and export.

## Key Entry Points
- `server.ts` — app bootstrap, plugin registration
- `lib/llm-provider.ts` — `buildLoggedProvider()` for API handlers
- `lib/provider-switcher.ts` — runtime provider factory
- `lib/llm-settings.ts` — DB read/write for provider/model settings

## Routes Registered
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

## Services
- [[modules/budget-guard]] — checks daily/monthly usage before generation
- [[modules/queue-client]] — BullMQ queue wrapper for enqueueing jobs
- [[modules/provider-switcher]] — builds LLM provider from DB state

## Plugins
- `plugins/error-handler.ts` — global Fastify error plugin
- `plugins/logger.ts` — Pino logger

## Port
Default: 4000 (env `API_PORT`)

## Depends On
- [[packages/package-db]] — Drizzle ORM
- [[packages/package-core]] — config, policy
- [[packages/package-ai]] — LLM agents (bible generation, saga/arc planning)
- [[external-services/redis-bullmq]] — job queue
- [[external-services/postgresql]]

## Used By
- [[apps/app-web]] — frontend dashboard (calls REST API)
- Human operators via curl/browser

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
- [[flows/llm-provider-flow]]
---
type: app
source: apps/api/src/
---

# App: API Server

## Type
Fastify 5 REST server (port 4000)

## Source Evidence
`apps/api/src/server.ts` — app bootstrap, plugin registration
`apps/api/src/routes/` — 16 route files
`apps/api/src/lib/` — provider/settings helpers
`apps/api/src/services/` — budget guard, queue client

## Responsibility
Exposes REST endpoints for story management, LLM provider switching, generation triggering, canon review, cost reporting, and export.

## Routes Registered
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

## Key Lib Modules
- `lib/llm-provider.ts` — `buildLoggedProvider()`
- `lib/provider-switcher.ts` — [[modules/provider-switcher]]
- `lib/llm-settings.ts` — DB read/write for settings

## Services
- [[modules/budget-guard]]
- [[modules/queue-client]]

## Plugins
- `plugins/error-handler.ts` — global Fastify error plugin
- `plugins/logger.ts` — Pino logger

## Port
Default 4000 (env `API_PORT`)

## Depends On
- [[packages/package-db]]
- [[packages/package-core]]
- [[packages/package-ai]]
- [[external-services/redis-bullmq]]
- [[external-services/postgresql]]

## Used By
- [[apps/app-web]] — frontend calls REST API

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
- [[flows/llm-provider-flow]]
