---
type: config
source: packages/core/src/config/long-form.ts
---

# Config: Long-Form

**Type:** Configuration Module  
**Source:** `packages/core/src/config/long-form.ts`

## Responsibility
Controls the structural planning parameters for 500–1000-chapter xianxia novels: saga count ranges, arc count ranges, plot-seed planning ranges, rolling-summary refresh cadences, and the master switches for safe-mode auto-escalation and high-stakes arc-end reviews.

## Key Constants

### Structural Planning Ranges

| Constant | Min | Max | Description |
|---|---|---|---|
| `SAGA_COUNT_RANGE` | 5 | 8 | Number of sagas in a complete novel |
| `SEEDS_PER_SAGA_PLAN_RANGE` | 10 | 30 | Plot seeds planted per saga during planning |
| `ARC_COUNT_PER_SAGA_RANGE` | 2 | 5 | Arcs within each saga |

### Rolling Summary Refresh Cadence

| Constant | Value |
|---|---|
| `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` | 5 |
| `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` | 20 |

### Policy Flags

| Constant | Value | Effect |
|---|---|---|
| `AUTO_ESCALATE_TO_SAFE_MODE` | `true` | Master switch — enables arc-boundary and blocking-conflict escalation in `resolveEffectiveMode()` |
| `HIGH_STAKES_REVIEW_AT_ARC_END` | `true` | Enables arc-end trigger in `shouldRunReviewer()` |

## Exported Types
- `LongFormConfig` — TypeScript type inferred via `typeof LONG_FORM_CONFIG`

## Depends on
- [[packages/package-core]]

## Used by
- [[configs/config-effective]] — included as the `longForm` slice of `EffectiveConfig`
- [[configs/policy-high-stakes-triggers]] — reads `HIGH_STAKES_REVIEW_AT_ARC_END`
- [[configs/policy-mode-escalation]] — reads `AUTO_ESCALATE_TO_SAFE_MODE` as the master switch
- [[agents/saga-planner]] — uses `SAGA_COUNT_RANGE`, `SEEDS_PER_SAGA_PLAN_RANGE`, `ARC_COUNT_PER_SAGA_RANGE`
- [[agents/arc-planner]] — uses `ARC_COUNT_PER_SAGA_RANGE`
- [[jobs/job-refresh-arc-summary]] — governed by `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`
- [[jobs/job-refresh-saga-summary]] — governed by `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`

## Related domain concepts
- [[configs/config-context]] — mirrors the rolling-summary cadence constants; `config-long-form` is authoritative for structural planning, `config-context` is authoritative for token-budget assembly
- [[configs/config-generation]] — also carries `HIGH_STAKES_REVIEW_AT_ARC_END` and `HIGH_STAKES_REVIEW_ON_CRITICAL` flags at the per-chapter generation level

## Notes
- `AUTO_ESCALATE_TO_SAFE_MODE: true` is the global master switch. When set to `false` (e.g. via a per-story override), `resolveEffectiveMode()` short-circuits immediately and returns the user-chosen mode without any DB queries.
- `SEEDS_PER_SAGA_PLAN_RANGE` (10–30) is intentionally broad to allow [[agents/saga-planner]] to seed rich narrative threads that future arcs can pick up.
- Per-story overrides can adjust `SAGA_COUNT_RANGE` etc. to produce shorter/longer novels via `story_settings.overrides.longForm`.
