---
type: domain-concept
---

# Domain: Character

**Type:** Domain Concept

## Description
A character is a named entity in the story world — protagonist, antagonist, or supporting cast. Characters carry cultivation state (realm), vital status, abilities, and bloodlines. This state is authoritative: the generation pipeline's deterministic validators consult character records to enforce narrative consistency (e.g., dead characters cannot act; realm jumps must be legal).

## Key Properties / Rules
- `name` — unique identifier within the story
- `currentRealm` — current cultivation level (xianxia genre); e.g., `"Foundation Establishment"`, `"Nascent Soul"`. Validated by [[validators/check-realm-jump]] (max 1 realm jump per chapter, 1 per arc)
- `status` — **`alive | dead | unknown`**
  - `dead` characters cannot perform actions; checked by [[validators/check-dead-character]]
- `currentBloodlines` — array of [[domain/bloodline]] IDs currently possessed
- `abilities` — list of known techniques/skills
- `aliases` — alternative names (for recognition in prose)
- `role` — narrative role: `protagonist | antagonist | supporting | background`
- Character deaths are propagated to [[domain/canon-fact]] entries via [[agents/canon-extractor]]
- New characters appearing in prose for the first time are flagged by [[validators/check-unknown-character]]

## Related Database Tables
- [[database/tables/characters]]

## Related Flows
- [[jobs/job-generate-chapter]] — character state is read for context and validated post-generation

## Related Domain Concepts
- [[domain/bloodline]]
- [[domain/canon-fact]]
- [[domain/pending-canon-update]]
- [[domain/xianxia]]

## Implemented By
- `packages/db/src/schema/characters.ts`
- [[validators/check-dead-character]]
- [[validators/check-realm-jump]]
- [[validators/check-unknown-character]]
- [[agents/canon-extractor]] — extracts character state changes
