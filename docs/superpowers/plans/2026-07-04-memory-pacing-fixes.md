# Memory & Pacing Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix long-range memory loss (semantic retrieval, dormant characters, arc-summary truncation) and make saga/arc pacing state-based (turning-point & expected-change completion tracking) in the chapter generation pipeline.

**Architecture:** All retrieval/pacing logic stays in `packages/ai` as pure functions + thin DB query wrappers so it is unit-testable with mock DBs (repo test convention). Plan-progress state (`completedTurningPoints`, `completedChanges`, `lastCompactedChapter`) lives on `sagas`/`arcs` rows — these are *plan* tables, not canon tables, so direct writes from the worker are allowed (canon-integrity rule only covers characters/facts/threads/seeds/factions). The worker pipeline (`generate-chapter.ts`) wires everything together.

**Tech Stack:** TypeScript, Drizzle ORM (PostgreSQL + pgvector), BullMQ, Zod, Vitest.

## Global Constraints

- Never hardcode model strings — use `modelFor(role)` / `modelForRole(effectiveConfig, role)` (existing pattern).
- No new LLM calls added by this plan; Task 4 *reduces* LLM calls. Prompt-input changes to existing calls are allowed.
- Canon tables (`characters`, `canon_facts`, `open_threads`, `planted_seeds`, `factions`) are only written via `CanonMerger`. `sagas`/`arcs` plan-progress fields may be written directly by the worker.
- Schema changes go in `packages/db/src/schema/`, then `pnpm db:generate`, then `pnpm db:migrate`.
- Vietnamese prompt text matches existing prompt style (see `packages/ai/src/prompts/*.v2.ts`).
- Run targeted tests with `pnpm --filter @novel/ai vitest run <file>` (same for `@novel/core`). `apps/api` tests are not touched by this plan.
- Prompt template versions: `canon-extractor.v2.ts` gets a version bump to `v2.1` (Task 6) because its output schema changes; `arc-summary-compactor.v2.ts` keeps `arc_v2` (input-only, backward-compatible addition).

---

### Task 1: Semantic retrieval of past chapter summaries

`chapter_summaries.embedding` is written on every chapter (generate-chapter.ts:1567-1577) but never read. `getPastChapterSummaries` picks the 3 *most recent* pre-gap chapters — long-range callbacks never reach context. Add an embedding-based variant and use it in `buildContext`, falling back to the recency version when no query embedding is available.

**Files:**
- Modify: `packages/ai/src/context/retrieval.ts` (add `getPastChapterSummariesByEmbedding`)
- Modify: `packages/ai/src/context/builder.ts:204-233` (reuse the goal embedding, wire new function)
- Test: `packages/ai/test/context/past-chapter-retrieval.test.ts` (create)

**Interfaces:**
- Consumes: existing `compactSummary` from `./compact.js`, `ChapterSummaryCompact` from `./types.js`.
- Produces: `getPastChapterSummariesByEmbedding(db: Db, storyId: string, currentChapter: number, minGap: number, topK: number, queryEmbedding: number[]): Promise<ChapterSummaryCompact[]>`

- [ ] **Step 1: Write the failing test**

```ts
// packages/ai/test/context/past-chapter-retrieval.test.ts
import { describe, it, expect } from 'vitest';
import { getPastChapterSummariesByEmbedding } from '../../src/context/retrieval.ts';
import type { Db } from '@novel/db';

function mockDb(rows: { chapter_number: number; summary: string }[]) {
  const executed: string[] = [];
  const db = {
    execute: async (query: { queryChunks?: unknown }) => {
      executed.push(JSON.stringify(query));
      return rows;
    },
  } as unknown as Db;
  return { db, executed };
}

describe('getPastChapterSummariesByEmbedding', () => {
  it('returns compact summaries ordered by the DB (vector similarity)', async () => {
    const { db } = mockDb([
      { chapter_number: 42, summary: 'Lam Trạch gặp lão ăn mày' },
      { chapter_number: 7, summary: 'Bí mật huyết mạch hé lộ' },
    ]);
    const result = await getPastChapterSummariesByEmbedding(db, 'story-1', 300, 5, 3, [0.1, 0.2]);
    expect(result).toEqual([
      { chapterNumber: 42, summary: 'Lam Trạch gặp lão ăn mày' },
      { chapterNumber: 7, summary: 'Bí mật huyết mạch hé lộ' },
    ]);
  });

  it('returns [] for an empty embedding without querying', async () => {
    const { db, executed } = mockDb([]);
    const result = await getPastChapterSummariesByEmbedding(db, 'story-1', 300, 5, 3, []);
    expect(result).toEqual([]);
    expect(executed).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/ai vitest run test/context/past-chapter-retrieval.test.ts`
Expected: FAIL — `getPastChapterSummariesByEmbedding` is not exported.

- [ ] **Step 3: Implement the query in retrieval.ts**

Add below `getPastChapterSummaries` (retrieval.ts:343), mirroring the vector-literal pattern of `getTopKCanonFacts` (retrieval.ts:222-240):

```ts
/**
 * Vector-similarity retrieval of past chapter summaries (embedding written at
 * chapter completion). Falls back to getPastChapterSummaries at call sites
 * when no query embedding is available.
 */
export async function getPastChapterSummariesByEmbedding(
  db: Db,
  storyId: string,
  currentChapter: number,
  minGap: number,
  topK: number,
  queryEmbedding: number[],
): Promise<ChapterSummaryCompact[]> {
  if (queryEmbedding.length === 0) return [];
  const threshold = currentChapter - minGap;
  const vectorLiteral = `[${queryEmbedding.map((n) => Number(n)).join(",")}]`;
  const results = await db.execute(sql`
    SELECT chapter_number, summary
    FROM chapter_summaries
    WHERE story_id = ${storyId}
      AND chapter_number < ${threshold}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}
    LIMIT ${topK}
  `);
  const rows = Array.from(results) as { chapter_number: number; summary: string }[];
  return rows.map((r) =>
    compactSummary({ chapterNumber: r.chapter_number, summary: r.summary }),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/ai vitest run test/context/past-chapter-retrieval.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire into builder.ts**

In `buildContext`, the goal embedding is currently computed inside the canon-fact `try` block (builder.ts:206-209) and discarded. Hoist it, then prefer semantic retrieval:

```ts
  let retrievedFacts: CanonFactCompact[] = [];
  let goalEmbedding: number[] = [];
  try {
    const embResp = await embeddingService.embed({
      input: goalText,
      traceId,
    });
    goalEmbedding = embResp.vector;
    retrievedFacts = await getTopKCanonFactsHybrid(
      db,
      storyId,
      goalEmbedding,
      characterNames,
      chapterNumber,
      povId,
      activeLocationKey,
      cfg.RETRIEVED_CANON_FACTS_TOP_K,
    );
  } catch (err) {
    log?.warn(
      { err, storyId, chapterNumber },
      "embedding lookup failed, skipping canon facts",
    );
  }

  let pastChapterSummaries = await getPastChapterSummariesByEmbedding(
    db,
    storyId,
    chapterNumber,
    cfg.RETRIEVED_PAST_CHAPTERS_MIN_GAP,
    cfg.RETRIEVED_PAST_CHAPTERS_TOP_K,
    goalEmbedding,
  );
  if (pastChapterSummaries.length === 0) {
    pastChapterSummaries = await getPastChapterSummaries(
      db,
      storyId,
      chapterNumber,
      cfg.RETRIEVED_PAST_CHAPTERS_MIN_GAP,
      cfg.RETRIEVED_PAST_CHAPTERS_TOP_K,
    );
  }
