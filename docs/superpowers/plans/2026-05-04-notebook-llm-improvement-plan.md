# NotebookLM-Style Improvement — Implementation Plan

**Spec:** [2026-05-04-notebook-llm-improvement-design.md](../specs/2026-05-04-notebook-llm-improvement-design.md)
**Date:** 2026-05-04
**Coverage rule:** every proposal in plan_1..4 + reference.md is mapped to a phase. **No silent drops.**

---

## Conventions

- Each phase is a single PR-able unit, ends green: `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke:generate-chapter` (where listed).
- Tests written **before** the matching implementation where reasonable.
- Each phase commits independently with a `feat(...)` or `refactor(...)` prefix.
- Schema migrations are additive only — no destructive changes, no data backfill required.

---

# Phase 1 — Validator Restructure & Taxonomies

**Spec sections:** §3 Plan 3 (all rows), Plan 4 §5 / §6, Plan 1 §5.2, Plan 2 §2 / §6, Plan 3 §1–§5
**Goal:** Hard constraints catch violations before Writer runs; cosmetic checks delegated; importance/conflict taxonomies formalised; seed enforcement, mandatory-regen list, bible_compact size guard.
**Risk:** Low — pure logic shuffle inside the validator + core packages.
**Estimated saving on rollout:** ~15% of generation spend (Plan 3 §5).

## 1.1 Audit current surface

- [ ] `grep -rn "severity:" packages/ai/src/validators/deterministic/` — confirm matrix vs spec §7.
- [ ] `grep -rn "llmVerifiable" packages/ai/src/validators/deterministic/` — confirm flags.
- [ ] Read `packages/ai/src/validators/packet-auditor.ts` — confirm existing audit codes.
- [ ] Verify Plan 3 §4 "Realm Jump dynamic ladder" already implemented: `parseRealmLadder()` parses from `cultivation_system` JSONB and `auditPacket` accepts `ctx.realmLadder`. If gap → add task here.

**Verify:** matches spec §7. If divergent, update spec inline before continuing.

## 1.2 Drop 4 cosmetic deterministic checks (Plan 3 §2.1)

- [ ] `packages/ai/src/validators/deterministic/runner.ts` — remove imports + `allChecks` entries for `cliffhangerCheck`, `conflictPresenceCheck`, `styleRedFlagsCheck`, `repetitionCheck`.
- [ ] Delete `cliffhanger.ts`, `conflict-presence.ts`, `style-red-flags.ts`, `repetition.ts` (verify zero external consumers).
- [ ] Remove their tests under `packages/ai/test/validators/`.

**Verify:** `pnpm --filter @novel/ai vitest run test/validators/`

## 1.3 Downgrade severities (Plan 3 §2.2)

- [ ] `word-count.ts`: `severity: 'medium'` → `'low'`.
- [ ] `new-bloodline-source.ts`: `severity: 'medium'` → `'low'`.
- [ ] Update tests asserting on old severities.

**Verify:** `pnpm --filter @novel/ai vitest run test/validators/`

## 1.4 Add `forbidden_move` to `auditPacket` (Plan 2 §4, Plan 3 §2.3)

- [ ] `packages/ai/src/validators/packet-auditor.ts`:
  - Tokenise `forbiddenRulesText` (already exists in `AuditInput`).
  - Scan `packet.requiredEvents[].description` and `packet.forbiddenMoves[]` for case-insensitive matches.
  - Emit `code: 'forbidden_move', severity: 'high'`.
- [ ] Tests: a) clean packet, b) forbidden phrase in requiredEvents, c) forbidden phrase in forbiddenMoves, d) empty forbiddenRules → no false positive.

**Verify:** `pnpm --filter @novel/ai vitest run test/validators/packet-auditor.test.ts`

## 1.5 Add `locked_fact` (vector cosine) to `auditPacket` (Plan 3 §4)

- [ ] `packages/ai/src/context/retrieval.ts` — add `getLockedCanonFacts(db, storyId)`: returns `{ id, fact, embedding }[]` filtered `WHERE locked = true AND embedding IS NOT NULL`.
- [ ] `packages/ai/src/embeddings/utils.ts` — add `cosineSimilarity(a, b)`.
- [ ] `packages/core/src/config/index.ts` — add `GENERATION_CONFIG.LOCKED_FACT_AUDIT_THRESHOLD = 0.85`.
- [ ] `packages/ai/src/validators/packet-auditor.ts`:
  - Extend `AuditInput` with `lockedFacts: { id; fact; embedding: number[] }[]` and `requiredEventEmbeddings: number[][]`.
  - For each requiredEvent embedding, compute max cosine vs locked facts; flag if ≥ threshold with `severity: 'high'`.
