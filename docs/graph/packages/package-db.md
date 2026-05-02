---
type: package
source: packages/db/src/
---

# Package: @novel/db

## Responsibility
Drizzle ORM schema definitions, PostgreSQL client, migration runner, cost tracking service.

## Source Evidence
`packages/db/src/schema/` — 22 table definition files
`packages/db/src/client.ts` — `getSqlClient()`, `getDb()`, `Db` type
`packages/db/src/migrate.ts` — migration runner
`packages/db/src/services/cost-tracker.ts` — `accumulateStoryCost()`

## Exports
- All schema table references
- `getDb()`, `getSqlClient()`
- `accumulateStoryCost()`
- Type: `Db`

## Database Tables (all owned here)
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

## Depends On
- [[external-services/postgresql]] — Drizzle over postgres
- `drizzle-orm`, `drizzle-kit`

## Used By
- [[packages/package-ai]] — all agents read/write DB
- [[packages/package-core]] — AdminMetricsService
- [[apps/app-api]]
- [[apps/app-worker]]
---
type: package
source: packages/db/src/
---

# Package: @novel/db

## Responsibility
Drizzle ORM schema, PostgreSQL client, migration runner, cost tracking service.

## Source Evidence
`packages/db/src/client.ts` — `getSqlClient()`, `getDb()`, `Db` type
`packages/db/src/schema/` — 23 table definition files
`packages/db/src/migrate.ts` — migration runner
`packages/db/src/services/cost-tracker.ts` — `accumulateStoryCost()`

## Database Tables Owned
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

## Key Exports
- All schema table references
- `getDb()`, `getSqlClient()`
- `accumulateStoryCost()`
- Type: `Db`

## Depends On
- [[external-services/postgresql]]
- `drizzle-orm`, `drizzle-kit`

## Used By
- [[packages/package-ai]]
- [[packages/package-core]]
- [[apps/app-api]]
- [[apps/app-worker]]
