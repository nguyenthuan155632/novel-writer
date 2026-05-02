---
type: database-table
source: packages/db/src/schema/characters.ts
---

# Table: `characters`

## Purpose
Stores the canonical profile of every character in the story, including their current realm, abilities, relationships, and status. Updated after each chapter via canon reconciliation.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `version` | int | Increments on each canon update |
| `name` | text | Character name |
| `role` | enum | `main` / `supporting` / `antagonist` / `minor` |
| `personality` | text | Personality description |
| `origin` | text | Background and origins |
| `goals` | text | Current narrative goals |
| `currentRealm` | text | Cultivation realm as of last chapter |
| `currentBloodlines` | jsonb | Active bloodlines |
| `abilities` | jsonb | Known skills and powers |
| `secrets` | text | Hidden info (not revealed to reader) |
| `relationships` | jsonb | Key relationships to other characters |
| `inventory` | jsonb | Notable items carried |
| `status` | enum | `alive` / `dead` / `unknown` |
| `lastSeenChapter` | int | Last chapter where character appeared |
| `canonNotes` | text | Free-form canon annotations |
| `lockedFields` | jsonb array | Fields that cannot be overwritten by auto-merge |
| `createdAt` | timestamptz | Row creation time |
| `updatedAt` | timestamptz | Last modification time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[modules/context-builder]]
- [[validators/check-dead-character]]
- [[validators/check-realm-jump]]
- [[validators/check-unknown-character]]

## Written By
- [[modules/canon-merger]]
- [[agents/canon-extractor]]
- [[routes/route-arcs]] (initial character seeding)

## Updated By
- [[modules/canon-merger]]

## Related Domain Concepts
- [[domain-canon-fact]]
- [[domain-cultivation-realm]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
- [[flows/chapter-generation-flow]]
---
type: database-table
source: packages/db/src/schema/characters.ts
---

# Table: `characters`

## Purpose
Versioned character records — state, realm, abilities, relationships, locked fields.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| version | int | Incremented on each revision |
| name | text | Character name |
| role | enum | `main` / `supporting` / `antagonist` / `minor` |
| personality | text | Personality descriptor |
| origin | text | Background / origin |
| goals | text | Character goals |
| currentRealm | text | Current cultivation realm |
| currentBloodlines | jsonb | Active bloodlines |
| abilities | jsonb | Known abilities |
| secrets | text | Hidden information |
| relationships | jsonb | Relationships to other characters |
| inventory | jsonb | Notable items |
| status | enum | `alive` / `dead` / `unknown` |
| lastSeenChapter | int | Last chapter the character appeared in |
| canonNotes | text | Free-form canon notes |
| lockedFields | jsonb | Fields that cannot be changed by auto-merge |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[modules/context-builder]]
- [[validators/check-dead-character]]
- [[validators/check-realm-jump]]
- [[validators/check-unknown-character]]
- [[modules/conflict-detector]]

## Written By
- [[modules/canon-merger]]
- [[agents/canon-extractor]]

## Related Domain Concepts
- [[domain/canon-fact]]
- [[domain/cultivation-realm]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
- [[flows/chapter-generation-flow]]
