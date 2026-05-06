---
type: database-table
source: packages/db/src/schema/high-stakes-reviews.ts
---

# Table: `high_stakes_reviews`

## Purpose
Stores the output of the `HighStakesReview` agent, which is triggered asynchronously at arc endings, on critical validation severity, or by manual request. Provides a human-readable assessment of the chapter's narrative impact.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `chapterId` | uuid | FK → `chapters` |
| `triggerReason` | enum | `arc_end` / `critical_severity` / `manual` |
| `approve` | boolean | Whether the reviewer approved the chapter |
| `concerns` | text | Narrative concerns raised by the reviewer |
| `recommendedActions` | text | Suggested follow-up actions |
| `tokens` | int | Token count for this review call |
| `costUsd` | numeric | Cost of this review call |
| `promptVersion` | text | Version of the high-stakes-reviewer prompt used |
| `createdAt` | timestamptz | Row creation time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`
- `chapterId` → `chapters.id`

## Read By
- [[routes/route-reviews]]

## Written By
- [[jobs/job-high-stakes-review]]
- [[agents/high-stakes-reviewer]]

## Updated By
N/A — one review per trigger event.

## Related Domain Concepts
- [[domain-canon-conflict]]

## Related Flows
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]
---
type: database-table
source: packages/db/src/schema/high-stakes-reviews.ts
---

# Table: `high_stakes_reviews`

## Purpose
Records of deep LLM reviews at arc-end, critical severity, or manual trigger.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| chapterId | uuid | FK → chapters |
| triggerReason | enum | `arc_end` / `critical_severity` / `manual` |
| approve | boolean | Whether the review approved the chapter |
| concerns | text | Concerns raised by the reviewer |
| recommendedActions | text | Suggested follow-up actions |
| tokens | int | Total tokens used for the review |
| costUsd | numeric | Cost of the review call |
| promptVersion | text | Version of the reviewer prompt |
| createdAt | timestamp | Creation timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`
- `chapterId` → `chapters`

## Read By
- [[routes/route-reviews]]

## Written By
- [[jobs/job-high-stakes-review]]
- [[agents/high-stakes-reviewer]]

## Related Domain Concepts
- [[domain/canon-conflict]]

## Related Flows
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]
## Correction (2026-05-06) — triggerReason enum shows 3 values; source has 6
The `triggerReason` column description shows only `arc_end / critical_severity / manual`. The actual `high_stakes_review_reason` enum (from `packages/db/src/schema/high-stakes-reviews.ts` or equivalent) has 6 values: `arc_boundary`, `arc_climax`, `critical_severity`, `breakthrough_or_death`, `packet_high_stakes`, `manual`. Update the column description and any enum tables to reflect all 6 values.