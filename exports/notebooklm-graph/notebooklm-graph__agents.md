# Novel graph — agents

## arc-planner

`agents/arc-planner.md`

---
type: ai-agent
source: packages/ai/src/agents/arc-planner.ts
---



Agent: Arc Planner Responsibility
Plans the arc breakdown (2–5 arcs) within a saga. Reads planted seeds from DB to include in arc planning.



Agent: Arc Planner Source Evidence
`packages/ai/src/agents/arc-planner.ts` — `ArcPlannerAgent`



Agent: Arc Planner Inputs
- `sagaId`, story context
- Planted seeds from [[database/tables/planted-seeds]]
- LLM provider



Agent: Arc Planner Outputs
- `ArcPlannerOutputSchema` validated — array of arcs
- Persists to [[database/tables/arcs]]



Agent: Arc Planner Prompt
- [[prompts/prompt-arc-planner-v2]] — `DualPromptTemplate`



Agent: Arc Planner Schema
`packages/ai/src/schemas/arc.ts` — `ArcPlannerOutputSchema`



Agent: Arc Planner Depends On
- [[prompts/prompt-arc-planner-v2]]
- [[database/tables/planted-seeds]]
- [[configs/config-long-form]]



Agent: Arc Planner Used By
- [[routes/route-arcs]] (`POST /api/stories/:id/sagas/:sagaId/arcs/plan`)



Agent: Arc Planner Related Tables
- [[database/tables/arcs]]
- [[database/tables/planted-seeds]]
---
type: ai-agent
source: packages/ai/src/agents/arc-planner.ts
---



Agent: Arc Planner Responsibility
Plans arc breakdown (2–5 arcs) within a saga. Reads planted seeds from DB to include in arc planning.



Agent: Arc Planner Source Evidence
`packages/ai/src/agents/arc-planner.ts` — `ArcPlannerAgent`



Agent: Arc Planner Inputs
- `sagaId`, story context
- Planted seeds from [[database/tables/planted-seeds]]
- LLM provider



Agent: Arc Planner Outputs
- `ArcPlannerOutputSchema` validated — array of arcs
- Persists to [[database/tables/arcs]]



Agent: Arc Planner Prompt
[[prompts/prompt-arc-planner-v2]] — DualPromptTemplate



Agent: Arc Planner Schema
`packages/ai/src/schemas/arc.ts` — `ArcPlannerOutputSchema`



Agent: Arc Planner Config
[[configs/config-long-form]] — ARC_COUNT_PER_SAGA_RANGE



Agent: Arc Planner Used By
- [[routes/route-arcs]] (POST /api/stories/:id/sagas/:sagaId/arcs/plan)



Agent: Arc Planner Related Tables
- [[database/tables/arcs]]
- [[database/tables/planted-seeds]]

---

## arc-summary-compactor

`agents/arc-summary-compactor.md`

---
type: ai-agent
source: packages/ai/src/agents/arc-summary-compactor.ts
---



Agent: Arc Summary Compactor Responsibility
Rolls per-chapter summaries into a rolling arc summary. Also reused for saga-level rolling summary. Max output: 1500 tokens.



Agent: Arc Summary Compactor Source Evidence
`packages/ai/src/agents/arc-summary-compactor.ts` — `ArcSummaryCompactorAgent`



Agent: Arc Summary Compactor Inputs
- Array of recent chapter summaries
- Existing rolling summary
- LLM provider



Agent: Arc Summary Compactor Outputs
- Updated rolling summary string
- Written to [[database/tables/arcs]].`rollingSummary` or [[database/tables/sagas]].`rollingSummary`



Agent: Arc Summary Compactor Prompt
- [[prompts/prompt-arc-summary-compactor-v2]]
- `maxOutputTokens: 1500`



Agent: Arc Summary Compactor Depends On
- [[prompts/prompt-arc-summary-compactor-v2]]



Agent: Arc Summary Compactor Used By
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]



Agent: Arc Summary Compactor Related Tables
- [[database/tables/arcs]]
- [[database/tables/sagas]]
- [[database/tables/chapter-summaries]]
---
type: ai-agent
source: packages/ai/src/agents/arc-summary-compactor.ts
---



