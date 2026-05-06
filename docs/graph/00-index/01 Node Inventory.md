---
type: index
---

# Node Inventory

Complete list of every atomic note in the vault, organised by folder.

---

## Apps (3)
- [[apps/app-api]]
- [[apps/app-web]]
- [[apps/app-worker]]

---

## Packages (3)
- [[packages/package-ai]]
- [[packages/package-core]]
- [[packages/package-db]]

---

## Routes (16)
- [[routes/admin]]
- [[routes/arcs]]
- [[routes/batches]]
- [[routes/bible]]
- [[routes/canon-facts]]
- [[routes/chapters]]
- [[routes/costs]]
- [[routes/exports]]
- [[routes/health]]
- [[routes/pending-updates]]
- [[routes/reviews]]
- [[routes/sagas]]
- [[routes/seeds]]
- [[routes/stories]]
- [[routes/story-settings]]
- [[routes/timeline]]

---

## Agents (11)
- [[agents/writer]]
- [[agents/bible-generator]]
- [[agents/packet-generator]]
- [[agents/saga-planner]]
- [[agents/arc-planner]]
- [[agents/canon-extractor]]
- [[agents/llm-validator]]
- [[agents/auto-fixer]]
- [[agents/summary-compactor]]
- [[agents/arc-summary-compactor]]
- [[agents/high-stakes-reviewer]]

---

## Validators (14)
- [[validators/deterministic-runner]]
- [[validators/packet-auditor]]
- [[validators/check-word-count]]
- [[validators/check-dead-character]]
- [[validators/check-unknown-character]]
- [[validators/check-unknown-location]]
- [[validators/check-forbidden-move]]
- [[validators/check-locked-fact]]
- [[validators/check-realm-jump]]
- [[validators/check-repetition]]
- [[validators/check-cliffhanger]]
- [[validators/check-conflict-presence]]
- [[validators/check-style-red-flags]]
- [[validators/check-new-bloodline-source]]

---

## Jobs (6)
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]
- [[jobs/job-generate-export]]
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]
- [[jobs/job-high-stakes-review]]

---

## Workers (2)
- [[workers/worker-main]]
- [[workers/queues]]

---

## AI Providers (6)
- [[ai-providers/provider-interface]]
- [[ai-providers/provider-openrouter]]
- [[ai-providers/provider-opencode]]
- [[ai-providers/provider-ollama]]
- [[ai-providers/provider-vmlx]]
- [[ai-providers/provider-mock]]

---

## Prompts (15)
- [[prompts/prompt-registry]]
- [[prompts/prompt-writer-v2]]
- [[prompts/prompt-bible-generator-v2]]
- [[prompts/prompt-packet-generator-v2]]
- [[prompts/prompt-saga-planner-v2]]
- [[prompts/prompt-arc-planner-v2]]
- [[prompts/prompt-canon-extractor-v2]]
- [[prompts/prompt-llm-validator-v2]]
- [[prompts/prompt-auto-fixer-v2]]
- [[prompts/prompt-summary-compactor-v2]]
- [[prompts/prompt-arc-summary-compactor-v2]]
- [[prompts/prompt-high-stakes-reviewer-v2]]
- [[prompts/contract-genre]]
- [[prompts/contract-personality]]
- [[prompts/contract-story-options]]

---

## Modules (26)

### Context sub-system (8)
- [[modules/context-builder]]
- [[modules/context-cache-keys]]
- [[modules/context-compact]]
- [[modules/context-past-reference]]
- [[modules/context-retrieval]]
- [[modules/context-serialize]]
- [[modules/context-shrink]]
- [[modules/context-types]]

### Canon & validation (3)
- [[modules/canon-merger]]
- [[modules/conflict-detector]]
- [[modules/validation-logger]]

### LLM infrastructure (4)
- [[modules/parse-completion-json]]
- [[modules/llm-call-logger]]
- [[modules/provider-switcher]]
- [[modules/embedding-service]]

### Policy (3)
- [[modules/policy-high-stakes-triggers]]
- [[modules/policy-mode-escalation]]
- [[modules/budget-guard]]

### Export (2)
- [[modules/epub-exporter]]
- [[modules/markdown-exporter]]

### Cost & metrics (2)
- [[modules/cost-tracker]]
- [[modules/admin-metrics]]

### Queue & domain (2)
- [[modules/queue-client]]
- [[modules/story-domain]]

### Utilities (2)
- [[modules/logger]]
- [[modules/trace]]

---

## Configs (11)
- [[configs/config-effective]]
- [[configs/config-models]]
- [[configs/config-budget]]
- [[configs/config-generation]]
- [[configs/config-context]]
- [[configs/config-long-form]]
- [[configs/config-export]]
- [[configs/config-llm-provider]]
- [[configs/policy-budget-guardrails]]
- [[configs/policy-high-stakes-triggers]]
- [[configs/policy-mode-escalation]]

---

