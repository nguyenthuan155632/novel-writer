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
  async snapshot(): Promise<AdminMetrics> { throw new Error('not implemented'); }
}