Agent: Arc Summary Compactor Responsibility
Rolls per-chapter summaries into a rolling arc summary. Also reused for saga-level rolling summary. Max output tokens: 1500.



Agent: Arc Summary Compactor Source Evidence
`packages/ai/src/agents/arc-summary-compactor.ts` — `ArcSummaryCompactorAgent`



Agent: Arc Summary Compactor Inputs
- Array of recent chapter summaries
- Existing rolling summary
- LLM provider



Agent: Arc Summary Compactor Outputs
- Updated rolling summary string
- Written to [[database/tables/arcs]].rollingSummary or [[database/tables/sagas]].rollingSummary



Agent: Arc Summary Compactor Prompt
[[prompts/prompt-arc-summary-compactor-v2]] — maxOutputTokens: 1500



Agent: Arc Summary Compactor Used By
- [[jobs/job-refresh-arc-summary]]
- [[jobs/job-refresh-saga-summary]]



Agent: Arc Summary Compactor Related Tables
- [[database/tables/arcs]]
- [[database/tables/sagas]]
- [[database/tables/chapter-summaries]]

---

## auto-fixer

`agents/auto-fixer.md`

---
type: ai-agent
source: packages/ai/src/agents/auto-fixer.ts
---



Agent: Auto Fixer Responsibility
Rewrites chapter content to fix low/medium severity issues identified by [[agents/llm-validator]]. Up to 1 attempt (`AUTO_FIX_MAX_ATTEMPTS`).



Agent: Auto Fixer Source Evidence
`packages/ai/src/agents/auto-fixer.ts` — `AutoFixerAgent`



Agent: Auto Fixer Inputs
- Original chapter content
- Validation issues (list of `{code, severity, message}`)
- LLM provider



Agent: Auto Fixer Outputs
- Revised chapter content (replaces original in [[database/tables/chapters]])



Agent: Auto Fixer Prompt
- [[prompts/prompt-auto-fixer-v2]]



Agent: Auto Fixer Generation Parameters
- Same temperature/topP as writer (0.85 / 0.95)



Agent: Auto Fixer Trigger Condition
`AUTO_FIX_TRIGGER_SEVERITIES = ['low', 'medium']` — only runs when max severity is medium (not high/critical)



Agent: Auto Fixer Depends On
- [[prompts/prompt-auto-fixer-v2]]
- [[agents/llm-validator]] (consumes its output)
- [[configs/config-generation]]



Agent: Auto Fixer Used By
- [[jobs/job-generate-chapter]] (Stage 8 — AUTO-FIX, conditional)