```

Add `getPastChapterSummariesByEmbedding` to the import list from `./retrieval.js` (builder.ts:22-38).

- [ ] **Step 6: Typecheck + full ai-package tests, then commit**

Run: `pnpm --filter @novel/ai typecheck && pnpm --filter @novel/ai vitest run`
Expected: PASS.

```bash
git add packages/ai/src/context/retrieval.ts packages/ai/src/context/builder.ts packages/ai/test/context/past-chapter-retrieval.test.ts
git commit -m "feat(context): retrieve past chapter summaries by embedding similarity"
```

---

### Task 2: Dormant character recall

`getActiveCharacters` only returns characters active/seen within the last 5 chapters (retrieval.ts:119). A character returning after a 20-chapter absence is invisible to the Writer. Fix: any character named in `packet.charactersPresent` is loaded by name and merged into `warm.activeCharacters` with `lastActiveChapter` set to the current chapter (they *are* active now — this also protects them from `trimActiveCharacters` in shrink.ts, which sorts by `lastActiveChapter`).

**Files:**
- Modify: `packages/ai/src/context/retrieval.ts` (add `getCharactersByNames`)
- Modify: `packages/ai/src/context/builder.ts` (merge into warm tier — note: warm tier is built at builder.ts:173-194, and `packet.charactersPresent` is available via `deps.packet`)
- Test: `packages/ai/test/context/dormant-characters.test.ts` (create)

**Interfaces:**
- Consumes: `compactCharacter` from `./compact.js`, `characters` table schema, `inArray` from `drizzle-orm`.
- Produces: `getCharactersByNames(db: Db, storyId: string, names: string[]): Promise<CharacterCompact[]>` and exported pure helper `mergeRecalledCharacters(active: CharacterCompact[], recalled: CharacterCompact[], chapterNumber: number): CharacterCompact[]`.

- [ ] **Step 1: Write the failing test for the pure merge helper**

```ts
// packages/ai/test/context/dormant-characters.test.ts
import { describe, it, expect } from 'vitest';
import { mergeRecalledCharacters } from '../../src/context/builder.ts';
import type { CharacterCompact } from '../../src/context/types.ts';

const active: CharacterCompact[] = [
  { id: 'a', name: 'Lam Trạch', status: 'alive', bloodlines: [], shortTraits: [], lastActiveChapter: 299 },
];
const dormant: CharacterCompact[] = [
  { id: 'b', name: 'Hàn Lập', status: 'alive', bloodlines: [], shortTraits: [], lastActiveChapter: 250 },
  { id: 'a', name: 'Lam Trạch', status: 'alive', bloodlines: [], shortTraits: [], lastActiveChapter: 299 },
];

