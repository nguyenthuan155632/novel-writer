---
type: database-table
source: packages/db/src/schema/pending-canon-updates.ts
---

# Table: `pending_canon_updates`

## Purpose
Staging area for canon changes extracted from newly generated chapters that could not be auto-merged due to conflicts or human-review policy. Human reviewers approve or reject each update before it propagates to canon tables.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `chapterId` | uuid | FK → `chapters` |
| `updateType` | text | Type of change (upsert, delete, merge, etc.) |
| `targetTable` | text | Canon table to be updated (e.g. `characters`) |
| `targetId` | uuid | Row ID in the target table |
| `payload` | jsonb | The proposed new field values |
| `conflictStatus` | enum | `clean` / `conflict` / `escalated` |
| `conflictReasons` | jsonb | Explanation of why this was flagged |
| `resolution` | enum | `pending` / `approved` / `rejected` |
| `reviewedBy` | text | User or agent that reviewed this update |
| `resolvedAt` | timestamptz | When the resolution was made |
| `createdAt` | timestamptz | Row creation time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`
- `chapterId` → `chapters.id`

## Read By
- [[routes/route-pending-updates]]

## Written By
- [[modules/canon-merger]] (on conflict or when review mode is active)

## Updated By
- [[routes/route-pending-updates]] (on human approval/rejection)

## Related Domain Concepts
- [[domain-canon-conflict]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
---
type: database-table
source: packages/db/src/schema/pending-canon-updates.ts
---

# Table: `pending_canon_updates`

## Purpose
Staging table for canon updates that have conflicts or are in review mode — requires human approval before applying.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| chapterId | uuid | FK → chapters |
| updateType | text | Type of update being staged |
| targetTable | text | Which table the update targets |
| targetId | uuid | Row in the target table |
| payload | jsonb | The proposed update data |
| conflictStatus | enum | `clean` / `conflict` / `escalated` |
| conflictReasons | jsonb | Explanation of detected conflicts |
| resolution | enum | `pending` / `approved` / `rejected` |
| reviewedBy | text | Who reviewed the update |
| resolvedAt | timestamp | When the update was resolved |
| createdAt | timestamp | Creation timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`
- `chapterId` → `chapters`

## Read By
- [[routes/route-pending-updates]]
- [[modules/admin-metrics]]

## Written By
- [[modules/canon-merger]]

## Related Domain Concepts
- [[domain/canon-conflict]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
