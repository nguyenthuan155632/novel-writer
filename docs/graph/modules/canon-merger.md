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
