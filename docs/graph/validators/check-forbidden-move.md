---
type: validator-check
source: packages/ai/src/validators/deterministic/forbidden-move.ts
---
# Check: forbidden_move
**Severity:** high
**Logic:** Chapter content triggers forbidden rules defined in the story bible.
**Source:** `packages/ai/src/validators/deterministic/forbidden-move.ts`
**Reads:** [[database/tables/story-bibles]].forbiddenRules
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/forbidden-move.ts
---
# Check: forbidden_move
**Severity:** high
Content triggers forbidden rules from story bible.
**Source:** `packages/ai/src/validators/deterministic/forbidden-move.ts`
**Reads:** [[database/tables/story-bibles]].forbiddenRules
**Used by:** [[validators/deterministic-runner]]
## Check: forbidden_move — Recent Change (2026-05-05)
`extractForbiddenRules()` logic unified into [[validators/utils.ts]] and shared by both [[validators/packet-auditor]] and `check-forbidden-move.ts`. Prefix-stripping semantics now consistent.