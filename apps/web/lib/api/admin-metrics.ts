const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export interface CacheHitRate { tier: 'hot' | 'warm' | 'cold'; totalBuilds: number; cachedTokens: number; totalInputTokens: number; hitRatePct: number; }
export interface CostRollingPoint { date: string; chapterCount: number; totalCostUsd: string; costPerChapterUsd: string; }
export interface ValidatorFailureRow { checkId: string; severity: string; count: number; }
export interface AutoFixStat { attempted: number; succeeded: number; successRatePct: number; }
export interface PendingCanonAgingBucket { ageBucket: string; count: number; }
export interface AdminMetrics { cacheHitRates: CacheHitRate[]; costRolling7d: CostRollingPoint[]; validatorFailures: ValidatorFailureRow[]; autoFix: AutoFixStat; pendingCanonAging: PendingCanonAgingBucket[]; }

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const r = await fetch(`${BASE}/admin/metrics`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`admin/metrics ${r.status}`);
  return r.json();
}
