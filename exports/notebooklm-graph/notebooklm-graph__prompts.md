# Novel graph — prompts

## contract-genre

`prompts/contract-genre.md`

---
type: prompt-contract
source: packages/ai/src/prompts/contracts/genre-contract.ts
---



Prompt Contract: Genre Contract
**Function:** `renderGenreContract(genreDef, storyOptions)`
**Source:** `packages/ai/src/prompts/contracts/genre-contract.ts`
**Purpose:** Renders genre-specific writing rules and expectations as prompt text. Genre controls tropes/world mechanics/forbidden rules; story options remain authoritative for tone, pacing, POV, morality and dark-level mood within the selected genre.
**Used by:** [[modules/context-builder]] (HOT tier), [[prompts/prompt-writer-v2]]
**Depends on:** [[domain/genre-catalog]]
---
type: prompt-contract
source: packages/ai/src/prompts/contracts/genre-contract.ts
---



Prompt Contract: Genre Contract
**Function:** `renderGenreContract(genreDef, storyOptions)`
**Purpose:** Renders genre-specific writing rules and expectations as prompt text. Genre controls tropes/world mechanics/forbidden rules; story options remain authoritative for tone, pacing, POV, morality and dark-level mood within the selected genre.
**Used by:** [[modules/context-builder]] (HOT tier), [[prompts/prompt-writer-v2]]
**Depends on:** [[domain/genre-catalog]]

---

## contract-personality

`prompts/contract-personality.md`

---
type: prompt-contract
source: packages/ai/src/prompts/contracts/personality-contract.ts
---



Prompt Contract: Personality Contract
**Function:** `renderPersonalityContract(personalityDef)`
**Source:** `packages/ai/src/prompts/contracts/personality-contract.ts`
**Purpose:** Renders protagonist personality archetype rules as prompt text.
**Used by:** [[modules/context-builder]] (HOT tier), [[prompts/prompt-writer-v2]]
**Depends on:** [[domain/personality-catalog]]
---
type: prompt-contract
source: packages/ai/src/prompts/contracts/personality-contract.ts
---



Prompt Contract: Personality Contract
**Function:** `renderPersonalityContract(personalityDef)`
**Purpose:** Renders protagonist personality archetype rules as prompt text.
**Used by:** [[modules/context-builder]] (HOT tier), [[prompts/prompt-writer-v2]]
**Depends on:** [[domain/personality-catalog]]

---

## contract-story-options

`prompts/contract-story-options.md`

---
type: prompt-contract
source: packages/ai/src/prompts/contracts/story-options-block.ts
---



Prompt Contract: Story Options Block
**Function:** `renderStoryOptionsBlock(storyOptions)`
**Source:** `packages/ai/src/prompts/contracts/story-options-block.ts`
**Purpose:** Renders tone, pacing, POV, morality, romance level, dark level etc as prompt text. `darkLevel` also emits explicit mood guidance; for example `bright` tells prompts to reduce gloom and preserve hope.
**Used by:** [[modules/context-builder]] (HOT tier)
**Depends on:** [[domain/story-options]]
---
type: prompt-contract
source: packages/ai/src/prompts/contracts/story-options-block.ts
---



Prompt Contract: Story Options Block
**Function:** `renderStoryOptionsBlock(storyOptions)`
**Purpose:** Renders tone, pacing, POV, morality, romance level, dark level etc as prompt text. `darkLevel` also emits explicit mood guidance; for example `bright` tells prompts to reduce gloom and preserve hope.
**Used by:** [[modules/context-builder]] (HOT tier)
**Depends on:** [[domain/story-options]]

---

## prompt-arc-planner-v2

`prompts/prompt-arc-planner-v2.md`

---
type: prompt
source: packages/ai/src/prompts/arc-planner.v2.ts
agentRole: arc_planner
version: v2
---



Prompt: Arc Planner v2
**Role:** `arc_planner`
**Type:** `DualPromptTemplate`
**Source:** `packages/ai/src/prompts/arc-planner.v2.ts`
**Used by:** [[agents/arc-planner]]
---
type: prompt
source: packages/ai/src/prompts/arc-planner.v2.ts
agentRole: arc_planner
version: v2
---



Prompt: Arc Planner v2
**Type:** DualPromptTemplate
**Used by:** [[agents/arc-planner]]

---

## prompt-arc-summary-compactor-v2

`prompts/prompt-arc-summary-compactor-v2.md`

---
type: prompt
source: packages/ai/src/prompts/arc-summary-compactor.v2.ts
agentRole: arc_summary_compactor
version: v2
---



