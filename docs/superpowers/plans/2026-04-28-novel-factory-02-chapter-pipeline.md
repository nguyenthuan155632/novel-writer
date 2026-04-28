# Plan 2 — Chapter Generation Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the system actually write a chapter. Build the embedding service, three-tier Context Builder, Packet Generator + deterministic Auditor, Writer agent, two-tier Validation pipeline (deterministic + LLM), Auto-Fixer, Canon Extractor + reconciliation flow (pending updates → conflict detector → canon merger), Summary Compactor (per-chapter + arc rolling), and the BullMQ `generate-chapter` orchestrator. Surface a minimal Chapter view + Generate button + Pending Updates approval UI.

**Architecture:** Worker app (`apps/worker`) hosts BullMQ jobs that consume Redis queues. The orchestrator job owns the per-chapter state machine: packet → audit → context → write → deterministic validate → llm validate → auto-fix? → extract → reconcile → summarize → persist + version-bump. All LLM calls go through the existing `LoggedLLMProvider` from Plan 1. All canon writes flow through `reconciliation/canon-merger.ts` — never raw `db.update(characters)` from extractor. Cache prefix order (HOT → WARM → COLD → INSTRUCTION) is enforced by a single `serialize()` function shared between Writer and LLM Validator so they hit the same provider-side prefix cache.

**Tech Stack:** BullMQ 5, ioredis 5, Drizzle ORM, pgvector, Pino, Zod, Vitest, Testcontainers (Postgres + Redis), Fastify SSE.

**Critical invariants reinforced from spec Section 7.6:**
- Every LLM call logged to `llm_calls` (already enforced by `LoggedLLMProvider` from Plan 1)
- Every context build logged to `context_packets`
- Critical deterministic validator failure short-circuits — LLM validator is NOT called
- Canon writes flow only through `canon-merger.ts`
- Cache prefix order never deviates between Writer and LLM Validator within a story
- No live LLM API calls during dev without explicit user consent (tests use mocked provider; live tests gated by `RUN_LIVE_LLM=1` AND user confirmation)

**Definition of done for this plan:**
- User on `/stories/:id/chapters/new` clicks "Generate Chapter 1" → orchestrator runs end-to-end with mocked LLM in dev → chapter row + summary row + pending updates appear in DB
- Live-API smoke harness exists for the full pipeline, gated behind `RUN_LIVE_LLM=1`
- All deterministic validators have 100% unit test coverage
- Packet auditor has 100% unit test coverage
- Conflict detector has 100% unit test coverage
- Context builder has unit tests covering tier assembly, shrink ladder, cache key stability
- Worker integration test (Testcontainers Postgres + Redis) runs the orchestrator end-to-end with mocked provider and asserts state at each stage
- `/stories/:id/pending` UI lists pending updates with approve/reject; approving bumps versions and re-triggers the queue if the next chapter is waiting

---

## Prerequisites (from Plan 1)

Plan 1 must be complete (`git tag plan-1-complete` exists). This plan assumes the following are already implemented:

- pnpm monorepo + tsconfig base
- `packages/core` config (`CONTEXT_CONFIG`, `GENERATION_CONFIG`, `MODEL_CONFIG`, `BUDGET_GUARDRAILS`), `getEffectiveConfig`, Pino logger, `withTrace` helper
- `packages/db` Drizzle schema for all 20 tables incl. `chapters`, `chapter_packets`, `chapter_summaries`, `pending_canon_updates`, `planted_seeds`, `context_packets`, `canon_facts` (with `embedding vector(1536)`), `prompt_versions`
- `packages/ai` provider abstraction (`LLMProvider`, `OpenRouterProvider`, `MockLLMProvider`, `LoggedLLMProvider`), `llm-call-logger.ts`, prompt registry, Bible generator
- `apps/api` Fastify server with `/api/stories` + `/api/stories/:id/bible`
- `apps/web` Next.js stories list + bible page
- Docker Compose: Postgres 16 + pgvector + Redis 7 services
- `apps/worker` package skeleton exists (created in Plan 1 Task 21? — if not, Task 1 of this plan creates it)

If `apps/worker` was not scaffolded in Plan 1, Task 1 below covers it.

---

## File Structure (locked at plan start)

```
novel-writer/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── chapters.ts                # Task 32 (POST/GET chapters, generate trigger, SSE status)
│   │       │   └── pending-updates.ts         # Task 34 (list, approve, reject)
│   │       └── services/
│   │           └── queue-client.ts            # Task 31 (enqueue helpers)
│   ├── web/
│   │   └── app/stories/[id]/
│   │       ├── chapters/
│   │       │   ├── page.tsx                   # Task 36 (chapter list + generate next button)
│   │       │   └── [n]/page.tsx               # Task 36 (single-chapter view)
│   │       └── pending/
│   │           └── page.tsx                   # Task 37 (pending updates approval UI)
│   └── worker/
│       ├── package.json                       # Task 1
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts                       # Task 1 (worker entry, queue registration)
│       │   ├── queues.ts                      # Task 2 (queue + connection factory)
│       │   └── jobs/
│       │       ├── generate-chapter.ts        # Task 30 (orchestrator)
│       │       └── refresh-arc-summary.ts     # Task 29 (placeholder; full impl in Plan 3)
│       └── test/
│           └── jobs/
│               └── generate-chapter.integration.test.ts  # Task 30
├── packages/
│   ├── core/
│   │   └── src/
│   │       └── utils/
│   │           ├── tokens.ts                  # Task 3 (token estimator)
│   │           └── hash.ts                    # Task 3 (sha256 helper)
│   └── ai/
│       ├── src/
│       │   ├── embeddings/
│       │   │   ├── types.ts                   # Task 4
│       │   │   ├── service.ts                 # Task 4 (EmbeddingService interface + impl)
│       │   │   └── mock.ts                    # Task 4 (deterministic mock)
│       │   ├── context/
│       │   │   ├── types.ts                   # Task 5 (ChapterContext, HotTier, WarmTier, ColdTier)
│       │   │   ├── compact.ts                 # Task 5 (CharacterCompact/ThreadCompact/SeedCompact serializers)
│       │   │   ├── cache-keys.ts              # Task 6 (computeHotHash, computeWarmHash)
│       │   │   ├── retrieval.ts               # Task 7 (recent + top-K facts + past chapters)
│       │   │   ├── past-reference.ts          # Task 8 (regex/keyword classifier)
│       │   │   ├── shrink.ts                  # Task 9 (shrink ladder)
│       │   │   ├── serialize.ts               # Task 10 (canonical serialization order)
│       │   │   └── builder.ts                 # Task 11 (assemble HOT+WARM+COLD; persist context_packets)
│       │   ├── schemas/
│       │   │   ├── packet.ts                  # Task 12 (ChapterPacket Zod schema)
│       │   │   ├── validator.ts               # Task 21 (LLM validator output schema)
│       │   │   ├── extractor.ts               # Task 24 (canon extractor output schema)
│       │   │   └── summary.ts                 # Task 27 (summary compactor schema)
│       │   ├── prompts/
│       │   │   ├── packet-generator.v1.ts     # Task 13
│       │   │   ├── writer.v1.ts               # Task 16
│       │   │   ├── auto-fixer.v1.ts           # Task 23
│       │   │   ├── llm-validator.v1.ts        # Task 21
│       │   │   ├── canon-extractor.v1.ts      # Task 24
│       │   │   └── summary-compactor.v1.ts    # Task 27
│       │   ├── agents/
│       │   │   ├── packet-generator.ts        # Task 14
│       │   │   ├── writer.ts                  # Task 17
│       │   │   ├── auto-fixer.ts              # Task 23
│       │   │   ├── llm-validator.ts           # Task 22
│       │   │   ├── canon-extractor.ts         # Task 25
│       │   │   └── summary-compactor.ts       # Task 28
│       │   ├── validators/
│       │   │   ├── packet-auditor.ts          # Task 15
│       │   │   └── deterministic/
│       │   │       ├── types.ts               # Task 18
│       │   │       ├── word-count.ts          # Task 18
│       │   │       ├── dead-character.ts      # Task 18
│       │   │       ├── realm-jump.ts          # Task 19
│       │   │       ├── locked-fact.ts         # Task 19
│       │   │       ├── forbidden-move.ts      # Task 19
│       │   │       ├── unknown-character.ts   # Task 19
│       │   │       ├── unknown-location.ts    # Task 19
│       │   │       ├── new-bloodline-source.ts # Task 19
│       │   │       ├── cliffhanger.ts         # Task 20
│       │   │       ├── conflict-presence.ts   # Task 20
│       │   │       ├── style-red-flags.ts     # Task 20
│       │   │       ├── repetition.ts          # Task 20
│       │   │       └── runner.ts              # Task 20 (registers all checks, runs in severity order)
│       │   └── reconciliation/
│       │       ├── conflict-detector.ts       # Task 26 (per-row rules from Section 5.6)
│       │       └── canon-merger.ts            # Task 26 (apply + bump versions; only path that writes canon)
│       └── test/
│           ├── embeddings/service.test.ts
│           ├── context/
│           │   ├── cache-keys.test.ts
│           │   ├── retrieval.test.ts
│           │   ├── past-reference.test.ts
│           │   ├── shrink.test.ts
│           │   ├── serialize.test.ts
│           │   └── builder.test.ts
│           ├── validators/
│           │   ├── packet-auditor.test.ts
│           │   └── deterministic/*.test.ts
│           ├── reconciliation/
│           │   ├── conflict-detector.test.ts
│           │   └── canon-merger.test.ts
│           └── agents/
│               ├── packet-generator.test.ts
│               ├── writer.test.ts
│               ├── llm-validator.test.ts
│               ├── auto-fixer.test.ts
│               ├── canon-extractor.test.ts
│               └── summary-compactor.test.ts
└── docker-compose.yml                         # Task 2 (add Redis if not present)
```

---

## Definition of Done — Plan 2 Checklist

- [ ] All 38 tasks complete
- [ ] `pnpm test` green across all packages including new tests
- [ ] Worker integration test asserts: packet → audit pass → context built → mocked writer returns chapter → deterministic validator pass → mocked llm validator pass → mocked extractor returns updates → conflict detector classifies → canon merger applies non-blocking → summary saved → versions bumped
- [ ] Smoke harness `apps/worker/src/scripts/smoke-generate-chapter.ts` (Task 38) runs full pipeline against live API only when `RUN_LIVE_LLM=1` AND user confirms
- [ ] User can: open `/stories/:id/chapters`, click "Generate Chapter N", see status updates via SSE/polling, view final chapter, see any pending updates on `/stories/:id/pending`, approve/reject them
- [ ] Plan 2 wrap-up commit + tag `plan-2-complete`

---

## Task 1: Worker app skeleton (BullMQ + ioredis)

**Files:**
- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/src/queues.ts`
- Create: `apps/worker/test/sanity.test.ts`

> Skip Steps 1.1–1.3 if Plan 1 already created `apps/worker/package.json`. Verify by `cat apps/worker/package.json`.

- [ ] **Step 1.1: Write `apps/worker/package.json`**

```json
{
  "name": "@novel/worker",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "echo 'no lint configured'"
  },
  "dependencies": {
    "@novel/ai": "workspace:*",
    "@novel/core": "workspace:*",
    "@novel/db": "workspace:*",
    "bullmq": "5.76.2",
    "ioredis": "5.4.1",
    "pino": "10.3.1",
    "zod": "3.25.76"
  },
  "devDependencies": {
    "@types/node": "24.12.2",
    "tsx": "4.21.0",
    "typescript": "5.9.3",
    "vitest": "3.3.0"
  }
}
```

- [ ] **Step 1.2: Write `apps/worker/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 1.3: Install**

```bash
pnpm install
```

Expected: `@novel/worker` linked, no errors.

- [ ] **Step 1.4: Write `apps/worker/src/queues.ts`**

```ts
import { Queue, QueueEvents, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

export type GenerateChapterJob = {
  storyId: string;
  chapterNumber: number;
  arcId: string;
  importance?: 'normal' | 'important';
  traceId: string;
};

export type RefreshArcSummaryJob = {
  storyId: string;
  arcId: string;
  traceId: string;
};

export const QUEUE_NAMES = {
  generateChapter: 'generate-chapter',
  refreshArcSummary: 'refresh-arc-summary',
} as const;

export function createConnection(): IORedis {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function createGenerateChapterQueue(connection: ConnectionOptions): Queue<GenerateChapterJob> {
  return new Queue<GenerateChapterJob>(QUEUE_NAMES.generateChapter, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });
}

export function createGenerateChapterEvents(connection: ConnectionOptions): QueueEvents {
  return new QueueEvents(QUEUE_NAMES.generateChapter, { connection });
}
```

- [ ] **Step 1.5: Write `apps/worker/src/index.ts`**

```ts
import { Worker } from 'bullmq';
import { createLogger } from '@novel/core/logger';
import { QUEUE_NAMES, createConnection, type GenerateChapterJob, type RefreshArcSummaryJob } from './queues.js';

const log = createLogger('worker');

const connection = createConnection();

const generateChapterWorker = new Worker<GenerateChapterJob>(
  QUEUE_NAMES.generateChapter,
  async (job) => {
    const { runGenerateChapterJob } = await import('./jobs/generate-chapter.js');
    return runGenerateChapterJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { connection, concurrency: 1 }
);

const refreshArcSummaryWorker = new Worker<RefreshArcSummaryJob>(
  QUEUE_NAMES.refreshArcSummary,
  async (job) => {
    const { runRefreshArcSummaryJob } = await import('./jobs/refresh-arc-summary.js');
    return runRefreshArcSummaryJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { connection, concurrency: 1 }
);

generateChapterWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'generate-chapter failed'));
refreshArcSummaryWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'refresh-arc-summary failed'));

log.info('worker started');

const shutdown = async () => {
  log.info('worker shutting down');
  await Promise.all([generateChapterWorker.close(), refreshArcSummaryWorker.close()]);
  await connection.quit();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

- [ ] **Step 1.6: Write placeholder `apps/worker/src/jobs/refresh-arc-summary.ts`**

```ts
import type { Logger } from 'pino';
import type { RefreshArcSummaryJob } from '../queues.js';

export async function runRefreshArcSummaryJob(
  data: RefreshArcSummaryJob,
  ctx: { logger: Logger }
): Promise<{ status: 'skipped' }> {
  ctx.logger.warn({ data }, 'refresh-arc-summary not implemented in Plan 2 — see Plan 3');
  return { status: 'skipped' };
}
```

- [ ] **Step 1.7: Write sanity test `apps/worker/test/sanity.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { QUEUE_NAMES } from '../src/queues.js';

describe('queues', () => {
  it('exposes stable queue names', () => {
    expect(QUEUE_NAMES.generateChapter).toBe('generate-chapter');
    expect(QUEUE_NAMES.refreshArcSummary).toBe('refresh-arc-summary');
  });
});
```

- [ ] **Step 1.8: Typecheck + test**

```bash
pnpm --filter @novel/worker typecheck
pnpm --filter @novel/worker test
```

Expected: PASS (note: jobs/generate-chapter.js does not exist yet; dynamic import is fine because the worker won't start in tests).

- [ ] **Step 1.9: Commit**

```bash
git add apps/worker
git commit -m "feat(worker): scaffold BullMQ worker with queue + connection helpers"
```

---

## Task 2: Add Redis to docker-compose

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.local.example`

> Skip if Plan 1 Task 31 already added Redis. Verify with `grep -n redis docker-compose.yml`.

- [ ] **Step 2.1: Add `redis` service to `docker-compose.yml`**

Insert under `services:`:

```yaml
  redis:
    image: redis:7-alpine
    container_name: novel-redis
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped
```

- [ ] **Step 2.2: Append to `.env.local.example`**

```
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 2.3: Bring up Redis**

```bash
docker compose up -d redis
docker compose ps
```

Expected: `novel-redis` healthy.

- [ ] **Step 2.4: Verify connectivity**

```bash
docker compose exec redis redis-cli ping
```

Expected: `PONG`.

- [ ] **Step 2.5: Commit**

```bash
git add docker-compose.yml .env.local.example
git commit -m "chore: add redis service for BullMQ"
```

---

## Task 3: Token + hash utilities in `@novel/core`

**Files:**
- Create: `packages/core/src/utils/tokens.ts`
- Create: `packages/core/src/utils/hash.ts`
- Create: `packages/core/test/utils/tokens.test.ts`
- Create: `packages/core/test/utils/hash.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/package.json` (add export)

- [ ] **Step 3.1: Write `packages/core/src/utils/tokens.ts`**

```ts
// Cheap deterministic estimator: ~4 chars / token for Latin-ish; for VN we use a slightly higher
// ratio (3.2) because Vietnamese diacritics + multibyte UTF-8 push token counts up.
// This is a heuristic for context-budget enforcement, NOT a billing source — actual tokens come
// from the provider response and are stored in `llm_calls.input_tokens` / `output_tokens`.
export function estimateTokens(input: string): number {
  if (!input) return 0;
  const charCount = input.length;
  return Math.ceil(charCount / 3.2);
}

export function estimateTokensJson(input: unknown): number {
  return estimateTokens(JSON.stringify(input));
}
```

- [ ] **Step 3.2: Write `packages/core/src/utils/hash.ts`**

```ts
import { createHash } from 'node:crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function sha256Short(input: string, length = 12): string {
  return sha256(input).slice(0, length);
}
```

- [ ] **Step 3.3: Update `packages/core/src/index.ts`**

Append:

```ts
export * from './utils/tokens.js';
export * from './utils/hash.js';
```

- [ ] **Step 3.4: Update `packages/core/package.json` `exports`**

Add to the `exports` map:

```json
"./utils/*": "./src/utils/*.ts"
```

- [ ] **Step 3.5: Write tests**

`packages/core/test/utils/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { estimateTokens, estimateTokensJson } from '../../src/utils/tokens.js';

describe('estimateTokens', () => {
  it('returns 0 for empty', () => expect(estimateTokens('')).toBe(0));
  it('rounds up', () => expect(estimateTokens('1234')).toBe(2));
  it('handles unicode VN', () => expect(estimateTokens('Lam Trạch tu luyện đan dược')).toBeGreaterThan(5));
  it('json variant serialises', () => expect(estimateTokensJson({ a: 1 })).toBeGreaterThan(0));
});
```

`packages/core/test/utils/hash.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sha256, sha256Short } from '../../src/utils/hash.js';

describe('sha256', () => {
  it('is deterministic', () => expect(sha256('abc')).toBe(sha256('abc')));
  it('short truncates', () => expect(sha256Short('abc', 8)).toHaveLength(8));
  it('different input → different hash', () => expect(sha256('a')).not.toBe(sha256('b')));
});
```

- [ ] **Step 3.6: Run tests**

```bash
pnpm --filter @novel/core test
```

Expected: PASS.

- [ ] **Step 3.7: Commit**

```bash
git add packages/core
git commit -m "feat(core): add token estimator + sha256 helpers"
```

---

## Task 4: Embedding service (OpenRouter `text-embedding-3-small` + Mock)

**Files:**
- Create: `packages/ai/src/embeddings/types.ts`
- Create: `packages/ai/src/embeddings/service.ts`
- Create: `packages/ai/src/embeddings/mock.ts`
- Create: `packages/ai/test/embeddings/service.test.ts`
- Modify: `packages/ai/src/index.ts`

- [ ] **Step 4.1: Write `packages/ai/src/embeddings/types.ts`**

```ts
export const EMBEDDING_DIM = 1536;

export type EmbeddingRequest = {
  input: string;
  model?: string;          // override; default 'openai/text-embedding-3-small'
  traceId: string;
};

export type EmbeddingResponse = {
  vector: number[];        // length EMBEDDING_DIM
  model: string;
  usage: { tokens: number };
  cost: number;
};

export interface EmbeddingService {
  embed(req: EmbeddingRequest): Promise<EmbeddingResponse>;
}
```

- [ ] **Step 4.2: Write `packages/ai/src/embeddings/mock.ts`**

```ts
import { createHash } from 'node:crypto';
import { EMBEDDING_DIM, type EmbeddingRequest, type EmbeddingResponse, type EmbeddingService } from './types.js';

// Deterministic hash-based pseudo-embedding for tests. Same input → same vector.
export class MockEmbeddingService implements EmbeddingService {
  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const seedHash = createHash('sha256').update(req.input).digest();
    const vector = new Array<number>(EMBEDDING_DIM);
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] = (seedHash[i % seedHash.length]! / 255) * 2 - 1;  // [-1, 1]
    }
    return {
      vector,
      model: 'mock-embed',
      usage: { tokens: Math.ceil(req.input.length / 4) },
      cost: 0,
    };
  }
}
```

- [ ] **Step 4.3: Write `packages/ai/src/embeddings/service.ts`**

```ts
import type { Logger } from 'pino';
import { EMBEDDING_DIM, type EmbeddingRequest, type EmbeddingResponse, type EmbeddingService } from './types.js';

const DEFAULT_MODEL = process.env.EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';
const PRICE_PER_MILLION_TOKENS = 0.02;  // text-embedding-3-small via OpenRouter

export class OpenRouterEmbeddingService implements EmbeddingService {
  constructor(
    private readonly opts: {
      apiKey: string;
      baseUrl?: string;
      logger: Logger;
    }
  ) {}

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = req.model ?? DEFAULT_MODEL;
    const url = `${this.opts.baseUrl ?? 'https://openrouter.ai/api/v1'}/embeddings`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: req.input }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Embedding API error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as {
      data: { embedding: number[] }[];
      usage: { prompt_tokens: number; total_tokens: number };
      model: string;
    };
    const vector = data.data[0]?.embedding;
    if (!vector || vector.length !== EMBEDDING_DIM) {
      throw new Error(`Embedding dim mismatch: expected ${EMBEDDING_DIM}, got ${vector?.length}`);
    }
    const tokens = data.usage.total_tokens ?? data.usage.prompt_tokens ?? 0;
    return {
      vector,
      model: data.model ?? model,
      usage: { tokens },
      cost: (tokens / 1_000_000) * PRICE_PER_MILLION_TOKENS,
    };
  }
}
```

- [ ] **Step 4.4: Update `packages/ai/src/index.ts`**

Append:

```ts
export * from './embeddings/types.js';
export * from './embeddings/service.js';
export * from './embeddings/mock.js';
```

- [ ] **Step 4.5: Write `packages/ai/test/embeddings/service.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { MockEmbeddingService } from '../../src/embeddings/mock.js';
import { EMBEDDING_DIM } from '../../src/embeddings/types.js';

describe('MockEmbeddingService', () => {
  it('returns deterministic vector of correct dim', async () => {
    const svc = new MockEmbeddingService();
    const a = await svc.embed({ input: 'hello', traceId: 't1' });
    const b = await svc.embed({ input: 'hello', traceId: 't2' });
    expect(a.vector).toHaveLength(EMBEDDING_DIM);
    expect(a.vector).toEqual(b.vector);
  });

  it('different inputs → different vectors', async () => {
    const svc = new MockEmbeddingService();
    const a = await svc.embed({ input: 'foo', traceId: 't' });
    const b = await svc.embed({ input: 'bar', traceId: 't' });
    expect(a.vector).not.toEqual(b.vector);
  });
});
```

- [ ] **Step 4.6: Run tests + commit**

```bash
pnpm --filter @novel/ai test embeddings
git add packages/ai
git commit -m "feat(ai): embedding service interface + OpenRouter impl + mock"
```

---

## Task 5: Context tier types + compact serializers

**Files:**
- Create: `packages/ai/src/context/types.ts`
- Create: `packages/ai/src/context/compact.ts`
- Create: `packages/ai/test/context/compact.test.ts`

- [ ] **Step 5.1: Write `packages/ai/src/context/types.ts`**

```ts
import type { ChapterPacket } from '../schemas/packet.js';

export type StyleFewShot = { excerpt: string; sourceChapter?: number };

export type HotTier = {
  systemRules: string;
  bibleCompact: string;
  styleGuide: string;
  powerRules: string;
  styleFewShots: StyleFewShot[];
};

export type CharacterCompact = {
  id: string;
  name: string;
  currentRealm?: string;
  status: 'alive' | 'dead' | 'missing' | 'unknown';
  bloodlines: string[];
  faction?: string;
  shortTraits: string[];           // 2-4 words each, max 5
};

export type ThreadCompact = {
  id: string;
  title: string;
  state: 'open' | 'partial' | 'resolved';
  introducedChapter: number;
  plannedResolutionChapter?: number;
};

export type SeedCompact = {
  id: string;
  seedText: string;
  payoffDescription: string;
  plantWindowStart: number;
  plantWindowEnd: number;
  payoffChapter?: number;
  status: 'pending' | 'planted' | 'paid_off' | 'abandoned';
};

export type WarmTier = {
  sagaSummary: string;
  arcSummary: string;
  activeCharacters: CharacterCompact[];
  arcOpenThreads: ThreadCompact[];
  arcPlantedSeeds: SeedCompact[];
};

export type ChapterSummaryCompact = {
  chapterNumber: number;
  shortSummary: string;
};

export type CanonFactCompact = {
  id: string;
  topic: string;
  fact: string;
  importance: 'low' | 'medium' | 'high' | 'locked';
};

export type ColdTier = {
  recentSummaries: ChapterSummaryCompact[];
  retrievedFacts: CanonFactCompact[];
  retrievedPastChapters: ChapterSummaryCompact[];
  seedsToPlantNow: SeedCompact[];
  packet: ChapterPacket;
};

export type ChapterContext = {
  hot: HotTier;
  warm: WarmTier;
  cold: ColdTier;
  meta: {
    storyId: string;
    chapterNumber: number;
    arcId: string;
    hotHash: string;
    warmHash: string;
    targetInputBudget: number;
  };
};
```

- [ ] **Step 5.2: Write `packages/ai/src/context/compact.ts`**

```ts
import type { CharacterCompact, ThreadCompact, SeedCompact, ChapterSummaryCompact, CanonFactCompact } from './types.js';

// Pure projection helpers. NO db lookups here — caller assembles data first.
// `stripOptional` is the cold-tier shrink mode toggle (Task 9).

