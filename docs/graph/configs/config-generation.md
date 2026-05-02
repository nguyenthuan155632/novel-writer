---
type: config
source: packages/core/src/config/generation.ts
---

# Config: Generation

**Type:** Configuration Module  
**Source:** `packages/core/src/config/generation.ts`

## Responsibility
Controls all chapter-generation behaviour: word-count targets and hard-fail bounds, xianxia domain constraints, retry/fix attempt limits, validator severity routing, LLM sampling parameters, batch sizes per generation mode, high-stakes review triggers, and the full matrix of auto-escalation conditions.

## Key Constants

### Word Count Targets & Hard Limits

| Constant | Value | Role |
|---|---|---|
| `CHAPTER_TARGET_WORDS_MIN` | 2000 | Soft lower bound for writer |
| `CHAPTER_TARGET_WORDS_MAX` | 3000 | Soft upper bound for writer |
| `CHAPTER_HARD_FAIL_WORDS_MIN` | 1500 | Below this → pipeline hard-fail |
| `CHAPTER_HARD_FAIL_WORDS_MAX` | 4000 | Above this → pipeline hard-fail |

### Xianxia Domain Constraints

| Constant | Value |
|---|---|
| `MAX_REALM_JUMP_PER_CHAPTER` | 1 |
| `MAX_REALM_JUMP_PER_ARC` | 1 |
| `MAX_NEW_BLOODLINES_PER_ARC` | 2 |

### Retry & Fix Attempt Limits

| Constant | Value |
|---|---|
| `PACKET_REGENERATE_MAX_ATTEMPTS` | 1 |
| `WRITER_RETRY_ON_API_ERROR` | 3 |
| `AUTO_FIX_MAX_ATTEMPTS` | 1 |

### Validator Severity Routing

| Constant | Value | Meaning |
|---|---|---|
| `AUTO_FIX_TRIGGER_SEVERITIES` | `['low', 'medium']` | These severities trigger `AutoFixerAgent` |
| `STOP_SEVERITIES` | `['high', 'critical']` | These severities halt the pipeline |
| `DETERMINISTIC_VALIDATOR_BLOCKING_ON_FAIL` | `true` | A deterministic check failure is a hard block |

### Temperature / Sampling Parameters

| Constant | Value |
|---|---|
| `LLM_VALIDATOR_TEMPERATURE` | 0.1 |
| `WRITER_TEMPERATURE` | 0.85 |
| `WRITER_TOP_P` | 0.95 |

### Batch Sizes per Generation Mode

| Constant | Value |
|---|---|
| `SAFE_MODE_BATCH_SIZE` | 1 |
| `SEMI_AUTO_BATCH_SIZE` | 5 |
| `FULL_AUTO_BATCH_SIZE` | 30 |

### High-Stakes Review Triggers

| Constant | Value |
|---|---|
| `HIGH_STAKES_REVIEW_AT_ARC_END` | `true` |
| `HIGH_STAKES_REVIEW_ON_CRITICAL` | `true` |

### Auto-Escalate to Safe Mode (sub-object)

| Sub-key | Value |
|---|---|
| `FIRST_CHAPTER_OF_STORY` | `true` |
| `FIRST_CHAPTER_OF_ARC` | `true` |
| `LAST_CHAPTER_OF_ARC` | `true` |
| `ON_VALIDATOR_HIGH` | `true` |
| `ON_VALIDATOR_CRITICAL` | `true` |
| `ON_BLOCKING_CONFLICT` | `true` |

## Exported Types
- `GenerationConfig` — TypeScript type inferred via `typeof GENERATION_CONFIG`

## Depends on
- [[packages/package-core]]

## Used by
- [[configs/config-effective]] — included as the `generation` slice of `EffectiveConfig`
- [[jobs/job-generate-chapter]] — reads batch sizes, retry counts, severity routing
- [[agents/writer]] — reads `WRITER_TEMPERATURE`, `WRITER_TOP_P`, word targets
- [[agents/auto-fixer]] — reads `AUTO_FIX_TRIGGER_SEVERITIES`, `AUTO_FIX_MAX_ATTEMPTS`
- [[agents/llm-validator]] — reads `LLM_VALIDATOR_TEMPERATURE`, `STOP_SEVERITIES`
- [[agents/packet-generator]] — reads `PACKET_REGENERATE_MAX_ATTEMPTS`
- [[configs/policy-mode-escalation]] — escalation flags in `AUTO_ESCALATE_TO_SAFE_MODE`

## Related domain concepts
- [[configs/policy-mode-escalation]] — implements the safe-mode escalation logic driven by `AUTO_ESCALATE_TO_SAFE_MODE`
- [[configs/policy-high-stakes-triggers]] — determines when to queue the high-stakes reviewer based on severity
- [[configs/config-long-form]] — carries overlapping `HIGH_STAKES_REVIEW_AT_ARC_END` flag at the structural planning level

## Notes
- `AUTO_FIX_MAX_ATTEMPTS: 1` is intentionally low — the system prefers hard-stopping on unresolvable issues over retry loops.
- The hard-fail word window (1500–4000) is intentionally wider than the target window (2000–3000) to give the writer latitude before triggering a pipeline failure.
- `DETERMINISTIC_VALIDATOR_BLOCKING_ON_FAIL: true` means the deterministic check (word counts, realm jumps, bloodlines) acts as a hard gate before the LLM validator runs.
