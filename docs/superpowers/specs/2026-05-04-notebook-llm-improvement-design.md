# NotebookLM-Style Improvement — Comprehensive System Design

**Date:** 2026-05-04
**Source plans (every proposal must be covered):**
- [plan_1.md](../../notebook_llm_improvement/plan_1.md) — Stateful Continuity
- [plan_2.md](../../notebook_llm_improvement/plan_2.md) — Architecture & Operations
- [plan_3.md](../../notebook_llm_improvement/plan_3.md) — Shift-Left Validators
- [plan_4.md](../../notebook_llm_improvement/plan_4.md) — Prompt Engineering
- [reference.md](../../notebook_llm_improvement/reference.md) — NovelGenerator slot-based architecture

**Coverage rule:** every numbered proposal in every source must map to a section here. Where a proposal is deferred, the spec records the explicit phase it lands in. **No silent drops.**

---

## 1. Goals

1. Cut wasted Writer-LLM spend by catching hard-constraint violations **before** the Writer runs (Shift-Left).
2. Eliminate AI-omniscience leaks by tracking which facts each character actually knows.
3. Keep narrative continuity tight between chapter N and N+1 with a literal text bridge plus structured entry-state.
4. Keep the Cold Tier relevant past chapter 500+ via TTL on canon facts and POV-filtered RAG.
5. Preserve Anthropic prompt-cache hit rate (≥ 90% on Hot Tier) — no Hot Tier shape changes.
6. Reduce HITL queue volume by auto-approving safe, low-importance canon updates and surfacing pre-resolved suggestions on conflicts.
7. Lift writing quality with a polish pass, anti-LLM pattern guard, and emotional-arc / chronological prompt reinforcement.
8. Build operational durability: real tokenizer in BudgetGuard, batch checkpointing, post-flight audits, adaptive JSON.
9. Lay foundation for multi-threaded narrative (Saga-spanning Global Timeline) — schema-only in this effort, full activation later.
10. Bring slot-based decomposition (NovelGenerator) into the Writer pipeline as an opt-in mode for high-stakes chapters.

## 2. Background — current pipeline

`apps/worker/src/jobs/generate-chapter.ts`:

```
PacketGenerator → PacketAuditor → DeterministicValidator → Writer
                                                          → LlmValidator → AutoFixer
                                                          → CanonExtractor → CanonMerger → SummaryCompactor
```

Issues identified across the source plans:

- **Validator placement.** Hard constraints fire post-Writer in `runner.ts` — wastes ~$0.03–$0.06 per blocked chapter.
- **Validator overlap.** Four cosmetic checks duplicate the LLM Validator's qualitative work and yield noisy false positives.
- **Continuity gaps.** No literal text bridge between chapters; no structured POV entry state.
- **AI omniscience.** `canon_facts` has no `known_by`; Writer can leak unknown info.
- **Stale facts at scale.** No TTL on canon — early-saga facts retrieve forever.
- **Heuristic budget guard.** `chars/3.2` instead of real tokenizer.
- **HITL noise.** All non-empty pending updates queue; low-importance no-conflict rows could auto-apply; no pre-resolved suggestions.
- **Single-pass writing.** No polish pass; no anti-LLM-pattern guard.
- **No batch resume.** A 50-chapter batch failing at chapter 30 forces a full restart.
- **No global timeline.** Multi-threaded narrative is impossible — single POV chronology assumed.
- **Heuristic anti-AI-isms.** No hardcoded AI-pattern blocklist (NovelGenerator's 16 forbidden words + 8 writing rules).
- **No Adaptive JSON.** Schema-failure recovery is ad-hoc.

## 3. Source-plan coverage matrix

Every source proposal mapped to its destination section / phase.

### Plan 1 — Stateful Continuity

| # | Proposal | Section | Phase |
|---|---|---|---|
| 2.1 | tail_content (200–300 words of ch N) in Warm Tier | §6, §10 | 2 |
| 2.2 | entry_state JSON on each ChapterPacket (location, timestamp, POV physical/emotional/goal/active_knowledge) | §6, §10 | 2 |
| 3.1 | active_location_id on context_packets — RAG location filter | §6, §10 | 2 |
| 3.2 | known_by[] on canon_facts (POV knowledge isolation) | §6, §10 | 2 |
| 4 | Multi-pass: Drafting → Det Validation → LLM Validator+Auto-Fixer → **Polish Pass** | §11 | 5 |
| 4 | High-Stakes Reviewer triggered on breakthrough/death | §11 | 5 |
| 5.1 | 3-tier optimisation (Hot/Warm/Cold) | §6 | 2 |
| 5.2 | Seed enforcement — auto-push to required_events with `priority: critical` when chapter ≥ plant_window_end − 2 | §11 | 1 |
| 6 | Schema: chapters.tail_content, characters.knowledge_ids, context_packets.active_location_id | §10 | 2 |
| 6 | Auto-Fixer pre-resolves pending_canon_updates conflicts (human just clicks Approve) | §13 | 3 |

### Plan 2 — Architecture & Operations

| # | Proposal | Section | Phase |
|---|---|---|---|
| 1 | Multi-threaded narrative + Global Timeline (Tech-gap analysis) | §15 | 7 (schema in 6) |
| 1 | Knowledge State isolation (cross-Plan-1) | §6, §10 | 2 |
| 1 | Emotional Arcs state machine | §11 | 4 |
| 1 | Semantic-drift control | §11 | 4 |
| 2 | Hot Tier compact_summary < 500 tokens | §6 | 1 (config) |
| 2 | Hot Tier preservation: forbidden_rules, cultivation_system, style_guide | §6 | 1 (config) |
| 2 | Warm Tier flashback gating via last_active_chapter | §6, §10 | 2 |
| 2 | Cold Tier hybrid RAG (keyword on active_characters + vector on goal/conflict) | §10, §12 | 3 |
| 3 | characters.knowledge_state JSONB Map<FactID, ChapterNumber> | §10 | 2 |
| 3 | canon_facts.valid_until_chapter (TTL) | §10, §12 | 2 |
| 3 | planted_seeds: enforce planted before paid_off; status restructure | §10, §11 | 2 |
| 4 | Writer prompt: Consistent Chronology + Emotional Arcs | §11 | 4 |
| 4 | Canon Extractor: prioritise Relationship Shifts + Knowledge Updates | §11 | 2 |
| 4 | Packet Auditor: Locked Facts + Forbidden Rules pre-write | §7, §11 | 1 |
| 5 | Heartbeat / Stale Job Detector at >30 min | §15 | 6 |
| 5 | Batch Checkpoint / Batch Resume | §15 | 6 |
| 5 | BudgetGuard real tokenizer (gpt-tokenizer) | §14 | 3 |
| 6 | Auto-approve pending updates: conflict_status=none AND importance=low | §13 | 3 |
| 6 | Mandatory Regeneration list (locked_fact critical, pivotal conflict, realm regression) | §11 | 1 |
| 7 | 3-stage roadmap | §16 | n/a |

### Plan 3 — Shift-Left Validators

| # | Proposal | Section | Phase |
|---|---|---|---|
| 2.1 | Drop 4 cosmetic deterministic checks (style_red_flags, cliffhanger, conflict_presence, repetition) | §7 | 1 |
| 2.2 | Downgrade word_count, unknown_character, unknown_location, new_bloodline_source to hints/low | §7 | 1 |
| 2.3 | Keep + upgrade 4 hard constraints (dead_character, realm_jump, locked_fact, forbidden_move) | §7 | 1 |
| 3 | Shift-Left: hard constraints into Phase 3 (Packet Auditor) with `previousIssues[]` regenerate hint | §7, §11 | 1 |
| 4 | Realm Jump: dynamic ladder parsing from cultivation_system JSONB | §7 | 1 |
| 4 | Dead Character: last_alive_chapter context-aware (flashback exception) | §7 | 1 |
| 4 | Locked Fact: vector cosine semantic search vs canon_facts(locked=true) | §7 | 1 |
| 5 | 3-stage roadmap (Refactor → Logic Upgrade → Decommission) | §16 | n/a |

### Plan 4 — Prompt Engineering

| # | Proposal | Section | Phase |
|---|---|---|---|
| 2 | SHA-256 Hashing for Hot Tier cache stability | §6 | exists / verify §17 |
| 2 | Anthropic-specific: Hot Tier at start of System message | §11 | exists / verify §17 |
| 2 | **Shrink Algorithm** P1=keep Hot, P2=trim oldest active_characters, P3=raise RAG threshold/min_gap | §6, §11 | 4 |
| 3 | Slot-based packet (goal, required_events, characters_present, conflict, cliffhanger) | exists | n/a |
| 3 | Packet Auditor: Check Due Seeds, Open Threads (high priority overdue), Character State (no dead) | §7, §11 | 1 |
| 4 | XML-delimited role-grouped system prompts: Planner / Creator / Monitor groups | §11 | 4 |
| 4 | Planner CoT before JSON | §11 | 4 |
| 5 | 5 Importance Levels formal taxonomy (Low / Medium / High / Critical / Locked) | §13 | 1 (formalisation) |
| 5 | 5 Canon Conflict Types (realm_regression, dead_character_action, locked_field, duplicate_fact, thread_status_invalid) | §13 | 1 (formalisation) |
| 5 | Pending Update standard structure with `paused_pending_updates` chapter state | §13 | 3 |
| 6 | 12 Deterministic Validators with severity tiers | §7 | 1 |
| 6 | Auto-Fixer patches in-place — does NOT rewrite whole chapter | §11 | exists / verify |
| 7 | Hybrid Routing: Flash 80% / Pro 20%; Writer + High-Stakes on Pro | §11 | 4 (audit) |
| 7 | Hot Tier hash stability check | §17 | 1 |
| 8 | **Pre-Generate Operational Checklist** (Bible Sync, Arc Continuity, BudgetGuard, Provider Health) | §15 | 6 |
| 8 | **Post-Flight Technical Audit** (Embedding Check, Stale Job Detector, Pending Queue Review) | §15 | 6 |

### Reference — NovelGenerator

| # | Proposal | Section | Phase |
|---|---|---|---|
| 1 | **Slot-Based decomposition** — Structure / Character / Scene / Synthesis Agents | §11 | 5 (opt-in mode) |
| 2 | **6-stage editing pipeline** (Initial Draft → Repetition fixes → Continuity checks → Professional polish) | §11 | 5 |
| 3 | Persistent Story Context DB — character knowledge, plot threads, world facts | §6, §10 | 2 |
| 4 | **Anti-LLM Patterns** — 16 forbidden words + 8 core writing rules | §11 | 5 |
| 4 | **Adaptive JSON schemas** with auto fallback | §15 | 6 |
| 4 | Tone-shift / dialogue-vs-description balance | §11 | 5 (LLM Validator) |

## 4. Adopted vs deferred

Every proposal is adopted somewhere — nothing is dropped. "Deferred" items still get spec language and a phase number; they're not silently abandoned.

- **Phases 1–4** ship the operational and continuity wins (validators, schema, RAG, prompts).
- **Phase 5** ships the writing-quality lift (polish pass, anti-LLM patterns, slot-mode for high-stakes chapters, multi-pass orchestration).
- **Phase 6** ships ops hardening (batch resume, adaptive JSON, post-flight checklist tooling).
- **Phase 7** ships multi-threaded narrative + global timeline.

If a phase is descoped at execution time, the deferred item moves to a follow-up effort — but its spec language stays.

## 5. Final System Flow

```
Phase A — Plan
  PacketGenerator
    → emits ChapterPacket with entry_state
    → seed enforcement: any pending seed where chapter >= plant_window_end - 2 auto-pushed
       into required_events with priority='critical'

Phase B — Audit (Shift-Left)
  packet-auditor:
    EXISTING:  dead_character, unresolved_due_seed, missing_conflict,
               missing_cliffhanger, realm_jump_excess, overdue_turning_point.
    NEW:       forbidden_move (regex on packet.forbiddenMoves ∪ requiredEvents),
               locked_fact (vector cosine ≥ 0.85 against canon_facts WHERE locked=true),
               open_thread_high_priority_overdue (Plan 4 §3),
               character_state_dead (Plan 4 §3 — already covered by dead_character),
               seeds_due_check (Plan 4 §3 — already covered by unresolved_due_seed).
    Mandatory regenerate codes (Plan 2 §6):
      - locked_fact_critical
      - dead_character_action
      - realm_regression_illegal
    On audit fail: regenerate Packet ONCE with previousIssues[] hint.
    Second fail → escalate to safe mode.

Phase C — Build Context (3-tier, stateful)
  HOT (cache-stable, hash unchanged):
    system_rules, bible_compact (compressed to ≤ 500 tokens but never losing
      forbidden_rules/cultivation_system/style_guide),
    style_guide, power_system, genre_contract, personality_contract,
    style_few_shots, story_options_block.
  WARM (per-chapter):
    saga_summary, arc_summary, active_characters
      (filtered by last_active_chapter; dead → suppress unless flashback in window),
    arc_open_threads, arc_planted_seeds, known_factions,
    + tail_content_prev (last 200–300 words of chapter N-1, deterministic slice),
    + entry_state (lifted from packet).
  COLD (RAG, hybrid + filtered):
    recent_summaries,
    retrieved_facts: hybrid (keyword on charactersPresent ∪ vector on goal/conflict)
      filtered by:
        - POV known_by (or known_by = [] for public)
        - TTL valid_until_chapter
        - active_location_id (when packet specifies one)
    retrieved_past_chapters, seeds_to_plant_now,
    timeline_events, pending_canon_updates, packet.
  Shrink algorithm when over TOKEN_BUDGET:
    P1: keep Hot intact (always).
    P2: trim active_characters with oldest last_active_chapter first.
    P3: raise RAG similarity threshold OR raise min_gap between recent_summaries.

Phase D — Write
  Default mode: WriterAgent (single-pass) — preserved baseline.
  High-stakes mode (opt-in via packet.highStakes flag, or auto-trigger on
    breakthrough / boss-fight / character-death):
    NovelGenerator-inspired slot pipeline:
      1. Structure agent → narrative framework with [DIALOGUE], [ACTION], [DESCRIPTION] slots.
      2. Character agent → fills [DIALOGUE].
      3. Scene agent → fills [ACTION] + [DESCRIPTION].
      4. Synthesis agent → assembles + transitions + logic-conflict resolution.
  All modes: Writer prompt receives surgical inserts:
    <consistent_chronology>, <entry_state>, <chapter_tail_bridge>, <emotional_arc>.
  System prompt unchanged → Hot cache preserved.

Phase E — Validate (lean post-write)
  Deterministic Validator:
    Hard (blocking): dead_character, realm_jump (llmVerifiable), locked_fact, forbidden_move.
    Hints (low):     word_count, unknown_character (medium, llmVerifiable),
                     unknown_location (low, llmVerifiable), unknown_faction (low),
                     new_bloodline_source.
    REMOVED (delegated to LLM Validator):
                     style_red_flags, cliffhanger, conflict_presence, repetition.
  Anti-LLM-Pattern guard (NovelGenerator):
    - 16 hardcoded forbidden phrases + 8 writing rules — surfaces as Auto-Fixer hints.

Phase F — LLM Validator → Auto-Fixer
  LLM Validator emits Issues + Severity (Critical / High / Medium / Low).
  Critical → chapter status `paused_pending_updates`.
  High/Medium/Low → Auto-Fixer patches in-place (does NOT rewrite chapter).
  Polish Pass (NovelGenerator stage 4):
    Final Auto-Fixer pass focused only on pacing / rhythm / sentence music
      using style_few_shots — runs only when prior passes pass.

Phase G — Memory
  CanonExtractor:
    emits known_by[] per fact,
    prioritises Relationship Shifts + Knowledge State Updates,
    flags any of 5 conflict types (realm_regression, dead_character_action,
      locked_field, duplicate_fact[cosine>0.95], thread_status_invalid).
  CanonMerger:
    auto-apply when conflict_status=none AND importance=low,
    on conflict → Auto-Fixer pre-resolves a suggested resolution;
      pending_canon_updates row stores `suggested_resolution` JSON
      so reviewer just clicks "Approve",
    chapter status becomes `paused_pending_updates` if any critical conflict.
  SummaryCompactor caller writes chapters.tail_content (deterministic suffix slice — no LLM).

Async (existing): RefreshArcSummary, HighStakesReview at arc-end / breakthrough / death.
```

## 6. Context Tier Design (full)

### Hot Tier (cache-stable, hashed)

Members (unchanged shape): `system_rules`, `bible_compact`, `style_guide`, `power_system`, `genre_contract`, `personality_contract`, `style_few_shots`, `story_options_block`.

**New constraints (Plan 2 §2):**
- `bible_compact` ≤ 500 tokens — enforced at SummaryCompactor build time.
- Mandatory preservation: `forbidden_rules`, `cultivation_system`/`power_system`, `style_guide` MUST NOT be elided during compaction. Compactor errors out instead of dropping them.

**Anthropic prompt cache rule (Plan 4 §7):** Hot Tier MUST be the first content of the system message — verified by serialiser invariant test in `cache-keys.test.ts`.

### Warm Tier (per-chapter)

Existing: `saga_summary`, `arc_summary`, `active_characters`, `arc_open_threads`, `arc_planted_seeds`, `known_factions`.

New: `tail_content_prev` (string, 200–300 words), `entry_state` (`EntryState` JSON).

Active-character filter switches from `last_seen_chapter` → `last_active_chapter` (Plan 2 §2). Dead characters suppressed unless `last_active_chapter ≥ chapterNumber - FLASHBACK_WINDOW (default 5)`.

### Cold Tier (RAG, filtered)

Existing: `recent_summaries`, `retrieved_facts`, `retrieved_past_chapters`, `seeds_to_plant_now`, `timeline_events`, `pending_canon_updates`, `packet`.

`retrieved_facts` upgraded to hybrid: keyword on `charactersPresent` ∪ vector on `goal/conflict`, fused by score sum. Filtered by:
- POV `known_by` (a fact is visible if `known_by = []` or `pov_id ∈ known_by`).
- TTL `valid_until_chapter` (`NULL` or `chapterNumber ≤ valid_until_chapter`).
- `active_location_id` (when packet supplies one — facts whose `tags` mention the location are upweighted).

### Shrink Algorithm (Plan 4 §2)

Implemented in `packages/ai/src/context/shrink.ts` (extending the existing file):

```
function shrinkToFit(ctx, budget):
  if estimateTokens(ctx) <= budget: return ctx
  // P1: never trim Hot.
  // P2: trim Warm.activeCharacters by oldest last_active_chapter until 50% reduction.
  while estimateTokens(ctx) > budget AND len(ctx.warm.activeCharacters) > MIN_KEEP:
    drop oldest
  if estimateTokens(ctx) <= budget: return ctx
  // P3: tighten Cold RAG.
  ctx.cold.retrievedFacts = ctx.cold.retrievedFacts.filter(f => f.score > raisedThreshold)
  ctx.cold.retrievedPastChapters = enforceMinGap(..., min_gap+5)
  if still over: drop pending_canon_updates oldest, then timelineEvents oldest.
  return ctx
```

## 7. Validator Restructure (full)

### Deterministic check matrix

| Check | Old severity | New severity | Phase | Notes |
|---|---|---|---|---|
| `dead_character` | critical | critical | audit + post-write | Use `last_alive_chapter` for flashback exception (Plan 3 §4) |
| `realm_jump` | high (llmVerifiable) | high (llmVerifiable) | audit + post-write | Dynamic ladder via `parseRealmLadder()` from `cultivation_system` JSONB (Plan 3 §4) |
| `locked_fact` | critical | critical (post-write) + high (audit) | audit + post-write | Vector cosine ≥ `LOCKED_FACT_AUDIT_THRESHOLD` (default 0.85) (Plan 3 §4) |
| `forbidden_move` | critical | critical (post-write) + high (audit) | audit + post-write | Regex on `packet.forbiddenMoves ∪ requiredEvents` |
| `word_count` | medium | **low** (hint) | post-write | No block |
| `unknown_character` | medium (llmVerifiable) | medium (llmVerifiable) | post-write | unchanged |
| `unknown_location` | low (llmVerifiable) | low (llmVerifiable) | post-write | unchanged |
| `unknown_faction` | low | low | post-write | unchanged |
| `new_bloodline_source` | medium | **low** (hint) | post-write | No block |
| `style_red_flags` | medium | **REMOVED** | — | LLM Validator |
| `cliffhanger` | low | **REMOVED** | — | LLM Validator |
| `conflict_presence` | medium | **REMOVED** | — | LLM Validator |
| `repetition` | low | **REMOVED** | — | LLM Validator |

Net: 12 → 9 checks (cultivation), 9 → 7 (non-cultivation). Hard blockers: 4. Hints: 5.

### Audit-side additions (`auditPacket`)

Existing codes (preserved): `dead_character`, `unresolved_due_seed`, `missing_conflict`, `missing_cliffhanger`, `realm_jump_excess`, `overdue_turning_point`.

New codes:
- `forbidden_move` — regex sweep over `requiredEvents[].description ∪ forbiddenMoves[]`.
- `locked_fact` — vector cosine over `requiredEvents` embeddings vs `canon_facts WHERE locked=true`.
- `open_thread_high_priority_overdue` — any `open_threads` with `priority='high'` un-touched for ≥ 10 chapters.

### Mandatory-regeneration set (Plan 2 §6)

Two independent sets:

**A. Packet-audit-time** (codes from `auditPacket`) — if any present, ALWAYS regenerate the packet (do not partial-fix):
- `locked_fact` with `severity ∈ {critical, high}`.
- `dead_character` with active action in `requiredEvents`.
- `realm_jump_excess`.

**B. Post-write extraction-time** (conflict reasons from `canon-extractor` / `conflict-detector`) — if any present, set `chapter.status = 'paused_pending_updates'` and require human review (no automatic regeneration since the chapter is already written):
- `realm_regression` (new realm < current).
- `dead_character_action` (post-mortem action).
- `locked_field` (mutating a locked canon field).

### Audit retry policy

```
attempt = 0
while attempt < 2:
  audit = auditPacket(packet, ctx)
  if !audit.requiresRegenerate: break
  if attempt === 1: break
  packet = await regeneratePacket(packet, { previousIssues: audit.issues })
  attempt++
if audit.requiresRegenerate: escalateToSafeMode()
```

Hard cap: 1 retry. Avoids infinite loops; second failure follows existing safe-mode behaviour.

## 8. Importance Levels (Plan 4 §5) — formalised

```ts
export const IMPORTANCE_LEVELS = ['low', 'medium', 'high', 'critical', 'locked'] as const;
export type ImportanceLevel = typeof IMPORTANCE_LEVELS[number];
```

Behaviour table:

| Level | Auto-merge if no conflict | Always RAG-priority | Lockable |
|---|---|---|---|
| low | YES | no | no |
| medium | no | no | no |
| high | no | no | no |
| critical | no | YES | no |
| locked | no | YES | YES (no auto-update) |

## 9. Canon Conflict Types (Plan 4 §5) — formalised

```ts
export const CANON_CONFLICT_TYPES = [
  'realm_regression',
  'dead_character_action',
  'locked_field',
  'duplicate_fact',          // cosine > 0.95 vs existing
  'thread_status_invalid',   // resolve a closed thread
] as const;
```

Conflict detector (`packages/ai/src/reconciliation/conflict-detector.ts`) extended to flag each type. Each becomes a `pending_canon_updates.conflict_reasons[]` entry. Auto-resolved suggestions stored in `pending_canon_updates.suggested_resolution` JSON.

## 10. Database Schema Changes (full)

### Phase 2 columns

`packages/db/src/schema/chapters.ts`
```ts
tailContent: text('tail_content'),
```

`packages/db/src/schema/chapter-packets.ts`
```ts
entryState: jsonb('entry_state').$type<EntryState>(),
```

`packages/db/src/schema/characters.ts`
```ts
knowledgeState: jsonb('knowledge_state').$type<Record<string, number>>().default({}).notNull(),
lastActiveChapter: integer('last_active_chapter').default(0).notNull(),
```

`packages/db/src/schema/canon-facts.ts`
```ts
validUntilChapter: integer('valid_until_chapter'),
knownBy: jsonb('known_by').$type<string[]>().default([]).notNull(),
```

`packages/db/src/schema/context-packets.ts`
```ts
activeLocationId: uuid('active_location_id').references(() => settings.id, { onDelete: 'set null' }),
```

### Phase 3 columns

`packages/db/src/schema/pending-canon-updates.ts`
```ts
suggestedResolution: jsonb('suggested_resolution'),  // pre-resolved patch from Auto-Fixer
```

### Phase 5 columns

`packages/db/src/schema/chapters.ts`
```ts
generationMode: text('generation_mode').default('single_pass').notNull(), // 'single_pass' | 'slot_based'
polishPassStatus: text('polish_pass_status').default('skipped').notNull(),
```

### Phase 6 columns

`packages/db/src/schema/batches.ts`
```ts
checkpointChapter: integer('checkpoint_chapter').default(0).notNull(),
resumedFromChapter: integer('resumed_from_chapter'),
```

### Phase 7 columns (schema-only; full activation later)

`packages/db/src/schema/timeline-events.ts`
```ts
threadId: uuid('thread_id'),                                  // nullable; ties event to a plot thread
parallelSagaId: uuid('parallel_saga_id'),                     // nullable; cross-saga sync
```

`packages/db/src/schema/sagas.ts`
```ts
parentTimelineId: uuid('parent_timeline_id'),                 // for multi-thread sagas
```

All migrations additive — no destructive changes, no backfill required.

### `EntryState` type (Phase 2)

`packages/ai/src/schemas/packet.ts`
```ts
export const EntryStateSchema = z.object({
  locationId: z.string().optional(),
  timestamp: z.string().optional(),
  povCharacter: z.object({
    name: z.string(),
    physicalCondition: z.string().optional(),
    emotionalState: z.string().optional(),
    immediateGoal: z.string().optional(),
    activeKnowledge: z.array(z.string()).default([]),
  }),
});
export type EntryState = z.infer<typeof EntryStateSchema>;
```

## 11. Agent / Prompt Changes

### PacketGenerator (Phase 2)

- Output schema gains `entryState`.
- Output schema gains `seedsAutoEnforced[]` listing seed ids that were auto-pushed via the deadline rule (Plan 1 §5.2).
- Prompt instructions added: derive `entry_state` from prev-chapter summary + character DB state; do NOT invent.

### PacketAuditor (Phase 1)

Implements every audit rule listed in §7 plus:
- Plan 4 §3: Check Open Threads with `priority='high'` overdue.
- Plan 4 §3: Check Character State (already covered).
- Plan 4 §3: Check Due Seeds (already covered).

### CanonExtractor (Phase 2)

- Output schema gains `knownBy[]` per `newCanonFacts[]`.
- Output schema gains `validUntilChapter?` per fact (extractor hints expiry; null = eternal).
- Prompt re-prioritised: emit Relationship Shifts and Knowledge Updates BEFORE physical-event facts (Plan 2 §4, Plan 1 §3.2).
- Prompt tags every fact with one of the 5 importance levels and any of the 5 conflict types it triggers.

### CanonMerger (Phase 3)

- Auto-apply when `conflict_status='none' AND importance='low'`.
- On conflict → run Auto-Fixer-Lite to produce `suggested_resolution` JSON (resolve realm_regression by deferring the demotion, mark dead_character_action as flashback, etc.).
- Insert into `pending_canon_updates` with the suggestion attached.
- Chapter status becomes `paused_pending_updates` if any conflict reason is in the mandatory-regeneration set.

### Writer prompt (Phase 4)

System prompt unchanged (preserves Hot cache). User message gains four conditional XML blocks:

```xml
<consistent_chronology>
- Recent timeline events: {{timelineEvents}}
- Saga rolling summary: {{sagaRollingSummary}}
- Hold continuity with chapter {{chapterNumber - 1}} via tail bridge.
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
- Show transition through events, not telling. Avoid abrupt tonal shifts.
</emotional_arc>
```

### Role-grouped system prompts (Plan 4 §4) — Phase 4

A new `packages/ai/src/prompts/role-frames.ts` exports three reusable XML-tagged frames. Each agent's prompt v-bump opts into the right frame:

- **Planner frame** (Bible / Saga / Arc / Packet generators): hierarchical-respect + CoT-before-JSON.
- **Creator frame** (Writer / Auto-Fixer): style_guide + Forbidden Rules.
- **Monitor frame** (LLM Validator / Canon Extractor / Summary Compactor): objective + importance-classification.

Frames are appended to system prompts as XML blocks AFTER the cached Hot Tier — preserves cache hash while adding behavioural reinforcement.

### Polish Pass (Phase 5 — Plan 1 §4 + reference §2)

A separate `polish-pass` agent in `packages/ai/src/agents/polish-pass.ts`:
- Runs only after LLM Validator + Auto-Fixer succeed.
- Receives final chapter content + style_few_shots.
- Single-purpose prompt: pacing, rhythm, sentence-music. NO logic edits.
- Records `polishPassStatus = 'applied' | 'skipped' | 'failed'` on `chapters` row.

### High-Stakes Reviewer (Phase 5 — Plan 1 §4)

Existing `high-stakes-reviewer.ts` already exists. Phase 5 adds the trigger logic:
- Auto-trigger when packet has `requiredEvents` containing breakthrough OR character death OR `arc.phase === 'climax'`.
- Existing scheduling preserved.

### Slot-Based decomposition (Phase 5 — reference §1) — opt-in mode

Off by default. Activated when:
- `packet.highStakes === true`, OR
- chapter is first/last of an arc, OR
- explicit operator override.

Pipeline (`packages/ai/src/agents/slot-pipeline/`):
1. `structure-agent.ts` → emits framework with `[DIALOGUE_SLOT_n]`, `[ACTION_SLOT_n]`, `[DESCRIPTION_SLOT_n]` markers.
2. `character-agent.ts` → fills DIALOGUE slots.
3. `scene-agent.ts` → fills ACTION + DESCRIPTION slots.
4. `synthesis-agent.ts` → assembles, generates transitions, resolves logic conflicts.

Records `generationMode='slot_based'` on `chapters`.

### Anti-LLM Patterns (Phase 5 — reference §4)

`packages/ai/src/validators/anti-llm-patterns.ts`:
- Hardcoded list of 16 forbidden phrases (e.g. "in conclusion", "however,"-overuse, etc. — list calibrated for Vietnamese xianxia by translating + extending NovelGenerator's English list).
- 8 core writing rules (e.g., no AI-style summarisation, no "X-comma-Y" parallelism overuse, no rhetorical questions in narration).
- Surfaces violations as Auto-Fixer hints (post-Polish Pass), severity `low`.

### Adaptive JSON Schemas (Phase 6 — reference §4)

`packages/ai/src/parse-completion-json.ts` upgraded:
- On parse failure: attempt 3 fallback strategies in order: a) strip Markdown fences, b) regex-extract JSON object, c) re-prompt LLM with schema + parse error.
- Each fallback logged to `llm_calls.metadata.parse_recovery`.

