# LLM Context Pipeline — Quality Improvements Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining gaps from the LLM context audit — fix `bibleCompact: ""` in the high-stakes reviewer, fix non-contiguous chapter labels, inject pending canon updates, enrich `# STORY PROGRESS` with phase + ranges, lock down `storyOptions` types so the empty-fallback bug can't recur, and add regression tests for the progress calc.

**Architecture:** Targeted patches across `packages/ai` (retrieval, context types, prompts, agents) and `apps/worker` (job orchestration + serializer). No DB schema changes. Each task ships independently with tests; later tasks build on earlier ones (Task 4 depends on Task 3's helper).

**Tech Stack:** TypeScript (Node 22), Drizzle ORM, Vitest, BullMQ. Monorepo via pnpm workspaces.

**Conventions to follow (from CLAUDE.md):**
- Never hardcode model strings — always use `modelFor(role)` from `@novel/core`.
- Run `pnpm --filter @novel/<pkg> typecheck` after touching types.
- Tests for `apps/api` set `fileParallelism: false`; the packages here don't share that constraint.
- Workspace test commands: `cd <package> && pnpm exec vitest run <file>`.

**Notes for the implementer:**
- This codebase mixes `'` and `"` quoting; recent files use double quotes (Prettier). Match the file you're editing.
- `@novel/ai` re-exports everything via `packages/ai/src/index.ts` — when you add a new helper, exporting from its module file is enough if the module is already re-exported via `export *`.
- `getDb()` is the canonical DB accessor in worker jobs; the agent layer takes a `Db` via deps.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `packages/ai/src/context/retrieval.ts` | modify | Add `getPendingCanonUpdatesForStory`. |
| `packages/ai/src/context/types.ts` | modify | Add `PendingCanonUpdateCompact`, extend `ColdTier`, extend `meta` with `progressPhase`/`sagaRange`/`arcRange`/`activeTurningPoint`. |
| `packages/ai/src/context/compact.ts` | modify | Add `compactPendingCanonUpdate`. |
| `packages/ai/src/context/builder.ts` | modify | Wire pending updates into ColdTier; compute `progressPhase`, `activeTurningPoint`; export `progressPhaseFor()` helper. |
| `packages/ai/src/agents/llm-validator.ts` | modify | Make `storyOptions` required on `LlmValidatorInput`. |
| `packages/ai/src/agents/high-stakes-reviewer.ts` | modify | Make `storyOptions` required on `HighStakesReviewInput`. |
| `packages/ai/src/prompts/llm-validator.v2.ts` | modify | Drop `?? {}` fallback; require `storyOptions`. |
| `packages/ai/src/prompts/high-stakes-reviewer.v2.ts` | modify | Drop `?? {}` fallback; require `storyOptions`. |
| `apps/worker/src/jobs/high-stakes-review.ts` | modify | Load story bible; fix non-contiguous chapter labels by reading `chapterNumber` from join. |
| `apps/worker/src/jobs/generate-chapter.ts` | modify | Enrich `# STORY PROGRESS` section + render `# PENDING CANON UPDATES`. |
| `packages/ai/test/context/builder.test.ts` | modify | Add `getPendingCanonUpdatesForStory` mock + progress regression tests. |
| `packages/ai/test/context/progress.test.ts` | create | Unit tests for `computeProgressPercent` + `progressPhaseFor`. |
| `packages/ai/test/agents/high-stakes-reviewer.test.ts` | (only if it exists) inspect | If it exists, update the fixture to satisfy the now-required `storyOptions`. |
| `packages/ai/test/agents/llm-validator.test.ts` | (only if it exists) inspect | Same. |

---

## Task 1: Fix `bibleCompact: ""` and non-contiguous chapter labels in high-stakes-review job

**Why:** The high-stakes reviewer's user prompt renders `BIBLE (compact):\n${input.bibleCompact}` — passing `""` means the reviewer evaluates against no bible. Pre-existing, but it's the same class of empty-context bug the audit doc set out to eliminate. Same file labels chapters as `chapterNumber - i`, which silently mislabels rows when any earlier chapter has no summary (gaps from failed runs / manual deletes).

**Files:**
- Modify: `apps/worker/src/jobs/high-stakes-review.ts`

- [ ] **Step 1: Read the current file**

```bash
cat apps/worker/src/jobs/high-stakes-review.ts
```

You should see (a) `bibleCompact: ""` near line 78 and (b) `Chapter ${chapterNumber - i}: ${s.rollingSummary ?? "(no summary)"}` in the `arcSummary` map.

- [ ] **Step 2: Add the bible import and select the actual chapter number**

Edit `apps/worker/src/jobs/high-stakes-review.ts`:

Replace the import line:

```ts
import { HighStakesReviewerAgent, loadStoryDomainContext } from "@novel/ai";
```

with:

```ts
import {
  HighStakesReviewerAgent,
  loadStoryDomainContext,
  getStoryBible,
} from "@novel/ai";
```

Replace the summaries select:

```ts
  const summaries = await db
    .select({ rollingSummary: chapterSummaries.summary })
    .from(chapterSummaries)
    .innerJoin(chapters, eq(chapterSummaries.chapterId, chapters.id))
    .where(
      and(
        eq(chapters.storyId, storyId),
        or(
          eq(chapters.status, "completed"),
          eq(chapters.status, "paused_pending_updates"),
        ),
      ),
    )
    .orderBy(desc(chapterSummaries.chapterNumber))
    .limit(10);

  const arcSummary = summaries
    .map(
      (s, i) =>
        `Chapter ${chapterNumber - i}: ${s.rollingSummary ?? "(no summary)"}`,
    )
    .join("\n");
```

with:

```ts
  const summaries = await db
    .select({
      chapterNumber: chapterSummaries.chapterNumber,
      rollingSummary: chapterSummaries.summary,
    })
    .from(chapterSummaries)
    .innerJoin(chapters, eq(chapterSummaries.chapterId, chapters.id))
    .where(
      and(
        eq(chapters.storyId, storyId),
        or(
          eq(chapters.status, "completed"),
          eq(chapters.status, "paused_pending_updates"),
        ),
      ),
    )
    .orderBy(desc(chapterSummaries.chapterNumber))
    .limit(10);

  const arcSummary = summaries
    .map(
      (s) =>
        `Chapter ${s.chapterNumber}: ${s.rollingSummary ?? "(no summary)"}`,
    )
    .join("\n");

  const bible = await getStoryBible(db, storyId);
```

- [ ] **Step 3: Pass the loaded bible into the agent call**

In the same file, find:

```ts
    arcSummary,
    bibleCompact: "",
    genreDef: domain.genreDef,
```

Change to:

```ts
    arcSummary,
    bibleCompact: bible?.compactSummary ?? "",
    genreDef: domain.genreDef,
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @novel/worker typecheck`
Expected: exits 0, no errors.

- [ ] **Step 5: Smoke-run any existing high-stakes review tests**

Run: `cd packages/ai && pnpm exec vitest run --dir test/agents 2>&1 | tail -20`
Expected: existing tests pass (no high-stakes review test may exist; that's fine).

- [ ] **Step 6: Commit**

```bash
git add apps/worker/src/jobs/high-stakes-review.ts
git commit -m "fix(high-stakes-review): load bible.compactSummary and use real chapter numbers

Previously the reviewer was called with bibleCompact='' (no canon to
evaluate against) and chapter labels were derived as 'chapterNumber - i',
which mislabels rows when earlier chapter summaries are missing (gaps from
failed jobs / manual deletes). Select chapter_number from the join and pass
through the actual story bible."
```

---

## Task 2: Make `storyOptions` required on validator + reviewer to prevent silent empty-contract regression

**Why:** Even after the audit fix, both `LlmValidatorInput` and `HighStakesReviewInput` accept `storyOptions?` and the prompts fall back to `?? {}`. That's exactly the bug the audit set out to fix (RC-3) — it just hides behind a defensive default. Make TypeScript enforce the dependency. Real callers already pass `domain.storyOptions`.

**Files:**
- Modify: `packages/ai/src/agents/llm-validator.ts`
- Modify: `packages/ai/src/agents/high-stakes-reviewer.ts`
- Modify: `packages/ai/src/prompts/llm-validator.v2.ts`
- Modify: `packages/ai/src/prompts/high-stakes-reviewer.v2.ts`

- [ ] **Step 1: Tighten `LlmValidatorInput`**

Edit `packages/ai/src/agents/llm-validator.ts`. Find:

```ts
export interface LlmValidatorInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  storyId: string;
  traceId: string;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions?: StoryOptions;
}
```

Change `storyOptions?: StoryOptions;` to `storyOptions: StoryOptions;` (drop the `?`).

- [ ] **Step 2: Tighten the validator prompt input + drop the `?? {}` fallbacks**

Edit `packages/ai/src/prompts/llm-validator.v2.ts`. Change:

```ts
export interface LlmValidatorV2PromptInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions?: StoryOptions;
}
```

to:

```ts
export interface LlmValidatorV2PromptInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions;
}
```

In the same file, change `renderGenreContract(i.genreDef, i.storyOptions ?? {})` → `renderGenreContract(i.genreDef, i.storyOptions)` and `renderStoryOptionsBlock(i.storyOptions ?? {})` → `renderStoryOptionsBlock(i.storyOptions)`.

- [ ] **Step 3: Tighten `HighStakesReviewInput`**

Edit `packages/ai/src/agents/high-stakes-reviewer.ts`. Change:

```ts
  storyOptions?: import("@novel/core").StoryOptions;
```

to:

```ts
  storyOptions: import("@novel/core").StoryOptions;
```

- [ ] **Step 4: Drop `?? {}` fallbacks in the reviewer prompt**

Edit `packages/ai/src/prompts/high-stakes-reviewer.v2.ts`. Change:

```ts
${renderGenreContract(genreDef, (input.storyOptions as StoryOptions) ?? {})}
```

to:

```ts
${renderGenreContract(genreDef, input.storyOptions as StoryOptions)}
```

And:

```ts
${renderStoryOptionsBlock((input.storyOptions as StoryOptions) ?? {})}
```

to:

```ts
${renderStoryOptionsBlock(input.storyOptions as StoryOptions)}
```

- [ ] **Step 5: Typecheck — confirm callers compile**

Run: `pnpm --filter @novel/ai typecheck && pnpm --filter @novel/worker typecheck`
Expected: exits 0. The two real call sites — `apps/worker/src/jobs/generate-chapter.ts` (passes `storyOptions: domain.storyOptions`) and `apps/worker/src/jobs/high-stakes-review.ts` (passes `storyOptions: domain.storyOptions`) — already provide the field.

If any test file fails to compile because a fixture omitted `storyOptions`, add `storyOptions: {} as any` to the fixture (the schema treats every option as optional, so `{}` is a legal `StoryOptions`).

- [ ] **Step 6: Run package tests**

Run: `cd packages/ai && pnpm exec vitest run 2>&1 | tail -15`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add packages/ai/src/agents/llm-validator.ts \
        packages/ai/src/agents/high-stakes-reviewer.ts \
        packages/ai/src/prompts/llm-validator.v2.ts \
        packages/ai/src/prompts/high-stakes-reviewer.v2.ts
git commit -m "refactor(ai): require storyOptions on validator + reviewer inputs

Drop the '?? {}' fallback that silently produced empty Genre/Story-Options
contracts when callers forgot the field. Real callers already pass it; this
locks the type so the audit's RC-3 bug class can't recur."
```

---

## Task 3: Add `progressPhaseFor()` helper + extend context meta with phase, ranges, and active turning point

**Why:** The writer prompt uses brittle text rules (`if arc progress >= 80%, push to climax`) that the LLM has to math. Pre-compute a `phase` label (`setup` | `development` | `climax_buildup` | `climax` | `falling`) and ship it alongside the percent so prompts can reference a stable enum. Also expose `sagaRange` / `arcRange` (e.g. `"6/10"`) and the active turning point so the writer sees the same enriched plan info the packet generator already gets.

**Files:**
- Modify: `packages/ai/src/context/builder.ts`
- Modify: `packages/ai/src/context/types.ts`
- Create: `packages/ai/test/context/progress.test.ts`

- [ ] **Step 1: Write the failing test for the helpers**

Create `packages/ai/test/context/progress.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  computeProgressPercent,
  progressPhaseFor,
} from "../../src/context/builder.js";

describe("computeProgressPercent", () => {
  it("returns 100% on the final chapter of a multi-chapter span", () => {
    expect(computeProgressPercent(10, 1, 10)).toBe(100);
  });

  it("returns 100% on a single-chapter span", () => {
    expect(computeProgressPercent(5, 5, 5)).toBe(100);
  });

  it("returns 10% on the first chapter of a 10-chapter span", () => {
    expect(computeProgressPercent(1, 1, 10)).toBe(10);
  });

  it("clamps when chapterNumber is outside the span", () => {
    expect(computeProgressPercent(0, 1, 10)).toBe(0);
    expect(computeProgressPercent(99, 1, 10)).toBe(100);
  });
});

describe("progressPhaseFor", () => {
  it("labels < 30% as setup", () => {
    expect(progressPhaseFor(10)).toBe("setup");
    expect(progressPhaseFor(29)).toBe("setup");
  });

  it("labels 30–59% as development", () => {
    expect(progressPhaseFor(30)).toBe("development");
    expect(progressPhaseFor(59)).toBe("development");
  });

  it("labels 60–79% as climax_buildup", () => {
    expect(progressPhaseFor(60)).toBe("climax_buildup");
    expect(progressPhaseFor(79)).toBe("climax_buildup");
  });

  it("labels >= 80% as climax", () => {
    expect(progressPhaseFor(80)).toBe("climax");
    expect(progressPhaseFor(100)).toBe("climax");
  });

  it("returns null when input is null", () => {
    expect(progressPhaseFor(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to confirm `progressPhaseFor` is not exported yet**

Run: `cd packages/ai && pnpm exec vitest run test/context/progress.test.ts 2>&1 | tail -15`
Expected: FAIL with `progressPhaseFor is not defined` or similar import error. (`computeProgressPercent` already exists from the prior fix.)

- [ ] **Step 3: Implement `progressPhaseFor` in builder.ts**

Edit `packages/ai/src/context/builder.ts`. Below the existing `computeProgressPercent` definition, add:

```ts
export type ProgressPhase =
  | "setup"
  | "development"
  | "climax_buildup"
  | "climax";

export function progressPhaseFor(percent: number | null): ProgressPhase | null {
  if (percent == null) return null;
  if (percent < 30) return "setup";
  if (percent < 60) return "development";
  if (percent < 80) return "climax_buildup";
  return "climax";
}
```

- [ ] **Step 4: Run the progress test — should pass**

Run: `cd packages/ai && pnpm exec vitest run test/context/progress.test.ts 2>&1 | tail -15`
Expected: 9 passing.

- [ ] **Step 5: Extend `ChapterContext.meta` to carry the new fields**

Edit `packages/ai/src/context/types.ts`. Find the `ChapterContext` `meta` block:

```ts
  meta: {
    storyId: string;
    chapterNumber: number;
    arcId: string;
    hotHash: string;
    warmHash: string;
    sagaProgressPercent: number | null;
    arcProgressPercent: number | null;
    targetInputBudget: number;
  };
```

Add four fields:

```ts
  meta: {
    storyId: string;
    chapterNumber: number;
    arcId: string;
    hotHash: string;
    warmHash: string;
    sagaProgressPercent: number | null;
    arcProgressPercent: number | null;
    sagaRange: string | null;
    arcRange: string | null;
    sagaPhase: "setup" | "development" | "climax_buildup" | "climax" | null;
    arcPhase: "setup" | "development" | "climax_buildup" | "climax" | null;
    activeTurningPoint: string | null;
    targetInputBudget: number;
  };
```

- [ ] **Step 6: Populate the new fields in `buildContext`**

Edit `packages/ai/src/context/builder.ts`. Find the block computing `sagaProgressPercent` / `arcProgressPercent`. Just below it (and before `let ctx: ChapterContext = {`), insert:

```ts
  const sagaRange =
    saga?.startChapter != null && saga?.endChapter != null
      ? `${chapterNumber - saga.startChapter + 1}/${saga.endChapter - saga.startChapter + 1}`
      : null;

  const arcRange =
    arc?.startChapter != null && arc?.endChapter != null
      ? `${chapterNumber - arc.startChapter + 1}/${arc.endChapter - arc.startChapter + 1}`
      : null;

  const sagaPhase = progressPhaseFor(sagaProgressPercent);
  const arcPhase = progressPhaseFor(arcProgressPercent);

  // Pick the turning point that's "active" for this chapter — the one whose
  // index matches the current saga position (same math the packet generator
  // already uses for its pacing hint, kept here so the writer sees it too).
  let activeTurningPoint: string | null = null;
  if (
    saga?.startChapter != null &&
    saga?.endChapter != null &&
    Array.isArray(saga.expectedTurningPoints) &&
    (saga.expectedTurningPoints as string[]).length > 0
  ) {
    const tps = saga.expectedTurningPoints as string[];
    const sagaSpan = Math.max(1, saga.endChapter - saga.startChapter + 1);
    const sagaPosition = chapterNumber - saga.startChapter + 1;
    const idx = Math.min(
      tps.length - 1,
      Math.max(0, Math.floor((sagaPosition - 1) / (sagaSpan / tps.length))),
    );
    activeTurningPoint = tps[idx] ?? null;
  }
```

Then add the new fields to the `meta` literal:

```ts
    meta: {
      storyId,
      chapterNumber,
      arcId,
      hotHash,
      warmHash,
      sagaProgressPercent,
      arcProgressPercent,
      sagaRange,
      arcRange,
      sagaPhase,
      arcPhase,
      activeTurningPoint,
      targetInputBudget: cfg.TOKEN_BUDGET_NORMAL,
    },
```

- [ ] **Step 7: Update existing test fixtures that build a `ChapterContext` literal**

Test fixtures that construct a full `meta` object will fail to typecheck now. Find them:

Run: `grep -rl "sagaProgressPercent: null" packages/ai/test`
Expected: ~12 deterministic-validator test files plus `shrink.test.ts` and `runner.test.ts`.

For each match, locate the `meta` literal and add the five new fields right after `arcProgressPercent: null,`:

```ts
        sagaRange: null,
        arcRange: null,
        sagaPhase: null,
        arcPhase: null,
        activeTurningPoint: null,
```

(All `null` is correct — these fixtures don't set up sagas/arcs.)

- [ ] **Step 8: Typecheck and run the full ai package test suite**

Run: `pnpm --filter @novel/ai typecheck && cd packages/ai && pnpm exec vitest run 2>&1 | tail -20`
Expected: typecheck clean, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/ai/src/context/builder.ts \
        packages/ai/src/context/types.ts \
        packages/ai/test/context/progress.test.ts \
        packages/ai/test/
git commit -m "feat(context): expose progress phase, chapter range, and active turning point

Add progressPhaseFor() and surface sagaRange/arcRange/sagaPhase/arcPhase/
activeTurningPoint on ChapterContext.meta so the serializer can render
stable enum-tagged signals instead of forcing the writer LLM to do
threshold math on a percent."
```

---

## Task 4: Enrich the writer's `# STORY PROGRESS` section with phase + range + active turning point

**Why:** Currently the writer sees `Saga progress: 60%` — a bare number with no anchor. Render a richer block that names the phase, shows chapter ranges, and surfaces the active turning point. This is the same information the packet generator already builds in `generate-chapter.ts:641-672` for its pacing hint; stop hiding it from the writer.

**Files:**
- Modify: `apps/worker/src/jobs/generate-chapter.ts`

- [ ] **Step 1: Locate the existing `# STORY PROGRESS` block**

Open `apps/worker/src/jobs/generate-chapter.ts` and search for `# STORY PROGRESS`. It's inside `serializeContextForWriter`, around line 100–110.

- [ ] **Step 2: Replace the terse block with the enriched version**

Find:

```ts
  // Saga/Arc progress metadata
  const progressLines: string[] = [];
  if (ctx.meta.sagaProgressPercent != null) {
    progressLines.push(`Saga progress: ${ctx.meta.sagaProgressPercent}%`);
  }
  if (ctx.meta.arcProgressPercent != null) {
    progressLines.push(`Arc progress: ${ctx.meta.arcProgressPercent}%`);
  }
  if (progressLines.length > 0) {
    parts.push(`# STORY PROGRESS\n${progressLines.join("\n")}`);
  }
```

Replace with:

```ts
  const progressLines: string[] = [];
  if (ctx.meta.sagaProgressPercent != null) {
    const range = ctx.meta.sagaRange ? ` (chapter ${ctx.meta.sagaRange})` : "";
    const phase = ctx.meta.sagaPhase ? `, phase=${ctx.meta.sagaPhase}` : "";
    progressLines.push(
      `Saga: ${ctx.meta.sagaProgressPercent}%${range}${phase}`,
    );
  }
  if (ctx.meta.arcProgressPercent != null) {
    const range = ctx.meta.arcRange ? ` (chapter ${ctx.meta.arcRange})` : "";
    const phase = ctx.meta.arcPhase ? `, phase=${ctx.meta.arcPhase}` : "";
    progressLines.push(`Arc: ${ctx.meta.arcProgressPercent}%${range}${phase}`);
  }
  if (ctx.meta.activeTurningPoint) {
    progressLines.push(
      `Active turning point: ${ctx.meta.activeTurningPoint}`,
    );
  }
  if (progressLines.length > 0) {
    parts.push(`# STORY PROGRESS\n${progressLines.join("\n")}`);
  }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @novel/worker typecheck`
Expected: exits 0.

- [ ] **Step 4: Verify the writer prompt's pacing rules still align with the phase labels**

Open `packages/ai/src/prompts/writer.v2.ts` and read the `# PACING RULES` block. The current text talks about `arc progress >= 80%` and `< 30%` — those thresholds match the `setup` (<30%) / `climax` (>=80%) phase boundaries from Task 3. No edit needed; the section still works, and now the writer also gets a named phase to anchor on.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/jobs/generate-chapter.ts
git commit -m "feat(writer-context): enrich # STORY PROGRESS with phase, range, and active turning point

Promote the same enriched progress info the packet generator already gets
(phase label, chapter range, current saga turning point) into the writer's
serialized context. Replaces a bare percent with a stable signal the model
can act on without doing threshold math."
```

---

## Task 5: Inject pending canon updates into context (closes audit's required-context gap)

**Why:** The original spec (and audit doc §11.2) listed "Pending canon updates" as required context. They're staged in `pending_canon_updates` table waiting for review/auto-apply but never reach any agent. When a writer continues a chapter while there are unresolved updates, it has no visibility into what's about to change. Surface them as a compact COLD section, capped to keep the budget bounded.

**Files:**
- Modify: `packages/ai/src/context/types.ts`
- Modify: `packages/ai/src/context/compact.ts`
- Modify: `packages/ai/src/context/retrieval.ts`
- Modify: `packages/ai/src/context/builder.ts`
- Modify: `apps/worker/src/jobs/generate-chapter.ts`
- Modify: `packages/ai/test/context/builder.test.ts`

- [ ] **Step 1: Add the compact type**

Edit `packages/ai/src/context/types.ts`. Right after `TimelineEventCompact`, add:

```ts
export type PendingCanonUpdateCompact = {
  id: string;
  updateType: string;
  targetTable: string;
  conflictStatus: string;
  conflictReasons: string[];
  summary: string;
};
```

Then extend `ColdTier`:

```ts
export type ColdTier = {
  recentSummaries: ChapterSummaryCompact[];
  retrievedFacts: CanonFactCompact[];
  retrievedPastChapters: ChapterSummaryCompact[];
  seedsToPlantNow: SeedCompact[];
  timelineEvents: TimelineEventCompact[];
  pendingCanonUpdates: PendingCanonUpdateCompact[];
  packet: ChapterPacket;
};
```

- [ ] **Step 2: Add a compact helper**

Open `packages/ai/src/context/compact.ts` and inspect existing helpers (e.g. `compactFaction`). Append a new helper alongside them:

```ts
import type { PendingCanonUpdateCompact } from "./types.js";
import type { PendingCanonUpdate } from "@novel/db/schema";

export function compactPendingCanonUpdate(
  row: PendingCanonUpdate,
): PendingCanonUpdateCompact {
  const payload = row.payload as Record<string, unknown> | null;
  const name =
    typeof payload?.name === "string" ? (payload.name as string) : null;
  const fact =
    typeof payload?.fact === "string"
      ? (payload.fact as string).slice(0, 120)
      : null;
  const summary = name ?? fact ?? `${row.updateType} on ${row.targetTable}`;
  return {
    id: row.id,
    updateType: row.updateType,
    targetTable: row.targetTable,
    conflictStatus: row.conflictStatus,
    conflictReasons: row.conflictReasons ?? [],
    summary,
  };
}
```

(If `compact.ts` already imports `@novel/db/schema`, fold the new import into the existing import statement.)

- [ ] **Step 3: Add the retrieval function**

Edit `packages/ai/src/context/retrieval.ts`. In the imports at the top, add `pendingCanonUpdates` to the schema import:

```ts
import {
  storyBibles,
  sagas,
  arcs,
  characters,
  openThreads,
  plantedSeeds,
  chapterSummaries,
  factions,
  timelineEvents,
  pendingCanonUpdates,
} from "@novel/db/schema";
```

Add `compactPendingCanonUpdate` and `PendingCanonUpdateCompact` to the existing imports from `./compact.js` and `./types.js`.

Append the function at the bottom of the file (before `export type RetrievalResult = …`):

```ts
export async function getPendingCanonUpdatesForStory(
  db: Db,
  storyId: string,
  limit = 10,
): Promise<PendingCanonUpdateCompact[]> {
  const rows = await db
    .select()
    .from(pendingCanonUpdates)
    .where(
      and(
        eq(pendingCanonUpdates.storyId, storyId),
        eq(pendingCanonUpdates.resolution, "pending"),
      ),
    )
    .orderBy(desc(pendingCanonUpdates.createdAt))
    .limit(limit);
  return rows.map((r) => compactPendingCanonUpdate(r));
}
```

- [ ] **Step 4: Wire the retrieval into `buildContext`**

Edit `packages/ai/src/context/builder.ts`. In the imports list from `./retrieval.js`, add `getPendingCanonUpdatesForStory`. Then in the `Promise.all` array (the one that already retrieves characters, threads, seeds, etc.), add another entry — and add the matching destructured name at the top:

Find:

```ts
  const [
    characters,
    threads,
    allSeeds,
    dueSeeds,
    recentSummaries,
    knownFactions,
    timelineEventsRows,
  ] = await Promise.all([
    getActiveCharacters(db, storyId, chapterNumber),
    getOpenThreadsForStory(db, storyId),
    getPlantedSeedsForStory(db, storyId),
    getSeedsDueForChapter(db, storyId, chapterNumber),
    getRecentSummaries(
      db,
      storyId,
      chapterNumber,
      cfg.RECENT_CHAPTER_SUMMARIES_COUNT,
    ),
    getFactionsForStory(db, storyId),
    getTimelineEventsForChapter(db, storyId, chapterNumber),
  ]);
```

Change to:

```ts
  const [
    characters,
    threads,
    allSeeds,
    dueSeeds,
    recentSummaries,
    knownFactions,
    timelineEventsRows,
    pendingCanonUpdatesRows,
  ] = await Promise.all([
    getActiveCharacters(db, storyId, chapterNumber),
    getOpenThreadsForStory(db, storyId),
    getPlantedSeedsForStory(db, storyId),
    getSeedsDueForChapter(db, storyId, chapterNumber),
    getRecentSummaries(
      db,
      storyId,
      chapterNumber,
      cfg.RECENT_CHAPTER_SUMMARIES_COUNT,
    ),
    getFactionsForStory(db, storyId),
    getTimelineEventsForChapter(db, storyId, chapterNumber),
    getPendingCanonUpdatesForStory(db, storyId),
  ]);
```

Then in the `cold: ColdTier` literal, add the new field:

Find:

```ts
  const cold: ColdTier = {
    recentSummaries,
    retrievedFacts,
    retrievedPastChapters: pastChapterSummaries,
    seedsToPlantNow: dueSeeds,
    timelineEvents: timelineEventsRows,
    packet,
  };
```

Change to:

```ts
  const cold: ColdTier = {
    recentSummaries,
    retrievedFacts,
    retrievedPastChapters: pastChapterSummaries,
    seedsToPlantNow: dueSeeds,
    timelineEvents: timelineEventsRows,
    pendingCanonUpdates: pendingCanonUpdatesRows,
    packet,
  };
```

- [ ] **Step 5: Render the section in the writer's serialized context**

Edit `apps/worker/src/jobs/generate-chapter.ts`. After the `# TIMELINE EVENTS` block in `serializeContextForWriter`, before the `if (ctx.cold.packet) {` block, insert:

```ts
  if (
    ctx.cold.pendingCanonUpdates &&
    ctx.cold.pendingCanonUpdates.length > 0
  ) {
    const pending = ctx.cold.pendingCanonUpdates
      .map((p) => {
        const conflict =
          p.conflictStatus !== "none" ? ` ⚠ ${p.conflictStatus}` : "";
        return `- [${p.updateType} ${p.targetTable}]${conflict} ${p.summary}`;
      })
      .join("\n");
    parts.push(
      `# PENDING CANON UPDATES (chưa apply — KHÔNG dựa vào để viết)\n${pending}`,
    );
  }
```

The "chưa apply — KHÔNG dựa vào để viết" hint tells the writer the entries are staged, not active canon. Match the existing Vietnamese tone in the file.

- [ ] **Step 6: Update the builder test mock**

Edit `packages/ai/test/context/builder.test.ts`. Find the `vi.mock("../../src/context/retrieval.js", () => ({` block and add:

```ts
  getPendingCanonUpdatesForStory: vi.fn().mockResolvedValue([]),
```

next to the other mocks.

- [ ] **Step 7: Update test fixtures with the new ColdTier field**

Run: `grep -rl "timelineEvents: \[\]" packages/ai/test`

For each match, find the cold-tier literal and add the new field directly after `timelineEvents: [],`:

```ts
        pendingCanonUpdates: [],
```

(All-empty is fine for these fixtures; they don't exercise the field.)

- [ ] **Step 8: Typecheck and run all package tests**

Run: `pnpm --filter @novel/ai typecheck && pnpm --filter @novel/worker typecheck`
Expected: exits 0.

Run: `cd packages/ai && pnpm exec vitest run 2>&1 | tail -20`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/ai/src/context/types.ts \
        packages/ai/src/context/compact.ts \
        packages/ai/src/context/retrieval.ts \
        packages/ai/src/context/builder.ts \
        apps/worker/src/jobs/generate-chapter.ts \
        packages/ai/test/
git commit -m "feat(context): inject pending canon updates as a writer-visible section

Adds getPendingCanonUpdatesForStory + PendingCanonUpdateCompact, plumbs
them through ColdTier, and renders a # PENDING CANON UPDATES block (capped
to 10) so the writer knows what's staged but not yet applied. Closes the
remaining 'pending canon updates' gap from the LLM context audit's required
list."
```

---

## Task 6: Add a builder-level regression test for saga/arc progress + activeTurningPoint

**Why:** The off-by-one progress bug was caught only by manual tracing. Lock the behavior at the integration level (`buildContext` end-to-end with mocked retrieval) so the same regression cannot land again.

**Files:**
- Modify: `packages/ai/test/context/builder.test.ts`

- [ ] **Step 1: Add a new `describe` block to builder.test.ts**

Open `packages/ai/test/context/builder.test.ts` and append (inside the file, after the existing `describe("buildContext", () => { … })` closes):

```ts
describe("buildContext progress meta", () => {
  it("computes 100% on the final chapter of a saga and arc", async () => {
    const retrieval = await import("../../src/context/retrieval.js");
    vi.mocked(retrieval.getSagaForChapter).mockResolvedValueOnce({
      id: "saga-1",
      storyId: "story-1",
      premise: "",
      startChapter: 1,
      endChapter: 10,
      expectedTurningPoints: ["TP1", "TP2"],
      rollingSummary: null,
    } as any);
    vi.mocked(retrieval.getArcById).mockResolvedValueOnce({
      id: "arc-1",
      storyId: "story-1",
      sagaId: "saga-1",
      premise: "",
      startChapter: 8,
      endChapter: 10,
      mainConflict: null,
      expectedChanges: [],
      expectedPowerChanges: [],
      expectedCharacterChanges: [],
      rollingSummary: null,
    } as any);

    const result = await buildContext({ ...baseDeps, chapterNumber: 10 });

    expect(result.meta.sagaProgressPercent).toBe(100);
    expect(result.meta.arcProgressPercent).toBe(100);
    expect(result.meta.sagaPhase).toBe("climax");
    expect(result.meta.arcPhase).toBe("climax");
    expect(result.meta.sagaRange).toBe("10/10");
    expect(result.meta.arcRange).toBe("3/3");
    expect(result.meta.activeTurningPoint).toBe("TP2");
  });

  it("returns null progress fields for open-ended sagas/arcs", async () => {
    const retrieval = await import("../../src/context/retrieval.js");
    vi.mocked(retrieval.getSagaForChapter).mockResolvedValueOnce({
      id: "saga-1",
      storyId: "story-1",
      premise: "",
      startChapter: 1,
      endChapter: null,
      expectedTurningPoints: [],
      rollingSummary: null,
    } as any);
    vi.mocked(retrieval.getArcById).mockResolvedValueOnce({
      id: "arc-1",
      storyId: "story-1",
      sagaId: "saga-1",
      premise: "",
      startChapter: null,
      endChapter: null,
      mainConflict: null,
      expectedChanges: [],
      expectedPowerChanges: [],
      expectedCharacterChanges: [],
      rollingSummary: null,
    } as any);

    const result = await buildContext({ ...baseDeps, chapterNumber: 5 });

    expect(result.meta.sagaProgressPercent).toBeNull();
    expect(result.meta.arcProgressPercent).toBeNull();
    expect(result.meta.sagaPhase).toBeNull();
    expect(result.meta.arcPhase).toBeNull();
    expect(result.meta.activeTurningPoint).toBeNull();
  });
});
```

(If the actual `Saga` / `Arc` types from Drizzle have fields beyond what's listed, the `as any` cast handles it — these test fixtures only need to satisfy the fields `buildContext` reads.)

- [ ] **Step 2: Run the new tests**

Run: `cd packages/ai && pnpm exec vitest run test/context/builder.test.ts 2>&1 | tail -20`
Expected: 6 passing (4 existing + 2 new).

If a fixture mismatch breaks compile, inspect the original `Saga`/`Arc` types in `packages/db/src/schema/sagas.ts` / `arcs.ts` and add the missing nullable columns to the literal.

- [ ] **Step 3: Commit**

```bash
git add packages/ai/test/context/builder.test.ts
git commit -m "test(context): regression tests for progress meta + activeTurningPoint

Locks the post-fix invariants: final chapter of a span = 100%, single-
chapter span = 100%, open-ended span = null, and the active turning point
is selected from saga.expectedTurningPoints by saga position."
```

---

## Self-Review

**Spec coverage:**
- ✅ Bug 1 (`bibleCompact: ""`) → Task 1
- ✅ Bug 2 (non-contiguous chapter labels) → Task 1
- ✅ Bug 3 (pending canon updates not injected) → Task 5
- ✅ Quality 4 (`# STORY PROGRESS` too terse) → Tasks 3 + 4
- ✅ Quality 5 (`?? {}` defensive casts) → Task 2
- ✅ Quality 6 (test coverage for progress) → Tasks 3 + 6

Items 7 (timeline `eventType`) and 8 (overdue thread markers) from my earlier list are intentionally **not** in this plan — they're polish, not in the same priority tier. If wanted, they're each a 5-minute follow-up task.

**Placeholder scan:** No TBDs, "appropriate", "similar to", or unspecified file paths. Each step shows exact code or exact commands.

**Type consistency:** `ProgressPhase` introduced in Task 3 is referenced inline in Task 3's `meta` literal as a stringly-typed union to avoid a forward-import; types match. `PendingCanonUpdateCompact` defined in Task 5 step 1 and used in subsequent steps with consistent field names (`updateType`, `targetTable`, `conflictStatus`, `conflictReasons`, `summary`). `getPendingCanonUpdatesForStory` signature `(db, storyId, limit?)` consistent across retrieval definition and builder call site (caller omits `limit`, taking the default `10`).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-02-llm-context-pipeline-quality-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
