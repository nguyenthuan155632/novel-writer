---
type: database-table
source: packages/db/src/schema/story-bibles.ts
---

# Table: `story_bibles`

## Purpose
Stores the versioned story bible for a novel, including world-building rules, power/cultivation systems, style guide, and forbidden narrative rules. Forms the HOT tier of the context cache.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `version` | int | Increments on each regeneration |
| `worldRules` | text | Core world-building constraints |
| `powerSystem` | text | Description of the power system |
| `powerSystemKind` | text | Enum or tag for power system category |
| `cultivationSystem` | text | Cultivation stages and rules |
| `bloodlineSystem` | text | Bloodline inheritance mechanics |
| `styleGuide` | text | Author voice and prose style instructions |
| `forbiddenRules` | text | Hard narrative bans |
| `endingDirection` | text | High-level intended ending |
| `compactSummary` | text | Short bible synopsis for context injection |
| `styleFewShots` | text | Example prose snippets for style calibration |
| `createdAt` | timestamptz | Row creation time |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[modules/context-builder]]
- [[pipelines/chapter-generation-pipeline]]

## Written By
- [[agents/bible-generator]]
- [[routes/route-stories]] (`PUT /api/stories/:id/bible`)

## Updated By
- [[agents/bible-generator]]

## Related Domain Concepts
- [[domain-story]]
- [[domain-cultivation-realm]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: database-table
source: packages/db/src/schema/story-bibles.ts
---

# Table: `story_bibles`

## Purpose
Versioned story bible — world rules, power system, style guide, forbidden rules.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| version | int | Incremented on each revision |
| worldRules | text | Core world-building rules |
| powerSystem | text | Description of the power system |
| powerSystemKind | text | Kind/type of power system |
| cultivationSystem | text | Cultivation progression rules |
| bloodlineSystem | text | Bloodline awakening rules |
| styleGuide | text | Writing style guide |
| forbiddenRules | text | Rules that must never be violated |
| endingDirection | text | High-level ending direction |
| compactSummary | text | Short summary of the bible |
| styleFewShots | text | Example passages for style reference |
| createdAt | timestamp | Creation timestamp |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[modules/context-builder]]
- [[validators/check-forbidden-move]]
- [[validators/check-style-red-flags]]

## Written By
- [[agents/bible-generator]]
- [[routes/route-bible]]

## Related Domain Concepts
- [[domain/story]]
- [[domain/cultivation-realm]]

## Related Flows
- [[flows/chapter-generation-flow]]
