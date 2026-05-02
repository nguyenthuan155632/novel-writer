---
type: database-table
source: packages/db/src/schema/canon-facts.ts
---

# Table: `canon_facts`

## Purpose
Stores atomic, locked or unlocked facts about the story world — statements of truth that generation must never contradict. Supports vector similarity search for relevant fact retrieval in the COLD context tier.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `topic` | text | Thematic category / tag for the fact |
| `fact` | text | The canonical statement |
| `sourceChapter` | int | Chapter that established this fact |
| `importance` | text | `low` / `medium` / `high` |
| `locked` | boolean | If true, cannot be overwritten by auto-merge |
| `tags` | jsonb | Searchable tag array |
| `embedding` | vector(1536) | Semantic embedding for vector retrieval |
| `createdAt` | timestamptz | Row creation time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[modules/context-builder]] (COLD tier — vector retrieval)
- [[validators/check-locked-fact]]
- [[modules/conflict-detector]]

## Written By
- [[modules/canon-merger]]
- [[agents/canon-extractor]]

## Updated By
- [[modules/canon-merger]]

## Related Domain Concepts
- [[domain-canon-fact]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/canon-reconciliation-flow]]
---
type: database-table
source: packages/db/src/schema/canon-facts.ts
---

# Table: `canon_facts`

## Purpose
Canonical facts about the world — with semantic embeddings and optional locking.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| topic | text | Topic / category of the fact |
| fact | text | The canonical fact text |
| sourceChapter | int | Chapter where the fact was established |
| importance | text | Importance level of the fact |
| locked | boolean | If true, cannot be auto-merged away |
| tags | jsonb | Searchable tags |
| embedding | vector(1536) | Semantic embedding for retrieval |
| createdAt | timestamp | Creation timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[modules/context-builder]] (COLD tier vector retrieval)
- [[validators/check-locked-fact]]
- [[modules/conflict-detector]]
- [[validators/check-unknown-location]]

## Written By
- [[modules/canon-merger]]
- [[agents/canon-extractor]]

## Related Domain Concepts
- [[domain/canon-fact]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/canon-reconciliation-flow]]
