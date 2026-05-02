---
type: domain-concept
---

# Domain: Generation Mode

**Type:** Domain Concept

## Description
Generation mode controls how many chapters are generated per batch and whether human approval is required between chapters. It is the primary safety lever for maintaining narrative quality at scale. Modes can be set manually per generation request or configured as a default in `story_settings`; the pipeline can also **auto-escalate** to `safe` mode when risk factors are detected.

## Modes

| Mode | Batch Size | Human Approval |
|------|-----------|---------------|
| `safe` | 1 chapter | Required before each chapter |
| `semi_auto` | 5 chapters | Required per batch |
| `full_auto` | 30 chapters | Not required |

## Auto-Escalation to `safe` Mode
The pipeline automatically escalates to `safe` mode (overriding the configured mode) when **any** of the following conditions are met:
- First chapter of the story
- First chapter of an [[domain/arc]] (arc boundary)
- Last chapter of an [[domain/arc]] (arc boundary)
- [[validators/check-locked-fact]] or [[validators/check-realm-jump]] report a `high` or `critical` severity finding
- A [[domain/pending-canon-update]] with `conflictStatus = blocking` exists

## Per-Story Configuration
Default generation mode is stored in [[database/tables/story-settings]] and loaded via `getEffectiveConfig(storyId, provider)`. It can be overridden per-request via the API.

## Related Database Tables
- [[database/tables/story-settings]]
- [[database/tables/batches]]

## Related Flows
- [[jobs/job-generate-batch]] — reads mode to compute batch size
- [[jobs/job-generate-chapter]] — enforces escalation checks

## Related Domain Concepts
- [[domain/story]]
- [[domain/arc]]
- [[domain/chapter]]
- [[domain/pending-canon-update]]

## Implemented By
- `packages/core/src/config/generation.ts` — `GENERATION_CONFIG.modes`
- `packages/core/src/policy/budget-guardrails.ts` — mode interacts with budget caps
- [[configs/policy-mode-escalation]] — escalation policy rules