Prompt: Arc Summary Compactor v2
**Role:** `arc_summary_compactor`
**Type:** `DualPromptTemplate`
**Source:** `packages/ai/src/prompts/arc-summary-compactor.v2.ts`
**Used by:** [[agents/arc-summary-compactor]]
**maxOutputTokens:** 1500
---
type: prompt
source: packages/ai/src/prompts/arc-summary-compactor.v2.ts
agentRole: arc_summary_compactor
version: v2
---



Prompt: Arc Summary Compactor v2
**Type:** DualPromptTemplate
**maxOutputTokens:** 1500
**Used by:** [[agents/arc-summary-compactor]]

---

## prompt-auto-fixer-v2

`prompts/prompt-auto-fixer-v2.md`

---
type: prompt
source: packages/ai/src/prompts/auto-fixer.v2.ts
agentRole: auto_fixer
version: v2
---



Prompt: Auto Fixer v2
**Role:** `auto_fixer`
**Type:** `DualPromptTemplate`
**Source:** `packages/ai/src/prompts/auto-fixer.v2.ts`
**Used by:** [[agents/auto-fixer]]
---
type: prompt
source: packages/ai/src/prompts/auto-fixer.v2.ts
agentRole: auto_fixer
version: v2
---



Prompt: Auto Fixer v2
**Type:** DualPromptTemplate
**Used by:** [[agents/auto-fixer]]

---

## prompt-bible-generator-v2

`prompts/prompt-bible-generator-v2.md`

---
type: prompt
source: packages/ai/src/prompts/bible-generator.v2.ts
agentRole: bible_generator
version: v2
---



Prompt: Bible Generator v2
**Role:** `bible_generator`
**Type:** `PromptTemplate` (single `render()`)
**Source:** `packages/ai/src/prompts/bible-generator.v2.ts`
**Used by:** [[agents/bible-generator]]
---
type: prompt
source: packages/ai/src/prompts/bible-generator.v2.ts
agentRole: bible_generator
version: v2
---



Prompt: Bible Generator v2
**Type:** PromptTemplate (single `render()`)
**Used by:** [[agents/bible-generator]]

---

## prompt-canon-extractor-v2

`prompts/prompt-canon-extractor-v2.md`

---
type: prompt
source: packages/ai/src/prompts/canon-extractor.v2.ts
agentRole: canon_extractor
version: v2
---



Prompt: Canon Extractor v2
**Role:** `canon_extractor`
**Type:** `DualPromptTemplate`
**Source:** `packages/ai/src/prompts/canon-extractor.v2.ts`
**Used by:** [[agents/canon-extractor]]
---
type: prompt
source: packages/ai/src/prompts/canon-extractor.v2.ts
agentRole: canon_extractor
version: v2
---



Prompt: Canon Extractor v2
**Type:** DualPromptTemplate
**Used by:** [[agents/canon-extractor]]

---

## prompt-high-stakes-reviewer-v2

`prompts/prompt-high-stakes-reviewer-v2.md`

---
type: prompt
source: packages/ai/src/prompts/high-stakes-reviewer.v2.ts
agentRole: high_stakes_reviewer
version: v2
---



Prompt: High Stakes Reviewer v2
**Role:** `high_stakes_reviewer`
**Type:** `DualPromptTemplate`
**Source:** `packages/ai/src/prompts/high-stakes-reviewer.v2.ts`
**Used by:** [[agents/high-stakes-reviewer]]
---
type: prompt
source: packages/ai/src/prompts/high-stakes-reviewer.v2.ts
agentRole: high_stakes_reviewer
version: v2
---



Prompt: High Stakes Reviewer v2
**Type:** DualPromptTemplate
**Used by:** [[agents/high-stakes-reviewer]]

---

## prompt-llm-validator-v2

`prompts/prompt-llm-validator-v2.md`

---
type: prompt
source: packages/ai/src/prompts/llm-validator.v2.ts
agentRole: llm_validator
version: v2
---



Prompt: LLM Validator v2
**Role:** `llm_validator`
**Type:** `DualPromptTemplate`
**Source:** `packages/ai/src/prompts/llm-validator.v2.ts`
**Used by:** [[agents/llm-validator]]
---
type: prompt
source: packages/ai/src/prompts/llm-validator.v2.ts
agentRole: llm_validator
version: v2
---



Prompt: LLM Validator v2
**Type:** DualPromptTemplate
**Used by:** [[agents/llm-validator]]
**Temperature:** 0.1

---

## prompt-packet-generator-v2

