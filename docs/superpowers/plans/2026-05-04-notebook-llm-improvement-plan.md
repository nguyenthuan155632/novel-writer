# NotebookLM-Style Improvement — Implementation Plan

**Spec:** [2026-05-04-notebook-llm-improvement-design.md](../specs/2026-05-04-notebook-llm-improvement-design.md)
**Date:** 2026-05-04
**Approach:** Four shippable phases. Each phase ends green: typecheck, lint, vitest, smoke pass.

---

## Conventions

- Every phase is a single PR-able unit.
- Every code task lists: file path → change → verification.
- Phase ends only when: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and (where listed) `pnpm smoke:generate-chapter` all pass.
- Tests are written **before** the matching implementation where reasonable.
- Each phase commits independently with a `feat(...)` or `refactor(...)` prefix.

---

## Phase 1 — Validator Restructure (Shift-Left + Cleanup)

**Goal:** Hard constraints catch violations before Writer runs; cosmetic checks delegated to LLM Validator. No new schema yet.
**Risk:** Low — pure logic shuffle inside the validator package.
**Estimated Writer-cost saving on rollout:** $0.03–0.06 per blocked chapter, ~15% of generation spend.

### 1.1 Audit current validator surface

- [ ] Confirm severity assignments via `grep -rn "severity:" packages/ai/src/validators/deterministic/`
- [ ] Confirm `llmVerifiable` flags via `grep -rn "llmVerifiable" packages/ai/src/validators/deterministic/`
- [ ] Inventory existing `auditPacket` issue codes by reading `packages/ai/src/validators/packet-auditor.ts` (already: `dead_character`, `unresolved_due_seed`, `missing_conflict`, `missing_cliffhanger`, `realm_jump_excess`, `overdue_turning_point`).

**Verify:** matches matrix in spec §7. If divergent, update spec inline before continuing.

### 1.2 Drop 4 cosmetic deterministic checks from runner

- [ ] `packages/ai/src/validators/deterministic/runner.ts` — remove imports + `allChecks` entries for `cliffhangerCheck`, `conflictPresenceCheck`, `styleRedFlagsCheck`, `repetitionCheck`.
- [ ] Delete the four files themselves: `cliffhanger.ts`, `conflict-presence.ts`, `style-red-flags.ts`, `repetition.ts` (they have no other consumers — verify with `grep -rn "cliffhangerCheck\|conflictPresenceCheck\|styleRedFlagsCheck\|repetitionCheck" packages apps`).
- [ ] Delete or update any matching test files under `packages/ai/test/validators/`.

**Verify:**
- `pnpm --filter @novel/ai typecheck`
- `pnpm --filter @novel/ai vitest run test/validators/`

### 1.3 Downgrade `word_count` and `new_bloodline_source` to `low`

- [ ] `packages/ai/src/validators/deterministic/word-count.ts` — `severity: 'medium'` → `'low'`.
- [ ] `packages/ai/src/validators/deterministic/new-bloodline-source.ts` — `severity: 'medium'` → `'low'`.
- [ ] Update any tests that asserted on the old severities.

**Verify:** `pnpm --filter @novel/ai vitest run test/validators/`

### 1.4 Add `forbidden_move` to `auditPacket`

- [ ] `packages/ai/src/validators/packet-auditor.ts`:
  - Extend `AuditInput` with `forbiddenRulesText: string` (already exists in field name `forbiddenRules` — confirm and reuse).
  - After existing checks, scan `packet.requiredEvents[].description ∪ packet.forbiddenMoves` for any case-insensitive match against tokenised `forbiddenRulesText` rules.
  - Emit `code: 'forbidden_move', severity: 'high'` (high — not critical — to allow the 1-retry regenerate without immediate hard-fail).
- [ ] Test cases: a) packet with no violation passes, b) packet with `requiredEvents` containing a forbidden phrase fails with high severity, c) empty `forbiddenRulesText` short-circuits without false positive.

**Verify:** `pnpm --filter @novel/ai vitest run test/validators/packet-auditor.test.ts`

### 1.5 Add `locked_fact` (vector cosine) to `auditPacket`

