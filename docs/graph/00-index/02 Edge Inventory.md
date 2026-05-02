---
type: index
---

# Edge Inventory

All key relationships (directed edges) in the atomic code graph, organised by sub-system.  
Format: **Source** → _relationship_ → **Target**

---

## Generation Pipeline Edges

### Main pipeline orchestration
- [[jobs/job-generate-chapter]] → calls → [[agents/packet-generator]]
- [[jobs/job-generate-chapter]] → calls → [[validators/packet-auditor]]
- [[jobs/job-generate-chapter]] → calls → [[validators/deterministic-runner]]
- [[jobs/job-generate-chapter]] → calls → [[agents/writer]]
- [[jobs/job-generate-chapter]] → calls → [[agents/llm-validator]]
- [[jobs/job-generate-chapter]] → calls → [[agents/auto-fixer]] _(on low/medium severity)_
- [[jobs/job-generate-chapter]] → calls → [[agents/canon-extractor]]
- [[jobs/job-generate-chapter]] → calls → [[modules/canon-merger]]
- [[jobs/job-generate-chapter]] → calls → [[agents/summary-compactor]]
- [[jobs/job-generate-chapter]] → enqueues → [[jobs/job-refresh-arc-summary]]
- [[jobs/job-generate-chapter]] → enqueues → [[jobs/job-high-stakes-review]] _(conditional)_
- [[jobs/job-generate-batch]] → spawns → [[jobs/job-generate-chapter]]

### Mode escalation
- [[jobs/job-generate-chapter]] → calls → [[modules/policy-mode-escalation]]
- [[jobs/job-generate-batch]] → calls → [[modules/policy-mode-escalation]]
- [[modules/policy-mode-escalation]] → reads → [[database/tables/pending-canon-updates]] _(blocking check)_
- [[modules/policy-mode-escalation]] → reads → [[database/tables/arcs]] _(arc boundary check)_

### High-stakes review trigger
- [[jobs/job-generate-chapter]] → calls → [[modules/policy-high-stakes-triggers]]
- [[modules/policy-high-stakes-triggers]] → reads arc boundary from → [[database/tables/arcs]]
- [[jobs/job-high-stakes-review]] → calls → [[agents/high-stakes-reviewer]]

### Batch pipeline
- [[routes/batches]] → enqueues → [[jobs/job-generate-batch]]
- [[jobs/job-generate-batch]] → reads → [[database/tables/batches]]
- [[jobs/job-generate-batch]] → writes → [[database/tables/batches]]

### Export pipeline
- [[routes/exports]] → enqueues → [[jobs/job-generate-export]]
- [[jobs/job-generate-export]] → calls → [[modules/epub-exporter]] _(epub format)_
- [[jobs/job-generate-export]] → calls → [[modules/markdown-exporter]] _(markdown format)_
- [[modules/epub-exporter]] → reads → [[database/tables/chapters]]
- [[modules/epub-exporter]] → reads → [[database/tables/stories]]
- [[modules/markdown-exporter]] → reads → [[database/tables/chapters]]
- [[modules/markdown-exporter]] → reads → [[database/tables/stories]]

---

## Context Build Edges

### Context builder assembly
- [[modules/context-builder]] → calls → [[modules/context-retrieval]]
- [[modules/context-builder]] → calls → [[modules/context-shrink]] _(when over token budget)_
- [[modules/context-builder]] → calls → [[modules/context-cache-keys]] _(hash HOT + WARM tiers)_
- [[modules/context-builder]] → calls → [[modules/context-past-reference]] _(detect flashback keywords)_
- [[modules/context-builder]] → calls → [[modules/embedding-service]] _(for vector canon retrieval)_
- [[modules/context-builder]] → writes → [[database/tables/context-packets]]

### HOT tier retrieval
- [[modules/context-retrieval]] → reads → [[database/tables/story-bibles]] _(HOT)_

### WARM tier retrieval
- [[modules/context-retrieval]] → reads → [[database/tables/sagas]] _(WARM)_
- [[modules/context-retrieval]] → reads → [[database/tables/arcs]] _(WARM)_
- [[modules/context-retrieval]] → reads → [[database/tables/characters]] _(WARM)_
- [[modules/context-retrieval]] → reads → [[database/tables/open-threads]] _(WARM)_
- [[modules/context-retrieval]] → reads → [[database/tables/planted-seeds]] _(WARM + COLD)_

