# NotebookLM-Style Improvement — Optimized System Design

**Date:** 2026-05-04
**Source plans:** [plan_1.md](../../notebook_llm_improvement/plan_1.md), [plan_2.md](../../notebook_llm_improvement/plan_2.md), [plan_3.md](../../notebook_llm_improvement/plan_3.md), [plan_4.md](../../notebook_llm_improvement/plan_4.md)
**Reference system:** [reference.md (NovelGenerator)](../../notebook_llm_improvement/reference.md)
**Status:** Spec — pending user review.

## 1. Goals

1. Cut wasted Writer-LLM spend by catching hard-constraint violations **before** the Writer runs (Shift-Left).
2. Eliminate AI-omniscience leaks by tracking which facts each character actually knows.
3. Keep narrative continuity tight between chapter N and N+1 with a literal text bridge plus structured entry-state.
4. Keep the Cold Tier relevant past chapter 500+ via TTL on canon facts and POV-filtered RAG.
5. Preserve the existing Anthropic prompt-cache hit rate (≥ 90% on Hot Tier) — no Hot Tier shape changes.
6. Reduce HITL queue volume by auto-approving safe, low-importance canon updates.

Non-goals: rewriting the Writer agent into a slot-decomposition pipeline; multi-threaded narrative; batch resume.

## 2. Background

The current pipeline (`apps/worker/src/jobs/generate-chapter.ts`) runs:

```
PacketGenerator → PacketAuditor → DeterministicValidator → Writer
                                                          → LlmValidator → AutoFixer
                                                          → CanonExtractor → CanonMerger → SummaryCompactor
```

Issues identified across the four plans:

- **Validator placement.** Hard constraints (`dead_character`, `locked_fact`, `forbidden_move`, `realm_jump`) only fire post-Writer in `runner.ts`. A blocked chapter wastes the full Writer cost (~$0.03–$0.06).
- **Validator overlap.** Four cosmetic checks (`style_red_flags`, `cliffhanger`, `conflict_presence`, `repetition`) duplicate work the LLM Validator already does qualitatively, and yield noisy false positives.
- **Continuity gaps.** Each chapter starts from rolling summaries — no literal text bridge from the prior chapter, and no structured POV entry state.
- **AI omniscience.** Canon facts have no `known_by`. Writer can leak secrets the POV character has not yet learned.
- **Stale facts at scale.** `canon_facts` has no TTL — facts about an early-saga location keep retrieving long after the saga has moved on.
- **Heuristic budget guard.** `BudgetGuard` uses `chars/3.2` instead of a real tokenizer.
- **HITL noise.** All non-empty pending updates go to the queue; low-importance no-conflict rows could auto-apply.

## 3. Plan Comparison Summary

| Theme | Plan 1 | Plan 2 | Plan 3 | Plan 4 |
|---|---|---|---|---|
| Continuity | tail_content + entry_state in Warm Tier | last_active_chapter flashback gating | — | — |
| RAG | active_location filter; POV known_by | hybrid keyword+vector; valid_until_chapter TTL | locked-fact vector cosine | shrink algorithm priorities |
| Validators | multi-pass (drafting/det/llm/fixer/polish) | Locked Fact pre-check in auditor | Shift-Left 4 hard constraints; drop 4 cosmetic | importance ladder + 5 conflict types |
| Prompts | — | "Consistent Chronology" + "Emotional Arc" | — | XML role groups; full prompt rewrite |
| Ops | — | gpt-tokenizer in BudgetGuard; auto-approve low/no-conflict; heartbeat 30 min | — | hybrid model routing |
| Schema | tail_content, knowledge_ids, active_location_id | knowledge_state JSONB; valid_until_chapter | last_alive_chapter | — |

**Reference (NovelGenerator):** introduces 4-agent slot decomposition (Structure/Character/Scene/Synthesis) and a 6-stage editing pipeline. We adopt the **persistent-state** mindset (character-knowledge tracking, plot threads, world facts) but **decline** the 4-agent decomposition because rebuilding the Writer is out-of-scope and our `WriterAgent + AutoFixer` already produces acceptable quality.

