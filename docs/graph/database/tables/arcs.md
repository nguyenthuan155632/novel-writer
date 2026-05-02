---
type: database-table
source: packages/db/src/schema/arcs.ts
---

# Table: `arcs`

## Purpose
Stores arc-level story structure within a saga. Arcs define the mid-level narrative blocks, including planned character and power changes, seeds to resolve, and a rolling summary for context injection.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `sagaId` | uuid | FK → `sagas` |
| `arcNumber` | int | Sequential arc index within the story |
| `title` | text | Arc title |
| `premise` | text | Arc premise |
| `startChapter` | int | First chapter of this arc |
| `endChapter` | int | Last chapter (nullable until planned) |
| `summary` | text | Static authored summary |
| `mainConflict` | text | Central conflict for the arc |
| `expectedChanges` | text | Expected story-world changes by arc end |
| `seedsToResolveInArc` | jsonb | Planted seed IDs that should pay off |
| `expectedCharacterChanges` | jsonb | Planned character evolution |
| `expectedPowerChanges` | jsonb | Planned cultivation breakthroughs |
| `rollingSummary` | text | Continuously updated arc summary |
| `summaryVersion` | int | Increments on each summary refresh |
| `plantedSeedIds` | jsonb | Seeds planted during this arc |
| `status` | text | `planned` / `active` / `completed` |
| `summaryUpdatedAt` | timestamptz | Last time rollingSummary was refreshed |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`
- `sagaId` → `sagas.id`

## Read By
- [[modules/context-builder]]
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]

## Written By
- [[agents/arc-planner]]
- [[jobs/job-refresh-arc-summary]]

## Updated By
- [[jobs/job-refresh-arc-summary]]

## Related Domain Concepts
- [[domain-story]]
- [[domain-planted-seed]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
---
type: database-table
source: packages/db/src/schema/arcs.ts
---

# Table: `arcs`

## Purpose
Arc records within a saga. 2–5 arcs per saga. Has rolling summary refreshed every 5 chapters.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| sagaId | uuid | FK → sagas |
| arcNumber | int | Ordinal position within the saga |
| title | text | Arc title |
| premise | text | Arc premise |
| startChapter | int | First chapter number |
| endChapter | int | Last chapter number |
| summary | text | Static arc summary |
| mainConflict | text | Central conflict of the arc |
| expectedChanges | jsonb | Planned world/character changes |
| seedsToResolveInArc | jsonb | Seeds that must pay off in this arc |
| expectedCharacterChanges | jsonb | Planned character state changes |
| expectedPowerChanges | jsonb | Planned power/realm changes |
| rollingSummary | text | Continuously updated summary |
| summaryVersion | int | Version of the rolling summary |
| plantedSeedIds | jsonb | Seeds planted during this arc |
| status | text | Current arc status |
| summaryUpdatedAt | timestamp | When the rolling summary was last updated |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`
- `sagaId` → `sagas`

## Read By
- [[modules/context-builder]]
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]
- [[jobs/job-refresh-arc-summary]]

## Written By
- [[agents/arc-planner]]
- [[jobs/job-refresh-arc-summary]]

## Related Domain Concepts
- [[domain/story]]
- [[domain/planted-seed]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