- [ ] `apps/worker/src/jobs/generate-chapter.ts`:
  - Call `getLockedCanonFacts`.
  - Embed `requiredEvents[].description` via existing `embeddingService`.
  - Pass into `auditPacket`.
- [ ] Tests: semantically-similar requiredEvent → flagged; unrelated → passes.

**Verify:** `pnpm --filter @novel/ai vitest run test/validators/`

## 1.6 Add `open_thread_high_priority_overdue` (Plan 4 §3)

- [ ] `packet-auditor.ts` — extend `AuditInput` with `openThreads: ThreadCompact[]`.
- [ ] Emit `code: 'open_thread_high_priority_overdue', severity: 'medium'` when a thread has `priority='high'` AND `last_referenced_chapter < currentChapter - 10`.
- [ ] Tests: thread overdue flagged; thread referenced recently passes.

**Verify:** `pnpm --filter @novel/ai vitest run test/validators/packet-auditor.test.ts`

## 1.7 Mandatory-regeneration set (Plan 2 §6)

Set A (packet-audit time) only — `realm_regression` / `dead_character_action` / `locked_field` are post-write conflicts handled in Phase 3 §3.4.

- [ ] `packet-auditor.ts` — add `MANDATORY_REGEN_CODES = new Set(['locked_fact', 'dead_character', 'realm_jump_excess'])`.
- [ ] In `AuditResult`, set `requiresRegenerate=true` whenever any issue's code is in this set, regardless of severity.

**Verify:** unit test: critical-locked-fact + low-severity → still requires regenerate.

## 1.8 Wire single regenerate retry (Plan 3 §3)

- [ ] `apps/worker/src/jobs/generate-chapter.ts` — wrap audit + Writer call:
  ```
  let attempt = 0
  while attempt < 2:
    audit = auditPacket(...)
    if !audit.requiresRegenerate: break
    if attempt === 1: break
    packet = await regeneratePacket(packet, { previousIssues: audit.issues })
    attempt++
  if audit.requiresRegenerate: escalateToSafeMode()
  ```
- [ ] `packages/ai/src/agents/packet-generator.ts` — `generate()` accepts optional `previousIssues?: AuditIssue[]`; injects as `<previous_issues>` block in prompt.
- [ ] Integration test: first packet fails audit → regen passes.

**Verify:** `pnpm --filter @novel/worker vitest run`

## 1.9 Seed enforcement (Plan 1 §5.2)

- [ ] `packages/ai/src/agents/packet-generator.ts`:
  - Before LLM call, fetch all pending seeds where `chapterNumber >= plant_window_end - 2`.
  - Inject as `<must_include_seeds>` block in user prompt with priority='critical'.
  - Output schema gains `seedsAutoEnforced: string[]` (ids).
- [ ] If LLM returns a packet missing any auto-enforced seed → packet-auditor will flag it via existing `unresolved_due_seed`. Combined with §1.8 → auto-regenerate.
- [ ] Test: seed at plant_window_end−1 → auto-pushed.

**Verify:** `pnpm --filter @novel/ai vitest run test/agents/packet-generator.test.ts`

## 1.10 Importance & Conflict Taxonomies (Plan 4 §5)

- [ ] `packages/core/src/types/canon.ts` (new):
  ```ts
  export const IMPORTANCE_LEVELS = ['low', 'medium', 'high', 'critical', 'locked'] as const;
  export type ImportanceLevel = typeof IMPORTANCE_LEVELS[number];

  export const CANON_CONFLICT_TYPES = [
    'realm_regression', 'dead_character_action', 'locked_field',
    'duplicate_fact', 'thread_status_invalid',
  ] as const;
  export type CanonConflictType = typeof CANON_CONFLICT_TYPES[number];
  ```
- [ ] Replace ad-hoc string literals across the codebase with these unions (Zod `z.enum(IMPORTANCE_LEVELS)`).
- [ ] Update DB-side type narrowing in `canon_facts.importance` and `pending_canon_updates.conflict_reasons[]`.

**Verify:** `pnpm typecheck`

## 1.11 `bible_compact` ≤ 500 token guard (Plan 2 §2)

- [ ] `packages/ai/src/agents/summary-compactor.ts` — after parsing, if `estimateTokens(output.summary) > 500`:
  - Re-run with stricter "≤500 tokens, never lose forbidden_rules/cultivation_system/style_guide" prompt instruction.
  - On second failure → throw `BibleCompactionTooLargeError`.
- [ ] Operator alert path: error logged with `severity='operator_alert'` so existing logging surfaces it.
- [ ] Test: oversized summary → re-run; still oversized → error.

**Verify:** `pnpm --filter @novel/ai vitest run`