### COLD tier retrieval
- [[modules/context-retrieval]] → reads → [[database/tables/chapter-summaries]] _(COLD — recent summaries)_
- [[modules/context-retrieval]] → reads → [[database/tables/canon-facts]] _(COLD — pgvector top-K)_

### Context compaction & injection
- [[modules/context-compact]] → is called by → [[modules/context-retrieval]]
- [[modules/context-shrink]] → applies SHRINK_ORDER from → [[configs/config-context]]
- [[modules/context-serialize]] → is called by → [[modules/context-cache-keys]]
- [[modules/context-builder]] → provides ChapterContext to → [[agents/writer]]
- [[modules/context-builder]] → provides ChapterContext to → [[agents/packet-generator]]
- [[modules/context-builder]] → provides ChapterContext to → [[agents/llm-validator]]

---

## Validation Flow Edges

### Deterministic validation
- [[validators/deterministic-runner]] → runs → [[validators/check-word-count]]
- [[validators/deterministic-runner]] → runs → [[validators/check-dead-character]]
- [[validators/deterministic-runner]] → runs → [[validators/check-unknown-character]]
- [[validators/deterministic-runner]] → runs → [[validators/check-unknown-location]]
- [[validators/deterministic-runner]] → runs → [[validators/check-forbidden-move]]
- [[validators/deterministic-runner]] → runs → [[validators/check-locked-fact]]
- [[validators/deterministic-runner]] → runs → [[validators/check-realm-jump]]
- [[validators/deterministic-runner]] → runs → [[validators/check-repetition]]
- [[validators/deterministic-runner]] → runs → [[validators/check-cliffhanger]]
- [[validators/deterministic-runner]] → runs → [[validators/check-conflict-presence]]
- [[validators/deterministic-runner]] → runs → [[validators/check-style-red-flags]]
- [[validators/deterministic-runner]] → runs → [[validators/check-new-bloodline-source]]
- [[validators/deterministic-runner]] → writes report via → [[modules/validation-logger]]
- [[validators/deterministic-runner]] → writes → [[database/tables/validations]]

### LLM validation
- [[agents/llm-validator]] → calls → [[ai-providers/provider-interface]]
- [[agents/llm-validator]] → reads prompt from → [[prompts/prompt-llm-validator-v2]]
- [[agents/llm-validator]] → uses → [[modules/parse-completion-json]]
- [[agents/llm-validator]] → writes report via → [[modules/validation-logger]]
- [[agents/llm-validator]] → writes → [[database/tables/validations]]

### Packet audit
- [[validators/packet-auditor]] → reads → [[database/tables/canon-facts]]
- [[validators/packet-auditor]] → reads → [[database/tables/characters]]
- [[validators/packet-auditor]] → reads → [[database/tables/arcs]]

### Auto-fix
- [[agents/auto-fixer]] → calls → [[ai-providers/provider-interface]]
- [[agents/auto-fixer]] → reads prompt from → [[prompts/prompt-auto-fixer-v2]]
- [[agents/auto-fixer]] → uses → [[modules/parse-completion-json]]
- [[agents/auto-fixer]] → triggered by → [[agents/llm-validator]] _(low/medium severity)_

---

## LLM Provider Edges

### Provider abstraction
- [[agents/writer]] → calls → [[ai-providers/provider-interface]]
- [[agents/bible-generator]] → calls → [[ai-providers/provider-interface]]
- [[agents/packet-generator]] → calls → [[ai-providers/provider-interface]]
- [[agents/saga-planner]] → calls → [[ai-providers/provider-interface]]
- [[agents/arc-planner]] → calls → [[ai-providers/provider-interface]]
- [[agents/canon-extractor]] → calls → [[ai-providers/provider-interface]]
- [[agents/summary-compactor]] → calls → [[ai-providers/provider-interface]]
- [[agents/arc-summary-compactor]] → calls → [[ai-providers/provider-interface]]
- [[agents/high-stakes-reviewer]] → calls → [[ai-providers/provider-interface]]
- [[agents/llm-validator]] → calls → [[ai-providers/provider-interface]]
- [[agents/auto-fixer]] → calls → [[ai-providers/provider-interface]]

