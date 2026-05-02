---
type: database-table
source: packages/db/src/schema/sagas.ts
---

# Table: `sagas`

## Purpose
Stores saga-level story structure — the macro narrative blocks that group multiple arcs. Contains a rolling summary that is refreshed periodically to keep the WARM context tier current.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `sagaNumber` | int | Sequential saga index within the story |
| `title` | text | Saga title |
| `premise` | text | High-level premise for this saga |
| `startChapter` | int | First chapter of this saga |
| `endChapter` | int | Last chapter of this saga (nullable until planned) |
| `expectedTurningPoints` | jsonb | Planned narrative turning points |
| `rollingSummary` | text | Continuously updated saga summary |
| `summaryVersion` | int | Increments on each summary refresh |
| `mainThemes` | jsonb | Thematic tags |
| `majorMysteries` | jsonb | Unresolved mysteries in this saga |
| `status` | text | `planned` / `active` / `completed` |
| `summaryUpdatedAt` | timestamptz | Last time rollingSummary was refreshed |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[modules/context-builder]]
- [[agents/arc-planner]]

## Written By
- [[agents/saga-planner]]
- [[jobs/job-refresh-saga-summary]]

## Updated By
- [[jobs/job-refresh-saga-summary]]

## Related Domain Concepts
- [[domain-story]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: database-table
source: packages/db/src/schema/sagas.ts
---

# Table: `sagas`

## Purpose
Saga-level story arcs. A story has 5–8 sagas. Each has a rolling summary.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| sagaNumber | int | Ordinal position within the story |
| title | text | Saga title |
| premise | text | Saga premise |
| startChapter | int | First chapter number |
| endChapter | int | Last chapter number |
| expectedTurningPoints | jsonb | Planned turning points |
| rollingSummary | text | Continuously updated summary |
| summaryVersion | int | Version of the rolling summary |
| mainThemes | jsonb | Core themes of the saga |
| majorMysteries | jsonb | Unresolved mysteries in this saga |
| status | text | Current saga status |
| summaryUpdatedAt | timestamp | When the rolling summary was last updated |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[modules/context-builder]]
- [[agents/arc-planner]]
- [[jobs/job-refresh-saga-summary]]

## Written By
- [[agents/saga-planner]]
- [[jobs/job-refresh-saga-summary]]

## Related Domain Concepts
- [[domain/story]]

## Related Flows
- [[flows/chapter-generation-flow]]