## 12. Hybrid RAG (Phase 3)

`packages/ai/src/context/retrieval.ts` adds:

```ts
export async function getTopKCanonFactsHybrid(
  db, storyId, queryEmbedding, characterNames, chapterNumber, povId, activeLocationId, topK
): Promise<CanonFactCompact[]>
```

SQL outline:
```sql
WITH kw AS (
  SELECT id, 0.5 AS score FROM canon_facts
  WHERE story_id = $1
    AND topic ILIKE ANY ($characterNames patterns)
    AND (valid_until_chapter IS NULL OR $chapterNumber <= valid_until_chapter)
    AND (jsonb_array_length(known_by) = 0 OR known_by @> jsonb_build_array($povId))
  LIMIT $topK
),
vec AS (
  SELECT id, (1.0 - (embedding <=> $2::vector)) * 0.5 AS score
  FROM canon_facts
  WHERE story_id = $1
    AND embedding IS NOT NULL
    AND (valid_until_chapter IS NULL OR $chapterNumber <= valid_until_chapter)
    AND (jsonb_array_length(known_by) = 0 OR known_by @> jsonb_build_array($povId))
  ORDER BY embedding <=> $2::vector
  LIMIT $topK
),
loc_boost AS (
  SELECT id, 0.2 AS score FROM canon_facts
  WHERE $activeLocationId IS NOT NULL
    AND tags @> jsonb_build_array($activeLocationId)
)
SELECT id, SUM(score) AS rank
FROM (kw UNION ALL vec UNION ALL loc_boost) sub
GROUP BY id
ORDER BY rank DESC
LIMIT $topK;
```