export function compactCharacter(c: {
  id: string;
  name: string;
  currentRealm?: string | null;
  status: string;
  bloodlines?: string[] | null;
  faction?: string | null;
  shortTraits?: string[] | null;
}, opts: { stripOptional?: boolean } = {}): CharacterCompact {
  const traits = c.shortTraits ?? [];
  return {
    id: c.id,
    name: c.name,
    currentRealm: opts.stripOptional ? undefined : c.currentRealm ?? undefined,
    status: (['alive', 'dead', 'missing', 'unknown'].includes(c.status) ? c.status : 'unknown') as CharacterCompact['status'],
    bloodlines: c.bloodlines ?? [],
    faction: opts.stripOptional ? undefined : c.faction ?? undefined,
    shortTraits: traits.slice(0, 5),
  };
}

export function compactThread(t: {
  id: string;
  title: string;
  state: string;
  introducedChapter: number;
  plannedResolutionChapter?: number | null;
}): ThreadCompact {
  return {
    id: t.id,
    title: t.title,
    state: (['open', 'partial', 'resolved'].includes(t.state) ? t.state : 'open') as ThreadCompact['state'],
    introducedChapter: t.introducedChapter,
    plannedResolutionChapter: t.plannedResolutionChapter ?? undefined,
  };
}

export function compactSeed(s: {
  id: string;
  seedText: string;
  payoffDescription: string;
  plantWindowStart: number;
  plantWindowEnd: number;
  payoffChapter?: number | null;
  status: string;
}): SeedCompact {
  return {
    id: s.id,
    seedText: s.seedText,
    payoffDescription: s.payoffDescription,
    plantWindowStart: s.plantWindowStart,
    plantWindowEnd: s.plantWindowEnd,
    payoffChapter: s.payoffChapter ?? undefined,
    status: (['pending', 'planted', 'paid_off', 'abandoned'].includes(s.status) ? s.status : 'pending') as SeedCompact['status'],
  };
}

export function compactSummary(s: { chapterNumber: number; shortSummary: string }): ChapterSummaryCompact {
  return { chapterNumber: s.chapterNumber, shortSummary: s.shortSummary };
}

export function compactFact(f: { id: string; topic: string; fact: string; importance: string }): CanonFactCompact {
  const importance = (['low', 'medium', 'high', 'locked'].includes(f.importance) ? f.importance : 'medium') as CanonFactCompact['importance'];
  return { id: f.id, topic: f.topic, fact: f.fact, importance };
}
```

- [ ] **Step 5.3: Write tests `packages/ai/test/context/compact.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { compactCharacter, compactSeed, compactThread } from '../../src/context/compact.js';

describe('compactCharacter', () => {
  it('caps shortTraits at 5', () => {
    const c = compactCharacter({
      id: 'a', name: 'X', status: 'alive',
      shortTraits: ['1', '2', '3', '4', '5', '6', '7'],
    });
    expect(c.shortTraits).toHaveLength(5);
  });

  it('stripOptional removes faction + currentRealm', () => {
    const c = compactCharacter({
      id: 'a', name: 'X', status: 'alive', faction: 'F', currentRealm: 'R',
    }, { stripOptional: true });
    expect(c.faction).toBeUndefined();
    expect(c.currentRealm).toBeUndefined();
  });

  it('coerces unknown status', () => {
    const c = compactCharacter({ id: 'a', name: 'X', status: 'sleeping' });
    expect(c.status).toBe('unknown');
  });
});

describe('compactThread + compactSeed', () => {
  it('handles defaults', () => {
    const t = compactThread({ id: 't', title: 'T', state: 'weird', introducedChapter: 1 });
    expect(t.state).toBe('open');
    const s = compactSeed({
      id: 's', seedText: 'x', payoffDescription: 'y',
      plantWindowStart: 1, plantWindowEnd: 5, status: 'unknown',
    });
    expect(s.status).toBe('pending');
  });
});
```

- [ ] **Step 5.4: Test + commit**

```bash
pnpm --filter @novel/ai test context/compact
git add packages/ai/src/context packages/ai/test/context
git commit -m "feat(ai): context tier types + compact serializers"
```

---

## Task 6: Cache key computation

**Files:**
- Create: `packages/ai/src/context/cache-keys.ts`
- Create: `packages/ai/test/context/cache-keys.test.ts`

- [ ] **Step 6.1: Write `packages/ai/src/context/cache-keys.ts`**

```ts
import { sha256 } from '@novel/core/utils/hash';
import type { CharacterCompact } from './types.js';

export type BibleCacheInputs = {
  version: number;
  compactSummary: string;
  styleGuide: string;
  cultivationSystem: string;
  forbiddenRules: string;
  styleFewShots: { excerpt: string }[];
};

export function computeHotHash(b: BibleCacheInputs): string {
  return sha256(
    [
      `v:${b.version}`,
      `bc:${b.compactSummary}`,
      `sg:${b.styleGuide}`,
      `cs:${b.cultivationSystem}`,
      `fr:${b.forbiddenRules}`,
      `fs:${JSON.stringify(b.styleFewShots.map(s => s.excerpt))}`,
    ].join('::')
  );
}

export type WarmCacheInputs = {
  saga: { id: string; summaryVersion: number };
  arc: { id: string; summaryVersion: number };
  activeCharacters: Pick<CharacterCompact, 'id'>[] & { version?: number }[];
};

export function computeWarmHash(opts: {
  saga: { id: string; summaryVersion: number };
  arc: { id: string; summaryVersion: number };
  activeCharacters: { id: string; version: number }[];
}): string {
  const charsKey = opts.activeCharacters
    .map(c => `${c.id}:${c.version}`)
    .sort()
    .join(',');
  return sha256(
    [
      `saga:${opts.saga.id}:${opts.saga.summaryVersion}`,
      `arc:${opts.arc.id}:${opts.arc.summaryVersion}`,
      `chars:${charsKey}`,
    ].join('::')
  );
}

export function combinedCacheKey(hotHash: string, warmHash: string): string {
  return `${hotHash.slice(0, 16)}.${warmHash.slice(0, 16)}`;
}
```

- [ ] **Step 6.2: Write tests `packages/ai/test/context/cache-keys.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { computeHotHash, computeWarmHash, combinedCacheKey } from '../../src/context/cache-keys.js';

const baseBible = {
  version: 1,
  compactSummary: 'A',
  styleGuide: 'S',
  cultivationSystem: 'C',
  forbiddenRules: 'F',
  styleFewShots: [{ excerpt: 'x' }],
};

describe('computeHotHash', () => {
  it('is deterministic', () => {
    expect(computeHotHash(baseBible)).toBe(computeHotHash(baseBible));
  });
  it('changes when version bumps', () => {
    expect(computeHotHash(baseBible)).not.toBe(computeHotHash({ ...baseBible, version: 2 }));
  });
  it('changes when style guide changes', () => {
    expect(computeHotHash(baseBible)).not.toBe(computeHotHash({ ...baseBible, styleGuide: 'S2' }));
  });
  it('changes when style few-shots change', () => {
    expect(computeHotHash(baseBible)).not.toBe(
      computeHotHash({ ...baseBible, styleFewShots: [{ excerpt: 'y' }] })
    );
  });
});

describe('computeWarmHash', () => {
  const base = {
    saga: { id: 's', summaryVersion: 0 },
    arc: { id: 'a', summaryVersion: 0 },
    activeCharacters: [{ id: 'c1', version: 1 }, { id: 'c2', version: 1 }],
  };

  it('order-independent over characters', () => {
    const reversed = { ...base, activeCharacters: [...base.activeCharacters].reverse() };
    expect(computeWarmHash(base)).toBe(computeWarmHash(reversed));
  });
  it('changes on saga summary bump', () => {
    expect(computeWarmHash(base)).not.toBe(
      computeWarmHash({ ...base, saga: { id: 's', summaryVersion: 1 } })
    );
  });
  it('changes on character version bump', () => {
    expect(computeWarmHash(base)).not.toBe(
      computeWarmHash({ ...base, activeCharacters: [{ id: 'c1', version: 2 }, { id: 'c2', version: 1 }] })
    );
  });
});

describe('combinedCacheKey', () => {
  it('joins truncated halves', () => {
    const k = combinedCacheKey('a'.repeat(64), 'b'.repeat(64));
    expect(k).toBe(`${'a'.repeat(16)}.${'b'.repeat(16)}`);
  });
});
```

- [ ] **Step 6.3: Test + commit**

```bash
pnpm --filter @novel/ai test cache-keys
git add packages/ai/src/context/cache-keys.ts packages/ai/test/context/cache-keys.test.ts
git commit -m "feat(ai): hot/warm cache key computation"
```

---

## Task 7: Retrieval (recent summaries + top-K facts + past chapters)

**Files:**
- Create: `packages/ai/src/context/retrieval.ts`
- Create: `packages/ai/test/context/retrieval.test.ts`

- [ ] **Step 7.1: Write `packages/ai/src/context/retrieval.ts`**

```ts
import { sql } from 'drizzle-orm';
import type { db as DBType } from '@novel/db';
import { chapter_summaries, canon_facts } from '@novel/db/schema';
import { CONTEXT_CONFIG } from '@novel/core/config/context';
import { compactSummary, compactFact } from './compact.js';
import type { ChapterSummaryCompact, CanonFactCompact } from './types.js';

export type RetrievalDeps = {
  db: typeof DBType;
};

export async function getRecentSummaries(
  deps: RetrievalDeps,
  storyId: string,
  beforeChapterNumber: number,
  limit = CONTEXT_CONFIG.RECENT_CHAPTER_SUMMARIES_COUNT
): Promise<ChapterSummaryCompact[]> {
  const rows = await deps.db
    .select({
      chapterNumber: chapter_summaries.chapterNumber,
      shortSummary: chapter_summaries.shortSummary,
    })
    .from(chapter_summaries)
    .where(sql`${chapter_summaries.storyId} = ${storyId} AND ${chapter_summaries.chapterNumber} < ${beforeChapterNumber}`)
    .orderBy(sql`${chapter_summaries.chapterNumber} DESC`)
    .limit(limit);
  return rows.map(compactSummary).reverse();   // chronological for prompt readability
}

export async function getTopKCanonFacts(
  deps: RetrievalDeps,
  storyId: string,
  queryEmbedding: number[],
  opts: {
    topK?: number;
    minImportance?: readonly string[];
  } = {}
): Promise<CanonFactCompact[]> {
  const topK = opts.topK ?? CONTEXT_CONFIG.RETRIEVED_CANON_FACTS_TOP_K;
  const minImportance = opts.minImportance ?? CONTEXT_CONFIG.RETRIEVAL_MIN_IMPORTANCE;
  // pgvector cosine distance: <=> operator. Lower = closer.
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;
  const rows = await deps.db.execute(sql`
    SELECT id, topic, fact, importance
    FROM canon_facts
    WHERE story_id = ${storyId}
      AND importance = ANY(${minImportance as string[]}::text[])
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `);
  return (rows as unknown as { id: string; topic: string; fact: string; importance: string }[]).map(compactFact);
}

export async function getTopKPastChapters(
  deps: RetrievalDeps,
  storyId: string,
  queryEmbedding: number[],
  beforeChapter: number,
  opts: { topK?: number; minGap?: number } = {}
): Promise<ChapterSummaryCompact[]> {
  const topK = opts.topK ?? CONTEXT_CONFIG.RETRIEVED_PAST_CHAPTERS_TOP_K;
  const minGap = opts.minGap ?? CONTEXT_CONFIG.RETRIEVED_PAST_CHAPTERS_MIN_GAP;
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;
  const upperBound = beforeChapter - minGap;
  if (upperBound < 1) return [];
  const rows = await deps.db.execute(sql`
    SELECT chapter_number AS "chapterNumber", short_summary AS "shortSummary"
    FROM chapter_summaries
    WHERE story_id = ${storyId}
      AND chapter_number < ${upperBound}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `);
  return (rows as unknown as { chapterNumber: number; shortSummary: string }[]).map(compactSummary);
}

export async function getDuePlantedSeeds(
  deps: RetrievalDeps,
  storyId: string,
  chapterNumber: number
): Promise<{ id: string; seedText: string; payoffDescription: string; plantWindowStart: number; plantWindowEnd: number; payoffChapter?: number; status: string }[]> {
  const rows = await deps.db.execute(sql`
    SELECT id, seed_text AS "seedText", payoff_description AS "payoffDescription",
           plant_window_start AS "plantWindowStart", plant_window_end AS "plantWindowEnd",
           payoff_chapter AS "payoffChapter", status
    FROM planted_seeds
    WHERE story_id = ${storyId}
      AND status = 'pending'
      AND plant_window_start <= ${chapterNumber}
      AND plant_window_end >= ${chapterNumber}
    ORDER BY plant_window_end ASC
  `);
  return rows as unknown as Array<{ id: string; seedText: string; payoffDescription: string; plantWindowStart: number; plantWindowEnd: number; payoffChapter?: number; status: string }>;
}
```

- [ ] **Step 7.2: Write integration test `packages/ai/test/context/retrieval.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDb, dropTestDb, type TestDb } from '@novel/db/test-helpers';
import { getRecentSummaries, getTopKCanonFacts, getDuePlantedSeeds } from '../../src/context/retrieval.js';

let tdb: TestDb;
beforeAll(async () => { tdb = await createTestDb('retrieval'); });
afterAll(async () => { await dropTestDb(tdb); });

beforeEach(async () => {
  await tdb.db.execute(sql`TRUNCATE chapter_summaries, canon_facts, planted_seeds, stories CASCADE`);
  await tdb.db.execute(sql`INSERT INTO stories (id, title, premise) VALUES ('00000000-0000-0000-0000-000000000001', 't', 'p')`);
});

describe('getRecentSummaries', () => {
  it('returns last N before chapter, oldest first', async () => {
    for (let n = 1; n <= 8; n++) {
      await tdb.db.execute(sql`
        INSERT INTO chapter_summaries (chapter_id, story_id, chapter_number, short_summary, detailed_summary)
        VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', ${n}, ${'s' + n}, ${'d' + n})
      `);
    }
    const out = await getRecentSummaries({ db: tdb.db }, '00000000-0000-0000-0000-000000000001', 8, 5);
    expect(out.map(o => o.chapterNumber)).toEqual([3, 4, 5, 6, 7]);
  });
});

describe('getDuePlantedSeeds', () => {
  it('returns pending seeds whose window covers chapter', async () => {
    await tdb.db.execute(sql`
      INSERT INTO planted_seeds (story_id, seed_text, payoff_description, plant_window_start, plant_window_end, status)
      VALUES
        ('00000000-0000-0000-0000-000000000001', 'a', 'b', 5, 10, 'pending'),
        ('00000000-0000-0000-0000-000000000001', 'c', 'd', 1, 4, 'pending'),
        ('00000000-0000-0000-0000-000000000001', 'e', 'f', 7, 9, 'planted')
    `);
    const out = await getDuePlantedSeeds({ db: tdb.db }, '00000000-0000-0000-0000-000000000001', 7);
    expect(out).toHaveLength(1);
    expect(out[0]!.seedText).toBe('a');
  });
});
```

> The test depends on `@novel/db/test-helpers` exporting `createTestDb` / `dropTestDb`. If Plan 1 didn't add these, create them now in `packages/db/src/test-helpers.ts` (uses `pg` to create a per-test database, runs migrations, returns `{db}`).

- [ ] **Step 7.3: If missing, write `packages/db/src/test-helpers.ts`**

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema/index.js';

export type TestDb = { db: ReturnType<typeof drizzle>; pool: Pool; dbName: string };

export async function createTestDb(label: string): Promise<TestDb> {
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
  const dbName = `test_${label}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`.toLowerCase();
  const adminPool = new Pool({ connectionString: baseUrl });
  await adminPool.query(`CREATE DATABASE "${dbName}"`);
  await adminPool.end();
  const url = baseUrl.replace(/\/[^/]+$/, `/${dbName}`);
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  await db.execute('CREATE EXTENSION IF NOT EXISTS vector');
  await migrate(db, { migrationsFolder: new URL('../migrations', import.meta.url).pathname });
  return { db, pool, dbName };
}

export async function dropTestDb(t: TestDb): Promise<void> {
  await t.pool.end();
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
  const adminPool = new Pool({ connectionString: baseUrl });
  await adminPool.query(`DROP DATABASE IF EXISTS "${t.dbName}"`);
  await adminPool.end();
}
```

Add export `"./test-helpers": "./src/test-helpers.ts"` to `packages/db/package.json` exports.

- [ ] **Step 7.4: Run tests**

```bash
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm --filter @novel/ai test retrieval
```

Expected: PASS (requires Postgres up via `docker compose up -d postgres`).

- [ ] **Step 7.5: Commit**

```bash
git add packages/ai/src/context/retrieval.ts packages/ai/test/context/retrieval.test.ts packages/db
git commit -m "feat(ai): retrieval helpers (recent summaries, top-K facts, past chapters, due seeds)"
```

---

## Task 8: Past-reference detection heuristic

**Files:**
- Create: `packages/ai/src/context/past-reference.ts`
- Create: `packages/ai/test/context/past-reference.test.ts`

- [ ] **Step 8.1: Write `packages/ai/src/context/past-reference.ts`**

```ts
import { CONTEXT_CONFIG } from '@novel/core/config/context';
import type { ChapterPacket } from '../schemas/packet.js';

export function packetReferencesPast(
  packet: ChapterPacket,
  recentCharacterNames: string[]
): { referencesPast: boolean; reason?: string } {
  const haystack = JSON.stringify(packet).toLowerCase();
  for (const kw of CONTEXT_CONFIG.PAST_REFERENCE_KEYWORDS) {
    if (haystack.includes(kw.toLowerCase())) {
      return { referencesPast: true, reason: `keyword:${kw}` };
    }
  }
  // Heuristic 2: a character mentioned in packet that's not in recent list
  const recentSet = new Set(recentCharacterNames.map(n => n.toLowerCase()));
  for (const charName of packet.charactersPresent ?? []) {
    if (!recentSet.has(charName.toLowerCase())) {
      return { referencesPast: true, reason: `unfamiliar_character:${charName}` };
    }
  }
  return { referencesPast: false };
}
```

- [ ] **Step 8.2: Write tests `packages/ai/test/context/past-reference.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { packetReferencesPast } from '../../src/context/past-reference.js';

const basePacket = {
  chapterNumber: 50,
  goal: 'do thing',
  requiredEvents: [],
  charactersPresent: ['Lam Trach'],
  conflict: 'fight',
  cliffhanger: 'reveal',
  forbiddenMoves: [],
} as any;

describe('packetReferencesPast', () => {
  it('flags VN keyword "kiếp trước"', () => {
    const p = { ...basePacket, goal: 'nhớ về kiếp trước của hắn' };
    const r = packetReferencesPast(p, ['Lam Trach']);
    expect(r.referencesPast).toBe(true);
  });
  it('flags unfamiliar character', () => {
    const r = packetReferencesPast(basePacket, ['Hồng Nhi']);
    expect(r.referencesPast).toBe(true);
    expect(r.reason).toContain('Lam Trach');
  });
  it('returns false when nothing suspicious', () => {
    const r = packetReferencesPast(basePacket, ['Lam Trach']);
    expect(r.referencesPast).toBe(false);
  });
});
```

- [ ] **Step 8.3: Test + commit**

```bash
pnpm --filter @novel/ai test past-reference
git add packages/ai/src/context/past-reference.ts packages/ai/test/context/past-reference.test.ts
git commit -m "feat(ai): past-reference heuristic for cold-tier retrieval"
```

---

## Task 9: Shrink ladder

**Files:**
- Create: `packages/ai/src/context/shrink.ts`
- Create: `packages/ai/test/context/shrink.test.ts`

- [ ] **Step 9.1: Write `packages/ai/src/context/shrink.ts`**

```ts
import { CONTEXT_CONFIG } from '@novel/core/config/context';
import { estimateTokensJson } from '@novel/core/utils/tokens';
import type { ColdTier, WarmTier } from './types.js';
import { compactCharacter } from './compact.js';

export type ShrinkResult = {
  warm: WarmTier;
  cold: ColdTier;
  appliedSteps: string[];
};

export class BudgetExceededError extends Error {
  constructor(message: string, public readonly estimatedTokens: number) { super(message); }
}

export function applyShrink(
  warm: WarmTier,
  cold: ColdTier,
  hotTokens: number,
  budget: number
): ShrinkResult {
  let warmOut = warm;
  let coldOut: ColdTier = { ...cold };
  const applied: string[] = [];

  const used = () => hotTokens + estimateTokensJson(warmOut) + estimateTokensJson(coldOut);

  for (const step of CONTEXT_CONFIG.SHRINK_ORDER) {
    if (used() <= budget) break;
    switch (step) {
      case 'retrievedPastChapters':
        if (coldOut.retrievedPastChapters.length > 0) {
          coldOut = { ...coldOut, retrievedPastChapters: [] };
          applied.push(step);
        }
        break;
      case 'retrievedFacts':
        if (coldOut.retrievedFacts.length > 3) {
          coldOut = { ...coldOut, retrievedFacts: coldOut.retrievedFacts.slice(0, 3) };
          applied.push(`${step}:halve`);
        } else if (coldOut.retrievedFacts.length > 0) {
          coldOut = { ...coldOut, retrievedFacts: [] };
          applied.push(`${step}:drop`);
        }
        break;
      case 'recentSummaries':
        if (coldOut.recentSummaries.length > 2) {
          coldOut = { ...coldOut, recentSummaries: coldOut.recentSummaries.slice(-2) };
          applied.push(`${step}:keep2`);
        }
        break;
      case 'activeCharactersCompactMode':
        warmOut = {
          ...warmOut,
          activeCharacters: warmOut.activeCharacters.map(c => compactCharacter(c, { stripOptional: true })),
        };
        applied.push(step);
        break;
    }
  }

  if (used() > budget) {
    throw new BudgetExceededError(
      `Context still exceeds budget after shrink: estimated ${used()} > ${budget}`,
      used()
    );
  }

  return { warm: warmOut, cold: coldOut, appliedSteps: applied };
}
```

- [ ] **Step 9.2: Write tests `packages/ai/test/context/shrink.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { applyShrink, BudgetExceededError } from '../../src/context/shrink.js';

const bigCold = {
  recentSummaries: Array.from({ length: 5 }, (_, i) => ({ chapterNumber: i + 1, shortSummary: 'x'.repeat(800) })),
  retrievedFacts: Array.from({ length: 8 }, (_, i) => ({ id: 'f' + i, topic: 't', fact: 'x'.repeat(400), importance: 'high' as const })),
  retrievedPastChapters: Array.from({ length: 3 }, (_, i) => ({ chapterNumber: i, shortSummary: 'x'.repeat(800) })),
  seedsToPlantNow: [],
  packet: { chapterNumber: 50, goal: 'g', requiredEvents: [], charactersPresent: [], conflict: 'c', cliffhanger: 'h', forbiddenMoves: [] } as any,
};
const warm = {
  sagaSummary: 'x'.repeat(800),
  arcSummary: 'x'.repeat(800),
  activeCharacters: [{ id: 'c1', name: 'X', currentRealm: 'R', faction: 'F', status: 'alive' as const, bloodlines: [], shortTraits: ['a'] }],
  arcOpenThreads: [],
  arcPlantedSeeds: [],
};

describe('applyShrink', () => {
  it('drops retrievedPastChapters first', () => {
    const r = applyShrink(warm, bigCold, 800, 2000);
    expect(r.appliedSteps[0]).toBe('retrievedPastChapters');
  });

  it('preserves cold when within budget', () => {
    const small = { ...bigCold, retrievedPastChapters: [], retrievedFacts: bigCold.retrievedFacts.slice(0, 1), recentSummaries: bigCold.recentSummaries.slice(-1) };
    const r = applyShrink(warm, small, 200, 100_000);
    expect(r.appliedSteps).toEqual([]);
  });

  it('throws BudgetExceededError when nothing left to drop', () => {
    expect(() => applyShrink(warm, bigCold, 9999999, 100)).toThrow(BudgetExceededError);
  });
});
```

- [ ] **Step 9.3: Test + commit**

```bash
pnpm --filter @novel/ai test shrink
git add packages/ai/src/context/shrink.ts packages/ai/test/context/shrink.test.ts
git commit -m "feat(ai): cold-tier shrink ladder with budget enforcement"
```

---

## Task 10: Canonical serialization order

**Files:**
- Create: `packages/ai/src/context/serialize.ts`
- Create: `packages/ai/test/context/serialize.test.ts`

- [ ] **Step 10.1: Write `packages/ai/src/context/serialize.ts`**

