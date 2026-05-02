---
type: ai-agent
source: packages/ai/src/agents/canon-extractor.ts
---

# Agent: Canon Extractor

## Responsibility
Extracts structured canon updates from generated chapter: character state changes, new canon facts, thread updates, timeline events, resolved seeds.

## Source Evidence
`packages/ai/src/agents/canon-extractor.ts` — `CanonExtractor`

## Inputs
- Chapter content (finalized)
- Current character roster, open threads, planted seeds
- LLM provider

## Outputs
- `ExtractorOutputSchema`: `{ characterUpdates, newCanonFacts, threadUpdates, newTimelineEvents, factionUpdates, seedsResolvedThisChapter }`
- `factionUpdates[]` is backward-compatible (zod `.default([])`) — older v2 responses that omit it still parse cleanly
- Passed to [[modules/canon-merger]] for staging/applying

## Prompt
- [[prompts/prompt-canon-extractor-v2]] — system prompt updated to require `factionUpdates` for new sects/clans/kingdoms and lifecycle changes (status, alliances, enemies)

## Schema
`packages/ai/src/schemas/extractor.ts` — `ExtractorOutputSchema`, `FactionUpdateSchema`

## Depends On
- [[prompts/prompt-canon-extractor-v2]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 9 — CANON EXTRACTION)

## Related Tables
- [[database/tables/characters]] (via merger)
- [[database/tables/canon-facts]] (via merger)
- [[database/tables/open-threads]] (via merger)
- [[database/tables/timeline-events]] (via merger)
- [[database/tables/planted-seeds]] (via merger)
- [[database/tables/factions]] (via merger)

## Related Flows
- [[flows/canon-reconciliation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/canon-extractor.ts
---

# Agent: Canon Extractor

## Responsibility
Extracts structured canon updates from finalized chapter: character state changes, new canon facts, thread updates, timeline events, faction lifecycle changes, resolved seeds.

## Source Evidence
`packages/ai/src/agents/canon-extractor.ts` — `CanonExtractor`

## Inputs
- Finalized chapter content
- Current characters, open threads, planted seeds
- LLM provider

## Outputs
- `ExtractorOutputSchema`: `{ characterUpdates, newCanonFacts, threadUpdates, newTimelineEvents, factionUpdates, seedsResolvedThisChapter }`
- Passed to [[modules/canon-merger]]

## Prompt
[[prompts/prompt-canon-extractor-v2]]

## Schema
`packages/ai/src/schemas/extractor.ts` — `ExtractorOutputSchema`, `FactionUpdateSchema`

## Used By
- [[jobs/job-generate-chapter]] (Stage 9 — CANON EXTRACTION)

## Related Tables
- [[database/tables/characters]] (via merger)
- [[database/tables/canon-facts]] (via merger)
- [[database/tables/open-threads]] (via merger)
- [[database/tables/timeline-events]] (via merger)
- [[database/tables/planted-seeds]] (via merger)
- [[database/tables/factions]] (via merger)

## Related Flows
- [[flows/canon-reconciliation-flow]]
