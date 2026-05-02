---
type: ai-agent
source: packages/ai/src/agents/bible-generator.ts
---

# Agent: Bible Generator

## Responsibility
Generates the initial story bible from story premise, genre, personality, tone and story options. Up to 3 internal retry attempts with Zod schema validation.

## Source Evidence
`packages/ai/src/agents/bible-generator.ts` — `generateBible()` async function

## Inputs
- Story premise, genre, personality, tone
- `genreDef`, `personalityDef`, `storyOptions` (from [[modules/story-domain]])
- LLM provider

## Outputs
- `BibleV2Schema` validated object — persisted to [[database/tables/story-bibles]]

## Prompt
- [[prompts/prompt-bible-generator-v2]] — `PromptTemplate` (single `render()`)

## Schema
`packages/ai/src/schemas/bible.ts` — `BibleV2Schema`

## Retry Logic
Up to 3 validation attempts. On parse failure: logs and retries.

## Depends On
- [[packages/package-ai]] providers via `LLMProvider`
- [[prompts/prompt-bible-generator-v2]]

## Used By
- [[routes/route-bible]] (`POST /api/stories/:id/bible`)

## Related Tables
- [[database/tables/story-bibles]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/bible-generator.ts
---

# Agent: Bible Generator

## Responsibility
Generates the initial story bible from premise, genre, personality, tone and story options. Up to 3 internal Zod validation retry attempts.

## Source Evidence
`packages/ai/src/agents/bible-generator.ts` — `generateBible()` async function

## Inputs
- Story premise, genre, personality, tone
- `genreDef`, `personalityDef`, `storyOptions` from [[modules/story-domain]]
- LLM provider instance

## Outputs
- `BibleV2Schema` validated object
- Persisted to [[database/tables/story-bibles]]

## Prompt
[[prompts/prompt-bible-generator-v2]] — PromptTemplate (single `render()`)

## Schema
`packages/ai/src/schemas/bible.ts` — `BibleV2Schema`

## Retry Logic
Up to 3 validation attempts. On Zod parse failure: logs error and retries.

## Used By
- [[routes/route-bible]] (POST /api/stories/:id/bible)

## Related Tables
- [[database/tables/story-bibles]]