```ts
import type { ChapterContext } from './types.js';

// CRITICAL: this order maps to spec Section 4.5. Do NOT reorder. Cache prefix matching depends on it.
//
// HOT (1-5) → WARM (6-10) → COLD (11-15) → INSTRUCTION (16)
//
// Same function used by Writer agent AND LLM Validator so both share the prefix cache.

export function serializeChapterContext(ctx: ChapterContext, opts: { instruction: string }): string {
  const parts: string[] = [];

  // [HOT]
  parts.push('## SYSTEM RULES');
  parts.push(ctx.hot.systemRules);
  parts.push('');
  parts.push('## BIBLE (compact)');
  parts.push(ctx.hot.bibleCompact);
  parts.push('');
  parts.push('## STYLE GUIDE');
  parts.push(ctx.hot.styleGuide);
  parts.push('');
  parts.push('## POWER RULES');
  parts.push(ctx.hot.powerRules);
  parts.push('');
  parts.push('## STYLE FEW-SHOTS');
  ctx.hot.styleFewShots.forEach((s, i) => {
    parts.push(`### Sample ${i + 1}`);
    parts.push(s.excerpt);
  });
  parts.push('');

  // [WARM]
  parts.push('## SAGA SUMMARY');
  parts.push(ctx.warm.sagaSummary);
  parts.push('');
  parts.push('## ARC SUMMARY');
  parts.push(ctx.warm.arcSummary);
  parts.push('');
  parts.push('## ACTIVE CHARACTERS');
  const sortedChars = [...ctx.warm.activeCharacters].sort((a, b) => a.id.localeCompare(b.id));
  sortedChars.forEach(c => {
    parts.push(`- ${c.name} [${c.status}] realm=${c.currentRealm ?? '-'} faction=${c.faction ?? '-'} traits=[${c.shortTraits.join(', ')}]`);
  });
  parts.push('');
  parts.push('## OPEN THREADS (arc)');
  [...ctx.warm.arcOpenThreads].sort((a, b) => a.id.localeCompare(b.id)).forEach(t => {
    parts.push(`- ${t.title} [${t.state}] introduced=ch${t.introducedChapter}${t.plannedResolutionChapter ? ` planned=ch${t.plannedResolutionChapter}` : ''}`);
  });
  parts.push('');
  parts.push('## PLANTED SEEDS (arc)');
  [...ctx.warm.arcPlantedSeeds].sort((a, b) => a.id.localeCompare(b.id)).forEach(s => {
    parts.push(`- seed: ${s.seedText} | payoff: ${s.payoffDescription} | window=ch${s.plantWindowStart}-${s.plantWindowEnd} | status=${s.status}`);
  });
  parts.push('');

  // [COLD]
  parts.push('## RECENT CHAPTER SUMMARIES');
  ctx.cold.recentSummaries.forEach(s => parts.push(`- Ch${s.chapterNumber}: ${s.shortSummary}`));
  parts.push('');
  parts.push('## RETRIEVED CANON FACTS');
  ctx.cold.retrievedFacts.forEach(f => parts.push(`- [${f.importance}] ${f.topic}: ${f.fact}`));
  parts.push('');
  parts.push('## RETRIEVED PAST CHAPTERS');
  ctx.cold.retrievedPastChapters.forEach(s => parts.push(`- Ch${s.chapterNumber}: ${s.shortSummary}`));
  parts.push('');
  parts.push('## SEEDS TO PLANT NOW');
  ctx.cold.seedsToPlantNow.forEach(s => parts.push(`- MUST plant: ${s.seedText} (pays off: ${s.payoffDescription})`));
  parts.push('');
  parts.push('## CHAPTER PACKET');
  parts.push(JSON.stringify(ctx.cold.packet, null, 2));
  parts.push('');

  // [INSTRUCTION]
  parts.push('## INSTRUCTION');
  parts.push(opts.instruction);

  return parts.join('\n');
}
```

- [ ] **Step 10.2: Write tests `packages/ai/test/context/serialize.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { serializeChapterContext } from '../../src/context/serialize.js';

const ctx = {
  hot: {
    systemRules: 'SR', bibleCompact: 'BC', styleGuide: 'SG', powerRules: 'PR',
    styleFewShots: [{ excerpt: 'fs1' }, { excerpt: 'fs2' }],
  },
  warm: {
    sagaSummary: 'SAGA', arcSummary: 'ARC',
    activeCharacters: [
      { id: 'b', name: 'B', status: 'alive' as const, bloodlines: [], shortTraits: [] },
      { id: 'a', name: 'A', status: 'alive' as const, bloodlines: [], shortTraits: [] },
    ],
    arcOpenThreads: [],
    arcPlantedSeeds: [],
  },
  cold: {
    recentSummaries: [{ chapterNumber: 1, shortSummary: 's1' }],
    retrievedFacts: [],
    retrievedPastChapters: [],
    seedsToPlantNow: [],
    packet: { chapterNumber: 2, goal: 'g', requiredEvents: [], charactersPresent: [], conflict: 'c', cliffhanger: 'h', forbiddenMoves: [] } as any,
  },
  meta: { storyId: 's', chapterNumber: 2, arcId: 'a', hotHash: 'h', warmHash: 'w', targetInputBudget: 6000 },
};

describe('serializeChapterContext', () => {
  it('emits sections in HOT → WARM → COLD → INSTRUCTION order', () => {
    const out = serializeChapterContext(ctx, { instruction: 'Write ch2.' });
    const order = [
      out.indexOf('## SYSTEM RULES'),
      out.indexOf('## BIBLE'),
      out.indexOf('## STYLE GUIDE'),
      out.indexOf('## POWER RULES'),
      out.indexOf('## STYLE FEW-SHOTS'),
      out.indexOf('## SAGA SUMMARY'),
      out.indexOf('## ARC SUMMARY'),
      out.indexOf('## ACTIVE CHARACTERS'),
      out.indexOf('## OPEN THREADS'),
      out.indexOf('## PLANTED SEEDS (arc)'),
      out.indexOf('## RECENT CHAPTER SUMMARIES'),
      out.indexOf('## RETRIEVED CANON FACTS'),
      out.indexOf('## RETRIEVED PAST CHAPTERS'),
      out.indexOf('## SEEDS TO PLANT NOW'),
      out.indexOf('## CHAPTER PACKET'),
      out.indexOf('## INSTRUCTION'),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThan(order[i - 1]!);
    }
  });

  it('sorts active characters by id (stable cache prefix)', () => {
    const out = serializeChapterContext(ctx, { instruction: '' });
    const aIdx = out.indexOf('- A ');
    const bIdx = out.indexOf('- B ');
    expect(aIdx).toBeGreaterThan(0);
    expect(aIdx).toBeLessThan(bIdx);
  });

  it('produces identical output for identical input (cache prefix stability)', () => {
    const a = serializeChapterContext(ctx, { instruction: 'Write ch2.' });
    const b = serializeChapterContext(ctx, { instruction: 'Write ch2.' });
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 10.3: Test + commit**

```bash
pnpm --filter @novel/ai test serialize
git add packages/ai/src/context/serialize.ts packages/ai/test/context/serialize.test.ts
git commit -m "feat(ai): canonical context serializer (cache-prefix stable)"
```

---

## Task 11: Context Builder (assemble all tiers + persist context_packets)

**Files:**
- Create: `packages/ai/src/context/builder.ts`
- Create: `packages/ai/test/context/builder.test.ts`
- Modify: `packages/ai/src/index.ts`

- [ ] **Step 11.1: Write `packages/ai/src/context/builder.ts`**

```ts
import type { Logger } from 'pino';
import { sql } from 'drizzle-orm';
import type { db as DBType } from '@novel/db';
import { context_packets, story_bibles, sagas, arcs, characters, chapter_packets } from '@novel/db/schema';
import { CONTEXT_CONFIG } from '@novel/core/config/context';
import { estimateTokens, estimateTokensJson } from '@novel/core/utils/tokens';
import type { EmbeddingService } from '../embeddings/types.js';
import { computeHotHash, computeWarmHash } from './cache-keys.js';
import { compactCharacter, compactSeed, compactThread } from './compact.js';
import { getRecentSummaries, getTopKCanonFacts, getTopKPastChapters, getDuePlantedSeeds } from './retrieval.js';
import { packetReferencesPast } from './past-reference.js';
import { applyShrink } from './shrink.js';
import { serializeChapterContext } from './serialize.js';
import type { ChapterContext, HotTier, WarmTier, ColdTier } from './types.js';
import type { ChapterPacket } from '../schemas/packet.js';

export type ContextBuilderDeps = {
  db: typeof DBType;
  embeddings: EmbeddingService;
  logger: Logger;
};

export type ContextBuildParams = {
  storyId: string;
  chapterNumber: number;
  arcId: string;
  chapterPacketId: string;
  importance?: 'normal' | 'important';
  traceId: string;
};

export type ContextBuildResult = {
  context: ChapterContext;
  serialized: string;
  cacheKey: string;
  estimatedInputTokens: number;
  contextPacketId: string;
};

const SYSTEM_RULES = `Bạn là tác giả tiểu thuyết tiên hiệp/huyền huyễn tiếng Việt. Tuân thủ nghiêm ngặt BIBLE, STYLE GUIDE, POWER RULES. Không phá luật cấm. Mỗi chương ~2000-3000 từ.`;

export class ContextBuilder {
  constructor(private readonly deps: ContextBuilderDeps) {}

  async build(params: ContextBuildParams): Promise<ContextBuildResult> {
    const log = this.deps.logger.child({ traceId: params.traceId, storyId: params.storyId, chapterNumber: params.chapterNumber });
    const budget = params.importance === 'important'
      ? CONTEXT_CONFIG.TOKEN_BUDGET_IMPORTANT
      : CONTEXT_CONFIG.TOKEN_BUDGET_NORMAL;

    // 1. Load packet
    const packetRow = (await this.deps.db.select().from(chapter_packets).where(sql`id = ${params.chapterPacketId}`).limit(1))[0];
    if (!packetRow) throw new Error(`packet not found: ${params.chapterPacketId}`);
    const packet = packetRow.payload as ChapterPacket;

    // 2. HOT
    const hot = await this.buildHot(params.storyId);
    const hotHash = computeHotHash({
      version: hot._bibleVersion,
      compactSummary: hot.bibleCompact,
      styleGuide: hot.styleGuide,
      cultivationSystem: hot.powerRules,
      forbiddenRules: hot._forbiddenRules,
      styleFewShots: hot.styleFewShots,
    });

    // 3. WARM
    const warmRaw = await this.buildWarm(params.storyId, params.arcId, packet);
    const warmHash = computeWarmHash({
      saga: warmRaw._saga,
      arc: warmRaw._arc,
      activeCharacters: warmRaw._activeCharVersions,
    });

    // 4. COLD
    const cold = await this.buildCold(params.storyId, params.chapterNumber, packet, warmRaw.activeCharacters.map(c => c.name));

    // 5. Assemble + shrink
    const hotTokens = estimateTokensJson(hot);
    const shrunk = applyShrink(warmRaw, cold, hotTokens, budget);

    const context: ChapterContext = {
      hot: this.stripInternal(hot),
      warm: shrunk.warm,
      cold: shrunk.cold,
      meta: {
        storyId: params.storyId,
        chapterNumber: params.chapterNumber,
        arcId: params.arcId,
        hotHash, warmHash,
        targetInputBudget: budget,
      },
    };

    const serialized = serializeChapterContext(context, {
      instruction: `Viết Chương ${params.chapterNumber}. Đầu ra: tiêu đề + nội dung. Tuân thủ packet và mọi seed phải plant.`,
    });
    const estimatedInputTokens = estimateTokens(serialized);

    // 6. Persist context_packet row
    const inserted = await this.deps.db.insert(context_packets).values({
      chapterId: null,           // chapter doesn't exist yet
      hotTierHash: hotHash,
      warmTierHash: warmHash,
      coldPayload: cold as unknown as Record<string, unknown>,
      totalInputTokens: estimatedInputTokens,
      cachedInputTokens: 0,      // updated post-call from llm response
      configSnapshot: { CONTEXT_CONFIG } as unknown as Record<string, unknown>,
    }).returning({ id: context_packets.id });

    const contextPacketId = inserted[0]!.id;
    log.info({ contextPacketId, hotHash: hotHash.slice(0, 8), warmHash: warmHash.slice(0, 8), estimatedInputTokens, shrinkSteps: shrunk.appliedSteps }, 'context built');

    return {
      context,
      serialized,
      cacheKey: `${hotHash.slice(0, 16)}.${warmHash.slice(0, 16)}`,
      estimatedInputTokens,
      contextPacketId,
    };
  }

  private async buildHot(storyId: string): Promise<HotTier & { _bibleVersion: number; _forbiddenRules: string }> {
    const row = (await this.deps.db.select().from(story_bibles).where(sql`story_id = ${storyId}`).limit(1))[0];
    if (!row) throw new Error(`bible not found for story ${storyId}`);
    const bible = row.payload as {
      compact_summary: string; style_guide: string; cultivation_system: string;
      world_rules: string; forbidden_rules: string;
    };
    return {
      systemRules: SYSTEM_RULES,
      bibleCompact: bible.compact_summary,
      styleGuide: bible.style_guide,
      powerRules: `${bible.cultivation_system}\n\nFORBIDDEN: ${bible.forbidden_rules}`,
      styleFewShots: (row.styleFewShots as { excerpt: string }[]) ?? [],
      _bibleVersion: row.version ?? 1,
      _forbiddenRules: bible.forbidden_rules,
    };
  }

  private stripInternal(hot: HotTier & { _bibleVersion: number; _forbiddenRules: string }): HotTier {
    const { _bibleVersion, _forbiddenRules, ...rest } = hot;
    return rest;
  }

  private async buildWarm(storyId: string, arcId: string, packet: ChapterPacket): Promise<WarmTier & {
    _saga: { id: string; summaryVersion: number };
    _arc: { id: string; summaryVersion: number };
    _activeCharVersions: { id: string; version: number }[];
  }> {
    const arcRow = (await this.deps.db.select().from(arcs).where(sql`id = ${arcId}`).limit(1))[0];
    if (!arcRow) throw new Error(`arc not found: ${arcId}`);
    const sagaRow = (await this.deps.db.select().from(sagas).where(sql`id = ${arcRow.sagaId}`).limit(1))[0];
    if (!sagaRow) throw new Error(`saga not found: ${arcRow.sagaId}`);

    // Active characters = those listed in packet.charactersPresent + status='alive' main cast
    const namesNeeded = packet.charactersPresent ?? [];
    const charRows = namesNeeded.length === 0 ? [] : await this.deps.db
      .select()
      .from(characters)
      .where(sql`story_id = ${storyId} AND name = ANY(${namesNeeded}::text[])`);

    const openThreadRows = await this.deps.db.execute(sql`
      SELECT id, title, state, introduced_chapter AS "introducedChapter",
             planned_resolution_chapter AS "plannedResolutionChapter"
      FROM open_threads
      WHERE story_id = ${storyId} AND arc_id = ${arcId} AND state IN ('open','partial')
      LIMIT 50
    `);
    const seedRows = await this.deps.db.execute(sql`
      SELECT id, seed_text AS "seedText", payoff_description AS "payoffDescription",
             plant_window_start AS "plantWindowStart", plant_window_end AS "plantWindowEnd",
             payoff_chapter AS "payoffChapter", status
      FROM planted_seeds
      WHERE story_id = ${storyId} AND status IN ('pending','planted')
      LIMIT 50
    `);

    return {
      sagaSummary: sagaRow.rollingSummary ?? '(saga summary not yet generated)',
      arcSummary: arcRow.rollingSummary ?? '(arc summary not yet generated)',
      activeCharacters: charRows.map(c => compactCharacter(c)),
      arcOpenThreads: (openThreadRows as unknown as Parameters<typeof compactThread>[0][]).map(compactThread),
      arcPlantedSeeds: (seedRows as unknown as Parameters<typeof compactSeed>[0][]).map(compactSeed),
      _saga: { id: sagaRow.id, summaryVersion: sagaRow.summaryVersion ?? 0 },
      _arc: { id: arcRow.id, summaryVersion: arcRow.summaryVersion ?? 0 },
      _activeCharVersions: charRows.map(c => ({ id: c.id, version: c.version ?? 1 })),
    };
  }

  private async buildCold(
    storyId: string,
    chapterNumber: number,
    packet: ChapterPacket,
    activeCharNames: string[]
  ): Promise<ColdTier> {
    const recentSummaries = await getRecentSummaries({ db: this.deps.db }, storyId, chapterNumber);

    const queryString = `${packet.goal} ${(packet.requiredEvents ?? []).join(' ')} ${(packet.charactersPresent ?? []).join(' ')}`;
    const queryEmbed = await this.deps.embeddings.embed({ input: queryString, traceId: `ctx:${storyId}:${chapterNumber}` });
    const retrievedFacts = await getTopKCanonFacts({ db: this.deps.db }, storyId, queryEmbed.vector);

    let retrievedPastChapters: ColdTier['retrievedPastChapters'] = [];
    const pastRef = packetReferencesPast(packet, activeCharNames);
    if (pastRef.referencesPast) {
      retrievedPastChapters = await getTopKPastChapters({ db: this.deps.db }, storyId, queryEmbed.vector, chapterNumber);
    }

    const seedsToPlantNow = (await getDuePlantedSeeds({ db: this.deps.db }, storyId, chapterNumber)).map(compactSeed);

    return { recentSummaries, retrievedFacts, retrievedPastChapters, seedsToPlantNow, packet };
  }
}
```

- [ ] **Step 11.2: Write integration test `packages/ai/test/context/builder.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import pino from 'pino';
import { createTestDb, dropTestDb, type TestDb } from '@novel/db/test-helpers';
import { MockEmbeddingService } from '../../src/embeddings/mock.js';
import { ContextBuilder } from '../../src/context/builder.js';

let tdb: TestDb;
beforeAll(async () => { tdb = await createTestDb('builder'); });
afterAll(async () => { await dropTestDb(tdb); });

const STORY = '00000000-0000-0000-0000-000000000010';
const SAGA  = '00000000-0000-0000-0000-000000000020';
const ARC   = '00000000-0000-0000-0000-000000000030';
const PACKET = '00000000-0000-0000-0000-000000000040';

beforeEach(async () => {
  await tdb.db.execute(sql`TRUNCATE stories, story_bibles, sagas, arcs, characters, chapter_packets, chapter_summaries, planted_seeds, canon_facts, open_threads, context_packets CASCADE`);
  await tdb.db.execute(sql`INSERT INTO stories (id, title, premise) VALUES (${STORY}, 't', 'p')`);
  await tdb.db.execute(sql`INSERT INTO story_bibles (story_id, payload, version, style_few_shots) VALUES (${STORY}, ${JSON.stringify({ compact_summary: 'BC', style_guide: 'SG', cultivation_system: 'CS', world_rules: 'W', forbidden_rules: 'FR' })}::jsonb, 1, ${JSON.stringify([{ excerpt: 'fs1' }])}::jsonb)`);
  await tdb.db.execute(sql`INSERT INTO sagas (id, story_id, saga_number, title, rolling_summary, summary_version) VALUES (${SAGA}, ${STORY}, 1, 'Saga 1', 'SAGA SUM', 1)`);
  await tdb.db.execute(sql`INSERT INTO arcs (id, story_id, saga_id, arc_number, title, rolling_summary, summary_version) VALUES (${ARC}, ${STORY}, ${SAGA}, 1, 'Arc 1', 'ARC SUM', 1)`);
  await tdb.db.execute(sql`INSERT INTO chapter_packets (id, story_id, arc_id, chapter_number, payload) VALUES (${PACKET}, ${STORY}, ${ARC}, 5, ${JSON.stringify({ chapterNumber: 5, goal: 'g', requiredEvents: [], charactersPresent: [], conflict: 'c', cliffhanger: 'h', forbiddenMoves: [] })}::jsonb)`);
});

describe('ContextBuilder', () => {
  it('assembles + persists context_packets row', async () => {
    const cb = new ContextBuilder({
      db: tdb.db,
      embeddings: new MockEmbeddingService(),
      logger: pino({ level: 'silent' }),
    });
    const r = await cb.build({
      storyId: STORY, chapterNumber: 5, arcId: ARC, chapterPacketId: PACKET, traceId: 't',
    });
    expect(r.contextPacketId).toBeTruthy();
    expect(r.context.meta.hotHash).toHaveLength(64);
    expect(r.serialized).toContain('## SYSTEM RULES');
    expect(r.serialized).toContain('## CHAPTER PACKET');
    const stored = (await tdb.db.execute(sql`SELECT * FROM context_packets WHERE id = ${r.contextPacketId}`)) as unknown as Array<{ hot_tier_hash: string }>;
    expect(stored[0]!.hot_tier_hash).toBe(r.context.meta.hotHash);
  });
});
```

- [ ] **Step 11.3: Update `packages/ai/src/index.ts`** — append `export * from './context/builder.js';` (and the other context modules).

- [ ] **Step 11.4: Test + commit**

```bash
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm --filter @novel/ai test builder
git add packages/ai/src/context packages/ai/test/context/builder.test.ts packages/ai/src/index.ts
git commit -m "feat(ai): ContextBuilder assembles HOT/WARM/COLD + persists context_packets"
```

---

## Task 12: ChapterPacket Zod schema

**Files:**
- Create: `packages/ai/src/schemas/packet.ts`
- Create: `packages/ai/test/schemas/packet.test.ts`

- [ ] **Step 12.1: Write `packages/ai/src/schemas/packet.ts`**

```ts
import { z } from 'zod';

export const ChapterPacketSchema = z.object({
  chapterNumber: z.number().int().positive(),
  goal: z.string().min(1).max(500),
  requiredEvents: z.array(z.object({
    description: z.string().min(1).max(300),
    seedId: z.string().uuid().optional(),       // populated when this event resolves a planted seed
  })).max(8),
  charactersPresent: z.array(z.string().min(1)).max(20),
  setting: z.string().max(300).optional(),
  conflict: z.string().min(1).max(500),
  cliffhanger: z.string().min(1).max(300),
  forbiddenMoves: z.array(z.string()).max(20),
  toneHints: z.array(z.string()).max(5).optional(),
  notes: z.string().max(500).optional(),
});

export type ChapterPacket = z.infer<typeof ChapterPacketSchema>;

// JSON Schema view for Gemini structured output. Generated from Zod via zod-to-json-schema upstream
// or hand-mirrored when shipping a Gemini responseSchema (Gemini accepts a subset of JSON Schema).
export const CHAPTER_PACKET_JSON_SCHEMA = {
  type: 'object',
  properties: {
    chapterNumber: { type: 'integer' },
    goal: { type: 'string' },
    requiredEvents: {
      type: 'array',
      items: {
        type: 'object',
        properties: { description: { type: 'string' }, seedId: { type: 'string' } },
        required: ['description'],
      },
    },
    charactersPresent: { type: 'array', items: { type: 'string' } },
    setting: { type: 'string' },
    conflict: { type: 'string' },
    cliffhanger: { type: 'string' },
    forbiddenMoves: { type: 'array', items: { type: 'string' } },
    toneHints: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['chapterNumber', 'goal', 'requiredEvents', 'charactersPresent', 'conflict', 'cliffhanger', 'forbiddenMoves'],
} as const;
```

- [ ] **Step 12.2: Write tests `packages/ai/test/schemas/packet.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { ChapterPacketSchema } from '../../src/schemas/packet.js';

describe('ChapterPacketSchema', () => {
  it('accepts minimal valid packet', () => {
    const out = ChapterPacketSchema.parse({
      chapterNumber: 1, goal: 'g', requiredEvents: [], charactersPresent: [],
      conflict: 'c', cliffhanger: 'h', forbiddenMoves: [],
    });
    expect(out.chapterNumber).toBe(1);
  });
  it('rejects empty conflict', () => {
    expect(() => ChapterPacketSchema.parse({
      chapterNumber: 1, goal: 'g', requiredEvents: [], charactersPresent: [],
      conflict: '', cliffhanger: 'h', forbiddenMoves: [],
    })).toThrow();
  });
  it('rejects > 8 required events', () => {
    expect(() => ChapterPacketSchema.parse({
      chapterNumber: 1, goal: 'g',
      requiredEvents: Array.from({ length: 9 }, () => ({ description: 'x' })),
      charactersPresent: [], conflict: 'c', cliffhanger: 'h', forbiddenMoves: [],
    })).toThrow();
  });
});
```

- [ ] **Step 12.3: Test + commit**

```bash
pnpm --filter @novel/ai test packet
git add packages/ai/src/schemas/packet.ts packages/ai/test/schemas/packet.test.ts
git commit -m "feat(ai): ChapterPacket Zod schema + Gemini JSON schema"
```

---

## Task 13: Packet generator prompt v1

**Files:**
- Create: `packages/ai/src/prompts/packet-generator.v1.ts`
- Modify: `packages/ai/src/prompts/registry.ts` (register v1)

- [ ] **Step 13.1: Write `packages/ai/src/prompts/packet-generator.v1.ts`**

```ts
import type { PromptTemplate } from './registry.js';

export type PacketGeneratorPromptInput = {
  bibleCompact: string;
  arcSummary: string;
  recentChapterSummaries: { chapterNumber: number; shortSummary: string }[];
  activeCharacters: { name: string; currentRealm?: string; status: string; faction?: string }[];
  openThreads: { title: string; state: string }[];
  duePlantedSeeds: { id: string; seedText: string; payoffDescription: string; plantWindowEnd: number }[];
  overdueThreads: { title: string; introducedChapter: number }[];
  forbiddenRules: string;
  chapterNumber: number;
  arcGoals: string;
};

export const packetGeneratorPromptV1: PromptTemplate<PacketGeneratorPromptInput> = {
  agentRole: 'packet_generator',
  version: 'v1',
  build: (input) => ({
    system: `Bạn là planner chương cho tiểu thuyết tiên hiệp tiếng Việt. Trả JSON đúng schema. KHÔNG viết nội dung chương — chỉ kế hoạch.`,
    user: [
      `# BIBLE`, input.bibleCompact, '',
      `# ARC HIỆN TẠI`, input.arcSummary, '',
      `# ARC GOALS`, input.arcGoals, '',
      `# 5 CHƯƠNG GẦN NHẤT`,
      ...input.recentChapterSummaries.map(s => `- Ch${s.chapterNumber}: ${s.shortSummary}`),
      '',
      `# NHÂN VẬT ĐANG HOẠT ĐỘNG`,
      ...input.activeCharacters.map(c => `- ${c.name} [${c.status}] realm=${c.currentRealm ?? '-'} faction=${c.faction ?? '-'}`),
      '',
      `# THREADS ĐANG MỞ`,
      ...input.openThreads.map(t => `- ${t.title} [${t.state}]`),
      '',
      `# SEEDS PHẢI PLANT TRONG CHƯƠNG NÀY`,
      ...input.duePlantedSeeds.map(s => `- (id=${s.id}) MUST plant: "${s.seedText}" — pays off: ${s.payoffDescription} — window ends ch${s.plantWindowEnd}`),
      '',
      input.overdueThreads.length > 0 ? `# THREAD QUÁ HẠN — cần resolve sớm:` : '',
      ...input.overdueThreads.map(t => `- ${t.title} (intro ch${t.introducedChapter})`),
      '',
      `# CẤM`, input.forbiddenRules, '',
      `# YÊU CẦU`,
      `Lập kế hoạch chương ${input.chapterNumber}.`,
      `BẮT BUỘC: ít nhất 1 conflict + 1 cliffhanger.`,
      `BẮT BUỘC: requiredEvents phải gồm các "MUST plant" seed ở trên (gắn seedId).`,
      `forbiddenMoves: liệt kê những đòn từ # CẤM mà chương này KHÔNG được dùng.`,
      `Trả về JSON theo schema ChapterPacket.`,
    ].filter(Boolean).join('\n'),
  }),
};
```

- [ ] **Step 13.2: Register in `packages/ai/src/prompts/registry.ts`**

Append to the existing `prompts` map:

```ts
import { packetGeneratorPromptV1 } from './packet-generator.v1.js';
// ...
registerPrompt(packetGeneratorPromptV1);
```

- [ ] **Step 13.3: Commit**

```bash
git add packages/ai/src/prompts
git commit -m "feat(ai): packet generator prompt v1"
```

---

## Task 14: Packet Generator agent

**Files:**
- Create: `packages/ai/src/agents/packet-generator.ts`
- Create: `packages/ai/test/agents/packet-generator.test.ts`

- [ ] **Step 14.1: Write `packages/ai/src/agents/packet-generator.ts`**

```ts
import type { Logger } from 'pino';
import { MODEL_CONFIG } from '@novel/core/config/models';
import type { LLMProvider } from '../providers/types.js';
import { ChapterPacketSchema, CHAPTER_PACKET_JSON_SCHEMA, type ChapterPacket } from '../schemas/packet.js';
import { packetGeneratorPromptV1, type PacketGeneratorPromptInput } from '../prompts/packet-generator.v1.js';