Fallback: when `characterNames=[]` AND `activeLocationId=NULL`, behave as the existing pure-vector retrieval (no behaviour change).

## 13. Pending Canon Updates — full structure (Plan 4 §5 + Plan 1 §6)

```ts
type PendingCanonUpdate = {
  id: string;
  chapterId: string;
  updateType: 'character_update' | 'fact_create' | 'thread_update' | 'timeline_event' | 'faction_update';
  targetTable: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  importance: ImportanceLevel;                          // §8
  conflictStatus: 'none' | 'conflict' | 'duplicate';
  conflictReasons: CanonConflictType[];                 // §9
  suggestedResolution: Record<string, unknown> | null;  // pre-resolved patch
  resolution: 'pending' | 'approved' | 'rejected' | 'auto_applied';
  createdAt: Date;
  resolvedAt: Date | null;
};
```

Chapter-side state added: `chapter.status = 'paused_pending_updates'` when any conflict is critical/locked.

## 14. BudgetGuard tokenizer upgrade (Phase 3 — Plan 2 §5)

`packages/core/src/policy/budget-guardrails.ts`:

```ts
let encoderRef: { encode: (s: string) => unknown[] } | null = null;
function getEncoder() {
  if (encoderRef) return encoderRef;
  try {
    // dynamic import isolated per call to avoid hard dependency at boot
    encoderRef = require('gpt-tokenizer');
    return encoderRef;
  } catch { return null; }
}
export function estimateTokens(text: string): number {
  const enc = getEncoder();
  if (enc) return enc.encode(text).length;
  return Math.ceil(text.length / 3.2);
}
```

