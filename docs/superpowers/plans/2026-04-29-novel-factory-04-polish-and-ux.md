# Novel Factory — Plan 4: Polish & UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the polish layer — admin metrics, EPUB/Markdown export, style few-shots upload, per-story config overrides, prompt-version diff viewer, and the project documentation that turns the codebase into a usable product.

**Architecture:** Group H (spec section 7.5) + the two leftover Group G items (`story_settings`, `style_few_shots`). All work is read-only on the existing pipeline — no new agents, no new generation paths. New surfaces consume data and config that Plans 1-3 already produce. The `story_settings.overrides` row finally gets wired through `getEffectiveConfig` so per-story tuning takes effect end-to-end.

**Tech Stack:** Next.js 15 (App Router, RSC), Fastify 5, Drizzle, `epub-gen-memory` for EPUB, `diff` (jsdiff) for prompt-version diffs, existing Tailwind for UI.

**Invariants:**
1. **No new LLM call sites in Plan 4.** Polish only consumes existing data; export and diff are pure code paths.
2. **`story_settings.overrides`** is the **only** place per-story tuning lives. Both the UI and the runtime read through `getEffectiveConfig(storyId)` — never directly off the JSON.
3. **Style few-shots** save into `story_bibles.style_few_shots` (JSONB array). Writing one bumps `story_bibles.version`, which invalidates the HOT cache the next time `ContextBuilder.build` runs.
4. **Export is sync-on-demand** for ≤200 chapters, queued (`generate-export` BullMQ job) for ≥200 chapters. The threshold lives in `EXPORT_CONFIG`, not hard-coded.
5. **Admin metrics** are read-only aggregates over `llm_calls`, `validations`, `context_packets`, `pending_canon_updates`. No new columns. No materialized views in Plan 4 — Postgres handles the dataset for a single user.
6. **Prompt-version diff** is computed client-side from raw `prompt_versions.template` strings; the API just lists rows. No active-flag mutation in Plan 4 (already exists from Plan 1).

**Definition of Done:**
- `/admin` renders cache-hit rate per tier, cost/chapter 7-day rolling, validator failure breakdown, auto-fix success rate, pending-canon aging — using real data from a seeded DB
- Export downloads valid `.md` and `.epub` files for a story with ≥1 completed chapter
- Bible page lets the user paste / save / delete style few-shot passages; saving increments `story_bibles.version`
- `/stories/:id/settings` round-trips `story_settings.overrides` through a JSON form with presets
- `getEffectiveConfig(storyId)` deep-merges `overrides` over global config, and writer/packet generator honor the merged values
- `/admin/prompts` lists every `prompt_versions` row by `agent_role` with side-by-side diff between any two versions
- `README.md`, `docs/architecture.md`, `docs/runbook.md` exist and accurately describe the system as built
- `pnpm test` green across all packages; type check clean; manual UI smoke per Task 16
- Tag `plan-4-complete` on final commit

**Prerequisites:** Plan 3 complete (tag `plan-3-complete`). All entity tables, BullMQ queues, agent code, and per-story routes from Plans 1-3 exist and are tested. `story_settings` table exists from Plan 1 migration but is unused so far.

---

## File Structure

**New files (created in Plan 4):**

```
apps/api/src/routes/
  admin.ts                          # GET /admin/metrics aggregates
  exports.ts                        # POST /stories/:id/exports + GET /stories/:id/exports/:exportId
  prompt-versions.ts                # GET /admin/prompt-versions, GET /admin/prompt-versions/:role
  story-settings.ts                 # GET/PUT /stories/:id/settings

apps/web/src/app/admin/
  page.tsx                          # admin dashboard (metrics)
  prompts/page.tsx                  # prompt versions list
  prompts/[role]/page.tsx           # diff UI for a single role

apps/web/src/app/stories/[id]/
  settings/page.tsx                 # story settings JSON form
  bible/few-shots/page.tsx          # style few-shots upload UI

apps/web/src/lib/
  admin-metrics.ts                  # client wrappers for /admin/metrics
  exports.ts                        # client wrappers for export endpoints
  story-settings.ts                 # client wrappers for settings
  prompt-versions.ts                # client wrappers for prompt versions

apps/worker/src/jobs/
  generate-export.ts                # async EPUB build for big stories

packages/core/src/config/
  export-config.ts                  # EXPORT_CONFIG (sync threshold, formats)

packages/core/src/services/
  admin-metrics.ts                  # SQL aggregates (cache hit, cost rolling, validator breakdown, pending aging)
  exporters/markdown-exporter.ts    # story → Markdown string
  exporters/epub-exporter.ts        # story → EPUB Buffer

docs/
  architecture.md                   # full architecture overview
  runbook.md                        # ops + recovery procedures

README.md                           # project README (root, replaces stub if any)
```

**Modified files:**

```
packages/core/src/config/get-effective-config.ts
  # wire story_settings.overrides into the merge

apps/api/src/routes/bible.ts
  # add PUT /stories/:id/bible/style-few-shots endpoint

apps/api/src/server.ts
  # register admin / exports / prompt-versions / story-settings routes

apps/web/src/app/stories/[id]/bible/page.tsx
  # add link to "Edit style few-shots"

apps/web/src/app/stories/[id]/layout.tsx (or nav component)
  # add Settings link in story sidebar
```

Each file has one responsibility. Admin metrics aggregation lives outside the route so it's unit-testable; exporters are pure functions returning strings/buffers; settings overrides flow through one merge function.

---

### Task 1: EXPORT_CONFIG + admin metrics service skeleton

**Files:**
- Create: `packages/core/src/config/export-config.ts`
- Create: `packages/core/src/services/admin-metrics.ts`

- [ ] **Step 1.1: Write `EXPORT_CONFIG`**

```ts
// packages/core/src/config/export-config.ts
export const EXPORT_CONFIG = {
  SYNC_CHAPTER_THRESHOLD: 200,        // ≤ this → render in-process; > this → enqueue job
  SUPPORTED_FORMATS: ['markdown', 'epub'] as const,
  EPUB_LANGUAGE: 'vi',
  EPUB_AUTHOR_FALLBACK: 'AI Novel Factory',
} as const;

export type ExportFormat = (typeof EXPORT_CONFIG.SUPPORTED_FORMATS)[number];
```

- [ ] **Step 1.2: Write admin metrics service skeleton + types**

```ts
// packages/core/src/services/admin-metrics.ts
import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';

export interface CacheHitRate {
  tier: 'hot' | 'warm' | 'cold';
  totalBuilds: number;
  cachedTokens: number;
  totalInputTokens: number;
  hitRatePct: number;
}

export interface CostRollingPoint {
  date: string;          // YYYY-MM-DD
  chapterCount: number;
  totalCostUsd: string;  // numeric stringified for currency safety
  costPerChapterUsd: string;
}

export interface ValidatorFailureRow {
  checkId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
}

export interface AutoFixStat {
  attempted: number;
  succeeded: number;
  successRatePct: number;
}

export interface PendingCanonAgingBucket {
  ageBucket: '0-1d' | '1-7d' | '7-30d' | '30d+';
  count: number;
}

export interface AdminMetrics {
  cacheHitRates: CacheHitRate[];
  costRolling7d: CostRollingPoint[];
  validatorFailures: ValidatorFailureRow[];
  autoFix: AutoFixStat;
  pendingCanonAging: PendingCanonAgingBucket[];
}

export class AdminMetricsService {
  constructor(private readonly db: Database) {}
  async snapshot(): Promise<AdminMetrics> { throw new Error('not implemented'); }
}
```

- [ ] **Step 1.3: Commit**

```bash
git add packages/core/src/config/export-config.ts packages/core/src/services/admin-metrics.ts
git commit -m "feat(core): scaffold export config + admin metrics service"
```

---

### Task 2: Admin metrics SQL aggregates (TDD)

**Files:**
- Modify: `packages/core/src/services/admin-metrics.ts`
- Test: `packages/core/test/admin-metrics.test.ts`

- [ ] **Step 2.1: Write failing test**