### Logged provider wrapper
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-openrouter]]
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-opencode]]
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-ollama]]
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-vmlx]]
- [[modules/llm-call-logger]] → wraps → [[ai-providers/provider-mock]] _(tests)_
- [[modules/llm-call-logger]] → writes → [[database/tables/llm-calls]]
- [[modules/llm-call-logger]] → reads traceId from → [[modules/trace]]

### Provider routing
- [[modules/provider-switcher]] → reads → [[database/tables/llm-provider-settings]]
- [[modules/provider-switcher]] → reads → [[database/tables/llm-provider-state]]
- [[routes/admin]] → switches provider via → [[modules/provider-switcher]]
- [[routes/admin]] → writes → [[database/tables/llm-provider-settings]]

### Parse & retry
- [[modules/parse-completion-json]] → called by → all agents
- [[modules/parse-completion-json]] → retries on → finishReason=error responses

---

## Canon Integrity Edges

### Extraction
- [[agents/canon-extractor]] → reads prompt from → [[prompts/prompt-canon-extractor-v2]]
- [[agents/canon-extractor]] → calls → [[ai-providers/provider-interface]]
- [[agents/canon-extractor]] → writes → [[database/tables/pending-canon-updates]]

### Merging
- [[modules/canon-merger]] → reads → [[database/tables/pending-canon-updates]]
- [[modules/canon-merger]] → calls → [[modules/conflict-detector]]
- [[modules/conflict-detector]] → reads → [[database/tables/canon-facts]]
- [[modules/canon-merger]] → writes (auto-merge, low conflict) → [[database/tables/canon-facts]]
- [[modules/canon-merger]] → escalates (high conflict) → [[database/tables/pending-canon-updates]] _(human review)_

### Human review approval
- [[routes/pending-updates]] → approves/rejects → [[database/tables/pending-canon-updates]]
- [[routes/pending-updates]] → on approval: writes → [[database/tables/canon-facts]]
- [[routes/pending-updates]] → on approval: may update → [[database/tables/characters]]
- [[routes/pending-updates]] → on approval: may update → [[database/tables/open-threads]]
- [[routes/pending-updates]] → on approval: may update → [[database/tables/timeline-events]]
- [[routes/pending-updates]] → on approval: may update → [[database/tables/planted-seeds]]

### Canon read-back
- [[validators/check-locked-fact]] → reads → [[database/tables/canon-facts]]
- [[validators/check-dead-character]] → reads → [[database/tables/characters]]
- [[validators/check-realm-jump]] → reads → [[database/tables/characters]]
- [[modules/embedding-service]] → generates embeddings for → [[database/tables/canon-facts]]

---

## Budget & Cost Edges

### Budget enforcement
- [[modules/budget-guard]] → reads → [[database/tables/llm-calls]] _(daily/monthly totals)_
- [[modules/budget-guard]] → enforces caps from → [[configs/policy-budget-guardrails]]
- [[modules/budget-guard]] → throws → [[errors/error-budget-exceeded]] _(when cap exceeded)_
- [[jobs/job-generate-chapter]] → checks → [[modules/budget-guard]] _(before LLM call)_

### Cost accumulation
- [[modules/llm-call-logger]] → writes per-call cost → [[database/tables/llm-calls]]
- [[modules/cost-tracker]] → aggregates → [[database/tables/llm-calls]]
- [[routes/costs]] → reads → [[database/tables/llm-calls]]

### Admin metrics
- [[modules/admin-metrics]] → aggregates → [[database/tables/llm-calls]]
- [[routes/admin]] → reads via → [[modules/admin-metrics]]

---

## Memory Update Edges

### Summary compaction
- [[agents/summary-compactor]] → reads → [[database/tables/chapters]]
- [[agents/summary-compactor]] → reads prompt from → [[prompts/prompt-summary-compactor-v2]]
- [[agents/summary-compactor]] → writes → [[database/tables/chapter-summaries]]

### Arc summary refresh
- [[jobs/job-refresh-arc-summary]] → calls → [[agents/arc-summary-compactor]]
- [[agents/arc-summary-compactor]] → reads → [[database/tables/chapters]]
- [[agents/arc-summary-compactor]] → reads prompt from → [[prompts/prompt-arc-summary-compactor-v2]]
- [[agents/arc-summary-compactor]] → writes → [[database/tables/arcs]] _(summary field)_

