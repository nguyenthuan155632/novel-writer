import { eq, sql } from 'drizzle-orm';
import { stories } from '../schema/stories.js';
import type { Db } from '../client.js';

/**
 * Accumulate cost into stories.total_cost_usd after an LLM call.
 * Should be called after inserting into llm_calls.
 */
export async function accumulateStoryCost(
  db: Db,
  storyId: string,
  estimatedCostUsd: number,
): Promise<void> {
  if (!estimatedCostUsd || estimatedCostUsd <= 0) return;

  await db
    .update(stories)
    .set({
      totalCostUsd: sql`${stories.totalCostUsd} + ${estimatedCostUsd}`,
      updatedAt: new Date(),
    })
    .where(eq(stories.id, storyId));
}
