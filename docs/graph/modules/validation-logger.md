---
type: module
source: packages/ai/src/validators/validation-logger.ts
---

# Module: Validation Logger

**Type:** Module  
**Source:** `packages/ai/src/validators/validation-logger.ts`

## Responsibility
Formats deterministic and LLM validation results into a human-readable Vietnamese text report (`BÁO CÁO KIỂM TRA CHƯƠNG`) for logging and storage.

## Key exports / functions
- `formatValidationReport(input: ValidationReportInput): string`
  - Renders a structured Vietnamese-language validation report
  - Includes deterministic check table, LLM validator findings, and overall PASSED/FAILED verdict
- `ValidationReportInput` interface — input shape for the formatter

## Inputs (`ValidationReportInput`)
- `storyId`, `chapterNumber`, `chapterTitle?`, `wordCount?`
- `deterministicResult?: DeterministicValidatorResult` — from [[validators/deterministic-runner]]
- `llmResult?: LlmValidatorOutput` — from [[agents/llm-validator]]
- `timestamp?: Date`

## Outputs
- Formatted multi-line string (plain text) suitable for console output or DB storage
- Uses severity icons: 🔴 critical, 🟠 high, 🟡 medium, 🔵 low

## Implementation notes
- Vietnamese UI labels: "Thời gian", "Truyện", "Chương", "Tổng từ", "KẾT QUẢ CUỐI CÙNG"
- Deterministic section shows check-by-check pass/fail with issue details
- LLM section shows overall pass/fail, summary, and per-issue details
- Short-circuit warning shown if deterministic runner stopped early
- Does **not** write to the database directly — caller is responsible for persistence

## Depends on
- [[validators/deterministic-runner]] — for `DeterministicValidatorResult` type
- [[agents/llm-validator]] — for `LlmValidatorOutput` type

## Used by
- [[validators/deterministic-runner]] — to format and log results
- [[agents/llm-validator]] — to format and log results

## Related database tables
- [[database/tables/validations]] — report string may be persisted here by callers

## Related flows
- [[flows/validation-flow]]