export type PacketGeneratorDeps = {
  provider: LLMProvider;
  logger: Logger;
};

export type PacketGenerationResult = {
  packet: ChapterPacket;
  promptVersion: string;
  rawJson: string;
  llmCallId: string;
};

export class PacketGenerator {
  constructor(private readonly deps: PacketGeneratorDeps) {}

  async generate(input: PacketGeneratorPromptInput, ctx: { traceId: string; storyId: string; auditHints?: string[] }): Promise<PacketGenerationResult> {
    const log = this.deps.logger.child({ traceId: ctx.traceId, agent: 'packet_generator' });
    const built = packetGeneratorPromptV1.build(input);
    const userWithHints = ctx.auditHints && ctx.auditHints.length > 0
      ? `${built.user}\n\n# REGENERATION HINTS (sửa lỗi audit)\n${ctx.auditHints.map(h => `- ${h}`).join('\n')}`
      : built.user;

    const res = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.packet_generator,
      system: built.system,
      messages: [{ role: 'user', content: userWithHints }],
      responseSchema: CHAPTER_PACKET_JSON_SCHEMA,
      temperature: 0.4,
      traceId: ctx.traceId,
      agentRole: 'packet_generator',
      promptVersion: packetGeneratorPromptV1.version,
      storyId: ctx.storyId,
    });

    let parsed: ChapterPacket;
    try {
      const json = JSON.parse(res.text);
      parsed = ChapterPacketSchema.parse(json);
    } catch (err) {
      log.error({ err, raw: res.text.slice(0, 500) }, 'packet parse failed');
      throw err;
    }

    return {
      packet: parsed,
      promptVersion: packetGeneratorPromptV1.version,
      rawJson: res.text,
      llmCallId: res.llmCallId,
    };
  }
}
```

- [ ] **Step 14.2: Write test `packages/ai/test/agents/packet-generator.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { PacketGenerator } from '../../src/agents/packet-generator.js';
import { MockLLMProvider } from '../../src/providers/mock.js';

describe('PacketGenerator', () => {
  it('parses valid mocked JSON output', async () => {
    const provider = new MockLLMProvider({
      responses: [{
        text: JSON.stringify({
          chapterNumber: 1, goal: 'g',
          requiredEvents: [{ description: 'meet master' }],
          charactersPresent: ['Lam Trach'],
          conflict: 'c', cliffhanger: 'h', forbiddenMoves: [],
        }),
        llmCallId: 'mock-1',
        usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 50 },
        cost: 0.0001,
      }],
    });
    const gen = new PacketGenerator({ provider, logger: pino({ level: 'silent' }) });
    const r = await gen.generate({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [], overdueThreads: [],
      forbiddenRules: '', chapterNumber: 1, arcGoals: 'g',
    }, { traceId: 't', storyId: 's' });
    expect(r.packet.chapterNumber).toBe(1);
    expect(r.packet.requiredEvents).toHaveLength(1);
  });

  it('throws on schema-invalid JSON', async () => {
    const provider = new MockLLMProvider({
      responses: [{ text: '{"chapterNumber":-1}', llmCallId: 'm', usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 }, cost: 0 }],
    });
    const gen = new PacketGenerator({ provider, logger: pino({ level: 'silent' }) });
    await expect(gen.generate({} as any, { traceId: 't', storyId: 's' })).rejects.toThrow();
  });
});
```

- [ ] **Step 14.3: Test + commit**

```bash
pnpm --filter @novel/ai test packet-generator
git add packages/ai/src/agents/packet-generator.ts packages/ai/test/agents/packet-generator.test.ts
git commit -m "feat(ai): packet generator agent (structured output via Gemini)"
```

---

## Task 15: Packet Auditor (code-only)

**Files:**
- Create: `packages/ai/src/validators/packet-auditor.ts`
- Create: `packages/ai/test/validators/packet-auditor.test.ts`

- [ ] **Step 15.1: Write `packages/ai/src/validators/packet-auditor.ts`**

```ts
import { GENERATION_CONFIG } from '@novel/core/config/generation';
import type { ChapterPacket } from '../schemas/packet.js';

export type AuditInput = {
  packet: ChapterPacket;
  characters: { name: string; status: string; currentRealm?: string }[];   // canon snapshot
  forbiddenRules: string;          // raw text from bible
  duePlantedSeeds: { id: string; seedText: string; plantWindowEnd: number }[];
};

export type AuditIssue = {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
};

export type AuditResult = {
  pass: boolean;
  issues: AuditIssue[];
  requiresRegenerate: boolean;
};

const REALM_ORDER = [
  'phàm nhân', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh', 'hóa thần', 'luyện hư', 'hợp thể', 'đại thừa', 'độ kiếp',
];

function realmRank(r?: string): number {
  if (!r) return -1;
  const lower = r.toLowerCase();
  return REALM_ORDER.findIndex(x => lower.includes(x));
}

export function auditPacket(input: AuditInput): AuditResult {
  const issues: AuditIssue[] = [];

  // dead character listed?
  const charByName = new Map(input.characters.map(c => [c.name.toLowerCase(), c]));
  for (const name of input.packet.charactersPresent) {
    const c = charByName.get(name.toLowerCase());
    if (c && c.status === 'dead') {
      issues.push({ code: 'dead_character', severity: 'critical', message: `Nhân vật "${name}" đã chết theo canon nhưng có mặt trong packet.` });
    }
  }

  // forbiddenMoves collide with bible.forbidden_rules wording?
  const forbiddenLower = input.forbiddenRules.toLowerCase();
  for (const move of input.packet.forbiddenMoves) {
    if (move.length > 0 && !forbiddenLower.includes(move.toLowerCase().split(/\s+/)[0]!.slice(0, 4))) {
      // soft heuristic — only flag if literally absent from rules text
      // (allowed: this is intentionally lax; deterministic validator does the strict check on output)
    }
  }

  // due seeds resolved?
  const eventIds = new Set(input.packet.requiredEvents.map(e => e.seedId).filter(Boolean));
  for (const seed of input.duePlantedSeeds) {
    if (input.packet.chapterNumber >= seed.plantWindowEnd && !eventIds.has(seed.id)) {
      issues.push({
        code: 'unresolved_due_seed',
        severity: seed.plantWindowEnd === input.packet.chapterNumber ? 'critical' : 'high',
        message: `Seed "${seed.seedText}" (id=${seed.id}) phải plant trước/tại ch${seed.plantWindowEnd} nhưng không xuất hiện trong requiredEvents.`,
      });
    }
  }

  // structural: at least 1 conflict + 1 cliffhanger
  if (!input.packet.conflict || input.packet.conflict.trim().length < 8) {
    issues.push({ code: 'missing_conflict', severity: 'high', message: 'Packet thiếu conflict rõ ràng.' });
  }
  if (!input.packet.cliffhanger || input.packet.cliffhanger.trim().length < 8) {
    issues.push({ code: 'missing_cliffhanger', severity: 'high', message: 'Packet thiếu cliffhanger rõ ràng.' });
  }

  // realm jump check (packet doesn't directly state realm jumps; this is forward-looking heuristic on requiredEvents)
  for (const c of input.packet.charactersPresent) {
    const canonChar = charByName.get(c.toLowerCase());
    if (!canonChar) continue;
    const startRank = realmRank(canonChar.currentRealm);
    const matchInEvents = input.packet.requiredEvents.find(e => /đột phá|breakthrough|thăng cấp/i.test(e.description));
    if (matchInEvents && startRank >= 0) {
      // Heuristic: any "đột phá" event is fine (one realm), but flag if multiple in same packet
      const breakCount = input.packet.requiredEvents.filter(e => /đột phá|breakthrough|thăng cấp/i.test(e.description)).length;
      if (breakCount > GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER) {
        issues.push({
          code: 'realm_jump_excess',
          severity: 'critical',
          message: `Packet đề xuất ${breakCount} đột phá trong cùng 1 chương (max ${GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER}).`,
        });
      }
    }
  }

  const hasCritical = issues.some(i => i.severity === 'critical');
  const hasHigh = issues.some(i => i.severity === 'high');

  return {
    pass: !hasCritical && !hasHigh,
    issues,
    requiresRegenerate: hasCritical || hasHigh,
  };
}
```

- [ ] **Step 15.2: Write tests `packages/ai/test/validators/packet-auditor.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { auditPacket } from '../../src/validators/packet-auditor.js';

const basePacket = {
  chapterNumber: 5,
  goal: 'g',
  requiredEvents: [{ description: 'fight bandit' }],
  charactersPresent: ['Lam Trach'],
  conflict: 'fight bandits in forest',
  cliffhanger: 'mysterious figure appears',
  forbiddenMoves: [],
};
const aliveChar = { name: 'Lam Trach', status: 'alive', currentRealm: 'luyện khí' };

describe('auditPacket', () => {
  it('passes valid packet', () => {
    const r = auditPacket({ packet: basePacket as any, characters: [aliveChar], forbiddenRules: '', duePlantedSeeds: [] });
    expect(r.pass).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it('flags dead character', () => {
    const r = auditPacket({ packet: basePacket as any, characters: [{ ...aliveChar, status: 'dead' }], forbiddenRules: '', duePlantedSeeds: [] });
    expect(r.pass).toBe(false);
    expect(r.issues[0]!.code).toBe('dead_character');
  });

  it('flags missing cliffhanger', () => {
    const r = auditPacket({ packet: { ...basePacket, cliffhanger: '' } as any, characters: [aliveChar], forbiddenRules: '', duePlantedSeeds: [] });
    expect(r.pass).toBe(false);
    expect(r.issues.find(i => i.code === 'missing_cliffhanger')).toBeTruthy();
  });

  it('flags unresolved due seed at last-window-chapter', () => {
    const r = auditPacket({
      packet: basePacket as any,
      characters: [aliveChar],
      forbiddenRules: '',
      duePlantedSeeds: [{ id: 'seed-1', seedText: 'red figure', plantWindowEnd: 5 }],
    });
    expect(r.pass).toBe(false);
    expect(r.issues.find(i => i.code === 'unresolved_due_seed')!.severity).toBe('critical');
  });

  it('flags excessive realm breakthroughs', () => {
    const r = auditPacket({
      packet: { ...basePacket, requiredEvents: [{ description: 'đột phá luyện khí' }, { description: 'đột phá trúc cơ' }] } as any,
      characters: [aliveChar], forbiddenRules: '', duePlantedSeeds: [],
    });
    expect(r.issues.find(i => i.code === 'realm_jump_excess')).toBeTruthy();
  });
});
```

- [ ] **Step 15.3: Test + commit**

```bash
pnpm --filter @novel/ai test packet-auditor
git add packages/ai/src/validators/packet-auditor.ts packages/ai/test/validators/packet-auditor.test.ts
git commit -m "feat(ai): packet auditor (deterministic, code-only)"
```

---

## Task 16: Writer prompt v1

**Files:**
- Create: `packages/ai/src/prompts/writer.v1.ts`

- [ ] **Step 16.1: Write `packages/ai/src/prompts/writer.v1.ts`**

```ts
import type { PromptTemplate } from './registry.js';

// Writer's input is the FULL serialized ChapterContext from `serialize.ts`. This template only
// supplies the fixed system message — the user payload IS the serialized context, passed verbatim.
// This is what makes the HOT/WARM prefix cacheable across chapters and shared with LLM Validator.

export const writerPromptV1: PromptTemplate<{ serializedContext: string }> = {
  agentRole: 'writer',
  version: 'v1',
  build: (input) => ({
    system: `Bạn là tác giả tiểu thuyết tiên hiệp/huyền huyễn tiếng Việt. Tuân BIBLE, STYLE GUIDE, POWER RULES tuyệt đối. Viết ~2000-3000 từ. Đầu ra theo định dạng:\n\nTITLE: <tiêu đề>\n\n<nội dung>`,
    user: input.serializedContext,
  }),
};
```

- [ ] **Step 16.2: Register in registry + commit**

```ts
// in registry.ts
import { writerPromptV1 } from './writer.v1.js';
registerPrompt(writerPromptV1);
```

```bash
git add packages/ai/src/prompts/writer.v1.ts packages/ai/src/prompts/registry.ts
git commit -m "feat(ai): writer prompt v1 (consumes serialized context verbatim)"
```

---

## Task 17: Writer agent

**Files:**
- Create: `packages/ai/src/agents/writer.ts`
- Create: `packages/ai/test/agents/writer.test.ts`

- [ ] **Step 17.1: Write `packages/ai/src/agents/writer.ts`**

```ts
import type { Logger } from 'pino';
import { GENERATION_CONFIG } from '@novel/core/config/generation';
import { MODEL_CONFIG } from '@novel/core/config/models';
import type { LLMProvider } from '../providers/types.js';
import { writerPromptV1 } from '../prompts/writer.v1.js';

export type WriterResult = {
  title: string;
  content: string;
  llmCallId: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  cost: number;
};

export class WriterAgent {
  constructor(private readonly deps: { provider: LLMProvider; logger: Logger }) {}

  async write(input: { serializedContext: string; cacheKey: string; chapterNumber: number; storyId: string; traceId: string }): Promise<WriterResult> {
    const built = writerPromptV1.build({ serializedContext: input.serializedContext });
    const res = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.writer,
      system: built.system,
      messages: [{ role: 'user', content: built.user }],
      temperature: GENERATION_CONFIG.WRITER_TEMPERATURE,
      topP: GENERATION_CONFIG.WRITER_TOP_P,
      cacheKey: input.cacheKey,
      traceId: input.traceId,
      agentRole: 'writer',
      promptVersion: writerPromptV1.version,
      storyId: input.storyId,
    });

    const { title, content } = parseTitleAndContent(res.text);
    return {
      title,
      content,
      llmCallId: res.llmCallId,
      inputTokens: res.usage.inputTokens,
      cachedInputTokens: res.usage.cachedInputTokens,
      outputTokens: res.usage.outputTokens,
      cost: res.cost,
    };
  }
}

export function parseTitleAndContent(raw: string): { title: string; content: string } {
  const match = raw.match(/^\s*TITLE:\s*(.+?)\n+([\s\S]+)$/);
  if (!match) {
    // Fallback: first line is title, rest is content
    const lines = raw.split('\n');
    const title = (lines[0] ?? '').trim() || 'Vô đề';
    const content = lines.slice(1).join('\n').trim();
    return { title, content };
  }
  return { title: match[1]!.trim(), content: match[2]!.trim() };
}
```

- [ ] **Step 17.2: Write tests `packages/ai/test/agents/writer.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { WriterAgent, parseTitleAndContent } from '../../src/agents/writer.js';
import { MockLLMProvider } from '../../src/providers/mock.js';

describe('parseTitleAndContent', () => {
  it('extracts TITLE: line', () => {
    const r = parseTitleAndContent('TITLE: Khởi hành\n\nLam Trạch bước ra khỏi cửa.');
    expect(r.title).toBe('Khởi hành');
    expect(r.content).toBe('Lam Trạch bước ra khỏi cửa.');
  });
  it('falls back to first line', () => {
    const r = parseTitleAndContent('Khởi hành\nNội dung ở đây.');
    expect(r.title).toBe('Khởi hành');
  });
});

describe('WriterAgent', () => {
  it('returns title + content + usage', async () => {
    const provider = new MockLLMProvider({
      responses: [{
        text: 'TITLE: Ch1\n\nMột ngày.',
        llmCallId: 'm1',
        usage: { inputTokens: 5000, cachedInputTokens: 3500, outputTokens: 4000 },
        cost: 0.002,
      }],
    });
    const w = new WriterAgent({ provider, logger: pino({ level: 'silent' }) });
    const r = await w.write({ serializedContext: 'CTX', cacheKey: 'ck', chapterNumber: 1, storyId: 's', traceId: 't' });
    expect(r.title).toBe('Ch1');
    expect(r.content).toBe('Một ngày.');
    expect(r.cachedInputTokens).toBe(3500);
  });
});
```

- [ ] **Step 17.3: Test + commit**

```bash
pnpm --filter @novel/ai test writer
git add packages/ai/src/agents/writer.ts packages/ai/test/agents/writer.test.ts
git commit -m "feat(ai): writer agent + title/content parser"
```

---

## Task 18: Deterministic validator types + first 2 checks (word-count, dead-character)

**Files:**
- Create: `packages/ai/src/validators/deterministic/types.ts`
- Create: `packages/ai/src/validators/deterministic/word-count.ts`
- Create: `packages/ai/src/validators/deterministic/dead-character.ts`
- Create: `packages/ai/test/validators/deterministic/word-count.test.ts`
- Create: `packages/ai/test/validators/deterministic/dead-character.test.ts`

- [ ] **Step 18.1: Write `types.ts`**

```ts
import type { ChapterContext } from '../../context/types.js';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type CheckInput = {
  content: string;
  context: ChapterContext;
  chapter: { id?: string; chapterNumber: number };
  story: { id: string };
  canon: {
    deadCharacterNames: string[];
    knownCharacterNames: string[];
    knownLocationNames: string[];
    knownBloodlineNames: string[];
    lockedFacts: { topic: string; fact: string }[];
    realmByCharacter: Record<string, string | undefined>;
  };
};

export type CheckResult = {
  pass: boolean;
  issues: string[];
};

export type DeterministicCheck = {
  id: string;
  severity: Severity;
  run(input: CheckInput): CheckResult;
};
```

- [ ] **Step 18.2: Write `word-count.ts`**

```ts
import { GENERATION_CONFIG } from '@novel/core/config/generation';
import type { DeterministicCheck } from './types.js';

function wordCount(s: string): number {
  // Vietnamese: count whitespace-separated tokens; close enough for budget guards
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export const wordCountCheck: DeterministicCheck = {
  id: 'word_count',
  severity: 'critical',
  run({ content }) {
    const wc = wordCount(content);
    const min = GENERATION_CONFIG.CHAPTER_HARD_FAIL_WORDS_MIN;
    const max = GENERATION_CONFIG.CHAPTER_HARD_FAIL_WORDS_MAX;
    if (wc < min || wc > max) {
      return { pass: false, issues: [`Word count ${wc} outside hard range [${min}, ${max}]`] };
    }
    return { pass: true, issues: [] };
  },
};

export const wordCountSoftCheck: DeterministicCheck = {
  id: 'word_count_soft',
  severity: 'medium',
  run({ content }) {
    const wc = wordCount(content);
    const min = GENERATION_CONFIG.CHAPTER_TARGET_WORDS_MIN;
    const max = GENERATION_CONFIG.CHAPTER_TARGET_WORDS_MAX;
    if (wc < min || wc > max) {
      return { pass: false, issues: [`Word count ${wc} outside target range [${min}, ${max}]`] };
    }
    return { pass: true, issues: [] };
  },
};
```

- [ ] **Step 18.3: Write `dead-character.ts`**

```ts
import type { DeterministicCheck } from './types.js';

export const deadCharacterAppearanceCheck: DeterministicCheck = {
  id: 'dead_character_appearance',
  severity: 'critical',
  run({ content, canon }) {
    const issues: string[] = [];
    for (const name of canon.deadCharacterNames) {
      // Word-boundary check (VN names have spaces, so use literal)
      if (content.includes(name)) {
        issues.push(`Nhân vật đã chết "${name}" xuất hiện trong nội dung chương.`);
      }
    }
    return { pass: issues.length === 0, issues };
  },
};
```

- [ ] **Step 18.4: Write tests for both**

`word-count.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { wordCountCheck, wordCountSoftCheck } from '../../../src/validators/deterministic/word-count.js';

const empty = { context: {} as any, chapter: { chapterNumber: 1 }, story: { id: 's' }, canon: { deadCharacterNames: [], knownCharacterNames: [], knownLocationNames: [], knownBloodlineNames: [], lockedFacts: [], realmByCharacter: {} } };
const words = (n: number) => Array.from({ length: n }, () => 'từ').join(' ');

describe('wordCountCheck', () => {
  it('passes inside hard range', () => {
    expect(wordCountCheck.run({ ...empty, content: words(2500) }).pass).toBe(true);
  });
  it('fails below hard min', () => {
    expect(wordCountCheck.run({ ...empty, content: words(1000) }).pass).toBe(false);
  });
  it('fails above hard max', () => {
    expect(wordCountCheck.run({ ...empty, content: words(5000) }).pass).toBe(false);
  });
});

describe('wordCountSoftCheck', () => {
  it('flags inside hard range but outside target range', () => {
    expect(wordCountSoftCheck.run({ ...empty, content: words(1700) }).pass).toBe(false);
  });
});
```

`dead-character.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deadCharacterAppearanceCheck } from '../../../src/validators/deterministic/dead-character.js';

const base = { context: {} as any, chapter: { chapterNumber: 1 }, story: { id: 's' }, canon: { knownCharacterNames: [], knownLocationNames: [], knownBloodlineNames: [], lockedFacts: [], realmByCharacter: {} } };

describe('deadCharacterAppearanceCheck', () => {
  it('passes when no dead char in content', () => {
    expect(deadCharacterAppearanceCheck.run({ ...base, canon: { ...base.canon, deadCharacterNames: ['Lam Trach'] }, content: 'Hồng Nhi đi vào.' }).pass).toBe(true);
  });
  it('fails when dead char appears', () => {
    const r = deadCharacterAppearanceCheck.run({ ...base, canon: { ...base.canon, deadCharacterNames: ['Lam Trach'] }, content: 'Lam Trach đứng dậy.' });
    expect(r.pass).toBe(false);
  });
});
```

- [ ] **Step 18.5: Test + commit**

```bash
pnpm --filter @novel/ai test deterministic/word-count deterministic/dead-character
git add packages/ai/src/validators/deterministic packages/ai/test/validators/deterministic
git commit -m "feat(ai): deterministic validator types + word-count + dead-character checks"
```

---

## Task 19: Deterministic checks — realm-jump, locked-fact, forbidden-move, unknown-character, unknown-location, new-bloodline-source

**Files:**
- Create: `packages/ai/src/validators/deterministic/realm-jump.ts`
- Create: `packages/ai/src/validators/deterministic/locked-fact.ts`
- Create: `packages/ai/src/validators/deterministic/forbidden-move.ts`
- Create: `packages/ai/src/validators/deterministic/unknown-character.ts`
- Create: `packages/ai/src/validators/deterministic/unknown-location.ts`
- Create: `packages/ai/src/validators/deterministic/new-bloodline-source.ts`
- Create: corresponding `*.test.ts` for each

- [ ] **Step 19.1: Write `realm-jump.ts`**

```ts
import { GENERATION_CONFIG } from '@novel/core/config/generation';
import type { DeterministicCheck } from './types.js';

const REALM_ORDER = ['phàm nhân', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh', 'hóa thần', 'luyện hư', 'hợp thể', 'đại thừa', 'độ kiếp'];

function realmRank(r?: string): number {
  if (!r) return -1;
  const lower = r.toLowerCase();
  return REALM_ORDER.findIndex(x => lower.includes(x));
}

// Find each character mentioned in content; for any that has a known startRealm, check if the
// content describes a breakthrough that crosses more than MAX_REALM_JUMP_PER_CHAPTER ranks.
const BREAKTHROUGH_RX = /(?:đột phá|thăng cấp|breakthrough)\s*(?:lên|to|sang)?\s*([^.,;\n]+)/gi;

export const realmJumpCheck: DeterministicCheck = {
  id: 'realm_jump',
  severity: 'critical',
  run({ content, canon }) {
    const issues: string[] = [];
    for (const [name, startRealm] of Object.entries(canon.realmByCharacter)) {
      if (!content.includes(name)) continue;
      const startRank = realmRank(startRealm);
      if (startRank < 0) continue;
      let m: RegExpExecArray | null;
      const rx = new RegExp(BREAKTHROUGH_RX);
      while ((m = rx.exec(content)) !== null) {
        const targetText = m[1] ?? '';
        const targetRank = realmRank(targetText);
        if (targetRank < 0) continue;
        const jump = targetRank - startRank;
        if (jump > GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER) {
          issues.push(`${name}: nhảy ${jump} cấp realm trong cùng chương (max ${GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER}).`);
        }
      }
    }
    return { pass: issues.length === 0, issues };
  },
};
```

- [ ] **Step 19.2: Write `locked-fact.ts`**

```ts
import type { DeterministicCheck } from './types.js';

// Negation detection: if locked fact says "X is alive" and content says "X chết/đã chết", fail.
const NEGATIONS: Array<[RegExp, RegExp]> = [
  [/sống|còn sống|alive/i, /(?:đã\s+)?chết|qua đời|tử vong/i],
  [/chết|qua đời/i, /sống lại|hồi sinh|alive/i],
];

export const lockedFactContradictionCheck: DeterministicCheck = {
  id: 'locked_fact_contradiction',
  severity: 'critical',
  run({ content, canon }) {
    const issues: string[] = [];
    for (const lf of canon.lockedFacts) {
      // Only triggers when both the topic name and a negating phrase appear together
      if (!content.includes(lf.topic)) continue;
      for (const [a, b] of NEGATIONS) {
        if (a.test(lf.fact) && b.test(content)) {
          issues.push(`Locked fact "${lf.topic}: ${lf.fact}" mâu thuẫn với nội dung chương.`);
          break;
        }
      }
    }
    return { pass: issues.length === 0, issues };
  },
};
```

- [ ] **Step 19.3: Write `forbidden-move.ts`**

```ts
import type { DeterministicCheck } from './types.js';

// `bible.forbidden_rules` is free-form text. We treat each line beginning with `- ` as a forbidden phrase.
function extractForbiddenPhrases(rulesText: string): string[] {
  return rulesText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2).trim())
    .filter(l => l.length >= 3);
}

