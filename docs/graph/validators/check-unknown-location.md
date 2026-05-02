---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-location.ts
---
# Check: unknown_location
**Severity:** medium
**Logic:** Locations used in chapter that aren't found in any canon source. Suppresses matches that appear in `knownCharacterNames`, `knownBloodlineNames`, or `knownFactionNames` to avoid double-flagging.
**Source:** `packages/ai/src/validators/deterministic/unknown-location.ts`
**Reads:** [[database/tables/canon-facts]], [[database/tables/story-bibles]], [[database/tables/factions]] (suppression set)
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-location.ts
---
# Check: unknown_location
**Severity:** medium
Locations used that aren't in any canon source. Faction/character/bloodline names are suppressed.
**Source:** `packages/ai/src/validators/deterministic/unknown-location.ts`
**Reads:** [[database/tables/canon-facts]], [[database/tables/story-bibles]], [[database/tables/factions]] (suppression set)
**Used by:** [[validators/deterministic-runner]]
