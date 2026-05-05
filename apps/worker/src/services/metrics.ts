export const METRIC_NAMES = {
  staleJobsResetTotal: 'stale_jobs_reset_total',
  auditRegenerateTotal: 'audit_regenerate_total',
  polishPassAppliedTotal: 'polish_pass_applied_total',
  slotBasedChaptersTotal: 'slot_based_chapters_total',
  antiLlmPatternHitsTotal: 'anti_llm_pattern_hits_total',
  parseRecoveryTotal: 'parse_recovery_total',
} as const;

export type MetricName = (typeof METRIC_NAMES)[keyof typeof METRIC_NAMES];

export interface MetricsLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
}

const counters = new Map<MetricName, number>();
const staleResetTimestamps: number[] = [];
const STALE_RESET_ALERT_THRESHOLD = 3;
const ONE_HOUR_MS = 60 * 60 * 1000;

function pruneStaleResetWindow(now: number): void {
  while (staleResetTimestamps.length > 0 && now - staleResetTimestamps[0]! > ONE_HOUR_MS) {
    staleResetTimestamps.shift();
  }
}

export function incrementMetric(name: MetricName, count: number = 1): number {
  const next = (counters.get(name) ?? 0) + count;
  counters.set(name, next);
  return next;
}

export function recordStaleJobResets(count: number, logger?: MetricsLogger): number {
  if (count <= 0) return counters.get(METRIC_NAMES.staleJobsResetTotal) ?? 0;

  const total = incrementMetric(METRIC_NAMES.staleJobsResetTotal, count);
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    staleResetTimestamps.push(now);
  }
  pruneStaleResetWindow(now);

  logger?.info({ metric: METRIC_NAMES.staleJobsResetTotal, count, total }, 'worker metric incremented');
  if (staleResetTimestamps.length >= STALE_RESET_ALERT_THRESHOLD) {
    logger?.warn(
      {
        metric: METRIC_NAMES.staleJobsResetTotal,
        resetsLastHour: staleResetTimestamps.length,
        threshold: STALE_RESET_ALERT_THRESHOLD,
      },
      'stale job reset threshold exceeded',
    );
  }
  return total;
}

export function getMetricCount(name: MetricName): number {
  return counters.get(name) ?? 0;
}

export function resetMetrics(): void {
  counters.clear();
  staleResetTimestamps.length = 0;
}
