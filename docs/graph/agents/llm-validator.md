---
type: ai-agent
source: packages/ai/src/agents/llm-validator.ts
---

# Agent: LLM Validator

## Responsibility
Soft LLM-based validation of generated chapter: style consistency, voice, logic coherence. Outputs pass/fail with severity-tagged issues.

## Source Evidence
`packages/ai/src/agents/llm-validator.ts` — `LlmValidatorAgent`

## Inputs
- Chapter content
- Story context (bible compact, characters, packet)
- LLM provider

## Outputs
- `LlmValidatorOutputSchema`: `{ pass, issues: [{code, severity, message}], summary }`
- Severity levels: `low`, `medium`, `high`, `critical`
- Persisted to [[database/tables/validations]]

## Prompt
- [[prompts/prompt-llm-validator-v2]]

## Generation Parameters
- Temperature: 0.1 (`LLM_VALIDATOR_TEMPERATURE`)

## Trigger Logic
- Issues with `low`/`medium` severity → triggers [[agents/auto-fixer]]
- Issues with `high`/`critical` severity → pauses generation / triggers [[jobs/job-high-stakes-review]]

## Depends On
- [[prompts/prompt-llm-validator-v2]]
- [[configs/config-generation]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 7 — LLM VALIDATION)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/validations]]

## Related Flows
- [[flows/validation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/llm-validator.ts
---

# Agent: LLM Validator

## Responsibility
Soft LLM-based validation: style consistency, voice, narrative logic. Returns pass/fail with severity-tagged issues. Determines if auto-fix or escalation is needed.

## Source Evidence
`packages/ai/src/agents/llm-validator.ts` — `LlmValidatorAgent`

## Inputs
- Chapter content
- Story context (bible compact, characters, packet goal)
- LLM provider

## Outputs
- `LlmValidatorOutputSchema`: `{ pass, issues: [{code, severity, message}], summary }`
- Severity levels: low, medium, high, critical
- Persisted to [[database/tables/validations]]

## Prompt
[[prompts/prompt-llm-validator-v2]]

## Temperature
0.1 (LLM_VALIDATOR_TEMPERATURE from [[configs/config-generation]])

## Trigger Logic
- low/medium severity → triggers [[agents/auto-fixer]]
- high/critical severity → pauses / triggers [[jobs/job-high-stakes-review]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 7)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/validations]]

## Related Flows
- [[flows/validation-flow]]
