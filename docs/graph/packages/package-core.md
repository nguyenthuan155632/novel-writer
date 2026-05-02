---
type: package
source: packages/core/src/
---

# Package: @novel/core

## Responsibility
Domain configuration, budget guardrails, model routing, generation policy, catalog definitions, exporters, shared utilities.

## Source Evidence
`packages/core/src/config/` — 7 config modules
`packages/core/src/policy/` — 3 policy modules
`packages/core/src/catalog/` — genres, personalities, story options
`packages/core/src/services/` — admin metrics, exporters

## Key Exports
- `getEffectiveConfig(storyId, provider)` — merges global config with per-story DB overrides
- `checkAgainstCaps()` — budget hard caps
- `modelFor(role)` — resolves model string for agent role
- `shouldRunReviewer()` — high-stakes trigger
- `resolveEffectiveMode()` — mode escalation
- Genre catalog, personality catalog, story options

## Config Modules
- [[configs/config-budget]]
- [[configs/config-generation]]
- [[configs/config-context]]
- [[configs/config-models]]
- [[configs/config-long-form]]
- [[configs/config-effective]]
- [[configs/config-export]]

## Policy Modules
- `policy/budget-guardrails.ts` — [[configs/config-budget]]
- `policy/high-stakes-triggers.ts`
- `policy/mode-escalation.ts`

## Services
- `services/admin-metrics.ts` — [[modules/admin-metrics]]
- `services/exporters/epub-exporter.ts`
- `services/exporters/markdown-exporter.ts`

## Depends On
- [[packages/package-db]] — AdminMetricsService reads DB
- [[external-services/postgresql]] — indirect

## Used By
- [[packages/package-ai]]
- [[apps/app-api]]
- [[apps/app-worker]]
---
type: package
source: packages/core/src/
---

# Package: @novel/core

## Responsibility
Domain configuration, budget guardrails, model routing, generation policy, catalog definitions, exporters, shared utilities.

## Source Evidence
`packages/core/src/config/` — 7 config modules
`packages/core/src/policy/` — 3 policy modules
`packages/core/src/catalog/` — genres, personalities, story options
`packages/core/src/services/` — admin metrics, exporters

## Key Exports
- `getEffectiveConfig(storyId, provider)` — [[configs/config-effective]]
- `checkAgainstCaps()` — [[configs/config-budget]]
- `modelFor(role)` — [[configs/config-models]]
- `shouldRunReviewer()` — high-stakes trigger policy
- `resolveEffectiveMode()` — mode escalation policy
- Genre/personality/story options catalogs

## Config Modules
- [[configs/config-budget]]
- [[configs/config-generation]]
- [[configs/config-context]]
- [[configs/config-models]]
- [[configs/config-long-form]]
- [[configs/config-effective]]
- [[configs/config-export]]

## Services
- [[modules/admin-metrics]]
- `services/exporters/epub-exporter.ts`
- `services/exporters/markdown-exporter.ts`

## Depends On
- [[packages/package-db]]

## Used By
- [[packages/package-ai]]
- [[apps/app-api]]
- [[apps/app-worker]]