- [ ] `packages/ai/src/context/retrieval.ts` — add:
  ```ts
  export async function getLockedCanonFacts(db, storyId): Promise<{ id: string; fact: string; embedding: number[] | null }[]>
  ```
  Filter: `WHERE story_id = $1 AND locked = true AND embedding IS NOT NULL`.
- [ ] Add helper in `packages/ai/src/embeddings/utils.ts` (or co-locate in retrieval): `cosineSimilarity(a: number[], b: number[]): number`.
- [ ] `packages/ai/src/validators/packet-auditor.ts`:
  - Extend `AuditInput` with `lockedFacts: { id; fact; embedding: number[] }[]` and `requiredEventEmbeddings: number[][]` (precomputed by caller).
  - For each `requiredEvent`, compute max cosine similarity vs locked facts. If `max ≥ LOCKED_FACT_AUDIT_THRESHOLD` (default 0.85, exported from `@novel/core`) → emit `code: 'locked_fact', severity: 'high'`.
  - Threshold lives in `packages/core/src/config/index.ts` as `GENERATION_CONFIG.LOCKED_FACT_AUDIT_THRESHOLD = 0.85`.
- [ ] `apps/worker/src/jobs/generate-chapter.ts` — call `getLockedCanonFacts`, embed `requiredEvents[].description` (reuse existing `embeddingService`), pass into `auditPacket`.
- [ ] Test: a) requiredEvent semantically similar to a locked fact (e.g., reveals true_identity) → flagged; b) unrelated requiredEvent → passes.

**Verify:** `pnpm --filter @novel/ai vitest run test/validators/packet-auditor.test.ts`

### 1.6 Wire single regenerate retry on audit failure

- [ ] `apps/worker/src/jobs/generate-chapter.ts` — wrap audit + Writer call in:
  ```
  let attempt = 0
  while attempt < 2:
    audit = auditPacket(packet, ctx)
    if !audit.requiresRegenerate: break
    if attempt === 1: break  // already retried once
    packet = await regeneratePacket(packet, { previousIssues: audit.issues })
    attempt++
  if audit.requiresRegenerate: escalateToSafeMode()  // existing path
  ```
- [ ] `packages/ai/src/agents/packet-generator.ts` — extend `generate()` to accept `previousIssues?: AuditIssue[]` and inject as a `<previous_issues>` block in the prompt.
- [ ] Test: integration test in `apps/worker/test/jobs/generate-chapter.test.ts` (or smallest equivalent) — first packet fails audit, regen passes.

**Verify:**
- `pnpm --filter @novel/worker vitest run`
- `pnpm typecheck`

