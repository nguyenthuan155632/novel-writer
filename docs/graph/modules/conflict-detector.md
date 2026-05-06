---
type: module
source: packages/ai/src/reconciliation/conflict-detector.ts
---

# Module: Conflict Detector

## Responsibility
Pure function that detects 7 types of canon conflicts between proposed updates and existing DB state. No LLM calls.

## Source Evidence
`packages/ai/src/reconciliation/conflict-detector.ts` — `detectConflicts()`

## Conflict Types Detected
1. `locked_field` — updating a locked character field
2. `realm_regression` — downgrading a character's cultivation realm
3. `locked_fact` — duplicate fact marked locked
4. `duplicate_fact` — exact fact text already exists
5. `dead_character_action` — updating a dead character's non-status fields
6. `thread_status_invalid` — reopening a resolved thread
7. `realm_jump_excess` — too many realm breakthroughs in one packet (from PacketAuditor)

## Inputs
- Proposed update payload
- Snapshot of current DB state (characters, canon facts, threads)

## Outputs
- Array of `ConflictResult` with type, reason, conflicting field

## Depends On
- [[packages/package-db]] (reads snapshot)

## Used By
- [[modules/canon-merger]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
---
type: module
source: packages/ai/src/reconciliation/conflict-detector.ts
---

# Module: Conflict Detector

## Responsibility
Pure function detecting 7 types of canon conflicts. No LLM calls.

## Source Evidence
`packages/ai/src/reconciliation/conflict-detector.ts` — `detectConflicts()`

## Conflict Types
1. `locked_field` — updating a locked character field
2. `realm_regression` — downgrading cultivation realm
3. `locked_fact` — duplicate of a locked canon fact
4. `duplicate_fact` — exact fact text already exists
5. `dead_character_action` — updating a dead character's non-status fields
6. `thread_status_invalid` — reopening a resolved thread
7. `realm_jump_excess` — too many realm breakthroughs per packet

## Inputs
- Proposed update payload
- Current DB snapshot (characters, facts, threads)

## Outputs
- Array of `ConflictResult` with type + reason

## Used By
- [[modules/canon-merger]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
## Fix (2026-05-06)
Conflict types confirmed from `conflict-detector.ts` source (5 types, matching spec):
1. `locked_field` — includes characters AND factions
2. `realm_regression` — character realm downgrade without `intentionalRegression` flag
3. `duplicate_fact` — duplicate fact text, or duplicate faction name on create, or locked importance overflow (>20 locked facts)
4. `dead_character_action` — dead character status change or non-status field update
5. `thread_status_invalid` — reopening a resolved thread

`duplicate_fact` absorbs the former `locked_fact`, `duplicate_faction` cases. `destroyed_faction_action` is handled as `locked_field` (status=destroyed/absorbed → all non-status fields locked).
## Correction (2026-05-06) — Main Body Still Says 7 Conflict Types
Both frontmatter blocks at the top of this file (and the un-appended markdown sections) still claim "7 types" and list `locked_fact` and `realm_jump_excess`. The Fix note at the bottom correctly states 5 types. The main body needs full revision: conflict types are `locked_field` (chars+factions), `realm_regression`, `duplicate_fact` (absorbs former locked_fact, duplicate_faction, destroyed_faction_action), `dead_character_action`, `thread_status_invalid`. `realm_jump_excess` is handled by PacketAuditor, not conflict-detector.