## Domain Concepts (16)
- [[domain/story]]
- [[domain/chapter]]
- [[domain/chapter-packet]]
- [[domain/arc]]
- [[domain/saga]]
- [[domain/planted-seed]]
- [[domain/character]]
- [[domain/canon-fact]]
- [[domain/pending-canon-update]]
- [[domain/bloodline]]
- [[domain/faction]]
- [[domain/open-thread]]
- [[domain/context-tiers]]
- [[domain/xianxia]]
- [[domain/generation-mode]]
- [[domain/story-bible]]

---

## Database Tables (23)
- [[database/tables/stories]]
- [[database/tables/story-bibles]]
- [[database/tables/story-settings]]
- [[database/tables/sagas]]
- [[database/tables/arcs]]
- [[database/tables/chapters]]
- [[database/tables/chapter-packets]]
- [[database/tables/chapter-summaries]]
- [[database/tables/characters]]
- [[database/tables/canon-facts]]
- [[database/tables/pending-canon-updates]]
- [[database/tables/planted-seeds]]
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/bloodlines]]
- [[database/tables/factions]]
- [[database/tables/batches]]
- [[database/tables/validations]]
- [[database/tables/high-stakes-reviews]]
- [[database/tables/llm-calls]]
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]
- [[database/tables/context-packets]]

---

## Flows (4)
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]
- [[flows/llm-provider-flow]]
- [[flows/job-worker-flow]]

---

## Errors (5)
- [[errors/error-budget-exceeded]]
- [[errors/error-canon-conflict]]
- [[errors/error-validation-failure]]
- [[errors/error-generation-blocked]]
- [[errors/error-high-stakes-escalation]]

---

## External Services (7)
- [[external-services/service-postgresql]]
- [[external-services/service-redis]]
- [[external-services/service-bullmq]]
- [[external-services/service-openrouter]]
- [[external-services/service-opencode]]
- [[external-services/service-ollama]]
- [[external-services/service-vmlx]]

---

## Architecture (1)
- [[architecture/system-architecture]]

---

## Database Overview (1)
- [[database/database-erd]]

---

## Pipelines (1)
- [[pipelines/chapter-generation-pipeline]]
## Agents (12) — added 1
- [[agents/writer]] · [[agents/bible-generator]] · [[agents/packet-generator]]
- [[agents/saga-planner]] · [[agents/arc-planner]] · [[agents/canon-extractor]]
- [[agents/llm-validator]] · [[agents/auto-fixer]] · [[agents/summary-compactor]]
- [[agents/arc-summary-compactor]] · [[agents/high-stakes-reviewer]]
- [[agents/conflict-resolver]] ·
## Prompts (17) — added 2
- [[prompts/prompt-registry]] · [[prompts/prompt-writer-v2]] · [[prompts/prompt-bible-generator-v2]]
- [[prompts/prompt-packet-generator-v2]] · [[prompts/prompt-saga-planner-v2]] · [[prompts/prompt-arc-planner-v2]]
- [[prompts/prompt-canon-extractor-v2]] · [[prompts/prompt-llm-validator-v2]] · [[prompts/prompt-auto-fixer-v2]]
- [[prompts/prompt-summary-compactor-v2]] · [[prompts/prompt-arc-summary-compactor-v2]] · [[prompts/prompt-high-stakes-reviewer-v2]]
- [[prompts/prompt-polish-pass.v1]] · [[prompts/role-frames]]
- [[prompts/contract-genre]] · [[prompts/contract-personality]] · [[prompts/contract-story-options]]
## Validators (15) — added 1
- [[validators/deterministic-runner]] · [[validators/packet-auditor]]
- [[validators/check-word-count]] · [[validators/check-dead-character]] · [[validators/check-unknown-character]]
- [[validators/check-unknown-location]] · [[validators/check-locked-fact]] · [[validators/check-forbidden-move]]
- [[validators/check-realm-jump]] · [[validators/check-repetition]] · [[validators/check-cliffhanger]]
- [[validators/check-conflict-presence]] · [[validators/check-style-red-flags]] · [[validators/check-new-bloodline-source]]
- [[validators/anti-llm-patterns]] ·
## Fix (2026-05-06)
The inventory now has duplicate entries (original counts + append sections). Needs consolidation: agents should be 12, prompts 17, validators 15. The appends at the bottom are the corrected counts.
## Correction (2026-05-06) — Duplicate Append Sections Need Consolidation
The bottom of this file has two append sections added in the last session that duplicate information already present in the main body:
- The "Agents (12) — added 1" and "Prompts (17) — added 2" and "Validators (15) — added 1" appends repeat info already in the main list above.
- The "Fix (2026-05-06)" append at the very bottom correctly notes the duplication problem.
When next editing this file, consolidate: agents should be 12, prompts should be 17, validators should be 14 (anti-llm-patterns was added but check-repetition/check-cliffhanger/check-conflict-presence/check-style-red-flags are now LLM-validated, not separate deterministic check files — so 14 not 15). Remove the duplicate append sections and update the main list counts to the correct numbers.