### 1.7 Phase-1 gate

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm smoke:generate-chapter` (end-to-end on test story)

**Commit:** `refactor(validators): shift-left hard constraints, drop 4 cosmetic checks`

---

## Phase 2 — Stateful Continuity Schema + Context Builder

**Goal:** Writer receives `tail_content` + `entry_state` + POV-filtered facts. New columns added.
**Risk:** Medium — Drizzle migrations + context builder rewiring.

### 2.1 Schema migrations

- [ ] `packages/db/src/schema/chapters.ts` — add `tailContent: text('tail_content')`.
- [ ] `packages/db/src/schema/chapter-packets.ts` — add `entryState: jsonb('entry_state').$type<EntryState>()`.
- [ ] `packages/db/src/schema/characters.ts` — add `knowledgeState: jsonb('knowledge_state').$type<Record<string, number>>().default({}).notNull()` and `lastActiveChapter: integer('last_active_chapter').default(0).notNull()`.
- [ ] `packages/db/src/schema/canon-facts.ts` — add `validUntilChapter: integer('valid_until_chapter')` and `knownBy: jsonb('known_by').$type<string[]>().default([]).notNull()`.
- [ ] `pnpm db:generate` — verify migration is additive only (no destructive changes).
- [ ] Inspect generated SQL — should be `ALTER TABLE … ADD COLUMN …` only.
- [ ] `pnpm db:migrate` against local Postgres.

**Verify:** `pnpm --filter @novel/db typecheck`

### 2.2 Define `EntryState` type

- [ ] `packages/ai/src/schemas/packet.ts` — export `EntryState` and `EntryStateSchema` (Zod):
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
- [ ] Extend `ChapterPacket` schema to include `entryState?: EntryState`.

**Verify:** `pnpm --filter @novel/ai typecheck`

### 2.3 Update `WarmTier` and context types

- [ ] `packages/ai/src/context/types.ts`:
  ```ts
  export type WarmTier = {
    // existing …
    tailContentPrev?: string;
    entryState?: EntryState;
  };
  ```
- [ ] Make sure `cache-keys.ts` `computeWarmHash()` includes the new fields (or deliberately excludes them — see decision below).
- [ ] **Decision:** Hot hash MUST stay invariant under these additions. Warm hash MAY change. Add a Warm-hash test asserting it differs when `tailContentPrev` differs.

**Verify:** `pnpm --filter @novel/ai vitest run test/context/cache-keys.test.ts`

### 2.4 Retrieval helpers

- [ ] `packages/ai/src/context/retrieval.ts`:
  - `getPrevChapterTailContent(db, storyId, chapterNumber): Promise<string | null>` — selects `tail_content` from chapter `chapterNumber - 1`, returns null if missing.
  - Update `getActiveCharacters` to use `lastActiveChapter` instead of (or in addition to) `lastSeenChapter`. Decision: prefer `lastActiveChapter` if non-zero, else fall back to `lastSeenChapter` (backwards-compatible).
  - Update `getTopKCanonFacts` signature to accept `chapterNumber: number` and `povCharacterId?: string`. Add SQL:
    ```sql
    AND (valid_until_chapter IS NULL OR $chapterNumber <= valid_until_chapter)
    AND (jsonb_array_length(known_by) = 0 OR known_by @> jsonb_build_array($povId))
    ```
- [ ] Tests:
  - `getPrevChapterTailContent` returns prior chapter's text.
  - `getTopKCanonFacts` honors TTL.
  - `getTopKCanonFacts` honors `known_by` filter (pov-restricted, public-fact, exclusionary).

**Verify:** `pnpm --filter @novel/ai vitest run test/context/retrieval.test.ts`

### 2.5 Wire context builder

- [ ] `packages/ai/src/context/builder.ts`:
  - After `getActiveCharacters` etc., add `getPrevChapterTailContent` to the `Promise.all`.
  - Lift `entryState` from `packet.entryState` (if provided) into the `WarmTier` object.
  - Pass POV id (`packet.entryState?.povCharacter.name` resolved to character id, or first `charactersInScene`) and `chapterNumber` into the canon-fact retrieval.
- [ ] Snapshot test: build a fresh context for a story with a prev-chapter row → assert `warm.tailContentPrev` populated.

**Verify:** `pnpm --filter @novel/ai vitest run test/context/builder.test.ts`

### 2.6 SummaryCompactor: persist `tail_content`

- [ ] `apps/worker/src/jobs/generate-chapter.ts` — after final chapter content is saved, also write deterministic `tail_content`:
  ```ts
  const tail = extractTailContent(chapter.content); // last ~300 words, paragraph-aligned
  await db.update(chapters).set({ tailContent: tail }).where(eq(chapters.id, chapter.id));
  ```
- [ ] Helper `extractTailContent(content: string, targetWordCount = 250): string` in `packages/ai/src/agents/summary-compactor.ts` (or co-located util):
  - Split by `\n\n` → keep tail paragraphs whose cumulative word count ≥ 200, ≤ 350.
- [ ] No LLM call. Test: pure unit test on the helper.

**Verify:** `pnpm --filter @novel/ai vitest run`

### 2.7 PacketGenerator emits `entry_state`

- [ ] `packages/ai/src/agents/packet-generator.ts` — extend prompt to emit `entry_state` JSON section. Update output Zod schema.
- [ ] Update prompt template (`packages/ai/src/prompts/packet-generator.*.ts`) to instruct the LLM how to fill `entry_state` from prior chapter summary + character state.
- [ ] Test: golden-file test on a stub prompt input → output schema includes `entryState`.

**Verify:** `pnpm --filter @novel/ai vitest run test/agents/packet-generator.test.ts`

### 2.8 CanonExtractor emits `known_by[]`

- [ ] `packages/ai/src/agents/canon-extractor.ts` — extend output Zod schema with `knownBy: string[]` per `newCanonFacts[]` row. Update prompt to: "For each new fact, list character names who can plausibly know it from this chapter's events."
- [ ] `packages/ai/src/reconciliation/canon-merger.ts` — when inserting into `canon_facts`, persist `knownBy`.
- [ ] Test: extractor stub on sample chapter → produced rows include `knownBy[]` populated with at least the POV.

**Verify:** `pnpm --filter @novel/ai vitest run test/agents/canon-extractor.test.ts`

### 2.9 Phase-2 gate

- [ ] `pnpm db:migrate` (re-confirm idempotent)
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm smoke:generate-chapter`

