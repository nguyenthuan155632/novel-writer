import { getDb } from '@novel/db';
import { batches } from '@novel/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@novel/core/logger';
import type { ModelRoutes } from '@novel/core';

const log = createLogger('generate-batch');

export interface GenerateBatchJobData {
  batchId: string;
  storyId: string;
  startChapter: number;
  endChapter: number;
  mode: 'safe' | 'semi_auto' | 'full_auto';
  traceId: string;
  modelRoutes?: Partial<ModelRoutes>;
}

export async function runGenerateBatchJob(data: GenerateBatchJobData, ctx: { logger: any }): Promise<{ status: string; completed: number }> {
  const db = getDb();
  const { batchId, storyId, startChapter, endChapter, mode, traceId } = data;
  const jobLog = ctx.logger ?? log;

  jobLog.info({ batchId, storyId, startChapter, endChapter }, 'batch job started');

  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  if (!batch || batch.status === 'cancelled') {
    return { status: 'cancelled', completed: 0 };
  }

  let completed = 0;
  let totalCostUsd = Number(batch.totalCostUsd ?? 0);

  for (let chapterNumber = startChapter; chapterNumber <= endChapter; chapterNumber++) {
    const { runGenerateChapterJob } = await import('./generate-chapter.js');
    const result = await runGenerateChapterJob({
      storyId,
      chapterNumber,
      mode,
      traceId: `${traceId}:ch${chapterNumber}`,
      modelRoutes: data.modelRoutes,
    }, { logger: jobLog.child({ chapterNumber }) });

    completed++;
    totalCostUsd += result.totalCostUsd;

    if (result.status === 'paused_pending_updates') {
      await db.update(batches)
        .set({
          status: 'paused',
          pausedReason: `chapter_${chapterNumber}_pending_updates`,
          completedChapters: completed,
          totalCostUsd: totalCostUsd.toFixed(6),
        })
        .where(eq(batches.id, batchId));
      return { status: 'paused', completed };
    }

    if (result.status === 'failed') {
      await db.update(batches)
        .set({
          status: 'failed',
          pausedReason: `chapter_${chapterNumber}_failed`,
          completedChapters: completed,
          totalCostUsd: totalCostUsd.toFixed(6),
          finishedAt: new Date(),
        })
        .where(eq(batches.id, batchId));
      return { status: 'failed', completed };
    }

    await db.update(batches)
      .set({
        completedChapters: completed,
        totalCostUsd: totalCostUsd.toFixed(6),
      })
      .where(eq(batches.id, batchId));
  }

  await db.update(batches)
    .set({
      status: 'completed',
      completedChapters: completed,
      totalCostUsd: totalCostUsd.toFixed(6),
      finishedAt: new Date(),
    })
    .where(eq(batches.id, batchId));
  return { status: 'completed', completed };
}
