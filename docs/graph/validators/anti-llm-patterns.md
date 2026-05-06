---
type: validator
source: packages/ai/src/validators/anti-llm-patterns.ts
---

# Validator: Anti-LLM Patterns

## Responsibility
Detects common LLM generation artifacts that degrade prose quality: repetitive sentence structures, generic transitions, tell-not-show narration, and pattern-saturated dialogue tags.

## Source Evidence
`packages/ai/src/validators/anti-llm-patterns.ts`

## Checks
- Monotone sentence structures (repeated length/pattern)
- Generic chapter transitions (formulaic bridge sentences)
- Tell-not-show narration blocks
- Pattern-saturated dialogue tags
- Overused certain朝/却/于是 patterns in Vietnamese

## Severity
medium

## Used By
[[validators/deterministic-runner]]

## Related Flows
[[flows/validation-flow]]
## Correction (2026-05-06)
Severity is `low`, not `medium`. Not yet wired into `buildChecks()` — available as standalone utility. Exported via `@novel/ai` index.
## Correction (2026-05-06) — "Used By: deterministic-runner" Is Inaccurate
anti-llm-patterns is NOT wired into `buildChecks()` and does not run as part of the deterministic validation pipeline. It is exported as a standalone utility from `@novel/ai` and available for future integration. Remove the "Used By: [[validators/deterministic-runner]]" claim.