## 4. Adopted vs Dropped

**Adopted:**

- Shift-Left hard constraints (`locked_fact`, `forbidden_move` added to `auditPacket`) — Plan 3.
- Validator re-bucketing (drop 4 cosmetic, downgrade `word_count` and `new_bloodline_source` to `low`) — Plan 3.
- `tail_content` + `entry_state` in Warm Tier — Plan 1.
- POV knowledge isolation: `canon_facts.known_by[]` + `characters.knowledge_state` — Plans 1 + 2 + reference.
- TTL on canon facts: `valid_until_chapter` — Plan 2.
- Hybrid RAG (keyword on `charactersPresent` ∪ vector on `goal/conflict`) — Plan 2.
- Auto-approve canon updates where `conflict_status=none AND importance=low` — Plan 2.
- Real tokenizer in `BudgetGuard` — Plan 2.
- Flashback gating via `last_active_chapter` — Plan 2.
- Surgical Writer-prompt additions: "Consistent Chronology" + "Emotional Arc" — Plans 2 + 4.

**Dropped / Deferred:**

- Plan 1's separate Polish Pass (`AutoFixer` already covers low/medium issues — extra pass doubles cost).
- Plan 2's multi-threaded narrative / global timeline (single-POV system; massive scope).
- Reference's 4-agent slot decomposition (would require rebuilding `WriterAgent` from scratch).
- Plan 4's full XML-role prompt rewrite (current `DualPromptTemplate` is sufficient).
- Plan 2's Batch Resume (complex infra change, defer).
- Plan 4's full hybrid model routing rewrite (already routed via `MODEL_CONFIG`).

## 5. Final System Flow

```
Phase 1 — PacketGenerator
  → emits ChapterPacket with entry_state {
        location_id, timestamp,
        pov_character: { physical_condition, emotional_state, immediate_goal, active_knowledge[] }
      }

Phase 2 — auditPacket (Shift-Left)
  Existing: dead_character, unresolved_due_seed, missing_conflict, missing_cliffhanger,
            realm_jump_excess, overdue_turning_point.
  NEW:      forbidden_move (regex on packet.forbiddenMoves ∪ requiredEvents),
            locked_fact (vector cosine on requiredEvents vs locked canon_facts).
  On critical/high → regenerate Packet ONCE with previousIssues[] hint.
                     If still failing → escalate to safe-mode (existing behaviour).
  Audit cost ≪ Writer cost — savings ≈ 15–20%.

Phase 3 — buildContext (3-tier, stateful)
  HOT (cache-stable, hash unchanged):
    system_rules, bible_compact, style_guide, power_system,
    genre_contract, personality_contract, style_few_shots, story_options_block.
  WARM (per-chapter):
    saga_summary, arc_summary,
    active_characters (filtered by last_active_chapter; dead → suppress unless flashback),
    arc_open_threads, arc_planted_seeds, known_factions,
    + tail_content_prev (last 200–300 words of chapter N-1, deterministic slice),
    + entry_state (lifted from packet).
  COLD (RAG, hybrid + filtered):
    recent_summaries,
    retrieved_facts: hybrid (keyword on charactersPresent ∪ vector on goal/conflict),
                     filtered by POV known_by AND TTL valid_until_chapter,
    retrieved_past_chapters, seeds_to_plant_now,
    timeline_events, pending_canon_updates, packet.

Phase 4 — WriterAgent (single pass)
  Same pipeline; user message gains two surgical inserts:
    <consistent_chronology>…</consistent_chronology>
    <emotional_arc>…</emotional_arc>
  System prompt unchanged → Hot cache preserved.

Phase 5 — Deterministic Validator (lean post-write)
  Hard (blocking): dead_character, realm_jump (llmVerifiable),
                   locked_fact, forbidden_move.
  Hints (low):    word_count, unknown_character (medium, llmVerifiable),
                   unknown_location (low, llmVerifiable), unknown_faction (low),
                   new_bloodline_source.
  REMOVED:        style_red_flags, cliffhanger, conflict_presence, repetition
                   → delegated to LLM Validator.

Phase 6 — LLM Validator → AutoFixer
  Now also covers style/cliffhanger/conflict/repetition.
  Critical-severity → paused_pending_updates (existing).

Phase 7 — Memory
  CanonExtractor emits known_by[] per fact, prioritises Relationship Shifts + Knowledge Updates.
  CanonMerger:
    auto-apply when conflict_status=none AND importance=low.
    Everything else → pending_canon_updates queue (existing).
  SummaryCompactor caller writes chapters.tail_content (deterministic suffix slice — no LLM call).

Async (existing): RefreshArcSummary, HighStakesReview at arc-end / breakthrough / death.
```