All existing call sites switch to `estimateTokens()`. Daily/monthly caps unchanged.

## 15. Operations / Infrastructure (Phase 6)

### Stale Job Detector (Plan 2 §5) — already exists; verify

`apps/worker/src/services/stale-job-detector.ts` confirmed at 30 min threshold. Phase 6 adds:
- Metric counter `stale_jobs_reset_total` (Sentry / log).
- Notification when ≥ 3 resets within 1 hour (likely a real bug, not transient).

### Batch Resume / Batch Checkpoint (Plan 2 §5)

`apps/worker/src/services/batch-checkpoint.ts` (new):
- After each chapter completes, write `batch.checkpoint_chapter = N`.
- New API endpoint `POST /api/admin/batches/:id/resume` reads checkpoint and re-enqueues from `checkpoint_chapter + 1`.
- Idempotency key on the BullMQ job: `{batchId}:{chapterNumber}` — existing jobs at that key short-circuit with success.

### Pre-Generate Operational Checklist (Plan 4 §8)

A pre-flight runner at `apps/worker/src/services/preflight.ts` runs the following BEFORE enqueuing a generate-chapter job:
- [ ] Bible Version Sync — latest `story_bibles` row matches story's `currentBibleVersion`.
- [ ] Arc Continuity — current chapter ∈ `[arc.startChapter, arc.endChapter]`.
- [ ] BudgetGuard Pre-flight — `BudgetGuard.preflightOrThrow()` clears daily ($5) + monthly ($50) caps.
- [ ] Provider Health — `llm_provider_state` shows the active provider as healthy.

