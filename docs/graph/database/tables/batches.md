---
type: database-table
source: packages/db/src/schema/batches.ts
---

# Table: `batches`

## Purpose
Tracks multi-chapter generation batches, including their mode (`safe` / `semi_auto` / `full_auto`), progress, pause state, and accumulated cost. A batch orchestrates repeated invocations of the chapter generation pipeline.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `startChapter` | int | First chapter number in the batch |
| `endChapter` | int | Last chapter number in the batch |
| `mode` | enum | `safe` / `semi_auto` / `full_auto` |
| `status` | enum | `pending` / `running` / `paused` / `completed` / `failed` / `cancelled` |
| `pausedReason` | text | Why the batch was paused (nullable) |
| `completedChapters` | int | Count of successfully generated chapters |
| `totalCostUsd` | numeric | Accumulated cost for this batch |
| `meta` | jsonb | Arbitrary metadata for the batch run |
| `createdAt` | timestamptz | Row creation time |
| `updatedAt` | timestamptz | Last modification time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[jobs/job-generate-batch]]
- [[routes/route-batches]]

## Written By
- [[routes/route-batches]]
- [[jobs/job-generate-batch]]

## Updated By
- [[jobs/job-generate-batch]]

## Related Domain Concepts
- [[domain-generation-mode]]

## Related Flows
- [[flows/batch-generation-flow]]
---
type: database-table
source: packages/db/src/schema/batches.ts
---

# Table: `batches`

## Purpose
Batch generation jobs — tracks multi-chapter generation runs with mode, status, and progress.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| startChapter | int | First chapter in the batch |
| endChapter | int | Last chapter in the batch |
| mode | enum | `safe` / `semi_auto` / `full_auto` |
| status | enum | `pending` / `running` / `paused` / `completed` / `failed` / `cancelled` |
| pausedReason | text | Why the batch was paused (if applicable) |
| completedChapters | int | Number of chapters successfully generated |
| totalCostUsd | numeric | Total cost of the batch |
| meta | jsonb | Additional metadata |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[jobs/job-generate-batch]]
- [[routes/route-batches]]

## Written By
- [[routes/route-batches]]
- [[jobs/job-generate-batch]]

## Related Domain Concepts
- [[domain/generation-mode]]

## Related Flows
- [[flows/batch-generation-flow]]
