---
type: module
source: packages/ai/src/prompts/registry.ts
---

# Module: Prompt Registry

## Responsibility
Central registry for all versioned prompt templates. Provides `registerPrompt()`, `getPrompt(agentRole, version)`, `PromptTemplate`, `DualPromptTemplate` types.

## Source Evidence
`packages/ai/src/prompts/registry.ts`

## Types
- `PromptTemplate` — single `render()` method
- `DualPromptTemplate` — `build()` → `{ system, user }`

## All Registered Prompts
- [[prompts/prompt-writer-v2]] — role: `writer`
- [[prompts/prompt-packet-generator-v2]] — role: `packet_generator`
- [[prompts/prompt-llm-validator-v2]] — role: `llm_validator`
- [[prompts/prompt-auto-fixer-v2]] — role: `auto_fixer`
- [[prompts/prompt-canon-extractor-v2]] — role: `canon_extractor`
- [[prompts/prompt-summary-compactor-v2]] — role: `summary_compactor`
- [[prompts/prompt-arc-summary-compactor-v2]] — role: `arc_summary_compactor`
- [[prompts/prompt-bible-generator-v2]] — role: `bible_generator`
- [[prompts/prompt-saga-planner-v2]] — role: `saga_planner`
- [[prompts/prompt-arc-planner-v2]] — role: `arc_planner`
- [[prompts/prompt-high-stakes-reviewer-v2]] — role: `high_stakes_reviewer`

## Used By
All agents in [[packages/package-ai]]
---
type: module
source: packages/ai/src/prompts/registry.ts
---

# Module: Prompt Registry

## Responsibility
Central registry for all versioned prompt templates. Provides registerPrompt(), getPrompt(), PromptTemplate, DualPromptTemplate types.

## Source Evidence
`packages/ai/src/prompts/registry.ts`

## Types
- `PromptTemplate` — single `render()` method
- `DualPromptTemplate` — `build()` → `{ system, user }`

## Registered Prompts
- [[prompts/prompt-writer-v2]] — writer
- [[prompts/prompt-packet-generator-v2]] — packet_generator
- [[prompts/prompt-llm-validator-v2]] — llm_validator
- [[prompts/prompt-auto-fixer-v2]] — auto_fixer
- [[prompts/prompt-canon-extractor-v2]] — canon_extractor
- [[prompts/prompt-summary-compactor-v2]] — summary_compactor
- [[prompts/prompt-arc-summary-compactor-v2]] — arc_summary_compactor
- [[prompts/prompt-bible-generator-v2]] — bible_generator
- [[prompts/prompt-saga-planner-v2]] — saga_planner
- [[prompts/prompt-arc-planner-v2]] — arc_planner
- [[prompts/prompt-high-stakes-reviewer-v2]] — high_stakes_reviewer