## 6. Database Schema Changes

Drizzle schema files modified:

### `packages/db/src/schema/chapters.ts`

```ts
tailContent: text('tail_content'),  // last 200–300 words of finalised chapter content
```

### `packages/db/src/schema/chapter-packets.ts`

```ts
entryState: jsonb('entry_state').$type<EntryState>(),
```

`EntryState` (TypeScript, declared in `packages/ai/src/schemas/packet.ts`):

```ts
type EntryState = {
  locationId?: string;
  timestamp?: string;          // human-readable timeline marker, e.g. "tối, ngay sau ch.42"
  povCharacter: {
    name: string;
    physicalCondition?: string;
    emotionalState?: string;
    immediateGoal?: string;
    activeKnowledge?: string[]; // canon_fact ids the POV currently knows
  };
};
```

### `packages/db/src/schema/characters.ts`

```ts
knowledgeState: jsonb('knowledge_state')
  .$type<Record<string, number>>()         // Map<canon_fact_id, chapter_number_learned>
  .default({}).notNull(),
lastActiveChapter: integer('last_active_chapter').default(0).notNull(),
```

### `packages/db/src/schema/canon-facts.ts`

```ts
validUntilChapter: integer('valid_until_chapter'), // NULL = eternal
knownBy: jsonb('known_by').$type<string[]>().default([]).notNull(), // character ids
```

All migrations generated via `pnpm db:generate`. No data backfill required (defaults are sound).

## 7. Validator Restructure

### Deterministic check matrix

| Check | Old severity | New severity | Phase | Notes |
|---|---|---|---|---|
| `dead_character` | critical | critical | audit + post-write | `last_alive_chapter` enables flashback exception |
| `realm_jump` | high (llmVerifiable) | high (llmVerifiable) | audit + post-write | Dynamic ladder via `parseRealmLadder()` |
| `locked_fact` | critical | critical (post-write) + high (audit) | audit + post-write | NEW in audit: vector cosine ≥ 0.85 → flag |
| `forbidden_move` | critical | critical (post-write) + high (audit) | audit + post-write | NEW in audit: regex on `packet.forbiddenMoves ∪ requiredEvents` |
| `word_count` | medium | **low** | post-write | Hint only — no block |
| `unknown_character` | medium (llmVerifiable) | medium (llmVerifiable) | post-write | unchanged |
| `unknown_location` | low (llmVerifiable) | low (llmVerifiable) | post-write | unchanged |
| `unknown_faction` | low | low | post-write | unchanged |
| `new_bloodline_source` | medium | **low** | post-write | Hint only |
| `style_red_flags` | medium | **REMOVED** | — | LLM Validator |
| `cliffhanger` | low | **REMOVED** | — | LLM Validator |
| `conflict_presence` | medium | **REMOVED** | — | LLM Validator |
| `repetition` | low | **REMOVED** | — | LLM Validator |

Net surface: 12 → 9 checks (cultivation), 9 → 7 (non-cultivation).

### Audit retry policy

```
auditPacket(packet, ctx) → AuditResult
  if requiresRegenerate && !alreadyRetried:
    packet ← regeneratePacket(packet, previousIssues=result.issues)
    auditPacket(packet, ctx) again
  if still failing:
    fall through to existing safe-mode escalation
```

Hard cap: 1 regenerate attempt per chapter. Avoids infinite loops; second failure follows current safe-mode behavior.

