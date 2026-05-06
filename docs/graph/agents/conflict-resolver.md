---
type: ai-agent
source: packages/ai/src/agents/conflict-resolver.ts
---

# Agent: Conflict Resolver

## Responsibility
Pre-resolves canon conflicts before they go to the pending queue. Produces a `suggestedResolution` for each conflicting row so human reviewers can accept with one click.

## Source Evidence
`packages/ai/src/agents/conflict-resolver.ts` — `ConflictResolverAgent`

## Inputs
- Conflicting `PendingCanonUpdate` rows (from [[modules/canon-merger]])
- Current DB state snapshot

## Outputs
- `suggestedResolution` field written back to `pending_canon_updates` table
- Skips: `locked_importance` rows, `locked_field` conflicts, `locked_fact` conflicts

## Trigger
Called by [[modules/canon-merger]] before inserting conflict rows into `pending_canon_updates`.

## Depends On
- [[modules/conflict-detector]]
- [[prompts/prompt-conflict-resolver]] (if exists)

## Related Tables
- [[database/tables/pending-canon-updates]]
- [[modules/canon-merger]]
## Validation Notes

### Role Frames actual exports
Doc originally listed WRITER_ROLE_FRAME, REVIEWER_ROLE_FRAME, EXTRACTOR_ROLE_FRAME. Actual file exports: `PLANNER_FRAME`, `CREATOR_FRAME`, `MONITOR_FRAME`. Writer.v2 imports `CREATOR_FRAME` only. This was the correct reference.

### Anti-LLM Patterns validator
Severity is `low` (not `medium`). Not wired into `buildChecks()` — exists as standalone utility exported from `@novel/ai`. Available for future integration.

### Conflict Resolver skips
`locked_fact` conflicts are skipped by ConflictResolverAgent (per b5dfcc7), so the note about locked_fact conflicts being skipped is accurate.

### Polish Pass role
`agentRole: "polish_pass"` registered in registry.ts — correctly documented.
## Correction (2026-05-06)
Original note said "Skipped for locked_field, locked_fact" — but source shows only `LOCKED_SKIP_TYPES = ['locked_field']`. `locked_fact` is NOT skipped; it does get a suggestedResolution unless `importance === 'locked'` (locked_importance). The note should read: skipped for `locked_importance` rows and `locked_field` conflicts only.
## Correction (2026-05-06) — First Block Still Lists locked_fact as Skipped
The first markdown block (lines before "Validation Notes") outputs section still says "Skips: `locked_importance` rows, `locked_field` conflicts, `locked_fact` conflicts". This is wrong — `locked_fact` is NOT skipped (only `locked_field` is in LOCKED_SKIP_TYPES). The corrected statement: "Skips: `locked_importance` rows and `locked_field` conflicts only." `locked_fact` conflicts receive suggestedResolution unless the row's `importance === 'locked'`.