---
type: prompt
source: packages/ai/src/prompts/polish-pass.v1.ts
agentRole: polish_pass
version: v1
---

# Prompt: Polish Pass v1

**Role:** `polish_pass`
**Type:** Single `PromptTemplate`
**Source:** `packages/ai/src/prompts/polish-pass.v1.ts`
**Purpose:** Post-write refinement pass — addresses anti-LLM patterns, pacing issues, and prose smoothness after main generation.

## Inputs
- Raw chapter content
- Anti-pattern findings from [[validators/anti-llm-patterns]]
- Story context (compact bible, packet goal)

## Outputs
- Polished chapter prose (replaces raw content)

## Used By
Phase 5 slot pipeline (optional polish after synthesis)
## Type Correction
Source file imports `DualPromptTemplate` (not `PromptTemplate`) and returns `{ system, user }` from `build()`. This was mis-documented as single PromptTemplate.