# LLM Context Pipeline Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the LLM context pipeline so chapter-critical LLM calls receive compact Bible/Saga/Arc/canon/progress/story-option context, including fallback progress metadata.

**Architecture:** Keep `buildContext()` as the chapter context source, but move progress math into a shared helper so the packet pacing hint and writer metadata cannot drift. Preserve compact prompt sections and patch only real missing context or verification gaps on current `main`.

**Tech Stack:** TypeScript, Vitest, Drizzle ORM, pnpm workspaces, `@novel/ai`, `@novel/worker`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/ai/src/context/progress.ts` | Shared progress percent/window/phase helpers. |
| `packages/ai/src/context/types.ts` | `ChapterContext.meta` progress source fields. |
| `packages/ai/src/context/retrieval.ts` | Read `stories.targetChapterCount` for fallback progress windows. |
| `packages/ai/src/context/builder.ts` | Use shared progress helper and story target fallback. |
| `packages/ai/src/index.ts` | Re-export progress helper module. |
| `packages/ai/test/context/progress.test.ts` | Unit tests for exact and fallback progress windows. |
| `packages/ai/test/context/builder.test.ts` | Regression tests for context meta exact and fallback progress. |
| `apps/worker/src/jobs/generate-chapter.ts` | Use shared progress helper for packet pacing hints and render progress source in writer context. |
| `apps/worker/test/jobs/generate-chapter-context.test.ts` | Unit test for writer context serialization sections, if importing the job remains practical. |
| `docs/graph/modules/context-builder.md` | Document fallback progress and context sections if behavior changes. |

## Task 1: Add Shared Progress Helper

**Files:**
- Create: `packages/ai/src/context/progress.ts`
- Modify: `packages/ai/src/context/builder.ts`
- Modify: `packages/ai/src/index.ts`
- Test: `packages/ai/test/context/progress.test.ts`

- [ ] **Step 1: Write failing progress helper tests**

Add these tests to `packages/ai/test/context/progress.test.ts`:

```ts
import {
  computeProgressPercent,
  computeProgressWindow,
  progressPhaseFor,
} from "../../src/context/progress.js";

