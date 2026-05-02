---
type: error
---

# Error: Canon Conflict

## Trigger

[[modules/conflict-detector]] identifies a conflict between a proposed canon update (extracted by [[agents/canon-extractor]]) and existing facts already stored in the database. Fired inside [[modules/canon-merger]] during the memory stage of [[flows/chapter-generation-flow]].

## Conflict Types

| Type | Behaviour |
|------|-----------|
| **Blocking conflict** | Chapter completion halted; conflicting update staged to `pending_canon_updates` with `status = 'pending'`; chapter status → `paused_pending_updates` |
| **Warning conflict** | Logged and staged to `pending_canon_updates`; chapter may still complete but human review required |
| **Clean update** | Applied directly to canon tables (in `auto` merge mode with no conflicts) |

## Effect

- [[database/tables/chapters]] — `status = 'paused_pending_updates'` (blocking) or remains completing (warning)
- [[database/tables/pending-canon-updates]] — conflicting update staged with `conflictDetails` populated
- Human must approve or reject via `PUT /api/stories/:storyId/pending-updates/:id` (→ [[routes/pending-updates]])
- No facts are written directly to canon tables while a conflict is pending

## Created By

- [[modules/canon-merger]] — orchestrates the merge decision and routes conflicting updates
- [[modules/conflict-detector]] — computes conflict type and severity by comparing proposed data against existing canon

## Resolution

1. Human reviews staged update at [[routes/pending-updates]]
2. **Approve** → update applied to canon tables ([[database/tables/canon-facts]], [[database/tables/characters]], etc.); chapter can resume/complete
3. **Reject** → update discarded; chapter may need partial regeneration

## Related

- [[database/tables/pending-canon-updates]]
- [[database/tables/canon-facts]]
- [[agents/canon-extractor]]
- [[modules/canon-merger]]
- [[modules/conflict-detector]]
- [[flows/chapter-generation-flow]]