Failure → reject the enqueue and surface the failed item to the operator.

### Post-Flight Technical Audit (Plan 4 §8)

A nightly cron at `apps/worker/src/services/post-flight-audit.ts`:
- [ ] Embedding Check — `SELECT id FROM chapter_summaries WHERE embedding IS NULL`. Re-queue embedding for any hit.
- [ ] Stale Job Detector — invokes the existing detector once.
- [ ] Pending Queue Review — count `pending_canon_updates` older than 7 days; alert if > 50.

### Adaptive JSON (reference §4)

Implemented in §11 above.

## 16. Multi-threaded Narrative + Global Timeline (Phase 7 — Plan 2 §1, §7)

Schema seeds added in Phase 6 (`timeline_events.thread_id`, `timeline_events.parallel_saga_id`, `sagas.parent_timeline_id`) — Phase 7 wires the logic:

- Cross-thread sync: `getTimelineEventsForChapter` upgraded to pull events from sibling threads when `current_chapter` matches a sync point.
- Writer prompt grows a `<parallel_threads>` block (conditional) listing sibling-thread state at the chapter's logical timestamp.
- Saga Planner gains a "convergence point" output — when threads should reunite.

Phase 7 is the largest scope and intentionally last. Schema is added earlier so that earlier phases can populate fields without behaviour change.