## 8. Context Builder Changes

### `packages/ai/src/context/types.ts`

```ts
type WarmTier = {
  // … existing fields …
  tailContentPrev?: string;     // last 200–300 words of chapter N-1
  entryState?: EntryState;       // lifted from ChapterPacket
};
```

### `packages/ai/src/context/retrieval.ts`

New / changed functions:

```ts
getPrevChapterTailContent(db, storyId, chapterNumber): Promise<string | null>

getActiveCharacters(db, storyId, chapterNumber):
  // existing query, but `lastSeenChapter` filter changed to `lastActiveChapter`.
  // Dead chars suppressed unless lastActiveChapter ≥ chapterNumber - FLASHBACK_WINDOW.

getTopKCanonFactsHybrid(db, storyId, embedding, characterNames, chapterNumber, povId, topK):
  WITH kw AS (
    SELECT id, 0.5 AS score FROM canon_facts
    WHERE story_id = $1
      AND topic ILIKE ANY ($characterNames patterns)
      AND (valid_until_chapter IS NULL OR $chapterNumber ≤ valid_until_chapter)
      AND ($povId IS NULL OR known_by @> '[]'::jsonb OR known_by @> jsonb_build_array($povId))
    LIMIT $topK
  ),
  vec AS (
    SELECT id, 0.5 AS score FROM canon_facts
    WHERE story_id = $1
      AND embedding IS NOT NULL
      AND (valid_until_chapter IS NULL OR $chapterNumber ≤ valid_until_chapter)
      AND ($povId IS NULL OR known_by @> '[]'::jsonb OR known_by @> jsonb_build_array($povId))
    ORDER BY embedding <=> $2 LIMIT $topK
  )
  SELECT id, SUM(score) AS rank FROM (kw UNION ALL vec) GROUP BY id ORDER BY rank DESC LIMIT $topK;

getLockedCanonFacts(db, storyId): Promise<{ id, fact, embedding }[]>
  // for the audit's locked_fact vector check
```

POV filter rule: a fact is visible if `known_by` is empty (public) OR contains the POV character id.

### `packages/ai/src/context/builder.ts`

- After existing Warm assembly, fetch prev-chapter tail content (`getPrevChapterTailContent`) and lift `entryState` from packet.
- Replace `getTopKCanonFacts` call with `getTopKCanonFactsHybrid` and pass POV id derived from `packet.charactersInScene[0]` (or explicit `entryState.povCharacter.name`).

## 9. Writer Prompt Additions

Append to user message body (system prompt and Hot Tier untouched — preserves cache hash):

```xml
<consistent_chronology>
- Recent timeline events: {{timelineEvents}}
- Saga rolling summary: {{sagaRollingSummary}}
- Hold continuity with chapter {{chapterNumber - 1}} via tail bridge below.
</consistent_chronology>

<entry_state>
- Location: {{entryState.locationId}}
- Time marker: {{entryState.timestamp}}
- POV {{povName}} enters with: {{physicalCondition}}, {{emotionalState}}, goal "{{immediateGoal}}".
- POV currently knows: {{activeKnowledgeFactsBriefList}}
</entry_state>

<chapter_tail_bridge>
{{tailContentPrev}}
</chapter_tail_bridge>

<emotional_arc>
- Open emotion: {{entryState.emotionalState}}
- Target emotion at cliffhanger: {{packet.cliffhanger emotional implication}}
- Show transition through events, not telling.
</emotional_arc>
```

These blocks are conditional — emit only if data is present. Hot Tier stays byte-identical.

## 10. Canon Merger — Auto-Approve Rule

In `packages/ai/src/reconciliation/canon-merger.ts:submit()`:

```
For each detected pending row:
  if conflict_status === 'none'
     AND payload.importance === 'low':
    → apply directly to target table
    → do NOT insert into pending_canon_updates
  else:
    → insert into pending_canon_updates as today
```

`high`, `critical`, `locked` importance always queue, regardless of conflict status.

## 11. BudgetGuard Tokenizer Upgrade