### Saga summary refresh
- [[jobs/job-refresh-saga-summary]] → calls → [[agents/saga-planner]]
- [[agents/saga-planner]] → reads → [[database/tables/sagas]]
- [[agents/saga-planner]] → reads prompt from → [[prompts/prompt-saga-planner-v2]]
- [[agents/saga-planner]] → writes → [[database/tables/sagas]] _(summary field)_

---

## Story Initialisation Edges

### Bible generation
- [[routes/bible]] → triggers → [[agents/bible-generator]]
- [[agents/bible-generator]] → reads prompt from → [[prompts/prompt-bible-generator-v2]]
- [[agents/bible-generator]] → calls → [[ai-providers/provider-interface]]
- [[agents/bible-generator]] → writes → [[database/tables/story-bibles]]
- [[routes/bible]] → locks genre via → [[database/tables/stories]] _(genreLockedAt)_

### Saga planning
- [[routes/sagas]] → triggers → [[agents/saga-planner]]
- [[agents/saga-planner]] → reads prompt from → [[prompts/prompt-saga-planner-v2]]
- [[agents/saga-planner]] → writes → [[database/tables/sagas]]

### Arc planning
- [[routes/arcs]] → triggers → [[agents/arc-planner]]
- [[agents/arc-planner]] → reads prompt from → [[prompts/prompt-arc-planner-v2]]
- [[agents/arc-planner]] → writes → [[database/tables/arcs]]

---

## Prompt System Edges

### Registry
- [[prompts/prompt-registry]] → registers → all prompt templates
- All agents → load prompt from → [[prompts/prompt-registry]]

### Contract injection (HOT tier)
- [[prompts/contract-genre]] → injected into HOT tier by → [[modules/context-builder]]
- [[prompts/contract-personality]] → injected into HOT tier by → [[modules/context-builder]]
- [[prompts/contract-story-options]] → injected into HOT tier by → [[modules/context-builder]]

---

## Observability Edges

### Trace propagation
- [[apps/app-api]] → wraps requests with → [[modules/trace]]
- [[jobs/job-generate-chapter]] → wraps jobs with → [[modules/trace]]
- [[modules/llm-call-logger]] → reads traceId from → [[modules/trace]]
- [[modules/trace]] → writes traceId to → [[database/tables/llm-calls]]

### Structured logging
- All agents → use → [[modules/logger]]
- [[apps/app-api]] → uses → [[modules/logger]]
- [[apps/app-worker]] → uses → [[modules/logger]]

---

## External Service Edges

- [[apps/app-api]] → connects to → [[external-services/service-postgresql]]
- [[apps/app-worker]] → connects to → [[external-services/service-postgresql]]
- [[apps/app-api]] → enqueues via → [[external-services/service-redis]]
- [[apps/app-worker]] → consumes from → [[external-services/service-redis]]
- [[external-services/service-bullmq]] → backed by → [[external-services/service-redis]]
- [[ai-providers/provider-openrouter]] → calls → [[external-services/service-openrouter]]
- [[ai-providers/provider-opencode]] → calls → [[external-services/service-opencode]]
- [[ai-providers/provider-ollama]] → calls → [[external-services/service-ollama]]
- [[ai-providers/provider-vmlx]] → calls → [[external-services/service-vmlx]]

---

## Configuration Inheritance Edges

- [[configs/config-effective]] → merges → [[configs/config-generation]]
- [[configs/config-effective]] → merges → [[configs/config-budget]]
- [[configs/config-effective]] → merges → [[configs/config-models]]
- [[configs/config-effective]] → merges → [[configs/config-context]]
- [[configs/config-effective]] → merges → [[configs/config-long-form]]
- [[configs/config-effective]] → overridden by → [[database/tables/story-settings]] _(per-story)_
- [[jobs/job-generate-chapter]] → reads effective config via → [[configs/config-effective]]
- [[jobs/job-generate-batch]] → reads effective config via → [[configs/config-effective]]
- [[configs/policy-budget-guardrails]] → enforces → [[configs/config-budget]]
- [[configs/policy-mode-escalation]] → reads flags from → [[configs/config-long-form]]
- [[configs/policy-high-stakes-triggers]] → reads flags from → [[configs/config-long-form]]
