# LLM Context Pipeline Improvement Design

Date: 2026-05-02
Status: Design approved; implementation plan pending
Primary source: `docs/llm-context-audit.md`

## Objective

The chapter generation pipeline must give each important LLM call enough compact story context to keep generated chapters aligned with the Story Bible, active Saga plan, active Arc plan, canon state, and story options. The Writer LLM is the highest-priority target, but packet generation, validation, repair, and high-stakes review must also receive the same long-term constraints where they affect behavior.

The implementation will work directly on the current `main` branch. Current `main` already contains many audit fixes, so this pass will verify every LLM call and patch only real remaining gaps.

## Notes Consulted

Obsidian MCP could not be searched because the `mcp-obsidian` server is not registered in this session. Repo graph documentation was used as the available architecture source:

- `docs/llm-context-audit.md`
- `docs/graph/flows/chapter-generation-flow.md`
- `docs/graph/flows/validation-flow.md`
- `docs/graph/modules/context-builder.md`
- `docs/superpowers/plans/2026-05-02-llm-context-pipeline-quality-plan.md`

Documentation gap: the required Obsidian graph may be missing from this runtime, or the MCP server name differs from the project instructions. If implementation changes architecture, flow, schema, validation, config, prompt behavior, or error handling, update the checked-in graph docs and note that Obsidian could not be updated through MCP.

## Current Architecture Constraints

- `buildContext()` is the canonical context assembler for chapter generation.
- Context is intentionally tiered:
  - HOT: Bible constraints, style, power system, genre contract, personality contract, story options.
  - WARM: saga plan, arc plan, active characters, open threads, planted seeds, known factions.
  - COLD: recent summaries, retrieved canon facts, past summaries, due seeds, timeline events, pending canon updates, chapter packet.
- Prompt context should be compact and rendered into readable sections. Do not dump raw DB rows.
- HOT tier context should remain protected from shrink trimming.
- Existing LLM calls are logged through the logged provider path and should keep prompt version metadata.

## LLM Call Inventory To Verify

The implementation must re-check these calls and confirm what each receives:

| LLM call | Current purpose | Required context contract |
| --- | --- | --- |
| Bible Generator | Create/update Story Bible | premise, genre, personality, story options |
| Saga Planner | Long-range plan | Bible compact, target chapters, genre, story options |
| Arc Planner | Saga-to-arc plan | saga range/premise/turning points, current state, unresolved seeds, genre, story options |
| Packet Generator | Per-chapter plan | Bible, active arc/saga direction, recent summaries, active characters, threads, due seeds, forbidden rules, pacing/progress hint, genre, personality, story options |
| Context Builder | Build chapter context | Bible, saga, arc, summaries, canon facts, timeline, pending updates, threads, seeds, characters, factions, progress metadata |
| Writer | Generate prose | all compact context sections, explicit saga/arc progress and pacing instructions |
| LLM Validator | Quality/canon/style validation | serialized chapter context, output chapter, genre, personality, story options, Bible/Saga/Arc adherence criteria |
| Auto-Fixer | Repair low/medium issues | same serialized context as Writer plus issue list and original chapter |
| Canon Extractor | Harvest memory | chapter, Bible compact, canon snapshot, planted seeds, recent summary |
| Summary Compactor | Chapter summary | chapter, previous summary, Bible compact, genre-aware key-event guidance |
| Arc Summary Compactor | Arc/saga rolling summary | per-chapter or per-arc summaries, genre-aware summary guidance if available |
| High-Stakes Reviewer | Deep review | Bible compact, arc summary, chapter, genre, personality, story options |

## Context Injection Design

### Writer and Generate Chapter

The serialized writer context should include these sections when available:

1. Story Identity
2. Bible Constraints
3. Genre Contract
4. Personality Contract
5. Story Options
6. Current Saga Plan
7. Current Saga Progress
8. Current Arc Plan
9. Current Arc Progress
10. Chapter Intent / Packet
11. Recent Continuity
12. Canon Facts
13. Timeline
14. Open Threads
15. Seeds / Foreshadowing
16. Characters / Factions / Bloodlines
17. Pending Canon Updates
18. Output Requirements
19. Hard Constraints

The implementation should preserve the existing compact section style, not introduce raw object dumps. Pending canon updates must be clearly marked as not yet applied so the writer stays aware of conflicts without treating staged facts as established canon.

### Packet and Context Calls

Packet generation must receive enough long-range structure to choose chapter goals that advance the active saga and arc. It should include explicit progress hints computed by the same helper as the Writer metadata, so the packet plan and prose generation agree on pacing.

Context building must load all context required by the Writer and validation stages. If a field is loaded into a tier but not serialized, either serialize it or document why it should remain validator-only.

### Validator and Repair

The LLM validator should explicitly judge drift from:

- Story Bible constraints and locked canon
- active saga plan and active arc plan
- required chapter packet events
- genre/personality/story options
- saga/arc pacing, including premature resolution or filler late in an arc

AutoFixer should use the same serialized context as Writer so repair does not remove constraints the Writer had.

## Progress Metadata Design

Expose these fields in `ChapterContext.meta` and render them in Writer context:

- `sagaProgressPercent`
- `arcProgressPercent`

Use a shared helper for both context metadata and generate-chapter packet pacing hints.

Exact calculation when both boundaries exist:

```ts
span = max(1, endChapter - startChapter + 1)
position = clamp(chapterNumber - startChapter + 1, 0, span)
progressPercent = round((position / span) * 100)
```

This is inclusive: the first chapter of a 10-chapter range is 10%, and the final chapter is 100%. This treats the generated chapter as the current position in the plan, not only the already-written chapters before it.

Fallback calculation when exact boundaries are missing:

- If saga `startChapter` exists but `endChapter` is missing, use `stories.targetChapterCount` as the rough saga end.
- If arc `startChapter` exists but `endChapter` is missing, prefer the active saga `endChapter`; otherwise use `stories.targetChapterCount`.
- If only `endChapter` exists, use chapter 1 as a conservative start.
- If no meaningful boundary can be derived, leave the percent as `null` and omit the progress line.
- Clamp all fallback windows to 0-100%.

The serialized progress line should include enough basis text for debugging, for example `source=planned_range` or `source=story_target_fallback`, without bloating the prompt.

## Scope

In scope:

- Verify and patch context injection for existing LLM calls.
- Add missing compact context fields if gaps remain.
- Unify progress calculation and fallback behavior.
- Update prompt builders where the LLM needs clearer instructions.
- Add focused tests for progress and prompt/context serialization.
- Update graph docs for any behavior changes.

Out of scope:

- Rewriting the generation architecture.
- New DB schema unless unavoidable.
- Dropping legacy columns such as `stories.tone`.
- Large prompt rewrites unrelated to context alignment.

## Success Criteria

- Writer prompt includes Bible, Saga, Arc, progress, prior summaries, canon facts, timeline, open threads, seeds, pending updates, character/faction/bloodline state, genre/personality/story options.
- Packet generation and Writer use the same progress calculation basis.
- Validator and high-stakes review receive actual story options and can evaluate Bible/Saga/Arc drift.
- AutoFixer receives the same serialized context as Writer.
- Tests cover exact progress, fallback progress, and critical writer context sections.
- Typechecks/tests pass for touched packages.

