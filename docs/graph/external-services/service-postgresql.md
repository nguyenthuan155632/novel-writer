---
type: external-service
---

# Service: PostgreSQL

## Role

Primary relational data store for all persistent application data. Every entity in the system — stories, chapters, characters, canon facts, LLM call logs — lives exclusively in PostgreSQL. There is no cache layer; all reads go directly to the DB.

## Connection

- Environment variable: `DATABASE_URL` (connection string, e.g. `postgres://user:pass@host:5432/dbname`)
- Accessed exclusively through Drizzle ORM via [[packages/package-db]]
- Connection pool managed by Drizzle / `node-postgres` driver

## Schema — 23 Tables

### Story Domain
[[database/tables/stories]], [[database/tables/story-bibles]], [[database/tables/story-settings]], [[database/tables/sagas]], [[database/tables/arcs]], [[database/tables/batches]]

### Chapter Domain
[[database/tables/chapters]], [[database/tables/chapter-packets]], [[database/tables/chapter-summaries]], [[database/tables/context-packets]]

### Canon Domain
[[database/tables/characters]], [[database/tables/bloodlines]], [[database/tables/factions]], [[database/tables/canon-facts]], [[database/tables/pending-canon-updates]], [[database/tables/planted-seeds]], [[database/tables/open-threads]], [[database/tables/timeline-events]]

### Validation Domain
[[database/tables/validations]], [[database/tables/high-stakes-reviews]]

### Observability Domain
[[database/tables/llm-calls]], [[database/tables/llm-provider-settings]], [[database/tables/llm-provider-state]]

## Special Column Types

- `chapter_summaries.embedding` — `vector(1536)` for past-chapter retrieval (pgvector)
- `canon_facts.embedding` — `vector(1536)` for fact retrieval (pgvector)

## Management Commands

| Command | Effect |
|---------|--------|
| `pnpm db:generate` | Generate Drizzle migration after schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |

## Managed By

[[packages/package-db]] — all schema definitions in `packages/db/src/schema/`, client in `packages/db/src/client.ts`

## Used By

- [[apps/app-api]] — all REST handler DB reads/writes
- [[apps/app-worker]] — all job pipeline DB reads/writes
- [[packages/package-ai]] — vector retrieval, context retrieval for [[modules/context-builder]]

## Related

- [[database/database-erd]]
- [[flows/chapter-generation-flow]]
- [[external-services/service-redis]] — the other external service (queue backing store)