describe("computeProgressWindow", () => {
  it("uses planned range when start and end are present", () => {
    expect(
      computeProgressWindow({
        chapterNumber: 5,
        startChapter: 1,
        endChapter: 10,
        fallbackEndChapter: 100,
      }),
    ).toEqual({
      percent: 50,
      range: "5/10",
      startChapter: 1,
      endChapter: 10,
      source: "planned_range",
    });
  });

  it("uses story target fallback when end is missing", () => {
    expect(
      computeProgressWindow({
        chapterNumber: 25,
        startChapter: 1,
        endChapter: null,
        fallbackEndChapter: 100,
        fallbackSource: "story_target_fallback",
      }),
    ).toEqual({
      percent: 25,
      range: "25/100",
      startChapter: 1,
      endChapter: 100,
      source: "story_target_fallback",
    });
  });

  it("uses chapter 1 as conservative start when only end is present", () => {
    expect(
      computeProgressWindow({
        chapterNumber: 10,
        startChapter: null,
        endChapter: 20,
        fallbackEndChapter: null,
      }),
    ).toEqual({
      percent: 50,
      range: "10/20",
      startChapter: 1,
      endChapter: 20,
      source: "planned_range",
    });
  });

  it("returns null when no end boundary can be derived", () => {
    expect(
      computeProgressWindow({
        chapterNumber: 5,
        startChapter: 1,
        endChapter: null,
        fallbackEndChapter: null,
      }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ai && pnpm exec vitest run test/context/progress.test.ts`
Expected: FAIL because `../../src/context/progress.js` does not exist.

- [ ] **Step 3: Create minimal helper implementation**

Create `packages/ai/src/context/progress.ts`:

```ts
export type ProgressPhase =
  | "setup"
  | "development"
  | "climax_buildup"
  | "climax";

export type ProgressWindowSource =
  | "planned_range"
  | "story_target_fallback"
  | "saga_end_fallback";

export type ProgressWindow = {
  percent: number;
  range: string;
  startChapter: number;
  endChapter: number;
  source: ProgressWindowSource;
};

export function computeProgressPercent(
  chapterNumber: number,
  startChapter: number,
  endChapter: number,
): number {
  const span = Math.max(1, endChapter - startChapter + 1);
  const position = chapterNumber - startChapter + 1;
  const clamped = Math.max(0, Math.min(span, position));
  return Math.round((clamped / span) * 100);
}

export function computeProgressWindow(input: {
  chapterNumber: number;
  startChapter?: number | null;
  endChapter?: number | null;
  fallbackEndChapter?: number | null;
  fallbackSource?: Exclude<ProgressWindowSource, "planned_range">;
}): ProgressWindow | null {
  const hasPlannedEnd = input.endChapter != null;
  const startChapter = input.startChapter ?? 1;
  const rawEndChapter = input.endChapter ?? input.fallbackEndChapter ?? null;
  if (rawEndChapter == null) return null;

  const endChapter = Math.max(startChapter, rawEndChapter);
  const percent = computeProgressPercent(
    input.chapterNumber,
    startChapter,
    endChapter,
  );
  const span = Math.max(1, endChapter - startChapter + 1);
  const position = Math.max(
    0,
    Math.min(span, input.chapterNumber - startChapter + 1),
  );

  return {
    percent,
    range: `${position}/${span}`,
    startChapter,
    endChapter,
    source: hasPlannedEnd
      ? "planned_range"
      : (input.fallbackSource ?? "story_target_fallback"),
  };
}

export function progressPhaseFor(percent: number | null): ProgressPhase | null {
  if (percent == null) return null;
  if (percent < 30) return "setup";
  if (percent < 60) return "development";
  if (percent < 80) return "climax_buildup";
  return "climax";
}
```

- [ ] **Step 4: Update imports and re-export**

In `packages/ai/src/context/builder.ts`, remove the local `computeProgressPercent`, `ProgressPhase`, and `progressPhaseFor` definitions after callers are updated in Task 2. Add:

```ts
import {
  computeProgressWindow,
  progressPhaseFor,
} from "./progress.js";
export {
  computeProgressPercent,
  computeProgressWindow,
  progressPhaseFor,
  type ProgressPhase,
  type ProgressWindowSource,
} from "./progress.js";
```

In `packages/ai/src/index.ts`, add:

```ts
export * from './context/progress.js';
```

- [ ] **Step 5: Run progress tests**

Run: `cd packages/ai && pnpm exec vitest run test/context/progress.test.ts`
Expected: PASS.

## Task 2: Wire Fallback Progress Into Context Builder and Packet Pacing

**Files:**
- Modify: `packages/ai/src/context/types.ts`
- Modify: `packages/ai/src/context/retrieval.ts`
- Modify: `packages/ai/src/context/builder.ts`
- Modify: `apps/worker/src/jobs/generate-chapter.ts`
- Test: `packages/ai/test/context/builder.test.ts`

- [ ] **Step 1: Write failing builder fallback test**

In `packages/ai/test/context/builder.test.ts`, import `ProgressWindowSource` if needed and add `getStoryTargetChapterCount` to the retrieval mock:

```ts
getStoryTargetChapterCount: vi.fn().mockResolvedValue(100),
```

Replace the open-ended progress test with:

```ts
it("uses story target as fallback for open-ended saga and arc progress", async () => {
  const retrieval = await import("../../src/context/retrieval.js");
  vi.mocked(retrieval.getStoryTargetChapterCount).mockResolvedValueOnce(100);
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
    startChapter: 1,
    endChapter: null,
    mainConflict: null,
    expectedChanges: [],
    expectedPowerChanges: [],
    expectedCharacterChanges: [],
    rollingSummary: null,
  } as any);

  const result = await buildContext({ ...baseDeps, chapterNumber: 25 });

  expect(result.meta.sagaProgressPercent).toBe(25);
  expect(result.meta.arcProgressPercent).toBe(25);
  expect(result.meta.sagaProgressSource).toBe("story_target_fallback");
  expect(result.meta.arcProgressSource).toBe("story_target_fallback");
  expect(result.meta.sagaRange).toBe("25/100");
  expect(result.meta.arcRange).toBe("25/100");
});
```

- [ ] **Step 2: Run builder tests to verify failure**

Run: `cd packages/ai && pnpm exec vitest run test/context/builder.test.ts`
Expected: FAIL because `getStoryTargetChapterCount` and progress source fields are not wired.

- [ ] **Step 3: Add context type fields**

In `packages/ai/src/context/types.ts`, import the source type:

```ts
import type { ProgressWindowSource } from "./progress.js";
```

Add to `ChapterContext.meta`:

```ts
sagaProgressSource: ProgressWindowSource | null;
arcProgressSource: ProgressWindowSource | null;
```

- [ ] **Step 4: Add story target retrieval**

In `packages/ai/src/context/retrieval.ts`, import `stories` from `@novel/db/schema` and add:

```ts
export async function getStoryTargetChapterCount(
  db: Db,
  storyId: string,
): Promise<number | null> {
  const rows = await db
    .select({ targetChapterCount: stories.targetChapterCount })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);
  return rows[0]?.targetChapterCount ?? null;
}
```

- [ ] **Step 5: Use progress windows in builder**

In `packages/ai/src/context/builder.ts`, load `storyTargetChapterCount` alongside saga and arc:

```ts
const [saga, arc, storyTargetChapterCount] = await Promise.all([
  getSagaForChapter(db, storyId, chapterNumber),
  getArcById(db, arcId),
  getStoryTargetChapterCount(db, storyId),
]);
```

Replace direct percent/range computation with:

```ts
const sagaProgress = computeProgressWindow({
  chapterNumber,
  startChapter: saga?.startChapter,
  endChapter: saga?.endChapter,
  fallbackEndChapter: storyTargetChapterCount,
  fallbackSource: "story_target_fallback",
});

const arcProgress = computeProgressWindow({
  chapterNumber,
  startChapter: arc?.startChapter,
  endChapter: arc?.endChapter,
  fallbackEndChapter: saga?.endChapter ?? storyTargetChapterCount,
  fallbackSource:
    saga?.endChapter != null ? "saga_end_fallback" : "story_target_fallback",
});
```

Then set meta fields from `sagaProgress` and `arcProgress`.

- [ ] **Step 6: Use progress windows in generate-chapter packet hints**

In `apps/worker/src/jobs/generate-chapter.ts`, import `computeProgressWindow` and `getStoryTargetChapterCount`. Load story target near saga loading:

```ts
const [saga, storyTargetChapterCount] = await Promise.all([
  getSagaForChapter(db, data.storyId, data.chapterNumber),
  getStoryTargetChapterCount(db, data.storyId),
]);
```

Use `computeProgressWindow()` for arc and saga pacing hints instead of local fallback-to-current-chapter boundaries.

- [ ] **Step 7: Run focused tests**

Run:

```bash
cd packages/ai && pnpm exec vitest run test/context/progress.test.ts test/context/builder.test.ts
pnpm --filter @novel/worker typecheck
```

Expected: both Vitest files pass and worker typecheck exits 0.

## Task 3: Verify Writer Context Serialization Covers Required Sections

**Files:**
- Modify: `apps/worker/src/jobs/generate-chapter.ts`
- Test: `apps/worker/test/jobs/generate-chapter-context.test.ts`

- [ ] **Step 1: Write failing serialization test**

Create `apps/worker/test/jobs/generate-chapter-context.test.ts` with a minimal `ChapterContext` and assert the serialized string contains:

```ts
expect(out).toContain("# GENRE CONTRACT");
expect(out).toContain("# STORY OPTIONS");
expect(out).toContain("# STORY PROGRESS");
expect(out).toContain("source=story_target_fallback");
expect(out).toContain("# SAGA SUMMARY");
expect(out).toContain("# ARC SUMMARY");
expect(out).toContain("# ACTIVE CHARACTERS");
expect(out).toContain("bloodlines=[");
expect(out).toContain("# KNOWN FACTIONS");
expect(out).toContain("# TIMELINE EVENTS");
expect(out).toContain("# PENDING CANON UPDATES");
expect(out).toContain("# CHAPTER PLAN");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/worker && pnpm exec vitest run test/jobs/generate-chapter-context.test.ts`
Expected: FAIL if `serializeContextForWriter` is not exported or source text is missing.

- [ ] **Step 3: Export serializer and render source**

In `apps/worker/src/jobs/generate-chapter.ts`, change:

```ts
function serializeContextForWriter(ctx: ChapterContext): string {
```

to:

```ts
export function serializeContextForWriter(ctx: ChapterContext): string {
```

Update progress lines to append source:

```ts
const source = ctx.meta.sagaProgressSource
  ? `, source=${ctx.meta.sagaProgressSource}`
  : "";
```

Do the equivalent for arc progress.

- [ ] **Step 4: Run worker context test**

Run: `cd apps/worker && pnpm exec vitest run test/jobs/generate-chapter-context.test.ts`
Expected: PASS.

## Task 4: Verify LLM Call Context Inventory and Prompt Drift Guards

**Files:**
- Modify only if gaps are found after inspection:
  - `packages/ai/src/prompts/packet-generator.v2.ts`
  - `packages/ai/src/prompts/writer.v2.ts`
  - `packages/ai/src/prompts/llm-validator.v2.ts`
  - `packages/ai/src/prompts/high-stakes-reviewer.v2.ts`
  - `packages/ai/src/agents/llm-validator.ts`
  - `packages/ai/src/agents/high-stakes-reviewer.ts`
- Test:
  - `packages/ai/test/prompts/packet-generator.v2.test.ts`
  - `packages/ai/test/prompts/writer.v2.test.ts`
  - `packages/ai/test/prompts/llm-validator.v2.test.ts`

- [ ] **Step 1: Inspect prompt callsites**

Run:

```bash
rg -n "provider\\.complete|writerPromptV2|packetGeneratorPromptV2|llmValidatorPromptV2|highStakesReviewerPromptV2|renderStoryOptionsBlock|renderGenreContract" packages/ai/src apps/worker/src apps/api/src --glob '*.ts'
```

Expected: inventory covers all LLM calls listed in the design spec.

- [ ] **Step 2: Patch only confirmed gaps**

If a chapter-critical prompt lacks Bible/Saga/Arc/progress/story options after inspection, add a compact section or prompt instruction. Do not add speculative context.

- [ ] **Step 3: Run prompt tests**

Run:

```bash
cd packages/ai && pnpm exec vitest run test/prompts/packet-generator.v2.test.ts test/prompts/writer.v2.test.ts test/prompts/llm-validator.v2.test.ts
```

Expected: PASS.

## Task 5: Update Documentation and Run Verification

**Files:**
- Modify: `docs/graph/modules/context-builder.md`

- [ ] **Step 1: Update context-builder graph doc**

Add a short section documenting:

```md
### Progress Fallback Source
- Exact saga/arc range uses `source=planned_range`.
- Missing saga end falls back to `stories.targetChapterCount` with `source=story_target_fallback`.
- Missing arc end falls back to active saga end when available, otherwise story target chapter count.
- If no end can be derived, progress stays null and is omitted from writer context.
```

- [ ] **Step 2: Run final focused verification**

Run:

```bash
cd packages/ai && pnpm exec vitest run test/context/progress.test.ts test/context/builder.test.ts test/prompts/packet-generator.v2.test.ts test/prompts/writer.v2.test.ts test/prompts/llm-validator.v2.test.ts
cd apps/worker && pnpm exec vitest run test/jobs/generate-chapter-context.test.ts
pnpm --filter @novel/ai typecheck
pnpm --filter @novel/worker typecheck
```

Expected: all commands exit 0.

