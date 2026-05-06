---
type: module
source: packages/ai/src/reconciliation/canon-merger.ts
---

# Module: Canon Merger

## Responsibility
Stages or auto-applies canon extractor output. Handles conflict detection. Routes clean updates directly to DB; routes conflicting or review-mode updates to `pending_canon_updates`.

## Source Evidence
`packages/ai/src/reconciliation/canon-merger.ts`

## Inputs
- Extractor output (character updates, canon facts, thread updates, timeline events, resolved seeds)
- Conflict detection results from [[modules/conflict-detector]]
- `mode`: `auto` (apply non-conflicting) or `review` (all → pending)

## Outputs
- Direct writes to: [[database/tables/characters]], [[database/tables/canon-facts]], [[database/tables/open-threads]], [[database/tables/timeline-events]], [[database/tables/planted-seeds]]
- Staged writes to: [[database/tables/pending-canon-updates]]
- Embeddings for new canon facts via [[modules/embedding-service]]

## Conflict Handling
- Clean updates in `auto` mode: applied directly
- All updates in `review` mode: → `pending_canon_updates`
- Any conflict: always → `pending_canon_updates`

## Depends On
- [[modules/conflict-detector]]
- [[modules/embedding-service]]
- [[packages/package-db]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 10)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/pending-canon-updates]]
- [[database/tables/characters]]
- [[database/tables/canon-facts]]
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/planted-seeds]]

## Related Flows
- [[flows/canon-reconciliation-flow]]
- [[flows/chapter-generation-flow]]
---
type: module
source: packages/ai/src/reconciliation/canon-merger.ts
---

# Module: Canon Merger

## Responsibility
Stages or auto-applies canon extractor output. Routes clean updates to DB directly. Routes conflicting or review-mode updates to pending_canon_updates.

## Source Evidence
`packages/ai/src/reconciliation/canon-merger.ts`

## Merge Modes
- `auto` — apply non-conflicting rows directly to DB
- `review` — all rows → pending_canon_updates
- Any conflict → always → pending_canon_updates

## Inputs
- Extractor output (characters, facts, threads, events, seeds)
- Conflict detection results from [[modules/conflict-detector]]

## Outputs
Writes to:
- [[database/tables/characters]]
- [[database/tables/canon-facts]] (+ embedding via [[modules/embedding-service]])
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/planted-seeds]] (paid_off)
- [[database/tables/pending-canon-updates]] (on conflict or review mode)

## Used By
- [[jobs/job-generate-chapter]] (Stage 10)

## Related Flows
- [[flows/canon-reconciliation-flow]]
- [[flows/chapter-generation-flow]]
## Phase 3 Additions (2026-05-05)

### Hybrid Retrieval
`buildContext()` now calls `getTopKCanonFactsHybrid()` (not plain vector search). Hybrid retrieval:
1. **Keyword branch** — full-text match on `topic` + `fact` text
2. **Vector branch** — pgvector cosine similarity
3. **Score fusion** — `loc_boost` adds weight for location-key matches

All branches apply: `story_id` filter, TTL filter (`validUntilChapter`), visibility filter (`visibility='public' OR knownBy contains activeCharacter.name`), and importance threshold.

### Auto-Approve
In `auto` or `review` merger mode, rows with `importance <= LOW_IMPORTANCE_THRESHOLD` and no conflicts are applied directly to DB (bypass `pending_canon_updates`). Logged with `canon_merger_auto_apply` metadata.

### ConflictResolverAgent Integration
Before inserting conflict rows, `merge()` calls `ConflictResolverAgent` to pre-compute `suggestedResolution` on the row. Skipped for `locked_importance`, `locked_field`, and `locked_fact` conflict types.

### Critical Conflict Types
`realm_regression`, `dead_character_action`, `locked_field` conflicts → chapter pauses with `paused_pending_updates` status regardless of merger mode.
## Fix (2026-05-06)
"LOW_IMPORTANCE_THRESHOLD" was an invented placeholder name — actual threshold is defined in `packages/ai/src/reconciliation/canon-merger.ts` as inline logic (not a named constant). Auto-approve applies to rows where `conflictStatus=none AND importance<=some_threshold` — exact threshold value is in the source.
## Correction (2026-05-06) — Auto-Approve Wording
The "Phase 3 Additions" section above says `importance <= LOW_IMPORTANCE_THRESHOLD`. This is inaccurate — there is no named constant `LOW_IMPORTANCE_THRESHOLD`. The actual auto-approve logic is an inline check: `importance === 'low'` (the `importance` field is an enum value, not a numeric score). Rows with `conflictStatus='none'` AND `importance='low'` are applied directly to DB. The Fix note at the bottom of this file already correctly notes the absence of a named constant.