**Commit:** `feat(context): tail_content + entry_state + POV knowledge in Warm/Cold tiers`

---

## Phase 3 — Hybrid RAG + Auto-Approve + BudgetGuard Tokenizer

**Goal:** Cold Tier retrieval rewards both name-overlap and semantic relevance; routine canon updates auto-apply; cost estimation precise.
**Risk:** Low–medium — opt-in features behind narrow tests.

### 3.1 Hybrid retrieval

- [ ] `packages/ai/src/context/retrieval.ts` — add:
  ```ts
  export async function getTopKCanonFactsHybrid(
    db, storyId, queryEmbedding, characterNames, chapterNumber, povId, topK
  ): Promise<CanonFactCompact[]>
  ```
  Implementation: `WITH kw AS (… ILIKE topic over characterNames + same TTL/known_by filters …), vec AS (… cosine over query_embedding + same filters …) SELECT id, MAX(score) FROM (kw UNION ALL vec) GROUP BY id ORDER BY score DESC LIMIT topK`. Use `0.5` for keyword, `1 - distance` for vector.
- [ ] Fall back to vector-only when `characterNames.length === 0` or hybrid yields `< 3` rows.
- [ ] Replace builder call site with the hybrid version.
- [ ] Tests:
  - Hybrid promotes a fact that mentions a present character above a vector-only neighbor.
  - Empty character list falls back to vector.

**Verify:** `pnpm --filter @novel/ai vitest run test/context/retrieval.test.ts`

### 3.2 Auto-approve canon updates

- [ ] `packages/ai/src/reconciliation/canon-merger.ts` — in `submit()`, after conflict detection:
  - If `conflict.status === 'none' AND row.payload.importance === 'low'`:
    - Apply directly to `target_table` (existing apply path).
    - Increment `autoAppliedCount`.
    - Do NOT insert into `pending_canon_updates`.
  - Else: existing behaviour.
- [ ] Log every auto-applied row to the existing `llm_calls` metadata stream (key: `canon_merger_auto_apply`).
- [ ] Test: a) low importance + no conflict → applies, no pending row. b) low importance + conflict → pending row.

**Verify:** `pnpm --filter @novel/ai vitest run test/reconciliation/canon-merger.test.ts`

### 3.3 Real tokenizer in BudgetGuard

- [ ] Add `gpt-tokenizer` to `packages/core/package.json` dependencies.
- [ ] `packages/core/src/policy/budget-guardrails.ts`:
  ```ts
  let encoder: { encode: (s: string) => Uint8Array } | null = null;
  function getEncoder() {
    if (encoder) return encoder;
    try {
      const mod = require('gpt-tokenizer');
      encoder = mod;
      return encoder;
    } catch { return null; }
  }
  export function estimateTokens(text: string): number {
    const enc = getEncoder();
    if (enc) return enc.encode(text).length;
    return Math.ceil(text.length / 3.2); // fallback heuristic
  }
  ```
- [ ] Replace in-place `Math.ceil(text.length / 3.2)` references with `estimateTokens(text)`.
- [ ] Test: parity within ±5% on a 5k-char sample for a representative model.

**Verify:** `pnpm --filter @novel/core vitest run`

