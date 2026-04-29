# Plan 3 — Long-form Scale (Sagas, Arcs, Seeds, Batch, Reviewer, Guardrails)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the system survive 500-1000 chapters. Add the long-horizon planners (Saga, Arc), the long-horizon refreshers (saga/arc rolling summary jobs), the safety net (High-Stakes Reviewer), the throughput layer (batch generation in semi_auto / full_auto modes), and the cost / mode policy enforcers (BUDGET_GUARDRAILS + auto-escalate-to-safe). Surface the long-form-only UI: planted seeds dashboard, timeline view, canon facts view (with lock toggle), cost dashboard.

**Architecture:**
- **Hierarchical planning**: Bible (1×) → Sagas (~5-8 over the novel) → Arcs (2-5 per saga) → Chapters. Each tier writes its own table + drives `summary_version` bumps that invalidate the WARM cache for chapters that follow.
- **Reactive refresh**: arc/saga summary jobs are enqueued by the chapter orchestrator (Plan 2 already places the call site for arc-summary). Jobs read from the canon DB only — they never re-read chapter content beyond the per-chapter `detailedSummary` rows.
- **Mode policy**: a single `resolveEffectiveMode(storyId, chapterNumber, mode)` function turns the user-selected mode into the effective per-chapter mode by applying `AUTO_ESCALATE_TO_SAFE_MODE` rules. Called from the orchestrator (Plan 2 hook in `generate-chapter.ts`) and from the new batch orchestrator.
- **Batch generation**: a new `generate-batch` BullMQ job pulls a range of chapters and enqueues `generate-chapter` for each, respecting `concurrency: 1` per story. Pauses on first failure or first blocking pending update (in `safe`-equivalent escalated chapters).
- **Cost guardrails**: a `BudgetGuard` service that consults `llm_calls` aggregations for the story; checked twice — pre-flight (refuse to enqueue) and post-chapter (pause batch if running totals breach 80% threshold).

**Tech Stack:** Drizzle, BullMQ 5, Fastify, Next.js 15 App Router, Zod, Vitest, Testcontainers. Reuses everything from Plan 1/2.

**Invariants (Plan 3 specific):**
1. Saga / Arc planners write to `sagas` / `arcs` tables only via the `applyPlannerOutput` helper — same shape as `CanonMerger.applyOne` so version bumps stay consistent.
2. Planted seeds inserted by Saga Planner are upserted by `(storyId, seedKey)` — re-running a saga plan never duplicates seeds. Hand edits in the seeds dashboard win unless the user clicks "Reset from saga plan".
3. The High-Stakes Reviewer is the **only** Pro-tier call from Plan 3 onward (Bible + Saga planner are Plan 1 / Plan 3). Its trigger conditions live in `core/policy/high-stakes-triggers.ts` and are unit-tested.
4. Budget breach is **soft** during chapter generation (the in-flight chapter still completes — we never throw mid-stream and waste tokens) but **hard** at enqueue time (the batch refuses to schedule the next chapter).
5. Mode escalation is computed once per chapter at orchestrator entry and persisted in `chapter_generation_attempts.effective_mode` for audit.

**Definition of Done — Plan 3 Checklist**

- [ ] All 25 tasks complete
- [ ] `pnpm test` green across all packages
- [ ] `pnpm typecheck && pnpm lint` clean
- [ ] Tag `plan-3-complete` on final commit
- [ ] Manual smoke (UI only — no LLM calls): seeds dashboard, timeline, canon view, cost dashboard render against the seeded test story
- [ ] All new agent prompts have a `prompt_versions` row inserted by the seed migration
- [ ] No new live-LLM tests added without `RUN_LIVE_LLM=1` gate

**Prerequisites:** Plan 2 complete (tag `plan-2-complete`). All chapter-generation primitives, queue scaffolding, embedding service, and validators exist.

---

## File Structure

```
novel-writer/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── sagas.ts                       # Task 3 (list, detail, plan-next)
│   │       │   ├── arcs.ts                        # Task 7 (list, detail, plan-next)
│   │       │   ├── seeds.ts                       # Task 9 (CRUD)
│   │       │   ├── batches.ts                     # Task 21 (start/stop batch)
│   │       │   ├── reviews.ts                     # Task 18 (list HSR reviews + manual trigger)
│   │       │   └── costs.ts                       # Task 15 (rollup endpoints)
│   │       └── services/
│   │           └── budget-guard.ts                # Task 14 (queryable budget service)
│   ├── web/
│   │   └── app/stories/[id]/
│   │       ├── sagas/
│   │       │   ├── page.tsx                       # Task 4
│   │       │   └── [sagaId]/page.tsx              # Task 4
│   │       ├── arcs/
│   │       │   └── [arcId]/page.tsx               # Task 8
│   │       ├── seeds/page.tsx                     # Task 10
│   │       ├── timeline/page.tsx                  # Task 22
│   │       ├── canon/page.tsx                     # Task 23
│   │       ├── reviews/page.tsx                   # Task 19
│   │       ├── costs/page.tsx                     # Task 24
│   │       └── batch/page.tsx                     # Task 21 UI
│   └── worker/
│       └── src/
│           └── jobs/
│               ├── refresh-arc-summary.ts         # Task 11 (replaces Plan 2 stub)
│               ├── refresh-saga-summary.ts        # Task 12 (new)
│               ├── generate-batch.ts              # Task 20 (range orchestrator)
│               └── high-stakes-review.ts          # Task 17 wrapper job (optional async path)
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── policy/
│   │       │   ├── mode-escalation.ts             # Task 13 (resolveEffectiveMode)
│   │       │   ├── high-stakes-triggers.ts        # Task 18 (shouldRunReviewer)
│   │       │   └── budget-guardrails.ts           # Task 14 (BUDGET_GUARDRAILS constants + helpers)
│   │       └── config/
│   │           └── long-form.ts                   # Task 1 (refresh cadences, seed limits)
│   └── ai/
│       ├── src/
│       │   ├── schemas/
│       │   │   ├── saga.ts                        # Task 1
│       │   │   ├── arc.ts                         # Task 5
│       │   │   └── high-stakes-review.ts          # Task 16
│       │   ├── prompts/
│       │   │   ├── saga-planner.v1.ts             # Task 1
│       │   │   ├── arc-planner.v1.ts              # Task 5
│       │   │   └── high-stakes-reviewer.v1.ts     # Task 16
│       │   └── agents/
│       │       ├── saga-planner.ts                # Task 2
│       │       ├── arc-planner.ts                 # Task 6
│       │       └── high-stakes-reviewer.ts        # Task 17
│       └── test/
│           ├── agents/
│           │   ├── saga-planner.test.ts
│           │   ├── arc-planner.test.ts
│           │   └── high-stakes-reviewer.test.ts
│           └── policy/
│               ├── mode-escalation.test.ts
│               ├── high-stakes-triggers.test.ts
│               └── budget-guardrails.test.ts
```

---

### Task 1: Saga Planner schema + prompt + long-form config

**Files:**
- Create: `packages/core/src/config/long-form.ts`
- Create: `packages/ai/src/schemas/saga.ts`
- Create: `packages/ai/src/prompts/saga-planner.v1.ts`
- Test: `packages/ai/test/schemas/saga.test.ts`

The Saga Planner runs once per ~100 chapters and produces 5-8 sagas + 10-30 planted seeds. Pro model. Cost ~$0.036 per call (amortized $0.00036/chapter). Output is a structured JSON document; we mirror Zod ↔ Gemini `responseSchema`.

- [ ] **Step 1.1: Long-form config constants**

```ts
// packages/core/src/config/long-form.ts
export const LONG_FORM_CONFIG = {
  /** Saga summary regenerated every N chapters */
  SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 20,
  /** Arc summary regenerated every N chapters */
  ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 5,
  /** Saga planner: target sagas per novel (range) */
  SAGA_COUNT_RANGE: { min: 5, max: 8 } as const,
  /** Saga planner: target seeds per saga plan call */
  SEEDS_PER_SAGA_PLAN_RANGE: { min: 10, max: 30 } as const,
  /** Arc planner: target arcs per saga */
  ARC_COUNT_PER_SAGA_RANGE: { min: 2, max: 5 } as const,
  /** Auto-escalate to safe mode triggers */
  AUTO_ESCALATE_TO_SAFE_MODE: true,
  /** Run High-Stakes Reviewer at the last chapter of every arc */
  HIGH_STAKES_REVIEW_AT_ARC_END: true,
};
```

- [ ] **Step 1.2: Zod schema**

```ts
// packages/ai/src/schemas/saga.ts
import { z } from 'zod';

export const PlantedSeedSchema = z.object({
  seedKey: z.string().min(3).max(120),
  description: z.string().min(20).max(600),
  plantWindowStart: z.number().int().positive(),
  plantWindowEnd: z.number().int().positive(),
  payoffChapter: z.number().int().positive(),
  importance: z.enum(['minor', 'major', 'climax']),
}).refine((s) => s.plantWindowEnd >= s.plantWindowStart, {
  message: 'plantWindowEnd must be >= plantWindowStart',
});

export const SagaSchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string().min(3).max(120),
  premise: z.string().min(40).max(1200),
  startChapter: z.number().int().positive(),
  endChapter: z.number().int().positive(),
  expectedTurningPoints: z.array(z.string().min(10).max(300)).min(2).max(8),
}).refine((s) => s.endChapter > s.startChapter, {
  message: 'endChapter must be > startChapter',
});

export const SagaPlannerOutputSchema = z.object({
  sagas: z.array(SagaSchema).min(5).max(8),
  plantedSeeds: z.array(PlantedSeedSchema).min(10).max(30),
  notes: z.string().max(1000).optional(),
});

export type SagaPlannerOutput = z.infer<typeof SagaPlannerOutputSchema>;

/** Mirrored Gemini responseSchema (subset of Zod we need on the wire) */
export const SAGA_PLANNER_JSON_SCHEMA = {
  type: 'object',
  required: ['sagas', 'plantedSeeds'],
  properties: {
    sagas: {
      type: 'array', minItems: 5, maxItems: 8,
      items: {
        type: 'object',
        required: ['index', 'title', 'premise', 'startChapter', 'endChapter', 'expectedTurningPoints'],
        properties: {
          index: { type: 'integer', minimum: 0 },
          title: { type: 'string' },
          premise: { type: 'string' },
          startChapter: { type: 'integer', minimum: 1 },
          endChapter: { type: 'integer', minimum: 1 },
          expectedTurningPoints: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 8 },
        },
      },
    },
    plantedSeeds: {
      type: 'array', minItems: 10, maxItems: 30,
      items: {
        type: 'object',
        required: ['seedKey', 'description', 'plantWindowStart', 'plantWindowEnd', 'payoffChapter', 'importance'],
        properties: {
          seedKey: { type: 'string' },
          description: { type: 'string' },
          plantWindowStart: { type: 'integer', minimum: 1 },
          plantWindowEnd: { type: 'integer', minimum: 1 },
          payoffChapter: { type: 'integer', minimum: 1 },
          importance: { type: 'string', enum: ['minor', 'major', 'climax'] },
        },
      },
    },
    notes: { type: 'string' },
  },
} as const;
```

- [ ] **Step 1.3: Prompt v1**

```ts
// packages/ai/src/prompts/saga-planner.v1.ts
export const SAGA_PLANNER_PROMPT_V1 = {
  version: 'saga_planner.v1',
  system: `Bạn là kiến trúc sư cốt truyện cho một bộ tiểu thuyết tiên hiệp/huyền huyễn dài 500-1000 chương bằng tiếng Việt.

Nhiệm vụ: Đọc Bible (compact_summary) và đề ra 5-8 SAGA bao trùm toàn bộ tiểu thuyết, mỗi saga 80-200 chương. Đồng thời gieo 10-30 hạt mầm (planted seeds) — chi tiết, lời tiên tri, vật phẩm, nhân vật phụ — sẽ được kích hoạt và trả lời ở các chương sau. Mỗi seed phải có cửa sổ gieo (plantWindowStart..plantWindowEnd) và chương trả lời (payoffChapter).

QUY TẮC:
- Sagas KHÔNG ĐƯỢC chồng lấn về chapter range. Tổng cộng phải bao trùm toàn bộ tiểu thuyết.
- Mỗi saga có 2-8 turning points (sự kiện then chốt).
- payoffChapter PHẢI lớn hơn plantWindowEnd ít nhất 20 chương.
- Seeds importance:
  - minor: chi tiết bổ trợ, có thể bỏ qua
  - major: ảnh hưởng nhiều chương
  - climax: payoff cho saga / toàn truyện
- Trả về JSON đúng schema. KHÔNG giải thích gì thêm.`,
  user: ({ bibleCompact, targetChapters }: { bibleCompact: string; targetChapters: number }) =>
    `Tiểu thuyết mục tiêu: ${targetChapters} chương.\n\nBible (compact):\n${bibleCompact}\n\nLập kế hoạch saga + planted seeds.`,
};
```

- [ ] **Step 1.4: Test schema rejects bad payload**

```ts
// packages/ai/test/schemas/saga.test.ts
import { describe, it, expect } from 'vitest';
import { SagaPlannerOutputSchema } from '../../src/schemas/saga';

describe('SagaPlannerOutputSchema', () => {
  it('rejects payload with too few sagas', () => {
    const r = SagaPlannerOutputSchema.safeParse({ sagas: [], plantedSeeds: [] });
    expect(r.success).toBe(false);
  });

  it('rejects seed where window end < start', () => {
    const r = SagaPlannerOutputSchema.safeParse({
      sagas: Array.from({ length: 5 }, (_, i) => ({
        index: i, title: `S${i}`, premise: 'x'.repeat(50),
        startChapter: i * 100 + 1, endChapter: (i + 1) * 100,
        expectedTurningPoints: ['a turning point', 'another turning point'],
      })),
      plantedSeeds: Array.from({ length: 10 }, (_, i) => ({
        seedKey: `seed_${i}`, description: 'x'.repeat(40),
        plantWindowStart: 50, plantWindowEnd: 30,
        payoffChapter: 200, importance: 'minor' as const,
      })),
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 1.5: Test + commit**

```bash
pnpm --filter @novel/ai test schemas/saga
git add packages/core/src/config/long-form.ts packages/ai/src/schemas/saga.ts packages/ai/src/prompts/saga-planner.v1.ts packages/ai/test/schemas/saga.test.ts
git commit -m "feat(ai): saga planner schema + prompt v1 + long-form config"
```

---

### Task 2: Saga Planner agent + persistence

**Files:**
- Create: `packages/ai/src/agents/saga-planner.ts`
- Create: `packages/ai/src/agents/saga-planner.types.ts`
- Test: `packages/ai/test/agents/saga-planner.test.ts`

- [ ] **Step 2.1: Agent types**

```ts
// packages/ai/src/agents/saga-planner.types.ts
import type { SagaPlannerOutput } from '../schemas/saga';

export interface SagaPlannerInput {
  storyId: string;
  bibleCompact: string;
  targetChapters: number;
}