## 17. Cache & Hash Invariants

- `cache-keys.test.ts` invariant: Hot hash MUST be byte-identical for two builds with identical Bible + Style Guide, regardless of Warm/Cold differences (Plan 1, Plan 4).
- `cache-keys.test.ts` invariant: Warm hash MUST differ when `tailContentPrev` differs.
- Serialiser test: Hot Tier MUST be the FIRST element of the serialised system message (Anthropic prompt-cache positioning, Plan 4 §7).

## 18. Implementation Phases (high-level)

| Phase | Scope | Risk | Detail |
|---|---|---|---|
| 1 | Validator restructure (Shift-Left + cleanup) + importance/conflict taxonomies + seed enforcement + bible_compact ≤ 500 token guard | Low | Pure validator-package logic |
| 2 | Schema migrations + Warm/Cold tier wiring + tail_content + entry_state + known_by + valid_until_chapter + last_active_chapter + active_location_id + Canon Extractor relationship-priority | Medium | Drizzle migrations, additive |
| 3 | Hybrid RAG + auto-approve canon updates (with suggested_resolution) + gpt-tokenizer in BudgetGuard + paused_pending_updates state | Medium | Retrieval rewrite, merger branch |
| 4 | Writer prompt inserts + role-grouped system prompts + Shrink Algorithm in code + Anthropic Hot-Tier-first invariant test + hybrid routing audit | Low | Prompt-only |
| 5 | Multi-pass orchestration: Polish Pass + High-Stakes auto-trigger + Slot-Based decomposition (opt-in) + Anti-LLM Pattern guard | High | New agents |
| 6 | Ops hardening: Batch Resume, Pre-Flight + Post-Flight checklists, Adaptive JSON, observability metrics | Medium | New services |
| 7 | Multi-threaded narrative + Global Timeline (logic — schema landed Phase 6) | High | Foundation only; full activation later |

