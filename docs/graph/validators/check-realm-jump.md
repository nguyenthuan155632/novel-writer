---
type: validator-check
source: packages/ai/src/validators/deterministic/realm-jump.ts
---
# Check: realm_jump
**Severity:** critical
**Logic:** Detects more than 1 realm breakthrough per chapter (cultivation genres only). MAX_REALM_JUMP_PER_CHAPTER=1.
**Source:** `packages/ai/src/validators/deterministic/realm-jump.ts`
**Applies to:** cultivation, martial genre families only
**Config:** [[configs/config-generation]]
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/realm-jump.ts
---
# Check: realm_jump
**Severity:** critical
Detects >1 realm breakthrough per chapter (cultivation/martial genres only). MAX=1.
**Source:** `packages/ai/src/validators/deterministic/realm-jump.ts`
**Config:** [[configs/config-generation]] — MAX_REALM_JUMP_PER_CHAPTER
**Used by:** [[validators/deterministic-runner]]
## Check: realm_jump — Recent Change (2026-05-05)
`realm_jump_excess` now emits at most 1 issue per packet (breakCount moved outside character loop), eliminating duplicate violations when multiple characters break realm in same chapter.