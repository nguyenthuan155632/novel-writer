import { BUDGET_GUARDRAILS } from '../config/budget.ts';

export function checkAgainstCaps(usage: { dailyUsd: number; monthlyUsd: number }): { state: 'ok' | 'alert' | 'breach'; capHit?: 'daily' | 'monthly'; pct: number } {
  const dailyPct = usage.dailyUsd / BUDGET_GUARDRAILS.PER_STORY_DAILY_CAP_USD;
  const monthlyPct = usage.monthlyUsd / BUDGET_GUARDRAILS.PER_STORY_MONTHLY_CAP_USD;
  if (dailyPct >= 1) return { state: 'breach', capHit: 'daily', pct: dailyPct };
  if (monthlyPct >= 1) return { state: 'breach', capHit: 'monthly', pct: monthlyPct };
  if (dailyPct * 100 >= BUDGET_GUARDRAILS.ALERT_THRESHOLD_PERCENT) return { state: 'alert', capHit: 'daily', pct: dailyPct };
  if (monthlyPct * 100 >= BUDGET_GUARDRAILS.ALERT_THRESHOLD_PERCENT) return { state: 'alert', capHit: 'monthly', pct: monthlyPct };
  return { state: 'ok', pct: Math.max(dailyPct, monthlyPct) };
}

export { BUDGET_GUARDRAILS };