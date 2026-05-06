---
type: validator-check
source: packages/ai/src/validators/deterministic/locked-fact.ts
---
# Check: locked_fact
**Severity:** high
**Logic:** Chapter content contradicts a locked canon fact.
**Source:** `packages/ai/src/validators/deterministic/locked-fact.ts`
**Reads:** [[database/tables/canon-facts]] (locked=true)
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/locked-fact.ts
---
# Check: locked_fact
**Severity:** high
Chapter content contradicts a locked canon fact.
**Source:** `packages/ai/src/validators/deterministic/locked-fact.ts`
**Reads:** [[database/tables/canon-facts]] (locked=true)
**Used by:** [[validators/deterministic-runner]]
## Fix (2026-05-06)
Severity is **critical** (not high) — confirmed from `locked-fact.ts` line 5. Logic: chapter content includes topic keyword from a locked fact but omits the locked fact statement itself — indicates a contradiction of established canon.