## 19. Operational Impact

| Metric | Before | After |
|---|---|---|
| Cost per blocked chapter | $0.03–0.06 wasted | ~$0 (caught at packet audit) |
| Estimated total cost reduction | baseline | ~15–20% (Plan 3 §5) |
| Hot Tier cache hit rate | ≥ 90% | ≥ 90% (preserved) |
| AI omniscience leaks | possible | eliminated via `known_by` |
| Saga RAG quality at ch.1000 | degrades | stable via TTL |
| Deterministic check surface | 12 checks | 9 checks |
| HITL queue volume | all non-conflict updates | only conflict / high+ / locked, with pre-resolved suggestions |
| Budget estimation error | ±15% (heuristic) | ±2% (tokenizer) |
| Anti-LLM-pattern surface | none | 16 phrases + 8 rules |
| Continuity bridge | rolling summary only | + literal `tail_content_prev` |
| Polish-pass coverage | none | every chapter (Phase 5) |
| Slot-based mode | none | opt-in for high-stakes (Phase 5) |
| Multi-thread support | none | schema-ready (Phase 6), active (Phase 7) |
| Batch failures | full restart | resume from checkpoint |

## 20. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Hot Tier hash drift breaks prompt cache | Hot-hash invariant test in `cache-keys.test.ts` |
| Hybrid RAG returns fewer relevant facts than pure vector | Fallback to pure vector when hybrid yields < 3 rows |
| `gpt-tokenizer` not bundled in worker | Lazy require + char heuristic fallback |
| Audit retry creates infinite regenerate loop | Hard cap 1 retry; second failure → safe mode |
| `known_by = []` accidentally hides public facts | Empty array treated as public (visible to all) |
| Auto-approve hides extractor bugs | Log every auto-applied row to `llm_calls.metadata` |
| Slot-based mode quality unproven | Phase 5 opt-in only; A/B vs single-pass on small sample first |
| Anti-LLM pattern list false-positives | Severity `low` (hint only); revisable list in code |
| Adaptive JSON re-prompt doubles cost | Hard cap 1 re-prompt; metric tracks frequency |
| Multi-thread Global Timeline Phase 7 scope creep | Schema-only in Phase 6 — Phase 7 can ship in a follow-up effort |
| `bible_compact > 500 tokens` after first pass | Compactor errors out and re-runs once with stricter prompt; second failure → operator alert |

## 21. Testing Plan

- Unit:
  - `packet-auditor.test.ts` — `forbidden_move`, `locked_fact`, `open_thread_high_priority_overdue`, 1-retry budget, mandatory-regen set.
  - `runner.test.ts` — confirm 4 dropped checks not registered, severity downgrades reflected.
  - `retrieval.test.ts` — hybrid RAG ordering, TTL filter, `known_by` filter, location boost.
  - `canon-merger.test.ts` — auto-apply branch on `none + low`; `suggested_resolution` populated on conflict.
  - `cache-keys.test.ts` — Hot-hash invariant; Warm-hash sensitivity; Hot-first serialisation.
  - `budget-guardrails.test.ts` — tokenizer parity within ±5% vs heuristic on a 5k-char sample.
  - `seed-enforcement.test.ts` — auto-push when chapter ≥ plant_window_end − 2.
  - `shrink.test.ts` — P1 keeps Hot, P2 trims oldest character, P3 raises threshold.
  - `polish-pass.test.ts` — only runs after passing prior phases; failure path gracefully sets `polishPassStatus`.
  - `slot-pipeline.test.ts` — slot markers correctly emitted, fillers don't cross slots.
  - `anti-llm-patterns.test.ts` — known phrases flagged.
  - `adaptive-json.test.ts` — three fallback strategies, metric logged.
- Integration: `apps/api` chapter-pipeline test with new schema columns; batch resume test.
- Smoke: `pnpm smoke:generate-chapter` after each phase.
- Subjective: 1–2 chapters reviewed in the web UI after Phase 4 and Phase 5.

## 22. Open Questions (resolved at implementation)

None at spec level. Implementation plan tracks per-task tunables (audit thresholds, default tail-content length, etc.).

---

**Source plans referenced (full coverage matrix in §3):**
[plan_1.md](../../notebook_llm_improvement/plan_1.md),
[plan_2.md](../../notebook_llm_improvement/plan_2.md),
[plan_3.md](../../notebook_llm_improvement/plan_3.md),
[plan_4.md](../../notebook_llm_improvement/plan_4.md),
[reference.md](../../notebook_llm_improvement/reference.md).
