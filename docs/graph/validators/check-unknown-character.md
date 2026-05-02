---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-character.ts
---
# Check: unknown_character
**Severity:** medium
**Logic:** Character names appearing in chapter that aren't in the canon character roster.
**Source:** `packages/ai/src/validators/deterministic/unknown-character.ts`
**Reads:** [[database/tables/characters]], [[database/tables/factions]] (suppression set), [[database/tables/bloodlines]] (suppression set), `knownLocationNames` (suppression set), locked facts
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-character.ts
---
# Check: unknown_character
**Severity:** medium
Character names in chapter not found in canon roster (and not in any other canonical name set: factions, bloodlines, locations, locked-fact topics).
**Source:** `packages/ai/src/validators/deterministic/unknown-character.ts`
**Reads:** [[database/tables/characters]], [[database/tables/factions]] (suppression set)
**Used by:** [[validators/deterministic-runner]]
