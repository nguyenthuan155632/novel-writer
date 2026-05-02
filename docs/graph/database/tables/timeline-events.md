---
type: database-table
source: packages/db/src/schema/timeline-events.ts
---

# Table: `timeline_events`

## Purpose
Stores discrete story events indexed by chapter number. Used to render a browsable timeline in the web UI and to support event-type queries for canon review.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `chapterNumber` | int | Chapter in which the event occurred |
| `eventType` | text | Category tag (death, breakthrough, alliance, etc.) |
| `eventText` | text | Human-readable event description |
| `importance` | text | `low` / `medium` / `high` |
| `relatedCharacterIds` | jsonb | Character IDs involved in the event |
| `relatedThreadIds` | jsonb | Open thread IDs touched by the event |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[routes/route-timeline]]

## Written By
- [[agents/canon-extractor]] via [[modules/canon-merger]]

## Updated By
- [[modules/canon-merger]]

## Related Domain Concepts
- [[domain-story]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
---
type: database-table
source: packages/db/src/schema/timeline-events.ts
---

# Table: `timeline_events`

## Purpose
Major story events indexed by chapter — for timeline view.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| chapterNumber | int | Chapter the event occurred in |
| eventType | text | Category of the event |
| eventText | text | Description of the event |
| importance | text | Importance level |
| relatedCharacterIds | jsonb | Characters involved |
| relatedThreadIds | jsonb | Threads related to this event |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[routes/route-timeline]]

## Written By
- [[modules/canon-merger]]
- [[agents/canon-extractor]]

## Related Domain Concepts
- [[domain/story]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
