---
type: domain-concept
---

# Domain: Open Thread

**Type:** Domain Concept

## Description
An open thread is an unresolved narrative question, dangling mystery, or story hook that the writer should remain aware of. Unlike [[domain/planted-seed|planted seeds]] (which have a scheduled payoff chapter), open threads represent ongoing dramatic tension that may resolve organically or at the planner's discretion. They are surfaced to the writer via the WARM context tier to prevent the AI from inadvertently resolving or forgetting them.

## Key Properties / Rules
- `title` — brief label for the thread (e.g., "Who killed Master Chen?", "The sealed gate in the Northern Tomb")
- `description` — fuller explanation of the unresolved question
- `openedChapter` — chapter number where this thread was introduced or first noted
- `plannedResolutionChapter` (optional) — soft target for resolution; not enforced as a hard constraint
- `status` — **`open | resolved`**
  - `open` threads are included in the **WARM context tier**
  - `resolved` threads are excluded from future context
- Open threads are created/updated via [[domain/pending-canon-update]] with `targetTable = open_threads`
- The writer is expected to respect open threads (not accidentally resolve or contradict them without direction)

## Related Database Tables
- [[database/tables/open-threads]]

## Related Flows
- [[jobs/job-generate-chapter]] — open threads loaded into WARM context tier

## Related Domain Concepts
- [[domain/planted-seed]]
- [[domain/chapter]]
- [[domain/context-tiers]]
- [[domain/pending-canon-update]]
- [[domain/canon-fact]]

## Implemented By
- `packages/db/src/schema/open-threads.ts`
- [[modules/context-builder]] — loads open threads into WARM tier
- [[agents/canon-extractor]] — may create/resolve open threads via pending updates
