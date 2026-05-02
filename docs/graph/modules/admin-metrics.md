---
type: module
source: packages/core/src/services/admin-metrics.ts
---

# Module: Admin Metrics Service

## Responsibility
SQL queries for 5 types of operational metrics exposed on the admin dashboard.

## Source Evidence
`packages/core/src/services/admin-metrics.ts` — `AdminMetricsService`

## Metrics Provided
1. `cacheHitRates` — from [[database/tables/context-packets]]
2. `costRolling7d` — from [[database/tables/llm-calls]] grouped by day
3. `validatorFailures` — from [[database/tables/validations]] grouped by severity
4. `autoFix` — from [[database/tables/llm-calls]] for `auto_fixer` role
5. `pendingCanonAging` — from [[database/tables/pending-canon-updates]] bucketed by age

## Used By
- [[routes/route-admin]] (`GET /admin/metrics`)

## Related Tables
- [[database/tables/context-packets]]
- [[database/tables/llm-calls]]
- [[database/tables/validations]]
- [[database/tables/pending-canon-updates]]
---
type: module
source: packages/core/src/services/admin-metrics.ts
---

# Module: Admin Metrics Service

## Responsibility
SQL queries for 5 operational metric types used on the admin dashboard.

## Source Evidence
`packages/core/src/services/admin-metrics.ts` — `AdminMetricsService`

## Metrics
1. `cacheHitRates` — from [[database/tables/context-packets]]
2. `costRolling7d` — from [[database/tables/llm-calls]] grouped by day
3. `validatorFailures` — from [[database/tables/validations]] grouped by severity
4. `autoFix` — from [[database/tables/llm-calls]] for `auto_fixer` role
5. `pendingCanonAging` — from [[database/tables/pending-canon-updates]] bucketed by age

## Used By
- [[routes/route-admin]] (GET /admin/metrics)
