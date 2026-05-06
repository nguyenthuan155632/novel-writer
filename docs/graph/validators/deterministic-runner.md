---
type: validator
source: packages/ai/src/validators/deterministic/runner.ts
---

# Validator: Deterministic Runner

## Responsibility
Builds and executes the suite of deterministic (no-LLM) checks on generated chapter content. Short-circuits on first critical failure. Sorted by severity: critical first.

## Source Evidence
`packages/ai/src/validators/deterministic/runner.ts`
- `buildChecks(forbiddenRulesText, genreFamily)` — selects applicable checks
- `runDeterministicValidator(input)` — executes checks

## Inputs
- `CheckInput`: chapter content, packet, characters, canon facts, bible (forbiddenRules), genre family
- `forbiddenRulesText` — from story bible

## Outputs
- Array of `CheckResult`: `{ checkId, severity, pass, message }`
- Persisted to [[database/tables/chapters]].`deterministicValidation`

## Checks Included (12 total)
- [[validators/check-word-count]]
- [[validators/check-dead-character]]
- [[validators/check-realm-jump]]
- [[validators/check-locked-fact]]
- [[validators/check-forbidden-move]]
- [[validators/check-unknown-character]]
- [[validators/check-unknown-location]]
- [[validators/check-new-bloodline-source]] (cultivation genres only)
- [[validators/check-cliffhanger]]
- [[validators/check-conflict-presence]]
- [[validators/check-style-red-flags]]
- [[validators/check-repetition]]

## Short-circuit Logic
Stops processing after first `critical` severity failure.

## Genre-specific Checks
`new_bloodline_source` and `realm_jump` only apply to `cultivation` and `martial` genre families.

## Used By
- [[jobs/job-generate-chapter]] (Stage 6)
- [[pipelines/chapter-generation-pipeline]]

## Related Flows
- [[flows/validation-flow]]
---
type: validator
source: packages/ai/src/validators/deterministic/runner.ts
---

# Validator: Deterministic Runner

## Responsibility
Builds and executes the suite of 12 deterministic (no-LLM) checks. Short-circuits on first critical failure. Sorted critical-first.

## Source Evidence
`packages/ai/src/validators/deterministic/runner.ts`
- `buildChecks(forbiddenRulesText, genreFamily)`
- `runDeterministicValidator(input)`

## Checks (12 total)
- [[validators/check-word-count]] (high)
- [[validators/check-dead-character]] (critical)
- [[validators/check-realm-jump]] (critical, cultivation only)
- [[validators/check-locked-fact]] (high)
- [[validators/check-forbidden-move]] (high)
- [[validators/check-unknown-character]] (medium)
- [[validators/check-unknown-location]] (medium)
- [[validators/check-new-bloodline-source]] (medium, cultivation only)
- [[validators/check-cliffhanger]] (low)
- [[validators/check-conflict-presence]] (low)
- [[validators/check-style-red-flags]] (medium)
- [[validators/check-repetition]] (low)

## Short-circuit
Stops after first critical failure.

## Genre Filtering
`new_bloodline_source` and `realm_jump` only for `cultivation`/`martial` genre families.

## Used By
- [[jobs/job-generate-chapter]] (Stage 6)
- [[pipelines/chapter-generation-pipeline]]

## Related Flows
- [[flows/validation-flow]]
## Fix (2026-05-06)
Runner now executes **9 checks** (not 12). The following were retired from the deterministic runner and migrated to LLM validation:
- `cliffhanger` (now LLM-validated)
- `conflict-presence` (now LLM-validated)
- `style-red-flags` (now LLM-validated)
- `repetition` (now LLM-validated)

Updated check list:
- `dead-character-check` (critical)
- `realm-jump-check` (critical, cultivation only)
- `new-bloodline-source-check` (medium, cultivation only)
- `locked-fact-check` (critical — severity raised from high)
- `forbidden-move-check` (high)
- `word-count-check` (high)
- `unknown-character-check` (medium)
- `unknown-location-check` (medium)
- `unknown-faction-check` (medium — added post-Phase 1)

`unknown_faction_check` (from `unknown-faction.ts`) is now included. Runner also supports `pendingVerification` mechanism for `llmVerifiable` checks that defer to LLM confirmation before counting failures.
## Severity Corrections (2026-05-06)
- `locked-fact-check` severity is **critical** (not high) — confirmed from source
- `unknown-faction-check` severity is **low** (not medium) — confirmed from source
- `verifier.ts` exists and handles `PendingVerificationItem` LLM-confirmation flow (deferred failures from checks marked `llmVerifiable`)
## Correction (2026-05-06) — First Block Still Lists 12 Checks
The first YAML frontmatter block (lines 1-17) and the first markdown block (lines 19-85) still show "12 total" checks and list all 12 check names including the 4 retired ones. Only the "Fix (2026-05-06)" section at the end reflects the correct 9-check state. When next editing this file, consolidate the first blocks to match the corrected 9-check list and remove the retired check entries.