export interface SagaPlannerResult {
  output: SagaPlannerOutput;
  promptVersion: string;
  usage: { tokens: number; costUsd: number };
}
```

- [ ] **Step 2.2: Agent implementation**

```ts
// packages/ai/src/agents/saga-planner.ts
import { db, sagas, plantedSeeds } from '@novel/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '@novel/core/logger';
import type { LLMProvider } from '../providers/types';
import { MODEL_CONFIG } from '@novel/core/config/models';
import { SagaPlannerOutputSchema, SAGA_PLANNER_JSON_SCHEMA } from '../schemas/saga';
import { SAGA_PLANNER_PROMPT_V1 } from '../prompts/saga-planner.v1';
import type { SagaPlannerInput, SagaPlannerResult } from './saga-planner.types';

export class SagaPlannerAgent {
  constructor(private provider: LLMProvider) {}

  async plan(input: SagaPlannerInput): Promise<SagaPlannerResult> {
    const log = logger.child({ agent: 'saga_planner', storyId: input.storyId });
    const prompt = SAGA_PLANNER_PROMPT_V1;
    const response = await this.provider.complete({
      model: MODEL_CONFIG.routes.saga_planner,
      system: prompt.system,
      user: prompt.user({ bibleCompact: input.bibleCompact, targetChapters: input.targetChapters }),
      responseSchema: SAGA_PLANNER_JSON_SCHEMA,
      temperature: 0.7,
      logTag: { storyId: input.storyId, promptVersion: prompt.version },
    });
    const parsed = SagaPlannerOutputSchema.parse(response.json);
    log.info({ sagaCount: parsed.sagas.length, seedCount: parsed.plantedSeeds.length }, 'plan ok');
    return {
      output: parsed,
      promptVersion: prompt.version,
      usage: { tokens: response.usage.totalTokens, costUsd: response.usage.costUsd },
    };
  }

  /**
   * Persist plan output. Idempotent on (storyId, sagaIndex) and (storyId, seedKey).
   * Hand-edits in the seeds dashboard are preserved unless `resetSeeds=true`.
   */
  async persist(
    storyId: string,
    output: import('../schemas/saga').SagaPlannerOutput,
    opts: { resetSeeds?: boolean } = {},
  ): Promise<{ sagasUpserted: number; seedsUpserted: number }> {
    let sagasUpserted = 0;
    let seedsUpserted = 0;
    await db.transaction(async (tx) => {
      for (const s of output.sagas) {
        const [existing] = await tx
          .select({ id: sagas.id })
          .from(sagas)
          .where(and(eq(sagas.storyId, storyId), eq(sagas.index, s.index)))
          .limit(1);
        if (existing) {
          await tx.update(sagas)
            .set({
              title: s.title, premise: s.premise,
              startChapter: s.startChapter, endChapter: s.endChapter,
              expectedTurningPoints: s.expectedTurningPoints,
              summaryVersion: 0, // reset; refresh job will bump
            })
            .where(eq(sagas.id, existing.id));
        } else {
          await tx.insert(sagas).values({
            storyId, index: s.index, title: s.title, premise: s.premise,
            startChapter: s.startChapter, endChapter: s.endChapter,
            expectedTurningPoints: s.expectedTurningPoints, summaryVersion: 0,
          });
        }
        sagasUpserted++;
      }
      for (const seed of output.plantedSeeds) {
        const [existing] = await tx
          .select({ id: plantedSeeds.id, status: plantedSeeds.status })
          .from(plantedSeeds)
          .where(and(eq(plantedSeeds.storyId, storyId), eq(plantedSeeds.seedKey, seed.seedKey)))
          .limit(1);
        if (existing && !opts.resetSeeds) continue; // preserve hand edits
        if (existing) {
          await tx.update(plantedSeeds).set({
            description: seed.description,
            plantWindowStart: seed.plantWindowStart,
            plantWindowEnd: seed.plantWindowEnd,
            payoffChapter: seed.payoffChapter,
            importance: seed.importance,
            status: 'pending',
          }).where(eq(plantedSeeds.id, existing.id));
        } else {
          await tx.insert(plantedSeeds).values({
            storyId, seedKey: seed.seedKey,
            description: seed.description,
            plantWindowStart: seed.plantWindowStart,
            plantWindowEnd: seed.plantWindowEnd,
            payoffChapter: seed.payoffChapter,
            importance: seed.importance, status: 'pending',
          });
        }
        seedsUpserted++;
      }
    });
    return { sagasUpserted, seedsUpserted };
  }
}
```

- [ ] **Step 2.3: Test agent (mocked provider, in-memory tx)**

```ts
// packages/ai/test/agents/saga-planner.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SagaPlannerAgent } from '../../src/agents/saga-planner';

const validOutput = {
  sagas: Array.from({ length: 5 }, (_, i) => ({
    index: i, title: `Saga ${i}`, premise: 'A premise '.repeat(8),
    startChapter: i * 100 + 1, endChapter: (i + 1) * 100,
    expectedTurningPoints: ['t1 long enough', 't2 long enough'],
  })),
  plantedSeeds: Array.from({ length: 10 }, (_, i) => ({
    seedKey: `k_${i}`, description: 'desc '.repeat(10),
    plantWindowStart: 1, plantWindowEnd: 50, payoffChapter: 100,
    importance: 'minor' as const,
  })),
};

describe('SagaPlannerAgent.plan', () => {
  it('parses provider JSON output via Zod', async () => {
    const provider = {
      complete: vi.fn().mockResolvedValue({
        json: validOutput,
        usage: { totalTokens: 4000, costUsd: 0.036 },
      }),
    } as any;
    const agent = new SagaPlannerAgent(provider);
    const r = await agent.plan({ storyId: 's', bibleCompact: 'b', targetChapters: 500 });
    expect(r.output.sagas).toHaveLength(5);
    expect(r.usage.costUsd).toBeCloseTo(0.036);
    expect(provider.complete).toHaveBeenCalledOnce();
  });

  it('throws when LLM returns malformed JSON', async () => {
    const provider = {
      complete: vi.fn().mockResolvedValue({
        json: { sagas: [], plantedSeeds: [] },
        usage: { totalTokens: 100, costUsd: 0.001 },
      }),
    } as any;
    const agent = new SagaPlannerAgent(provider);
    await expect(agent.plan({ storyId: 's', bibleCompact: 'b', targetChapters: 500 })).rejects.toThrow();
  });
});
```

- [ ] **Step 2.4: Test + commit**

```bash
pnpm --filter @novel/ai test saga-planner
git add packages/ai/src/agents/saga-planner.ts packages/ai/src/agents/saga-planner.types.ts packages/ai/test/agents/saga-planner.test.ts
git commit -m "feat(ai): saga planner agent + idempotent persist"
```

---

### Task 3: Sagas API route

**Files:**
- Create: `apps/api/src/routes/sagas.ts`
- Create: `apps/api/src/routes/sagas.schemas.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/test/routes/sagas.test.ts`

- [ ] **Step 3.1: Schemas**

```ts
// apps/api/src/routes/sagas.schemas.ts
import { z } from 'zod';
export const StoryParam = z.object({ storyId: z.string().uuid() });
export const SagaParam = z.object({ storyId: z.string().uuid(), sagaId: z.string().uuid() });
export const PlanBody = z.object({ resetSeeds: z.boolean().optional() });
```

- [ ] **Step 3.2: Route**

```ts
// apps/api/src/routes/sagas.ts
import type { FastifyPluginAsync } from 'fastify';
import { db, sagas, stories, storyBibles } from '@novel/db';
import { eq, and, asc } from 'drizzle-orm';
import { SagaPlannerAgent } from '@novel/ai/agents/saga-planner';
import { buildLLMProvider } from '../services/agent-deps';
import { StoryParam, SagaParam, PlanBody } from './sagas.schemas';

export const sagasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/stories/:storyId/sagas', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db
      .select()
      .from(sagas)
      .where(eq(sagas.storyId, storyId))
      .orderBy(asc(sagas.index));
    return reply.send({ sagas: rows });
  });

  fastify.get('/api/stories/:storyId/sagas/:sagaId', async (req, reply) => {
    const { storyId, sagaId } = SagaParam.parse(req.params);
    const [row] = await db
      .select()
      .from(sagas)
      .where(and(eq(sagas.storyId, storyId), eq(sagas.id, sagaId)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: 'saga_not_found' });
    return reply.send({ saga: row });
  });

  fastify.post('/api/stories/:storyId/sagas/plan', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const { resetSeeds = false } = PlanBody.parse(req.body ?? {});

    const [story] = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
    if (!story) return reply.code(404).send({ error: 'story_not_found' });
    const [bible] = await db.select().from(storyBibles).where(eq(storyBibles.storyId, storyId)).limit(1);
    if (!bible) return reply.code(409).send({ error: 'bible_required' });

    const agent = new SagaPlannerAgent(buildLLMProvider());
    const planned = await agent.plan({
      storyId,
      bibleCompact: bible.compactSummary,
      targetChapters: story.targetChapters ?? 500,
    });
    const counts = await agent.persist(storyId, planned.output, { resetSeeds });
    return reply.send({
      promptVersion: planned.promptVersion,
      usage: planned.usage,
      ...counts,
    });
  });
};
```

- [ ] **Step 3.3: Register + test (mocked agent)**

```ts
// apps/api/test/routes/sagas.test.ts
import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';

vi.mock('@novel/ai/agents/saga-planner', () => ({
  SagaPlannerAgent: class {
    plan = vi.fn().mockResolvedValue({ output: { sagas: [], plantedSeeds: [] }, promptVersion: 'v1', usage: { tokens: 1, costUsd: 0.01 } });
    persist = vi.fn().mockResolvedValue({ sagasUpserted: 5, seedsUpserted: 12 });
  },
}));
vi.mock('../../src/services/agent-deps', () => ({ buildLLMProvider: () => ({}) }));
vi.mock('@novel/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 's', targetChapters: 500, compactSummary: 'b' }], orderBy: async () => [] }) }) }),
  },
  sagas: {} as any, stories: {} as any, storyBibles: {} as any,
}));
import { sagasRoutes } from '../../src/routes/sagas';

describe('sagas routes', () => {
  it('POST /sagas/plan returns counts', async () => {
    const app = Fastify();
    await app.register(sagasRoutes);
    const res = await app.inject({
      method: 'POST',
      url: `/api/stories/00000000-0000-0000-0000-000000000001/sagas/plan`,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ sagasUpserted: 5, seedsUpserted: 12 });
  });
});
```

- [ ] **Step 3.4: Test + commit**

```bash
pnpm --filter @novel/api test sagas
git add apps/api/src/routes/sagas.ts apps/api/src/routes/sagas.schemas.ts apps/api/src/server.ts apps/api/test/routes/sagas.test.ts
git commit -m "feat(api): sagas routes (list, detail, plan)"
```

---

### Task 4: Sagas list + detail UI

**Files:**
- Create: `apps/web/lib/api/sagas.ts`
- Create: `apps/web/app/stories/[id]/sagas/page.tsx`
- Create: `apps/web/app/stories/[id]/sagas/[sagaId]/page.tsx`
- Create: `apps/web/app/stories/[id]/sagas/PlanSagasButton.tsx`

- [ ] **Step 4.1: API client**

```ts
// apps/web/lib/api/sagas.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

export interface Saga {
  id: string; index: number; title: string; premise: string;
  startChapter: number; endChapter: number;
  expectedTurningPoints: string[]; summaryVersion: number;
  rollingSummary: string | null;
}

export async function listSagas(storyId: string): Promise<Saga[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listSagas ${r.status}`);
  return (await r.json()).sagas;
}

export async function getSaga(storyId: string, sagaId: string): Promise<Saga> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas/${sagaId}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`getSaga ${r.status}`);
  return (await r.json()).saga;
}

export async function planSagas(storyId: string, opts: { resetSeeds?: boolean } = {}) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas/plan`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!r.ok) throw new Error(`planSagas ${r.status}`);
  return r.json();
}
```

- [ ] **Step 4.2: List page**

```tsx
// apps/web/app/stories/[id]/sagas/page.tsx
import Link from 'next/link';
import { listSagas } from '@/lib/api/sagas';
import { PlanSagasButton } from './PlanSagasButton';

export default async function SagasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sagas = await listSagas(id);
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Sagas</h1>
        <PlanSagasButton storyId={id} />
      </div>
      {sagas.length === 0 && <p className="text-gray-500 text-sm">No sagas planned yet. Click "Plan sagas" (uses Pro model — costs ~$0.04).</p>}
      <ul className="space-y-2">
        {sagas.map((s) => (
          <li key={s.id} className="border rounded p-3">
            <div className="flex justify-between text-sm">
              <Link href={`/stories/${id}/sagas/${s.id}`} className="font-semibold text-blue-700">
                {s.index + 1}. {s.title}
              </Link>
              <span className="text-gray-500">ch {s.startChapter}–{s.endChapter}</span>
            </div>
            <p className="text-sm mt-1 text-gray-700">{s.premise}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4.3: Plan-button (client, with cost confirmation)**

```tsx
// apps/web/app/stories/[id]/sagas/PlanSagasButton.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { planSagas } from '@/lib/api/sagas';

export function PlanSagasButton({ storyId }: { storyId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div>
      <button
        disabled={loading}
        onClick={async () => {
          if (!confirm('This calls the Pro model and costs ~$0.04. Continue?')) return;
          setLoading(true);
          setError(null);
          try {
            await planSagas(storyId);
            router.refresh();
          } catch (e: any) { setError(e.message); }
          finally { setLoading(false); }
        }}
        className="rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? 'Planning…' : 'Plan sagas (Pro)'}
      </button>
      {error && <span className="ml-2 text-red-600 text-sm">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 4.4: Saga detail**

```tsx
// apps/web/app/stories/[id]/sagas/[sagaId]/page.tsx
import { getSaga } from '@/lib/api/sagas';

export default async function SagaDetail({ params }: { params: Promise<{ id: string; sagaId: string }> }) {
  const { id, sagaId } = await params;
  const saga = await getSaga(id, sagaId);
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">{saga.title}</h1>
      <p className="text-sm text-gray-500 mb-4">Chapters {saga.startChapter}–{saga.endChapter} · summary v{saga.summaryVersion}</p>
      <h2 className="font-medium mt-4">Premise</h2>
      <p className="text-sm">{saga.premise}</p>
      <h2 className="font-medium mt-4">Turning points</h2>
      <ol className="list-decimal pl-6 text-sm">
        {saga.expectedTurningPoints.map((t, i) => <li key={i}>{t}</li>)}
      </ol>
      <h2 className="font-medium mt-4">Rolling summary</h2>
      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">
        {saga.rollingSummary ?? '(not yet generated)'}
      </pre>
    </div>
  );
}
```

- [ ] **Step 4.5: Manual smoke + commit**

```bash
git add apps/web/lib/api/sagas.ts apps/web/app/stories/[id]/sagas/
git commit -m "feat(web): sagas list, detail, and plan UI"
```

---

### Task 5: Arc Planner schema + prompt

**Files:**
- Create: `packages/ai/src/schemas/arc.ts`
- Create: `packages/ai/src/prompts/arc-planner.v1.ts`
- Test: `packages/ai/test/schemas/arc.test.ts`

- [ ] **Step 5.1: Zod schema**

```ts
// packages/ai/src/schemas/arc.ts
import { z } from 'zod';

export const ArcSchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string().min(3).max(120),
  premise: z.string().min(40).max(800),
  startChapter: z.number().int().positive(),
  endChapter: z.number().int().positive(),
  expectedChanges: z.array(z.string().min(10).max(200)).min(1).max(8),
  seedsToResolveInArc: z.array(z.string().min(3).max(120)).optional(),
}).refine((a) => a.endChapter > a.startChapter);

