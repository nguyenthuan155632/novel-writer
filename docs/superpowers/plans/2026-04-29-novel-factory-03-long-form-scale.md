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


