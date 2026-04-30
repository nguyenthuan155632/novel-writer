import { and, eq, lt } from 'drizzle-orm';
import { chapters } from '@novel/db/schema';
import type { Db } from '@novel/db';
import type { Logger } from 'pino';

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export interface StaleJobDetectorDeps {
  db: Db;
  logger: Logger;
}

export async function resetStaleGeneratingChapters(deps: StaleJobDetectorDeps): Promise<number> {
  const { db, logger } = deps;
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

  const staleRows = await db
    .select({ id: chapters.id, storyId: chapters.storyId, chapterNumber: chapters.chapterNumber })
    .from(chapters)
    .where(and(eq(chapters.status, 'generating'), lt(chapters.updatedAt, cutoff)));

  if (staleRows.length === 0) {
    return 0;
  }

  logger.warn({ count: staleRows.length, cutoff }, 'detected stale generating chapters, marking as failed');

  let resetCount = 0;
  for (const row of staleRows) {
    try {
      await db
        .update(chapters)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(chapters.id, row.id));
      logger.info({ chapterId: row.id, storyId: row.storyId, chapterNumber: row.chapterNumber }, 'reset stale chapter to failed');
      resetCount++;
    } catch (err) {
      logger.error({ err, chapterId: row.id }, 'failed to reset stale chapter');
    }
  }

  return resetCount;
}
