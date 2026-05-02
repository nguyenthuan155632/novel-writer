---
type: database-table
source: packages/db/src/schema/open-threads.ts
---

# Table: `open_threads`

## Purpose
Tracks unresolved narrative threads — mysteries, promises, and dangling plot hooks. Active open threads are injected into the WARM context tier so the writer keeps them in scope.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `title` | text | Short thread title |
| `openedChapter` | int | Chapter where the thread was introduced |
| `plannedResolutionChapter` | int | Intended chapter for resolution (nullable) |
| `status` | enum | `open` / `resolved` / `dropped` |
| `hints` | text | Planted clues related to this thread |
| `relatedCharacters` | jsonb | Character IDs involved |
| `resolutionNotes` | text | How the thread was resolved (if resolved) |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[modules/context-builder]] (WARM tier)
- [[validators/check-conflict-presence]]

## Written By
- [[modules/canon-merger]]
- [[agents/canon-extractor]]

## Updated By
- [[modules/canon-merger]]

## Related Domain Concepts
- [[domain-open-thread]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/canon-reconciliation-flow]]
---
type: database-table
source: packages/db/src/schema/open-threads.ts
---

# Table: `open_threads`

## Purpose
Open narrative threads — unresolved plot points that must be tracked and resolved.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| title | text | Thread title / name |
| openedChapter | int | Chapter the thread was introduced |
| plannedResolutionChapter | int | Target chapter for resolution |
| status | enum | `open` / `resolved` / `dropped` |
| hints | text | Hints about the resolution |
| relatedCharacters | jsonb | Characters tied to this thread |
| resolutionNotes | text | How the thread was resolved |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[modules/context-builder]] (WARM tier)
- [[validators/check-conflict-presence]]
- [[modules/conflict-detector]]

## Written By
- [[modules/canon-merger]]
- [[agents/canon-extractor]]

## Related Domain Concepts
- [[domain/open-thread]]

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/canon-reconciliation-flow]]
