---
type: database-table
source: packages/db/src/schema/factions.ts
---

# Table: `factions`

## Purpose
Stores canonical faction records — organisations, sects, and alliances that exist within the story world. Updated through canon reconciliation after each chapter.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `name` | text | Faction name |
| `type` | text | Category (sect, clan, empire, etc.) |
| `ideology` | text | Core beliefs and motivations |
| `powerLevel` | text | Relative strength descriptor |
| `knownMembers` | jsonb | List of known member character IDs or names |
| `alliances` | jsonb | Allied faction IDs |
| `enemies` | jsonb | Enemy faction IDs |
| `status` | text | Current state (active, destroyed, hidden, etc.) |
| `notes` | text | Free-form canon notes |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[modules/context-builder]] — `getFactionsForStory()` populates `WarmTier.knownFactions`
- [[validators/check-unknown-faction]] — flags Vietnamese faction-prefixed proper nouns missing from this table
- [[validators/check-unknown-location]] / [[validators/check-unknown-character]] — defensively suppress false positives

## Written By
- [[modules/canon-merger]] — `applyRow` case `factions` (auto mode) and route `POST /api/stories/:id/pending-updates/:updateId/approve` (review mode)
- [[agents/canon-extractor]] — emits `factionUpdates[]`

## Updated By
- [[modules/canon-merger]] — partial update path with locked-field + destroyed/absorbed guardrails

## Conflict Detection
- `duplicate_faction` — create rejected when the name already exists
- `destroyed_faction_action` — only `status` and `notes` may change on a destroyed/absorbed faction
- `locked_field` — destroyed/absorbed factions have `status` locked by snapshot construction

## Related Domain Concepts
- [[domain-story]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
---
type: database-table
source: packages/db/src/schema/factions.ts
---

# Table: `factions`

## Purpose
Faction/organization records — ideology, power level, alliances, enemies.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| name | text | Faction name |
| type | text | Organization type |
| ideology | text | Core beliefs / ideology |
| powerLevel | text | Relative power level |
| knownMembers | jsonb | List of known members |
| alliances | jsonb | Allied factions |
| enemies | jsonb | Enemy factions |
| status | text | Current faction status |
| notes | text | Free-form notes |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[modules/context-builder]] — `getFactionsForStory()` populates `WarmTier.knownFactions`
- [[validators/check-unknown-faction]]

## Written By
- [[modules/canon-merger]] — `applyRow` case `factions`
- [[agents/canon-extractor]] — `factionUpdates[]`

## Related Domain Concepts
- [[domain/story]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
