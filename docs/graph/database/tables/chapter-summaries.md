---
type: database-table
source: packages/db/src/schema/chapter-summaries.ts
---

# Table: `chapter_summaries`

## Purpose
Stores the compact summary and semantic embedding for every completed chapter. Powers both recency-based COLD tier context retrieval and vector similarity search for relevant past events.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `chapterId` | uuid | PK and FK → `chapters` |
| `storyId` | uuid | FK → `stories` |
| `chapterNumber` | int | Denormalised for ordered retrieval |
| `summary` | text | Compact narrative summary |
| `embedding` | vector(1536) | Semantic embedding for vector search |
| `createdAt` | timestamptz | Row creation time |

## Primary Key
`chapterId` (uuid) — one summary per chapter

## Foreign Keys
- `chapterId` → `chapters.id`
- `storyId` → `stories.id`

## Read By
- [[modules/context-builder]] (COLD tier — recent summaries + vector retrieval)
- [[jobs/job-refresh-arc-summary]]

## Written By
- [[agents/summary-compactor]] via [[jobs/job-generate-chapter]]

## Updated By
- [[agents/summary-compactor]]

## Related Domain Concepts
- [[domain-chapter-context]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: database-table
source: packages/db/src/schema/chapter-summaries.ts
---

# Table: `chapter_summaries`

## Purpose
Short chapter summaries with 1536-dim vector embeddings for semantic retrieval.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| chapterId | uuid | PK and FK → chapters |
| storyId | uuid | FK → stories |
| chapterNumber | int | Denormalized chapter number |
| summary | text | Short chapter summary text |
| embedding | vector(1536) | Semantic embedding for retrieval |
| createdAt | timestamp | Creation timestamp |

## Primary Key
`chapterId` (uuid — 1:1 with chapters)

## Foreign Keys
- `chapterId` → `chapters`
- `storyId` → `stories`

## Read By
- [[modules/context-builder]] (COLD tier — recent + vector retrieval)
- [[jobs/job-refresh-arc-summary]]

## Written By
- [[agents/summary-compactor]] via [[jobs/job-generate-chapter]]

## Related Domain Concepts
- [[domain/chapter-context]]

## Related Flows
- [[flows/chapter-generation-flow]]
