---
type: prompt
source: packages/ai/src/prompts/writer.v2.ts
agentRole: writer
version: v2
promptType: DualPromptTemplate
---
# Prompt: Writer v2
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
# Prompt: Writer v2
**Type:** DualPromptTemplate — `build()` → `{system, user}`
**Language:** Vietnamese system prompt
**Used by:** [[agents/writer]]
**Depends on:** [[prompts/contract-genre]], [[prompts/contract-personality]], [[prompts/contract-story-options]]
**Temperature:** 0.85 — [[configs/config-generation]]