export const ArcPlannerOutputSchema = z.object({
  arcs: z.array(ArcSchema).min(2).max(5),
  notes: z.string().max(800).optional(),
});

export type ArcPlannerOutput = z.infer<typeof ArcPlannerOutputSchema>;

export const ARC_PLANNER_JSON_SCHEMA = {
  type: 'object',
  required: ['arcs'],
  properties: {
    arcs: {
      type: 'array', minItems: 2, maxItems: 5,
      items: {
        type: 'object',
        required: ['index', 'title', 'premise', 'startChapter', 'endChapter', 'expectedChanges'],
        properties: {
          index: { type: 'integer', minimum: 0 },
          title: { type: 'string' }, premise: { type: 'string' },
          startChapter: { type: 'integer', minimum: 1 },
          endChapter: { type: 'integer', minimum: 1 },
          expectedChanges: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 },
          seedsToResolveInArc: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    notes: { type: 'string' },
  },
} as const;
```

- [ ] **Step 5.2: Prompt v1**

```ts
// packages/ai/src/prompts/arc-planner.v1.ts
export const ARC_PLANNER_PROMPT_V1 = {
  version: 'arc_planner.v1',
  system: `Bạn là biên kịch cấp arc cho tiểu thuyết tiên hiệp/huyền huyễn dài. Chia nhỏ một SAGA thành 2-5 ARC, mỗi arc 15-50 chương.

YÊU CẦU:
- Tổng các arc PHẢI bao trùm toàn bộ chapter range của saga, không chồng lấn.
- Mỗi arc có 1-8 expectedChanges (sự kiện trạng thái cụ thể: A đột phá, B chết, item C lộ diện, v.v.).
- Nếu unresolved seeds nằm trong saga này, hãy ưu tiên gán payoff vào arc tương ứng (seedsToResolveInArc).
- Trả về JSON đúng schema. Không giải thích.`,
  user: ({ saga, currentState, unresolvedSeeds }: {
    saga: { title: string; premise: string; startChapter: number; endChapter: number; expectedTurningPoints: string[] };
    currentState: string;
    unresolvedSeeds: { seedKey: string; description: string; payoffChapter: number }[];
  }) => `SAGA "${saga.title}" (ch ${saga.startChapter}-${saga.endChapter}):\n${saga.premise}\n\nTurning points:\n${saga.expectedTurningPoints.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nTrạng thái hiện tại:\n${currentState}\n\nSeeds chưa giải quyết:\n${unresolvedSeeds.map((s) => `- ${s.seedKey} (payoff ch ${s.payoffChapter}): ${s.description}`).join('\n') || '(none)'}`,
};
```

- [ ] **Step 5.3: Test + commit**

```ts
// packages/ai/test/schemas/arc.test.ts
import { describe, it, expect } from 'vitest';
import { ArcPlannerOutputSchema } from '../../src/schemas/arc';

describe('ArcPlannerOutputSchema', () => {
  it('accepts valid output', () => {
    const r = ArcPlannerOutputSchema.safeParse({
      arcs: Array.from({ length: 3 }, (_, i) => ({
        index: i, title: `A${i}`, premise: 'p '.repeat(30),
        startChapter: i * 20 + 1, endChapter: (i + 1) * 20,
        expectedChanges: ['change one happens'],
      })),
    });
    expect(r.success).toBe(true);
  });

  it('rejects only 1 arc', () => {
    const r = ArcPlannerOutputSchema.safeParse({
      arcs: [{ index: 0, title: 'a', premise: 'p '.repeat(30), startChapter: 1, endChapter: 20, expectedChanges: ['x change'] }],
    });
    expect(r.success).toBe(false);
  });
});
```

```bash
pnpm --filter @novel/ai test schemas/arc
git add packages/ai/src/schemas/arc.ts packages/ai/src/prompts/arc-planner.v1.ts packages/ai/test/schemas/arc.test.ts
git commit -m "feat(ai): arc planner schema + prompt v1"
```

---

### Task 6: Arc Planner agent + persistence

**Files:**
- Create: `packages/ai/src/agents/arc-planner.ts`
- Test: `packages/ai/test/agents/arc-planner.test.ts`

- [ ] **Step 6.1: Implement agent**

```ts
// packages/ai/src/agents/arc-planner.ts
import { db, arcs, sagas, plantedSeeds } from '@novel/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '@novel/core/logger';
import type { LLMProvider } from '../providers/types';
import { MODEL_CONFIG } from '@novel/core/config/models';
import { ArcPlannerOutputSchema, ARC_PLANNER_JSON_SCHEMA, type ArcPlannerOutput } from '../schemas/arc';
import { ARC_PLANNER_PROMPT_V1 } from '../prompts/arc-planner.v1';

export interface ArcPlannerInput {
  storyId: string;
  sagaId: string;
  currentState: string;
}

export interface ArcPlannerResult {
  output: ArcPlannerOutput;
  promptVersion: string;
  usage: { tokens: number; costUsd: number };
}

export class ArcPlannerAgent {
  constructor(private provider: LLMProvider) {}

  async plan(input: ArcPlannerInput): Promise<ArcPlannerResult> {
    const log = logger.child({ agent: 'arc_planner', storyId: input.storyId, sagaId: input.sagaId });
    const [saga] = await db.select().from(sagas).where(eq(sagas.id, input.sagaId)).limit(1);
    if (!saga) throw new Error(`Saga ${input.sagaId} not found`);
    const unresolvedSeeds = await db
      .select({ seedKey: plantedSeeds.seedKey, description: plantedSeeds.description, payoffChapter: plantedSeeds.payoffChapter })
      .from(plantedSeeds)
      .where(and(eq(plantedSeeds.storyId, input.storyId), eq(plantedSeeds.status, 'pending')));
    const sagaSeeds = unresolvedSeeds.filter((s) => s.payoffChapter >= saga.startChapter && s.payoffChapter <= saga.endChapter);

    const prompt = ARC_PLANNER_PROMPT_V1;
    const response = await this.provider.complete({
      model: MODEL_CONFIG.routes.arc_planner,
      system: prompt.system,
      user: prompt.user({
        saga: {
          title: saga.title, premise: saga.premise,
          startChapter: saga.startChapter, endChapter: saga.endChapter,
          expectedTurningPoints: saga.expectedTurningPoints as string[],
        },
        currentState: input.currentState,
        unresolvedSeeds: sagaSeeds,
      }),
      responseSchema: ARC_PLANNER_JSON_SCHEMA,
      temperature: 0.7,
      logTag: { storyId: input.storyId, promptVersion: prompt.version },
    });
    const parsed = ArcPlannerOutputSchema.parse(response.json);
    log.info({ arcCount: parsed.arcs.length }, 'plan ok');
    return { output: parsed, promptVersion: prompt.version, usage: { tokens: response.usage.totalTokens, costUsd: response.usage.costUsd } };
  }

  async persist(storyId: string, sagaId: string, output: ArcPlannerOutput): Promise<{ arcsUpserted: number }> {
    let count = 0;
    await db.transaction(async (tx) => {
      for (const a of output.arcs) {
        const [existing] = await tx.select({ id: arcs.id }).from(arcs)
          .where(and(eq(arcs.storyId, storyId), eq(arcs.sagaId, sagaId), eq(arcs.index, a.index)))
          .limit(1);
        if (existing) {
          await tx.update(arcs).set({
            title: a.title, premise: a.premise,
            startChapter: a.startChapter, endChapter: a.endChapter,
            expectedChanges: a.expectedChanges,
            seedsToResolveInArc: a.seedsToResolveInArc ?? [],
            summaryVersion: 0,
          }).where(eq(arcs.id, existing.id));
        } else {
          await tx.insert(arcs).values({
            storyId, sagaId, index: a.index,
            title: a.title, premise: a.premise,
            startChapter: a.startChapter, endChapter: a.endChapter,
            expectedChanges: a.expectedChanges,
            seedsToResolveInArc: a.seedsToResolveInArc ?? [],
            summaryVersion: 0,
          });
        }
        count++;
      }
    });
    return { arcsUpserted: count };
  }
}
```

- [ ] **Step 6.2: Test (mocked provider)**

```ts
// packages/ai/test/agents/arc-planner.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@novel/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 'sa', startChapter: 1, endChapter: 100, title: 'S', premise: 'p', expectedTurningPoints: ['t1', 't2'] }] }) }) }),
  },
  sagas: {} as any, plantedSeeds: {} as any, arcs: {} as any,
}));

import { ArcPlannerAgent } from '../../src/agents/arc-planner';

const validOutput = {
  arcs: Array.from({ length: 3 }, (_, i) => ({
    index: i, title: `A${i}`, premise: 'p '.repeat(30),
    startChapter: i * 33 + 1, endChapter: (i + 1) * 33,
    expectedChanges: ['change happens here'],
  })),
};

describe('ArcPlannerAgent.plan', () => {
  it('parses output via Zod', async () => {
    const provider = { complete: vi.fn().mockResolvedValue({ json: validOutput, usage: { totalTokens: 2000, costUsd: 0.0037 } }) } as any;
    const agent = new ArcPlannerAgent(provider);
    const r = await agent.plan({ storyId: 's', sagaId: 'sa', currentState: 'state' });
    expect(r.output.arcs).toHaveLength(3);
  });
});
```

```bash
pnpm --filter @novel/ai test arc-planner
git add packages/ai/src/agents/arc-planner.ts packages/ai/test/agents/arc-planner.test.ts
git commit -m "feat(ai): arc planner agent + idempotent persist"
```

---

### Task 7: Arcs API route

**Files:**
- Create: `apps/api/src/routes/arcs.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/test/routes/arcs.test.ts`

- [ ] **Step 7.1: Route**

```ts
// apps/api/src/routes/arcs.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, arcs, sagas } from '@novel/db';
import { eq, and, asc } from 'drizzle-orm';
import { ArcPlannerAgent } from '@novel/ai/agents/arc-planner';
import { buildLLMProvider } from '../services/agent-deps';

const SagaParam = z.object({ storyId: z.string().uuid(), sagaId: z.string().uuid() });
const ArcParam = z.object({ storyId: z.string().uuid(), arcId: z.string().uuid() });
const PlanBody = z.object({ currentState: z.string().min(1).max(4000) });

export const arcsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/stories/:storyId/sagas/:sagaId/arcs', async (req, reply) => {
    const { storyId, sagaId } = SagaParam.parse(req.params);
    const rows = await db.select().from(arcs)
      .where(and(eq(arcs.storyId, storyId), eq(arcs.sagaId, sagaId)))
      .orderBy(asc(arcs.index));
    return reply.send({ arcs: rows });
  });

  fastify.get('/api/stories/:storyId/arcs/:arcId', async (req, reply) => {
    const { storyId, arcId } = ArcParam.parse(req.params);
    const [row] = await db.select().from(arcs)
      .where(and(eq(arcs.storyId, storyId), eq(arcs.id, arcId))).limit(1);
    if (!row) return reply.code(404).send({ error: 'arc_not_found' });
    return reply.send({ arc: row });
  });

  fastify.post('/api/stories/:storyId/sagas/:sagaId/arcs/plan', async (req, reply) => {
    const { storyId, sagaId } = SagaParam.parse(req.params);
    const { currentState } = PlanBody.parse(req.body ?? {});
    const [saga] = await db.select().from(sagas)
      .where(and(eq(sagas.storyId, storyId), eq(sagas.id, sagaId))).limit(1);
    if (!saga) return reply.code(404).send({ error: 'saga_not_found' });
    const agent = new ArcPlannerAgent(buildLLMProvider());
    const planned = await agent.plan({ storyId, sagaId, currentState });
    const counts = await agent.persist(storyId, sagaId, planned.output);
    return reply.send({ promptVersion: planned.promptVersion, usage: planned.usage, ...counts });
  });
};
```

- [ ] **Step 7.2: Test (mocked) + commit**

```ts
// apps/api/test/routes/arcs.test.ts — symmetric to sagas.test.ts; assert plan returns arcsUpserted
```

```bash
pnpm --filter @novel/api test arcs
git add apps/api/src/routes/arcs.ts apps/api/src/server.ts apps/api/test/routes/arcs.test.ts
git commit -m "feat(api): arcs routes (list, detail, plan)"
```

---

### Task 8: Arc detail UI

**Files:**
- Create: `apps/web/lib/api/arcs.ts`
- Create: `apps/web/app/stories/[id]/arcs/[arcId]/page.tsx`

- [ ] **Step 8.1: Client + page**

```ts
// apps/web/lib/api/arcs.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

export interface Arc {
  id: string; sagaId: string; index: number; title: string; premise: string;
  startChapter: number; endChapter: number;
  expectedChanges: string[]; seedsToResolveInArc: string[];
  summaryVersion: number; rollingSummary: string | null;
}

export async function listArcs(storyId: string, sagaId: string): Promise<Arc[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas/${sagaId}/arcs`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listArcs ${r.status}`);
  return (await r.json()).arcs;
}

export async function getArc(storyId: string, arcId: string): Promise<Arc> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/arcs/${arcId}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`getArc ${r.status}`);
  return (await r.json()).arc;
}

