---
type: ai-agent
source: packages/ai/src/agents/auto-fixer.ts
---

# Agent: Auto Fixer

## Responsibility
Rewrites chapter content to fix low/medium severity issues identified by [[agents/llm-validator]]. Up to 1 attempt (`AUTO_FIX_MAX_ATTEMPTS`).

## Source Evidence
`packages/ai/src/agents/auto-fixer.ts` — `AutoFixerAgent`

## Inputs
- Original chapter content
- Validation issues (list of `{code, severity, message}`)
- LLM provider

## Outputs
- Revised chapter content (replaces original in [[database/tables/chapters]])

## Prompt
- [[prompts/prompt-auto-fixer-v2]]

## Generation Parameters
- Same temperature/topP as writer (0.85 / 0.95)

## Trigger Condition
`AUTO_FIX_TRIGGER_SEVERITIES = ['low', 'medium']` — only runs when max severity is medium (not high/critical)

## Depends On
- [[prompts/prompt-auto-fixer-v2]]
- [[agents/llm-validator]] (consumes its output)
- [[configs/config-generation]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 8 — AUTO-FIX, conditional)

## Related Flows
- [[flows/validation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/auto-fixer.ts
---

# Agent: Auto Fixer

## Responsibility
Rewrites chapter to fix low/medium severity issues found by [[agents/llm-validator]]. Max 1 attempt.

## Source Evidence
`packages/ai/src/agents/auto-fixer.ts` — `AutoFixerAgent`

## Inputs
- Original chapter content
- Validation issues list `{code, severity, message}[]`
- LLM provider

## Outputs
- Revised chapter content (replaces original in [[database/tables/chapters]])

## Prompt
[[prompts/prompt-auto-fixer-v2]]

## Parameters
- Same temperature/topP as writer (0.85/0.95)
- AUTO_FIX_MAX_ATTEMPTS = 1
- Trigger: AUTO_FIX_TRIGGER_SEVERITIES = ['low', 'medium']

## Depends On
- [[agents/llm-validator]] (consumes its output)
- [[configs/config-generation]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 8 — conditional)

## Related Flows
- [[flows/validation-flow]]