## 1.12 Phase-1 gate

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm smoke:generate-chapter`

**Commit:** `refactor(validators): shift-left + cleanup + taxonomies + seed enforcement + bible compact guard`

---

# Phase 2 — Stateful Continuity Schema + Context Builder

**Spec sections:** Plan 1 §2 / §3 / §6, Plan 2 §1 / §2 / §3 / §4, reference §3
**Goal:** Writer receives `tail_content` + `entry_state` + POV-filtered facts. Schema columns added.
**Risk:** Medium — Drizzle migrations + builder rewiring.

## 2.1 Schema migrations (Plan 1 §6, Plan 2 §3)

- [ ] `packages/db/src/schema/chapters.ts` — `tailContent: text('tail_content')`.
- [ ] `packages/db/src/schema/chapter-packets.ts` — `entryState: jsonb('entry_state').$type<EntryState>()`.
- [ ] `packages/db/src/schema/characters.ts` — `knowledgeState: jsonb('knowledge_state').$type<Record<string, number>>().default({}).notNull()`, `lastActiveChapter: integer('last_active_chapter').default(0).notNull()`.
- [ ] `packages/db/src/schema/canon-facts.ts` — `validUntilChapter: integer('valid_until_chapter')`, `knownBy: jsonb('known_by').$type<string[]>().default([]).notNull()`.
- [ ] `packages/db/src/schema/context-packets.ts` — `activeLocationId: uuid('active_location_id').references(() => settings.id, { onDelete: 'set null' })` (`settings` table assumed; adjust to actual table name).
- [ ] `pnpm db:generate` — migration must be additive only.
- [ ] `pnpm db:migrate` against local Postgres.

**Verify:** `pnpm --filter @novel/db typecheck`

## 2.2 `EntryState` type (Plan 1 §2.2)

- [ ] `packages/ai/src/schemas/packet.ts`:
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
- [ ] Extend `ChapterPacketSchema` with `entryState?: EntryState`.

**Verify:** `pnpm --filter @novel/ai typecheck`

## 2.3 Update `WarmTier` types (Plan 1 §5.1)

- [ ] `packages/ai/src/context/types.ts` — extend `WarmTier`:
  ```ts
  tailContentPrev?: string;
  entryState?: EntryState;
  ```
- [ ] Decision (locked here): Hot hash invariant under these changes; Warm hash MAY change. Add Warm-hash sensitivity test.

**Verify:** `pnpm --filter @novel/ai vitest run test/context/cache-keys.test.ts`

## 2.4 Retrieval helpers (Plan 1 §3.2, Plan 2 §2 / §3)

- [ ] `packages/ai/src/context/retrieval.ts`:
  - `getPrevChapterTailContent(db, storyId, chapterNumber): Promise<string | null>`.
  - `getActiveCharacters` — replace filter to use `lastActiveChapter` (fall back to `lastSeenChapter` when `lastActiveChapter === 0` for backwards compatibility); suppress dead unless `lastActiveChapter ≥ chapterNumber - FLASHBACK_WINDOW (5)`.
  - `getTopKCanonFacts` — extend signature with `chapterNumber: number, povCharacterId?: string`. Add SQL filters:
    ```sql
    AND (valid_until_chapter IS NULL OR $chapterNumber <= valid_until_chapter)
    AND (jsonb_array_length(known_by) = 0 OR known_by @> jsonb_build_array($povId))
    ```
- [ ] Tests:
  - `getPrevChapterTailContent` returns prior chapter's text.
  - TTL filter excludes expired facts.
  - `known_by` filter visibility: empty (public), POV-included, POV-excluded.
  - Active-characters flashback gating.

**Verify:** `pnpm --filter @novel/ai vitest run test/context/retrieval.test.ts`

## 2.5 Wire context builder (Plan 1 §2)

- [ ] `packages/ai/src/context/builder.ts`:
  - Add `getPrevChapterTailContent` to `Promise.all`.
  - Lift `entryState` from `packet.entryState` into the `WarmTier`.
  - Pass POV id (resolved from `packet.entryState?.povCharacter.name` or first `charactersInScene`) and `chapterNumber` into canon-fact retrieval.
- [ ] Snapshot test: `warm.tailContentPrev` populated when prev chapter exists; `warm.entryState` lifted.

**Verify:** `pnpm --filter @novel/ai vitest run test/context/builder.test.ts`

## 2.6 SummaryCompactor: deterministic `tail_content` write (Plan 1 §2.1)

- [ ] `packages/ai/src/agents/summary-compactor.ts` — add helper `extractTailContent(content: string, target = 250): string`. Splits by `\n\n`; keeps tail paragraphs cumulative word count between 200–350.
- [ ] `apps/worker/src/jobs/generate-chapter.ts` — after final chapter content saved:
  ```ts
  const tail = extractTailContent(chapter.content);
  await db.update(chapters).set({ tailContent: tail }).where(eq(chapters.id, chapter.id));
  ```
- [ ] No LLM call. Pure unit test on the helper.

**Verify:** `pnpm --filter @novel/ai vitest run`

## 2.7 PacketGenerator emits `entry_state` (Plan 1 §2.2)

- [ ] `packages/ai/src/agents/packet-generator.ts`:
  - Output schema includes `entryState`.
  - Prompt: derive entry_state from prev-chapter summary + character DB state; do NOT invent.
- [ ] Update prompt template (versioned bump if needed).
- [ ] Test: golden-file on a stub input → output schema includes `entryState`.

**Verify:** `pnpm --filter @novel/ai vitest run test/agents/packet-generator.test.ts`

## 2.8 CanonExtractor emits `known_by[]` + relationship priority (Plan 1 §3.2, Plan 2 §4)

- [ ] `packages/ai/src/agents/canon-extractor.ts`:
  - Output schema row: `knownBy: string[]`, `validUntilChapter?: number | null`, `importance: ImportanceLevel`.
  - Prompt: prioritise Relationship Shifts + Knowledge State Updates BEFORE physical events. For each fact, list characters who can plausibly know it; estimate `validUntilChapter` only when fact is clearly transient (location-specific, weather, ephemeral); else null.
- [ ] `packages/ai/src/reconciliation/canon-merger.ts` — persist `knownBy` + `validUntilChapter`.
- [ ] Tests: extractor stub on sample chapter → rows include `knownBy[]` populated with at least the POV.

**Verify:** `pnpm --filter @novel/ai vitest run test/agents/canon-extractor.test.ts`

## 2.9 `planted_seeds` planted-before-paid_off enforcement (Plan 2 §3)

- [ ] `packages/db/src/schema/planted-seeds.ts` — add CHECK constraint via migration:
  ```sql
  ALTER TABLE planted_seeds
    ADD CONSTRAINT planted_seeds_status_order
    CHECK ((status = 'paid_off') = (planted_chapter IS NOT NULL AND payoff_chapter IS NOT NULL AND payoff_chapter >= planted_chapter));
  ```
- [ ] `packages/ai/src/reconciliation/canon-merger.ts` — validate the order before allowing a status transition; reject paid_off when no planted record.
- [ ] Test: cannot mark paid_off without planted; cannot regress from paid_off back to pending.

**Verify:** `pnpm --filter @novel/ai vitest run`

## 2.10 Phase-2 gate

- [ ] `pnpm db:migrate` (idempotent re-run)
- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] `pnpm smoke:generate-chapter`

**Commit:** `feat(context): tail_content + entry_state + POV knowledge + canon TTL + planted/paid_off ordering`

---

# Phase 3 — Hybrid RAG, Auto-Approve (with suggested resolution), BudgetGuard

**Spec sections:** Plan 2 §2 / §5 / §6, Plan 1 §6, Plan 4 §5
**Goal:** Cold Tier rewards both name-overlap and semantics; routine canon updates auto-apply; conflicts arrive with pre-resolved suggestions; cost estimation precise.
**Risk:** Medium — retrieval rewrite, merger branch.

## 3.1 Hybrid retrieval (Plan 2 §2)

- [ ] `packages/ai/src/context/retrieval.ts` — `getTopKCanonFactsHybrid(db, storyId, queryEmbedding, characterNames, chapterNumber, povId, activeLocationId, topK)` per spec §12.
- [ ] Fallback to vector-only when `characterNames.length === 0 AND activeLocationId IS NULL`, OR hybrid yields < 3 rows.
- [ ] Replace builder call site.
- [ ] Tests:
  - Hybrid promotes a fact mentioning a present character.
  - Empty character list → vector fallback.
  - `activeLocationId` boost works.

**Verify:** `pnpm --filter @novel/ai vitest run test/context/retrieval.test.ts`

## 3.2 Auto-approve canon updates (Plan 2 §6)

- [ ] `packages/db/src/schema/pending-canon-updates.ts` — add `suggestedResolution: jsonb('suggested_resolution')`.
- [ ] `pnpm db:generate && pnpm db:migrate`.
- [ ] `packages/ai/src/reconciliation/canon-merger.ts` — in `submit()`, after conflict detection:
  - If `conflict.status === 'none' AND row.payload.importance === 'low'`: apply directly, increment `autoAppliedCount`.
  - Else: continue to existing pending-update insert path.
- [ ] Log every auto-applied row to `llm_calls.metadata.canon_merger_auto_apply`.

**Verify:** `pnpm --filter @novel/ai vitest run test/reconciliation/canon-merger.test.ts`

## 3.3 Auto-Fixer pre-resolves conflicts (Plan 1 §6)

- [ ] New small agent `packages/ai/src/agents/conflict-resolver.ts`:
  - Input: `{ updateRow, snapshot, conflictReasons }`.
  - Output: `suggestedResolution: Record<string, unknown> | null` (e.g., `{ defer_to_chapter: N }`, `{ mark_as_flashback: true }`).
  - Cheap-tier model (Flash). Skipped on `locked` importance — those always go to human.
- [ ] `canon-merger.ts` — on conflict path, call `conflict-resolver.suggest()` before writing the row; persist `suggestedResolution`.
- [ ] Web UI surface (admin pending-updates page): render the suggestion as the default option for the reviewer ("Approve suggested" button).
- [ ] Tests: conflict produces resolution; locked-importance bypasses suggestion path.

**Verify:** `pnpm --filter @novel/ai vitest run`

## 3.4 `paused_pending_updates` chapter state (Plan 4 §5)

- [ ] `apps/worker/src/jobs/generate-chapter.ts` — after merger:
  - If any conflict reason ∈ mandatory-regen set → `chapter.status = 'paused_pending_updates'`.
- [ ] `apps/api` — confirm chapter list endpoint surfaces this state; web UI badge.
- [ ] Test: merger emits critical conflict → chapter status updated.

**Verify:** `pnpm --filter @novel/api vitest run test/stories.test.ts`

## 3.5 Real tokenizer in BudgetGuard (Plan 2 §5)

- [ ] Add `gpt-tokenizer` to `packages/core/package.json`.
- [ ] `packages/core/src/policy/budget-guardrails.ts` — `estimateTokens(text)` per spec §14.
- [ ] Replace `Math.ceil(text.length / 3.2)` call sites with `estimateTokens(text)`.
- [ ] Test: parity within ±5% on 5k-char sample.

**Verify:** `pnpm --filter @novel/core vitest run`

## 3.6 Phase-3 gate

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] `pnpm smoke:generate-chapter`

**Commit:** `feat(rag+merger): hybrid retrieval, auto-approve, suggested resolution, paused state, gpt-tokenizer`

---

# Phase 4 — Writer Prompt Inserts, Role Frames, Shrink Algorithm

**Spec sections:** Plan 2 §4, Plan 4 §2 / §4 / §7, Plan 1 §4 (chronology + emotional arc)
**Goal:** Writer receives the new context; role-grouped XML system prompts; Shrink Algorithm in code; cache invariants tested.
**Risk:** Low — prompt-only.

## 4.1 Writer prompt — surgical XML inserts (Plan 1 §4, Plan 2 §4)

- [ ] Locate active writer prompt (e.g., `packages/ai/src/prompts/writer.v2.ts`).
- [ ] In **user** message body (NOT system), conditionally append the four XML blocks per spec §11. System prompt MUST stay byte-identical.
- [ ] Bump version (e.g., `writer.v2.1.ts`); register via `registerPrompt()`; update DB-side versioned prompt selection.
- [ ] Tests: empty data → no inserts; partial data → only relevant blocks; system prompt byte-equal across versions.

**Verify:** `pnpm --filter @novel/ai vitest run`

## 4.2 Role-grouped system prompt frames (Plan 4 §4)

- [ ] `packages/ai/src/prompts/role-frames.ts` (new) — exports three constants:
  - `PLANNER_FRAME` (Bible / Saga / Arc / Packet) — XML role + CoT-before-JSON.
  - `CREATOR_FRAME` (Writer / Auto-Fixer) — style + Forbidden Rules.
  - `MONITOR_FRAME` (LLM Validator / Canon Extractor / Summary Compactor) — objective extraction + importance classification.
- [ ] Each frame appended AFTER the cached Hot Tier in the agent's system prompt, NOT before — preserves hash.
- [ ] Update each agent's prompt builder to emit the appropriate frame.
- [ ] Test: each agent's system prompt = Hot Tier prefix + frame; cache invariant unchanged.

**Verify:** `pnpm --filter @novel/ai vitest run test/prompts/`

## 4.3 Shrink Algorithm (Plan 4 §2)

- [ ] `packages/ai/src/context/shrink.ts` — extend existing `shrinkToFit()`:
  - P1: never trim Hot.
  - P2: trim `warm.activeCharacters` by oldest `lastActiveChapter` (keep at least `MIN_KEEP=3`).
  - P3: filter `cold.retrievedFacts` raising similarity threshold (existing config), increase `recent_summaries` `min_gap` by 5; if still over, drop oldest `pending_canon_updates` and `timeline_events`.
- [ ] Tests: each priority engages in order; never trims Hot; final size within budget.

**Verify:** `pnpm --filter @novel/ai vitest run test/context/shrink.test.ts`

## 4.4 Cache invariants (Plan 4 §7)

- [ ] `packages/ai/test/context/cache-keys.test.ts`:
  - Hot-hash invariant under Warm changes.
  - Warm-hash sensitivity to `tailContentPrev`.
  - Hot Tier is the FIRST element of serialised system message (read serialised string, assert prefix).

**Verify:** `pnpm --filter @novel/ai vitest run test/context/cache-keys.test.ts`

## 4.5 Hybrid Routing audit (Plan 4 §7)

- [ ] Review `MODEL_CONFIG.routes` in `packages/core/src/config/models.ts`:
  - Writer + High-Stakes → Pro tier.
  - Summary Compactor + Canon Extractor + Conflict Resolver + Anti-LLM-Pattern check → Flash tier.
- [ ] Update routes if any drift; record decisions in spec §11.

**Verify:** `pnpm typecheck`

## 4.6 Phase-4 gate

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] `pnpm smoke:generate-chapter`
- [ ] Subjective: read 1–2 generated chapters; assess continuity + emotional arc adherence.

**Commit:** `feat(prompts+context): writer XML inserts, role frames, shrink algorithm, cache invariants`

---

# Phase 5 — Multi-pass Quality: Polish, High-Stakes, Slot-Based, Anti-LLM Patterns

**Spec sections:** Plan 1 §4, reference §1 / §2 / §4
**Goal:** Final polish pass; auto-trigger High-Stakes Reviewer; opt-in slot-based decomposition; anti-LLM-pattern guard.
**Risk:** High — new agents.

## 5.1 Schema additions

- [ ] `packages/db/src/schema/chapters.ts`:
  ```ts
  generationMode: text('generation_mode').default('single_pass').notNull(),
  polishPassStatus: text('polish_pass_status').default('skipped').notNull(),
  ```
- [ ] `pnpm db:generate && pnpm db:migrate`.

## 5.2 Polish Pass agent (Plan 1 §4, reference §2)

- [ ] `packages/ai/src/agents/polish-pass.ts`:
  - Input: final chapter content + `style_few_shots`.
  - Single-purpose prompt: pacing, rhythm, sentence music. Forbid logic edits.
  - Output: revised content (string) + `changesMade: boolean`.
- [ ] `packages/ai/src/prompts/polish-pass.v1.ts` — versioned prompt template.
- [ ] `apps/worker/src/jobs/generate-chapter.ts` — after LLM Validator + Auto-Fixer succeed:
  - Run polish pass; on success update `chapter.content` + `polishPassStatus='applied'`.
  - On failure → `polishPassStatus='failed'` (chapter still publishable).
- [ ] Test: polish pass runs after success path only; failure does not roll back chapter.

**Verify:** `pnpm --filter @novel/ai vitest run test/agents/polish-pass.test.ts`

## 5.3 High-Stakes Reviewer auto-trigger (Plan 1 §4)

- [ ] `apps/worker/src/jobs/generate-chapter.ts` — after Writer succeeds:
  - Auto-trigger High-Stakes Reviewer when ANY of:
    - `requiredEvents` contains breakthrough or character death keyword.
    - `arc.phase === 'climax'`.
    - First or last chapter of an arc.
    - `packet.highStakes === true`.
  - Existing async scheduling preserved.
- [ ] Tests: each trigger condition fires; non-triggers do not.

**Verify:** `pnpm --filter @novel/worker vitest run`

## 5.4 Slot-Based decomposition (reference §1) — opt-in

- [ ] Schema: `chapter_packets.high_stakes: boolean` default false.
- [ ] `packages/ai/src/agents/slot-pipeline/` (new directory):
  - `structure-agent.ts` → emits framework with `[DIALOGUE_SLOT_n]`, `[ACTION_SLOT_n]`, `[DESCRIPTION_SLOT_n]`.
  - `character-agent.ts` → fills DIALOGUE slots (one call per slot, batched).
  - `scene-agent.ts` → fills ACTION + DESCRIPTION slots.
  - `synthesis-agent.ts` → assembles, generates transitions, resolves logic conflicts.
- [ ] `packages/ai/src/agents/writer.ts` — gain a strategy switch:
  - `mode === 'slot_based'` → run slot pipeline.
  - default → existing single-pass.
- [ ] `apps/worker/src/jobs/generate-chapter.ts` — pick mode:
  - `packet.highStakes === true` OR first/last chapter of arc OR explicit operator override → `slot_based`.
  - else → `single_pass`.
- [ ] `chapters.generationMode` records the mode used.
- [ ] Tests: slot markers correctly emitted; fillers don't cross slots; synthesis produces coherent transitions; mode flag honored.
- [ ] A/B harness: a script `pnpm bench:slot-vs-single` runs both modes on the same packet and prints subjective metrics (length, lexical diversity).

**Verify:** `pnpm --filter @novel/ai vitest run test/agents/slot-pipeline/`

## 5.5 Anti-LLM Patterns guard (reference §4)

- [ ] `packages/ai/src/validators/anti-llm-patterns.ts`:
  - 16 forbidden phrase patterns (Vietnamese xianxia calibration of NovelGenerator's English list).
  - 8 writing rules (regex/heuristic — e.g., disallowed rhetorical questions, parallelism overuse).
  - Returns `Issue[]` with severity `low`.
- [ ] Hooked into Auto-Fixer post-Polish — surfaces hints; Auto-Fixer patches in-place.
- [ ] Tests: each forbidden phrase flagged on a sample paragraph; clean text passes.

**Verify:** `pnpm --filter @novel/ai vitest run test/validators/anti-llm-patterns.test.ts`

## 5.6 LLM Validator absorbs cosmetic concerns (Plan 3 §2.1, reference §4)

- [ ] `packages/ai/src/agents/llm-validator.ts` — prompt extended to explicitly check:
  - Cliffhanger strength (replaces removed deterministic `cliffhanger`).
  - Conflict presence in scene (replaces `conflict_presence`).
  - Style red flags (replaces `style_red_flags`).
  - Repetition (replaces `repetition`).
  - Tone-shift / dialogue-vs-description balance (reference §4).
- [ ] Output schema unchanged (existing `Issue[]` list).
- [ ] Tests: golden-file on a sample chapter — issues lined up vs expected.

**Verify:** `pnpm --filter @novel/ai vitest run test/agents/llm-validator.test.ts`

## 5.7 Phase-5 gate

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] `pnpm smoke:generate-chapter` for one single-pass chapter and one slot-based chapter.
- [ ] Subjective: 2 chapters in each mode in the web UI.

**Commit:** `feat(quality): polish pass + high-stakes auto-trigger + slot pipeline + anti-LLM patterns`

---

# Phase 6 — Operational Hardening

**Spec sections:** Plan 2 §5, Plan 4 §8, reference §4 (adaptive JSON)
**Goal:** Batch resume; pre-flight + post-flight checklists; adaptive JSON; observability.
**Risk:** Medium — new services.

## 6.1 Schema additions

- [ ] `packages/db/src/schema/batches.ts`:
  ```ts
  checkpointChapter: integer('checkpoint_chapter').default(0).notNull(),
  resumedFromChapter: integer('resumed_from_chapter'),
  ```
- [ ] Phase 7 schema seeds (added now, used later):
  - `timeline_events.thread_id: uuid` nullable.
  - `timeline_events.parallel_saga_id: uuid` nullable.
  - `sagas.parent_timeline_id: uuid` nullable.
- [ ] `pnpm db:generate && pnpm db:migrate`.

## 6.2 Batch Resume (Plan 2 §5)

- [ ] `apps/worker/src/services/batch-checkpoint.ts` (new):
  - After each chapter completes: `UPDATE batches SET checkpoint_chapter = N WHERE id = ?`.
- [ ] BullMQ idempotency key: `{batchId}:{chapterNumber}`. Existing job at that key returns success synchronously.
- [ ] `apps/api/src/routes/admin/batches.ts` — new `POST /api/admin/batches/:id/resume`:
  - Reads `checkpoint_chapter`.
  - Re-enqueues from `checkpoint_chapter + 1` to batch end.
  - Sets `batch.resumedFromChapter`.
- [ ] Test: 5-chapter batch fails at chapter 3 → resume re-runs 4–5 only.

**Verify:** `pnpm --filter @novel/worker vitest run`

## 6.3 Pre-Flight checklist runner (Plan 4 §8)

- [ ] `apps/worker/src/services/preflight.ts` (new):
  - Runs the 4 checks per spec §15.
  - Returns `{ ok: boolean, failed: string[] }`.
- [ ] `apps/worker/src/jobs/generate-chapter.ts` — invoke at start; on fail → reject the job, surface `failed[]` to operator.
- [ ] Tests: each check fails individually → reject; all pass → proceed.

**Verify:** `pnpm --filter @novel/worker vitest run`

## 6.4 Post-Flight Audit cron (Plan 4 §8)

- [ ] `apps/worker/src/services/post-flight-audit.ts` (new):
  - Embedding Check: `SELECT id FROM chapter_summaries WHERE embedding IS NULL` → re-queue embedding for each.
  - Stale Job Detector: invoke existing detector once.
  - Pending Queue Review: count `pending_canon_updates` older than 7 days; alert at > 50.
- [ ] BullMQ scheduled job: nightly at 04:00 UTC.
- [ ] Tests: each branch in isolation.

**Verify:** `pnpm --filter @novel/worker vitest run`

## 6.5 Adaptive JSON Schemas (reference §4)

- [ ] `packages/ai/src/parse-completion-json.ts` — extend `withCompletionRetry`:
  - On parse failure, try in order:
    1. Strip Markdown fences.
    2. Regex-extract first JSON object.
    3. Re-prompt LLM with schema + the parse error message — hard cap 1 re-prompt.
  - Each fallback logged to `llm_calls.metadata.parse_recovery`.
- [ ] Tests: each fallback path; re-prompt cap honored.

**Verify:** `pnpm --filter @novel/ai vitest run`

## 6.6 Observability metrics

- [ ] `apps/api/src/admin/cache-hit-rate.sql` — saved query for cache-hit-rate per `agent_role`.
- [ ] `apps/worker/src/services/metrics.ts` — counters: `stale_jobs_reset_total`, `audit_regenerate_total`, `polish_pass_applied_total`, `slot_based_chapters_total`, `anti_llm_pattern_hits_total`, `parse_recovery_total`.
- [ ] Notification on `stale_jobs_reset_total > 3 / hour`.

**Verify:** `pnpm --filter @novel/api vitest run`

## 6.7 Phase-6 gate

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] `pnpm smoke:generate-chapter`
- [ ] Manual: kill the worker mid-batch; resume via API; verify it picks up at correct chapter.

**Commit:** `feat(ops): batch resume, pre/post-flight checklists, adaptive JSON, metrics`

---

# Phase 7 — Multi-threaded Narrative + Global Timeline

**Spec sections:** Plan 2 §1 / §7
**Goal:** Activate the schema columns added in Phase 6; cross-thread sync in retrieval + Writer prompt; convergence-point output from Saga Planner.
**Risk:** High — narrative-architecture change. Phase 7 may ship as a follow-up effort.

## 7.1 Saga Planner — convergence points

- [ ] `packages/ai/src/agents/saga-planner.ts` — output schema gains:
  - `parallelThreads: { id, premise, startChapter, endChapter, parentTimelineId }[]`.
  - `convergencePoints: { atChapter: number, threadIds: string[], synopsis: string }[]`.
- [ ] Prompt instructions: identify convergence points where threads must reunite.
- [ ] Test: a 100-chapter saga with 2 threads producing at least 1 convergence point.

## 7.2 Timeline events — cross-thread sync in retrieval

- [ ] `packages/ai/src/context/retrieval.ts` — `getTimelineEventsForChapter` upgraded:
  - When current chapter has events with non-null `thread_id`, ALSO pull events from sibling threads at the same logical timestamp.
  - Logical timestamp = the `chapterNumber` of the convergence point or the latest sync record.
- [ ] Test: chapter at convergence point retrieves events from both threads.

## 7.3 Writer prompt — `<parallel_threads>` block

- [ ] When `parallelThreads.length > 0` for the current saga, conditionally append a `<parallel_threads>` block to the user message describing sibling-thread state at the chapter's logical timestamp.
- [ ] Off when single-thread saga (no behaviour change for existing stories).

## 7.4 Phase-7 gate

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] Smoke test: 1 multi-thread saga generates a chapter at a convergence point — manually inspect the prompt and output.

**Commit:** `feat(narrative): multi-threaded saga + global timeline activation`

---

## Definition of Done — full effort

1. All seven phases shipped on `main`.
2. `pnpm smoke:generate-chapter` end-to-end with all flags active (`single_pass` and `slot_based`).
3. `cache-hit-rate` query shows ≥ 0.85 for the writer agent over the last 24 hours (≥ 0.90 desired).
4. Pre-flight + post-flight services running in production for ≥ 7 days without operator alerts > 1 / day.
5. Coverage matrix in spec §3: every row marked `done`.

---

## Rollback Strategy (per phase)

| Phase | Rollback |
|---|---|
| 1 | Revert commit; old validators in git history. |
| 2 | Revert app code; new schema columns are nullable / defaulted, old code keeps working. |
| 3 | Hybrid retrieval has fallback; auto-approve is one conditional; tokenizer fallback to heuristic. |
| 4 | Prompt inserts conditional on data; system prompt unchanged. |
| 5 | `generationMode` defaults to `single_pass` — slot pipeline unreachable; polish pass behind a flag. |
| 6 | Batch checkpoint columns nullable; preflight bypass via env var. |
| 7 | Multi-thread schema unused unless saga planner emits multiple threads — single-thread sagas behave as before. |

Each phase is independently reversible. No phase has irreversible data migrations.

---

## Per-task open questions (resolved during execution)

- [ ] Final tunings: `LOCKED_FACT_AUDIT_THRESHOLD` (default 0.85), `FLASHBACK_WINDOW` (default 5), `MIN_KEEP` for shrink (default 3), tail-content target word count (default 250, range 200–350).
- [ ] POV resolution rule when `entry_state.povCharacter.name` is missing — fall back to `packet.charactersInScene[0]`.
- [ ] Final calibration of the 16 forbidden phrases for Vietnamese xianxia — operator-tunable list in code.
- [ ] Slot-based mode A/B vs single-pass — measure subjective quality on a 5-chapter sample before broad rollout.
- [ ] Convergence-point output format from Saga Planner — confirm with web UI design before Phase 7.