export async function planArcs(storyId: string, sagaId: string, currentState: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas/${sagaId}/arcs/plan`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currentState }),
  });
  if (!r.ok) throw new Error(`planArcs ${r.status}`);
  return r.json();
}
```

```tsx
// apps/web/app/stories/[id]/arcs/[arcId]/page.tsx
import { getArc } from '@/lib/api/arcs';

export default async function ArcDetail({ params }: { params: Promise<{ id: string; arcId: string }> }) {
  const { id, arcId } = await params;
  const arc = await getArc(id, arcId);
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">{arc.title}</h1>
      <p className="text-sm text-gray-500 mb-4">Chapters {arc.startChapter}–{arc.endChapter} · summary v{arc.summaryVersion}</p>
      <h2 className="font-medium mt-4">Premise</h2>
      <p className="text-sm">{arc.premise}</p>
      <h2 className="font-medium mt-4">Expected changes</h2>
      <ul className="list-disc pl-6 text-sm">{arc.expectedChanges.map((c, i) => <li key={i}>{c}</li>)}</ul>
      <h2 className="font-medium mt-4">Seeds to resolve in arc</h2>
      <ul className="list-disc pl-6 text-sm">{arc.seedsToResolveInArc.map((k) => <li key={k}><code>{k}</code></li>)}</ul>
      <h2 className="font-medium mt-4">Rolling summary</h2>
      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">{arc.rollingSummary ?? '(not generated)'}</pre>
    </div>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
git add apps/web/lib/api/arcs.ts apps/web/app/stories/[id]/arcs/
git commit -m "feat(web): arc detail page"
```

---

### Task 9: Planted seeds CRUD API

**Files:**
- Create: `apps/api/src/routes/seeds.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/test/routes/seeds.test.ts`

- [ ] **Step 9.1: Route (full CRUD)**

```ts
// apps/api/src/routes/seeds.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, plantedSeeds } from '@novel/db';
import { eq, and, asc } from 'drizzle-orm';

const StoryParam = z.object({ storyId: z.string().uuid() });
const SeedParam = z.object({ storyId: z.string().uuid(), seedId: z.string().uuid() });
const SeedBody = z.object({
  seedKey: z.string().min(3).max(120),
  description: z.string().min(20).max(600),
  plantWindowStart: z.number().int().positive(),
  plantWindowEnd: z.number().int().positive(),
  payoffChapter: z.number().int().positive(),
  importance: z.enum(['minor', 'major', 'climax']),
  status: z.enum(['pending', 'planted', 'paid_off', 'abandoned']).optional(),
});

export const seedsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/stories/:storyId/seeds', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(plantedSeeds)
      .where(eq(plantedSeeds.storyId, storyId))
      .orderBy(asc(plantedSeeds.payoffChapter));
    return reply.send({ seeds: rows });
  });

  fastify.post('/api/stories/:storyId/seeds', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const body = SeedBody.parse(req.body);
    const [row] = await db.insert(plantedSeeds).values({ storyId, ...body, status: body.status ?? 'pending' }).returning();
    return reply.code(201).send({ seed: row });
  });

  fastify.patch('/api/stories/:storyId/seeds/:seedId', async (req, reply) => {
    const { storyId, seedId } = SeedParam.parse(req.params);
    const body = SeedBody.partial().parse(req.body);
    const [row] = await db.update(plantedSeeds).set(body)
      .where(and(eq(plantedSeeds.storyId, storyId), eq(plantedSeeds.id, seedId)))
      .returning();
    if (!row) return reply.code(404).send({ error: 'seed_not_found' });
    return reply.send({ seed: row });
  });

  fastify.delete('/api/stories/:storyId/seeds/:seedId', async (req, reply) => {
    const { storyId, seedId } = SeedParam.parse(req.params);
    const result = await db.delete(plantedSeeds)
      .where(and(eq(plantedSeeds.storyId, storyId), eq(plantedSeeds.id, seedId)))
      .returning({ id: plantedSeeds.id });
    if (result.length === 0) return reply.code(404).send({ error: 'seed_not_found' });
    return reply.send({ deleted: seedId });
  });
};
```

- [ ] **Step 9.2: Test minimal CRUD (mocked db) + commit**

```bash
pnpm --filter @novel/api test seeds
git add apps/api/src/routes/seeds.ts apps/api/src/server.ts apps/api/test/routes/seeds.test.ts
git commit -m "feat(api): planted seeds CRUD route"
```

---

### Task 10: Planted seeds dashboard UI

**Files:**
- Create: `apps/web/lib/api/seeds.ts`
- Create: `apps/web/app/stories/[id]/seeds/page.tsx`
- Create: `apps/web/app/stories/[id]/seeds/SeedRow.tsx`

- [ ] **Step 10.1: Client**

```ts
// apps/web/lib/api/seeds.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

export interface PlantedSeed {
  id: string; seedKey: string; description: string;
  plantWindowStart: number; plantWindowEnd: number;
  payoffChapter: number;
  importance: 'minor' | 'major' | 'climax';
  status: 'pending' | 'planted' | 'paid_off' | 'abandoned';
  plantedAtChapter: number | null;
  paidOffAtChapter: number | null;
}

export async function listSeeds(storyId: string): Promise<PlantedSeed[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/seeds`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listSeeds ${r.status}`);
  return (await r.json()).seeds;
}

export async function patchSeed(storyId: string, seedId: string, body: Partial<PlantedSeed>) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/seeds/${seedId}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patchSeed ${r.status}`);
  return (await r.json()).seed;
}

export async function deleteSeed(storyId: string, seedId: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/seeds/${seedId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`deleteSeed ${r.status}`);
  return r.json();
}
```

- [ ] **Step 10.2: Page (groups by status, color by importance)**

```tsx
// apps/web/app/stories/[id]/seeds/page.tsx
import { listSeeds } from '@/lib/api/seeds';
import { SeedRow } from './SeedRow';

