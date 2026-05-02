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
