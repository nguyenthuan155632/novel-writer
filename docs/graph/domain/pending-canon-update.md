---
type: domain-concept
---

# Domain: Pending Canon Update

**Type:** Domain Concept

## Description
A pending canon update is a **staged, unconfirmed change** to one of the story's canon tables. Rather than writing extracted facts directly to canon tables, the system routes all changes through this staging layer, allowing human review (or automated approval for low-conflict updates) before they become permanent story truths.

## Key Properties / Rules
- `targetTable` — which canon table is affected: `characters | canon_facts | open_threads | timeline_events | planted_seeds`
- `updateType` — the nature of the change: `create | update | resolve`
- `proposedData` — JSON blob with the proposed field values
- `resolution` — current review state: **`pending | approved | edited | rejected`**
- `conflictStatus` — severity of detected conflict:
  - `none` — no conflict; eligible for **auto-merge**
  - `warning` — possible inconsistency; flagged for human attention
  - `blocking` — hard conflict detected; the associated [[domain/chapter]] is paused (`status = paused_pending_updates`) until a human resolves it
- **Auto-merge** applies when `conflictStatus = none` and `importance = low`; otherwise queued for human review in [[routes/pending-updates]]

## Conflict → Chapter Pause Flow
1. [[modules/canon-merger]] detects `conflictStatus = blocking`
2. Parent chapter status → `paused_pending_updates`
3. Human resolves via [[routes/pending-updates]]
4. Chapter resumes generation

## Related Database Tables
- [[database/tables/pending-canon-updates]]
- [[database/tables/canon-facts]]
- [[database/tables/characters]]
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/planted-seeds]]

## Related Flows
- [[routes/pending-updates]] — UI for human review
- [[jobs/job-generate-chapter]] — paused when blocking conflict exists

## Related Domain Concepts
- [[domain/canon-fact]]
- [[domain/chapter]]
- [[domain/character]]
- [[domain/open-thread]]
- [[domain/planted-seed]]

## Implemented By
- `packages/db/src/schema/pending-canon-updates.ts`
- [[modules/canon-merger]] — creates and resolves pending updates
- [[agents/canon-extractor]] — upstream producer
- [[modules/conflict-detector]] — sets `conflictStatus`