export function makeForbiddenMoveCheck(rulesText: string): import('./types.js').DeterministicCheck {
  const phrases = extractForbiddenPhrases(rulesText);
  return {
    id: 'forbidden_move',
    severity: 'critical',
    run({ content }) {
      const issues: string[] = [];
      for (const p of phrases) {
        if (content.toLowerCase().includes(p.toLowerCase())) {
          issues.push(`Phát hiện forbidden move "${p}".`);
        }
      }
      return { pass: issues.length === 0, issues };
    },
  };
}
```

- [ ] **Step 19.4: Write `unknown-character.ts` + `unknown-location.ts`**

```ts
// unknown-character.ts
import type { DeterministicCheck } from './types.js';

// Heuristic: capitalised word sequences that look like proper names but aren't in canon.
// Vietnamese: names tend to be 2-3 capitalised words. We extract candidates and check.
const NAME_RX = /\b([A-ZĐÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ][a-zà-ỹ]+(?:\s[A-ZĐÀ-Ỹ][a-zà-ỹ]+){1,2})\b/g;

export const unknownCharacterNameCheck: DeterministicCheck = {
  id: 'unknown_character_name',
  severity: 'high',
  run({ content, canon }) {
    const knownLower = new Set(canon.knownCharacterNames.map(n => n.toLowerCase()));
    const candidates = new Set<string>();
    let m: RegExpExecArray | null;
    const rx = new RegExp(NAME_RX);
    while ((m = rx.exec(content)) !== null) candidates.add(m[1]!);
    const unknown = [...candidates].filter(c => !knownLower.has(c.toLowerCase()));
    if (unknown.length === 0) return { pass: true, issues: [] };
    return {
      pass: false,
      issues: [`Tên không có trong canon: ${unknown.slice(0, 5).join(', ')}${unknown.length > 5 ? '…' : ''}`],
    };
  },
};
```

```ts
// unknown-location.ts
import type { DeterministicCheck } from './types.js';

// Looks for "tại <Tên>", "ở <Tên>", "đến <Tên>" patterns.
const LOC_RX = /(?:tại|ở|đến|về|tới)\s+([A-ZĐÀ-Ỹ][a-zà-ỹ]+(?:\s[A-ZĐÀ-Ỹ][a-zà-ỹ]+){0,2})/g;

export const unknownLocationCheck: import('./types.js').DeterministicCheck = {
  id: 'unknown_location',
  severity: 'high',
  run({ content, canon }) {
    const known = new Set(canon.knownLocationNames.map(n => n.toLowerCase()));
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    const rx = new RegExp(LOC_RX);
    while ((m = rx.exec(content)) !== null) found.add(m[1]!);
    const unknown = [...found].filter(c => !known.has(c.toLowerCase()));
    if (unknown.length === 0) return { pass: true, issues: [] };
    return { pass: false, issues: [`Địa điểm chưa biết: ${unknown.slice(0, 5).join(', ')}`] };
  },
};
```

- [ ] **Step 19.5: Write `new-bloodline-source.ts`**

```ts
import type { DeterministicCheck } from './types.js';

const BLOODLINE_INTRO_RX = /(huyết mạch|bloodline|dòng máu)\s+(?:của\s+)?([A-ZĐÀ-Ỹ][a-zà-ỹ ]+)/gi;

export const newBloodlineWithoutSourceCheck: import('./types.js').DeterministicCheck = {
  id: 'new_bloodline_without_source',
  severity: 'high',
  run({ content, canon }) {
    const known = new Set(canon.knownBloodlineNames.map(n => n.toLowerCase()));
    const issues: string[] = [];
    let m: RegExpExecArray | null;
    const rx = new RegExp(BLOODLINE_INTRO_RX);
    while ((m = rx.exec(content)) !== null) {
      const name = m[2]!.trim();
      if (!known.has(name.toLowerCase())) {
        issues.push(`Bloodline mới "${name}" xuất hiện không có nguồn gốc trong canon.`);
      }
    }
    return { pass: issues.length === 0, issues };
  },
};
```

- [ ] **Step 19.6: Write a unit test per check** — minimum 1 pass case + 1 fail case each. Mirror Task 18.4 structure.

> Required minimum: each check has its `*.test.ts` with `pass` + `fail` cases. Do not skip — these are 100% coverage targets per spec Section 7.3.

- [ ] **Step 19.7: Test + commit**

```bash
pnpm --filter @novel/ai test deterministic
git add packages/ai/src/validators/deterministic packages/ai/test/validators/deterministic
git commit -m "feat(ai): deterministic checks (realm-jump, locked-fact, forbidden-move, unknown-character/location, bloodline)"
```

---

## Task 20: Remaining deterministic checks + runner

**Files:**
- Create: `packages/ai/src/validators/deterministic/cliffhanger.ts`
- Create: `packages/ai/src/validators/deterministic/conflict-presence.ts`
- Create: `packages/ai/src/validators/deterministic/style-red-flags.ts`
- Create: `packages/ai/src/validators/deterministic/repetition.ts`
- Create: `packages/ai/src/validators/deterministic/runner.ts`
- Create: corresponding `*.test.ts` files

- [ ] **Step 20.1: Write `cliffhanger.ts`**

```ts
import type { DeterministicCheck } from './types.js';

const CLIFFHANGER_HINTS = ['bỗng nhiên', 'đột nhiên', 'thoáng cái', 'còn chưa kịp', 'lúc này', 'ngay khi'];

export const cliffhangerPresenceCheck: DeterministicCheck = {
  id: 'cliffhanger_presence',
  severity: 'medium',
  run({ content }) {
    const last = content.slice(-600).toLowerCase();
    const hit = CLIFFHANGER_HINTS.some(h => last.includes(h));
    if (!hit) return { pass: false, issues: ['600 ký tự cuối không thấy mẫu cliffhanger điển hình.'] };
    return { pass: true, issues: [] };
  },
};
```

- [ ] **Step 20.2: Write `conflict-presence.ts`**

```ts
import type { DeterministicCheck } from './types.js';

const CONFLICT_HINTS = ['đánh', 'chiến', 'tranh', 'mâu thuẫn', 'đối đầu', 'phản đối', 'thách thức', 'truy đuổi'];

export const conflictPresenceCheck: DeterministicCheck = {
  id: 'conflict_presence',
  severity: 'medium',
  run({ content }) {
    const lower = content.toLowerCase();
    const hit = CONFLICT_HINTS.filter(h => lower.includes(h)).length;
    if (hit === 0) return { pass: false, issues: ['Không phát hiện từ khoá conflict trong chương.'] };
    return { pass: true, issues: [] };
  },
};
```

- [ ] **Step 20.3: Write `style-red-flags.ts`**

```ts
import type { DeterministicCheck } from './types.js';

const RED_FLAG_PHRASES = [
  'as an ai language model',
  'tôi là một mô hình ngôn ngữ',
  'i cannot',
  'nhận thấy rằng',     // overused English-translation tic
];

export const styleRedFlagsCheck: DeterministicCheck = {
  id: 'style_red_flags',
  severity: 'low',
  run({ content }) {
    const lower = content.toLowerCase();
    const hits = RED_FLAG_PHRASES.filter(p => lower.includes(p));
    if (hits.length === 0) return { pass: true, issues: [] };
    return { pass: false, issues: hits.map(h => `Cụm cấm: "${h}"`) };
  },
};
```

- [ ] **Step 20.4: Write `repetition.ts`**

```ts
import type { DeterministicCheck } from './types.js';

// Detect any 8+ word sequence repeated within the chapter.
export const repetitionCheck: DeterministicCheck = {
  id: 'repetition',
  severity: 'low',
  run({ content }) {
    const tokens = content.split(/\s+/);
    const seen = new Map<string, number>();
    const issues: string[] = [];
    for (let i = 0; i + 8 <= tokens.length; i++) {
      const window = tokens.slice(i, i + 8).join(' ').toLowerCase();
      const prev = seen.get(window);
      if (prev !== undefined && i - prev > 8) {
        issues.push(`Lặp đoạn 8 từ: "${window}"`);
        if (issues.length >= 3) break;
      } else {
        seen.set(window, i);
      }
    }
    return { pass: issues.length === 0, issues };
  },
};
```

- [ ] **Step 20.5: Write `runner.ts`**

```ts
import type { CheckInput, DeterministicCheck, Severity } from './types.js';
import { wordCountCheck, wordCountSoftCheck } from './word-count.js';
import { deadCharacterAppearanceCheck } from './dead-character.js';
import { realmJumpCheck } from './realm-jump.js';
import { lockedFactContradictionCheck } from './locked-fact.js';
import { makeForbiddenMoveCheck } from './forbidden-move.js';
import { unknownCharacterNameCheck } from './unknown-character.js';
import { unknownLocationCheck } from './unknown-location.js';
import { newBloodlineWithoutSourceCheck } from './new-bloodline-source.js';
import { cliffhangerPresenceCheck } from './cliffhanger.js';
import { conflictPresenceCheck } from './conflict-presence.js';
import { styleRedFlagsCheck } from './style-red-flags.js';
import { repetitionCheck } from './repetition.js';

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export type DeterministicReport = {
  pass: boolean;
  highestSeverity?: Severity;
  shortCircuitedAtCritical: boolean;
  results: { id: string; severity: Severity; pass: boolean; issues: string[] }[];
};

export function buildChecks(forbiddenRulesText: string): DeterministicCheck[] {
  return [
    // critical first → enables short-circuit
    wordCountCheck,
    deadCharacterAppearanceCheck,
    realmJumpCheck,
    lockedFactContradictionCheck,
    makeForbiddenMoveCheck(forbiddenRulesText),
    // high
    unknownCharacterNameCheck,
    unknownLocationCheck,
    newBloodlineWithoutSourceCheck,
    // medium
    wordCountSoftCheck,
    cliffhangerPresenceCheck,
    conflictPresenceCheck,
    // low
    styleRedFlagsCheck,
    repetitionCheck,
  ];
}

export function runDeterministicValidator(
  input: CheckInput,
  checks: DeterministicCheck[]
): DeterministicReport {
  const results: DeterministicReport['results'] = [];
  let shortCircuited = false;
  let highest: Severity | undefined;

  for (const check of checks) {
    const r = check.run(input);
    results.push({ id: check.id, severity: check.severity, pass: r.pass, issues: r.issues });
    if (!r.pass) {
      if (!highest || SEVERITY_ORDER[check.severity] < SEVERITY_ORDER[highest]) {
        highest = check.severity;
      }
      if (check.severity === 'critical') {
        shortCircuited = true;
        break;        // critical = stop immediately
      }
    }
  }

  return {
    pass: results.every(r => r.pass),
    highestSeverity: highest,
    shortCircuitedAtCritical: shortCircuited,
    results,
  };
}
```

- [ ] **Step 20.6: Write tests for each check + a runner test**

`runner.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildChecks, runDeterministicValidator } from '../../../src/validators/deterministic/runner.js';

const baseInput = {
  context: {} as any, chapter: { chapterNumber: 1 }, story: { id: 's' },
  canon: { deadCharacterNames: [], knownCharacterNames: [], knownLocationNames: [], knownBloodlineNames: [], lockedFacts: [], realmByCharacter: {} },
};
const goodContent = Array.from({ length: 2200 }, () => 'từ').join(' ') + ' đột nhiên đánh nhau bùng nổ.';

describe('runDeterministicValidator', () => {
  it('passes a clean chapter', () => {
    const r = runDeterministicValidator({ ...baseInput, content: goodContent }, buildChecks(''));
    expect(r.pass).toBe(true);
  });

  it('short-circuits at critical (word count)', () => {
    const r = runDeterministicValidator({ ...baseInput, content: 'too short' }, buildChecks(''));
    expect(r.shortCircuitedAtCritical).toBe(true);
    expect(r.highestSeverity).toBe('critical');
  });

  it('reports medium without short-circuit', () => {
    // 1700 words → outside target but inside hard range
    const content = Array.from({ length: 1700 }, () => 'từ').join(' ') + ' đột nhiên đánh.';
    const r = runDeterministicValidator({ ...baseInput, content }, buildChecks(''));
    expect(r.shortCircuitedAtCritical).toBe(false);
    expect(r.results.find(x => x.id === 'word_count_soft')!.pass).toBe(false);
  });
});
```

- [ ] **Step 20.7: Test + commit**

```bash
pnpm --filter @novel/ai test deterministic
git add packages/ai/src/validators/deterministic packages/ai/test/validators/deterministic
git commit -m "feat(ai): remaining deterministic checks + severity-ordered runner"
```

---

## Task 21: LLM Validator schema + prompt v1

**Files:**
- Create: `packages/ai/src/schemas/validator.ts`
- Create: `packages/ai/src/prompts/llm-validator.v1.ts`

- [ ] **Step 21.1: Write `packages/ai/src/schemas/validator.ts`**

```ts
import { z } from 'zod';

export const ValidatorIssueSchema = z.object({
  type: z.enum(['voice', 'plot_logic', 'style_match', 'pacing', 'consistency', 'other']),
  description: z.string().min(1).max(400),
  suggestedFix: z.string().max(400).optional(),
  paragraphHint: z.string().max(120).optional(),    // first ~120 chars of the offending paragraph
});

export const ValidatorOutputSchema = z.object({
  pass: z.boolean(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  issues: z.array(ValidatorIssueSchema).max(10),
  notes: z.string().max(500).optional(),
});

export type ValidatorOutput = z.infer<typeof ValidatorOutputSchema>;
export type ValidatorIssue = z.infer<typeof ValidatorIssueSchema>;

export const VALIDATOR_JSON_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['voice', 'plot_logic', 'style_match', 'pacing', 'consistency', 'other'] },
          description: { type: 'string' },
          suggestedFix: { type: 'string' },
          paragraphHint: { type: 'string' },
        },
        required: ['type', 'description'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['pass', 'severity', 'issues'],
} as const;
```

- [ ] **Step 21.2: Write `packages/ai/src/prompts/llm-validator.v1.ts`**

```ts
import type { PromptTemplate } from './registry.js';

// IMPORTANT: this template consumes the SAME serialized context as the Writer (Task 16). Sharing
// the HOT/WARM prefix verbatim is what makes the Writer's prefix cache hit on the Validator call.
// The chapter content is appended AFTER the context, before the instruction.

export const llmValidatorPromptV1: PromptTemplate<{ serializedContext: string; chapterContent: string }> = {
  agentRole: 'llm_validator',
  version: 'v1',
  build: (input) => ({
    system: `Bạn là biên tập viên kiểm tra chương tiểu thuyết. Trả JSON đúng schema. KHÔNG viết lại nội dung — chỉ chỉ ra vấn đề. Bỏ qua các check thuộc về deterministic (đếm từ, tên không có canon, đột phá quá cấp, locked fact contradictions). Tập trung: voice, plot_logic, style_match, pacing, consistency.`,
    user: [
      input.serializedContext,
      '',
      '## CHƯƠNG VỪA VIẾT',
      input.chapterContent,
      '',
      '## INSTRUCTION',
      'Đánh giá chương trên. Trả JSON ValidatorOutput. severity = mức nghiêm trọng nhất trong issues. Nếu không có issue, severity="low" và pass=true.',
    ].join('\n'),
  }),
};
```

- [ ] **Step 21.3: Register + commit**

```ts
// in registry.ts
import { llmValidatorPromptV1 } from './llm-validator.v1.js';
registerPrompt(llmValidatorPromptV1);
```

```bash
git add packages/ai/src/schemas/validator.ts packages/ai/src/prompts/llm-validator.v1.ts packages/ai/src/prompts/registry.ts
git commit -m "feat(ai): LLM validator schema + prompt v1 (shares HOT/WARM prefix with writer)"
```

---

## Task 22: LLM Validator agent

**Files:**
- Create: `packages/ai/src/agents/llm-validator.ts`
- Create: `packages/ai/test/agents/llm-validator.test.ts`

- [ ] **Step 22.1: Write `packages/ai/src/agents/llm-validator.ts`**

```ts
import type { Logger } from 'pino';
import { GENERATION_CONFIG } from '@novel/core/config/generation';
import { MODEL_CONFIG } from '@novel/core/config/models';
import type { LLMProvider } from '../providers/types.js';
import { llmValidatorPromptV1 } from '../prompts/llm-validator.v1.js';
import { VALIDATOR_JSON_SCHEMA, ValidatorOutputSchema, type ValidatorOutput } from '../schemas/validator.js';

export type LLMValidatorResult = ValidatorOutput & { llmCallId: string; cost: number };

export class LLMValidator {
  constructor(private readonly deps: { provider: LLMProvider; logger: Logger }) {}

  async validate(input: { serializedContext: string; chapterContent: string; cacheKey: string; storyId: string; traceId: string }): Promise<LLMValidatorResult> {
    const built = llmValidatorPromptV1.build(input);
    const res = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.llm_validator,
      system: built.system,
      messages: [{ role: 'user', content: built.user }],
      responseSchema: VALIDATOR_JSON_SCHEMA,
      temperature: GENERATION_CONFIG.LLM_VALIDATOR_TEMPERATURE,
      cacheKey: input.cacheKey,        // SAME key as writer → prefix cache hit
      traceId: input.traceId,
      agentRole: 'llm_validator',
      promptVersion: llmValidatorPromptV1.version,
      storyId: input.storyId,
    });
    const parsed = ValidatorOutputSchema.parse(JSON.parse(res.text));
    return { ...parsed, llmCallId: res.llmCallId, cost: res.cost };
  }
}
```

- [ ] **Step 22.2: Write tests `packages/ai/test/agents/llm-validator.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { LLMValidator } from '../../src/agents/llm-validator.js';
import { MockLLMProvider } from '../../src/providers/mock.js';

describe('LLMValidator', () => {
  it('parses pass=true low severity', async () => {
    const provider = new MockLLMProvider({
      responses: [{ text: JSON.stringify({ pass: true, severity: 'low', issues: [] }), llmCallId: 'm', usage: { inputTokens: 5000, cachedInputTokens: 4000, outputTokens: 50 }, cost: 0.0003 }],
    });
    const v = new LLMValidator({ provider, logger: pino({ level: 'silent' }) });
    const r = await v.validate({ serializedContext: 'CTX', chapterContent: 'BODY', cacheKey: 'ck', storyId: 's', traceId: 't' });
    expect(r.pass).toBe(true);
  });

  it('parses fail with issues', async () => {
    const provider = new MockLLMProvider({
      responses: [{
        text: JSON.stringify({
          pass: false, severity: 'medium',
          issues: [{ type: 'pacing', description: 'cảnh chiến đấu quá ngắn' }],
        }),
        llmCallId: 'm', usage: { inputTokens: 5000, cachedInputTokens: 4000, outputTokens: 80 }, cost: 0.0003,
      }],
    });
    const v = new LLMValidator({ provider, logger: pino({ level: 'silent' }) });
    const r = await v.validate({ serializedContext: 'CTX', chapterContent: 'BODY', cacheKey: 'ck', storyId: 's', traceId: 't' });
    expect(r.pass).toBe(false);
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0]!.type).toBe('pacing');
  });
});
```

- [ ] **Step 22.3: Test + commit**

```bash
pnpm --filter @novel/ai test llm-validator
git add packages/ai/src/agents/llm-validator.ts packages/ai/test/agents/llm-validator.test.ts
git commit -m "feat(ai): LLM validator agent"
```

---

## Task 23: Auto-Fixer prompt + agent

**Files:**
- Create: `packages/ai/src/prompts/auto-fixer.v1.ts`
- Create: `packages/ai/src/agents/auto-fixer.ts`
- Create: `packages/ai/test/agents/auto-fixer.test.ts`

- [ ] **Step 23.1: Write `packages/ai/src/prompts/auto-fixer.v1.ts`**

```ts
import type { PromptTemplate } from './registry.js';
import type { ValidatorIssue } from '../schemas/validator.js';

export const autoFixerPromptV1: PromptTemplate<{
  serializedContext: string;
  originalChapter: string;
  issues: ValidatorIssue[];
}> = {
  agentRole: 'auto_fixer',
  version: 'v1',
  build: (input) => ({
    system: `Bạn nhận một chương đã viết và danh sách lỗi nhỏ cần sửa. CHỈ áp dụng đúng các sửa được yêu cầu. KHÔNG thay đổi đoạn khác. Giữ nguyên giọng văn, tiêu đề và độ dài tổng thể (±10%). Đầu ra: TITLE: <giữ nguyên>\\n\\n<nội dung đã sửa>.`,
    user: [
      input.serializedContext,
      '',
      '## CHƯƠNG GỐC',
      input.originalChapter,
      '',
      '## LỖI CẦN SỬA',
      ...input.issues.map((i, idx) => `${idx + 1}. [${i.type}] ${i.description}${i.suggestedFix ? ` — gợi ý: ${i.suggestedFix}` : ''}${i.paragraphHint ? ` (đoạn bắt đầu bằng: "${i.paragraphHint}")` : ''}`),
      '',
      '## INSTRUCTION',
      'Trả về chương đã sửa (TITLE: + nội dung). Không thay đổi đoạn không được nhắc tới.',
    ].join('\n'),
  }),
};
```

- [ ] **Step 23.2: Write `packages/ai/src/agents/auto-fixer.ts`**

```ts
import type { Logger } from 'pino';
import { MODEL_CONFIG } from '@novel/core/config/models';
import type { LLMProvider } from '../providers/types.js';
import { autoFixerPromptV1 } from '../prompts/auto-fixer.v1.js';
import { parseTitleAndContent } from './writer.js';
import type { ValidatorIssue } from '../schemas/validator.js';

export class AutoFixer {
  constructor(private readonly deps: { provider: LLMProvider; logger: Logger }) {}

  async fix(input: {
    serializedContext: string;
    originalTitle: string;
    originalChapter: string;
    issues: ValidatorIssue[];
    cacheKey: string;
    storyId: string;
    traceId: string;
  }): Promise<{ title: string; content: string; llmCallId: string; cost: number }> {
    const built = autoFixerPromptV1.build({
      serializedContext: input.serializedContext,
      originalChapter: `TITLE: ${input.originalTitle}\n\n${input.originalChapter}`,
      issues: input.issues,
    });
    const res = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.auto_fixer,
      system: built.system,
      messages: [{ role: 'user', content: built.user }],
      temperature: 0.4,
      cacheKey: input.cacheKey,
      traceId: input.traceId,
      agentRole: 'auto_fixer',
      promptVersion: autoFixerPromptV1.version,
      storyId: input.storyId,
    });
    const parsed = parseTitleAndContent(res.text);
    return { title: parsed.title || input.originalTitle, content: parsed.content, llmCallId: res.llmCallId, cost: res.cost };
  }
}
```

- [ ] **Step 23.3: Write tests `packages/ai/test/agents/auto-fixer.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { AutoFixer } from '../../src/agents/auto-fixer.js';
import { MockLLMProvider } from '../../src/providers/mock.js';

describe('AutoFixer', () => {
  it('returns patched chapter parsed via writer parser', async () => {
    const provider = new MockLLMProvider({
      responses: [{
        text: 'TITLE: Ch1 (đã sửa)\n\nNội dung mới.',
        llmCallId: 'm', usage: { inputTokens: 6000, cachedInputTokens: 4000, outputTokens: 4000 }, cost: 0.002,
      }],
    });
    const f = new AutoFixer({ provider, logger: pino({ level: 'silent' }) });
    const r = await f.fix({
      serializedContext: 'CTX', originalTitle: 'Ch1', originalChapter: 'cũ', issues: [{ type: 'pacing', description: 'too short' }],
      cacheKey: 'ck', storyId: 's', traceId: 't',
    });
    expect(r.title).toBe('Ch1 (đã sửa)');
    expect(r.content).toBe('Nội dung mới.');
  });
});
```

- [ ] **Step 23.4: Register prompt + test + commit**

```ts
// registry.ts
import { autoFixerPromptV1 } from './auto-fixer.v1.js';
registerPrompt(autoFixerPromptV1);
```

```bash
pnpm --filter @novel/ai test auto-fixer
git add packages/ai/src/prompts/auto-fixer.v1.ts packages/ai/src/agents/auto-fixer.ts packages/ai/test/agents/auto-fixer.test.ts packages/ai/src/prompts/registry.ts
git commit -m "feat(ai): auto-fixer agent (patch-style fix, not rewrite)"
```

---

## Task 24: Canon Extractor schema + prompt v1

**Files:**
- Create: `packages/ai/src/schemas/extractor.ts`
- Create: `packages/ai/src/prompts/canon-extractor.v1.ts`

- [ ] **Step 24.1: Write `packages/ai/src/schemas/extractor.ts`**

```ts
import { z } from 'zod';

export const CharacterUpdateSchema = z.object({
  action: z.enum(['create', 'update']),
  targetId: z.string().uuid().optional(),       // null when create
  name: z.string().min(1),
  fields: z.object({
    currentRealm: z.string().optional(),
    status: z.enum(['alive', 'dead', 'missing', 'unknown']).optional(),
    bloodlines: z.array(z.string()).optional(),
    faction: z.string().optional(),
    shortTraits: z.array(z.string()).optional(),
  }).partial(),
  intentionalRegression: z.boolean().optional(),
});

