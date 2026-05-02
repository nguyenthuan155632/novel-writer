---
type: database-table
source: packages/db/src/schema/chapters.ts
---

# Table: `chapters`

## Purpose
Stores the generated content and lifecycle state of every chapter. Tracks validation status, packet audit results, and links to the LLM validation record.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `arcId` | uuid | FK → `arcs` |
| `chapterNumber` | int | Unique per story |
| `title` | text | Chapter title |
| `content` | text | Full generated prose |
| `summary` | text | Short chapter summary |
| `status` | enum | `draft` / `generating` / `completed` / `failed` / `paused_pending_updates` |
| `wordCount` | int | Word count of generated content |
| `validationStatus` | text | Result of LLM validation pass |
| `packetAuditStatus` | text | Result of deterministic packet audit |
| `deterministicValidation` | jsonb | Output of DeterministicValidator |
| `llmValidationId` | uuid | FK → `validations` |
| `contextCacheKey` | text | Hash key for context cache hit tracking |
| `createdAt` | timestamptz | Row creation time |
| `updatedAt` | timestamptz | Last modification time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`
- `arcId` → `arcs.id`
- `llmValidationId` → `validations.id`

## Read By
- [[jobs/job-generate-batch]]
- [[routes/route-chapters]]
- [[modules/context-builder]]

## Written By
- [[jobs/job-generate-chapter]]
- [[routes/route-chapters]]

## Updated By
- [[jobs/job-generate-chapter]]

## Related Domain Concepts
- [[domain-chapter-context]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
---
type: database-table
source: packages/db/src/schema/chapters.ts
---

# Table: `chapters`

## Purpose
Generated chapter records with content, validation status, word count.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| arcId | uuid | FK → arcs |
| chapterNumber | int | Unique per story |
| title | text | Chapter title |
| content | text | Full chapter text |
| summary | text | Short chapter summary |
| status | enum | `draft` / `generating` / `completed` / `failed` / `paused_pending_updates` |
| wordCount | int | Word count of generated content |
| validationStatus | text | Current validation status |
| packetAuditStatus | text | Status from packet auditor |
| deterministicValidation | jsonb | Result of deterministic validation checks |
| llmValidationId | uuid | FK → validations (nullable) |
| contextCacheKey | text | Cache key for the context used |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`
- `arcId` → `arcs`
- `llmValidationId` → `validations` (nullable)

## Read By
- [[jobs/job-generate-batch]]
- [[routes/route-chapters]]
- [[modules/context-builder]]
- [[jobs/job-high-stakes-review]]

## Written By
- [[jobs/job-generate-chapter]]
- [[routes/route-chapters]]

## Related Domain Concepts
- [[domain/chapter-context]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
