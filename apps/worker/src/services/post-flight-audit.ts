import { sql } from 'drizzle-orm';
import type { Db } from '@novel/db';
import type { Logger } from 'pino';
import { resetStaleGeneratingChapters } from './stale-job-detector.js';
import { incrementMetric, METRIC_NAMES, recordStaleJobResets } from './metrics.js';

export interface PostFlightAuditDeps {
  db: Db;
  logger: Logger;
}

export interface PostFlightAuditResult {
  missingEmbeddingChapterIds: string[];
  staleResetCount: number;
  pendingReviewCount: number;
}

export async function runPostFlightAudit(
  deps: PostFlightAuditDeps,
): Promise<PostFlightAuditResult> {
  const { db, logger } = deps;

  const missingEmbeddingRows = (await db.execute(sql`
    SELECT chapter_id
    FROM chapter_summaries
    WHERE embedding IS NULL
  `)) as Array<{ chapter_id: string }>;
  const missingEmbeddingChapterIds = missingEmbeddingRows.map((row) => row.chapter_id);
  if (missingEmbeddingChapterIds.length > 0) {
    incrementMetric(METRIC_NAMES.auditRegenerateTotal, missingEmbeddingChapterIds.length);
    logger.warn(
      {
        metric: METRIC_NAMES.auditRegenerateTotal,
        chapterIds: missingEmbeddingChapterIds,
        count: missingEmbeddingChapterIds.length,
      },
      'post-flight audit found chapter summaries missing embeddings',
    );
  }

  const staleResetCount = await resetStaleGeneratingChapters({ db, logger });
  if (staleResetCount > 0) {
    recordStaleJobResets(staleResetCount, logger);
  }

  const pendingRows = (await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM pending_canon_updates
    WHERE resolution = 'pending'
      AND created_at < now() - interval '7 days'
  `)) as Array<{ count: number }>;
  const pendingReviewCount = pendingRows[0]?.count ?? 0;
  if (pendingReviewCount > 50) {
    logger.warn(
      { pendingReviewCount, threshold: 50 },
      'post-flight audit found too many aged pending canon updates',
    );
  }

  return {
    missingEmbeddingChapterIds,
    staleResetCount,
    pendingReviewCount,
  };
}