`prompts/prompt-packet-generator-v2.md`

---
type: prompt
source: packages/ai/src/prompts/packet-generator.v2.ts
agentRole: packet_generator
version: v2
---



Prompt: Packet Generator v2
**Role:** `packet_generator`
**Type:** `DualPromptTemplate`
**Source:** `packages/ai/src/prompts/packet-generator.v2.ts`
**Used by:** [[agents/packet-generator]]
---
type: prompt
source: packages/ai/src/prompts/packet-generator.v2.ts
agentRole: packet_generator
version: v2
---



Prompt: Packet Generator v2
**Type:** DualPromptTemplate
**Used by:** [[agents/packet-generator]]

---

## prompt-registry

`prompts/prompt-registry.md`

---
type: module
source: packages/ai/src/prompts/registry.ts
---



Module: Prompt Registry Responsibility
Central registry for all versioned prompt templates. Provides `registerPrompt()`, `getPrompt(agentRole, version)`, `PromptTemplate`, `DualPromptTemplate` types.



Module: Prompt Registry Source Evidence
`packages/ai/src/prompts/registry.ts`



Module: Prompt Registry Types
- `PromptTemplate` — single `render()` method
- `DualPromptTemplate` — `build()` → `{ system, user }`



Module: Prompt Registry All Registered Prompts
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



Module: Prompt Registry Used By
All agents in [[packages/package-ai]]
---
type: module
source: packages/ai/src/prompts/registry.ts
---



Module: Prompt Registry Responsibility
Central registry for all versioned prompt templates. Provides registerPrompt(), getPrompt(), PromptTemplate, DualPromptTemplate types.



Module: Prompt Registry Source Evidence
`packages/ai/src/prompts/registry.ts`



Module: Prompt Registry Types
- `PromptTemplate` — single `render()` method
- `DualPromptTemplate` — `build()` → `{ system, user }`



Module: Prompt Registry Registered Prompts
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

---

## prompt-saga-planner-v2

`prompts/prompt-saga-planner-v2.md`

---
type: prompt
source: packages/ai/src/prompts/saga-planner.v2.ts
agentRole: saga_planner
version: v2
---



Prompt: Saga Planner v2
**Role:** `saga_planner`
**Type:** `DualPromptTemplate`
**Source:** `packages/ai/src/prompts/saga-planner.v2.ts`
**Used by:** [[agents/saga-planner]]
---
type: prompt
source: packages/ai/src/prompts/saga-planner.v2.ts
agentRole: saga_planner
version: v2
---



Prompt: Saga Planner v2
**Type:** DualPromptTemplate
**Used by:** [[agents/saga-planner]]

---

## prompt-summary-compactor-v2

`prompts/prompt-summary-compactor-v2.md`

---
type: prompt
source: packages/ai/src/prompts/summary-compactor.v2.ts
agentRole: summary_compactor
version: v2
---



Prompt: Summary Compactor v2
**Role:** `summary_compactor`
**Type:** `DualPromptTemplate`
**Source:** `packages/ai/src/prompts/summary-compactor.v2.ts`
**Used by:** [[agents/summary-compactor]]
---
type: prompt
source: packages/ai/src/prompts/summary-compactor.v2.ts
agentRole: summary_compactor
version: v2
---



Prompt: Summary Compactor v2
**Type:** DualPromptTemplate
**Used by:** [[agents/summary-compactor]]

---

## prompt-writer-v2

`prompts/prompt-writer-v2.md`

---
type: prompt
source: packages/ai/src/prompts/writer.v2.ts
agentRole: writer
version: v2
promptType: DualPromptTemplate
---



Prompt: Writer v2
**Role:** `writer` — generates chapter prose
**Type:** `DualPromptTemplate` (`build()` → `{system, user}`)
**Language:** Vietnamese system prompt
**Source:** `packages/ai/src/prompts/writer.v2.ts`
**Used by:** [[agents/writer]]
**Depends on:** [[prompts/contract-genre]], [[prompts/contract-personality]], [[prompts/contract-story-options]]
**Temperature:** 0.85 (see [[configs/config-generation]])
---
type: prompt
source: packages/ai/src/prompts/writer.v2.ts
agentRole: writer
version: v2
---



Prompt: Writer v2
**Type:** DualPromptTemplate — `build()` → `{system, user}`
**Language:** Vietnamese system prompt
**Used by:** [[agents/writer]]
**Depends on:** [[prompts/contract-genre]], [[prompts/contract-personality]], [[prompts/contract-story-options]]
**Temperature:** 0.85 — [[configs/config-generation]]

---
