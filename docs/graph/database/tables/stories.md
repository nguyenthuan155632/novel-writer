---
type: database-table
source: packages/db/src/schema/stories.ts
---

# Table: `stories`

## Purpose
Stores the top-level story record for each novel project, including metadata, genre, tone, target length, and accumulated generation cost.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `title` | text | Story title |
| `premise` | text | High-level story premise |
| `genre` | text | Default `tien_hiep` |
| `mainCharacterPersonality` | text | Personality descriptor for the MC |
| `tone` | text | Narrative tone |
| `targetChapterCount` | int | Default 1000 |
| `status` | enum | `draft` / `active` / `completed` / `archived` |
| `totalCostUsd` | numeric | Running cost accumulator |
| `genreLockedAt` | timestamptz | When genre was locked for generation |
| `createdAt` | timestamptz | Row creation time |
| `updatedAt` | timestamptz | Last modification time |

## Primary Key
`id` (uuid)

## Foreign Keys
None — this is a root aggregate.

## Read By
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]
- [[modules/context-builder]]
- [[agents/bible-generator]]
- [[agents/arc-planner]]
- [[agents/saga-planner]]

## Written By
- [[routes/route-stories]] (`POST /api/stories`, `PATCH /api/stories/:id`)

## Updated By
- [[routes/route-stories]]

## Related Domain Concepts
- [[domain-story]]
- [[domain-generation-mode]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
---
type: database-table
source: packages/db/src/schema/stories.ts
---

# Table: `stories`

## Purpose
Core story record. Top-level entity for everything in the system.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| title | text | Story title |
| premise | text | Story premise |
| genre | text | Default: `tien_hiep` |
| mainCharacterPersonality | text | Personality descriptor |
| tone | text | Narrative tone |
| targetChapterCount | int | Default: 1000 |
| status | enum | `draft` / `active` / `completed` / `archived` |
| totalCostUsd | numeric | Accumulated generation cost |
| genreLockedAt | timestamp | When genre was locked |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
None

## Read By
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]
- [[modules/story-domain]]
- [[modules/context-builder]]

## Written By
- [[routes/route-stories]]
- [[modules/cost-tracker]]

## Related Domain Concepts
- [[domain/story]]
- [[domain/generation-mode]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/batch-generation-flow]]
