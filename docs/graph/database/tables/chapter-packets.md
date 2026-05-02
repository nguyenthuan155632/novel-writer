---
type: database-table
source: packages/db/src/schema/chapter-packets.ts
---

# Table: `chapter_packets`

## Purpose
Stores the structured `ChapterPacket` produced by `PacketGenerator` and audited by `PacketAuditor`. Serves as the micro-plan for a single chapter that feeds the COLD tier of the context cache.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `chapterId` | uuid | FK → `chapters` |
| `arcId` | uuid | FK → `arcs` |
| `chapterNumber` | int | Denormalised for easy lookup |
| `goal` | text | The chapter's narrative goal |
| `requiredEvents` | jsonb | Events that must occur in this chapter |
| `charactersInScene` | jsonb | Character IDs present in this chapter |
| `conflict` | text | The core conflict to be dramatised |
| `cliffhanger` | text | Intended ending hook |
| `forbiddenMoves` | jsonb | Actions forbidden by packet audit |
| `contextNotes` | text | Additional planner notes for the writer |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`
- `chapterId` → `chapters.id`
- `arcId` → `arcs.id`

## Read By
- [[modules/context-builder]] (COLD tier)

## Written By
- [[jobs/job-generate-chapter]] (after PacketGenerator + PacketAuditor pass)

## Updated By
- [[jobs/job-generate-chapter]]

## Related Domain Concepts
- [[domain-chapter-packet]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: database-table
source: packages/db/src/schema/chapter-packets.ts
---

# Table: `chapter_packets`

## Purpose
Structured chapter plan — goal, events, characters in scene, conflict, cliffhanger, forbidden moves.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| chapterId | uuid | FK → chapters |
| arcId | uuid | FK → arcs |
| chapterNumber | int | Denormalized chapter number |
| goal | text | Primary goal for the chapter |
| requiredEvents | jsonb | Events that must occur |
| charactersInScene | jsonb | Characters appearing in this chapter |
| conflict | text | Central conflict of the chapter |
| cliffhanger | text | Ending hook / cliffhanger |
| forbiddenMoves | jsonb | Moves the writer must not make |
| contextNotes | text | Additional planner notes |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`
- `chapterId` → `chapters`
- `arcId` → `arcs`

## Read By
- [[modules/context-builder]] (COLD tier)
- [[validators/packet-auditor]]

## Written By
- [[jobs/job-generate-chapter]] (Stage 3)

## Related Domain Concepts
- [[domain/chapter-packet]]

## Related Flows
- [[flows/chapter-generation-flow]]