export const CanonFactProposalSchema = z.object({
  topic: z.string().min(1).max(120),
  fact: z.string().min(1).max(800),
  importance: z.enum(['low', 'medium', 'high', 'locked']),
});

export const ThreadUpdateSchema = z.object({
  action: z.enum(['create', 'update', 'resolve']),
  targetId: z.string().uuid().optional(),
  title: z.string(),
  state: z.enum(['open', 'partial', 'resolved']).optional(),
  plannedResolutionChapter: z.number().int().positive().optional(),
});

export const TimelineEventSchema = z.object({
  description: z.string().min(1).max(500),
  charactersInvolved: z.array(z.string()).optional(),
  significance: z.enum(['minor', 'major', 'pivotal']).default('minor'),
});

export const ExtractorOutputSchema = z.object({
  characterUpdates: z.array(CharacterUpdateSchema).max(20),
  newCanonFacts: z.array(CanonFactProposalSchema).max(15),
  threadUpdates: z.array(ThreadUpdateSchema).max(15),
  newTimelineEvents: z.array(TimelineEventSchema).max(20),
  seedsResolvedThisChapter: z.array(z.string().uuid()).max(10),
});

export type ExtractorOutput = z.infer<typeof ExtractorOutputSchema>;

export const EXTRACTOR_JSON_SCHEMA = {
  type: 'object',
  properties: {
    characterUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'update'] },
          targetId: { type: 'string' },
          name: { type: 'string' },
          fields: {
            type: 'object',
            properties: {
              currentRealm: { type: 'string' },
              status: { type: 'string', enum: ['alive', 'dead', 'missing', 'unknown'] },
              bloodlines: { type: 'array', items: { type: 'string' } },
              faction: { type: 'string' },
              shortTraits: { type: 'array', items: { type: 'string' } },
            },
          },
          intentionalRegression: { type: 'boolean' },
        },
        required: ['action', 'name', 'fields'],
      },
    },
    newCanonFacts: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, fact: { type: 'string' }, importance: { type: 'string', enum: ['low', 'medium', 'high', 'locked'] } }, required: ['topic', 'fact', 'importance'] } },
    threadUpdates: { type: 'array', items: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'resolve'] }, targetId: { type: 'string' }, title: { type: 'string' }, state: { type: 'string', enum: ['open', 'partial', 'resolved'] }, plannedResolutionChapter: { type: 'integer' } }, required: ['action', 'title'] } },
    newTimelineEvents: { type: 'array', items: { type: 'object', properties: { description: { type: 'string' }, charactersInvolved: { type: 'array', items: { type: 'string' } }, significance: { type: 'string', enum: ['minor', 'major', 'pivotal'] } }, required: ['description'] } },
    seedsResolvedThisChapter: { type: 'array', items: { type: 'string' } },
  },
  required: ['characterUpdates', 'newCanonFacts', 'threadUpdates', 'newTimelineEvents', 'seedsResolvedThisChapter'],
} as const;
```

- [ ] **Step 24.2: Write `packages/ai/src/prompts/canon-extractor.v1.ts`**

```ts
import type { PromptTemplate } from './registry.js';

export const canonExtractorPromptV1: PromptTemplate<{
  bibleCompact: string;
  canonStateCompact: string;
  chapterTitle: string;
  chapterContent: string;
  duePlantedSeeds: { id: string; seedText: string }[];
}> = {
  agentRole: 'canon_extractor',
  version: 'v1',
  build: (input) => ({
    system: `Bạn là extractor: đọc một chương vừa viết và liệt kê các thay đổi state cần ghi lại. Trả JSON đúng ExtractorOutputSchema. KHÔNG diễn giải, KHÔNG thêm sự kiện không có trong chương. Mỗi sự kiện/đổi state phải có bằng chứng trong chương.`,
    user: [
      '## BIBLE (compact)', input.bibleCompact, '',
      '## CANON HIỆN TẠI', input.canonStateCompact, '',
      `## CHƯƠNG: ${input.chapterTitle}`,
      input.chapterContent, '',
      '## SEEDS ĐƯỢC PLANT TRONG CHƯƠNG NÀY (nếu có resolution, đưa id vào seedsResolvedThisChapter)',
      ...input.duePlantedSeeds.map(s => `- (id=${s.id}) ${s.seedText}`),
      '',
      '## INSTRUCTION',
      'Liệt kê thay đổi: characterUpdates, newCanonFacts, threadUpdates, newTimelineEvents, seedsResolvedThisChapter. Trả JSON.',
    ].join('\n'),
  }),
};
```

- [ ] **Step 24.3: Register + commit**

```ts
import { canonExtractorPromptV1 } from './canon-extractor.v1.js';
registerPrompt(canonExtractorPromptV1);
```

```bash
git add packages/ai/src/schemas/extractor.ts packages/ai/src/prompts/canon-extractor.v1.ts packages/ai/src/prompts/registry.ts
git commit -m "feat(ai): canon extractor schema + prompt v1"
```

---

## Task 25: Canon Extractor agent

**Files:**
- Create: `packages/ai/src/agents/canon-extractor.ts`
- Create: `packages/ai/test/agents/canon-extractor.test.ts`

- [ ] **Step 25.1: Write `packages/ai/src/agents/canon-extractor.ts`**

```ts
import type { Logger } from 'pino';
import { MODEL_CONFIG } from '@novel/core/config/models';
import type { LLMProvider } from '../providers/types.js';
import { canonExtractorPromptV1 } from '../prompts/canon-extractor.v1.js';
import { ExtractorOutputSchema, EXTRACTOR_JSON_SCHEMA, type ExtractorOutput } from '../schemas/extractor.js';

export class CanonExtractor {
  constructor(private readonly deps: { provider: LLMProvider; logger: Logger }) {}

  async extract(input: {
    bibleCompact: string;
    canonStateCompact: string;
    chapterTitle: string;
    chapterContent: string;
    duePlantedSeeds: { id: string; seedText: string }[];
    storyId: string;
    traceId: string;
  }): Promise<ExtractorOutput & { llmCallId: string; cost: number }> {
    const built = canonExtractorPromptV1.build(input);
    const res = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.canon_extractor,
      system: built.system,
      messages: [{ role: 'user', content: built.user }],
      responseSchema: EXTRACTOR_JSON_SCHEMA,
      temperature: 0.1,
      traceId: input.traceId,
      agentRole: 'canon_extractor',
      promptVersion: canonExtractorPromptV1.version,
      storyId: input.storyId,
    });
    const parsed = ExtractorOutputSchema.parse(JSON.parse(res.text));
    return { ...parsed, llmCallId: res.llmCallId, cost: res.cost };
  }
}
```

- [ ] **Step 25.2: Write tests `packages/ai/test/agents/canon-extractor.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { CanonExtractor } from '../../src/agents/canon-extractor.js';
import { MockLLMProvider } from '../../src/providers/mock.js';

describe('CanonExtractor', () => {
  it('parses minimal valid output', async () => {
    const provider = new MockLLMProvider({
      responses: [{
        text: JSON.stringify({
          characterUpdates: [{ action: 'update', name: 'Lam Trạch', fields: { currentRealm: 'trúc cơ' } }],
          newCanonFacts: [],
          threadUpdates: [],
          newTimelineEvents: [{ description: 'Lam Trạch đột phá trúc cơ', significance: 'major' }],
          seedsResolvedThisChapter: [],
        }),
        llmCallId: 'm', usage: { inputTokens: 5000, cachedInputTokens: 2500, outputTokens: 800 }, cost: 0.0006,
      }],
    });
    const e = new CanonExtractor({ provider, logger: pino({ level: 'silent' }) });
    const r = await e.extract({
      bibleCompact: 'b', canonStateCompact: 'c',
      chapterTitle: 'Ch1', chapterContent: 'body', duePlantedSeeds: [],
      storyId: 's', traceId: 't',
    });
    expect(r.characterUpdates).toHaveLength(1);
    expect(r.newTimelineEvents[0]!.significance).toBe('major');
  });
});
```

- [ ] **Step 25.3: Test + commit**

```bash
pnpm --filter @novel/ai test canon-extractor
git add packages/ai/src/agents/canon-extractor.ts packages/ai/test/agents/canon-extractor.test.ts
git commit -m "feat(ai): canon extractor agent"
```

---

## Task 26: Conflict Detector + Canon Merger

**Files:**
- Create: `packages/ai/src/reconciliation/conflict-detector.ts`
- Create: `packages/ai/src/reconciliation/canon-merger.ts`
- Create: `packages/ai/test/reconciliation/conflict-detector.test.ts`
- Create: `packages/ai/test/reconciliation/canon-merger.test.ts`

- [ ] **Step 26.1: Write `packages/ai/src/reconciliation/conflict-detector.ts`**

```ts
import type { ExtractorOutput } from '../schemas/extractor.js';

export type ConflictStatus = 'none' | 'warning' | 'blocking';

export type CanonSnapshot = {
  characters: { id: string; name: string; status: string; currentRealm?: string; bloodlines: string[]; lockedFields: string[] }[];
  lockedCanonFacts: { id: string; topic: string; fact: string }[];
  knownThreadIds: Set<string>;
};

export type PendingCanonUpdateRow = {
  updateType: 'character' | 'canon_fact' | 'thread' | 'event';
  targetTable: string;
  targetId?: string;
  payload: Record<string, unknown>;
  conflictStatus: ConflictStatus;
  conflictReasons: string[];
};

const REALM_ORDER = ['phàm nhân', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh', 'hóa thần', 'luyện hư', 'hợp thể', 'đại thừa', 'độ kiếp'];
function realmRank(r?: string): number { return r ? REALM_ORDER.findIndex(x => r.toLowerCase().includes(x)) : -1; }

const NEGATION_PAIRS: Array<[RegExp, RegExp]> = [
  [/\b(?:sống|còn sống|alive)\b/i, /\b(?:đã chết|chết|dead|qua đời)\b/i],
  [/\b(?:chết|qua đời|dead)\b/i, /\b(?:sống lại|alive|hồi sinh)\b/i],
];

function isNegated(a: string, b: string): boolean {
  return NEGATION_PAIRS.some(([x, y]) => (x.test(a) && y.test(b)) || (x.test(b) && y.test(a)));
}

export function detectConflicts(extracted: ExtractorOutput, snapshot: CanonSnapshot): PendingCanonUpdateRow[] {
  const rows: PendingCanonUpdateRow[] = [];
  const charsByName = new Map(snapshot.characters.map(c => [c.name.toLowerCase(), c]));

  for (const u of extracted.characterUpdates) {
    const reasons: string[] = [];
    let status: ConflictStatus = 'none';
    const existing = charsByName.get(u.name.toLowerCase());

    if (existing) {
      // Locked field check
      for (const field of Object.keys(u.fields)) {
        if (existing.lockedFields.includes(field)) {
          status = 'blocking';
          reasons.push(`Field "${field}" trên "${u.name}" đã bị lock.`);
        }
      }
      // Realm regression
      if (u.fields.currentRealm) {
        const newRank = realmRank(u.fields.currentRealm);
        const oldRank = realmRank(existing.currentRealm);
        if (newRank >= 0 && oldRank > newRank && !u.intentionalRegression) {
          status = 'blocking';
          reasons.push(`${u.name} hồi giảm realm (${existing.currentRealm} → ${u.fields.currentRealm}) mà không có intentionalRegression.`);
        }
      }
      // Idempotent dead → dead
      if (u.fields.status === 'dead' && existing.status === 'dead') {
        if (status === 'none') status = 'warning';
        reasons.push(`${u.name} đã được đánh dấu chết trước đó.`);
      }
      // New bloodline without source event
      if (u.fields.bloodlines && u.fields.bloodlines.some(b => !existing.bloodlines.includes(b))) {
        const newBloodlines = u.fields.bloodlines.filter(b => !existing.bloodlines.includes(b));
        const supportedByEvent = extracted.newTimelineEvents.some(e =>
          newBloodlines.some(bl => e.description.toLowerCase().includes(bl.toLowerCase()))
        );
        if (!supportedByEvent) {
          if (status === 'none') status = 'warning';
          reasons.push(`Bloodline mới (${newBloodlines.join(', ')}) không có timeline event tương ứng.`);
        }
      }
    } else if (u.action === 'update') {
      status = 'blocking';
      reasons.push(`Update tới character "${u.name}" không tồn tại.`);
    }

    rows.push({
      updateType: 'character',
      targetTable: 'characters',
      targetId: existing?.id,
      payload: { action: u.action, name: u.name, fields: u.fields, intentionalRegression: u.intentionalRegression },
      conflictStatus: status,
      conflictReasons: reasons,
    });
  }

  for (const f of extracted.newCanonFacts) {
    const reasons: string[] = [];
    let status: ConflictStatus = 'none';
    if (f.importance === 'locked') {
      for (const lf of snapshot.lockedCanonFacts) {
        if (lf.topic.toLowerCase() === f.topic.toLowerCase() && isNegated(lf.fact, f.fact)) {
          status = 'blocking';
          reasons.push(`Locked fact mới mâu thuẫn với locked fact "${lf.topic}: ${lf.fact}".`);
        }
      }
    }
    rows.push({
      updateType: 'canon_fact',
      targetTable: 'canon_facts',
      payload: { ...f },
      conflictStatus: status,
      conflictReasons: reasons,
    });
  }

  for (const t of extracted.threadUpdates) {
    const reasons: string[] = [];
    let status: ConflictStatus = 'none';
    if (t.action === 'update' || t.action === 'resolve') {
      if (t.targetId && !snapshot.knownThreadIds.has(t.targetId)) {
        status = 'blocking';
        reasons.push(`Thread id "${t.targetId}" không tồn tại.`);
      }
    }
    if (t.action === 'resolve' && t.plannedResolutionChapter && t.plannedResolutionChapter > (extracted.newTimelineEvents.length > 0 ? 9999 : 0)) {
      // soft check; warn only
      if (status === 'none') status = 'warning';
      reasons.push(`Resolve có planned chapter xa.`);
    }
    rows.push({
      updateType: 'thread',
      targetTable: 'open_threads',
      targetId: t.targetId,
      payload: { ...t },
      conflictStatus: status,
      conflictReasons: reasons,
    });
  }

  for (const e of extracted.newTimelineEvents) {
    rows.push({
      updateType: 'event',
      targetTable: 'timeline_events',
      payload: { ...e },
      conflictStatus: 'none',
      conflictReasons: [],
    });
  }

  return rows;
}
```

- [ ] **Step 26.2: Write `packages/ai/src/reconciliation/canon-merger.ts`**

```ts
import type { Logger } from 'pino';
import { sql } from 'drizzle-orm';
import type { db as DBType } from '@novel/db';
import { characters, canon_facts, open_threads, timeline_events, planted_seeds, pending_canon_updates } from '@novel/db/schema';
import type { EmbeddingService } from '../embeddings/types.js';
import type { PendingCanonUpdateRow, ConflictStatus } from './conflict-detector.js';

export type MergeMode = 'safe' | 'semi_auto' | 'full_auto';

export type MergeOutcome = {
  pendingIds: string[];           // rows written to pending_canon_updates
  applied: number;                // number auto-merged
  blocked: number;                // number left for user
  bumpedCharacterIds: string[];   // IDs whose version got bumped
};

export type CanonMergerDeps = {
  db: typeof DBType;
  embeddings: EmbeddingService;
  logger: Logger;
};

// CRITICAL: this is the ONLY path that writes to canon tables. Extractor must NEVER touch them directly.
export class CanonMerger {
  constructor(private readonly deps: CanonMergerDeps) {}

  async submit(input: {
    storyId: string;
    chapterId: string;
    chapterNumber: number;
    rows: PendingCanonUpdateRow[];
    seedsResolvedIds: string[];
    mode: MergeMode;
    traceId: string;
  }): Promise<MergeOutcome> {
    const log = this.deps.logger.child({ traceId: input.traceId, chapterNumber: input.chapterNumber });

    const inserted = await this.deps.db.insert(pending_canon_updates).values(
      input.rows.map(r => ({
        storyId: input.storyId,
        chapterId: input.chapterId,
        updateType: r.updateType,
        targetTable: r.targetTable,
        targetId: r.targetId,
        payload: r.payload as Record<string, unknown>,
        conflictStatus: r.conflictStatus,
        conflictReasons: r.conflictReasons,
        resolution: 'pending',
      }))
    ).returning({ id: pending_canon_updates.id, conflictStatus: pending_canon_updates.conflictStatus });

    const policy = mergePolicy(input.mode);
    const bumped: string[] = [];
    let applied = 0, blocked = 0;

    for (let i = 0; i < input.rows.length; i++) {
      const row = input.rows[i]!;
      const insertedRow = inserted[i]!;
      const shouldAuto = policy[row.conflictStatus] === 'auto';
      if (!shouldAuto) {
        blocked++;
        continue;
      }
      await this.applyOne(input.storyId, row, bumped);
      await this.deps.db.update(pending_canon_updates)
        .set({ resolution: 'auto_merged', reviewedBy: 'auto', resolvedAt: new Date() })
        .where(sql`id = ${insertedRow.id}`);
      applied++;
    }

    if (input.seedsResolvedIds.length > 0) {
      await this.deps.db.update(planted_seeds)
        .set({ status: 'paid_off', payoffChapter: input.chapterNumber })
        .where(sql`id = ANY(${input.seedsResolvedIds}::uuid[])`);
    }

    log.info({ applied, blocked }, 'canon merger done');
    return { pendingIds: inserted.map(r => r.id), applied, blocked, bumpedCharacterIds: bumped };
  }

  private async applyOne(storyId: string, row: PendingCanonUpdateRow, bumpedOut: string[]): Promise<void> {
    switch (row.updateType) {
      case 'character': {
        const p = row.payload as { action: 'create' | 'update'; name: string; fields: Record<string, unknown> };
        if (p.action === 'create' || !row.targetId) {
          await this.deps.db.insert(characters).values({
            storyId,
            name: p.name,
            currentRealm: (p.fields.currentRealm as string) ?? null,
            status: (p.fields.status as string) ?? 'alive',
            bloodlines: (p.fields.bloodlines as string[]) ?? [],
            faction: (p.fields.faction as string) ?? null,
            shortTraits: (p.fields.shortTraits as string[]) ?? [],
            version: 1,
          });
        } else {
          await this.deps.db.update(characters)
            .set({
              ...(p.fields as Record<string, unknown>),
              version: sql`${characters.version} + 1` as unknown as number,
              updatedAt: new Date(),
            })
            .where(sql`id = ${row.targetId}`);
          bumpedOut.push(row.targetId);
        }
        return;
      }
      case 'canon_fact': {
        const p = row.payload as { topic: string; fact: string; importance: string };
        const embed = await this.deps.embeddings.embed({ input: `${p.topic}\n${p.fact}`, traceId: 'merger' });
        const vectorLiteral = `[${embed.vector.join(',')}]`;
        await this.deps.db.execute(sql`
          INSERT INTO canon_facts (story_id, topic, fact, importance, embedding)
          VALUES (${storyId}, ${p.topic}, ${p.fact}, ${p.importance}, ${vectorLiteral}::vector)
        `);
        return;
      }
      case 'thread': {
        const p = row.payload as { action: 'create' | 'update' | 'resolve'; title: string; state?: string; plannedResolutionChapter?: number; targetId?: string };
        if (p.action === 'create' || !row.targetId) {
          await this.deps.db.insert(open_threads).values({
            storyId,
            title: p.title,
            state: p.state ?? 'open',
            plannedResolutionChapter: p.plannedResolutionChapter ?? null,
          });
        } else {
          await this.deps.db.update(open_threads)
            .set({ state: p.state ?? undefined, plannedResolutionChapter: p.plannedResolutionChapter ?? undefined })
            .where(sql`id = ${row.targetId}`);
        }
        return;
      }
      case 'event': {
        const p = row.payload as { description: string; charactersInvolved?: string[]; significance?: string };
        await this.deps.db.insert(timeline_events).values({
          storyId,
          description: p.description,
          charactersInvolved: p.charactersInvolved ?? [],
          significance: p.significance ?? 'minor',
        });
        return;
      }
    }
  }
}

function mergePolicy(mode: MergeMode): Record<ConflictStatus, 'auto' | 'wait'> {
  switch (mode) {
    case 'safe':      return { none: 'wait',  warning: 'wait', blocking: 'wait' };
    case 'semi_auto': return { none: 'auto',  warning: 'auto', blocking: 'wait' };
    case 'full_auto': return { none: 'auto',  warning: 'auto', blocking: 'wait' };
  }
}
```

- [ ] **Step 26.3: Write tests `packages/ai/test/reconciliation/conflict-detector.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { detectConflicts, type CanonSnapshot } from '../../src/reconciliation/conflict-detector.js';

const baseSnapshot: CanonSnapshot = {
  characters: [{ id: 'cid-1', name: 'Lam Trạch', status: 'alive', currentRealm: 'trúc cơ', bloodlines: [], lockedFields: [] }],
  lockedCanonFacts: [],
  knownThreadIds: new Set(['tid-1']),
};

describe('detectConflicts — character', () => {
  it('blocks edit on locked field', () => {
    const snap = { ...baseSnapshot, characters: [{ ...baseSnapshot.characters[0]!, lockedFields: ['currentRealm'] }] };
    const rows = detectConflicts({ characterUpdates: [{ action: 'update', name: 'Lam Trạch', fields: { currentRealm: 'kim đan' } }], newCanonFacts: [], threadUpdates: [], newTimelineEvents: [], seedsResolvedThisChapter: [] }, snap);
    expect(rows[0]!.conflictStatus).toBe('blocking');
  });

  it('blocks realm regression without intentional flag', () => {
    const rows = detectConflicts({ characterUpdates: [{ action: 'update', name: 'Lam Trạch', fields: { currentRealm: 'luyện khí' } }], newCanonFacts: [], threadUpdates: [], newTimelineEvents: [], seedsResolvedThisChapter: [] }, baseSnapshot);
    expect(rows[0]!.conflictStatus).toBe('blocking');
  });

  it('warns on idempotent dead → dead', () => {
    const snap = { ...baseSnapshot, characters: [{ ...baseSnapshot.characters[0]!, status: 'dead' }] };
    const rows = detectConflicts({ characterUpdates: [{ action: 'update', name: 'Lam Trạch', fields: { status: 'dead' as const } }], newCanonFacts: [], threadUpdates: [], newTimelineEvents: [], seedsResolvedThisChapter: [] }, snap);
    expect(rows[0]!.conflictStatus).toBe('warning');
  });

  it('warns on new bloodline without supporting event', () => {
    const rows = detectConflicts({ characterUpdates: [{ action: 'update', name: 'Lam Trạch', fields: { bloodlines: ['Hỏa Long'] } }], newCanonFacts: [], threadUpdates: [], newTimelineEvents: [], seedsResolvedThisChapter: [] }, baseSnapshot);
    expect(rows[0]!.conflictStatus).toBe('warning');
  });
});

describe('detectConflicts — canon_fact', () => {
  it('blocks locked-fact contradiction', () => {
    const snap = { ...baseSnapshot, lockedCanonFacts: [{ id: 'f1', topic: 'Lam Trạch', fact: 'Lam Trạch còn sống' }] };
    const rows = detectConflicts({ characterUpdates: [], newCanonFacts: [{ topic: 'Lam Trạch', fact: 'Lam Trạch đã chết', importance: 'locked' as const }], threadUpdates: [], newTimelineEvents: [], seedsResolvedThisChapter: [] }, snap);
    expect(rows[0]!.conflictStatus).toBe('blocking');
  });
});

describe('detectConflicts — thread', () => {
  it('blocks update to unknown thread', () => {
    const rows = detectConflicts({ characterUpdates: [], newCanonFacts: [], threadUpdates: [{ action: 'update', targetId: '00000000-0000-0000-0000-0000000000ff', title: 'X' }], newTimelineEvents: [], seedsResolvedThisChapter: [] }, baseSnapshot);
    expect(rows[0]!.conflictStatus).toBe('blocking');
  });
});
```

- [ ] **Step 26.4: Write integration test `packages/ai/test/reconciliation/canon-merger.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import pino from 'pino';
import { createTestDb, dropTestDb, type TestDb } from '@novel/db/test-helpers';
import { CanonMerger } from '../../src/reconciliation/canon-merger.js';
import { MockEmbeddingService } from '../../src/embeddings/mock.js';

let tdb: TestDb;
beforeAll(async () => { tdb = await createTestDb('merger'); });
afterAll(async () => { await dropTestDb(tdb); });

const STORY = '00000000-0000-0000-0000-000000000010';
const CHAP = '00000000-0000-0000-0000-000000000099';

beforeEach(async () => {
  await tdb.db.execute(sql`TRUNCATE stories, characters, canon_facts, open_threads, timeline_events, pending_canon_updates, chapters CASCADE`);
  await tdb.db.execute(sql`INSERT INTO stories (id, title, premise) VALUES (${STORY}, 't', 'p')`);
  await tdb.db.execute(sql`INSERT INTO chapters (id, story_id, chapter_number, title, content) VALUES (${CHAP}, ${STORY}, 1, 't', 'c')`);
});

describe('CanonMerger.submit', () => {
  it('semi_auto applies none + warning, leaves blocking', async () => {
    const m = new CanonMerger({ db: tdb.db, embeddings: new MockEmbeddingService(), logger: pino({ level: 'silent' }) });
    const out = await m.submit({
      storyId: STORY, chapterId: CHAP, chapterNumber: 1,
      rows: [
        { updateType: 'character', targetTable: 'characters', payload: { action: 'create', name: 'Lam Trạch', fields: { currentRealm: 'luyện khí', status: 'alive' } }, conflictStatus: 'none', conflictReasons: [] },
        { updateType: 'canon_fact', targetTable: 'canon_facts', payload: { topic: 'Lam Trạch', fact: 'sinh ra ở Thanh Vân Tông', importance: 'high' }, conflictStatus: 'warning', conflictReasons: ['x'] },
        { updateType: 'character', targetTable: 'characters', payload: { action: 'update', name: 'X', fields: {} }, conflictStatus: 'blocking', conflictReasons: ['no such char'] },
      ],
      seedsResolvedIds: [], mode: 'semi_auto', traceId: 't',
    });
    expect(out.applied).toBe(2);
    expect(out.blocked).toBe(1);
    const chars = (await tdb.db.execute(sql`SELECT * FROM characters`)) as unknown as { name: string }[];
    expect(chars).toHaveLength(1);
    expect(chars[0]!.name).toBe('Lam Trạch');
  });

  it('safe mode applies none', async () => {
    const m = new CanonMerger({ db: tdb.db, embeddings: new MockEmbeddingService(), logger: pino({ level: 'silent' }) });
    const out = await m.submit({
      storyId: STORY, chapterId: CHAP, chapterNumber: 1,
      rows: [{ updateType: 'character', targetTable: 'characters', payload: { action: 'create', name: 'A', fields: {} }, conflictStatus: 'none', conflictReasons: [] }],
      seedsResolvedIds: [], mode: 'safe', traceId: 't',
    });
    expect(out.applied).toBe(0);
    expect(out.blocked).toBe(1);
  });
});
```

- [ ] **Step 26.5: Test + commit**

```bash
pnpm --filter @novel/ai test conflict-detector
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm --filter @novel/ai test canon-merger
git add packages/ai/src/reconciliation packages/ai/test/reconciliation
git commit -m "feat(ai): conflict detector + canon merger (mode-aware)"
```

---

## Task 27: Summary Compactor schema + prompt v1

**Files:**
- Create: `packages/ai/src/schemas/summary.ts`
- Create: `packages/ai/src/prompts/summary-compactor.v1.ts`

- [ ] **Step 27.1: Write `packages/ai/src/schemas/summary.ts`**

```ts
import { z } from 'zod';

export const ChapterSummarySchema = z.object({
  shortSummary: z.string().min(20).max(800),    // ~200 tok
  detailedSummary: z.string().min(50).max(2000),// ~500 tok
});

export type ChapterSummaryOutput = z.infer<typeof ChapterSummarySchema>;

export const CHAPTER_SUMMARY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    shortSummary: { type: 'string' },
    detailedSummary: { type: 'string' },
  },
  required: ['shortSummary', 'detailedSummary'],
} as const;
```

- [ ] **Step 27.2: Write `packages/ai/src/prompts/summary-compactor.v1.ts`**

```ts
import type { PromptTemplate } from './registry.js';