Agent: Auto Fixer Related Flows
- [[flows/validation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/auto-fixer.ts
---



Agent: Auto Fixer Responsibility
Rewrites chapter to fix low/medium severity issues found by [[agents/llm-validator]]. Max 1 attempt.



Agent: Auto Fixer Source Evidence
`packages/ai/src/agents/auto-fixer.ts` — `AutoFixerAgent`



Agent: Auto Fixer Inputs
- Original chapter content
- Validation issues list `{code, severity, message}[]`
- LLM provider



Agent: Auto Fixer Outputs
- Revised chapter content (replaces original in [[database/tables/chapters]])



Agent: Auto Fixer Prompt
[[prompts/prompt-auto-fixer-v2]]



Agent: Auto Fixer Parameters
- Same temperature/topP as writer (0.85/0.95)
- AUTO_FIX_MAX_ATTEMPTS = 1
- Trigger: AUTO_FIX_TRIGGER_SEVERITIES = ['low', 'medium']



Agent: Auto Fixer Depends On
- [[agents/llm-validator]] (consumes its output)
- [[configs/config-generation]]



Agent: Auto Fixer Used By
- [[jobs/job-generate-chapter]] (Stage 8 — conditional)



Agent: Auto Fixer Related Flows
- [[flows/validation-flow]]

---

## bible-generator

`agents/bible-generator.md`

---
type: ai-agent
source: packages/ai/src/agents/bible-generator.ts
---



Agent: Bible Generator Responsibility
Generates the initial story bible from story premise, genre, personality, tone and story options. Up to 3 internal retry attempts with Zod schema validation.



Agent: Bible Generator Source Evidence
`packages/ai/src/agents/bible-generator.ts` — `generateBible()` async function



Agent: Bible Generator Inputs
- Story premise, genre, personality, tone
- `genreDef`, `personalityDef`, `storyOptions` (from [[modules/story-domain]])
- LLM provider



Agent: Bible Generator Tone / Mood Priority
`storyOptions.darkLevel` is passed through [[prompts/contract-story-options]]. A bright dark level should reduce gloom and preserve hope inside the selected genre; genre still controls tropes/world mechanics/forbidden rules.



Agent: Bible Generator Outputs
- `BibleV2Schema` validated object — persisted to [[database/tables/story-bibles]]



Agent: Bible Generator Prompt
- [[prompts/prompt-bible-generator-v2]] — `PromptTemplate` (single `render()`)



Agent: Bible Generator Schema
`packages/ai/src/schemas/bible.ts` — `BibleV2Schema`



Agent: Bible Generator Retry Logic
Up to 3 validation attempts. On parse failure: logs and retries.



Agent: Bible Generator Depends On
- [[packages/package-ai]] providers via `LLMProvider`
- [[prompts/prompt-bible-generator-v2]]



Agent: Bible Generator Used By
- [[routes/route-bible]] (`POST /api/stories/:id/bible`)



Agent: Bible Generator Related Tables
- [[database/tables/story-bibles]]



Agent: Bible Generator Related Flows
- [[flows/chapter-generation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/bible-generator.ts
---



Agent: Bible Generator Responsibility
Generates the initial story bible from premise, genre, personality, tone and story options. Up to 3 internal Zod validation retry attempts.



Agent: Bible Generator Source Evidence
`packages/ai/src/agents/bible-generator.ts` — `generateBible()` async function



Agent: Bible Generator Inputs
- Story premise, genre, personality, tone
- `genreDef`, `personalityDef`, `storyOptions` from [[modules/story-domain]]
- LLM provider instance



Agent: Bible Generator Tone / Mood Priority
`storyOptions.darkLevel` is passed through [[prompts/contract-story-options]]. A bright dark level should reduce gloom and preserve hope inside the selected genre; genre still controls tropes/world mechanics/forbidden rules.



Agent: Bible Generator Outputs
- `BibleV2Schema` validated object
- Persisted to [[database/tables/story-bibles]]



Agent: Bible Generator Prompt
[[prompts/prompt-bible-generator-v2]] — PromptTemplate (single `render()`)



Agent: Bible Generator Schema
`packages/ai/src/schemas/bible.ts` — `BibleV2Schema`



Agent: Bible Generator Retry Logic
Up to 3 validation attempts. On Zod parse failure: logs error and retries.



Agent: Bible Generator Used By
- [[routes/route-bible]] (POST /api/stories/:id/bible)



Agent: Bible Generator Related Tables
- [[database/tables/story-bibles]]

---

## canon-extractor

`agents/canon-extractor.md`

---
type: ai-agent
source: packages/ai/src/agents/canon-extractor.ts
---



Agent: Canon Extractor Responsibility
Extracts structured canon updates from generated chapter: character state changes, new canon facts, thread updates, timeline events, resolved seeds.



Agent: Canon Extractor Source Evidence
`packages/ai/src/agents/canon-extractor.ts` — `CanonExtractor`



Agent: Canon Extractor Inputs
- Chapter content (finalized)
- Current character roster, open threads, planted seeds
- LLM provider



Agent: Canon Extractor Outputs
- `ExtractorOutputSchema`: `{ characterUpdates, newCanonFacts, threadUpdates, newTimelineEvents, factionUpdates, seedsResolvedThisChapter }`
- `factionUpdates[]` is backward-compatible (zod `.default([])`) — older v2 responses that omit it still parse cleanly
- Passed to [[modules/canon-merger]] for staging/applying



Agent: Canon Extractor Prompt
- [[prompts/prompt-canon-extractor-v2]] — system prompt updated to require `factionUpdates` for new sects/clans/kingdoms and lifecycle changes (status, alliances, enemies)



Agent: Canon Extractor Schema
`packages/ai/src/schemas/extractor.ts` — `ExtractorOutputSchema`, `FactionUpdateSchema`



Agent: Canon Extractor Depends On
- [[prompts/prompt-canon-extractor-v2]]



Agent: Canon Extractor Used By
- [[jobs/job-generate-chapter]] (Stage 9 — CANON EXTRACTION)



Agent: Canon Extractor Related Tables
- [[database/tables/characters]] (via merger)
- [[database/tables/canon-facts]] (via merger)
- [[database/tables/open-threads]] (via merger)
- [[database/tables/timeline-events]] (via merger)
- [[database/tables/planted-seeds]] (via merger)
- [[database/tables/factions]] (via merger)



Agent: Canon Extractor Related Flows
- [[flows/canon-reconciliation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/canon-extractor.ts
---



Agent: Canon Extractor Responsibility
Extracts structured canon updates from finalized chapter: character state changes, new canon facts, thread updates, timeline events, faction lifecycle changes, resolved seeds.



Agent: Canon Extractor Source Evidence
`packages/ai/src/agents/canon-extractor.ts` — `CanonExtractor`



Agent: Canon Extractor Inputs
- Finalized chapter content
- Current characters, open threads, planted seeds
- LLM provider



Agent: Canon Extractor Outputs
- `ExtractorOutputSchema`: `{ characterUpdates, newCanonFacts, threadUpdates, newTimelineEvents, factionUpdates, seedsResolvedThisChapter }`
- Passed to [[modules/canon-merger]]



Agent: Canon Extractor Prompt
[[prompts/prompt-canon-extractor-v2]]



Agent: Canon Extractor Schema
`packages/ai/src/schemas/extractor.ts` — `ExtractorOutputSchema`, `FactionUpdateSchema`



Agent: Canon Extractor Used By
- [[jobs/job-generate-chapter]] (Stage 9 — CANON EXTRACTION)



Agent: Canon Extractor Related Tables
- [[database/tables/characters]] (via merger)
- [[database/tables/canon-facts]] (via merger)
- [[database/tables/open-threads]] (via merger)
- [[database/tables/timeline-events]] (via merger)
- [[database/tables/planted-seeds]] (via merger)
- [[database/tables/factions]] (via merger)



Agent: Canon Extractor Related Flows
- [[flows/canon-reconciliation-flow]]

---

## high-stakes-reviewer

`agents/high-stakes-reviewer.md`

---
type: ai-agent
source: packages/ai/src/agents/high-stakes-reviewer.ts
---



Agent: High Stakes Reviewer Responsibility
Deep review agent for arc-end chapters or chapters with critical severity validator findings. Outputs approve/reject with concerns and recommended actions.



Agent: High Stakes Reviewer Source Evidence
`packages/ai/src/agents/high-stakes-reviewer.ts` — `HighStakesReviewerAgent`



Agent: High Stakes Reviewer Inputs
- Chapter content + context
- Trigger reason: `arc_end`, `critical_severity`, `manual`
- LLM provider



Agent: High Stakes Reviewer Outputs
- `HighStakesReviewSchema`: `{ approve, concerns, recommendedActions, tokens, costUsd }`
- Persisted to [[database/tables/high-stakes-reviews]]



Agent: High Stakes Reviewer Prompt
- [[prompts/prompt-high-stakes-reviewer-v2]]



Agent: High Stakes Reviewer Schema
`packages/ai/src/schemas/high-stakes-review.ts` — `HighStakesReviewSchema`



Agent: High Stakes Reviewer Depends On
- [[prompts/prompt-high-stakes-reviewer-v2]]



Agent: High Stakes Reviewer Used By
- [[jobs/job-high-stakes-review]]



Agent: High Stakes Reviewer Related Tables
- [[database/tables/high-stakes-reviews]]



Agent: High Stakes Reviewer Related Flows
- [[flows/validation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/high-stakes-reviewer.ts
---



Agent: High Stakes Reviewer Responsibility
Deep review agent for arc-end chapters or critical validator findings. Approve/reject with concerns and recommended actions.



Agent: High Stakes Reviewer Source Evidence
`packages/ai/src/agents/high-stakes-reviewer.ts` — `HighStakesReviewerAgent`



Agent: High Stakes Reviewer Inputs
- Chapter content + context
- Trigger reason: arc_end / critical_severity / manual
- LLM provider



Agent: High Stakes Reviewer Outputs
- `HighStakesReviewSchema`: `{ approve, concerns, recommendedActions, tokens, costUsd }`
- Persisted to [[database/tables/high-stakes-reviews]]



Agent: High Stakes Reviewer Prompt
[[prompts/prompt-high-stakes-reviewer-v2]]



Agent: High Stakes Reviewer Schema
`packages/ai/src/schemas/high-stakes-review.ts`



Agent: High Stakes Reviewer Used By
- [[jobs/job-high-stakes-review]]



Agent: High Stakes Reviewer Related Tables
- [[database/tables/high-stakes-reviews]]



Agent: High Stakes Reviewer Related Flows
- [[flows/validation-flow]]

---

## llm-validator

`agents/llm-validator.md`

---
type: ai-agent
source: packages/ai/src/agents/llm-validator.ts
---



Agent: LLM Validator Responsibility
Soft LLM-based validation of generated chapter: style consistency, voice, logic coherence. Outputs pass/fail with severity-tagged issues.



Agent: LLM Validator Source Evidence
`packages/ai/src/agents/llm-validator.ts` — `LlmValidatorAgent`



Agent: LLM Validator Inputs
- Chapter content
- Story context (bible compact, characters, packet)
- LLM provider



Agent: LLM Validator Outputs
- `LlmValidatorOutputSchema`: `{ pass, issues: [{code, severity, message}], summary }`
- Severity levels: `low`, `medium`, `high`, `critical`
- Persisted to [[database/tables/validations]]



Agent: LLM Validator Prompt
- [[prompts/prompt-llm-validator-v2]]



Agent: LLM Validator Generation Parameters
- Temperature: 0.1 (`LLM_VALIDATOR_TEMPERATURE`)



Agent: LLM Validator Trigger Logic
- Issues with `low`/`medium` severity → triggers [[agents/auto-fixer]]
- Issues with `high`/`critical` severity → pauses generation / triggers [[jobs/job-high-stakes-review]]



Agent: LLM Validator Depends On
- [[prompts/prompt-llm-validator-v2]]
- [[configs/config-generation]]



Agent: LLM Validator Used By
- [[jobs/job-generate-chapter]] (Stage 7 — LLM VALIDATION)
- [[pipelines/chapter-generation-pipeline]]



Agent: LLM Validator Related Tables
- [[database/tables/validations]]



Agent: LLM Validator Related Flows
- [[flows/validation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/llm-validator.ts
---



Agent: LLM Validator Responsibility
Soft LLM-based validation: style consistency, voice, narrative logic. Returns pass/fail with severity-tagged issues. Determines if auto-fix or escalation is needed.



Agent: LLM Validator Source Evidence
`packages/ai/src/agents/llm-validator.ts` — `LlmValidatorAgent`



Agent: LLM Validator Inputs
- Chapter content
- Story context (bible compact, characters, packet goal)
- LLM provider



Agent: LLM Validator Outputs
- `LlmValidatorOutputSchema`: `{ pass, issues: [{code, severity, message}], summary }`
- Severity levels: low, medium, high, critical
- Persisted to [[database/tables/validations]]



Agent: LLM Validator Prompt
[[prompts/prompt-llm-validator-v2]]



Agent: LLM Validator Temperature
0.1 (LLM_VALIDATOR_TEMPERATURE from [[configs/config-generation]])



Agent: LLM Validator Trigger Logic
- low/medium severity → triggers [[agents/auto-fixer]]
- high/critical severity → pauses / triggers [[jobs/job-high-stakes-review]]



Agent: LLM Validator Used By
- [[jobs/job-generate-chapter]] (Stage 7)
- [[pipelines/chapter-generation-pipeline]]



Agent: LLM Validator Related Tables
- [[database/tables/validations]]



Agent: LLM Validator Related Flows
- [[flows/validation-flow]]

---

## packet-generator

`agents/packet-generator.md`

---
type: ai-agent
source: packages/ai/src/agents/packet-generator.ts
---



Agent: Packet Generator Responsibility
Generates the `ChapterPacket` — a structured chapter plan with goal, required events, characters in scene, conflict, cliffhanger, and forbidden moves. Up to 3 internal retries with JSON repair fallback.



Agent: Packet Generator Source Evidence
`packages/ai/src/agents/packet-generator.ts` — `PacketGenerator`



Agent: Packet Generator Inputs
- `PacketGeneratorV2PromptInput`: bibleCompact, arcSummary, characters, threads, seeds, recent events, pacing hints, overdue turning points, etc.
- LLM provider



Agent: Packet Generator Outputs
- `ChapterPacketSchema` validated object — `ChapterPacket`
- On parse failure: attempts JSON repair (`repairPacket`) with the original packet planning context, then sentence-safe normalization



Agent: Packet Generator JSON Repair Context
- Repair prompt version is derived from packet prompt version as `v2-repair-v2`
- The repair call receives the original system contracts and packet request under `# PACKET REPAIR CONTEXT`
- Context includes Bible compact, active arc/saga request text, recent summaries, active characters, open threads, due seeds, forbidden rules, pacing/progress hints, genre/personality contracts, and story options
- Repair remains constrained to schema repair: it may fill missing required fields from context, but should not create a new chapter plan when the broken JSON still preserves the original intent



Agent: Packet Generator Prompt
- [[prompts/prompt-packet-generator-v2]] — `DualPromptTemplate`



Agent: Packet Generator Schema
`packages/ai/src/schemas/packet.ts` — `ChapterPacketSchema`, `PACKET_LIMITS`



Agent: Packet Generator Depends On
- [[prompts/prompt-packet-generator-v2]]



Agent: Packet Generator Used By
- [[jobs/job-generate-chapter]] (Stage 2 — PLAN)
- [[pipelines/chapter-generation-pipeline]]



Agent: Packet Generator Related Tables
- [[database/tables/chapter-packets]]



Agent: Packet Generator Related Flows
- [[flows/chapter-generation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/packet-generator.ts
---



Agent: Packet Generator Responsibility
Generates the ChapterPacket — structured chapter plan with goal, events, characters, conflict, cliffhanger, forbidden moves. Up to 3 retries with JSON repair fallback.



Agent: Packet Generator Source Evidence
`packages/ai/src/agents/packet-generator.ts` — `PacketGenerator`



Agent: Packet Generator Inputs
- `PacketGeneratorV2PromptInput`: bibleCompact, arcSummary, active characters, open threads, due seeds, recent events, pacing hints, overdue turning points
- LLM provider



Agent: Packet Generator Outputs
- `ChapterPacketSchema` validated `ChapterPacket`
- On parse failure: JSON repair (`repairPacket`) with original packet planning context, then sentence-safe normalization



Agent: Packet Generator JSON Repair Context
- Repair prompt version is derived from packet prompt version as `v2-repair-v2`
- The repair call receives the original system contracts and packet request under `# PACKET REPAIR CONTEXT`
- Context includes Bible compact, active arc/saga request text, recent summaries, active characters, open threads, due seeds, forbidden rules, pacing/progress hints, genre/personality contracts, and story options
- Repair remains constrained to schema repair: it may fill missing required fields from context, but should not create a new chapter plan when the broken JSON still preserves the original intent



Agent: Packet Generator Prompt
[[prompts/prompt-packet-generator-v2]] — DualPromptTemplate



Agent: Packet Generator Schema
`packages/ai/src/schemas/packet.ts` — `ChapterPacketSchema`, `PACKET_LIMITS`



Agent: Packet Generator Used By
- [[jobs/job-generate-chapter]] (Stage 2 — PLAN)
- [[pipelines/chapter-generation-pipeline]]



Agent: Packet Generator Related Tables
- [[database/tables/chapter-packets]]



Agent: Packet Generator Related Flows
- [[flows/chapter-generation-flow]]

---

## saga-planner

`agents/saga-planner.md`

---
type: ai-agent
source: packages/ai/src/agents/saga-planner.ts
---



Agent: Saga Planner Responsibility
Plans the saga structure (5–8 sagas) for an entire story. Also creates initial planted seeds (10–30 per saga plan). Persists sagas and seeds to DB.



Agent: Saga Planner Source Evidence
`packages/ai/src/agents/saga-planner.ts` — `SagaPlannerAgent`
`packages/ai/src/agents/saga-planner.types.ts`



Agent: Saga Planner Inputs
- Story premise, genre, personality, tone
- `genreDef`, `personalityDef`, `storyOptions`
- Target chapter count
- LLM provider



Agent: Saga Planner Outputs
- `SagaPlannerOutputSchema` validated — array of sagas + planted seeds
- Persists to [[database/tables/sagas]], [[database/tables/planted-seeds]]



Agent: Saga Planner Prompt
- [[prompts/prompt-saga-planner-v2]] — `DualPromptTemplate`



Agent: Saga Planner Schema
`packages/ai/src/schemas/saga.ts` — `SagaPlannerOutputSchema`



Agent: Saga Planner Depends On
- [[packages/package-ai]] providers
- [[prompts/prompt-saga-planner-v2]]
- [[configs/config-long-form]]



Agent: Saga Planner Used By
- [[routes/route-sagas]] (`POST /api/stories/:id/sagas/plan`)



Agent: Saga Planner Related Tables
- [[database/tables/sagas]]
- [[database/tables/planted-seeds]]
---
type: ai-agent
source: packages/ai/src/agents/saga-planner.ts
---



Agent: Saga Planner Responsibility
Plans saga structure (5–8 sagas) for the whole story. Creates planted seeds (10–30 per saga). Persists to DB.



Agent: Saga Planner Source Evidence
`packages/ai/src/agents/saga-planner.ts` — `SagaPlannerAgent`
`packages/ai/src/agents/saga-planner.types.ts`



Agent: Saga Planner Inputs
- Story premise, genre, personality, tone
- `genreDef`, `personalityDef`, `storyOptions`
- Target chapter count
- LLM provider



Agent: Saga Planner Outputs
- `SagaPlannerOutputSchema` validated — array of sagas + planted seeds
- Persists to [[database/tables/sagas]], [[database/tables/planted-seeds]]



Agent: Saga Planner Prompt
[[prompts/prompt-saga-planner-v2]] — DualPromptTemplate



Agent: Saga Planner Schema
`packages/ai/src/schemas/saga.ts` — `SagaPlannerOutputSchema`



Agent: Saga Planner Config
[[configs/config-long-form]] — SAGA_COUNT_RANGE, SEEDS_PER_SAGA_PLAN_RANGE



Agent: Saga Planner Used By
- [[routes/route-sagas]] (POST /api/stories/:id/sagas/plan)



Agent: Saga Planner Related Tables
- [[database/tables/sagas]]
- [[database/tables/planted-seeds]]

---

## summary-compactor

`agents/summary-compactor.md`

---
type: ai-agent
source: packages/ai/src/agents/summary-compactor.ts
---



Agent: Summary Compactor Responsibility
Compacts a full chapter into a short summary (paragraph-level). The summary is embedded via [[modules/embedding-service]] and stored for future context retrieval.



Agent: Summary Compactor Source Evidence
`packages/ai/src/agents/summary-compactor.ts` — `SummaryCompactor`



Agent: Summary Compactor Inputs
- Full chapter content
- LLM provider



Agent: Summary Compactor Outputs
- `SummaryCompactorOutputSchema`: `{ summary: string }`
- Summary + embedding written to [[database/tables/chapter-summaries]]



Agent: Summary Compactor Prompt
- [[prompts/prompt-summary-compactor-v2]]



Agent: Summary Compactor Schema
`packages/ai/src/schemas/summary.ts` — `SummaryCompactorOutputSchema`



Agent: Summary Compactor Depends On
- [[prompts/prompt-summary-compactor-v2]]
- [[modules/embedding-service]] — embeds the summary



Agent: Summary Compactor Used By
- [[jobs/job-generate-chapter]] (Stage 11 — SUMMARY COMPACTION)



Agent: Summary Compactor Related Tables
- [[database/tables/chapter-summaries]]



Agent: Summary Compactor Related Flows
- [[flows/chapter-generation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/summary-compactor.ts
---



Agent: Summary Compactor Responsibility
Compacts full chapter content into a short summary. Summary is then embedded via [[modules/embedding-service]] for future vector retrieval.



Agent: Summary Compactor Source Evidence
`packages/ai/src/agents/summary-compactor.ts` — `SummaryCompactor`



Agent: Summary Compactor Inputs
- Full chapter content
- LLM provider



Agent: Summary Compactor Outputs
- `SummaryCompactorOutputSchema`: `{ summary: string }`
- Summary + 1536-dim embedding → [[database/tables/chapter-summaries]]



Agent: Summary Compactor Prompt
[[prompts/prompt-summary-compactor-v2]]



Agent: Summary Compactor Schema
`packages/ai/src/schemas/summary.ts`



Agent: Summary Compactor Used By
- [[jobs/job-generate-chapter]] (Stage 11 — SUMMARY)



Agent: Summary Compactor Related Tables
- [[database/tables/chapter-summaries]]

---

## writer

`agents/writer.md`

---
type: ai-agent
source: packages/ai/src/agents/writer.ts
---



Agent: Writer Responsibility
Writes chapter prose from serialized `ChapterContext`. Parses `TITLE:` header from output to separate title from content.



Agent: Writer Source Evidence
`packages/ai/src/agents/writer.ts` — `WriterAgent`, `parseTitleAndContent()`



Agent: Writer Inputs
- Serialized `ChapterContext` (from [[modules/context-builder]] via `serializeContextForWriter()`)
- LLM provider



Agent: Writer Outputs
- `{ title: string, content: string }` — raw chapter prose
- Title extracted from `TITLE:` prefix line



Agent: Writer Prompt
- [[prompts/prompt-writer-v2]] — `DualPromptTemplate`, Vietnamese system prompt



Agent: Writer Generation Parameters
- Temperature: 0.85 (`WRITER_TEMPERATURE`)
- Top-P: 0.95 (`WRITER_TOP_P`)



Agent: Writer Depends On
- [[prompts/prompt-writer-v2]]
- [[modules/context-builder]] (for serialized context)
- [[configs/config-generation]]



Agent: Writer Used By
- [[jobs/job-generate-chapter]] (Stage 5 — WRITE)
- [[pipelines/chapter-generation-pipeline]]



Agent: Writer Related Tables
- [[database/tables/chapters]] (written after this stage)
---
type: ai-agent
source: packages/ai/src/agents/writer.ts
---



Agent: Writer Responsibility
Writes chapter prose from serialized ChapterContext. Parses TITLE: header to split title from content.



Agent: Writer Source Evidence
`packages/ai/src/agents/writer.ts` — `WriterAgent`, `parseTitleAndContent()`



Agent: Writer Inputs
- Serialized `ChapterContext` from [[modules/context-builder]] via `serializeContextForWriter()`
- LLM provider



Agent: Writer Outputs
- `{ title: string, content: string }` — raw Vietnamese chapter prose



Agent: Writer Prompt
[[prompts/prompt-writer-v2]] — DualPromptTemplate, Vietnamese system prompt



Agent: Writer Generation Parameters
- Temperature: 0.85 (WRITER_TEMPERATURE)
- Top-P: 0.95 (WRITER_TOP_P)
- Config: [[configs/config-generation]]



Agent: Writer Used By
- [[jobs/job-generate-chapter]] (Stage 5 — WRITE)
- [[pipelines/chapter-generation-pipeline]]



Agent: Writer Related Tables
- [[database/tables/chapters]] (written after this stage)



Agent: Writer Recent Changes (Context Pipeline Improvement) Writer now receives full context
- `serializeContextForWriter()` now includes Genre Contract, Personality Contract, and Story Options blocks
- Writer prompt's system message expanded with:
- DO NOT ASSUME rules (prevents genre/POV/tone assumptions)
- CONTEXT PRIORITY ordering (genre > canon > arc > packet > summaries)
- PACING RULES based on arc progress percentage
- Character serialization now includes `shortTraits` and `bloodlines`
- Timeline events section added
- Known factions section added
- Saga/Arc progress percentages injected

---
