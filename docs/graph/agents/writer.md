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


## Recent Changes (Context Pipeline Improvement)

### Writer now receives full context
- `serializeContextForWriter()` now includes Genre Contract, Personality Contract, and Story Options blocks
- Writer prompt's system message expanded with:
  - DO NOT ASSUME rules (prevents genre/POV/tone assumptions)
  - CONTEXT PRIORITY ordering (genre > canon > arc > packet > summaries)
  - PACING RULES based on arc progress percentage
- Character serialization now includes `shortTraits` and `bloodlines`
- Timeline events section added
- Known factions section added
- Saga/Arc progress percentages injected