export const summaryCompactorPromptV1: PromptTemplate<{
  chapterTitle: string;
  chapterContent: string;
  chapterNumber: number;
}> = {
  agentRole: 'summary_compactor',
  version: 'v1',
  build: (input) => ({
    system: `Tóm tắt chương ngắn gọn để dùng làm bộ nhớ context. Trả JSON có shortSummary (~200 tok) và detailedSummary (~500 tok). Tiếng Việt, không thêm ý ngoài chương.`,
    user: [
      `## CHƯƠNG ${input.chapterNumber}: ${input.chapterTitle}`,
      input.chapterContent,
      '',
      '## INSTRUCTION',
      'shortSummary: 1-2 câu nội dung chính. detailedSummary: liệt kê sự kiện theo thứ tự, các thay đổi nhân vật/state. Trả JSON.',
    ].join('\n'),
  }),
};
```

- [ ] **Step 27.3: Register + commit**

```ts
import { summaryCompactorPromptV1 } from './summary-compactor.v1.js';
registerPrompt(summaryCompactorPromptV1);
```

```bash
git add packages/ai/src/schemas/summary.ts packages/ai/src/prompts/summary-compactor.v1.ts packages/ai/src/prompts/registry.ts
git commit -m "feat(ai): summary compactor schema + prompt v1"
```

---

## Task 28: Summary Compactor agent (per-chapter)

**Files:**
- Create: `packages/ai/src/agents/summary-compactor.ts`
- Create: `packages/ai/test/agents/summary-compactor.test.ts`

- [ ] **Step 28.1: Write `packages/ai/src/agents/summary-compactor.ts`**

```ts
import type { Logger } from 'pino';
import { MODEL_CONFIG } from '@novel/core/config/models';
import type { LLMProvider } from '../providers/types.js';
import { summaryCompactorPromptV1 } from '../prompts/summary-compactor.v1.js';
import { ChapterSummarySchema, CHAPTER_SUMMARY_JSON_SCHEMA, type ChapterSummaryOutput } from '../schemas/summary.js';

export class SummaryCompactor {
  constructor(private readonly deps: { provider: LLMProvider; logger: Logger }) {}

  async summarizeChapter(input: {
    chapterTitle: string;
    chapterContent: string;
    chapterNumber: number;
    storyId: string;
    traceId: string;
  }): Promise<ChapterSummaryOutput & { llmCallId: string; cost: number }> {
    const built = summaryCompactorPromptV1.build(input);
    const res = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.summary_compactor,
      system: built.system,
      messages: [{ role: 'user', content: built.user }],
      responseSchema: CHAPTER_SUMMARY_JSON_SCHEMA,
      temperature: 0.2,
      traceId: input.traceId,
      agentRole: 'summary_compactor',
      promptVersion: summaryCompactorPromptV1.version,
      storyId: input.storyId,
    });
    const parsed = ChapterSummarySchema.parse(JSON.parse(res.text));
    return { ...parsed, llmCallId: res.llmCallId, cost: res.cost };
  }
}
```

- [ ] **Step 28.2: Write tests `packages/ai/test/agents/summary-compactor.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { SummaryCompactor } from '../../src/agents/summary-compactor.js';
import { MockLLMProvider } from '../../src/providers/mock.js';

describe('SummaryCompactor', () => {
  it('parses summary output', async () => {
    const provider = new MockLLMProvider({
      responses: [{
        text: JSON.stringify({
          shortSummary: 'Lam Trạch gặp sư phụ và bắt đầu tu luyện.',
          detailedSummary: 'Lam Trạch rời nhà, gặp lão Đạo sĩ ở Thanh Vân Tông, được nhận làm đệ tử ngoại môn. Sự kiện: nhập môn Thanh Vân Tông. Trạng thái: alive, realm phàm nhân.',
        }),
        llmCallId: 'm', usage: { inputTokens: 4500, cachedInputTokens: 0, outputTokens: 700 }, cost: 0.00078,
      }],
    });
    const s = new SummaryCompactor({ provider, logger: pino({ level: 'silent' }) });
    const r = await s.summarizeChapter({ chapterTitle: 'Ch1', chapterContent: 'body', chapterNumber: 1, storyId: 's', traceId: 't' });
    expect(r.shortSummary.length).toBeGreaterThan(20);
    expect(r.detailedSummary.length).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 28.3: Test + commit**

```bash
pnpm --filter @novel/ai test summary-compactor
git add packages/ai/src/agents/summary-compactor.ts packages/ai/test/agents/summary-compactor.test.ts
git commit -m "feat(ai): summary compactor agent (per-chapter)"
```

---

### Task 29: Refresh-arc-summary placeholder job

**Files:**
- Create: `apps/worker/src/jobs/refresh-arc-summary.ts`
- Test: `apps/worker/test/jobs/refresh-arc-summary.test.ts`

This is a stub so the queue contract is reserved now and Plan 3 fills in the real implementation. The job logs the request and returns; no canon writes.

- [ ] **Step 29.1: Stub the job**

```ts
// apps/worker/src/jobs/refresh-arc-summary.ts
import type { Job } from 'bullmq';
import { logger } from '@novel/core/logger';

export interface RefreshArcSummaryJobData {
  storyId: string;
  arcId: string;
}

export async function refreshArcSummary(job: Job<RefreshArcSummaryJobData>): Promise<{ status: 'noop' }> {
  logger.info({ jobId: job.id, ...job.data }, 'refresh-arc-summary placeholder invoked (Plan 3 implements)');
  return { status: 'noop' };
}
```

- [ ] **Step 29.2: Test stub returns noop**

```ts
// apps/worker/test/jobs/refresh-arc-summary.test.ts
import { describe, it, expect } from 'vitest';
import { refreshArcSummary } from '../../src/jobs/refresh-arc-summary';

describe('refreshArcSummary', () => {
  it('returns noop without throwing', async () => {
    const fakeJob = { id: 't1', data: { storyId: 's', arcId: 'a' } } as any;
    const result = await refreshArcSummary(fakeJob);
    expect(result.status).toBe('noop');
  });
});
```

- [ ] **Step 29.3: Test + commit**

```bash
pnpm --filter @novel/worker test refresh-arc-summary
git add apps/worker/src/jobs/refresh-arc-summary.ts apps/worker/test/jobs/refresh-arc-summary.test.ts
git commit -m "feat(worker): refresh-arc-summary placeholder job (Plan 3 will implement)"
```

---

### Task 30: generate-chapter orchestrator (BullMQ keystone)

**Files:**
- Create: `apps/worker/src/jobs/generate-chapter.ts`
- Create: `apps/worker/src/jobs/generate-chapter.types.ts`
- Test: `apps/worker/test/jobs/generate-chapter.integration.test.ts`

This is the central state machine. It wires every component built in Tasks 4-28 into the per-chapter flow:

```
loadInputs
  → PacketGenerator (with auditHints if retry)
  → PacketAuditor (deterministic; if blocking, regenerate ≤2× then fail-soft)
  → ContextBuilder (HOT/WARM/COLD; persist context_packets)
  → WriterAgent
  → DeterministicValidator (severity short-circuit on critical)
  → LLMValidator (if no critical)
  → AutoFixer (1× max for low/medium issues only; never critical)
  → CanonExtractor
  → ConflictDetector
  → CanonMerger.submit (mode-aware: pending or apply)
  → SummaryCompactor
  → bump character.version for any updated character (already in CanonMerger)
  → bump arc.summary_version timestamp + enqueue refresh-arc-summary if due
  → write chapter row + persist metrics in chapter_generation_attempts
```

Job state transitions live in the chapter row (`status` column) and a per-attempt row in `chapter_generation_attempts` (Plan 1 schema).

- [ ] **Step 30.1: Job data + result types**

```ts
// apps/worker/src/jobs/generate-chapter.types.ts
export interface GenerateChapterJobData {
  storyId: string;
  chapterNumber: number;
  mode: 'safe' | 'semi_auto' | 'full_auto';
  /** if true, this is a retry (auditor or validator failed previously) */
  retryAttempt?: number;
}

export interface GenerateChapterJobResult {
  chapterId: string;
  status: 'completed' | 'paused_pending_updates' | 'failed';
  attempts: number;
  totalTokens: number;
  totalCostUsd: number;
  durationMs: number;
}
```

- [ ] **Step 30.2: Write the orchestrator**

```ts
// apps/worker/src/jobs/generate-chapter.ts
import type { Job } from 'bullmq';
import { db, chapters, chapterGenerationAttempts, arcs, stories } from '@novel/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '@novel/core/logger';
import { PacketGeneratorAgent } from '@novel/ai/agents/packet-generator';
import { PacketAuditor } from '@novel/ai/validators/packet-auditor';
import { ContextBuilder } from '@novel/ai/context/builder';
import { WriterAgent } from '@novel/ai/agents/writer';
import { runDeterministicValidators } from '@novel/ai/validators/deterministic/runner';
import { LLMValidatorAgent } from '@novel/ai/agents/llm-validator';
import { AutoFixerAgent } from '@novel/ai/agents/auto-fixer';
import { CanonExtractorAgent } from '@novel/ai/agents/canon-extractor';
import { detectConflicts } from '@novel/ai/reconciliation/conflict-detector';
import { CanonMerger } from '@novel/ai/reconciliation/canon-merger';
import { SummaryCompactorAgent } from '@novel/ai/agents/summary-compactor';
import { getRefreshArcSummaryQueue } from '../queues';
import type {
  GenerateChapterJobData,
  GenerateChapterJobResult,
} from './generate-chapter.types';

const MAX_PACKET_REGENERATIONS = 2;

export async function generateChapter(
  job: Job<GenerateChapterJobData>,
  deps: {
    packetGenerator: PacketGeneratorAgent;
    packetAuditor: PacketAuditor;
    contextBuilder: ContextBuilder;
    writer: WriterAgent;
    llmValidator: LLMValidatorAgent;
    autoFixer: AutoFixerAgent;
    canonExtractor: CanonExtractorAgent;
    canonMerger: CanonMerger;
    summaryCompactor: SummaryCompactorAgent;
  },
): Promise<GenerateChapterJobResult> {
  const { storyId, chapterNumber, mode } = job.data;
  const startedAt = Date.now();
  const log = logger.child({ jobId: job.id, storyId, chapterNumber, mode });
  log.info('generate-chapter: start');

  // 1. Load story + ensure no duplicate chapter row
  const [story] = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
  if (!story) throw new Error(`Story ${storyId} not found`);

  const [existing] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.storyId, storyId), eq(chapters.number, chapterNumber)))
    .limit(1);
  if (existing && existing.status === 'completed') {
    log.warn('chapter already completed; refusing to overwrite');
    return {
      chapterId: existing.id,
      status: 'completed',
      attempts: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      durationMs: Date.now() - startedAt,
    };
  }

  // 2. Insert chapter row in `pending` status (or update existing)
  const chapterId =
    existing?.id ??
    (
      await db
        .insert(chapters)
        .values({ storyId, number: chapterNumber, status: 'pending', title: '', content: '' })
        .returning({ id: chapters.id })
    )[0].id;
  await db.update(chapters).set({ status: 'generating' }).where(eq(chapters.id, chapterId));

  // 3. Insert attempt row
  const attemptNumber = existing?.attemptCount ? existing.attemptCount + 1 : 1;
  const [attempt] = await db
    .insert(chapterGenerationAttempts)
    .values({
      chapterId,
      attemptNumber,
      status: 'running',
      mode,
      stage: 'packet',
    })
    .returning({ id: chapterGenerationAttempts.id });
  await job.updateProgress({ stage: 'packet', percent: 5 });

  let totalTokens = 0;
  let totalCost = 0;
  const trackUsage = (u: { tokens: number; costUsd: number }) => {
    totalTokens += u.tokens;
    totalCost += u.costUsd;
  };

  try {
    // 4. Packet generation + audit loop
    let packet: any;
    let auditHints: string[] = [];
    for (let attempt = 0; attempt <= MAX_PACKET_REGENERATIONS; attempt++) {
      const r = await deps.packetGenerator.generate({
        storyId,
        chapterNumber,
        auditHints: attempt === 0 ? undefined : auditHints,
      });
      trackUsage(r.usage);
      packet = r.packet;
      const audit = await deps.packetAuditor.audit(packet, { storyId, chapterNumber });
      if (audit.issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0) {
        break;
      }
      if (attempt === MAX_PACKET_REGENERATIONS) {
        await db
          .update(chapterGenerationAttempts)
          .set({ status: 'failed', failureReason: 'packet_audit_failed', auditIssues: audit.issues })
          .where(eq(chapterGenerationAttempts.id, attempt.id));
        await db.update(chapters).set({ status: 'failed' }).where(eq(chapters.id, chapterId));
        return {
          chapterId,
          status: 'failed',
          attempts: attemptNumber,
          totalTokens,
          totalCostUsd: totalCost,
          durationMs: Date.now() - startedAt,
        };
      }
      auditHints = audit.issues.map((i) => i.message);
      log.warn({ auditHints }, 'packet audit failed; regenerating');
    }
    await job.updateProgress({ stage: 'context', percent: 20 });
    await db
      .update(chapterGenerationAttempts)
      .set({ stage: 'context', packetSnapshot: packet })
      .where(eq(chapterGenerationAttempts.id, attempt.id));

    // 5. Context build
    const ctx = await deps.contextBuilder.build({ storyId, chapterNumber, packet });
    await job.updateProgress({ stage: 'write', percent: 35 });
    await db
      .update(chapterGenerationAttempts)
      .set({
        stage: 'write',
        contextHotHash: ctx.cacheKey.hotHash,
        contextWarmHash: ctx.cacheKey.warmHash,
        contextTokenCount: ctx.totalTokens,
      })
      .where(eq(chapterGenerationAttempts.id, attempt.id));

    // 6. Writer
    const written = await deps.writer.write({ context: ctx, packet });
    trackUsage(written.usage);
    await job.updateProgress({ stage: 'validate', percent: 55 });

    // 7. Deterministic validation
    let { title, content } = written;
    let detResult = await runDeterministicValidators({
      title,
      content,
      packet,
      context: ctx,
    });

    if (detResult.criticalCount > 0) {
      await db
        .update(chapterGenerationAttempts)
        .set({ status: 'failed', failureReason: 'deterministic_critical', validatorIssues: detResult.issues })
        .where(eq(chapterGenerationAttempts.id, attempt.id));
      await db.update(chapters).set({ status: 'failed' }).where(eq(chapters.id, chapterId));
      return {
        chapterId,
        status: 'failed',
        attempts: attemptNumber,
        totalTokens,
        totalCostUsd: totalCost,
        durationMs: Date.now() - startedAt,
      };
    }

    // 8. LLM validator
    const llmIssues = await deps.llmValidator.validate({
      title,
      content,
      context: ctx,
      packet,
      cacheKey: ctx.cacheKey,
    });
    trackUsage(llmIssues.usage);

    const allIssues = [...detResult.issues, ...llmIssues.issues];
    const fixable = allIssues.filter((i) => i.severity === 'low' || i.severity === 'medium');

    // 9. Auto-fix (1× max)
    if (fixable.length > 0 && allIssues.every((i) => i.severity !== 'critical')) {
      await job.updateProgress({ stage: 'fix', percent: 65 });
      const fixed = await deps.autoFixer.fix({
        title,
        content,
        issues: fixable,
        context: ctx,
      });
      trackUsage(fixed.usage);
      title = fixed.title;
      content = fixed.content;
    }

    // 10. Canon extraction
    await job.updateProgress({ stage: 'extract', percent: 75 });
    const extracted = await deps.canonExtractor.extract({
      title,
      content,
      chapterNumber,
      packet,
      context: ctx,
    });
    trackUsage(extracted.usage);

    // 11. Conflict detection + reconciliation
    await job.updateProgress({ stage: 'reconcile', percent: 85 });
    const conflicts = await detectConflicts(extracted.updates, { storyId, chapterNumber });
    const mergeOutcome = await deps.canonMerger.submit({
      storyId,
      chapterNumber,
      mode,
      updates: extracted.updates,
      conflicts,
    });

    // 12. Summary compaction
    await job.updateProgress({ stage: 'summarize', percent: 92 });
    const summary = await deps.summaryCompactor.compact({
      title,
      content,
      chapterNumber,
      context: ctx,
    });
    trackUsage(summary.usage);

    // 13. Persist final chapter row
    const finalStatus =
      mergeOutcome.pendingCount > 0 && mode === 'safe' ? 'paused_pending_updates' : 'completed';
    await db
      .update(chapters)
      .set({
        title,
        content,
        wordCount: countWords(content),
        shortSummary: summary.shortSummary,
        detailedSummary: summary.detailedSummary,
        status: finalStatus,
        attemptCount: attemptNumber,
        completedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    // 14. Persist attempt success
    await db
      .update(chapterGenerationAttempts)
      .set({
        status: 'completed',
        stage: 'done',
        totalTokens,
        totalCostUsd: totalCost.toString(),
        validatorIssues: allIssues,
        completedAt: new Date(),
      })
      .where(eq(chapterGenerationAttempts.id, attempt.id));

    // 15. Bump arc.summary_version + enqueue refresh if window crossed
    await maybeEnqueueArcSummaryRefresh(storyId, chapterNumber);

    await job.updateProgress({ stage: 'done', percent: 100 });
    log.info({ totalTokens, totalCost, finalStatus }, 'generate-chapter: done');

    return {
      chapterId,
      status: finalStatus,
      attempts: attemptNumber,
      totalTokens,
      totalCostUsd: totalCost,
      durationMs: Date.now() - startedAt,
    };
  } catch (err: any) {
    log.error({ err: err.message, stack: err.stack }, 'generate-chapter: failed');
    await db
      .update(chapterGenerationAttempts)
      .set({ status: 'failed', failureReason: err.message?.slice(0, 500) ?? 'unknown' })
      .where(eq(chapterGenerationAttempts.id, attempt.id));
    await db.update(chapters).set({ status: 'failed' }).where(eq(chapters.id, chapterId));
    throw err;
  }
}

function countWords(content: string): number {
  return content.split(/\s+/).filter(Boolean).length;
}

async function maybeEnqueueArcSummaryRefresh(storyId: string, chapterNumber: number): Promise<void> {
  // Find arc whose chapter range contains this chapter
  const [arc] = await db
    .select()
    .from(arcs)
    .where(eq(arcs.storyId, storyId))
    .limit(1);
  if (!arc) return;
  // Refresh every 5 chapters within an arc (Plan 3 will tune)
  if (chapterNumber % 5 !== 0) return;
  const queue = getRefreshArcSummaryQueue();
  await queue.add('refresh-arc-summary', { storyId, arcId: arc.id });
}
```

- [ ] **Step 30.3: Integration test (mocked agents, real DB via testcontainers)**

```ts
// apps/worker/test/jobs/generate-chapter.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestContainers, stopTestContainers, seedStory } from '../helpers/containers';
import { generateChapter } from '../../src/jobs/generate-chapter';
import { mockAgents } from '../helpers/mock-agents';
import { db, chapters } from '@novel/db';
import { eq } from 'drizzle-orm';

describe('generateChapter integration', () => {
  beforeAll(async () => {
    await startTestContainers();
  });
  afterAll(async () => {
    await stopTestContainers();
  });

  it('runs full pipeline and writes a completed chapter row', async () => {
    const { storyId } = await seedStory();
    const fakeJob: any = {
      id: 'job-1',
      data: { storyId, chapterNumber: 1, mode: 'safe' as const },
      updateProgress: async () => {},
    };
    const result = await generateChapter(fakeJob, mockAgents());
    expect(['completed', 'paused_pending_updates']).toContain(result.status);
    const [row] = await db.select().from(chapters).where(eq(chapters.id, result.chapterId));
    expect(row.title.length).toBeGreaterThan(0);
    expect(row.content.length).toBeGreaterThan(2000); // ~2000 words minimum
  });

  it('fails after 3 packet audit failures', async () => {
    const { storyId } = await seedStory();
    const agents = mockAgents({ alwaysFailPacketAudit: true });
    const fakeJob: any = {
      id: 'job-2',
      data: { storyId, chapterNumber: 1, mode: 'safe' as const },
      updateProgress: async () => {},
    };
    const result = await generateChapter(fakeJob, agents);
    expect(result.status).toBe('failed');
  });
});
```

- [ ] **Step 30.4: Wire into worker entry**

Add to `apps/worker/src/index.ts`:

```ts
import { Worker } from 'bullmq';
import { createConnection, GENERATE_CHAPTER_QUEUE } from './queues';
import { generateChapter } from './jobs/generate-chapter';
import { buildAgentDeps } from './deps';

new Worker(
  GENERATE_CHAPTER_QUEUE,
  (job) => generateChapter(job as any, buildAgentDeps()),
  { connection: createConnection(), concurrency: 1 },
);
```

- [ ] **Step 30.5: Test + commit**

```bash
pnpm --filter @novel/worker test generate-chapter.integration
git add apps/worker/src/jobs/generate-chapter.ts apps/worker/src/jobs/generate-chapter.types.ts apps/worker/src/index.ts apps/worker/test/jobs/generate-chapter.integration.test.ts
git commit -m "feat(worker): generate-chapter orchestrator (full pipeline)"
```

---

### Task 31: Queue client service in API

**Files:**
- Create: `apps/api/src/services/queue-client.ts`
- Test: `apps/api/test/services/queue-client.test.ts`

The API enqueues jobs but never executes them. This service is the single seam between Fastify and BullMQ.

- [ ] **Step 31.1: Implement queue client**

```ts
// apps/api/src/services/queue-client.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@novel/core/env';
import type { GenerateChapterJobData } from '@novel/worker-types/generate-chapter';

let connection: IORedis | null = null;
let generateChapterQueue: Queue<GenerateChapterJobData> | null = null;

export function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

export function getGenerateChapterQueue(): Queue<GenerateChapterJobData> {
  if (!generateChapterQueue) {
    generateChapterQueue = new Queue<GenerateChapterJobData>('generate-chapter', {
      connection: getConnection(),
    });
  }
  return generateChapterQueue;
}

export async function enqueueGenerateChapter(
  data: GenerateChapterJobData,
): Promise<{ jobId: string }> {
  const queue = getGenerateChapterQueue();
  const jobId = `gen-${data.storyId}-${data.chapterNumber}`;
  // Idempotency: explicit jobId prevents double-enqueue for the same chapter
  const job = await queue.add('generate-chapter', data, {
    jobId,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 86400 * 7 },
  });
  return { jobId: job.id! };
}

export async function getGenerateChapterStatus(
  storyId: string,
  chapterNumber: number,
): Promise<{ jobId: string; state: string; progress: unknown } | null> {
  const queue = getGenerateChapterQueue();
  const jobId = `gen-${storyId}-${chapterNumber}`;
  const job = await queue.getJob(jobId);
  if (!job) return null;
  return { jobId: job.id!, state: await job.getState(), progress: job.progress };
}
```

- [ ] **Step 31.2: Test idempotent enqueue (mock BullMQ)**

```ts
// apps/api/test/services/queue-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdd = vi.fn();
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockAdd,
    getJob: vi.fn().mockResolvedValue(null),
  })),
}));
vi.mock('ioredis', () => ({ default: vi.fn() }));

import { enqueueGenerateChapter } from '../../src/services/queue-client';

describe('enqueueGenerateChapter', () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({ id: 'gen-s1-1' });
  });

  it('uses deterministic jobId for idempotency', async () => {
    await enqueueGenerateChapter({ storyId: 's1', chapterNumber: 1, mode: 'safe' });
    expect(mockAdd).toHaveBeenCalledWith(
      'generate-chapter',
      expect.objectContaining({ storyId: 's1', chapterNumber: 1 }),
      expect.objectContaining({ jobId: 'gen-s1-1' }),
    );
  });
});
```

- [ ] **Step 31.3: Test + commit**

```bash
pnpm --filter @novel/api test queue-client
git add apps/api/src/services/queue-client.ts apps/api/test/services/queue-client.test.ts
git commit -m "feat(api): queue-client service (enqueue + status)"
```

---

### Task 32: Chapters route (POST generate, GET list/detail)

**Files:**
- Create: `apps/api/src/routes/chapters.ts`
- Modify: `apps/api/src/server.ts` (register route)
- Test: `apps/api/test/routes/chapters.test.ts`

- [ ] **Step 32.1: Define schemas**

```ts
// apps/api/src/routes/chapters.schemas.ts
import { z } from 'zod';

export const PostGenerateBody = z.object({
  chapterNumber: z.number().int().positive(),
  mode: z.enum(['safe', 'semi_auto', 'full_auto']).default('safe'),
});

export const ChapterParams = z.object({
  storyId: z.string().uuid(),
});

export const ChapterDetailParams = z.object({
  storyId: z.string().uuid(),
  chapterNumber: z.coerce.number().int().positive(),
});
```

- [ ] **Step 32.2: Implement route**

```ts
// apps/api/src/routes/chapters.ts
import type { FastifyPluginAsync } from 'fastify';
import { db, chapters } from '@novel/db';
import { eq, and, asc } from 'drizzle-orm';
import { enqueueGenerateChapter, getGenerateChapterStatus } from '../services/queue-client';
import { PostGenerateBody, ChapterParams, ChapterDetailParams } from './chapters.schemas';

export const chaptersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/stories/:storyId/chapters → list
  fastify.get('/api/stories/:storyId/chapters', async (req, reply) => {
    const { storyId } = ChapterParams.parse(req.params);
    const rows = await db
      .select({
        id: chapters.id,
        number: chapters.number,
        title: chapters.title,
        status: chapters.status,
        wordCount: chapters.wordCount,
        completedAt: chapters.completedAt,
      })
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.number));
    return reply.send({ chapters: rows });
  });

  // GET /api/stories/:storyId/chapters/:chapterNumber → detail
  fastify.get('/api/stories/:storyId/chapters/:chapterNumber', async (req, reply) => {
    const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
    const [row] = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), eq(chapters.number, chapterNumber)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: 'chapter_not_found' });
    return reply.send({ chapter: row });
  });

  // POST /api/stories/:storyId/chapters/generate → enqueue
  fastify.post('/api/stories/:storyId/chapters/generate', async (req, reply) => {
    const { storyId } = ChapterParams.parse(req.params);
    const body = PostGenerateBody.parse(req.body);
    const { jobId } = await enqueueGenerateChapter({
      storyId,
      chapterNumber: body.chapterNumber,
      mode: body.mode,
    });
    return reply.code(202).send({ jobId, storyId, chapterNumber: body.chapterNumber });
  });

  // GET /api/stories/:storyId/chapters/:chapterNumber/status → poll
  fastify.get('/api/stories/:storyId/chapters/:chapterNumber/status', async (req, reply) => {
    const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
    const status = await getGenerateChapterStatus(storyId, chapterNumber);
    if (!status) return reply.code(404).send({ error: 'no_active_job' });
    return reply.send(status);
  });
};
```

- [ ] **Step 32.3: Register in server.ts**

```ts
// apps/api/src/server.ts (add)
import { chaptersRoutes } from './routes/chapters';
await app.register(chaptersRoutes);
```

- [ ] **Step 32.4: Test routes (mocked queue client)**

```ts
// apps/api/test/routes/chapters.test.ts
import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';

vi.mock('../../src/services/queue-client', () => ({
  enqueueGenerateChapter: vi.fn().mockResolvedValue({ jobId: 'gen-s-1' }),
  getGenerateChapterStatus: vi.fn().mockResolvedValue({ jobId: 'gen-s-1', state: 'active', progress: 50 }),
}));

import { chaptersRoutes } from '../../src/routes/chapters';

describe('chapters routes', () => {
  it('POST generate returns 202 with jobId', async () => {
    const app = Fastify();
    await app.register(chaptersRoutes);
    const res = await app.inject({
      method: 'POST',
      url: `/api/stories/${'00000000-0000-0000-0000-000000000001'}/chapters/generate`,
      payload: { chapterNumber: 1, mode: 'safe' },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ jobId: 'gen-s-1', chapterNumber: 1 });
  });

  it('GET status returns active state', async () => {
    const app = Fastify();
    await app.register(chaptersRoutes);
    const res = await app.inject({
      method: 'GET',
      url: `/api/stories/${'00000000-0000-0000-0000-000000000001'}/chapters/1/status`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().state).toBe('active');
  });
});
```

- [ ] **Step 32.5: Test + commit**

```bash
pnpm --filter @novel/api test chapters
git add apps/api/src/routes/chapters.ts apps/api/src/routes/chapters.schemas.ts apps/api/src/server.ts apps/api/test/routes/chapters.test.ts
git commit -m "feat(api): chapters route (list, detail, generate, status)"
```

---

### Task 33: SSE chapter status stream

**Files:**
- Modify: `apps/api/src/routes/chapters.ts` (add SSE endpoint)
- Test: `apps/api/test/routes/chapters-sse.test.ts`

The polling endpoint is fine for the MVP, but a single SSE stream halves UI latency and removes polling load. Implementation polls BullMQ every 1 s server-side and pushes diffs.

- [ ] **Step 33.1: Add SSE handler**

```ts
// apps/api/src/routes/chapters.ts (append handler)
fastify.get(
  '/api/stories/:storyId/chapters/:chapterNumber/stream',
  async (req, reply) => {
    const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let lastJson = '';
    const send = (data: unknown) => {
      const json = JSON.stringify(data);
      if (json === lastJson) return;
      lastJson = json;
      reply.raw.write(`data: ${json}\n\n`);
    };

    const interval = setInterval(async () => {
      const status = await getGenerateChapterStatus(storyId, chapterNumber);
      if (status) send(status);
      if (status?.state === 'completed' || status?.state === 'failed') {
        clearInterval(interval);
        reply.raw.write('event: end\ndata: {}\n\n');
        reply.raw.end();
      }
    }, 1000);

    req.raw.on('close', () => clearInterval(interval));
  },
);
```

- [ ] **Step 33.2: Test SSE stream emits events**

```ts
// apps/api/test/routes/chapters-sse.test.ts
import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';

const states = ['waiting', 'active', 'completed'];
let i = 0;
vi.mock('../../src/services/queue-client', () => ({
  getGenerateChapterStatus: vi.fn().mockImplementation(async () => ({
    jobId: 'j',
    state: states[Math.min(i++, states.length - 1)],
    progress: 0,
  })),
  enqueueGenerateChapter: vi.fn(),
}));
import { chaptersRoutes } from '../../src/routes/chapters';

describe('SSE chapter status', () => {
  it('streams events and closes on completion', async () => {
    const app = Fastify();
    await app.register(chaptersRoutes);
    await app.listen({ port: 0 });
    const url = `http://localhost:${(app.server.address() as any).port}/api/stories/${'00000000-0000-0000-0000-000000000001'}/chapters/1/stream`;
    const res = await fetch(url);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value);
      if (buf.includes('event: end')) break;
    }
    expect(buf).toMatch(/data: \{"jobId"/);
    expect(buf).toMatch(/event: end/);
    await app.close();
  }, 15000);
});
```

- [ ] **Step 33.3: Test + commit**

```bash
pnpm --filter @novel/api test chapters-sse
git add apps/api/src/routes/chapters.ts apps/api/test/routes/chapters-sse.test.ts
git commit -m "feat(api): SSE stream for chapter generation status"
```

---

### Task 34: Pending updates route

**Files:**
- Create: `apps/api/src/routes/pending-updates.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/test/routes/pending-updates.test.ts`

In `safe` mode (default) every canon update lands in `pending_canon_updates`. The user must approve/reject each row before the merger applies it.

- [ ] **Step 34.1: Implement route**

```ts
// apps/api/src/routes/pending-updates.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, pendingCanonUpdates } from '@novel/db';
import { eq, and } from 'drizzle-orm';
import { CanonMerger } from '@novel/ai/reconciliation/canon-merger';
import { buildCanonMerger } from '../services/agent-deps';