```ts
// packages/core/test/admin-metrics.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb, seedFixture } from './helpers/db';
import { AdminMetricsService } from '../src/services/admin-metrics';

describe('AdminMetricsService', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    db = await setupTestDb();
    // Fixture: 1 story, 5 completed chapters across 3 days, 2 cache builds
    // (40% cached tokens), 3 validator failures (2 medium voice, 1 critical realm),
    // 4 auto-fix attempts (3 succeeded), 6 pending canon updates
    // (2 newer than 1d, 3 between 1-7d, 1 older than 30d).
    await seedFixture(db, 'admin-metrics-basic');
  });

  afterAll(async () => { await teardownTestDb(db); });

  it('computes cache hit rate per tier from context_packets', async () => {
    const svc = new AdminMetricsService(db);
    const m = await svc.snapshot();
    const hot = m.cacheHitRates.find(r => r.tier === 'hot');
    expect(hot).toBeDefined();
    expect(hot!.totalBuilds).toBe(2);
    expect(hot!.hitRatePct).toBeCloseTo(40, 0);
  });

  it('computes 7d rolling cost-per-chapter from llm_calls + chapters', async () => {
    const svc = new AdminMetricsService(db);
    const m = await svc.snapshot();
    expect(m.costRolling7d.length).toBeGreaterThanOrEqual(3);
    const total = m.costRolling7d.reduce((s, p) => s + Number(p.totalCostUsd), 0);
    expect(total).toBeGreaterThan(0);
  });

  it('groups validator failures by checkId and severity', async () => {
    const svc = new AdminMetricsService(db);
    const m = await svc.snapshot();
    const voice = m.validatorFailures.find(r => r.checkId === 'voice_drift' && r.severity === 'medium');
    expect(voice?.count).toBe(2);
    const realm = m.validatorFailures.find(r => r.severity === 'critical');
    expect(realm?.count).toBe(1);
  });

  it('reports auto-fix success rate', async () => {
    const svc = new AdminMetricsService(db);
    const m = await svc.snapshot();
    expect(m.autoFix.attempted).toBe(4);
    expect(m.autoFix.succeeded).toBe(3);
    expect(m.autoFix.successRatePct).toBeCloseTo(75, 0);
  });

  it('buckets pending canon updates by age', async () => {
    const svc = new AdminMetricsService(db);
    const m = await svc.snapshot();
    const newest = m.pendingCanonAging.find(b => b.ageBucket === '0-1d');
    expect(newest?.count).toBe(2);
    const older = m.pendingCanonAging.find(b => b.ageBucket === '30d+');
    expect(older?.count).toBe(1);
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `pnpm --filter @novel/core test admin-metrics`
Expected: FAIL with `not implemented`.

- [ ] **Step 2.3: Implement `snapshot()` with SQL aggregates**

```ts
// packages/core/src/services/admin-metrics.ts (replace stub)
async snapshot(): Promise<AdminMetrics> {
  const [cacheHitRates, costRolling7d, validatorFailures, autoFix, pendingCanonAging] = await Promise.all([
    this.queryCacheHitRates(),
    this.queryCostRolling7d(),
    this.queryValidatorFailures(),
    this.queryAutoFix(),
    this.queryPendingCanonAging(),
  ]);
  return { cacheHitRates, costRolling7d, validatorFailures, autoFix, pendingCanonAging };
}

private async queryCacheHitRates(): Promise<CacheHitRate[]> {
  // context_packets stores per-build totals. Hit rate = cached / total per tier.
  // We approximate per-tier by sharing the same cached_input_tokens across hot/warm,
  // splitting via the tier hash being non-null (cold is never cached).
  const rows = await this.db.execute(sql`
    WITH agg AS (
      SELECT
        COUNT(*)::int                                AS total_builds,
        COALESCE(SUM(cached_input_tokens), 0)::int   AS cached_tokens,
        COALESCE(SUM(total_input_tokens), 0)::int    AS total_tokens
      FROM context_packets
    )
    SELECT * FROM agg
  `);
  const r = rows[0] as { total_builds: number; cached_tokens: number; total_tokens: number };
  const hitRate = r.total_tokens > 0 ? (r.cached_tokens / r.total_tokens) * 100 : 0;
  return [
    { tier: 'hot',  totalBuilds: r.total_builds, cachedTokens: r.cached_tokens, totalInputTokens: r.total_tokens, hitRatePct: hitRate },
    { tier: 'warm', totalBuilds: r.total_builds, cachedTokens: r.cached_tokens, totalInputTokens: r.total_tokens, hitRatePct: hitRate },
    { tier: 'cold', totalBuilds: r.total_builds, cachedTokens: 0,                totalInputTokens: r.total_tokens, hitRatePct: 0 },
  ];
}

private async queryCostRolling7d(): Promise<CostRollingPoint[]> {
  const rows = await this.db.execute(sql`
    SELECT
      to_char(date_trunc('day', l.created_at), 'YYYY-MM-DD')        AS date,
      COUNT(DISTINCT l.chapter_id)::int                              AS chapter_count,
      COALESCE(SUM(l.cost_usd), 0)::numeric(12,6)                    AS total_cost_usd
    FROM llm_calls l
    WHERE l.created_at >= now() - interval '7 days'
    GROUP BY date_trunc('day', l.created_at)
    ORDER BY date_trunc('day', l.created_at) DESC
  `);
  return (rows as Array<{ date: string; chapter_count: number; total_cost_usd: string }>).map(r => ({
    date: r.date,
    chapterCount: r.chapter_count,
    totalCostUsd: r.total_cost_usd,
    costPerChapterUsd: r.chapter_count > 0
      ? (Number(r.total_cost_usd) / r.chapter_count).toFixed(6)
      : '0',
  }));
}

private async queryValidatorFailures(): Promise<ValidatorFailureRow[]> {
  const rows = await this.db.execute(sql`
    SELECT
      issue->>'check_id'  AS check_id,
      issue->>'severity'  AS severity,
      COUNT(*)::int       AS count
    FROM validations v, jsonb_array_elements(v.issues) issue
    WHERE v.passed = false
    GROUP BY issue->>'check_id', issue->>'severity'
    ORDER BY count DESC
  `);
  return rows as ValidatorFailureRow[];
}

private async queryAutoFix(): Promise<AutoFixStat> {
  const rows = await this.db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE agent_role = 'auto_fixer')::int                                 AS attempted,
      COUNT(*) FILTER (WHERE agent_role = 'auto_fixer' AND status = 'success')::int          AS succeeded
    FROM llm_calls
  `);
  const r = rows[0] as { attempted: number; succeeded: number };
  return {
    attempted: r.attempted,
    succeeded: r.succeeded,
    successRatePct: r.attempted > 0 ? (r.succeeded / r.attempted) * 100 : 0,
  };
}

private async queryPendingCanonAging(): Promise<PendingCanonAgingBucket[]> {
  const rows = await this.db.execute(sql`
    SELECT
      CASE
        WHEN now() - created_at <= interval '1 day'   THEN '0-1d'
        WHEN now() - created_at <= interval '7 days'  THEN '1-7d'
        WHEN now() - created_at <= interval '30 days' THEN '7-30d'
        ELSE '30d+'
      END                AS age_bucket,
      COUNT(*)::int      AS count
    FROM pending_canon_updates
    WHERE resolution = 'pending'
    GROUP BY age_bucket
  `);
  return rows as PendingCanonAgingBucket[];
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `pnpm --filter @novel/core test admin-metrics`
Expected: PASS (5 tests).

- [ ] **Step 2.5: Commit**

```bash
git add packages/core/src/services/admin-metrics.ts packages/core/test/admin-metrics.test.ts
git commit -m "feat(core): admin metrics SQL aggregates"
```

---

### Task 3: Admin metrics API route

**Files:**
- Create: `apps/api/src/routes/admin.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/test/routes/admin.test.ts`

- [ ] **Step 3.1: Write failing test**

```ts
// apps/api/test/routes/admin.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../helpers/app';
import { seedFixture } from '../helpers/db';

