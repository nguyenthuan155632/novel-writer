import { and, desc, eq, lte, gte } from 'drizzle-orm';
import { getDb } from '@novel/db';
import { arcs, llmProviderState, storyBibles } from '@novel/db/schema';
import { BudgetGuard } from './budget-guard.ts';

export interface PreflightCheckResult {
  key: 'bible_version_sync' | 'arc_continuity' | 'budget_guard' | 'provider_health';
  pass: boolean;
  reason?: string;
}

export async function runGeneratePreflight(input: {
  storyId: string;
  chapterNumber: number;
}): Promise<{ ok: boolean; failed: PreflightCheckResult[] }> {
  const db = getDb();
  const failed: PreflightCheckResult[] = [];

  const [latestBible] = await db
    .select({ id: storyBibles.id })
    .from(storyBibles)
    .where(eq(storyBibles.storyId, input.storyId))
    .orderBy(desc(storyBibles.version))
    .limit(1);
  if (!latestBible) {
    failed.push({ key: 'bible_version_sync', pass: false, reason: 'missing_story_bible' });
  }

  const [arc] = await db
    .select({ id: arcs.id })
    .from(arcs)
    .where(
      and(
        eq(arcs.storyId, input.storyId),
        lte(arcs.startChapter, input.chapterNumber),
        gte(arcs.endChapter, input.chapterNumber),
      ),
    )
    .limit(1);
  if (!arc) {
    failed.push({ key: 'arc_continuity', pass: false, reason: 'chapter_outside_arc_range' });
  }

  try {
    await new BudgetGuard().preflightOrThrow(input.storyId);
  } catch (error) {
    failed.push({
      key: 'budget_guard',
      pass: false,
      reason: error instanceof Error ? error.message : `${error}`,
    });
  }

  const [providerState] = await db
    .select({ activeProvider: llmProviderState.activeProvider })
    .from(llmProviderState)
    .where(eq(llmProviderState.id, 'global'))
    .limit(1);
  if (!providerState?.activeProvider) {
    failed.push({ key: 'provider_health', pass: false, reason: 'missing_active_provider' });
  }

  return { ok: failed.length === 0, failed };
}
