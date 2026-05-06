---
type: architecture-review
date: 2026-05-05
source_docs:
  - docs/superpowers/specs/2026-05-04-notebook-llm-improvement-design.md
  - docs/superpowers/plans/2026-05-04-notebook-llm-improvement-plan.md
---

# Notebook LLM Improvement Review

Reviewed and corrected the NotebookLM-style improvement spec and implementation plan against the live Novel Factory repo and graph notes.

## Notes Consulted
- [[00-index/00 Overview]]
- [[validators/packet-auditor]]
- [[validators/deterministic-runner]]
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
- [[domain/canon-fact]]
- [[database/tables/canon-facts]]
- [[database/tables/pending-canon-updates]]
- [[database/tables/chapter-packets]]
- [[database/tables/planted-seeds]]
- [[modules/context-builder]]
- [[modules/canon-merger]]

## Architecture Corrections
- Shared DB/AI packet state types such as `EntryState` should live in `@novel/core`, not `@novel/ai`, because `@novel/ai` already depends on `@novel/db`.
- Location filtering should use `activeLocationKey` text/tag semantics until a real locations/settings table exists. The repo has `story_settings.storyId`, not `settings.id`.
- Canon POV filtering needs `visibility` plus `known_by`; `known_by=[]` must not mean public. Legacy canon rows require conservative visibility backfill.
- `characters.knowledge_state` must be maintained by CanonMerger when facts are applied or approved; creating the column alone is insufficient.
- Locked-fact packet audit must not hard-block on vector similarity alone. Similar locked facts can be hints; blockers require explicit structured contradiction.
- Cosmetic deterministic validators should only be removed after LLM Validator replacement checks and tests are in place.
- Batch resume should extend existing `generate-batch.ts` behavior based on `completedChapters` instead of introducing a conflicting resume model.

## Documentation Status
Some existing graph notes are stale or duplicated. In particular, flow notes mention a separate deterministic pre-check stage that is not currently implemented as a standalone stage in `apps/worker/src/jobs/generate-chapter.ts`, and validator severity notes differ from current source. Update these graph notes after implementation changes land.

## Review Follow-up Resolved

- Hybrid RAG `loc_boost` must apply the same `story_id`, TTL, and visibility/POV filters as keyword and vector branches. Location boost is only a score boost for already-allowed facts, not a bypass.
- Cache invariant language now targets the Writer user/context payload produced by `serializeContextForWriter()`. `writerPromptV2.system` should remain byte-identical under Warm/Cold changes.
## Implementation Status — All Phases Complete (2026-05-05)

All items from this review have been implemented in commits dffe87d → 517a0fb:

| Item | Resolution |
|------|-----------|
| `EntryState` in `@novel/core` | Done — `packages/core/src/types/entry-state.ts` |
| `activeLocationKey` text semantics | Done — used in hybrid retrieval filtering |
| `visibility` + `known_by` POV filtering | Done — in `getTopKCanonFacts` TTL filter |
| `characters.knowledge_state` maintained by CanonMerger | Done — CanonMerger updates it on fact apply/approve |
| Locked-fact hard-block replaced | Done — `locked_fact` remapped to `duplicate_fact` (no hard block); contradiction requires explicit structured conflict |
| Cosmetic validators removal | Deferred — `anti-llm-patterns.ts` added (Phase 5), existing cosmetics kept until LLM validator replacement is stable |
| Batch resume extends existing behavior | Done — uses `completedChapters` in `generate-batch.ts` |

The "Documentation Status" note about stale flow notes has also been addressed: the pre-check stage is now fully integrated (PacketAuditor pre-write, DeterministicRunner post-write).