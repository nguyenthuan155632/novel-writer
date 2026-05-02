---
type: ai-agent
source: packages/ai/src/agents/writer.ts
---

# Agent: Writer

## Responsibility
Writes chapter prose from serialized `ChapterContext`. Parses `TITLE:` header from output to separate title from content.

## Source Evidence
`packages/ai/src/agents/writer.ts` — `WriterAgent`, `parseTitleAndContent()`

## Inputs
- Serialized `ChapterContext` (from [[modules/context-builder]] via `serializeContextForWriter()`)
- LLM provider

## Outputs
- `{ title: string, content: string }` — raw chapter prose
- Title extracted from `TITLE:` prefix line

## Prompt
- [[prompts/prompt-writer-v2]] — `DualPromptTemplate`, Vietnamese system prompt

## Generation Parameters
- Temperature: 0.85 (`WRITER_TEMPERATURE`)
- Top-P: 0.95 (`WRITER_TOP_P`)

## Depends On
- [[prompts/prompt-writer-v2]]
- [[modules/context-builder]] (for serialized context)
- [[configs/config-generation]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 5 — WRITE)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/chapters]] (written after this stage)
---
type: ai-agent
source: packages/ai/src/agents/writer.ts
---

# Agent: Writer

## Responsibility
Writes chapter prose from serialized ChapterContext. Parses TITLE: header to split title from content.

## Source Evidence
`packages/ai/src/agents/writer.ts` — `WriterAgent`, `parseTitleAndContent()`

## Inputs
- Serialized `ChapterContext` from [[modules/context-builder]] via `serializeContextForWriter()`
- LLM provider

## Outputs
- `{ title: string, content: string }` — raw Vietnamese chapter prose

## Prompt
[[prompts/prompt-writer-v2]] — DualPromptTemplate, Vietnamese system prompt

## Generation Parameters
- Temperature: 0.85 (WRITER_TEMPERATURE)
- Top-P: 0.95 (WRITER_TOP_P)
- Config: [[configs/config-generation]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 5 — WRITE)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/chapters]] (written after this stage)