describe('mergeRecalledCharacters', () => {
  it('appends dormant characters, dedupes by id, stamps lastActiveChapter', () => {
    const merged = mergeRecalledCharacters(active, dormant, 300);
    expect(merged).toHaveLength(2);
    const han = merged.find((c) => c.id === 'b')!;
    expect(han.lastActiveChapter).toBe(300);
    // already-active entry is untouched
    expect(merged.find((c) => c.id === 'a')!.lastActiveChapter).toBe(299);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/ai vitest run test/context/dormant-characters.test.ts`
Expected: FAIL — `mergeRecalledCharacters` not exported.

- [ ] **Step 3: Implement query + merge helper**

In `retrieval.ts` (below `getActiveCharacters`), add — note `inArray` must be added to the drizzle-orm import on line 1:

```ts
export async function getCharactersByNames(
  db: Db,
  storyId: string,
  names: string[],
): Promise<CharacterCompact[]> {
  if (names.length === 0) return [];
  const rows = await db
    .select()
    .from(characters)
    .where(and(eq(characters.storyId, storyId), inArray(characters.name, names)));
  return rows.map((c) => compactCharacter(c));
}
```

In `builder.ts`, export the pure helper and call both in `buildContext`:

```ts
export function mergeRecalledCharacters(
  active: CharacterCompact[],
  recalled: CharacterCompact[],
  chapterNumber: number,
): CharacterCompact[] {
  const seen = new Set(active.map((c) => c.id));
  const extras = recalled
    .filter((c) => !seen.has(c.id))
    .map((c) => ({ ...c, lastActiveChapter: chapterNumber }));
  return [...active, ...extras];
}
```

In `buildContext`, after the parallel retrieval block (builder.ts:104-129) and before the warm tier is assembled (builder.ts:173):

```ts
  const recalledCharacters = await getCharactersByNames(
    db,
    storyId,
    packet.charactersPresent ?? [],
  );
  const mergedCharacters = mergeRecalledCharacters(
    characters,
    recalledCharacters,
    chapterNumber,
  );
```

and use `activeCharacters: mergedCharacters` in the `warm` object (replacing `characters` at builder.ts:176). Import `getCharactersByNames` from `./retrieval.js`. `CharacterCompact` must be added to the type imports from `./types.js`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @novel/ai vitest run test/context/dormant-characters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/context/retrieval.ts packages/ai/src/context/builder.ts packages/ai/test/context/dormant-characters.test.ts
git commit -m "feat(context): recall dormant characters named in the chapter packet"
```

---

### Task 3: Overdue threads use plannedResolutionChapter

`open_threads.plannedResolutionChapter` exists in schema and is even populated by the extractor/merger, but the pipeline computes overdue as `introducedChapter < chapterNumber - 10` (generate-chapter.ts:784-787). Use the planned chapter when present; keep the 10-chapter heuristic as fallback.

**Files:**
- Create: `packages/ai/src/context/threads.ts`
- Modify: `apps/worker/src/jobs/generate-chapter.ts:784-787`
- Modify: `packages/ai/src/index.ts` (export the helper — follow the existing export style in that file)
- Test: `packages/ai/test/context/threads.test.ts` (create)

**Interfaces:**
- Consumes: `ThreadCompact` from `./types.js` (fields: `state`, `introducedChapter`, `plannedResolutionChapter?`).
- Produces: `isThreadOverdue(thread: ThreadCompact, chapterNumber: number, heuristicGap?: number): boolean` (default `heuristicGap = 10`).

- [ ] **Step 1: Write the failing test**

```ts
// packages/ai/test/context/threads.test.ts
import { describe, it, expect } from 'vitest';
import { isThreadOverdue } from '../../src/context/threads.ts';
import type { ThreadCompact } from '../../src/context/types.ts';

const base: ThreadCompact = { id: 't1', title: 'Bí ẩn Hỏa Long', state: 'open', introducedChapter: 100 };

describe('isThreadOverdue', () => {
  it('uses plannedResolutionChapter when set', () => {
    expect(isThreadOverdue({ ...base, plannedResolutionChapter: 120 }, 121)).toBe(true);
    expect(isThreadOverdue({ ...base, plannedResolutionChapter: 120 }, 119)).toBe(false);
  });
  it('falls back to the introducedChapter heuristic when unplanned', () => {
    expect(isThreadOverdue(base, 111)).toBe(true);
    expect(isThreadOverdue(base, 110)).toBe(false);
  });
  it('resolved threads are never overdue', () => {
    expect(isThreadOverdue({ ...base, state: 'resolved', plannedResolutionChapter: 50 }, 200)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/ai vitest run test/context/threads.test.ts`
Expected: FAIL — module `src/context/threads.ts` does not exist.

- [ ] **Step 3: Implement**

```ts
// packages/ai/src/context/threads.ts
import type { ThreadCompact } from './types.js';

/** A thread is overdue when past its planned resolution chapter, or (unplanned) stale for > heuristicGap chapters. */
export function isThreadOverdue(
  thread: ThreadCompact,
  chapterNumber: number,
  heuristicGap = 10,
): boolean {
  if (thread.state === 'resolved') return false;
  if (thread.plannedResolutionChapter != null) {
    return chapterNumber > thread.plannedResolutionChapter;
  }
  return thread.introducedChapter < chapterNumber - heuristicGap;
}
```

Export from `packages/ai/src/index.ts`. In `generate-chapter.ts:784-787` replace:

```ts
    const overdueThreads = openThreads.filter((t) =>
      isThreadOverdue(t, data.chapterNumber),
    );
```

adding `isThreadOverdue` to the `@novel/ai` import block at the top of the file.

- [ ] **Step 4: Run tests + typecheck worker**

Run: `pnpm --filter @novel/ai vitest run test/context/threads.test.ts && pnpm --filter @novel/worker typecheck`
Expected: PASS. (If the worker package filter name differs, check `apps/worker/package.json` `name` field and use that.)

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/context/threads.ts packages/ai/src/index.ts packages/ai/test/context/threads.test.ts apps/worker/src/jobs/generate-chapter.ts
git commit -m "feat(pacing): overdue threads honor plannedResolutionChapter"
```

---

### Task 4: Gate rolling-summary refresh to every N chapters

`CONTEXT_CONFIG.ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS = 5` and `SAGA_... = 20` exist but are unused: the pipeline enqueues an arc refresh **every chapter** (generate-chapter.ts:1627-1645) and the arc job always chains a saga refresh (refresh-arc-summary.ts:69-82). This wastes 1-2 LLM calls per chapter. Also fix the hardcoded `5` at generate-chapter.ts:774-779 to use config.

**Files:**
- Create: `packages/core/src/policy/summary-refresh.ts`
- Modify: `packages/core/src/index.ts` (export — follow existing export pattern for `policy/budget-guardrails`)
- Modify: `apps/worker/src/jobs/generate-chapter.ts:1627-1645` and `:774-779`
- Modify: `apps/worker/src/jobs/refresh-arc-summary.ts:69-82` + its job-data type (add `triggerChapterNumber?: number`)
- Test: `packages/core/test/policy/summary-refresh.test.ts` (create; note `packages/core/test/policy/` already exists)

**Interfaces:**
- Produces: `shouldRefreshRollingSummary(input: { chapterNumber: number; startChapter: number | null; endChapter: number | null; everyN: number }): boolean`
- Consumed by both call sites: arc gating uses `everyN = CONTEXT_CONFIG.ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`, saga gating uses `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/test/policy/summary-refresh.test.ts
import { describe, it, expect } from 'vitest';
import { shouldRefreshRollingSummary } from '../../src/policy/summary-refresh.ts';

describe('shouldRefreshRollingSummary', () => {
  it('fires every N chapters relative to startChapter', () => {
    expect(shouldRefreshRollingSummary({ chapterNumber: 105, startChapter: 101, endChapter: 130, everyN: 5 })).toBe(true);  // position 5
    expect(shouldRefreshRollingSummary({ chapterNumber: 104, startChapter: 101, endChapter: 130, everyN: 5 })).toBe(false); // position 4
  });
  it('always fires on the last chapter of the range', () => {
    expect(shouldRefreshRollingSummary({ chapterNumber: 130, startChapter: 101, endChapter: 130, everyN: 7 })).toBe(true);
  });
  it('treats null startChapter as 1', () => {
    expect(shouldRefreshRollingSummary({ chapterNumber: 5, startChapter: null, endChapter: null, everyN: 5 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/core vitest run test/policy/summary-refresh.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
// packages/core/src/policy/summary-refresh.ts
export function shouldRefreshRollingSummary(input: {
  chapterNumber: number;
  startChapter: number | null;
  endChapter: number | null;
  everyN: number;
}): boolean {
  if (input.endChapter != null && input.chapterNumber >= input.endChapter) return true;
  const start = input.startChapter ?? 1;
  const position = input.chapterNumber - start + 1;
  if (position < 1) return false;
  return position % Math.max(1, input.everyN) === 0;
}
```

Export from `packages/core/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/core vitest run test/policy/summary-refresh.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into the pipeline and the arc job**

In `generate-chapter.ts`, wrap the enqueue block (currently unconditional at :1632-1643):

```ts
      const arcRefreshDue = shouldRefreshRollingSummary({
        chapterNumber: data.chapterNumber,
        startChapter: arc?.startChapter ?? null,
        endChapter: arc?.endChapter ?? null,
        everyN: CONTEXT_CONFIG.ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS,
      });
      if (arcRefreshDue) {
        try {
          const refreshJobId = await enqueueRefreshArcSummary({
            storyId: data.storyId,
            arcId: resolvedArcId,
            traceId: data.traceId,
            triggerChapterNumber: data.chapterNumber,
            llmProvider: data.llmProvider,
            modelRoutes: data.modelRoutes,
          });
          log.info({ refreshJobId }, "enqueued arc summary refresh");
        } catch (enqueueErr) {
          log.warn({ err: enqueueErr }, "failed to enqueue arc summary refresh");
        }
      }
```

Import `shouldRefreshRollingSummary` and `CONTEXT_CONFIG` from `@novel/core` (check the existing import block — `CONTEXT_CONFIG` may already be imported).

In the same file replace the hardcoded recent-summary count (:774-779):

```ts
    const recentSummaries = await getRecentSummaries(
      db,
      data.storyId,
      data.chapterNumber,
      CONTEXT_CONFIG.RECENT_CHAPTER_SUMMARIES_COUNT,
    );
```

In `refresh-arc-summary.ts`: add `triggerChapterNumber?: number` to `RefreshArcSummaryJobData` (and mirror the field in `RefreshArcSummaryJob` in `apps/worker/src/queues.ts` if the two types are declared separately), then gate the saga chain (:69-82):

```ts
  const [sagaRow] = arc.sagaId
    ? await db.select({ startChapter: sagas.startChapter, endChapter: sagas.endChapter })
        .from(sagas).where(eq(sagas.id, arc.sagaId)).limit(1)
    : [];
  const sagaRefreshDue =
    arc.sagaId != null &&
    (data.triggerChapterNumber == null ||
      shouldRefreshRollingSummary({
        chapterNumber: data.triggerChapterNumber,
        startChapter: sagaRow?.startChapter ?? null,
        endChapter: sagaRow?.endChapter ?? null,
        everyN: CONTEXT_CONFIG.SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS,
      }));
  if (arc.sagaId && sagaRefreshDue) {
    // ... existing enqueueRefreshSagaSummary block unchanged ...
  }
```

Add `sagas` to the schema import and `shouldRefreshRollingSummary, CONTEXT_CONFIG` to the `@novel/core` import in that file.

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm --filter @novel/core vitest run && pnpm typecheck`
Expected: PASS.

```bash
git add packages/core/src/policy/summary-refresh.ts packages/core/src/index.ts packages/core/test/policy/summary-refresh.test.ts apps/worker/src/jobs/generate-chapter.ts apps/worker/src/jobs/refresh-arc-summary.ts apps/worker/src/queues.ts
git commit -m "perf(worker): gate arc/saga rolling-summary refresh to configured cadence"
```

---

### Task 5: Incremental arc rolling summary (fix >50-chapter truncation)

`refresh-arc-summary.ts:29-40` fetches summaries `desc().limit(50)` then reverses — for arcs longer than 50 chapters the *earliest* chapters silently drop out of the rolling summary, and every refresh re-compacts the whole arc from scratch. Fix: compact **incrementally** — feed the previous `rollingSummary` plus only the chapters written since `lastCompactedChapter` (new column).

**Files:**
- Modify: `packages/db/src/schema/arcs.ts` (add `lastCompactedChapter`)
- Modify: `packages/ai/src/prompts/arc-summary-compactor.v2.ts` (optional `previousRollingSummary` input)
- Modify: `packages/ai/src/agents/arc-summary-compactor.ts` (pass-through field)
- Modify: `apps/worker/src/jobs/refresh-arc-summary.ts`
- Test: `packages/ai/test/prompts/arc-summary-compactor.test.ts` (create)

**Interfaces:**
- Produces: `ArcSummaryCompactorInput` gains `previousRollingSummary?: string`. Prompt version stays `arc_v2` (optional input, backward compatible).
- DB: `arcs.lastCompactedChapter: integer` (nullable; null ⇒ never compacted ⇒ fetch whole arc window as today).

- [ ] **Step 1: Write the failing prompt test**

```ts
// packages/ai/test/prompts/arc-summary-compactor.test.ts
import { describe, it, expect } from 'vitest';
import { arcSummaryCompactorPromptV2 } from '../../src/prompts/arc-summary-compactor.v2.ts';

describe('arcSummaryCompactorPromptV2', () => {
  it('includes the previous rolling summary block when provided', () => {
    const built = arcSummaryCompactorPromptV2.build({
      arcTitle: 'Arc Huyết Nguyệt',
      previousRollingSummary: 'Lam Trạch đột phá Trúc Cơ.',
      perChapterSummaries: [{ chapterNumber: 61, summary: 'Đại chiến mở màn' }],
    });
    expect(built.user).toContain('TÓM TẮT ARC HIỆN TẠI');
    expect(built.user).toContain('Lam Trạch đột phá Trúc Cơ.');
    expect(built.user).toContain('Ch 61: Đại chiến mở màn');
  });
  it('omits the block when absent', () => {
    const built = arcSummaryCompactorPromptV2.build({
      arcTitle: 'Arc Huyết Nguyệt',
      perChapterSummaries: [{ chapterNumber: 1, summary: 'Khởi đầu' }],
    });
    expect(built.user).not.toContain('TÓM TẮT ARC HIỆN TẠI');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/ai vitest run test/prompts/arc-summary-compactor.test.ts`
Expected: FAIL on the first assertion.

- [ ] **Step 3: Update the prompt template**

In `arc-summary-compactor.v2.ts`, extend the `user` string and the system instruction:

```ts
      system: `Bạn là biên tập tóm lược arc cho một tiểu thuyết dài tiếng Việt. Nhận tóm tắt arc hiện tại (nếu có) và tóm tắt các chương MỚI, viết LẠI một bản tóm tắt arc hợp nhất dài tối đa 1200 từ tiếng Việt, giữ:
- mọi sự kiện có liên quan đến seeds/locked facts
${breakthroughHint}
- diễn biến chính đã xảy ra (không tiên đoán tương lai)
- KHÔNG bỏ sót sự kiện đã có trong tóm tắt arc hiện tại
Bỏ mô tả cảnh, chi tiết miêu tả nhỏ, dialog không quan trọng. Trả về plain text duy nhất, không markdown.`,
      user: [
        `Arc: ${String(input.arcTitle)}`,
        typeof input.previousRollingSummary === "string" && input.previousRollingSummary.trim()
          ? `# TÓM TẮT ARC HIỆN TẠI (hợp nhất, không bỏ sót)\n${input.previousRollingSummary}`
          : "",
        Array.isArray(input.perChapterSummaries)
          ? (input.perChapterSummaries as { chapterNumber: number; summary: string }[])
              .map((c) => `Ch ${c.chapterNumber}: ${c.summary}`)
              .join("\n\n")
          : "",
      ].filter(Boolean).join("\n\n"),
```

In `arc-summary-compactor.ts`, add `previousRollingSummary?: string` to `ArcSummaryCompactorInput` and pass it through in the `build()` call object.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/ai vitest run test/prompts/arc-summary-compactor.test.ts`
Expected: PASS.

- [ ] **Step 5: Schema column + migration**

In `packages/db/src/schema/arcs.ts` add after `summaryVersion`:

```ts
  lastCompactedChapter: integer("last_compacted_chapter"),
```

Run: `pnpm db:generate` then `pnpm db:migrate`. Inspect the generated SQL file — it must contain only `ALTER TABLE "arcs" ADD COLUMN "last_compacted_chapter" integer;`.

- [ ] **Step 6: Make the job incremental**

In `refresh-arc-summary.ts`, replace the summary fetch + compact:

```ts
  const sinceChapter = arc.lastCompactedChapter ?? (arc.startChapter ?? 0) - 1;
  const summaries = await db
    .select({ chapterNumber: chapterSummaries.chapterNumber, summary: chapterSummaries.summary })
    .from(chapterSummaries)
    .innerJoin(chapters, eq(chapterSummaries.chapterId, chapters.id))
    .where(and(
      eq(chapters.storyId, storyId),
      gte(chapters.chapterNumber, Math.max(arc.startChapter ?? 0, sinceChapter + 1)),
      lte(chapters.chapterNumber, arc.endChapter ?? 999999),
      or(eq(chapters.status, 'completed'), eq(chapters.status, 'paused_pending_updates')),
    ))
    .orderBy(asc(chapterSummaries.chapterNumber))
    .limit(50);

  if (summaries.length === 0) {
    log.info('no new completed chapters since last compaction; noop');
    return { status: 'skipped' as const };
  }

  // ... provider/agent construction unchanged ...

  const out = await agent.compact({
    storyId,
    arcTitle: arc.title,
    previousRollingSummary: arc.rollingSummary ?? undefined,
    perChapterSummaries: summaries.map((s) => ({
      chapterNumber: s.chapterNumber,
      summary: s.summary ?? '',
    })),
  });

  const maxCompacted = summaries[summaries.length - 1]!.chapterNumber;
  await db.update(arcs).set({
    rollingSummary: out.summary,
    lastCompactedChapter: maxCompacted,
    summaryVersion: sql`${arcs.summaryVersion} + 1`,
    summaryUpdatedAt: new Date(),
  }).where(eq(arcs.id, arcId));
```

Swap the `desc` import for `asc` (keep other imports). The `.reverse()` call is gone.

- [ ] **Step 7: Typecheck + full test sweep, commit**

Run: `pnpm typecheck && pnpm --filter @novel/ai vitest run`
Expected: PASS.

```bash
git add packages/db/src/schema/arcs.ts packages/db/drizzle packages/ai/src/prompts/arc-summary-compactor.v2.ts packages/ai/src/agents/arc-summary-compactor.ts packages/ai/test/prompts/arc-summary-compactor.test.ts apps/worker/src/jobs/refresh-arc-summary.ts
git commit -m "fix(memory): incremental arc rolling summary; no truncation for arcs >50 chapters"
```

(If the migrations folder is not `packages/db/drizzle`, `git status` after `pnpm db:generate` shows the real path — add that.)

---

### Task 6: Turning-point & expected-change completion state (schema + extractor)

Pacing currently *guesses* progress from chapter position: a turning point is "trễ tiến độ" merely because the chapter number passed a uniform-split milestone (generate-chapter.ts:827-869) — the system never knows whether a TP actually happened. Same for `arcs.expectedChanges`. This task adds the state columns and teaches `CanonExtractor` to report completions; Task 7 consumes the state.

**Files:**
- Modify: `packages/db/src/schema/sagas.ts` (add `completedTurningPoints`)
- Modify: `packages/db/src/schema/arcs.ts` (add `completedChanges`)
- Modify: `packages/ai/src/schemas/extractor.ts` (two new output arrays)
- Modify: `packages/ai/src/prompts/canon-extractor.v2.ts` (new input blocks; bump `version` to `v2.1`)
- Modify: `packages/ai/src/agents/canon-extractor.ts` (pass-through of new inputs)
- Test: `packages/ai/test/schemas/extractor.test.ts` (extend — file exists)

**Interfaces:**
- Produces (DB): `sagas.completedTurningPoints: number[]` (jsonb, default `[]`), `arcs.completedChanges: number[]` (jsonb, default `[]`). Values are **indices** into `sagas.expectedTurningPoints` / `arcs.expectedChanges`.
- Produces (extractor output): `turningPointsCompleted: number[]` and `arcChangesCompleted: number[]` on `ExtractorOutput` (both default `[]`).
- Produces (extractor input): optional `sagaTurningPoints: { index: number; text: string; completed: boolean }[]` and `arcExpectedChanges: { index: number; text: string; completed: boolean }[]`.

- [ ] **Step 1: Extend the extractor schema test (failing)**

Append to `packages/ai/test/schemas/extractor.test.ts` (match the file's existing parse-helper style — read it first):

```ts
  it('parses turningPointsCompleted and arcChangesCompleted, defaulting to []', () => {
    const minimal = ExtractorOutputSchema.parse({
      characterUpdates: [], canonFactProposals: [], threadUpdates: [],
      timelineEvents: [], factionUpdates: [], seedsResolvedThisChapter: [],
    });
    expect(minimal.turningPointsCompleted).toEqual([]);
    expect(minimal.arcChangesCompleted).toEqual([]);

    const withProgress = ExtractorOutputSchema.parse({
      characterUpdates: [], canonFactProposals: [], threadUpdates: [],
      timelineEvents: [], factionUpdates: [], seedsResolvedThisChapter: [],
      turningPointsCompleted: [1, 1, -2, 3],
      arcChangesCompleted: [0],
    });
    expect(withProgress.turningPointsCompleted).toEqual([1, 3]); // dedup + drop negatives
    expect(withProgress.arcChangesCompleted).toEqual([0]);
  });
```

(Adjust the minimal-object fields to whatever `ExtractorOutputSchema` actually requires — copy an existing minimal fixture from the same test file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/ai vitest run test/schemas/extractor.test.ts`
Expected: FAIL — unknown properties stripped / undefined.

- [ ] **Step 3: Implement schema fields**

In `extractor.ts`, add a reusable index-array schema and wire it into `ExtractorOutputSchema` (and the exported `EXTRACTOR_JSON_SCHEMA` const — add matching `{"type":"array","items":{"type":"integer","minimum":0}}` properties):

```ts
/** Indices into a plan list (turning points / expected changes). Dedup, drop negatives/non-ints. */
export const planIndexArray = z
  .array(z.unknown())
  .default([])
  .transform((vals) => {
    const out: number[] = [];
    for (const v of vals) {
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && !out.includes(v)) out.push(v);
    }
    return out;
  });
```

Then on the output schema object add:

```ts
  turningPointsCompleted: planIndexArray,
  arcChangesCompleted: planIndexArray,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/ai vitest run test/schemas/extractor.test.ts`
Expected: PASS.

- [ ] **Step 5: Prompt + agent input plumbing**

In `canon-extractor.v2.ts`: bump `version` from `v2` to `v2.1`; add to the user prompt (after the planted-seeds block, following the existing section style):

```ts
      ...(Array.isArray(input.sagaTurningPoints) && (input.sagaTurningPoints as unknown[]).length > 0
        ? [
            '# TURNING POINTS CỦA SAGA (đối chiếu với nội dung chương)',
            ...(input.sagaTurningPoints as { index: number; text: string; completed: boolean }[]).map(
              (tp) => `${tp.index}. [${tp.completed ? 'đã xảy ra' : 'chưa'}] ${tp.text}`,
            ),
            'Nếu chương này khiến một turning point CHƯA xảy ra trở thành ĐÃ XẢY RA, ghi index vào turningPointsCompleted.',
          ]
        : []),
      ...(Array.isArray(input.arcExpectedChanges) && (input.arcExpectedChanges as unknown[]).length > 0
        ? [
            '# EXPECTED CHANGES CỦA ARC',
            ...(input.arcExpectedChanges as { index: number; text: string; completed: boolean }[]).map(
              (c) => `${c.index}. [${c.completed ? 'đã xảy ra' : 'chưa'}] ${c.text}`,
            ),
            'Nếu chương này hoàn thành một expected change, ghi index vào arcChangesCompleted.',
          ]
        : []),
```

In `canon-extractor.ts`, add the two optional fields to the extractor input type and include them in the `build()` payload. Check `packages/ai/src/prompts/registry.ts` / DB-side versioned prompt selection for how `version` is matched (per CLAUDE.md, bumping a version requires updating DB-side versioned prompt selection — grep for `"v2"` selection logic for the `canon_extractor` role and update it to `v2.1`).

- [ ] **Step 6: DB columns + migration**

`sagas.ts`, after `expectedTurningPoints`:

```ts
  completedTurningPoints: jsonb('completed_turning_points').$type<number[]>().default([]).notNull(),
```

`arcs.ts`, after `expectedChanges`:

```ts
  completedChanges: jsonb("completed_changes")
    .$type<number[]>()
    .default([])
    .notNull(),
```

Run: `pnpm db:generate && pnpm db:migrate`. Verify the migration adds exactly the two columns.

- [ ] **Step 7: Typecheck + full ai tests, commit**

Run: `pnpm typecheck && pnpm --filter @novel/ai vitest run`
Expected: PASS.

```bash
git add packages/db/src/schema/sagas.ts packages/db/src/schema/arcs.ts packages/db/drizzle packages/ai/src/schemas/extractor.ts packages/ai/src/prompts/canon-extractor.v2.ts packages/ai/src/agents/canon-extractor.ts packages/ai/test/schemas/extractor.test.ts
git commit -m "feat(pacing): extractor reports turning-point and expected-change completion"
```

---

### Task 7: State-based pacing hints in the pipeline

Consume the state from Task 6: turning-point markers computed from *actual completion*, not chapter arithmetic; unfinished `expectedChanges` become mandatory in the final 20% of an arc; the completion state is persisted after extraction.

**Files:**
- Create: `packages/ai/src/context/turning-points.ts`
- Modify: `packages/ai/src/index.ts` (export)
- Modify: `apps/worker/src/jobs/generate-chapter.ts` (three sites: pacing hint :827-869 + overdueTurningPoints :931-948; packet input arcGoals :917; post-extraction persist after :1517)
- Test: `packages/ai/test/context/turning-points.test.ts` (create)

**Interfaces:**
- Consumes: `sagas.completedTurningPoints`, `arcs.completedChanges` (Task 6), `ExtractorOutput.turningPointsCompleted` / `.arcChangesCompleted` (Task 6).
- Produces:

```ts
export type TurningPointStatus = { index: number; text: string; state: 'done' | 'overdue' | 'current' | 'upcoming' };
export function computeTurningPointStatuses(input: {
  turningPoints: string[];
  completedIndices: number[];
  sagaPosition: number; // 1-based chapter position within saga
  sagaSpan: number;     // total chapters in saga
}): TurningPointStatus[];
```

- [ ] **Step 1: Write the failing test**

```ts
// packages/ai/test/context/turning-points.test.ts
import { describe, it, expect } from 'vitest';
import { computeTurningPointStatuses } from '../../src/context/turning-points.ts';

const tps = ['Gặp sư phụ', 'Đột phá Trúc Cơ', 'Diệt Huyết Ma Tông', 'Rời Đông Vực'];

describe('computeTurningPointStatuses', () => {
  it('completed TPs are done even past their milestone; incomplete past-milestone TPs are overdue', () => {
    // position 30/40 → uniform milestone index = floor(29 / 10) = 2 (third TP window)
    const statuses = computeTurningPointStatuses({
      turningPoints: tps, completedIndices: [0], sagaPosition: 30, sagaSpan: 40,
    });
    expect(statuses.map((s) => s.state)).toEqual(['done', 'overdue', 'current', 'upcoming']);
  });
  it('a TP completed ahead of schedule is done, and current advances to the first incomplete TP', () => {
    const statuses = computeTurningPointStatuses({
      turningPoints: tps, completedIndices: [0, 1, 2], sagaPosition: 5, sagaSpan: 40,
    });
    expect(statuses.map((s) => s.state)).toEqual(['done', 'done', 'done', 'current']);
  });
  it('all complete → all done', () => {
    const statuses = computeTurningPointStatuses({
      turningPoints: tps, completedIndices: [0, 1, 2, 3], sagaPosition: 40, sagaSpan: 40,
    });
    expect(statuses.every((s) => s.state === 'done')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/ai vitest run test/context/turning-points.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

The rule: a TP is `done` only when the extractor confirmed it; incomplete TPs before the positional milestone are `overdue`; `current` is the first incomplete TP at or after the milestone (falling back to the first incomplete TP anywhere); the rest are `upcoming`.

```ts
// packages/ai/src/context/turning-points.ts
export type TurningPointStatus = {
  index: number;
  text: string;
  state: 'done' | 'overdue' | 'current' | 'upcoming';
};

/**
 * State-based pacing: a TP is done only when the extractor confirmed it.
 * The uniform chapter-position milestone (legacy heuristic) only decides
 * whether an incomplete TP is overdue vs upcoming.
 */
export function computeTurningPointStatuses(input: {
  turningPoints: string[];
  completedIndices: number[];
  sagaPosition: number;
  sagaSpan: number;
}): TurningPointStatus[] {
  const { turningPoints, completedIndices, sagaPosition, sagaSpan } = input;
  const done = new Set(completedIndices);
  const span = Math.max(1, sagaSpan);
  const milestoneIdx = Math.min(
    turningPoints.length - 1,
    Math.max(0, Math.floor((sagaPosition - 1) / (span / turningPoints.length))),
  );
  // current = first incomplete TP at or after the milestone; incomplete TPs before it are overdue
  let currentIdx = -1;
  for (let i = milestoneIdx; i < turningPoints.length; i++) {
    if (!done.has(i)) { currentIdx = i; break; }
  }
  if (currentIdx === -1) {
    // everything from milestone onward is done; current = first incomplete anywhere (may be -1)
    currentIdx = turningPoints.findIndex((_, i) => !done.has(i));
  }
  return turningPoints.map((text, index) => {
    if (done.has(index)) return { index, text, state: 'done' as const };
    if (index === currentIdx) return { index, text, state: index < milestoneIdx ? ('overdue' as const) : ('current' as const) };
    return { index, text, state: index < milestoneIdx ? ('overdue' as const) : ('upcoming' as const) };
  });
}
```

Verify against the test's three cases by hand before running. Export from `packages/ai/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/ai vitest run test/context/turning-points.test.ts`
Expected: PASS.

- [ ] **Step 5: Replace the pipeline's positional TP logic**

In `generate-chapter.ts`, replace the marker computation inside the saga-pacing block (:827-869) with:

```ts
      const tpStatuses = computeTurningPointStatuses({
        turningPoints: saga.expectedTurningPoints as string[],
        completedIndices: (saga.completedTurningPoints as number[]) ?? [],
        sagaPosition: data.chapterNumber - sagaProgress.startChapter + 1,
        sagaSpan: sagaProgress.endChapter - sagaProgress.startChapter + 1,
      });
      const markerFor = {
        done: "[đã xảy ra]",
        overdue: "[trễ tiến độ]",
        current: "[đang diễn ra]",
        upcoming: "[sắp tới]",
      } as const;
      const tpList = tpStatuses
        .map((s) => `${s.index + 1}. ${markerFor[s.state]} ${s.text}`)
        .join("\n");
```

Keep the surrounding `pacingHint +=` text as-is. Replace the `overdueTps` derivation (`tps.slice(0, expectedTpIndex)` at :858) with:

```ts
      const overdueTps = tpStatuses.filter((s) => s.state === "overdue").map((s) => s.text);
```

Also replace the separate `overdueTurningPoints` IIFE (:931-948) used by the packet auditor with the same `tpStatuses`-derived list (compute `tpStatuses` once, before the packet loop, guarded by `saga && sagaProgress`; default to `[]`). Delete the IIFE.

- [ ] **Step 6: Force unfinished expectedChanges near arc end**

Right after `arcPlanText` is built (:874-884), add:

```ts
    const completedChangeIdx = new Set((arc?.completedChanges as number[]) ?? []);
    const unfinishedChanges = arcExpectedChanges
      .map((text, index) => ({ text, index }))
      .filter((c) => !completedChangeIdx.has(c.index));
    let mandatoryChangesHint = "";
    if (arcProgress && arcProgress.percent >= 80 && unfinishedChanges.length > 0) {
      mandatoryChangesHint = `\n\n# EXPECTED CHANGES CHƯA HOÀN THÀNH (arc sắp kết thúc — PHẢI xử lý hoặc thu xếp trước chương cuối arc)\n${unfinishedChanges.map((c) => `  - ${c.text}`).join("\n")}`;
    }
```

and change the packet-input line (:917) to:

```ts
      arcGoals: (arc?.mainConflict ?? arc?.premise ?? "") + pacingHint + mandatoryChangesHint,
```

- [ ] **Step 7: Persist completion state after extraction**

Pass plan lists into the extractor call (:1502-1517) — add to the extractor input object:

```ts
        sagaTurningPoints: (Array.isArray(saga?.expectedTurningPoints)
          ? (saga.expectedTurningPoints as string[])
          : []
        ).map((text, index) => ({
          index,
          text,
          completed: ((saga?.completedTurningPoints as number[]) ?? []).includes(index),
        })),
        arcExpectedChanges: arcExpectedChanges.map((text, index) => ({
          index,
          text,
          completed: ((arc?.completedChanges as number[]) ?? []).includes(index),
        })),
```

After `extractionResult` is obtained (after :1519), persist merged indices (bounds-check against list length; `sagas`/`arcs` are plan tables — direct write allowed):

```ts
    const newTpDone = extractionResult.output.turningPointsCompleted.filter(
      (i) => Array.isArray(saga?.expectedTurningPoints) && i < (saga.expectedTurningPoints as string[]).length,
    );
    if (saga && newTpDone.length > 0) {
      const merged = Array.from(new Set([...((saga.completedTurningPoints as number[]) ?? []), ...newTpDone])).sort((a, b) => a - b);
      await db.update(sagas).set({ completedTurningPoints: merged, updatedAt: new Date() }).where(eq(sagas.id, saga.id));
      log.info({ completedTurningPoints: merged }, "saga turning-point progress updated");
    }
    const newChangesDone = extractionResult.output.arcChangesCompleted.filter((i) => i < arcExpectedChanges.length);
    if (arc && newChangesDone.length > 0) {
      const merged = Array.from(new Set([...((arc.completedChanges as number[]) ?? []), ...newChangesDone])).sort((a, b) => a - b);
      await db.update(arcs).set({ completedChanges: merged }).where(eq(arcs.id, arc.id));
      log.info({ completedChanges: merged }, "arc expected-change progress updated");
    }
```

Add `sagas`, `arcs` to the `@novel/db/schema` import in `generate-chapter.ts` if absent, and `computeTurningPointStatuses` to the `@novel/ai` import.

- [ ] **Step 8: Typecheck + full test sweep, commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS (api tests need local Postgres per CLAUDE.md — if infra is down, run `docker compose -f docker-compose.dev.yml up -d` first).

```bash
git add packages/ai/src/context/turning-points.ts packages/ai/src/index.ts packages/ai/test/context/turning-points.test.ts apps/worker/src/jobs/generate-chapter.ts
git commit -m "feat(pacing): state-based turning-point markers and mandatory end-of-arc changes"
```

---

### Task 8: Shrink-loss observability

`shrinkToFit` silently drops facts/summaries/characters when over budget. Record what was dropped so budget tuning is data-driven.

**Files:**
- Modify: `packages/ai/src/context/shrink.ts` (add `collectShrinkReport` + apply in `shrinkToFit`)
- Modify: `packages/ai/src/context/types.ts` (add `shrinkReport` to `ChapterContext['meta']`)
- Modify: `packages/ai/src/context/builder.ts:310-314` (log the report)
- Test: `packages/ai/test/context/shrink-report.test.ts` (create)

**Interfaces:**
- Produces: `ctx.meta.shrinkReport?: { actionsApplied: string[]; dropped: Record<string, number> }` where `dropped` counts items removed per collection (`retrievedFacts`, `recentSummaries`, `retrievedPastChapters`, `activeCharacters`, `pendingCanonUpdates`, `timelineEvents`).

- [ ] **Step 1: Write the failing test**

```ts
// packages/ai/test/context/shrink-report.test.ts
import { describe, it, expect } from 'vitest';
import { shrinkToFit } from '../../src/context/shrink.ts';
import type { ChapterContext } from '../../src/context/types.ts';

function bigContext(): ChapterContext {
  const fact = (i: number) => ({ id: `f${i}`, topic: `t${i}`, importance: 'high', fact: 'x'.repeat(400) });
  return {
    hot: { systemRules: '', bibleCompact: '', styleGuide: '', powerSystem: '', powerSystemKind: 'none', styleFewShots: [], genreContract: '', personalityContract: '', storyOptionsBlock: '' },
    warm: { sagaSummary: '', arcSummary: '', activeCharacters: [], arcOpenThreads: [], arcPlantedSeeds: [], parallelThreads: [], knownFactions: [], entryState: undefined },
    cold: { recentSummaries: [], retrievedFacts: Array.from({ length: 20 }, (_, i) => fact(i)), retrievedPastChapters: [], seedsToPlantNow: [], timelineEvents: [], pendingCanonUpdates: [], packet: { goal: '', conflict: '', cliffhanger: '', requiredEvents: [], charactersPresent: [], forbiddenMoves: [] } as never },
    meta: { storyId: 's', chapterNumber: 1, arcId: 'a', hotHash: '', warmHash: '', sagaProgressPercent: null, arcProgressPercent: null, sagaProgressSource: null, arcProgressSource: null, sagaRange: null, arcRange: null, sagaPhase: null, arcPhase: null, activeTurningPoint: null, targetInputBudget: 100 },
  };
}

describe('shrinkToFit report', () => {
  it('records dropped item counts and applied actions when shrinking occurs', () => {
    const out = shrinkToFit(bigContext(), 100);
    expect(out.meta.shrinkReport).toBeDefined();
    expect(out.meta.shrinkReport!.actionsApplied.length).toBeGreaterThan(0);
    expect(out.meta.shrinkReport!.dropped.retrievedFacts).toBe(20); // high-importance facts all dropped (locked-only filter)
  });
  it('sets no report when context fits', () => {
    const ctx = bigContext();
    const out = shrinkToFit(ctx, 1_000_000);
    expect(out.meta.shrinkReport).toBeUndefined();
  });
});
```

(Adjust the fixture's `warm`/`cold`/`packet` shapes to compile against `types.ts` — copy field names from the real type definitions.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/ai vitest run test/context/shrink-report.test.ts`
Expected: FAIL — `shrinkReport` undefined even after shrinking.

- [ ] **Step 3: Implement**

In `types.ts` add to the meta type:

```ts
  shrinkReport?: { actionsApplied: string[]; dropped: Record<string, number> };
```

In `shrink.ts`, rework `shrinkToFit` to compare before/after counts:

```ts
function countItems(ctx: ChapterContext): Record<string, number> {
  return {
    retrievedFacts: ctx.cold.retrievedFacts.length,
    recentSummaries: ctx.cold.recentSummaries.length,
    retrievedPastChapters: ctx.cold.retrievedPastChapters.length,
    activeCharacters: ctx.warm.activeCharacters.length,
    pendingCanonUpdates: ctx.cold.pendingCanonUpdates.length,
    timelineEvents: ctx.cold.timelineEvents.length,
  };
}

export function shrinkToFit(
  ctx: ChapterContext,
  targetBudget: number,
  options: ShrinkOptions = {},
): ChapterContext {
  let current = structuredClone(ctx);
  const order = options.order ?? DEFAULT_ORDER;

  if (estimateTokensJson(current) <= targetBudget) return current;

  const before = countItems(current);
  const actionsApplied: string[] = [];

  for (const action of order) {
    if (estimateTokensJson(current) <= targetBudget) break;
    current = applyShrink(current, action, options);
    actionsApplied.push(action);
  }

  if (estimateTokensJson(current) > targetBudget) {
    current.cold.pendingCanonUpdates = dropOldestPendingCanonUpdates(current.cold.pendingCanonUpdates);
    actionsApplied.push('pendingCanonUpdates');
  }
  if (estimateTokensJson(current) > targetBudget) {
    current.cold.timelineEvents = dropOldestTimelineEvents(current.cold.timelineEvents);
    actionsApplied.push('timelineEvents');
  }

  const after = countItems(current);
  const dropped: Record<string, number> = {};
  for (const key of Object.keys(before)) {
    const delta = (before[key] ?? 0) - (after[key] ?? 0);
    if (delta > 0) dropped[key] = delta;
  }
  current.meta.shrinkReport = { actionsApplied, dropped };
  return current;
}
```

In `builder.ts`, after the `shrinkToFit` call (:310-313):

```ts
  if (ctx.meta.shrinkReport) {
    log?.warn(
      { storyId, chapterNumber, shrinkReport: ctx.meta.shrinkReport },
      "context over budget — items dropped by shrinkToFit",
    );
  }
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @novel/ai vitest run`
Expected: PASS (existing shrink tests, if any, must still pass — the early-return path is unchanged).

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/context/shrink.ts packages/ai/src/context/types.ts packages/ai/src/context/builder.ts packages/ai/test/context/shrink-report.test.ts
git commit -m "feat(context): report items dropped by shrinkToFit"
```

---

### Task 9: Safe-mode escalation when packet audit fails twice

generate-chapter.ts:1015-1021 logs `operator review required` and then **continues writing the chapter with a bad packet** (TODO comment). Implement the escalation: in non-safe modes, pause the chapter for human review instead of writing.

**Files:**
- Modify: `apps/worker/src/jobs/generate-chapter.ts:1015-1021`
- Test: `apps/worker/test/jobs/` — check whether a `generate-chapter` test harness exists; if yes, extend it; if the only worker test is `sanity.test.ts`, cover the decision with a pure-function test instead (see Step 1).

**Interfaces:**
- Produces: pure helper `shouldPauseOnAuditFailure(mode: string, requiresRegenerate: boolean): boolean`, exported from `generate-chapter.ts` (co-located with the other exported helpers like `serializeContextForWriter`).

- [ ] **Step 1: Write the failing test**

```ts
// apps/worker/test/jobs/audit-escalation.test.ts
import { describe, it, expect } from 'vitest';
import { shouldPauseOnAuditFailure } from '../../src/jobs/generate-chapter.js';

describe('shouldPauseOnAuditFailure', () => {
  it('pauses in semi_auto and full_auto when the audit still requires regeneration', () => {
    expect(shouldPauseOnAuditFailure('semi_auto', true)).toBe(true);
    expect(shouldPauseOnAuditFailure('full_auto', true)).toBe(true);
  });
  it('does not pause in safe mode (human already reviews every chapter)', () => {
    expect(shouldPauseOnAuditFailure('safe', true)).toBe(false);
  });
  it('does not pause when the audit passed', () => {
    expect(shouldPauseOnAuditFailure('full_auto', false)).toBe(false);
  });
});
```

(Match the import extension style used by `apps/worker/test/sanity.test.ts` — `.js` vs `.ts`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/worker vitest run test/jobs/audit-escalation.test.ts`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement**

In `generate-chapter.ts`, near the other exported helpers:

```ts
/** §1.8 escalation: a packet that still fails audit after retries must not be written unattended. */
export function shouldPauseOnAuditFailure(mode: string, requiresRegenerate: boolean): boolean {
  return requiresRegenerate && mode !== "safe";
}
```

Replace the TODO block (:1015-1021):

```ts
    if (auditResult.requiresRegenerate) {
      log.error(
        { issues: auditResult.issues, attemptCount },
        "packet audit failed after all retries — operator review required (safe-mode escalation)",
      );
      if (shouldPauseOnAuditFailure(mode, auditResult.requiresRegenerate)) {
        await db
          .update(chapters)
          .set({ status: "paused_pending_updates", packetAuditStatus: "failed", updatedAt: new Date() })
          .where(eq(chapters.id, chapterId));
        return {
          chapterId,
          status: "paused_pending_updates",
          attempts: attemptCount,
          totalTokens: tokenAcc.inputTokens + tokenAcc.outputTokens,
          totalCostUsd: totalCost,
          durationMs: Date.now() - start,
        };
      }
    }
```

(`"paused_pending_updates"` is already a valid `GenerateChapterJobResult["status"]` — see :1386.)

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm --filter @novel/worker vitest run && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/jobs/generate-chapter.ts apps/worker/test/jobs/audit-escalation.test.ts
git commit -m "feat(worker): pause chapter for review when packet audit fails after retries"
```

---

### Task 10: Documentation & Obsidian sync

**Files:**
- Modify: `CLAUDE.md` (pipeline description: note gated summary refresh + audit escalation, one line each in the pipeline section)
- Obsidian: update/create notes per the repo's "Obsidian Graph First" protocol — notes for **context cache**, **pacing/turning points**, and **summary refresh cadence**. Requires the Obsidian app running (REST API on port 27124); if unreachable, record the pending note updates in the final report instead of silently skipping.

- [ ] **Step 1: Update CLAUDE.md pipeline bullets** — in the "Chapter Generation Pipeline" list, amend step 1 to mention audit-failure escalation to paused review, and step 5 to say arc/saga summary refreshes run on the configured every-N-chapters cadence.
- [ ] **Step 2: Update Obsidian notes** (or list them as pending if the vault is offline): what changed in architecture terms — semantic past-chapter retrieval, dormant-character recall, incremental arc summaries with `lastCompactedChapter`, plan-progress columns `completedTurningPoints`/`completedChanges`, shrink report, audit escalation.
- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: describe gated summary refresh and audit escalation in pipeline overview"
```

---

## Deferred (explicitly out of scope for this plan)

Each of these is a follow-up plan of its own; they were identified in the same review but are independent subsystems:

1. **Thread lifecycle caps** — priority column + top-K warm-tier selection + auto-archive of stale threads (schema backlog already noted at retrieval.ts:527).
2. **Canon fact consolidation job** — periodic dedupe/merge, promotion of recurring medium facts (currently medium/low facts are never retrievable), TTL cleanup.
3. **Dual-resolution chapter summaries** — `CHAPTER_SHORT_SUMMARY_TARGET_TOKENS`/`DETAILED` config exists but only one summary is stored.
4. **Pacing drift report job + arc re-planning** — with Tasks 6-7 the completion state exists; a periodic plan-vs-actual report and ArcPlanner-driven boundary re-planning become straightforward follow-ups.
5. **Adaptive phase thresholds** — 30/60/80% phase cuts are fixed regardless of genre/arc type.