describe('GET /admin/metrics', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    app = await buildApp();
    await seedFixture(app.db, 'admin-metrics-basic');
  });
  afterAll(async () => { await app.close(); });

  it('returns admin metrics snapshot JSON', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/metrics' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('cacheHitRates');
    expect(body).toHaveProperty('costRolling7d');
    expect(body).toHaveProperty('validatorFailures');
    expect(body).toHaveProperty('autoFix');
    expect(body).toHaveProperty('pendingCanonAging');
    expect(Array.isArray(body.costRolling7d)).toBe(true);
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `pnpm --filter @novel/api test admin`
Expected: FAIL (404 — route not registered).

- [ ] **Step 3.3: Implement route**

```ts
// apps/api/src/routes/admin.ts
import type { FastifyPluginAsync } from 'fastify';
import { AdminMetricsService } from '@novel/core/services/admin-metrics';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = new AdminMetricsService(fastify.db);

  fastify.get('/admin/metrics', async (_req, reply) => {
    const snapshot = await svc.snapshot();
    return reply.send(snapshot);
  });
};
```

- [ ] **Step 3.4: Register in server**

```ts
// apps/api/src/server.ts (additions only)
import { adminRoutes } from './routes/admin';
// ...
await app.register(adminRoutes);
```

- [ ] **Step 3.5: Run test to verify it passes**

Run: `pnpm --filter @novel/api test admin`
Expected: PASS.

- [ ] **Step 3.6: Commit**

```bash
git add apps/api/src/routes/admin.ts apps/api/src/server.ts apps/api/test/routes/admin.test.ts
git commit -m "feat(api): GET /admin/metrics"
```

---

### Task 4: Admin dashboard UI page

**Files:**
- Create: `apps/web/src/lib/admin-metrics.ts`
- Create: `apps/web/src/app/admin/page.tsx`

- [ ] **Step 4.1: Write client wrapper**

```ts
// apps/web/src/lib/admin-metrics.ts
import { apiBase } from './api-base';

export interface CacheHitRate { tier: 'hot' | 'warm' | 'cold'; totalBuilds: number; cachedTokens: number; totalInputTokens: number; hitRatePct: number; }
export interface CostRollingPoint { date: string; chapterCount: number; totalCostUsd: string; costPerChapterUsd: string; }
export interface ValidatorFailureRow { checkId: string; severity: string; count: number; }
export interface AutoFixStat { attempted: number; succeeded: number; successRatePct: number; }
export interface PendingCanonAgingBucket { ageBucket: string; count: number; }

export interface AdminMetrics {
  cacheHitRates: CacheHitRate[];
  costRolling7d: CostRollingPoint[];
  validatorFailures: ValidatorFailureRow[];
  autoFix: AutoFixStat;
  pendingCanonAging: PendingCanonAgingBucket[];
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const res = await fetch(`${apiBase()}/admin/metrics`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`admin metrics failed: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 4.2: Build dashboard page**

```tsx
// apps/web/src/app/admin/page.tsx
import { getAdminMetrics } from '@/lib/admin-metrics';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const m = await getAdminMetrics();
  return (
    <main className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Admin metrics</h1>

      <section>
        <h2 className="text-lg font-medium mb-2">Cache hit rate per tier</h2>
        <table className="min-w-full text-sm">
          <thead><tr><th className="text-left">Tier</th><th className="text-right">Builds</th><th className="text-right">Cached tokens</th><th className="text-right">Total tokens</th><th className="text-right">Hit %</th></tr></thead>
          <tbody>
            {m.cacheHitRates.map(r => (
              <tr key={r.tier}><td>{r.tier}</td><td className="text-right">{r.totalBuilds}</td><td className="text-right">{r.cachedTokens.toLocaleString()}</td><td className="text-right">{r.totalInputTokens.toLocaleString()}</td><td className="text-right">{r.hitRatePct.toFixed(1)}%</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Cost / chapter — 7-day rolling</h2>
        <table className="min-w-full text-sm">
          <thead><tr><th className="text-left">Date</th><th className="text-right">Chapters</th><th className="text-right">Total $</th><th className="text-right">$/chapter</th></tr></thead>
          <tbody>
            {m.costRolling7d.map(p => (
              <tr key={p.date}><td>{p.date}</td><td className="text-right">{p.chapterCount}</td><td className="text-right">${p.totalCostUsd}</td><td className="text-right">${p.costPerChapterUsd}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Validator failure breakdown</h2>
        <table className="min-w-full text-sm">
          <thead><tr><th className="text-left">Check</th><th className="text-left">Severity</th><th className="text-right">Count</th></tr></thead>
          <tbody>
            {m.validatorFailures.map((r, i) => (
              <tr key={i}><td>{r.checkId}</td><td>{r.severity}</td><td className="text-right">{r.count}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Auto-fixer success rate</h2>
        <p className="text-sm">Attempted: <strong>{m.autoFix.attempted}</strong> · Succeeded: <strong>{m.autoFix.succeeded}</strong> · Rate: <strong>{m.autoFix.successRatePct.toFixed(1)}%</strong></p>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Pending canon updates — age</h2>
        <table className="min-w-full text-sm">
          <thead><tr><th className="text-left">Age</th><th className="text-right">Count</th></tr></thead>
          <tbody>
            {m.pendingCanonAging.map(b => (
              <tr key={b.ageBucket}><td>{b.ageBucket}</td><td className="text-right">{b.count}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
```

- [ ] **Step 4.3: Commit**

```bash
git add apps/web/src/lib/admin-metrics.ts apps/web/src/app/admin/page.tsx
git commit -m "feat(web): admin metrics dashboard page"
```

---

### Task 5: Markdown exporter (TDD)

**Files:**
- Create: `packages/core/src/services/exporters/markdown-exporter.ts`
- Test: `packages/core/test/markdown-exporter.test.ts`

- [ ] **Step 5.1: Write failing test**

```ts
// packages/core/test/markdown-exporter.test.ts
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/services/exporters/markdown-exporter';

describe('renderMarkdown', () => {
  it('renders title, author, then chapters in order with headings', () => {
    const md = renderMarkdown({
      story: { title: 'Trùng Sinh', author: 'Test', synopsis: 'A returns home.' },
      chapters: [
        { number: 1, title: 'Khởi đầu', content: 'Đoạn 1.\n\nĐoạn 2.' },
        { number: 2, title: 'Phong vân',  content: 'Đoạn A.' },
      ],
    });
    expect(md).toContain('# Trùng Sinh');
    expect(md).toContain('_by Test_');
    expect(md).toContain('A returns home.');
    expect(md).toMatch(/## Chương 1[ —]+Khởi đầu/);
    expect(md).toMatch(/## Chương 2[ —]+Phong vân/);
    expect(md.indexOf('Chương 1')).toBeLessThan(md.indexOf('Chương 2'));
  });

  it('omits author line when no author', () => {
    const md = renderMarkdown({
      story: { title: 'X', author: null, synopsis: null },
      chapters: [{ number: 1, title: 'a', content: 'b' }],
    });
    expect(md).not.toContain('_by ');
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

Run: `pnpm --filter @novel/core test markdown-exporter`
Expected: FAIL (module missing).

- [ ] **Step 5.3: Implement exporter**

```ts
// packages/core/src/services/exporters/markdown-exporter.ts
export interface MarkdownExportInput {
  story: { title: string; author: string | null; synopsis: string | null };
  chapters: Array<{ number: number; title: string; content: string }>;
}

export function renderMarkdown(input: MarkdownExportInput): string {
  const { story, chapters } = input;
  const parts: string[] = [`# ${story.title}`, ''];
  if (story.author) parts.push(`_by ${story.author}_`, '');
  if (story.synopsis) parts.push(story.synopsis, '');
  parts.push('---', '');
  for (const ch of chapters) {
    parts.push(`## Chương ${ch.number} — ${ch.title}`, '', ch.content, '');
  }
  return parts.join('\n');
}
```

- [ ] **Step 5.4: Run test to verify it passes**

Run: `pnpm --filter @novel/core test markdown-exporter`
Expected: PASS.

- [ ] **Step 5.5: Commit**

```bash
git add packages/core/src/services/exporters/markdown-exporter.ts packages/core/test/markdown-exporter.test.ts
git commit -m "feat(core): markdown exporter"
```

---

### Task 6: EPUB exporter (TDD)

**Files:**
- Create: `packages/core/src/services/exporters/epub-exporter.ts`
- Test: `packages/core/test/epub-exporter.test.ts`

- [ ] **Step 6.1: Add dependency**

```bash
pnpm --filter @novel/core add epub-gen-memory
```

- [ ] **Step 6.2: Write failing test**

```ts
// packages/core/test/epub-exporter.test.ts
import { describe, it, expect } from 'vitest';
import { renderEpub } from '../src/services/exporters/epub-exporter';

describe('renderEpub', () => {
  it('returns a Buffer with EPUB magic bytes', async () => {
    const buf = await renderEpub({
      story: { title: 'Trùng Sinh', author: 'Test', synopsis: 'A returns home.' },
      chapters: [
        { number: 1, title: 'Khởi đầu', content: '<p>Đoạn 1.</p><p>Đoạn 2.</p>' },
      ],
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    // EPUB is a ZIP — magic bytes "PK" (0x50 0x4B) at offset 0
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});
```

- [ ] **Step 6.3: Run test to verify it fails**

Run: `pnpm --filter @novel/core test epub-exporter`
Expected: FAIL.

- [ ] **Step 6.4: Implement exporter**

```ts
// packages/core/src/services/exporters/epub-exporter.ts
import { EPub } from 'epub-gen-memory';
import { EXPORT_CONFIG } from '../../config/export-config';

export interface EpubExportInput {
  story: { title: string; author: string | null; synopsis: string | null };
  chapters: Array<{ number: number; title: string; content: string }>;
}

export async function renderEpub(input: EpubExportInput): Promise<Buffer> {
  const { story, chapters } = input;
  const epub = new EPub({
    title: story.title,
    author: story.author ?? EXPORT_CONFIG.EPUB_AUTHOR_FALLBACK,
    description: story.synopsis ?? '',
    lang: EXPORT_CONFIG.EPUB_LANGUAGE,
  }, chapters.map(ch => ({
    title: `Chương ${ch.number} — ${ch.title}`,
    content: paragraphsToHtml(ch.content),
  })));
  return epub.genEpub();
}

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map(p => `<p>${escapeHtml(p.replace(/\n/g, ' ').trim())}</p>`)
    .join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
```

- [ ] **Step 6.5: Run test to verify it passes**

Run: `pnpm --filter @novel/core test epub-exporter`
Expected: PASS.

- [ ] **Step 6.6: Commit**

```bash
git add packages/core/src/services/exporters/epub-exporter.ts packages/core/test/epub-exporter.test.ts packages/core/package.json
git commit -m "feat(core): epub exporter via epub-gen-memory"
```

---

### Task 7: Export API route (sync path)

**Files:**
- Create: `apps/api/src/routes/exports.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/test/routes/exports.test.ts`

- [ ] **Step 7.1: Write failing test**

```ts
// apps/api/test/routes/exports.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../helpers/app';
import { seedFixture } from '../helpers/db';

describe('Exports', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let storyId: string;
  beforeAll(async () => {
    app = await buildApp();
    storyId = await seedFixture(app.db, 'export-small-story'); // 5 chapters
  });
  afterAll(async () => { await app.close(); });

  it('exports markdown synchronously', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/stories/${storyId}/exports`,
      payload: { format: 'markdown' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body).toContain('# ');
  });

  it('exports epub synchronously', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/stories/${storyId}/exports`,
      payload: { format: 'epub' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/epub+zip');
    const buf = res.rawPayload;
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('rejects unsupported format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/stories/${storyId}/exports`,
      payload: { format: 'pdf' },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 7.2: Run test to verify it fails**

Run: `pnpm --filter @novel/api test exports`
Expected: FAIL (404).

- [ ] **Step 7.3: Implement route**

```ts
// apps/api/src/routes/exports.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { stories, chapters } from '@novel/db/schema';
import { renderMarkdown } from '@novel/core/services/exporters/markdown-exporter';
import { renderEpub } from '@novel/core/services/exporters/epub-exporter';
import { EXPORT_CONFIG } from '@novel/core/config/export-config';

const ExportBody = z.object({
  format: z.enum(EXPORT_CONFIG.SUPPORTED_FORMATS),
});

export const exportsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { storyId: string }; Body: z.infer<typeof ExportBody> }>(
    '/stories/:storyId/exports',
    async (req, reply) => {
      const parse = ExportBody.safeParse(req.body);
      if (!parse.success) return reply.code(400).send({ error: 'invalid_format', details: parse.error.format() });
      const { format } = parse.data;
      const { storyId } = req.params;

      const [story] = await fastify.db.select().from(stories).where(eq(stories.id, storyId));
      if (!story) return reply.code(404).send({ error: 'story_not_found' });

      const chRows = await fastify.db
        .select({ number: chapters.number, title: chapters.title, content: chapters.content })
        .from(chapters)
        .where(eq(chapters.storyId, storyId))
        .orderBy(asc(chapters.number));

      const completed = chRows.filter(c => c.content !== null && c.content.length > 0) as Array<{ number: number; title: string; content: string }>;

      if (completed.length > EXPORT_CONFIG.SYNC_CHAPTER_THRESHOLD) {
        return reply.code(202).send({
          status: 'queued',
          message: `Story has ${completed.length} chapters; export must be enqueued (Plan 4 Task 8).`,
        });
      }

      const input = {
        story: { title: story.title, author: story.author ?? null, synopsis: story.synopsis ?? null },
        chapters: completed,
      };

      if (format === 'markdown') {
        const md = renderMarkdown(input);
        return reply
          .header('content-type', 'text/markdown; charset=utf-8')
          .header('content-disposition', `attachment; filename="${slug(story.title)}.md"`)
          .send(md);
      }
      const buf = await renderEpub(input);
      return reply
        .header('content-type', 'application/epub+zip')
        .header('content-disposition', `attachment; filename="${slug(story.title)}.epub"`)
        .send(buf);
    }
  );
};

function slug(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'story';
}
```

- [ ] **Step 7.4: Register in server**

```ts
// apps/api/src/server.ts (additions only)
import { exportsRoutes } from './routes/exports';
// ...
await app.register(exportsRoutes);
```

- [ ] **Step 7.5: Run test to verify it passes**

Run: `pnpm --filter @novel/api test exports`
Expected: PASS (3 tests).

- [ ] **Step 7.6: Commit**

```bash
git add apps/api/src/routes/exports.ts apps/api/src/server.ts apps/api/test/routes/exports.test.ts
git commit -m "feat(api): POST /stories/:id/exports (sync markdown + epub)"
```

---

### Task 8: Async export job (`generate-export`)

**Files:**
- Create: `apps/worker/src/jobs/generate-export.ts`
- Modify: `apps/api/src/routes/exports.ts` (enqueue path)
- Test: `apps/worker/test/jobs/generate-export.test.ts`

- [ ] **Step 8.1: Write failing test**

```ts
// apps/worker/test/jobs/generate-export.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb, seedFixture } from '../helpers/db';
import { generateExport } from '../../src/jobs/generate-export';
import { fakeJob } from '../helpers/fake-job';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

describe('generateExport job', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let outDir: string;
  beforeAll(async () => {
    db = await setupTestDb();
    outDir = mkdtempSync(join(tmpdir(), 'novel-exports-'));
    process.env.EXPORT_OUTPUT_DIR = outDir;
  });
  afterAll(async () => { await teardownTestDb(db); });

  it('writes EPUB to disk and returns filepath', async () => {
    const storyId = await seedFixture(db, 'export-small-story');
    const job = fakeJob({ storyId, format: 'epub' as const });
    const result = await generateExport(job, { db });
    expect(result.filepath).toMatch(/\.epub$/);
    const buf = await readFile(result.filepath);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});
```

- [ ] **Step 8.2: Run test to verify it fails**

Run: `pnpm --filter @novel/worker test generate-export`
Expected: FAIL.

- [ ] **Step 8.3: Implement job**

```ts
// apps/worker/src/jobs/generate-export.ts
import { eq, asc } from 'drizzle-orm';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Job, Queue } from 'bullmq';
import { Queue as BullQueue } from 'bullmq';
import { stories, chapters } from '@novel/db/schema';
import { renderMarkdown } from '@novel/core/services/exporters/markdown-exporter';
import { renderEpub } from '@novel/core/services/exporters/epub-exporter';
import type { Database } from '@novel/db/types';
import { getRedisConnection } from '../infra/redis';

export interface GenerateExportJobData {
  storyId: string;
  format: 'markdown' | 'epub';
}

export interface GenerateExportResult {
  filepath: string;
  bytes: number;
}

export async function generateExport(
  job: Job<GenerateExportJobData>,
  deps: { db: Database }
): Promise<GenerateExportResult> {
  const { db } = deps;
  const { storyId, format } = job.data;

  const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
  if (!story) throw new Error(`story not found: ${storyId}`);

  const chRows = await db
    .select({ number: chapters.number, title: chapters.title, content: chapters.content })
    .from(chapters)
    .where(eq(chapters.storyId, storyId))
    .orderBy(asc(chapters.number));
  const completed = chRows.filter(c => c.content) as Array<{ number: number; title: string; content: string }>;

  const input = {
    story: { title: story.title, author: story.author ?? null, synopsis: story.synopsis ?? null },
    chapters: completed,
  };

  const outDir = process.env.EXPORT_OUTPUT_DIR ?? './exports';
  await mkdir(outDir, { recursive: true });
  const slug = story.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() || 'story';
  const ext = format === 'markdown' ? 'md' : 'epub';
  const filepath = join(outDir, `${slug}-${Date.now()}.${ext}`);

  const payload = format === 'markdown'
    ? Buffer.from(renderMarkdown(input), 'utf-8')
    : await renderEpub(input);
  await writeFile(filepath, payload);
  return { filepath, bytes: payload.length };
}

export const GENERATE_EXPORT_QUEUE = 'generate-export';
let _q: Queue | undefined;
export function getGenerateExportQueue(): Queue {
  if (!_q) _q = new BullQueue(GENERATE_EXPORT_QUEUE, { connection: getRedisConnection() });
  return _q;
}

export async function enqueueGenerateExport(data: GenerateExportJobData): Promise<{ jobId: string }> {
  const job = await getGenerateExportQueue().add('generate-export', data, {
    attempts: 1,
    removeOnComplete: { age: 3600, count: 100 },
  });
  return { jobId: job.id! };
}
```

- [ ] **Step 8.4: Wire enqueue path into route**

Replace the 202-stub block from Task 7 in `apps/api/src/routes/exports.ts`:

```ts
if (completed.length > EXPORT_CONFIG.SYNC_CHAPTER_THRESHOLD) {
  const { enqueueGenerateExport } = await import('@novel/worker/jobs/generate-export');
  const { jobId } = await enqueueGenerateExport({ storyId, format });
  return reply.code(202).send({ status: 'queued', jobId, format });
}
```

- [ ] **Step 8.5: Run test to verify it passes**

Run: `pnpm --filter @novel/worker test generate-export`
Expected: PASS.

- [ ] **Step 8.6: Commit**

```bash
git add apps/worker/src/jobs/generate-export.ts apps/worker/test/jobs/generate-export.test.ts apps/api/src/routes/exports.ts
git commit -m "feat(worker,api): generate-export job for stories beyond sync threshold"
```

---

### Task 9: Export UI button on story page

**Files:**
- Create: `apps/web/src/lib/exports.ts`
- Modify: `apps/web/src/app/stories/[id]/page.tsx` (or sidebar)

- [ ] **Step 9.1: Write client wrapper**

```ts
// apps/web/src/lib/exports.ts
import { apiBase } from './api-base';

export type ExportFormat = 'markdown' | 'epub';

export async function downloadExport(storyId: string, format: ExportFormat): Promise<void> {
  const res = await fetch(`${apiBase()}/stories/${storyId}/exports`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ format }),
  });
  if (res.status === 202) {
    const j = await res.json();
    alert(`Export queued (job ${j.jobId}). Output will appear in EXPORT_OUTPUT_DIR on the worker.`);
    return;
  }
  if (!res.ok) throw new Error(`export failed: ${res.status}`);
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') ?? '';
  const m = cd.match(/filename="([^"]+)"/);
  const filename = m ? m[1] : `story.${format === 'markdown' ? 'md' : 'epub'}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 9.2: Add export buttons to story page**

In `apps/web/src/app/stories/[id]/page.tsx`, add a client component near the story header:

```tsx
'use client';
import { downloadExport } from '@/lib/exports';

export function ExportButtons({ storyId }: { storyId: string }) {
  return (
    <div className="flex gap-2">
      <button onClick={() => downloadExport(storyId, 'markdown')} className="px-3 py-1 border rounded">Export Markdown</button>
      <button onClick={() => downloadExport(storyId, 'epub')} className="px-3 py-1 border rounded">Export EPUB</button>
    </div>
  );
}
```

Mount `<ExportButtons storyId={story.id} />` in the story page header.

- [ ] **Step 9.3: Commit**

```bash
git add apps/web/src/lib/exports.ts apps/web/src/app/stories/[id]/page.tsx
git commit -m "feat(web): export buttons on story page"
```

---

### Task 10: Style few-shots upload — API

**Files:**
- Modify: `apps/api/src/routes/bible.ts`
- Test: `apps/api/test/routes/bible.test.ts`

- [ ] **Step 10.1: Write failing test**

```ts
// apps/api/test/routes/bible.test.ts (add)
describe('PUT /stories/:storyId/bible/style-few-shots', () => {
  it('replaces few-shots and bumps story_bibles.version', async () => {
    const storyId = await seedFixture(app.db, 'bible-basic');
    const before = await app.db.select().from(storyBibles).where(eq(storyBibles.storyId, storyId));
    const v0 = before[0]!.version;
    const res = await app.inject({
      method: 'PUT',
      url: `/stories/${storyId}/bible/style-few-shots`,
      payload: { fewShots: ['Đoạn voice 1.', 'Đoạn voice 2.'] },
    });
    expect(res.statusCode).toBe(200);
    const after = await app.db.select().from(storyBibles).where(eq(storyBibles.storyId, storyId));
    expect(after[0]!.styleFewShots).toEqual(['Đoạn voice 1.', 'Đoạn voice 2.']);
    expect(after[0]!.version).toBe(v0 + 1);
  });

  it('rejects more than 5 few-shots', async () => {
    const storyId = await seedFixture(app.db, 'bible-basic');
    const res = await app.inject({
      method: 'PUT',
      url: `/stories/${storyId}/bible/style-few-shots`,
      payload: { fewShots: Array(6).fill('x') },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 10.2: Run test to verify it fails**

Run: `pnpm --filter @novel/api test bible`
Expected: FAIL.

- [ ] **Step 10.3: Implement endpoint (append in `bible.ts`)**

```ts
// apps/api/src/routes/bible.ts (additions)
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { storyBibles } from '@novel/db/schema';

const FewShotsBody = z.object({
  fewShots: z.array(z.string().min(20).max(2000)).max(5),
});

fastify.put<{ Params: { storyId: string }; Body: z.infer<typeof FewShotsBody> }>(
  '/stories/:storyId/bible/style-few-shots',
  async (req, reply) => {
    const parse = FewShotsBody.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid', details: parse.error.format() });
    await fastify.db
      .update(storyBibles)
      .set({
        styleFewShots: parse.data.fewShots,
        version: sql`${storyBibles.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(storyBibles.storyId, req.params.storyId));
    return reply.send({ ok: true });
  }
);
```

- [ ] **Step 10.4: Run test to verify it passes**

Run: `pnpm --filter @novel/api test bible`
Expected: PASS (2 new tests).

- [ ] **Step 10.5: Commit**

```bash
git add apps/api/src/routes/bible.ts apps/api/test/routes/bible.test.ts
git commit -m "feat(api): PUT bible style-few-shots (bumps bible.version)"
```

---

### Task 11: Style few-shots upload — UI

**Files:**
- Create: `apps/web/src/app/stories/[id]/bible/few-shots/page.tsx`
- Modify: `apps/web/src/app/stories/[id]/bible/page.tsx` (add link)

- [ ] **Step 11.1: Build few-shots page**

```tsx
// apps/web/src/app/stories/[id]/bible/few-shots/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { apiBase } from '@/lib/api-base';

export default function FewShotsPage({ params }: { params: { id: string } }) {
  const [shots, setShots] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase()}/stories/${params.id}/bible`)
      .then(r => r.json())
      .then(b => setShots(Array.isArray(b.styleFewShots) && b.styleFewShots.length > 0 ? b.styleFewShots : ['']));
  }, [params.id]);

  async function save() {
    setSaving(true); setMsg(null);
    const fewShots = shots.map(s => s.trim()).filter(Boolean);
    const res = await fetch(`${apiBase()}/stories/${params.id}/bible/style-few-shots`, {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fewShots }),
    });
    setSaving(false);
    setMsg(res.ok ? 'Saved. Bible version bumped — HOT cache will refresh on next chapter.' : `Error ${res.status}`);
  }

  return (
    <main className="p-6 max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Style few-shots</h1>
      <p className="text-sm text-gray-600">Paste 2–5 short Vietnamese passages (~150 words each) that capture the voice you want every chapter to inherit. Saving bumps the bible version and refreshes the HOT-tier cache.</p>
      {shots.map((s, i) => (
        <textarea
          key={i}
          value={s}
          onChange={e => setShots(prev => prev.map((p, j) => j === i ? e.target.value : p))}
          rows={6}
          maxLength={2000}
          className="w-full border rounded p-2 text-sm"
          placeholder={`Few-shot ${i + 1}`}
        />
      ))}
      <div className="flex gap-2">
        <button onClick={() => setShots([...shots, ''])} disabled={shots.length >= 5} className="px-3 py-1 border rounded">Add another</button>
        <button onClick={() => setShots(shots.length > 1 ? shots.slice(0, -1) : shots)} className="px-3 py-1 border rounded">Remove last</button>
        <button onClick={save} disabled={saving} className="px-3 py-1 border rounded bg-blue-600 text-white disabled:bg-gray-400">{saving ? 'Saving…' : 'Save'}</button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
```

- [ ] **Step 11.2: Add link from bible page**

In `apps/web/src/app/stories/[id]/bible/page.tsx`, add near the heading:

```tsx
<a href={`/stories/${storyId}/bible/few-shots`} className="text-blue-600 underline">Edit style few-shots →</a>
```

- [ ] **Step 11.3: Commit**

```bash
git add apps/web/src/app/stories/[id]/bible/few-shots/page.tsx apps/web/src/app/stories/[id]/bible/page.tsx
git commit -m "feat(web): style few-shots upload UI"
```

---

### Task 12: Story settings API (GET/PUT)

**Files:**
- Create: `apps/api/src/routes/story-settings.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/test/routes/story-settings.test.ts`

The `overrides` JSON shape **must** match `ConfigOverrides` from `packages/core/src/config/effective.ts` (Plan 1, Task 15) and the extension from Task 13 below — lowercase keys: `context`, `generation`, `budget`, `model`, `longForm`.

- [ ] **Step 12.1: Write failing test**

```ts
// apps/api/test/routes/story-settings.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../helpers/app';
import { seedFixture } from '../helpers/db';

describe('Story settings', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let storyId: string;
  beforeAll(async () => { app = await buildApp(); storyId = await seedFixture(app.db, 'story-empty'); });
  afterAll(async () => { await app.close(); });

  it('GET returns empty overrides when row missing', async () => {
    const res = await app.inject({ method: 'GET', url: `/stories/${storyId}/settings` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ overrides: {} });
  });

  it('PUT upserts overrides and GET returns them', async () => {
    const overrides = {
      generation: { WRITER_TEMPERATURE: 0.95 },
      budget: { PER_CHAPTER_HARD_CAP_USD: 0.10 },
    };
    const put = await app.inject({ method: 'PUT', url: `/stories/${storyId}/settings`, payload: { overrides } });
    expect(put.statusCode).toBe(200);
    const get = await app.inject({ method: 'GET', url: `/stories/${storyId}/settings` });
    expect(get.json().overrides).toEqual(overrides);
  });

  it('rejects invalid JSON shapes', async () => {
    const res = await app.inject({ method: 'PUT', url: `/stories/${storyId}/settings`, payload: { overrides: 'not-an-object' } });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 12.2: Run test to verify it fails**

Run: `pnpm --filter @novel/api test story-settings`
Expected: FAIL.

- [ ] **Step 12.3: Implement route**

```ts
// apps/api/src/routes/story-settings.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { storySettings } from '@novel/db/schema';

const Body = z.object({ overrides: z.record(z.unknown()) });

export const storySettingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { storyId: string } }>(
    '/stories/:storyId/settings',
    async (req, reply) => {
      const [row] = await fastify.db.select().from(storySettings).where(eq(storySettings.storyId, req.params.storyId));
      return reply.send({ overrides: row?.overrides ?? {} });
    }
  );

  fastify.put<{ Params: { storyId: string }; Body: z.infer<typeof Body> }>(
    '/stories/:storyId/settings',
    async (req, reply) => {
      const parse = Body.safeParse(req.body);
      if (!parse.success) return reply.code(400).send({ error: 'invalid', details: parse.error.format() });
      await fastify.db
        .insert(storySettings)
        .values({ storyId: req.params.storyId, overrides: parse.data.overrides })
        .onConflictDoUpdate({
          target: storySettings.storyId,
          set: { overrides: parse.data.overrides, updatedAt: new Date() },
        });
      return reply.send({ ok: true });
    }
  );
};
```

Register in `server.ts`:

```ts
import { storySettingsRoutes } from './routes/story-settings';
await app.register(storySettingsRoutes);
```

- [ ] **Step 12.4: Run test to verify it passes**

Run: `pnpm --filter @novel/api test story-settings`
Expected: PASS (3 tests).

- [ ] **Step 12.5: Commit**

```bash
git add apps/api/src/routes/story-settings.ts apps/api/src/server.ts apps/api/test/routes/story-settings.test.ts
git commit -m "feat(api): GET/PUT /stories/:id/settings"
```

---

### Task 13: Extend `EffectiveConfig` + add async `getEffectiveConfig` per-story wrapper (TDD)

**Files:**
- Modify: `packages/core/src/config/effective.ts` (extend `mergeOverrides` to cover `model` + `longForm`)
- Create: `packages/core/src/config/get-effective-config.ts` (async per-story wrapper)
- Test: `packages/core/test/get-effective-config.test.ts`

Plan 1 Task 15 created `mergeOverrides({context, generation, budget})`. Plan 1 Task 14.3 added `MODEL_CONFIG` and Plan 3 Task 1 added `LONG_FORM_CONFIG` — neither was wired into `mergeOverrides`. This task adds them, then wraps the result with a per-story async fetcher.

- [ ] **Step 13.1: Extend `mergeOverrides` to include `model` + `longForm`**

```ts
// packages/core/src/config/effective.ts (replace EffectiveConfig + ConfigOverrides + mergeOverrides body)
import { CONTEXT_CONFIG, type ContextConfig } from './context.ts';
import { GENERATION_CONFIG, type GenerationConfig } from './generation.ts';
import { BUDGET_GUARDRAILS, type BudgetGuardrails } from './budget.ts';
import { MODEL_CONFIG, type ModelConfig } from './models.ts';
import { LONG_FORM_CONFIG, type LongFormConfig } from './long-form.ts';

export interface EffectiveConfig {
  context: ContextConfig;
  generation: GenerationConfig;
  budget: BudgetGuardrails;
  model: ModelConfig;
  longForm: LongFormConfig;
}

export interface ConfigOverrides {
  context?: DeepPartial<ContextConfig>;
  generation?: DeepPartial<GenerationConfig>;
  budget?: DeepPartial<BudgetGuardrails>;
  model?: DeepPartial<ModelConfig>;
  longForm?: DeepPartial<LongFormConfig>;
}

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

// deepMerge unchanged from Plan 1
export function mergeOverrides(overrides: ConfigOverrides): EffectiveConfig {
  return {
    context:    deepMerge(CONTEXT_CONFIG, overrides.context),
    generation: deepMerge(GENERATION_CONFIG, overrides.generation),
    budget:     deepMerge(BUDGET_GUARDRAILS, overrides.budget),
    model:      deepMerge(MODEL_CONFIG, overrides.model),
    longForm:   deepMerge(LONG_FORM_CONFIG, overrides.longForm),
  };
}
```

(Also export `LongFormConfig` from `packages/core/src/config/long-form.ts` if Plan 3 Task 1 didn't already: `export type LongFormConfig = typeof LONG_FORM_CONFIG;`. Same for `ModelConfig` from `models.ts`.)

- [ ] **Step 13.2: Write failing test for per-story wrapper**

```ts
// packages/core/test/get-effective-config.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb, teardownTestDb, seedFixture } from './helpers/db';
import { storySettings } from '@novel/db/schema';
import { getEffectiveConfig } from '../src/config/get-effective-config';
import { GENERATION_CONFIG } from '../src/config/generation';

describe('getEffectiveConfig (per-story)', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  beforeAll(async () => { db = await setupTestDb(); });
  afterAll(async () => { await teardownTestDb(db); });

  it('deep-merges overrides over global config', async () => {
    const storyId = await seedFixture(db, 'story-empty');
    await db.insert(storySettings).values({
      storyId,
      overrides: {
        generation: { WRITER_TEMPERATURE: 0.95 },
        budget:     { PER_CHAPTER_HARD_CAP_USD: 0.10 },
      },
    });
    const cfg = await getEffectiveConfig({ db, storyId });
    expect(cfg.generation.WRITER_TEMPERATURE).toBe(0.95);
    expect(cfg.generation.CHAPTER_TARGET_WORDS_MIN).toBe(GENERATION_CONFIG.CHAPTER_TARGET_WORDS_MIN); // untouched
    expect(cfg.budget.PER_CHAPTER_HARD_CAP_USD).toBe(0.10);
    expect(cfg.budget.PER_STORY_DAILY_CAP_USD).toBe(5.0); // untouched
  });

  it('returns global config when no overrides row', async () => {
    const storyId = await seedFixture(db, 'story-empty');
    const cfg = await getEffectiveConfig({ db, storyId });
    expect(cfg.generation.WRITER_TEMPERATURE).toBe(GENERATION_CONFIG.WRITER_TEMPERATURE);
  });

  it('exposes longForm + model surfaces (extended in Step 13.1)', async () => {
    const storyId = await seedFixture(db, 'story-empty');
    const cfg = await getEffectiveConfig({ db, storyId });
    expect(cfg.longForm.SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS).toBeGreaterThan(0);
    expect(cfg.model.routes.writer).toContain('gemini');
  });
});
```

- [ ] **Step 13.3: Run test to verify it fails**

Run: `pnpm --filter @novel/core test get-effective-config`
Expected: FAIL (`getEffectiveConfig` not exported).

- [ ] **Step 13.4: Implement per-story wrapper**

```ts
// packages/core/src/config/get-effective-config.ts
import { eq } from 'drizzle-orm';
import { storySettings } from '@novel/db/schema';
import type { Database } from '../db/types';
import { mergeOverrides, type EffectiveConfig, type ConfigOverrides } from './effective';

export async function getEffectiveConfig(args: { db: Database; storyId: string }): Promise<EffectiveConfig> {
  const [row] = await args.db.select().from(storySettings).where(eq(storySettings.storyId, args.storyId));
  const overrides = (row?.overrides ?? {}) as ConfigOverrides;
  return mergeOverrides(overrides);
}

export type { EffectiveConfig, ConfigOverrides };
```

- [ ] **Step 13.5: Run test to verify it passes**

Run: `pnpm --filter @novel/core test get-effective-config`
Expected: PASS (3 tests).

- [ ] **Step 13.6: Verify orchestrator + agents use the per-story flavor**

Run: `pnpm --filter @novel/ai test`
Expected: PASS. If the chapter orchestrator (Plan 2) was passing `mergeOverrides({})` (global only), update it to call `getEffectiveConfig({ db, storyId })` before building the packet so per-story overrides actually take effect downstream. Search:

```bash
rg "mergeOverrides\(\{\}\)" apps packages
```

Replace each call with `await getEffectiveConfig({ db, storyId })`.

- [ ] **Step 13.7: Commit**

```bash
git add packages/core/src/config/effective.ts packages/core/src/config/get-effective-config.ts packages/core/test/get-effective-config.test.ts apps packages
git commit -m "feat(core): extend EffectiveConfig (model+longForm) + per-story getEffectiveConfig"
```

---

### Task 14: Story settings UI (JSON editor + presets)

**Files:**
- Create: `apps/web/src/lib/story-settings.ts`
- Create: `apps/web/src/app/stories/[id]/settings/page.tsx`

- [ ] **Step 14.1: Write client wrapper**

```ts
// apps/web/src/lib/story-settings.ts
import { apiBase } from './api-base';

export interface StorySettings { overrides: Record<string, unknown>; }

export async function getStorySettings(storyId: string): Promise<StorySettings> {
  const res = await fetch(`${apiBase()}/stories/${storyId}/settings`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`get settings failed: ${res.status}`);
  return res.json();
}

export async function putStorySettings(storyId: string, overrides: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${apiBase()}/stories/${storyId}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ overrides }),
  });
  if (!res.ok) throw new Error(`put settings failed: ${res.status}`);
}
```

- [ ] **Step 14.2: Build settings page with JSON textarea + presets**

```tsx
// apps/web/src/app/stories/[id]/settings/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { getStorySettings, putStorySettings } from '@/lib/story-settings';

const PRESETS: Record<string, Record<string, unknown>> = {
  'Higher temperature (warmer prose)': { generation: { WRITER_TEMPERATURE: 0.95 } },
  'Tighter budget ($0.03/chapter)':    { budget: { PER_CHAPTER_HARD_CAP_USD: 0.03 } },
  'Use Flash for writer':              { model: { routes: { writer: 'google/gemini-2.5-flash' } } },
  'Refresh saga summary every 10 chapters': { longForm: { SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 10 } },
};

export default function SettingsPage({ params }: { params: { id: string } }) {
  const [json, setJson] = useState('{}');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStorySettings(params.id).then(s => setJson(JSON.stringify(s.overrides, null, 2)));
  }, [params.id]);

  async function save() {
    setMsg(null); setError(null);
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(json); } catch (e) { setError('Invalid JSON: ' + (e as Error).message); return; }
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) { setError('Top level must be an object'); return; }
    try { await putStorySettings(params.id, parsed); setMsg('Saved. Effective config refreshes on next chapter.'); }
    catch (e) { setError((e as Error).message); }
  }

  function applyPreset(name: string) {
    const preset = PRESETS[name];
    let current: Record<string, unknown> = {};
    try { current = JSON.parse(json); } catch { /* keep empty */ }
    const merged = deepMerge(current, preset);
    setJson(JSON.stringify(merged, null, 2));
  }

  return (
    <main className="p-6 max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Story settings</h1>
      <p className="text-sm text-gray-600">Per-story overrides deep-merged into the global config. Top-level keys: <code>context</code>, <code>generation</code>, <code>budget</code>, <code>model</code>, <code>longForm</code>.</p>
      <div className="flex flex-wrap gap-2">
        {Object.keys(PRESETS).map(name => (
          <button key={name} onClick={() => applyPreset(name)} className="px-3 py-1 border rounded text-sm">{name}</button>
        ))}
      </div>
      <textarea
        value={json}
        onChange={e => setJson(e.target.value)}
        rows={20}
        className="w-full border rounded p-2 font-mono text-sm"
      />
      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1 border rounded bg-blue-600 text-white">Save</button>
      </div>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </main>
  );
}

function deepMerge<T extends Record<string, unknown>>(a: T, b: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = k in out && typeof out[k] === 'object' && out[k] !== null && !Array.isArray(out[k]) && typeof v === 'object' && v !== null && !Array.isArray(v)
      ? deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>)
      : v;
  }
  return out as T;
}
```

- [ ] **Step 14.3: Add Settings link in story sidebar**

In `apps/web/src/app/stories/[id]/layout.tsx` (or wherever the per-story nav lives), add:

```tsx
<a href={`/stories/${params.id}/settings`}>Settings</a>
```

- [ ] **Step 14.4: Commit**

```bash
git add apps/web/src/lib/story-settings.ts apps/web/src/app/stories/[id]/settings/page.tsx apps/web/src/app/stories/[id]/layout.tsx
git commit -m "feat(web): story settings UI with presets"
```

---

### Task 15: Prompt versions API + diff UI

**Files:**
- Create: `apps/api/src/routes/prompt-versions.ts`
- Modify: `apps/api/src/server.ts`
- Create: `apps/web/src/lib/prompt-versions.ts`
- Create: `apps/web/src/app/admin/prompts/page.tsx`
- Create: `apps/web/src/app/admin/prompts/[role]/page.tsx`

- [ ] **Step 15.1: Add `diff` dep to web app**

```bash
pnpm --filter @novel/web add diff
pnpm --filter @novel/web add -D @types/diff
```

- [ ] **Step 15.2: Implement API route**

```ts
// apps/api/src/routes/prompt-versions.ts
import type { FastifyPluginAsync } from 'fastify';
import { eq, asc } from 'drizzle-orm';
import { promptVersions } from '@novel/db/schema';

export const promptVersionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/admin/prompt-versions', async (_req, reply) => {
    const rows = await fastify.db
      .select({
        id: promptVersions.id,
        agentRole: promptVersions.agentRole,
        version: promptVersions.version,
        active: promptVersions.active,
        createdAt: promptVersions.createdAt,
      })
      .from(promptVersions)
      .orderBy(asc(promptVersions.agentRole), asc(promptVersions.version));
    return reply.send(rows);
  });

  fastify.get<{ Params: { role: string } }>(
    '/admin/prompt-versions/:role',
    async (req, reply) => {
      const rows = await fastify.db
        .select()
        .from(promptVersions)
        .where(eq(promptVersions.agentRole, req.params.role))
        .orderBy(asc(promptVersions.version));
      return reply.send(rows);
    }
  );
};
```

Register in `server.ts`:

```ts
import { promptVersionsRoutes } from './routes/prompt-versions';
await app.register(promptVersionsRoutes);
```

- [ ] **Step 15.3: Write client wrapper**

```ts
// apps/web/src/lib/prompt-versions.ts
import { apiBase } from './api-base';

export interface PromptVersionRow {
  id: string;
  agentRole: string;
  version: string;
  active: boolean;
  createdAt: string;
}

export interface PromptVersionFull extends PromptVersionRow { template: string; }

export async function listPromptVersions(): Promise<PromptVersionRow[]> {
  const r = await fetch(`${apiBase()}/admin/prompt-versions`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`list failed: ${r.status}`);
  return r.json();
}

export async function getPromptVersionsByRole(role: string): Promise<PromptVersionFull[]> {
  const r = await fetch(`${apiBase()}/admin/prompt-versions/${encodeURIComponent(role)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`get failed: ${r.status}`);
  return r.json();
}
```

- [ ] **Step 15.4: Build list page**

```tsx
// apps/web/src/app/admin/prompts/page.tsx
import { listPromptVersions } from '@/lib/prompt-versions';

export const dynamic = 'force-dynamic';

export default async function PromptVersionsList() {
  const rows = await listPromptVersions();
  const grouped = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.agentRole] ??= []).push(r); return acc;
  }, {});
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Prompt versions</h1>
      {Object.entries(grouped).map(([role, items]) => (
        <section key={role}>
          <h2 className="text-lg font-medium">
            <a href={`/admin/prompts/${role}`} className="text-blue-600 hover:underline">{role}</a>
            <span className="text-sm text-gray-500"> · {items.length} versions</span>
          </h2>
          <ul className="text-sm pl-4 list-disc">
            {items.map(v => (
              <li key={v.id}>{v.version}{v.active ? ' (active)' : ''}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 15.5: Build per-role diff page**

```tsx
// apps/web/src/app/admin/prompts/[role]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { diffLines } from 'diff';
import { getPromptVersionsByRole, type PromptVersionFull } from '@/lib/prompt-versions';

export default function PromptDiffPage({ params }: { params: { role: string } }) {
  const [rows, setRows] = useState<PromptVersionFull[]>([]);
  const [a, setA] = useState<string>('');
  const [b, setB] = useState<string>('');

  useEffect(() => {
    getPromptVersionsByRole(params.role).then(r => {
      setRows(r);
      if (r.length >= 2) { setA(r[r.length - 2].id); setB(r[r.length - 1].id); }
      else if (r.length === 1) { setA(r[0].id); setB(r[0].id); }
    });
  }, [params.role]);

  const va = rows.find(r => r.id === a);
  const vb = rows.find(r => r.id === b);
  const parts = va && vb ? diffLines(va.template, vb.template) : [];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{params.role} — prompt diff</h1>
      <div className="flex gap-4">
        <label>From: <select value={a} onChange={e => setA(e.target.value)}>{rows.map(r => <option key={r.id} value={r.id}>{r.version}</option>)}</select></label>
        <label>To: <select value={b} onChange={e => setB(e.target.value)}>{rows.map(r => <option key={r.id} value={r.id}>{r.version}</option>)}</select></label>
      </div>
      <pre className="border rounded p-3 text-sm whitespace-pre-wrap font-mono">
        {parts.map((p, i) => (
          <span key={i} className={p.added ? 'bg-green-100' : p.removed ? 'bg-red-100' : ''}>
            {p.added ? '+ ' : p.removed ? '- ' : '  '}{p.value}
          </span>
        ))}
      </pre>
    </main>
  );
}
```

- [ ] **Step 15.6: Commit**

```bash
git add apps/api/src/routes/prompt-versions.ts apps/api/src/server.ts apps/web/src/lib/prompt-versions.ts apps/web/src/app/admin/prompts/page.tsx apps/web/src/app/admin/prompts/[role]/page.tsx apps/web/package.json
git commit -m "feat(api,web): prompt versions list + side-by-side diff"
```

---

### Task 16: Documentation — README + architecture + runbook

**Files:**
- Create: `README.md` (root, replaces stub if any)
- Create: `docs/architecture.md`
- Create: `docs/runbook.md`

- [ ] **Step 16.1: Write `README.md`**

```markdown
# Novel Factory

Single-user local app that generates 500–1000 chapter Vietnamese xianxia / fantasy novels with consistency preserved across the run.

## What it does

- Takes a one-line premise → produces a full bible, sagas, arcs, and chapters
- Default model: `google/gemini-2.5-flash-lite` via OpenRouter (configurable per story)
- Target cost: ≤ $0.05 / chapter; observed ~$0.007 / chapter
- Uses a 3-tier context cache (HOT / WARM / COLD), a canon DB, and 12 specialized agents

## Stack

- pnpm workspaces: `apps/{api,web,worker}` + `packages/{ai,core,db}`
- Fastify (API) · Next.js 15 App Router (web) · BullMQ + Redis (worker)
- PostgreSQL 16 + pgvector · Drizzle ORM
- LLM gateway: OpenRouter (default), Google Direct (for explicit caching)

## Getting started

```bash
# 1. Bring up Postgres + Redis
docker compose up -d

# 2. Install + migrate
pnpm install
pnpm --filter @novel/db migrate

# 3. Seed prompt versions
pnpm --filter @novel/db seed:prompts

# 4. Run all services
pnpm dev   # api + web + worker concurrently
```

Env vars (copy `.env.example` → `.env`):

- `OPENROUTER_API_KEY` — required for LLM calls
- `GOOGLE_API_KEY` — optional, enables Pro / Flash with explicit caching
- `DATABASE_URL`, `REDIS_URL` — connection strings
- `RUN_LIVE_LLM=1` — gate live-API tests

## Key docs

- `docs/architecture.md` — full system architecture
- `docs/runbook.md` — ops, recovery, common breakages
- `docs/superpowers/specs/2026-04-28-ai-novel-factory-v2-design.md` — authoritative design spec
- `docs/superpowers/plans/` — phased implementation plans (1: foundation, 2: chapter pipeline, 3: long-form scale, 4: polish & UX)

## Cost guardrails

Per-chapter $0.05 hard cap, per-story $5 / day, $50 / month, alert at 80%. Override per story via `/stories/:id/settings`.

## License

Personal use. No multi-user / SaaS support — see spec section 7.7 for non-goals.
```

- [ ] **Step 16.2: Write `docs/architecture.md`**

```markdown
# Architecture

The system is built around one core idea: **the system remembers, the model writes**. Long-form coherence comes from canon DB + hierarchical summaries + a 3-tier context cache, not from feeding the model bigger prompts.

## Layers

| Layer | Package | Purpose |
|-------|---------|---------|
| DB schema + migrations | `packages/db` | 20 Drizzle tables (stories, chapters, sagas, arcs, planted_seeds, canon_facts, pending_canon_updates, llm_calls, validations, context_packets, prompt_versions, story_settings, …) |
| Domain services + config | `packages/core` | `getEffectiveConfig`, validators, packet auditor, conflict detector, canon merger, exporters, admin metrics |
| AI agents + context builder | `packages/ai` | 12 agents, context builder (HOT/WARM/COLD), retrieval (recent summaries / top-K facts / past chapters), provider abstraction |
| HTTP API | `apps/api` | Fastify routes for entities, generation, settings, exports, admin |
| Web UI | `apps/web` | Next.js 15 App Router, all per-story pages + `/admin` |
| Worker | `apps/worker` | BullMQ jobs: `generate-chapter`, `generate-batch`, `refresh-arc-summary`, `refresh-saga-summary`, `high-stakes-review`, `generate-export` |

## Generation pipeline (per chapter)

1. **Mode escalation** — `resolveEffectiveMode` picks `safe` / `semi_auto` / `full_auto` based on user setting, chapter number, arc start/end, blocking pending updates
2. **Context build** — HOT (bible + style few-shots) + WARM (arc rolling summary + active chars) + COLD (recent timeline + due seeds)
3. **Packet generator** — produces `ChapterPacket` (required events, conflicts, cliffhanger, character beats)
4. **Packet auditor** (code) — checks vs canon (realm jumps, dead chars, forbidden moves, seed coverage)
5. **Writer** — generates 2000–3000 word Vietnamese chapter
6. **Deterministic validator** (code) — regex + DB lookup; critical fail short-circuits
7. **LLM validator** — soft checks (voice, plot logic, style) on Flash Lite
8. **Auto-fixer** — patches low/medium issues (max 1 attempt)
9. **Canon extractor** — writes to `pending_canon_updates`
10. **Canon merger** — auto-merges or queues for user review based on conflict status + mode
11. **Summary compactor** — per-chapter (200/500 tok), then arc/saga rolling summaries on cadence
12. **High-stakes reviewer** — Pro model, fires on arc end, critical severity, or manual

## Cache tiers

| Tier | Content | Size | Invalidation |
|------|---------|------|--------------|
| HOT  | bible compact, style guide, power rules, style few-shots | ~2.5K tok | `bible.version` bump |
| WARM | arc rolling summary, active chars, open threads | ~2K tok | `arc.summary_version` bump |
| COLD | last N chapter summaries, due planted seeds | ~3K tok | per chapter |

Cache hit rate visible at `/admin`.

## Cost guardrails

`packages/core/src/services/budget-guard.ts`:
- Per-chapter hard cap (`budget.PER_CHAPTER_HARD_CAP_USD`, default $0.05) — soft during generation, hard at enqueue
- Per-story daily / monthly caps (`PER_STORY_DAILY_CAP_USD` / `PER_STORY_MONTHLY_CAP_USD`) with 80% alert threshold
- Overridable per story via `story_settings.overrides.budget`

## Data invariants

- Every LLM call → row in `llm_calls` (model, tokens, cost, prompt_version)
- Every context build → row in `context_packets`
- Canon writes flow only through `reconciliation/canon-merger.ts`
- No hard-coded model names — only via `MODEL_CONFIG.routes`
- Cache prefix order is stable across calls in the same story

See `docs/superpowers/specs/2026-04-28-ai-novel-factory-v2-design.md` for the full design.
```

- [ ] **Step 16.3: Write `docs/runbook.md`**

```markdown
# Runbook

Procedures for the most common breakages and ops tasks.

## Daily ops

- Check `/admin` for: cache hit rate (expect >70% on HOT after warm-up), $/chapter (expect <$0.02), pending canon backlog (drain weekly)
- Check Redis depth: `redis-cli -u $REDIS_URL llen bull:generate-chapter:waiting`

## Common issues

### "All chapters paused with `paused_pending_updates`"

Cause: canon merger flagged blocking conflicts in mode `safe`.
Fix:
1. Visit `/stories/:id/pending` → review each row
2. Approve / reject — merger resolves and unpauses on next chapter

### "Budget breach blocking enqueue"

Cause: per-day or per-month cap hit.
Fix: either raise caps in `/stories/:id/settings` (override `budget.PER_STORY_DAILY_CAP_USD`) or wait until window rolls.

### "HOT cache hit rate is low after editing bible"

Expected: editing bible bumps `version`, invalidates HOT for the next chapter only. Steady state should recover within 1 chapter.

### "LLM validator failing voice_drift constantly"

Likely the writer is missing style anchors. Add or refresh style few-shots: `/stories/:id/bible/few-shots`.

### "Worker stuck on stale job"

```bash
redis-cli -u $REDIS_URL del bull:generate-chapter:active
# then restart worker
pnpm --filter @novel/worker dev
```

### "Migration failed mid-deploy"

Drizzle migrations are non-transactional by default. Check `__drizzle_migrations` table for the last applied row, fix the offending migration file, re-run `pnpm --filter @novel/db migrate`.

## Recovery

### Re-derive arc rolling summary

```bash
# Enqueue a refresh job manually
pnpm --filter @novel/worker exec node -e "
  import('./src/jobs/refresh-arc-summary.js').then(m => m.enqueueRefreshArcSummary({ storyId: 'STORY_ID', arcId: 'ARC_ID' }));
"
```

### Replay a failed chapter

1. Find the failed `chapter_generation_attempts` row
2. Read the `context_packet_id` to verify input was correct
3. `POST /stories/:id/chapters/:chapterId/regenerate` (uses cached HOT/WARM if `bible.version` and `arc.summary_version` unchanged)

### Export a story (offline backup)

UI: story page → "Export Markdown" / "Export EPUB"
For ≥200 chapters, use the queued path; output lands in `EXPORT_OUTPUT_DIR` on the worker.

## Cost spike investigation

1. `/admin` → cost rolling 7d → identify spike day
2. `/stories/:id/costs` → break down by agent
3. If `high_stakes_reviewer` dominates, check arc-end frequency in `LONG_FORM_CONFIG.HIGH_STAKES_REVIEW_AT_ARC_END`
4. If `writer` dominates, check chapter word counts via `/stories/:id/timeline` — runaway chapters indicate `MAX_OUTPUT_TOKENS` may need lowering
```

- [ ] **Step 16.4: Commit**

```bash
git add README.md docs/architecture.md docs/runbook.md
git commit -m "docs: README + architecture + runbook"
```

---

### Task 17: End-to-end smoke + tag

**Files:** none (verification only)

- [ ] **Step 17.1: Type check + lint + tests across the monorepo**

Run:

```bash
pnpm -r typecheck
pnpm -r lint
pnpm -r test
```

Expected: all green. Fix any failures in-place.

- [ ] **Step 17.2: Manual UI smoke (no LLM calls)**

Boot dev: `pnpm dev`. Visit:
- `/admin` — five sections render (cache, cost rolling, validator failures, auto-fix, pending aging)
- `/admin/prompts` — list grouped by role
- `/admin/prompts/saga_planner` — diff renders (or a single-version notice)
- `/stories/<id>` — Export Markdown + Export EPUB buttons download files
- `/stories/<id>/bible/few-shots` — paste, save → "Saved" message
- `/stories/<id>/settings` — apply preset, save → "Saved"

- [ ] **Step 17.3: Cross-check `getEffectiveConfig` end-to-end**

```bash
psql $DATABASE_URL -c "INSERT INTO story_settings (story_id, overrides) VALUES ('<storyId>', '{\"generation\":{\"WRITER_TEMPERATURE\":0.95}}') ON CONFLICT (story_id) DO UPDATE SET overrides = EXCLUDED.overrides;"
```

Then trigger a chapter (with explicit user approval per `feedback_llm_api_calls` rule). Verify the override is reflected in `context_packets.config_snapshot` (`generation.WRITER_TEMPERATURE = 0.95`) — it stores the effective config used for the build.

- [ ] **Step 17.4: Commit + tag**

```bash
git commit --allow-empty -m "chore(plan-4): wrap up — polish & UX complete"
git tag plan-4-complete
```

---

## What's NOT in Plan 4 (out of scope per spec section 7.7)

- Multi-user / billing / SaaS
- Multi-language stories within a single project
- Image generation (cover art, illustrations)
- Audio narration
- Reader-facing app (separate project)
- Translation export
- Automated A/B testing of prompt versions in UI (infra exists from Plan 1; viewer added here, but no scheduling/rollout UI)
- Continuous fine-tuning