const StoryParam = z.object({ storyId: z.string().uuid() });
const UpdateParam = z.object({
  storyId: z.string().uuid(),
  updateId: z.string().uuid(),
});
const ApproveBody = z.object({ overrideMerged: z.record(z.unknown()).optional() });

export const pendingUpdatesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/stories/:storyId/pending-updates', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db
      .select()
      .from(pendingCanonUpdates)
      .where(and(eq(pendingCanonUpdates.storyId, storyId), eq(pendingCanonUpdates.status, 'pending')));
    return reply.send({ updates: rows });
  });

  fastify.post('/api/stories/:storyId/pending-updates/:updateId/approve', async (req, reply) => {
    const { storyId, updateId } = UpdateParam.parse(req.params);
    const body = ApproveBody.parse(req.body ?? {});
    const merger = buildCanonMerger();
    const out = await merger.applyPending(updateId, { storyId, override: body.overrideMerged });
    return reply.send(out);
  });

  fastify.post('/api/stories/:storyId/pending-updates/:updateId/reject', async (req, reply) => {
    const { storyId, updateId } = UpdateParam.parse(req.params);
    await db
      .update(pendingCanonUpdates)
      .set({ status: 'rejected', resolvedAt: new Date() })
      .where(and(eq(pendingCanonUpdates.id, updateId), eq(pendingCanonUpdates.storyId, storyId)));
    return reply.send({ status: 'rejected', updateId });
  });
};
```

- [ ] **Step 34.2: Add `applyPending` to CanonMerger**

In `packages/ai/src/reconciliation/canon-merger.ts`, add:

```ts
async applyPending(
  pendingId: string,
  opts: { storyId: string; override?: Record<string, unknown> },
): Promise<{ status: 'applied'; rowsAffected: number }> {
  const [row] = await db
    .select()
    .from(pendingCanonUpdates)
    .where(eq(pendingCanonUpdates.id, pendingId))
    .limit(1);
  if (!row || row.status !== 'pending') {
    throw new Error(`Pending update ${pendingId} not found or already resolved`);
  }
  const finalUpdate = opts.override ? { ...row.proposedUpdate, ...opts.override } : row.proposedUpdate;
  const result = await this.applyOne(opts.storyId, row.entityType, finalUpdate);
  await db
    .update(pendingCanonUpdates)
    .set({ status: 'approved', resolvedAt: new Date(), appliedUpdate: finalUpdate })
    .where(eq(pendingCanonUpdates.id, pendingId));
  return { status: 'applied', rowsAffected: result.rowsAffected };
}
```

- [ ] **Step 34.3: Test (mocked merger)**

```ts
// apps/api/test/routes/pending-updates.test.ts
import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';

const mockApply = vi.fn().mockResolvedValue({ status: 'applied', rowsAffected: 1 });
vi.mock('../../src/services/agent-deps', () => ({
  buildCanonMerger: () => ({ applyPending: mockApply }),
}));
vi.mock('@novel/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }),
    update: () => ({ set: () => ({ where: vi.fn().mockResolvedValue(undefined) }) }),
  },
  pendingCanonUpdates: {} as any,
}));
import { pendingUpdatesRoutes } from '../../src/routes/pending-updates';

describe('pending-updates routes', () => {
  it('approves and calls merger', async () => {
    const app = Fastify();
    await app.register(pendingUpdatesRoutes);
    const res = await app.inject({
      method: 'POST',
      url: '/api/stories/00000000-0000-0000-0000-000000000001/pending-updates/00000000-0000-0000-0000-000000000abc/approve',
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(mockApply).toHaveBeenCalled();
  });

  it('rejects and marks row', async () => {
    const app = Fastify();
    await app.register(pendingUpdatesRoutes);
    const res = await app.inject({
      method: 'POST',
      url: '/api/stories/00000000-0000-0000-0000-000000000001/pending-updates/00000000-0000-0000-0000-000000000abc/reject',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'rejected' });
  });
});
```

- [ ] **Step 34.4: Test + commit**

```bash
pnpm --filter @novel/api test pending-updates
pnpm --filter @novel/ai test canon-merger
git add apps/api/src/routes/pending-updates.ts apps/api/src/server.ts apps/api/test/routes/pending-updates.test.ts packages/ai/src/reconciliation/canon-merger.ts
git commit -m "feat(api): pending-updates routes (list, approve, reject)"
```

---

### Task 35: Web data-fetching hooks

**Files:**
- Create: `apps/web/lib/api/chapters.ts`
- Create: `apps/web/lib/api/pending-updates.ts`
- Test: `apps/web/test/lib/api.test.ts`

Thin typed wrappers around `fetch` so pages stay focused on rendering.

- [ ] **Step 35.1: Implement client wrappers**

```ts
// apps/web/lib/api/chapters.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

export interface ChapterRow {
  id: string;
  number: number;
  title: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'paused_pending_updates';
  wordCount: number | null;
  completedAt: string | null;
}

export async function listChapters(storyId: string): Promise<ChapterRow[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/chapters`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listChapters ${r.status}`);
  return (await r.json()).chapters;
}

export async function getChapter(storyId: string, n: number) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/chapters/${n}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`getChapter ${r.status}`);
  return (await r.json()).chapter;
}

export async function generateChapter(
  storyId: string,
  body: { chapterNumber: number; mode: 'safe' | 'semi_auto' | 'full_auto' },
): Promise<{ jobId: string }> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/chapters/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`generateChapter ${r.status}`);
  return r.json();
}

export function streamChapterStatus(
  storyId: string,
  n: number,
  onEvent: (s: { state: string; progress: unknown }) => void,
): () => void {
  const es = new EventSource(`${BASE}/api/stories/${storyId}/chapters/${n}/stream`);
  es.onmessage = (ev) => onEvent(JSON.parse(ev.data));
  es.addEventListener('end', () => es.close());
  return () => es.close();
}
```

```ts
// apps/web/lib/api/pending-updates.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

export interface PendingUpdate {
  id: string;
  entityType: 'character' | 'canon_fact' | 'thread' | 'event';
  proposedUpdate: Record<string, unknown>;
  conflictReason: string | null;
  severity: 'none' | 'warning' | 'blocking';
  createdAt: string;
}

export async function listPending(storyId: string): Promise<PendingUpdate[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/pending-updates`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listPending ${r.status}`);
  return (await r.json()).updates;
}

export async function approvePending(storyId: string, updateId: string, override?: Record<string, unknown>) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/pending-updates/${updateId}/approve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ overrideMerged: override }),
  });
  if (!r.ok) throw new Error(`approve ${r.status}`);
  return r.json();
}

export async function rejectPending(storyId: string, updateId: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/pending-updates/${updateId}/reject`, {
    method: 'POST',
  });
  if (!r.ok) throw new Error(`reject ${r.status}`);
  return r.json();
}
```

- [ ] **Step 35.2: Test (msw or fetch mock)**

```ts
// apps/web/test/lib/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listChapters, generateChapter } from '../../lib/api/chapters';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chapters: [{ id: 'c1', number: 1, title: 'Ch1', status: 'completed', wordCount: 2400, completedAt: null }] }),
    }),
  );
});

describe('chapters api client', () => {
  it('listChapters returns rows', async () => {
    const rows = await listChapters('s1');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Ch1');
  });

  it('generateChapter posts payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ jobId: 'j1' }) }));
    const r = await generateChapter('s1', { chapterNumber: 2, mode: 'safe' });
    expect(r.jobId).toBe('j1');
  });
});
```

- [ ] **Step 35.3: Test + commit**

```bash
pnpm --filter @novel/web test api
git add apps/web/lib/api/chapters.ts apps/web/lib/api/pending-updates.ts apps/web/test/lib/api.test.ts
git commit -m "feat(web): chapters + pending-updates API client wrappers"
```

---

### Task 36: Chapters list + detail pages

**Files:**
- Create: `apps/web/app/stories/[id]/chapters/page.tsx`
- Create: `apps/web/app/stories/[id]/chapters/[n]/page.tsx`
- Create: `apps/web/app/stories/[id]/chapters/[n]/StatusStream.tsx` (client component)

Server components fetch on every load (no caching). Status stream is a tiny client component opened only while a job is active.

- [ ] **Step 36.1: Chapters list page**

```tsx
// apps/web/app/stories/[id]/chapters/page.tsx
import Link from 'next/link';
import { listChapters } from '@/lib/api/chapters';
import { GenerateNextButton } from './GenerateNextButton';

export default async function ChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapters = await listChapters(id);
  const nextNumber = (chapters[chapters.length - 1]?.number ?? 0) + 1;
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Chapters</h1>
        <GenerateNextButton storyId={id} chapterNumber={nextNumber} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th>#</th>
            <th>Title</th>
            <th>Status</th>
            <th>Words</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {chapters.map((c) => (
            <tr key={c.id} className="border-b">
              <td>{c.number}</td>
              <td>{c.title || <span className="text-gray-400">(pending)</span>}</td>
              <td>{c.status}</td>
              <td>{c.wordCount ?? '—'}</td>
              <td>
                <Link href={`/stories/${id}/chapters/${c.number}`} className="text-blue-600">Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 36.2: Generate-next button (client)**

```tsx
// apps/web/app/stories/[id]/chapters/GenerateNextButton.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateChapter } from '@/lib/api/chapters';

export function GenerateNextButton({ storyId, chapterNumber }: { storyId: string; chapterNumber: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await generateChapter(storyId, { chapterNumber, mode: 'safe' });
          router.push(`/stories/${storyId}/chapters/${chapterNumber}`);
        } finally {
          setLoading(false);
        }
      }}
      className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
    >
      {loading ? 'Enqueuing…' : `Generate chapter ${chapterNumber}`}
    </button>
  );
}
```

- [ ] **Step 36.3: Single-chapter view**

```tsx
// apps/web/app/stories/[id]/chapters/[n]/page.tsx
import { getChapter } from '@/lib/api/chapters';
import { StatusStream } from './StatusStream';

export default async function ChapterDetail({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}) {
  const { id, n } = await params;
  const chapter = await getChapter(id, Number(n));
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{chapter.title || `Chapter ${n}`}</h1>
      <p className="text-xs text-gray-500 mb-4">Status: {chapter.status}</p>
      {chapter.status === 'generating' && <StatusStream storyId={id} chapterNumber={Number(n)} />}
      <article className="prose whitespace-pre-wrap">{chapter.content || '(no content yet)'}</article>
    </div>
  );
}
```

- [ ] **Step 36.4: Status stream client component**

```tsx
// apps/web/app/stories/[id]/chapters/[n]/StatusStream.tsx
'use client';
import { useEffect, useState } from 'react';
import { streamChapterStatus } from '@/lib/api/chapters';

export function StatusStream({ storyId, chapterNumber }: { storyId: string; chapterNumber: number }) {
  const [event, setEvent] = useState<{ state: string; progress: unknown } | null>(null);
  useEffect(() => {
    return streamChapterStatus(storyId, chapterNumber, setEvent);
  }, [storyId, chapterNumber]);
  if (!event) return <p className="text-sm">Waiting for worker…</p>;
  const stage = (event.progress as { stage?: string })?.stage ?? 'unknown';
  const pct = (event.progress as { percent?: number })?.percent ?? 0;
  return (
    <div className="my-4 rounded border p-3 text-sm">
      <div>State: {event.state}</div>
      <div>Stage: {stage}</div>
      <div className="mt-2 h-2 bg-gray-200 rounded overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 36.5: Manual smoke + commit**

Run dev: `pnpm --filter @novel/web dev` and verify the list page renders. (No live LLM call — only the UI.)

```bash
git add apps/web/app/stories/[id]/chapters/page.tsx apps/web/app/stories/[id]/chapters/GenerateNextButton.tsx apps/web/app/stories/[id]/chapters/[n]/page.tsx apps/web/app/stories/[id]/chapters/[n]/StatusStream.tsx
git commit -m "feat(web): chapters list + detail + SSE status stream"
```

---

### Task 37: Pending updates approval UI

**Files:**
- Create: `apps/web/app/stories/[id]/pending/page.tsx`
- Create: `apps/web/app/stories/[id]/pending/PendingRow.tsx`

- [ ] **Step 37.1: Page**

```tsx
// apps/web/app/stories/[id]/pending/page.tsx
import { listPending } from '@/lib/api/pending-updates';
import { PendingRow } from './PendingRow';

export default async function PendingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await listPending(id);
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Pending canon updates</h1>
      {updates.length === 0 && <p className="text-gray-500 text-sm">Nothing pending — canon is clean.</p>}
      <ul className="space-y-3">
        {updates.map((u) => (
          <li key={u.id}>
            <PendingRow storyId={id} update={u} />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 37.2: Row (client)**

```tsx
// apps/web/app/stories/[id]/pending/PendingRow.tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approvePending, rejectPending, type PendingUpdate } from '@/lib/api/pending-updates';

export function PendingRow({ storyId, update }: { storyId: string; update: PendingUpdate }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const sevColor = { none: 'gray', warning: 'amber', blocking: 'red' }[update.severity];
  return (
    <div className="rounded border p-4">
      <div className="flex items-center justify-between">
        <span className={`text-xs uppercase text-${sevColor}-600`}>{update.severity}</span>
        <span className="text-xs text-gray-500">{update.entityType}</span>
      </div>
      {update.conflictReason && (
        <p className="mt-1 text-sm text-amber-700">{update.conflictReason}</p>
      )}
      <pre className="mt-2 text-xs bg-gray-50 p-2 overflow-auto">
        {JSON.stringify(update.proposedUpdate, null, 2)}
      </pre>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          disabled={pending}
          className="rounded bg-green-600 px-3 py-1 text-white text-sm disabled:opacity-50"
          onClick={() =>
            start(async () => {
              try {
                await approvePending(storyId, update.id);
                router.refresh();
              } catch (e: any) {
                setError(e.message);
              }
            })
          }
        >
          Approve
        </button>
        <button
          disabled={pending}
          className="rounded bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
          onClick={() =>
            start(async () => {
              try {
                await rejectPending(storyId, update.id);
                router.refresh();
              } catch (e: any) {
                setError(e.message);
              }
            })
          }
        >
          Reject
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 37.3: Manual smoke + commit**

Visit `/stories/<id>/pending` after seeding a pending update. Approve must call API and refresh.

```bash
git add apps/web/app/stories/[id]/pending/page.tsx apps/web/app/stories/[id]/pending/PendingRow.tsx
git commit -m "feat(web): pending canon updates approval UI"
```

---

### Task 38: Live-API smoke harness + Plan 2 wrap-up

**Files:**
- Create: `scripts/smoke-generate-chapter.ts`
- Modify: `package.json` (script entry)

This script triggers a real end-to-end chapter generation against the local stack. **Gated behind `RUN_LIVE_LLM=1` and only run after explicit user confirmation** (per the project's API-call policy).

- [ ] **Step 38.1: Write the smoke script**

```ts
// scripts/smoke-generate-chapter.ts
/**
 * RUN_LIVE_LLM=1 pnpm tsx scripts/smoke-generate-chapter.ts <storyId> <chapterNumber>
 * Costs ~$0.007 against Gemini Flash Lite per the cost model.
 */
import 'dotenv/config';
import { enqueueGenerateChapter, getGenerateChapterStatus } from '../apps/api/src/services/queue-client';

async function main() {
  if (process.env.RUN_LIVE_LLM !== '1') {
    console.error('Refusing to run: set RUN_LIVE_LLM=1 to incur token cost.');
    process.exit(2);
  }
  const [storyId, nStr] = process.argv.slice(2);
  if (!storyId || !nStr) {
    console.error('Usage: tsx scripts/smoke-generate-chapter.ts <storyId> <chapterNumber>');
    process.exit(1);
  }
  const n = Number(nStr);
  console.log(`Enqueuing chapter ${n} for story ${storyId}…`);
  const { jobId } = await enqueueGenerateChapter({ storyId, chapterNumber: n, mode: 'safe' });
  console.log(`Job ${jobId} enqueued. Polling status…`);

  const start = Date.now();
  let last = '';
  while (Date.now() - start < 5 * 60_000) {
    const s = await getGenerateChapterStatus(storyId, n);
    if (!s) {
      console.log('No active job (already completed?).');
      break;
    }
    const line = `state=${s.state} progress=${JSON.stringify(s.progress)}`;
    if (line !== last) {
      console.log(line);
      last = line;
    }
    if (s.state === 'completed' || s.state === 'failed') break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log('Done.');
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 38.2: Add npm script**

In root `package.json`:

```json
{
  "scripts": {
    "smoke:generate": "tsx scripts/smoke-generate-chapter.ts"
  }
}
```

- [ ] **Step 38.3: Document in README**

Add a "Smoke testing" section to the project README with this exact warning:

```markdown
### Smoke generation (live LLM)

This calls real Gemini Flash Lite via OpenRouter and incurs ~$0.007 per chapter.

```bash
RUN_LIVE_LLM=1 pnpm smoke:generate <storyId> <chapterNumber>
```

Do NOT run from CI or unattended — the script intentionally short-circuits without `RUN_LIVE_LLM=1`.
```

- [ ] **Step 38.4: Final test sweep**

Run the full Plan 2 test suite to confirm everything still passes:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: all green. If anything fails, fix in-place rather than skipping.

- [ ] **Step 38.5: Plan 2 wrap-up commit + tag**

```bash
git add scripts/smoke-generate-chapter.ts package.json README.md
git commit -m "chore(plan-2): live-LLM smoke harness + docs"
git tag plan-2-complete
```

---

## What's NOT in Plan 2 (handed off to Plan 3 / Plan 4)

- Saga Planner agent + UI (Plan 3)
- Arc Planner agent + UI (Plan 3)
- Planted seeds dashboard + manual CRUD (Plan 3)
- Saga rolling summary refresh job (Plan 3)
- Batch generation (semi_auto / full_auto modes, mode escalation) (Plan 3)
- High-Stakes Reviewer agent (Plan 3)
- Cost guardrail enforcement at queue level (Plan 3)
- Admin metrics dashboard (Plan 4)
- EPUB / Markdown export (Plan 4)
- Style few-shots upload UI (Plan 4)
- Story settings (config overrides) UI (Plan 4)

---
