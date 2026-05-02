---
type: flow
---

# Flow: Validation

**Type:** System Flow

## Overview

Two-stage validation pipeline that checks generated chapter content for canon integrity and narrative quality. Stage 1 is deterministic (no LLM, fast, 12 checks). Stage 2 uses an LLM. [[agents/auto-fixer]] handles low/medium issues automatically; high/critical findings halt generation and escalate to safe mode.

## Diagram

```mermaid
flowchart TD
    A[Chapter content produced by WriterAgent] --> B[DeterministicRunner]
    B --> C1[check-word-count]
    B --> C2[check-dead-character]
    B --> C3[check-unknown-character]
    B --> C4[check-unknown-location]
    B --> C5[check-locked-fact]
    B --> C6[check-forbidden-move]
    B --> C7[check-realm-jump]
    B --> C8[check-new-bloodline-source]
    B --> C9[check-cliffhanger]
    B --> C10[check-conflict-presence]
    B --> C11[check-repetition]
    B --> C12[check-style-red-flags]
    B -->|aggregate results| D{Any blocking / critical fails?}
    D -->|yes| E["PacketAuditor: retry packet\n(max 1 attempt)\n→ error-generation-blocked"]
    D -->|no| F[LlmValidatorAgent]
    F --> G{LLM severity}
    G -->|"low / medium"| H["AutoFixerAgent\nmax 1 attempt\nrewrites chapter"]
    G -->|"high / critical"| I["Escalate to safe mode + stop\n→ error-validation-failure"]
    G -->|pass| J[Validation logged to validations table]
    H --> J
```

## Stage 1 — Deterministic (12 Checks)

All checks run in one pass; sorted critical-first; short-circuits on first `critical` failure.

| Check | Severity | Condition |
|-------|----------|-----------|
| [[validators/check-word-count]] | high | Content too short |
| [[validators/check-dead-character]] | critical | Dead char referenced alive |
| [[validators/check-realm-jump]] | critical | Cultivation realm skipped (cultivation/martial only) |
| [[validators/check-locked-fact]] | high | Locked canon fact contradicted |
| [[validators/check-forbidden-move]] | high | Forbidden plot move used |
| [[validators/check-unknown-character]] | medium | Unknown character referenced |
| [[validators/check-unknown-location]] | medium | Unknown location referenced |
| [[validators/check-new-bloodline-source]] | medium | New bloodline introduced (cultivation only) |
| [[validators/check-cliffhanger]] | low | Chapter ends without hook |
| [[validators/check-conflict-presence]] | low | No meaningful conflict in chapter |
| [[validators/check-style-red-flags]] | medium | Style rule violations from bible |
| [[validators/check-repetition]] | low | Excessive repetition detected |

Runner: [[validators/deterministic-runner]] — `buildChecks()` + `runDeterministicValidator()`

## Stage 2 — LLM Validation

[[agents/llm-validator]] evaluates style consistency, narrative voice, and logic coherence.  
Output: `{ pass, issues: [{code, severity, message}], summary }`  
Temperature: 0.1

## Stage 3 — Auto-Fix (Conditional)

[[agents/auto-fixer]] runs when max severity ≤ `medium`.  
- Max 1 attempt (`AUTO_FIX_MAX_ATTEMPTS = 1`)  
- Rewrites chapter content addressing all listed issues  
- On success: generation continues to canon extraction  
- `high`/`critical`: auto-fixer does NOT run; generation escalates

## Participants

- [[validators/deterministic-runner]]
- [[validators/check-word-count]], [[validators/check-dead-character]], [[validators/check-unknown-character]], [[validators/check-unknown-location]], [[validators/check-locked-fact]], [[validators/check-forbidden-move]], [[validators/check-realm-jump]], [[validators/check-new-bloodline-source]], [[validators/check-cliffhanger]], [[validators/check-conflict-presence]], [[validators/check-repetition]], [[validators/check-style-red-flags]]
- [[agents/llm-validator]]
- [[agents/auto-fixer]]
- [[validators/packet-auditor]] (pre-write blocking check)

## Triggers

- Called after [[agents/writer]] produces chapter content (post-write)
- [[validators/packet-auditor]] also runs deterministic checks pre-write on the planning packet
- Both are part of [[flows/chapter-generation-flow]]

## Outputs / Side Effects

- [[database/tables/validations]] — all `CheckResult` records persisted (both deterministic + LLM)
- [[database/tables/chapters]] — `deterministicValidation` JSON field updated; content may be replaced by auto-fixer

## Error Paths

- Critical deterministic failure → [[errors/error-generation-blocked]]
- LLM high/critical finding → [[errors/error-validation-failure]]

## Related Flows

- [[flows/chapter-generation-flow]]
- [[flows/llm-provider-flow]]