### 3.4 Phase-3 gate

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm smoke:generate-chapter`

**Commit:** `feat(rag): hybrid retrieval, auto-approve safe canon updates, real tokenizer`

---

## Phase 4 — Writer Prompt Inserts + Observability

**Goal:** Writer receives the new context fields; cache hit rate confirmed unchanged.
**Risk:** Low.

### 4.1 Writer prompt — surgical inserts

- [ ] Locate the active writer prompt (likely `packages/ai/src/prompts/writer.v2.ts` or current versioned file via `registerPrompt`).
- [ ] In the **user** message body (NOT system), conditionally append:
  ```xml
  <consistent_chronology>…</consistent_chronology>
  <entry_state>…</entry_state>
  <chapter_tail_bridge>…</chapter_tail_bridge>
  <emotional_arc>…</emotional_arc>
  ```
  Only emit each block when its source data is present. System prompt MUST stay byte-identical.
- [ ] Bump prompt version to follow existing convention (e.g. `writer.v2.1.ts`) and register.
- [ ] Update DB-side versioned prompt selection if any (per CLAUDE.md note).

### 4.2 Cache invariant test

- [ ] `packages/ai/test/context/cache-keys.test.ts` — add:
  ```ts
  it('hot hash invariant after Warm changes', () => {
    const ctxA = build(...); // with tail_content_prev = "X"
    const ctxB = build(...); // with tail_content_prev = "Y"
    expect(ctxA.meta.hotHash).toBe(ctxB.meta.hotHash);
    expect(ctxA.meta.warmHash).not.toBe(ctxB.meta.warmHash);
  });
  ```

**Verify:** `pnpm --filter @novel/ai vitest run test/context/cache-keys.test.ts`

### 4.3 Cache-hit observability

- [ ] Confirm `LoggedLLMProvider` writes `cachedInputTokens` to `llm_calls.cached_input_tokens` (existing).
- [ ] Add a small admin SQL query saved in `apps/api/src/admin/cache-hit-rate.sql` (or co-located helper):
  ```sql
  SELECT agent_role,
         SUM(cached_input_tokens)::float / NULLIF(SUM(input_tokens),0) AS hit_rate
    FROM llm_calls
   WHERE created_at > now() - interval '24 hours'
   GROUP BY agent_role;
  ```

### 4.4 Phase-4 gate

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] `pnpm smoke:generate-chapter`
- [ ] Manually inspect 1–2 generated chapters in the web app to confirm continuity quality (subjective check).

**Commit:** `feat(writer): chronology + entry_state prompt inserts; cache invariant test`

---

## Definition of Done

A phase is done when:

1. All checklist items in the phase are checked.
2. Phase gate (`typecheck`, `lint`, `test`, `smoke`) passes locally.
3. The commit is on the branch and pushed.
4. (Phase 2 only) `pnpm db:migrate` succeeds against a fresh local DB.

The full effort is done when:

1. All four phases shipped on `main`.
2. One full saga generated end-to-end via `pnpm smoke:generate-chapter` (or equivalent) with all new behavior active.
3. The `cache-hit-rate` query above shows ≥ 0.85 for the writer agent over the last 24 hours of generated chapters (≥ 0.90 desired).

---

## Rollback Strategy

| Phase | Rollback |
|---|---|
| 1 | Revert commit; old validators still in git history. |
| 2 | Revert app code; new schema columns are nullable so old code keeps working. |
| 3 | Hybrid retrieval has fallback to vector-only; auto-approve is single conditional that can be disabled with one line; tokenizer fallback to heuristic on import failure. |
| 4 | Writer prompt inserts are conditional on data presence — empty data → no inserts → identical to pre-Phase-4 prompt. |

Each phase is independently reversible. No phase has irreversible data migrations.

---

## Open Tasks Tracker (post-spec)

Tracked separately from the phase checklists; resolved during implementation:

- [ ] Decide LOCKED_FACT_AUDIT_THRESHOLD (default 0.85 — tune empirically after a few chapters).
- [ ] Decide POV resolution rule when `entry_state.povCharacter.name` is missing — fall back to `packet.charactersInScene[0]`.
- [ ] Decide `tail_content` target word count (default 250, range 200–350) — tune after subjective Writer continuity review.
