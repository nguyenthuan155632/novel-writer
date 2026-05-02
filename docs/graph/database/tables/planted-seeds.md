---
type: database-table
source: packages/db/src/schema/planted-seeds.ts
---

# Table: `planted_seeds`

## Purpose
Tracks narrative seeds — foreshadowing elements, Chekhov's guns, and future payoffs — that the saga planner plants for the writer to resolve in future chapters. Injected into the WARM context tier when they are due.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `seedKey` | text | Unique identifier within a story |
| `description` | text | What this seed represents narratively |
| `seedText` | text | The actual foreshadowing passage or hint |
| `payoffDescription` | text | What the resolution should look like |
| `plantWindowStart` | int | Earliest chapter to plant this seed |
| `plantWindowEnd` | int | Latest chapter to plant this seed |
| `payoffChapter` | int | Target chapter for payoff (nullable) |
| `importance` | text | `low` / `medium` / `high` |
| `plantedInChapter` | int | Chapter where the seed was actually planted |
| `paidOffAtChapter` | int | Chapter where the seed was resolved |
| `status` | enum | `pending` / `planted` / `paid_off` / `dropped` |
| `createdByAgent` | text | Agent role that created this seed |

## Primary Key
`id` (uuid); `seedKey` is unique per story.

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[modules/context-builder]] (WARM tier — seeds due in upcoming chapters)
- [[validators/packet-auditor]]

## Written By
- [[agents/saga-planner]] (initial creation)
- [[modules/canon-merger]] (marks status `paid_off`)

## Updated By
- [[modules/canon-merger]]

## Related Domain Concepts
- [[domain-planted-seed]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: database-table
source: packages/db/src/schema/planted-seeds.ts
---

# Table: `planted_seeds`

## Purpose
Narrative seeds — foreshadowing elements planned by SagaPlanner, planted in chapters, paid off later.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| seedKey | text | Unique key per story |
| description | text | What the seed is about |
| seedText | text | The actual text hint planted in the chapter |
| payoffDescription | text | How the seed should eventually pay off |
| plantWindowStart | int | Earliest chapter to plant the seed |
| plantWindowEnd | int | Latest chapter to plant the seed |
| payoffChapter | int | Target chapter for payoff |
| importance | text | Importance level |
| plantedInChapter | int | Chapter where it was actually planted |
| paidOffAtChapter | int | Chapter where payoff occurred |
| status | enum | `pending` / `planted` / `paid_off` / `dropped` |
| createdByAgent | text | Agent that created the seed |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[modules/context-builder]] (WARM tier — due seeds)
- [[validators/packet-auditor]]
- [[agents/arc-planner]]

## Written By
- [[agents/saga-planner]] (creates)
- [[modules/canon-merger]] (marks paid_off)

## Related Domain Concepts
- [[domain/planted-seed]]

## Related Flows
- [[flows/chapter-generation-flow]]
