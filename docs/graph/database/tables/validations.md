---
type: database-table
source: packages/db/src/schema/validations.ts
---

# Table: `validations`

## Purpose
Stores the result of each LLM validation run against a generated chapter, including detected issues, severity, and required fixes. The generation pipeline reads this to decide between auto-fix, escalation, or proceeding.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `chapterId` | uuid | FK → `chapters` |
| `pass` | boolean | Whether the chapter passed validation |
| `severity` | enum | `low` / `medium` / `high` / `critical` |
| `issues` | jsonb | Array of detected issue objects |
| `requiredFixes` | jsonb | Structured list of fixes the auto-fixer should apply |
| `validatorModel` | text | Model name used for this validation run |
| `createdAt` | timestamptz | Row creation time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`
- `chapterId` → `chapters.id`

## Read By
- [[jobs/job-generate-chapter]] (determines auto-fix or stop)
- [[modules/admin-metrics]]

## Written By
- [[agents/llm-validator]]
- [[jobs/job-generate-chapter]]

## Updated By
- [[agents/llm-validator]]

## Related Domain Concepts
- [[domain-canon-conflict]]

## Related Flows
- [[flows/validation-flow]]
---
type: database-table
source: packages/db/src/schema/validations.ts
---

# Table: `validations`

## Purpose
LLM validation results per chapter — pass/fail, severity, issues list.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| chapterId | uuid | FK → chapters |
| pass | boolean | Whether the chapter passed validation |
| severity | enum | `low` / `medium` / `high` / `critical` |
| issues | jsonb | List of identified issues |
| requiredFixes | jsonb | Fixes that must be applied |
| validatorModel | text | Model used for validation |
| createdAt | timestamp | Creation timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`
- `chapterId` → `chapters`

## Read By
- [[jobs/job-generate-chapter]] (determines auto-fix or stop)
- [[modules/admin-metrics]]

## Written By
- [[agents/llm-validator]]

## Related Domain Concepts
- [[domain/canon-conflict]]

## Related Flows
- [[flows/validation-flow]]