`packages/core/src/policy/budget-guardrails.ts`:

- Replace `Math.ceil(text.length / 3.2)` with `gpt-tokenizer`'s `encoding_for_model('gpt-4o')` count.
- Memoise the encoder.
- Fallback to `chars/3.2` heuristic if `gpt-tokenizer` import fails (defensive — keeps tests offline-friendly).

## 12. Operational Impact

| Metric | Before | After |
|---|---|---|
| Cost per blocked chapter | $0.03–0.06 wasted | ~$0 (caught at packet audit) |
| Estimated total cost reduction | baseline | ~15–20% |
| Hot Tier cache hit rate | ≥ 90% | ≥ 90% (preserved) |
| AI omniscience leaks | possible (no POV filter) | eliminated via `known_by` |
| Saga RAG quality at ch.1000 | degrades (stale facts) | stable via TTL |
| Deterministic check surface | 12 checks | 9 checks |
| HITL queue volume | all non-conflict updates | only conflict / high+ / locked |
| Budget estimation error | ±15% (heuristic) | ±2% (tokenizer) |

## 13. Migration & Rollout

1. **Phase 1 (low risk, immediate $$):** drop 4 cosmetic checks, downgrade 2 to low, extend `auditPacket` with `forbidden_move` + `locked_fact`. Behind no flag — pure validator-surface change.
2. **Phase 2 (schema):** Drizzle migrations (additive only — defaults handle existing rows). No backfill jobs.
3. **Phase 3 (RAG + auto-merge + tokenizer):** wired sequentially behind narrow tests; tokenizer behind defensive fallback.
4. **Phase 4 (prompt inserts + observability):** verify Hot Tier hash invariant via unit test in `cache-keys.test.ts`.

Smoke gate after each phase: `pnpm smoke:generate-chapter` for one chapter on the test story.

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Hot Tier hash drift breaks prompt cache | Add `cache-keys.test.ts` invariant: hot-hash equal across two builds with same Bible. |
| Hybrid RAG returns fewer relevant facts than pure vector | Keep `topK` constant; fall back to vector-only if hybrid yields < 3 rows. |
| `gpt-tokenizer` not bundled in worker | Lazy-require + fallback to char heuristic. |
| Audit retry creates infinite regenerate loop | Hard cap 1 retry; second failure escalates to safe-mode. |
| `known_by` filter accidentally hides public facts | Treat `known_by = []` as public (visible to all POVs). |
| Auto-approve hides bugs in extractor | Log every auto-applied row to `llm_calls` metadata for audit. |

## 15. Testing Plan

- Unit tests:
  - `packet-auditor.test.ts` — new `forbidden_move` + `locked_fact` cases, 1-retry budget.
  - `runner.test.ts` — confirm 4 dropped checks no longer registered, severity downgrades reflected.
  - `retrieval.test.ts` — hybrid RAG ordering, TTL filter, `known_by` filter.
  - `canon-merger.test.ts` — auto-apply branch on `conflict_status=none AND importance=low`.
  - `cache-keys.test.ts` — Hot hash invariant after Warm changes.
  - `budget-guardrails.test.ts` — tokenizer parity within ±5% vs heuristic on a 5k-char sample.
- Integration:
  - `apps/api` chapter pipeline test — full generate-chapter run with new schema columns.
- Smoke:
  - `pnpm smoke:generate-chapter` end-to-end after each phase.

## 16. Open Questions (to resolve before implementation)

None at spec level — all design decisions made above. Implementation plan will track per-task open questions.

---

**Plan files referenced:**
[docs/notebook_llm_improvement/plan_1.md](../../notebook_llm_improvement/plan_1.md),
[plan_2.md](../../notebook_llm_improvement/plan_2.md),
[plan_3.md](../../notebook_llm_improvement/plan_3.md),
[plan_4.md](../../notebook_llm_improvement/plan_4.md),
[reference.md](../../notebook_llm_improvement/reference.md),
[optimized_design.md (prior draft)](../../notebook_llm_improvement/optimized_design.md).
