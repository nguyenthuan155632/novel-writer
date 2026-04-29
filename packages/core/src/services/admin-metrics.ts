import { sql } from 'drizzle-orm';

// Minimal structural type so @novel/core does not depend on @novel/db
// (which itself depends on @novel/core, which would be circular).
// Consumers pass the concrete `Db` from @novel/db.
export interface AnyDb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute(query: any): Promise<any>;
}

export interface CacheHitRate {
  tier: 'hot' | 'warm' | 'cold';
  totalBuilds: number;
  cachedTokens: number;
  totalInputTokens: number;
  hitRatePct: number;
}

export interface CostRollingPoint {
  date: string;
  chapterCount: number;
  totalCostUsd: string;
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
  constructor(private readonly db: AnyDb) {}

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
    const result = await this.db.execute(sql`
      WITH agg AS (
        SELECT
          COUNT(*)::int                                AS total_builds,
          COALESCE(SUM(cached_input_tokens), 0)::int   AS cached_tokens,
          COALESCE(SUM(total_input_tokens), 0)::int    AS total_tokens
        FROM context_packets
      )
      SELECT * FROM agg
    `);
    const rows = Array.from(result) as Array<{ total_builds: number; cached_tokens: number; total_tokens: number }>;
    const r = rows[0] ?? { total_builds: 0, cached_tokens: 0, total_tokens: 0 };
    const hitRate = r.total_tokens > 0 ? (r.cached_tokens / r.total_tokens) * 100 : 0;
    return [
      { tier: 'hot',  totalBuilds: r.total_builds, cachedTokens: r.cached_tokens, totalInputTokens: r.total_tokens, hitRatePct: hitRate },
      { tier: 'warm', totalBuilds: r.total_builds, cachedTokens: r.cached_tokens, totalInputTokens: r.total_tokens, hitRatePct: hitRate },
      { tier: 'cold', totalBuilds: r.total_builds, cachedTokens: 0,               totalInputTokens: r.total_tokens, hitRatePct: 0 },
    ];
  }

  private async queryCostRolling7d(): Promise<CostRollingPoint[]> {
    const result = await this.db.execute(sql`
      SELECT
        to_char(date_trunc('day', l.created_at), 'YYYY-MM-DD')   AS date,
        COUNT(DISTINCT l.chapter_id)::int                         AS chapter_count,
        COALESCE(SUM(l.estimated_cost_usd), 0)::numeric(12,6)    AS total_cost_usd
      FROM llm_calls l
      WHERE l.created_at >= now() - interval '7 days'
      GROUP BY date_trunc('day', l.created_at)
      ORDER BY date_trunc('day', l.created_at) DESC
    `);
    const rows = Array.from(result) as Array<{ date: string; chapter_count: number; total_cost_usd: string }>;
    return rows.map(r => ({
      date: r.date,
      chapterCount: r.chapter_count,
      totalCostUsd: r.total_cost_usd,
      costPerChapterUsd: r.chapter_count > 0
        ? (Number(r.total_cost_usd) / r.chapter_count).toFixed(6)
        : '0',
    }));
  }

  private async queryValidatorFailures(): Promise<ValidatorFailureRow[]> {
    // validations.severity is a top-level column; issues is a JSONB array of
    // unstructured objects. We aggregate failures by top-level severity.
    const result = await this.db.execute(sql`
      SELECT
        severity                           AS check_id,
        severity                           AS severity,
        COUNT(*)::int                      AS count
      FROM validations
      WHERE pass = false
      GROUP BY severity
      ORDER BY count DESC
    `);
    const rows = Array.from(result) as Array<{ check_id: string; severity: string; count: number }>;
    return rows.map(r => ({
      checkId: r.check_id,
      severity: r.severity as ValidatorFailureRow['severity'],
      count: r.count,
    }));
  }

  private async queryAutoFix(): Promise<AutoFixStat> {
    // llm_calls has no 'status' column; presence of a row = attempted.
    // estimated_cost_usd being non-null indicates a completed (successful) call.
    const result = await this.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE agent_role = 'auto_fixer')::int                                    AS attempted,
        COUNT(*) FILTER (WHERE agent_role = 'auto_fixer' AND estimated_cost_usd IS NOT NULL)::int AS succeeded
      FROM llm_calls
    `);
    const rows = Array.from(result) as Array<{ attempted: number; succeeded: number }>;
    const r = rows[0] ?? { attempted: 0, succeeded: 0 };
    return {
      attempted: r.attempted,
      succeeded: r.succeeded,
      successRatePct: r.attempted > 0 ? (r.succeeded / r.attempted) * 100 : 0,
    };
  }

  private async queryPendingCanonAging(): Promise<PendingCanonAgingBucket[]> {
    const result = await this.db.execute(sql`
      SELECT
        CASE
          WHEN now() - created_at <= interval '1 day'   THEN '0-1d'
          WHEN now() - created_at <= interval '7 days'  THEN '1-7d'
          WHEN now() - created_at <= interval '30 days' THEN '7-30d'
          ELSE '30d+'
        END           AS age_bucket,
        COUNT(*)::int  AS count
      FROM pending_canon_updates
      WHERE resolution = 'pending'
      GROUP BY age_bucket
    `);
    const rows = Array.from(result) as Array<{ age_bucket: string; count: number }>;
    return rows.map(r => ({
      ageBucket: r.age_bucket as PendingCanonAgingBucket['ageBucket'],
      count: r.count,
    }));
  }
}
