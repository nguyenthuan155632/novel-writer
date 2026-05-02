---
type: database-table
source: packages/db/src/schema/bloodlines.ts
---

# Table: `bloodlines`

## Purpose
Stores the canon registry of bloodlines in the story — their rank, source, traits, risks, and evolution paths. Used to validate that new bloodline sources are not contradicted by existing canon.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `storyId` | uuid | FK → `stories` |
| `name` | text | Bloodline name |
| `rank` | text | Power rank / rarity tier |
| `source` | text | Origin of the bloodline |
| `traits` | jsonb | Abilities and passive traits granted |
| `risks` | text | Known drawbacks or dangers |
| `compatibility` | jsonb | Compatible/incompatible bloodlines |
| `evolutionPath` | text | How the bloodline can grow |
| `notes` | text | Free-form canon notes |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories.id`

## Read By
- [[modules/context-builder]]
- [[validators/check-new-bloodline-source]]

## Written By
- [[modules/canon-merger]]
- [[agents/canon-extractor]]

## Updated By
- [[modules/canon-merger]]

## Related Domain Concepts
- [[domain-cultivation-realm]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
---
type: database-table
source: packages/db/src/schema/bloodlines.ts
---

# Table: `bloodlines`

## Purpose
Bloodline / bloodline awakening records for cultivation system.

## Important Columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| storyId | uuid | FK → stories |
| name | text | Bloodline name |
| rank | text | Power rank of the bloodline |
| source | text | Origin of the bloodline |
| traits | jsonb | Granted traits/abilities |
| risks | text | Associated risks or drawbacks |
| compatibility | jsonb | Compatible bloodlines or systems |
| evolutionPath | text | How the bloodline evolves |
| notes | text | Free-form canon notes |

## Primary Key
`id` (uuid)

## Foreign Keys
- `storyId` → `stories`

## Read By
- [[modules/context-builder]]
- [[validators/check-new-bloodline-source]]

## Written By
- [[modules/canon-merger]]
- [[agents/canon-extractor]]

## Related Domain Concepts
- [[domain/cultivation-realm]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