export default async function SeedsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seeds = await listSeeds(id);
  const groups = {
    pending: seeds.filter((s) => s.status === 'pending'),
    planted: seeds.filter((s) => s.status === 'planted'),
    paid_off: seeds.filter((s) => s.status === 'paid_off'),
    abandoned: seeds.filter((s) => s.status === 'abandoned'),
  };
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Planted seeds ({seeds.length})</h1>
      {(['pending', 'planted', 'paid_off', 'abandoned'] as const).map((g) => (
        <section key={g} className="mb-6">
          <h2 className="font-medium mb-2 capitalize">{g.replace('_', ' ')} ({groups[g].length})</h2>
          <ul className="space-y-2">
            {groups[g].map((s) => <SeedRow key={s.id} storyId={id} seed={s} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 10.3: Row (client, inline edit + delete)**

```tsx
// apps/web/app/stories/[id]/seeds/SeedRow.tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { patchSeed, deleteSeed, type PlantedSeed } from '@/lib/api/seeds';

const COLOR = { minor: 'gray', major: 'amber', climax: 'red' };

export function SeedRow({ storyId, seed }: { storyId: string; seed: PlantedSeed }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(seed);
  const router = useRouter();
  return (
    <li className={`border-l-4 border-${COLOR[seed.importance]}-400 bg-white rounded p-3 text-sm`}>
      <div className="flex justify-between">
        <code className="font-semibold">{seed.seedKey}</code>
        <span className="text-xs text-gray-500">payoff ch {seed.payoffChapter} · {seed.importance}</span>
      </div>
      {!editing && <p className="mt-1 text-gray-700">{seed.description}</p>}
      {editing && (
        <textarea className="mt-1 w-full border rounded p-1 text-sm"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      )}
      <div className="mt-2 flex gap-2">
        {editing ? (
          <>
            <button disabled={pending} className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
              onClick={() => start(async () => { await patchSeed(storyId, seed.id, { description: draft.description }); setEditing(false); router.refresh(); })}>
              Save
            </button>
            <button className="text-xs px-2 py-1 bg-gray-200 rounded" onClick={() => { setDraft(seed); setEditing(false); }}>Cancel</button>
          </>
        ) : (
          <>
            <button className="text-xs px-2 py-1 bg-gray-100 rounded" onClick={() => setEditing(true)}>Edit</button>
            <button disabled={pending} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded"
              onClick={() => start(async () => {
                if (!confirm(`Delete seed ${seed.seedKey}?`)) return;
                await deleteSeed(storyId, seed.id); router.refresh();
              })}>Delete</button>
          </>
        )}
      </div>
    </li>
  );
}
```

- [ ] **Step 10.4: Commit**

```bash
git add apps/web/lib/api/seeds.ts apps/web/app/stories/[id]/seeds/
git commit -m "feat(web): planted seeds dashboard"
```

---

### Task 11: refresh-arc-summary job (real implementation)

**Files:**
- Modify: `apps/worker/src/jobs/refresh-arc-summary.ts` (replace Plan 2 stub)
- Create: `packages/ai/src/agents/arc-summary-compactor.ts`
- Create: `packages/ai/src/prompts/arc-summary-compactor.v1.ts`
- Test: `apps/worker/test/jobs/refresh-arc-summary.test.ts`
- Test: `packages/ai/test/agents/arc-summary-compactor.test.ts`

The job aggregates the most recent N per-chapter `detailedSummary` rows within an arc and asks the compactor to produce a 1500-token rolling summary. Bumps `arcs.summary_version` so following chapters miss WARM cache (single intentional miss).

- [ ] **Step 11.1: Compactor prompt + agent**

```ts
// packages/ai/src/prompts/arc-summary-compactor.v1.ts
export const ARC_SUMMARY_COMPACTOR_PROMPT_V1 = {
  version: 'arc_summary_compactor.v1',
  system: `Bạn là biên tập tóm lược arc cho tiểu thuyết tiên hiệp/huyền huyễn dài. Nhận tóm tắt từng chương, viết LẠI một bản tóm tắt arc dài tối đa 1200 từ tiếng Việt, giữ:
- mọi sự kiện có liên quan đến seeds/locked facts
- mọi đột phá realm / chuyển biến quan hệ chính
- diễn biến chính đã xảy ra (không tiên đoán tương lai)
Bỏ mô tả cảnh, chi tiết miêu tả nhỏ, dialog không quan trọng. Trả về plain text duy nhất, không markdown.`,
  user: ({ arcTitle, perChapterSummaries }: { arcTitle: string; perChapterSummaries: { chapterNumber: number; detailedSummary: string }[] }) =>
    `Arc: ${arcTitle}\n\n${perChapterSummaries.map((c) => `Ch ${c.chapterNumber}: ${c.detailedSummary}`).join('\n\n')}`,
};
```

```ts
// packages/ai/src/agents/arc-summary-compactor.ts
import type { LLMProvider } from '../providers/types';
import { MODEL_CONFIG } from '@novel/core/config/models';
import { ARC_SUMMARY_COMPACTOR_PROMPT_V1 } from '../prompts/arc-summary-compactor.v1';

export interface ArcSummaryCompactorInput {
  storyId: string;
  arcTitle: string;
  perChapterSummaries: { chapterNumber: number; detailedSummary: string }[];
}

export class ArcSummaryCompactorAgent {
  constructor(private provider: LLMProvider) {}

  async compact(input: ArcSummaryCompactorInput): Promise<{ summary: string; promptVersion: string; usage: { tokens: number; costUsd: number } }> {
    const prompt = ARC_SUMMARY_COMPACTOR_PROMPT_V1;
    const r = await this.provider.complete({
      model: MODEL_CONFIG.routes.summary_compactor,
      system: prompt.system,
      user: prompt.user({ arcTitle: input.arcTitle, perChapterSummaries: input.perChapterSummaries }),
      temperature: 0.4,
      maxOutputTokens: 1500,
      logTag: { storyId: input.storyId, promptVersion: prompt.version },
    });
    return { summary: r.text.trim(), promptVersion: prompt.version, usage: { tokens: r.usage.totalTokens, costUsd: r.usage.costUsd } };
  }
}
```

- [ ] **Step 11.2: Real job implementation**

```ts
// apps/worker/src/jobs/refresh-arc-summary.ts (REPLACES Plan 2 stub)
import type { Job } from 'bullmq';
import { db, arcs, chapters } from '@novel/db';
import { and, eq, desc, gte, lte, sql } from 'drizzle-orm';
import { logger } from '@novel/core/logger';
import { ArcSummaryCompactorAgent } from '@novel/ai/agents/arc-summary-compactor';
import { buildLLMProvider } from '../deps';

export interface RefreshArcSummaryJobData { storyId: string; arcId: string; }

export async function refreshArcSummary(job: Job<RefreshArcSummaryJobData>) {
  const { storyId, arcId } = job.data;
  const log = logger.child({ jobId: job.id, storyId, arcId });
  const [arc] = await db.select().from(arcs).where(eq(arcs.id, arcId)).limit(1);
  if (!arc) { log.warn('arc not found; noop'); return { status: 'noop' as const }; }
  const summaries = await db
    .select({ chapterNumber: chapters.number, detailedSummary: chapters.detailedSummary })
    .from(chapters)
    .where(and(
      eq(chapters.storyId, storyId),
      gte(chapters.number, arc.startChapter),
      lte(chapters.number, arc.endChapter),
      eq(chapters.status, 'completed'),
    ))
    .orderBy(desc(chapters.number))
    .limit(50);
  if (summaries.length === 0) { log.info('no completed chapters in arc; noop'); return { status: 'noop' as const }; }
  const agent = new ArcSummaryCompactorAgent(buildLLMProvider());
  const out = await agent.compact({
    storyId,
    arcTitle: arc.title,
    perChapterSummaries: summaries.reverse().map((s) => ({ chapterNumber: s.chapterNumber, detailedSummary: s.detailedSummary ?? '' })),
  });
  await db.update(arcs).set({
    rollingSummary: out.summary,
    summaryVersion: sql`${arcs.summaryVersion} + 1`,
    summaryUpdatedAt: new Date(),
  }).where(eq(arcs.id, arcId));
  log.info({ tokens: out.usage.tokens, cost: out.usage.costUsd }, 'arc summary refreshed');
  return { status: 'refreshed' as const, costUsd: out.usage.costUsd };
}
```

- [ ] **Step 11.3: Tests**

```ts
// packages/ai/test/agents/arc-summary-compactor.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ArcSummaryCompactorAgent } from '../../src/agents/arc-summary-compactor';

describe('ArcSummaryCompactorAgent.compact', () => {
  it('returns trimmed text and usage', async () => {
    const provider = { complete: vi.fn().mockResolvedValue({ text: '  arc summary text  ', usage: { totalTokens: 1500, costUsd: 0.0006 } }) } as any;
    const agent = new ArcSummaryCompactorAgent(provider);
    const r = await agent.compact({ storyId: 's', arcTitle: 'A', perChapterSummaries: [{ chapterNumber: 1, detailedSummary: 'sum' }] });
    expect(r.summary).toBe('arc summary text');
    expect(r.usage.costUsd).toBeCloseTo(0.0006);
  });
});
```

- [ ] **Step 11.4: Commit**

```bash
pnpm --filter @novel/ai test arc-summary-compactor
pnpm --filter @novel/worker test refresh-arc-summary
git add apps/worker/src/jobs/refresh-arc-summary.ts packages/ai/src/agents/arc-summary-compactor.ts packages/ai/src/prompts/arc-summary-compactor.v1.ts packages/ai/test/agents/arc-summary-compactor.test.ts apps/worker/test/jobs/refresh-arc-summary.test.ts
git commit -m "feat(worker): real refresh-arc-summary job + arc summary compactor"
```

---

### Task 12: refresh-saga-summary job

**Files:**
- Create: `apps/worker/src/jobs/refresh-saga-summary.ts`
- Modify: `apps/worker/src/index.ts`, `apps/worker/src/queues.ts`
- Modify: `apps/worker/src/jobs/generate-chapter.ts` (orchestrator hook)
- Test: `apps/worker/test/jobs/refresh-saga-summary.test.ts`

- [ ] **Step 12.1: Add queue factory**

```ts
// apps/worker/src/queues.ts (append)
export const REFRESH_SAGA_SUMMARY_QUEUE = 'refresh-saga-summary';
let sagaQueue: Queue | null = null;
export function getRefreshSagaSummaryQueue(): Queue {
  if (!sagaQueue) sagaQueue = new Queue(REFRESH_SAGA_SUMMARY_QUEUE, { connection: createConnection() });
  return sagaQueue;
}
```

- [ ] **Step 12.2: Job implementation**

```ts
// apps/worker/src/jobs/refresh-saga-summary.ts
import type { Job } from 'bullmq';
import { db, sagas, arcs } from '@novel/db';
import { and, eq, asc, sql } from 'drizzle-orm';
import { logger } from '@novel/core/logger';
import { ArcSummaryCompactorAgent } from '@novel/ai/agents/arc-summary-compactor';
import { buildLLMProvider } from '../deps';

export interface RefreshSagaSummaryJobData { storyId: string; sagaId: string; }

export async function refreshSagaSummary(job: Job<RefreshSagaSummaryJobData>) {
  const { storyId, sagaId } = job.data;
  const log = logger.child({ jobId: job.id, storyId, sagaId });
  const [saga] = await db.select().from(sagas).where(eq(sagas.id, sagaId)).limit(1);
  if (!saga) return { status: 'noop' as const };
  const arcRows = await db.select({ id: arcs.id, title: arcs.title, rollingSummary: arcs.rollingSummary })
    .from(arcs)
    .where(and(eq(arcs.storyId, storyId), eq(arcs.sagaId, sagaId)))
    .orderBy(asc(arcs.index));
  const filled = arcRows.filter((a) => a.rollingSummary);
  if (filled.length === 0) { log.info('no arc summaries to roll up; noop'); return { status: 'noop' as const }; }
  const agent = new ArcSummaryCompactorAgent(buildLLMProvider());
  const out = await agent.compact({
    storyId, arcTitle: `[SAGA] ${saga.title}`,
    perChapterSummaries: filled.map((a, i) => ({ chapterNumber: i + 1, detailedSummary: a.rollingSummary! })),
  });
  await db.update(sagas).set({
    rollingSummary: out.summary,
    summaryVersion: sql`${sagas.summaryVersion} + 1`,
    summaryUpdatedAt: new Date(),
  }).where(eq(sagas.id, sagaId));
  log.info({ cost: out.usage.costUsd }, 'saga summary refreshed');
  return { status: 'refreshed' as const, costUsd: out.usage.costUsd };
}
```

- [ ] **Step 12.3: Wire orchestrator + worker**

In `apps/worker/src/jobs/generate-chapter.ts`, expand `maybeEnqueueArcSummaryRefresh`:

```ts
async function maybeEnqueueArcSummaryRefresh(storyId: string, chapterNumber: number) {
  const [arc] = await db.select().from(arcs)
    .where(and(eq(arcs.storyId, storyId), lte(arcs.startChapter, chapterNumber), gte(arcs.endChapter, chapterNumber)))
    .limit(1);
  if (!arc) return;
  if (chapterNumber % LONG_FORM_CONFIG.ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS === 0) {
    await getRefreshArcSummaryQueue().add('refresh-arc-summary', { storyId, arcId: arc.id });
  }
  if (chapterNumber % LONG_FORM_CONFIG.SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS === 0) {
    await getRefreshSagaSummaryQueue().add('refresh-saga-summary', { storyId, sagaId: arc.sagaId });
  }
}
```

In `apps/worker/src/index.ts`:

```ts
new Worker(REFRESH_SAGA_SUMMARY_QUEUE, (job) => refreshSagaSummary(job as any), { connection: createConnection(), concurrency: 1 });
```

- [ ] **Step 12.4: Test + commit**

```bash
pnpm --filter @novel/worker test refresh-saga-summary
git add apps/worker/src/jobs/refresh-saga-summary.ts apps/worker/src/queues.ts apps/worker/src/index.ts apps/worker/src/jobs/generate-chapter.ts apps/worker/test/jobs/refresh-saga-summary.test.ts
git commit -m "feat(worker): refresh-saga-summary job + orchestrator hook"
```

---

### Task 13: Mode escalation logic

**Files:**
- Create: `packages/core/src/policy/mode-escalation.ts`
- Modify: `apps/worker/src/jobs/generate-chapter.ts` (call resolveEffectiveMode at entry; persist effectiveMode)
- Modify: `packages/db/src/schema/chapter-generation-attempts.ts` (add `effective_mode` column if not present)
- Test: `packages/core/test/policy/mode-escalation.test.ts`

- [ ] **Step 13.1: Implement policy**

```ts
// packages/core/src/policy/mode-escalation.ts
import { db, arcs, pendingCanonUpdates } from '@novel/db';
import { eq, and, lte, gte } from 'drizzle-orm';
import { LONG_FORM_CONFIG } from '../config/long-form';

export type Mode = 'safe' | 'semi_auto' | 'full_auto';

export interface ModeContext {
  storyId: string;
  chapterNumber: number;
  userMode: Mode;
}

export async function resolveEffectiveMode(ctx: ModeContext): Promise<{ mode: Mode; reasons: string[] }> {
  const reasons: string[] = [];
  if (ctx.userMode === 'safe' || !LONG_FORM_CONFIG.AUTO_ESCALATE_TO_SAFE_MODE) {
    return { mode: ctx.userMode, reasons: [] };
  }
  if (ctx.chapterNumber === 1) reasons.push('first_chapter');

  const [arcRow] = await db.select({ startChapter: arcs.startChapter, endChapter: arcs.endChapter })
    .from(arcs)
    .where(and(
      eq(arcs.storyId, ctx.storyId),
      lte(arcs.startChapter, ctx.chapterNumber),
      gte(arcs.endChapter, ctx.chapterNumber),
    ))
    .limit(1);
  if (arcRow?.startChapter === ctx.chapterNumber) reasons.push('arc_start');
  if (arcRow?.endChapter === ctx.chapterNumber) reasons.push('arc_end');

  const blocking = await db.select({ id: pendingCanonUpdates.id })
    .from(pendingCanonUpdates)
    .where(and(
      eq(pendingCanonUpdates.storyId, ctx.storyId),
      eq(pendingCanonUpdates.severity, 'blocking'),
      eq(pendingCanonUpdates.status, 'pending'),
    ))
    .limit(1);
  if (blocking.length > 0) reasons.push('blocking_pending');

  return reasons.length > 0 ? { mode: 'safe', reasons } : { mode: ctx.userMode, reasons: [] };
}
```

- [ ] **Step 13.2: Wire into orchestrator**

```ts
// apps/worker/src/jobs/generate-chapter.ts (modify)
import { resolveEffectiveMode } from '@novel/core/policy/mode-escalation';
// inside generateChapter, before inserting attempt row:
const escalation = await resolveEffectiveMode({ storyId, chapterNumber, userMode: mode });
const effectiveMode = escalation.mode;
log.info({ effectiveMode, reasons: escalation.reasons }, 'mode resolved');
// include effectiveMode in attempt row insert
// pass effectiveMode (NOT raw mode) into canonMerger.submit({ mode: effectiveMode, ... })
```

- [ ] **Step 13.3: Test policy**

```ts
// packages/core/test/policy/mode-escalation.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@novel/db', () => {
  return {
    db: {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ startChapter: 1, endChapter: 20 }] }) }) }),
    },
    arcs: 'arcs', pendingCanonUpdates: 'pendingCanonUpdates',
  };
});

import { resolveEffectiveMode } from '../../src/policy/mode-escalation';

describe('resolveEffectiveMode', () => {
  it('keeps safe mode untouched', async () => {
    const r = await resolveEffectiveMode({ storyId: 's', chapterNumber: 5, userMode: 'safe' });
    expect(r.mode).toBe('safe');
    expect(r.reasons).toHaveLength(0);
  });

  it('escalates first chapter', async () => {
    const r = await resolveEffectiveMode({ storyId: 's', chapterNumber: 1, userMode: 'semi_auto' });
    expect(r.mode).toBe('safe');
    expect(r.reasons).toContain('first_chapter');
    expect(r.reasons).toContain('arc_start');
  });
});
```

- [ ] **Step 13.4: Commit**

```bash
pnpm --filter @novel/core test mode-escalation
pnpm --filter @novel/db generate
pnpm --filter @novel/db migrate
git add packages/core/src/policy/mode-escalation.ts packages/db/src/schema/chapter-generation-attempts.ts apps/worker/src/jobs/generate-chapter.ts packages/core/test/policy/mode-escalation.test.ts
git commit -m "feat(core): mode escalation policy + orchestrator wiring"
```

---

### Task 14: Cost guardrails service

**Files:**
- Create: `packages/core/src/policy/budget-guardrails.ts`
- Create: `apps/api/src/services/budget-guard.ts`
- Modify: `apps/api/src/services/queue-client.ts` (pre-flight check on enqueue)
- Test: `packages/core/test/policy/budget-guardrails.test.ts`

- [ ] **Step 14.1: Constants + helper**

```ts
// packages/core/src/policy/budget-guardrails.ts
export const BUDGET_GUARDRAILS = {
  PER_CHAPTER_HARD_CAP_USD: 0.05,
  PER_STORY_DAILY_CAP_USD: 5.0,
  PER_STORY_MONTHLY_CAP_USD: 50.0,
  ALERT_THRESHOLD_PERCENT: 80,
};

export function checkAgainstCaps(usage: { dailyUsd: number; monthlyUsd: number }): { state: 'ok' | 'alert' | 'breach'; capHit?: 'daily' | 'monthly'; pct: number } {
  const dailyPct = usage.dailyUsd / BUDGET_GUARDRAILS.PER_STORY_DAILY_CAP_USD;
  const monthlyPct = usage.monthlyUsd / BUDGET_GUARDRAILS.PER_STORY_MONTHLY_CAP_USD;
  if (dailyPct >= 1) return { state: 'breach', capHit: 'daily', pct: dailyPct };
  if (monthlyPct >= 1) return { state: 'breach', capHit: 'monthly', pct: monthlyPct };
  if (dailyPct * 100 >= BUDGET_GUARDRAILS.ALERT_THRESHOLD_PERCENT) return { state: 'alert', capHit: 'daily', pct: dailyPct };
  if (monthlyPct * 100 >= BUDGET_GUARDRAILS.ALERT_THRESHOLD_PERCENT) return { state: 'alert', capHit: 'monthly', pct: monthlyPct };
  return { state: 'ok', pct: Math.max(dailyPct, monthlyPct) };
}
```

- [ ] **Step 14.2: BudgetGuard service**

```ts
// apps/api/src/services/budget-guard.ts
import { db, llmCalls } from '@novel/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import { checkAgainstCaps, BUDGET_GUARDRAILS } from '@novel/core/policy/budget-guardrails';

export class BudgetGuard {
  async getStoryUsage(storyId: string): Promise<{ dailyUsd: number; monthlyUsd: number }> {
    const dayAgo = new Date(Date.now() - 24 * 3600_000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600_000);
    const [daily] = await db.select({ sum: sql<string>`COALESCE(SUM(${llmCalls.costUsd}), 0)` })
      .from(llmCalls).where(and(eq(llmCalls.storyId, storyId), gte(llmCalls.createdAt, dayAgo)));
    const [monthly] = await db.select({ sum: sql<string>`COALESCE(SUM(${llmCalls.costUsd}), 0)` })
      .from(llmCalls).where(and(eq(llmCalls.storyId, storyId), gte(llmCalls.createdAt, monthAgo)));
    return { dailyUsd: Number(daily.sum), monthlyUsd: Number(monthly.sum) };
  }

  async preflightOrThrow(storyId: string): Promise<void> {
    const usage = await this.getStoryUsage(storyId);
    const result = checkAgainstCaps(usage);
    if (result.state === 'breach') {
      const err = new Error(`budget_breach:${result.capHit}:${(result.pct * 100).toFixed(1)}%`);
      (err as any).code = 'BUDGET_BREACH';
      throw err;
    }
  }
}

export { BUDGET_GUARDRAILS };
```

- [ ] **Step 14.3: Pre-flight in queue-client**

```ts
// apps/api/src/services/queue-client.ts (modify enqueueGenerateChapter)
import { BudgetGuard } from './budget-guard';
const guard = new BudgetGuard();
export async function enqueueGenerateChapter(data: GenerateChapterJobData): Promise<{ jobId: string }> {
  await guard.preflightOrThrow(data.storyId);
  // ...rest unchanged
}
```

- [ ] **Step 14.4: Tests**

```ts
// packages/core/test/policy/budget-guardrails.test.ts
import { describe, it, expect } from 'vitest';
import { checkAgainstCaps } from '../../src/policy/budget-guardrails';

describe('checkAgainstCaps', () => {
  it('returns ok well below thresholds', () => {
    expect(checkAgainstCaps({ dailyUsd: 1, monthlyUsd: 5 }).state).toBe('ok');
  });
  it('alerts at 80% daily', () => {
    expect(checkAgainstCaps({ dailyUsd: 4.0, monthlyUsd: 5 }).state).toBe('alert');
  });
  it('breaches above daily cap', () => {
    expect(checkAgainstCaps({ dailyUsd: 5.5, monthlyUsd: 5 }).state).toBe('breach');
  });
});
```

- [ ] **Step 14.5: Commit**

```bash
pnpm --filter @novel/core test budget-guardrails
git add packages/core/src/policy/budget-guardrails.ts apps/api/src/services/budget-guard.ts apps/api/src/services/queue-client.ts packages/core/test/policy/budget-guardrails.test.ts
git commit -m "feat(api): budget guardrail constants + pre-flight enforcement"
```

---

### Task 15: Cost rollup API route

**Files:**
- Create: `apps/api/src/routes/costs.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/test/routes/costs.test.ts`

- [ ] **Step 15.1: Route**

```ts
// apps/api/src/routes/costs.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, llmCalls } from '@novel/db';
import { eq, sql, and, gte } from 'drizzle-orm';
import { BudgetGuard, BUDGET_GUARDRAILS } from '../services/budget-guard';

const StoryParam = z.object({ storyId: z.string().uuid() });

export const costsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/stories/:storyId/costs/summary', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const usage = await new BudgetGuard().getStoryUsage(storyId);
    return reply.send({ usage, caps: BUDGET_GUARDRAILS });
  });

  fastify.get('/api/stories/:storyId/costs/by-agent', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600_000);
    const rows = await db
      .select({
        agent: llmCalls.agent,
        callCount: sql<number>`COUNT(*)::int`,
        tokens: sql<number>`COALESCE(SUM(${llmCalls.totalTokens}), 0)::int`,
        cost: sql<string>`COALESCE(SUM(${llmCalls.costUsd}), 0)`,
      })
      .from(llmCalls)
      .where(and(eq(llmCalls.storyId, storyId), gte(llmCalls.createdAt, monthAgo)))
      .groupBy(llmCalls.agent);
    return reply.send({ rows });
  });

  fastify.get('/api/stories/:storyId/costs/by-chapter', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db
      .select({
        chapterNumber: llmCalls.chapterNumber,
        cost: sql<string>`COALESCE(SUM(${llmCalls.costUsd}), 0)`,
        tokens: sql<number>`COALESCE(SUM(${llmCalls.totalTokens}), 0)::int`,
      })
      .from(llmCalls)
      .where(eq(llmCalls.storyId, storyId))
      .groupBy(llmCalls.chapterNumber)
      .orderBy(llmCalls.chapterNumber);
    return reply.send({ rows });
  });
};
```

- [ ] **Step 15.2: Test + commit**

```bash
pnpm --filter @novel/api test costs
git add apps/api/src/routes/costs.ts apps/api/src/server.ts apps/api/test/routes/costs.test.ts
git commit -m "feat(api): cost rollup endpoints (summary, by-agent, by-chapter)"
```

---

### Task 16: High-Stakes Reviewer schema + prompt

**Files:**
- Create: `packages/ai/src/schemas/high-stakes-review.ts`
- Create: `packages/ai/src/prompts/high-stakes-reviewer.v1.ts`
- Test: `packages/ai/test/schemas/high-stakes-review.test.ts`

The High-Stakes Reviewer uses the Pro model. Triggered at end-of-arc, on critical-severity LLM validator output, and on manual user request. ~$0.02 per call.

- [ ] **Step 16.1: Schema**

```ts
// packages/ai/src/schemas/high-stakes-review.ts
import { z } from 'zod';

export const HighStakesReviewSchema = z.object({
  approve: z.boolean(),
  concerns: z.array(z.object({
    category: z.enum(['plot', 'voice', 'pacing', 'consistency', 'cultivation_logic', 'theme']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string().min(10).max(800),
    quote: z.string().max(400).optional(),
  })).max(20),
  recommendedActions: z.array(z.object({
    action: z.enum(['rewrite_chapter', 'patch_with_auto_fixer', 'edit_canon', 'plant_followup_seed', 'no_action']),
    rationale: z.string().min(10).max(400),
  })).max(8),
});

export type HighStakesReview = z.infer<typeof HighStakesReviewSchema>;

export const HIGH_STAKES_REVIEW_JSON_SCHEMA = {
  type: 'object',
  required: ['approve', 'concerns', 'recommendedActions'],
  properties: {
    approve: { type: 'boolean' },
    concerns: {
      type: 'array', maxItems: 20,
      items: {
        type: 'object', required: ['category', 'severity', 'description'],
        properties: {
          category: { type: 'string', enum: ['plot', 'voice', 'pacing', 'consistency', 'cultivation_logic', 'theme'] },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          description: { type: 'string' },
          quote: { type: 'string' },
        },
      },
    },
    recommendedActions: {
      type: 'array', maxItems: 8,
      items: {
        type: 'object', required: ['action', 'rationale'],
        properties: {
          action: { type: 'string', enum: ['rewrite_chapter', 'patch_with_auto_fixer', 'edit_canon', 'plant_followup_seed', 'no_action'] },
          rationale: { type: 'string' },
        },
      },
    },
  },
} as const;
```

- [ ] **Step 16.2: Prompt v1**

```ts
// packages/ai/src/prompts/high-stakes-reviewer.v1.ts
export const HIGH_STAKES_REVIEWER_PROMPT_V1 = {
  version: 'high_stakes_reviewer.v1',
  system: `Bạn là biên tập trưởng (chief editor) cho tiểu thuyết tiên hiệp/huyền huyễn dài bằng tiếng Việt. Bạn KHÔNG viết lại — chỉ đánh giá.

Nhiệm vụ: Đọc TOÀN BỘ chương vừa hoàn thành cùng arc summary và bible. Đánh giá liệu chương này:
- Giữ vững giọng văn và quy tắc thế giới (bible)
- Tiến triển arc một cách hợp lý
- Không gây mâu thuẫn lớn với canon
- Có nhịp độ phù hợp (không cố nhồi nhét, cũng không lê thê)

Trả về JSON đúng schema. KHÔNG viết lại nội dung. Nếu approve=true, concerns vẫn có thể chứa các chú ý nhỏ. Nếu approve=false, ít nhất một concern phải severity high hoặc critical.

Mỗi recommendedAction PHẢI là một trong:
- rewrite_chapter: cần viết lại toàn bộ chương
- patch_with_auto_fixer: chỉ cần sửa chi tiết
- edit_canon: canon hiện tại không khớp ý đồ — chỉnh canon
- plant_followup_seed: gieo seed mới để giải quyết hệ quả ở chương sau
- no_action: không cần làm gì`,
  user: ({ chapter, arcSummary, bibleCompact }: { chapter: { title: string; content: string }; arcSummary: string; bibleCompact: string }) =>
    `BIBLE (compact):\n${bibleCompact}\n\nARC SUMMARY:\n${arcSummary}\n\nCHƯƠNG (${chapter.title}):\n${chapter.content}`,
};
```

- [ ] **Step 16.3: Test**

```ts
// packages/ai/test/schemas/high-stakes-review.test.ts
import { describe, it, expect } from 'vitest';
import { HighStakesReviewSchema } from '../../src/schemas/high-stakes-review';

describe('HighStakesReviewSchema', () => {
  it('accepts minimal approval', () => {
    const r = HighStakesReviewSchema.safeParse({ approve: true, concerns: [], recommendedActions: [] });
    expect(r.success).toBe(true);
  });
  it('rejects unknown action', () => {
    const r = HighStakesReviewSchema.safeParse({
      approve: false,
      concerns: [{ category: 'plot', severity: 'high', description: 'x'.repeat(20) }],
      recommendedActions: [{ action: 'something_invalid', rationale: 'x'.repeat(20) }],
    });
    expect(r.success).toBe(false);
  });
});
```

```bash
pnpm --filter @novel/ai test high-stakes-review
git add packages/ai/src/schemas/high-stakes-review.ts packages/ai/src/prompts/high-stakes-reviewer.v1.ts packages/ai/test/schemas/high-stakes-review.test.ts
git commit -m "feat(ai): high-stakes reviewer schema + prompt v1"
```

---

### Task 17: High-Stakes Reviewer agent + persist

**Files:**
- Create: `packages/ai/src/agents/high-stakes-reviewer.ts`
- Create: `apps/worker/src/jobs/high-stakes-review.ts` (async wrapper job for manual triggers)
- Modify: `apps/worker/src/queues.ts`, `apps/worker/src/index.ts`
- Test: `packages/ai/test/agents/high-stakes-reviewer.test.ts`

Reviews are stored in a `high_stakes_reviews` table (added in Plan 1's data model — see spec section 2.3). Each review row has `chapterId`, `triggerReason`, `approve`, `concerns`, `recommendedActions`, `costUsd`, `createdAt`.

- [ ] **Step 17.1: Agent**

```ts
// packages/ai/src/agents/high-stakes-reviewer.ts
import { db, highStakesReviews } from '@novel/db';
import { logger } from '@novel/core/logger';
import type { LLMProvider } from '../providers/types';
import { MODEL_CONFIG } from '@novel/core/config/models';
import { HighStakesReviewSchema, HIGH_STAKES_REVIEW_JSON_SCHEMA, type HighStakesReview } from '../schemas/high-stakes-review';
import { HIGH_STAKES_REVIEWER_PROMPT_V1 } from '../prompts/high-stakes-reviewer.v1';

export interface HighStakesReviewInput {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  triggerReason: 'arc_end' | 'critical_severity' | 'manual';
  chapter: { title: string; content: string };
  arcSummary: string;
  bibleCompact: string;
}

export interface HighStakesReviewResult {
  reviewId: string;
  output: HighStakesReview;
  promptVersion: string;
  usage: { tokens: number; costUsd: number };
}

export class HighStakesReviewerAgent {
  constructor(private provider: LLMProvider) {}

  async review(input: HighStakesReviewInput): Promise<HighStakesReviewResult> {
    const log = logger.child({ agent: 'high_stakes_reviewer', storyId: input.storyId, chapterId: input.chapterId });
    const prompt = HIGH_STAKES_REVIEWER_PROMPT_V1;
    const response = await this.provider.complete({
      model: MODEL_CONFIG.routes.high_stakes_reviewer,
      system: prompt.system,
      user: prompt.user({ chapter: input.chapter, arcSummary: input.arcSummary, bibleCompact: input.bibleCompact }),
      responseSchema: HIGH_STAKES_REVIEW_JSON_SCHEMA,
      temperature: 0.3,
      logTag: { storyId: input.storyId, chapterNumber: input.chapterNumber, promptVersion: prompt.version },
    });
    const parsed = HighStakesReviewSchema.parse(response.json);
    const [row] = await db.insert(highStakesReviews).values({
      storyId: input.storyId,
      chapterId: input.chapterId,
      triggerReason: input.triggerReason,
      approve: parsed.approve,
      concerns: parsed.concerns,
      recommendedActions: parsed.recommendedActions,
      tokens: response.usage.totalTokens,
      costUsd: response.usage.costUsd.toString(),
      promptVersion: prompt.version,
    }).returning({ id: highStakesReviews.id });
    log.info({ approve: parsed.approve, concerns: parsed.concerns.length }, 'review persisted');
    return {
      reviewId: row.id,
      output: parsed,
      promptVersion: prompt.version,
      usage: { tokens: response.usage.totalTokens, costUsd: response.usage.costUsd },
    };
  }
}
```

- [ ] **Step 17.2: Async wrapper job (manual trigger uses queue, automatic uses inline call)**

```ts
// apps/worker/src/jobs/high-stakes-review.ts
import type { Job } from 'bullmq';
import { db, chapters, arcs, storyBibles } from '@novel/db';
import { eq, and, lte, gte } from 'drizzle-orm';
import { logger } from '@novel/core/logger';
import { HighStakesReviewerAgent } from '@novel/ai/agents/high-stakes-reviewer';
import { buildLLMProvider } from '../deps';

export interface HighStakesReviewJobData {
  storyId: string;
  chapterId: string;
  triggerReason: 'arc_end' | 'critical_severity' | 'manual';
}

export async function runHighStakesReview(job: Job<HighStakesReviewJobData>) {
  const { storyId, chapterId, triggerReason } = job.data;
  const log = logger.child({ jobId: job.id, storyId, chapterId });
  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) { log.warn('chapter not found'); return { status: 'noop' as const }; }
  const [arc] = await db.select().from(arcs)
    .where(and(eq(arcs.storyId, storyId), lte(arcs.startChapter, chapter.number), gte(arcs.endChapter, chapter.number)))
    .limit(1);
  const [bible] = await db.select().from(storyBibles).where(eq(storyBibles.storyId, storyId)).limit(1);

  const agent = new HighStakesReviewerAgent(buildLLMProvider());
  const result = await agent.review({
    storyId, chapterId, chapterNumber: chapter.number, triggerReason,
    chapter: { title: chapter.title, content: chapter.content },
    arcSummary: arc?.rollingSummary ?? '(no rolling summary yet)',
    bibleCompact: bible?.compactSummary ?? '(no bible)',
  });
  return { status: 'reviewed' as const, reviewId: result.reviewId, costUsd: result.usage.costUsd };
}
```

- [ ] **Step 17.3: Register queue + worker**

```ts
// apps/worker/src/queues.ts (append)
export const HIGH_STAKES_REVIEW_QUEUE = 'high-stakes-review';
let hsrQueue: Queue | null = null;
export function getHighStakesReviewQueue(): Queue {
  if (!hsrQueue) hsrQueue = new Queue(HIGH_STAKES_REVIEW_QUEUE, { connection: createConnection() });
  return hsrQueue;
}
```

```ts
// apps/worker/src/index.ts (append)
new Worker(HIGH_STAKES_REVIEW_QUEUE, (job) => runHighStakesReview(job as any), { connection: createConnection(), concurrency: 1 });
```

- [ ] **Step 17.4: Test (mocked provider + db.insert returning)**

```ts
// packages/ai/test/agents/high-stakes-reviewer.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@novel/db', () => ({
  db: {
    insert: () => ({ values: () => ({ returning: async () => [{ id: 'rev-1' }] }) }),
  },
  highStakesReviews: {} as any,
}));

import { HighStakesReviewerAgent } from '../../src/agents/high-stakes-reviewer';

describe('HighStakesReviewerAgent.review', () => {
  it('persists row + returns parsed output', async () => {
    const provider = { complete: vi.fn().mockResolvedValue({
      json: { approve: true, concerns: [], recommendedActions: [] },
      usage: { totalTokens: 5000, costUsd: 0.02 },
    }) } as any;
    const agent = new HighStakesReviewerAgent(provider);
    const r = await agent.review({
      storyId: 's', chapterId: 'c', chapterNumber: 1, triggerReason: 'manual',
      chapter: { title: 't', content: 'c' }, arcSummary: 'a', bibleCompact: 'b',
    });
    expect(r.reviewId).toBe('rev-1');
    expect(r.output.approve).toBe(true);
    expect(r.usage.costUsd).toBeCloseTo(0.02);
  });
});
```

- [ ] **Step 17.5: Commit**

```bash
pnpm --filter @novel/ai test high-stakes-reviewer
git add packages/ai/src/agents/high-stakes-reviewer.ts apps/worker/src/jobs/high-stakes-review.ts apps/worker/src/queues.ts apps/worker/src/index.ts packages/ai/test/agents/high-stakes-reviewer.test.ts
git commit -m "feat(ai+worker): high-stakes reviewer agent + async job wrapper"
```

---

### Task 18: HSR triggers + orchestrator hook + reviews route

**Files:**
- Create: `packages/core/src/policy/high-stakes-triggers.ts`
- Modify: `apps/worker/src/jobs/generate-chapter.ts` (auto-trigger after summarize)
- Create: `apps/api/src/routes/reviews.ts` (list + manual trigger)
- Modify: `apps/api/src/server.ts`
- Test: `packages/core/test/policy/high-stakes-triggers.test.ts`

- [ ] **Step 18.1: Triggers policy**

```ts
// packages/core/src/policy/high-stakes-triggers.ts
import { LONG_FORM_CONFIG } from '../config/long-form';

export interface TriggerContext {
  chapterNumber: number;
  arcEndChapter: number | null;
  worstValidatorSeverity: 'low' | 'medium' | 'high' | 'critical' | 'none';
}

export function shouldRunReviewer(ctx: TriggerContext): { run: boolean; reason?: 'arc_end' | 'critical_severity' } {
  if (ctx.worstValidatorSeverity === 'critical') return { run: true, reason: 'critical_severity' };
  if (LONG_FORM_CONFIG.HIGH_STAKES_REVIEW_AT_ARC_END && ctx.arcEndChapter === ctx.chapterNumber) {
    return { run: true, reason: 'arc_end' };
  }
  return { run: false };
}
```

- [ ] **Step 18.2: Orchestrator hook (after summary compactor, before final status write)**

```ts
// apps/worker/src/jobs/generate-chapter.ts (insert after summary compactor, before status finalize)
import { shouldRunReviewer } from '@novel/core/policy/high-stakes-triggers';

const worstSeverity = (allIssues.length === 0 ? 'none' :
  allIssues.find((i) => i.severity === 'critical') ? 'critical' :
  allIssues.find((i) => i.severity === 'high') ? 'high' :
  allIssues.find((i) => i.severity === 'medium') ? 'medium' : 'low') as any;
const trigger = shouldRunReviewer({
  chapterNumber,
  arcEndChapter: arc?.endChapter ?? null,
  worstValidatorSeverity: worstSeverity,
});
if (trigger.run) {
  log.info({ reason: trigger.reason }, 'enqueuing high-stakes review');
  await getHighStakesReviewQueue().add('high-stakes-review', {
    storyId, chapterId, triggerReason: trigger.reason!,
  });
}
```

- [ ] **Step 18.3: Reviews route**

```ts
// apps/api/src/routes/reviews.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, highStakesReviews } from '@novel/db';
import { eq, desc } from 'drizzle-orm';
import { getHighStakesReviewQueue } from '@novel/worker/queues';

const StoryParam = z.object({ storyId: z.string().uuid() });
const TriggerBody = z.object({ chapterId: z.string().uuid() });

export const reviewsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/stories/:storyId/reviews', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(highStakesReviews)
      .where(eq(highStakesReviews.storyId, storyId))
      .orderBy(desc(highStakesReviews.createdAt));
    return reply.send({ reviews: rows });
  });

  fastify.post('/api/stories/:storyId/reviews/trigger', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const { chapterId } = TriggerBody.parse(req.body);
    const job = await getHighStakesReviewQueue().add('high-stakes-review', {
      storyId, chapterId, triggerReason: 'manual',
    });
    return reply.code(202).send({ jobId: job.id });
  });
};
```

- [ ] **Step 18.4: Test triggers**

```ts
// packages/core/test/policy/high-stakes-triggers.test.ts
import { describe, it, expect } from 'vitest';
import { shouldRunReviewer } from '../../src/policy/high-stakes-triggers';

describe('shouldRunReviewer', () => {
  it('runs on critical severity regardless of position', () => {
    const r = shouldRunReviewer({ chapterNumber: 5, arcEndChapter: 20, worstValidatorSeverity: 'critical' });
    expect(r.run).toBe(true);
    expect(r.reason).toBe('critical_severity');
  });
  it('runs at arc end when feature enabled', () => {
    const r = shouldRunReviewer({ chapterNumber: 20, arcEndChapter: 20, worstValidatorSeverity: 'low' });
    expect(r.run).toBe(true);
    expect(r.reason).toBe('arc_end');
  });
  it('skips otherwise', () => {
    expect(shouldRunReviewer({ chapterNumber: 5, arcEndChapter: 20, worstValidatorSeverity: 'low' }).run).toBe(false);
  });
});
```

- [ ] **Step 18.5: Commit**

```bash
pnpm --filter @novel/core test high-stakes-triggers
pnpm --filter @novel/api test reviews
git add packages/core/src/policy/high-stakes-triggers.ts apps/worker/src/jobs/generate-chapter.ts apps/api/src/routes/reviews.ts apps/api/src/server.ts packages/core/test/policy/high-stakes-triggers.test.ts
git commit -m "feat(core+api): high-stakes reviewer triggers + orchestrator hook + reviews route"
```

---

### Task 19: Reviews page UI

**Files:**
- Create: `apps/web/lib/api/reviews.ts`
- Create: `apps/web/app/stories/[id]/reviews/page.tsx`

- [ ] **Step 19.1: Client + page**

```ts
// apps/web/lib/api/reviews.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

export interface HighStakesReview {
  id: string; chapterId: string;
  triggerReason: 'arc_end' | 'critical_severity' | 'manual';
  approve: boolean;
  concerns: { category: string; severity: string; description: string; quote?: string }[];
  recommendedActions: { action: string; rationale: string }[];
  costUsd: string;
  createdAt: string;
}

export async function listReviews(storyId: string): Promise<HighStakesReview[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/reviews`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listReviews ${r.status}`);
  return (await r.json()).reviews;
}

export async function triggerReview(storyId: string, chapterId: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/reviews/trigger`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chapterId }),
  });
  if (!r.ok) throw new Error(`triggerReview ${r.status}`);
  return r.json();
}
```

```tsx
// apps/web/app/stories/[id]/reviews/page.tsx
import { listReviews } from '@/lib/api/reviews';

export default async function ReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviews = await listReviews(id);
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold mb-4">High-stakes reviews</h1>
      {reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className={`border rounded p-4 ${r.approve ? 'border-green-300' : 'border-red-300'}`}>
            <div className="flex justify-between text-sm">
              <span>Trigger: <code>{r.triggerReason}</code> · {r.approve ? '✅ approved' : '❌ not approved'}</span>
              <span className="text-gray-500">${Number(r.costUsd).toFixed(4)} · {new Date(r.createdAt).toLocaleString()}</span>
            </div>
            {r.concerns.length > 0 && (
              <div className="mt-2">
                <h3 className="font-medium text-sm">Concerns</h3>
                <ul className="text-sm list-disc pl-6">
                  {r.concerns.map((c, i) => (
                    <li key={i}><span className="uppercase text-xs text-amber-700">[{c.severity}/{c.category}]</span> {c.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.recommendedActions.length > 0 && (
              <div className="mt-2">
                <h3 className="font-medium text-sm">Recommended actions</h3>
                <ul className="text-sm list-disc pl-6">
                  {r.recommendedActions.map((a, i) => <li key={i}><code>{a.action}</code>: {a.rationale}</li>)}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 19.2: Commit**

```bash
git add apps/web/lib/api/reviews.ts apps/web/app/stories/[id]/reviews/
git commit -m "feat(web): high-stakes reviews page"
```

---

### Task 20: generate-batch BullMQ job

**Files:**
- Create: `apps/worker/src/jobs/generate-batch.ts`
- Modify: `apps/worker/src/queues.ts`, `apps/worker/src/index.ts`
- Test: `apps/worker/test/jobs/generate-batch.test.ts`

The batch job iterates a chapter range and calls `generateChapter` (NOT enqueue — direct call so we get sequential completion + early-stop on failure). Concurrency 1 per story. Pauses on:
- Any chapter that finishes with `paused_pending_updates` status
- Budget breach
- User stop (sets `batches.status='cancelled'`)

- [ ] **Step 20.1: Add `batches` table migration**

(Add to Plan 1's data-model migrations if not present — tracked here as a Plan 3 follow-on migration.)

```ts
// packages/db/src/schema/batches.ts
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories';
export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  startChapter: integer('start_chapter').notNull(),
  endChapter: integer('end_chapter').notNull(),
  mode: text('mode', { enum: ['safe', 'semi_auto', 'full_auto'] }).notNull(),
  status: text('status', { enum: ['running', 'completed', 'paused', 'failed', 'cancelled'] }).notNull().default('running'),
  pausedReason: text('paused_reason'),
  completedChapters: integer('completed_chapters').notNull().default(0),
  totalCostUsd: text('total_cost_usd').notNull().default('0'),
  meta: jsonb('meta').notNull().default({}),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
});
```

- [ ] **Step 20.2: Job implementation**

```ts
// apps/worker/src/jobs/generate-batch.ts
import type { Job } from 'bullmq';
import { db, batches } from '@novel/db';
import { eq, sql } from 'drizzle-orm';
import { logger } from '@novel/core/logger';
import { generateChapter } from './generate-chapter';
import { buildAgentDeps } from '../deps';
import { BudgetGuard } from '@novel/api/services/budget-guard';

export interface GenerateBatchJobData {
  batchId: string;
  storyId: string;
  startChapter: number;
  endChapter: number;
  mode: 'safe' | 'semi_auto' | 'full_auto';
}

export async function generateBatch(job: Job<GenerateBatchJobData>) {
  const { batchId, storyId, startChapter, endChapter, mode } = job.data;
  const log = logger.child({ jobId: job.id, batchId, storyId });
  const guard = new BudgetGuard();
  const agentDeps = buildAgentDeps();

  for (let n = startChapter; n <= endChapter; n++) {
    // Re-check cancellation
    const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
    if (!batch || batch.status === 'cancelled') {
      log.info('batch cancelled by user; stopping');
      return { status: 'cancelled' as const, completed: n - startChapter };
    }

    // Pre-flight budget
    try { await guard.preflightOrThrow(storyId); }
    catch (err: any) {
      log.warn({ err: err.message }, 'budget breach; pausing batch');
      await db.update(batches).set({ status: 'paused', pausedReason: err.message }).where(eq(batches.id, batchId));
      return { status: 'paused' as const, completed: n - startChapter, reason: err.message };
    }

    log.info({ chapter: n }, 'batch: generating chapter');
    const fakeJob: any = {
      id: `${job.id}-ch-${n}`,
      data: { storyId, chapterNumber: n, mode },
      updateProgress: (p: unknown) => job.updateProgress({ chapter: n, ...((p as object) ?? {}) }),
    };
    let result;
    try { result = await generateChapter(fakeJob, agentDeps); }
    catch (err: any) {
      log.error({ err: err.message }, 'chapter failed; pausing batch');
      await db.update(batches).set({ status: 'failed', pausedReason: err.message }).where(eq(batches.id, batchId));
      return { status: 'failed' as const, completed: n - startChapter, reason: err.message };
    }

    await db.update(batches)
      .set({
        completedChapters: sql`${batches.completedChapters} + 1`,
        totalCostUsd: sql`${batches.totalCostUsd}::numeric + ${result.totalCostUsd}::numeric`,
      })
      .where(eq(batches.id, batchId));

    if (result.status === 'paused_pending_updates') {
      log.info({ chapter: n }, 'batch paused; pending updates require approval');
      await db.update(batches).set({ status: 'paused', pausedReason: 'pending_updates_required' }).where(eq(batches.id, batchId));
      return { status: 'paused' as const, completed: n - startChapter + 1, reason: 'pending_updates_required' };
    }
    if (result.status === 'failed') {
      await db.update(batches).set({ status: 'failed', pausedReason: 'chapter_failed' }).where(eq(batches.id, batchId));
      return { status: 'failed' as const, completed: n - startChapter };
    }
  }

  await db.update(batches).set({ status: 'completed', finishedAt: new Date() }).where(eq(batches.id, batchId));
  return { status: 'completed' as const, completed: endChapter - startChapter + 1 };
}
```

- [ ] **Step 20.3: Register queue + worker**

```ts
// apps/worker/src/queues.ts (append)
export const GENERATE_BATCH_QUEUE = 'generate-batch';
let batchQueue: Queue | null = null;
export function getGenerateBatchQueue(): Queue {
  if (!batchQueue) batchQueue = new Queue(GENERATE_BATCH_QUEUE, { connection: createConnection() });
  return batchQueue;
}
```

```ts
// apps/worker/src/index.ts
new Worker(GENERATE_BATCH_QUEUE, (job) => generateBatch(job as any), { connection: createConnection(), concurrency: 1 });
```

- [ ] **Step 20.4: Integration test**

```ts
// apps/worker/test/jobs/generate-batch.test.ts
// integration with mocked agentDeps that succeed for chapters 1-3, returning 'completed' status
// assert: 3 chapters completed, batch row status = 'completed'
// second test: agent throws on chapter 2 → batch row status = 'failed', completed=1
```

- [ ] **Step 20.5: Commit**

```bash
pnpm --filter @novel/worker test generate-batch
pnpm --filter @novel/db generate
pnpm --filter @novel/db migrate
git add packages/db/src/schema/batches.ts apps/worker/src/jobs/generate-batch.ts apps/worker/src/queues.ts apps/worker/src/index.ts apps/worker/test/jobs/generate-batch.test.ts
git commit -m "feat(worker): generate-batch job + batches table"
```

---

### Task 21: Batch generation API + UI

**Files:**
- Create: `apps/api/src/routes/batches.ts`
- Modify: `apps/api/src/server.ts`
- Create: `apps/web/lib/api/batches.ts`
- Create: `apps/web/app/stories/[id]/batch/page.tsx`
- Create: `apps/web/app/stories/[id]/batch/StartBatchForm.tsx`

- [ ] **Step 21.1: API**

```ts
// apps/api/src/routes/batches.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, batches } from '@novel/db';
import { eq, and, desc } from 'drizzle-orm';
import { getGenerateBatchQueue } from '@novel/worker/queues';

const StoryParam = z.object({ storyId: z.string().uuid() });
const BatchParam = z.object({ storyId: z.string().uuid(), batchId: z.string().uuid() });
const StartBody = z.object({
  startChapter: z.number().int().positive(),
  endChapter: z.number().int().positive(),
  mode: z.enum(['safe', 'semi_auto', 'full_auto']),
}).refine((b) => b.endChapter >= b.startChapter, { message: 'endChapter must be >= startChapter' });

export const batchesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/stories/:storyId/batches', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(batches).where(eq(batches.storyId, storyId)).orderBy(desc(batches.startedAt));
    return reply.send({ batches: rows });
  });

  fastify.post('/api/stories/:storyId/batches', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const body = StartBody.parse(req.body);
    const [row] = await db.insert(batches).values({
      storyId, startChapter: body.startChapter, endChapter: body.endChapter, mode: body.mode, status: 'running',
    }).returning();
    const job = await getGenerateBatchQueue().add('generate-batch', {
      batchId: row.id, storyId, startChapter: body.startChapter, endChapter: body.endChapter, mode: body.mode,
    }, { jobId: `batch-${row.id}` });
    return reply.code(202).send({ batch: row, jobId: job.id });
  });

  fastify.post('/api/stories/:storyId/batches/:batchId/cancel', async (req, reply) => {
    const { storyId, batchId } = BatchParam.parse(req.params);
    await db.update(batches).set({ status: 'cancelled', finishedAt: new Date() })
      .where(and(eq(batches.storyId, storyId), eq(batches.id, batchId)));
    return reply.send({ status: 'cancelled' });
  });
};
```

- [ ] **Step 21.2: Web client**

```ts
// apps/web/lib/api/batches.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

export interface Batch {
  id: string; storyId: string; startChapter: number; endChapter: number;
  mode: 'safe' | 'semi_auto' | 'full_auto';
  status: 'running' | 'completed' | 'paused' | 'failed' | 'cancelled';
  pausedReason: string | null;
  completedChapters: number; totalCostUsd: string;
  startedAt: string; finishedAt: string | null;
}

export async function listBatches(storyId: string): Promise<Batch[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/batches`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listBatches ${r.status}`);
  return (await r.json()).batches;
}

export async function startBatch(storyId: string, body: { startChapter: number; endChapter: number; mode: 'safe' | 'semi_auto' | 'full_auto' }) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/batches`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`startBatch ${r.status}`);
  return r.json();
}

export async function cancelBatch(storyId: string, batchId: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/batches/${batchId}/cancel`, { method: 'POST' });
  if (!r.ok) throw new Error(`cancelBatch ${r.status}`);
  return r.json();
}
```

- [ ] **Step 21.3: Page + form**

```tsx
// apps/web/app/stories/[id]/batch/page.tsx
import { listBatches } from '@/lib/api/batches';
import { StartBatchForm } from './StartBatchForm';

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batches = await listBatches(id);
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Batch generation</h1>
      <StartBatchForm storyId={id} />
      <h2 className="font-medium mt-8 mb-2">History</h2>
      <ul className="space-y-2 text-sm">
        {batches.map((b) => (
          <li key={b.id} className="border rounded p-3">
            <div className="flex justify-between">
              <span>ch {b.startChapter}–{b.endChapter} · mode={b.mode}</span>
              <span>{b.status} ({b.completedChapters} done · ${Number(b.totalCostUsd).toFixed(4)})</span>
            </div>
            {b.pausedReason && <div className="text-xs text-amber-700 mt-1">paused: {b.pausedReason}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// apps/web/app/stories/[id]/batch/StartBatchForm.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startBatch } from '@/lib/api/batches';

export function StartBatchForm({ storyId }: { storyId: string }) {
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(10);
  const [mode, setMode] = useState<'safe' | 'semi_auto' | 'full_auto'>('semi_auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const projectedCost = (end - start + 1) * 0.007;
  return (
    <form className="border rounded p-4 space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!confirm(`Generate chapters ${start}–${end} in ${mode} mode? Estimated cost ~$${projectedCost.toFixed(2)}.`)) return;
      setBusy(true); setError(null);
      try { await startBatch(storyId, { startChapter: start, endChapter: end, mode }); router.refresh(); }
      catch (e: any) { setError(e.message); }
      finally { setBusy(false); }
    }}>
      <div className="flex gap-2 items-center">
        <label>From <input type="number" min={1} value={start} onChange={(e) => setStart(Number(e.target.value))} className="border rounded w-20 p-1" /></label>
        <label>To <input type="number" min={start} value={end} onChange={(e) => setEnd(Number(e.target.value))} className="border rounded w-20 p-1" /></label>
        <label>Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="border rounded p-1 ml-1">
            <option value="safe">safe</option>
            <option value="semi_auto">semi_auto</option>
            <option value="full_auto">full_auto</option>
          </select>
        </label>
      </div>
      <div className="text-sm text-gray-500">Estimated cost: ${projectedCost.toFixed(2)} (at ~$0.007/chapter)</div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {busy ? 'Starting…' : 'Start batch'}
      </button>
    </form>
  );
}
```

- [ ] **Step 21.4: Commit**

```bash
pnpm --filter @novel/api test batches
git add apps/api/src/routes/batches.ts apps/api/src/server.ts apps/web/lib/api/batches.ts apps/web/app/stories/[id]/batch/
git commit -m "feat(api+web): batch generation route + UI"
```

---

### Task 22: Timeline view UI

**Files:**
- Create: `apps/web/lib/api/timeline.ts`
- Create: `apps/web/app/stories/[id]/timeline/page.tsx`
- Modify: `apps/api/src/routes/chapters.ts` (add `/timeline` aggregation endpoint)

A scrollable list of (chapter number, title, short summary, key events extracted from canon_facts/events tables) so the user can scan 100+ chapters at a glance.

- [ ] **Step 22.1: API endpoint**

```ts
// apps/api/src/routes/chapters.ts (append)
fastify.get('/api/stories/:storyId/timeline', async (req, reply) => {
  const { storyId } = ChapterParams.parse(req.params);
  const rows = await db
    .select({
      number: chapters.number,
      title: chapters.title,
      shortSummary: chapters.shortSummary,
      completedAt: chapters.completedAt,
    })
    .from(chapters)
    .where(and(eq(chapters.storyId, storyId), eq(chapters.status, 'completed')))
    .orderBy(asc(chapters.number));
  return reply.send({ timeline: rows });
});
```

- [ ] **Step 22.2: Web client + page**

```ts
// apps/web/lib/api/timeline.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';
export interface TimelineRow { number: number; title: string; shortSummary: string | null; completedAt: string | null; }

export async function getTimeline(storyId: string): Promise<TimelineRow[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/timeline`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`getTimeline ${r.status}`);
  return (await r.json()).timeline;
}
```

```tsx
// apps/web/app/stories/[id]/timeline/page.tsx
import Link from 'next/link';
import { getTimeline } from '@/lib/api/timeline';

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await getTimeline(id);
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Timeline ({rows.length} chapters)</h1>
      <ol className="border-l-2 border-gray-200 pl-4 space-y-3">
        {rows.map((r) => (
          <li key={r.number} className="relative">
            <span className="absolute -left-[1.4rem] top-1 w-3 h-3 rounded-full bg-blue-500" />
            <Link href={`/stories/${id}/chapters/${r.number}`} className="font-semibold text-blue-700">
              Ch {r.number}: {r.title}
            </Link>
            <p className="text-sm text-gray-700 mt-1">{r.shortSummary}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 22.3: Commit**

```bash
git add apps/web/lib/api/timeline.ts apps/web/app/stories/[id]/timeline/ apps/api/src/routes/chapters.ts
git commit -m "feat(web+api): timeline view"
```

---

### Task 23: Canon facts view UI (with locked toggle)

**Files:**
- Create: `apps/api/src/routes/canon-facts.ts`
- Modify: `apps/api/src/server.ts`
- Create: `apps/web/lib/api/canon-facts.ts`
- Create: `apps/web/app/stories/[id]/canon/page.tsx`
- Create: `apps/web/app/stories/[id]/canon/CanonRow.tsx`

Single page listing every canon fact with filter chips (subject type, locked status) and inline lock toggle.

- [ ] **Step 23.1: API (read + lock toggle)**

```ts
// apps/api/src/routes/canon-facts.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, canonFacts } from '@novel/db';
import { eq, and, desc } from 'drizzle-orm';

const StoryParam = z.object({ storyId: z.string().uuid() });
const FactParam = z.object({ storyId: z.string().uuid(), factId: z.string().uuid() });
const LockBody = z.object({ locked: z.boolean() });

export const canonFactsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/stories/:storyId/canon-facts', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(canonFacts)
      .where(eq(canonFacts.storyId, storyId))
      .orderBy(desc(canonFacts.importance));
    return reply.send({ facts: rows });
  });

  fastify.patch('/api/stories/:storyId/canon-facts/:factId/lock', async (req, reply) => {
    const { storyId, factId } = FactParam.parse(req.params);
    const { locked } = LockBody.parse(req.body);
    const [row] = await db.update(canonFacts)
      .set({ importance: locked ? 'locked' : 'normal' })
      .where(and(eq(canonFacts.storyId, storyId), eq(canonFacts.id, factId)))
      .returning();
    if (!row) return reply.code(404).send({ error: 'fact_not_found' });
    return reply.send({ fact: row });
  });
};
```

- [ ] **Step 23.2: Web**

```ts
// apps/web/lib/api/canon-facts.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';
export interface CanonFact {
  id: string; subjectType: string; subjectKey: string;
  factText: string; importance: 'normal' | 'locked';
  firstSeenChapter: number | null; lastConfirmedChapter: number | null;
}

export async function listCanonFacts(storyId: string): Promise<CanonFact[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/canon-facts`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listCanonFacts ${r.status}`);
  return (await r.json()).facts;
}

export async function setLocked(storyId: string, factId: string, locked: boolean) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/canon-facts/${factId}/lock`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locked }),
  });
  if (!r.ok) throw new Error(`setLocked ${r.status}`);
  return r.json();
}
```

```tsx
// apps/web/app/stories/[id]/canon/page.tsx
import { listCanonFacts } from '@/lib/api/canon-facts';
import { CanonRow } from './CanonRow';

export default async function CanonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facts = await listCanonFacts(id);
  const locked = facts.filter((f) => f.importance === 'locked');
  const normal = facts.filter((f) => f.importance === 'normal');
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Canon facts ({facts.length})</h1>
      <section className="mb-6">
        <h2 className="font-medium mb-2">🔒 Locked ({locked.length})</h2>
        <ul className="space-y-2">{locked.map((f) => <CanonRow key={f.id} storyId={id} fact={f} />)}</ul>
      </section>
      <section>
        <h2 className="font-medium mb-2">Normal ({normal.length})</h2>
        <ul className="space-y-2">{normal.map((f) => <CanonRow key={f.id} storyId={id} fact={f} />)}</ul>
      </section>
    </div>
  );
}
```

```tsx
// apps/web/app/stories/[id]/canon/CanonRow.tsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLocked, type CanonFact } from '@/lib/api/canon-facts';

export function CanonRow({ storyId, fact }: { storyId: string; fact: CanonFact }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const locked = fact.importance === 'locked';
  return (
    <li className="border rounded p-3 text-sm flex justify-between gap-2">
      <div>
        <div><code className="text-xs text-gray-500">{fact.subjectType}/{fact.subjectKey}</code></div>
        <div>{fact.factText}</div>
        <div className="text-xs text-gray-400 mt-1">first seen: ch {fact.firstSeenChapter ?? '?'}, last confirmed: ch {fact.lastConfirmedChapter ?? '?'}</div>
      </div>
      <button
        disabled={pending}
        onClick={() => start(async () => { await setLocked(storyId, fact.id, !locked); router.refresh(); })}
        className={`text-xs px-2 py-1 rounded h-fit ${locked ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}
      >
        {locked ? '🔒 Unlock' : '🔓 Lock'}
      </button>
    </li>
  );
}
```

- [ ] **Step 23.3: Commit**

```bash
pnpm --filter @novel/api test canon-facts
git add apps/api/src/routes/canon-facts.ts apps/api/src/server.ts apps/web/lib/api/canon-facts.ts apps/web/app/stories/[id]/canon/
git commit -m "feat(web+api): canon facts view + lock toggle"
```

---

### Task 24: Cost dashboard UI

**Files:**
- Create: `apps/web/lib/api/costs.ts`
- Create: `apps/web/app/stories/[id]/costs/page.tsx`

- [ ] **Step 24.1: Client**

```ts
// apps/web/lib/api/costs.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

export interface CostSummary {
  usage: { dailyUsd: number; monthlyUsd: number };
  caps: { PER_CHAPTER_HARD_CAP_USD: number; PER_STORY_DAILY_CAP_USD: number; PER_STORY_MONTHLY_CAP_USD: number; ALERT_THRESHOLD_PERCENT: number };
}
export interface AgentRow { agent: string; callCount: number; tokens: number; cost: string; }
export interface ChapterRow { chapterNumber: number; cost: string; tokens: number; }

export async function getSummary(storyId: string): Promise<CostSummary> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/costs/summary`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`summary ${r.status}`);
  return r.json();
}

export async function getByAgent(storyId: string): Promise<AgentRow[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/costs/by-agent`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`by-agent ${r.status}`);
  return (await r.json()).rows;
}

export async function getByChapter(storyId: string): Promise<ChapterRow[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/costs/by-chapter`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`by-chapter ${r.status}`);
  return (await r.json()).rows;
}
```

- [ ] **Step 24.2: Page**

```tsx
// apps/web/app/stories/[id]/costs/page.tsx
import { getSummary, getByAgent, getByChapter } from '@/lib/api/costs';

export default async function CostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [summary, byAgent, byChapter] = await Promise.all([getSummary(id), getByAgent(id), getByChapter(id)]);
  const dailyPct = (summary.usage.dailyUsd / summary.caps.PER_STORY_DAILY_CAP_USD) * 100;
  const monthlyPct = (summary.usage.monthlyUsd / summary.caps.PER_STORY_MONTHLY_CAP_USD) * 100;
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold mb-4">Cost dashboard</h1>
      <section className="grid grid-cols-2 gap-4 mb-8">
        <Stat label="Today" used={summary.usage.dailyUsd} cap={summary.caps.PER_STORY_DAILY_CAP_USD} pct={dailyPct} />
        <Stat label="Last 30 days" used={summary.usage.monthlyUsd} cap={summary.caps.PER_STORY_MONTHLY_CAP_USD} pct={monthlyPct} />
      </section>
      <section className="mb-8">
        <h2 className="font-medium mb-2">By agent (last 30d)</h2>
        <table className="w-full text-sm">
          <thead className="border-b text-left"><tr><th>Agent</th><th>Calls</th><th>Tokens</th><th>Cost</th></tr></thead>
          <tbody>
            {byAgent.map((r) => <tr key={r.agent} className="border-b"><td>{r.agent}</td><td>{r.callCount}</td><td>{r.tokens.toLocaleString()}</td><td>${Number(r.cost).toFixed(4)}</td></tr>)}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="font-medium mb-2">By chapter</h2>
        <ul className="text-sm grid grid-cols-2 gap-x-6">
          {byChapter.map((r) => <li key={r.chapterNumber}>Ch {r.chapterNumber}: ${Number(r.cost).toFixed(4)}</li>)}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, used, cap, pct }: { label: string; used: number; cap: number; pct: number }) {
  const color = pct >= 100 ? 'red' : pct >= 80 ? 'amber' : 'green';
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">${used.toFixed(4)} <span className="text-sm text-gray-400">/ ${cap}</span></div>
      <div className="mt-2 h-2 bg-gray-200 rounded overflow-hidden">
        <div className={`h-full bg-${color}-500`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 24.3: Commit**

```bash
git add apps/web/lib/api/costs.ts apps/web/app/stories/[id]/costs/
git commit -m "feat(web): cost dashboard"
```

---

### Task 25: Plan 3 wrap-up + tag

- [ ] **Step 25.1: Verify all migrations applied**

```bash
pnpm --filter @novel/db migrate
```

- [ ] **Step 25.2: Full test sweep**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

Expected: all green. Fix any failures in-place.

- [ ] **Step 25.3: Manual UI smoke (no LLM calls)**

Visit each new page against the seeded test story:
- `/stories/<id>/sagas` (empty list + plan button)
- `/stories/<id>/seeds` (empty)
- `/stories/<id>/timeline` (empty)
- `/stories/<id>/canon` (empty)
- `/stories/<id>/costs` (zeroes)
- `/stories/<id>/reviews` (empty)
- `/stories/<id>/batch` (form renders)

- [ ] **Step 25.4: Commit + tag**

```bash
git commit --allow-empty -m "chore(plan-3): wrap up — long-form scale complete"
git tag plan-3-complete
```

---

## What's NOT in Plan 3 (handed off to Plan 4)

- Admin metrics dashboard (cross-story aggregation, latency histograms, cache hit-rate panels)
- EPUB / Markdown export pipeline
- Style few-shots upload UI (allow user to paste reference passages → embedded into HOT tier)
- Story settings UI (config overrides for `MODEL_CONFIG`, `BUDGET_GUARDRAILS`, `LONG_FORM_CONFIG` per story)
- Project README + architecture docs + runbook
- Prompt-version diff UI (A/B testing of prompts in production)
- Reader-facing app (separate project, out of scope per spec section 7.7)



