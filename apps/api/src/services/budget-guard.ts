import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { checkAgainstCaps, BUDGET_GUARDRAILS } from '@novel/core/policy/budget-guardrails.ts';

export class BudgetGuard {
  async getStoryUsage(storyId: string): Promise<{ dailyUsd: number; monthlyUsd: number }> {
    const db = getDb();
    const dayAgo = new Date(Date.now() - 24 * 3600_000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600_000);
    const [daily] = await db.select({ sum: sql<string>`COALESCE(SUM(${schema.llmCalls.estimatedCostUsd}), 0)` })
      .from(schema.llmCalls).where(and(eq(schema.llmCalls.storyId, storyId), gte(schema.llmCalls.createdAt, dayAgo)));
    const [monthly] = await db.select({ sum: sql<string>`COALESCE(SUM(${schema.llmCalls.estimatedCostUsd}), 0)` })
      .from(schema.llmCalls).where(and(eq(schema.llmCalls.storyId, storyId), gte(schema.llmCalls.createdAt, monthAgo)));
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