import { getDb } from '@novel/db';
import { arcs, chapters, chapterSummaries } from '@novel/db/schema';
import { eq, and, desc, gte, lte, sql, or } from 'drizzle-orm';
import type { Logger } from 'pino';
import { ArcSummaryCompactorAgent } from '@novel/ai';
import type { LlmProviderId, ModelRoutes } from '@novel/core';
import { buildLoggedWorkerProvider } from './provider.js';
import { enqueueRefreshSagaSummary } from '../services/queue-publisher.js';

export interface RefreshArcSummaryJobData {
  storyId: string;
  arcId: string;
  traceId: string;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
}

export async function runRefreshArcSummaryJob(data: RefreshArcSummaryJobData, ctx: { logger: Logger }) {
  const db = getDb();
  const { storyId, arcId } = data;
  const log = ctx.logger.child({ arcId, storyId });

  const [arc] = await db.select().from(arcs).where(eq(arcs.id, arcId)).limit(1);
  if (!arc) {
    log.warn('arc not found; noop');
    return { status: 'skipped' as const };
  }

  const summaries = await db
    .select({ chapterNumber: chapterSummaries.chapterNumber, detailedSummary: chapterSummaries.detailedSummary })
    .from(chapterSummaries)
    .innerJoin(chapters, eq(chapterSummaries.chapterId, chapters.id))
    .where(and(
      eq(chapters.storyId, storyId),
      gte(chapters.chapterNumber, arc.startChapter ?? 0),
      lte(chapters.chapterNumber, arc.endChapter ?? 999999),
      or(eq(chapters.status, 'completed'), eq(chapters.status, 'paused_pending_updates')),
    ))
    .orderBy(desc(chapterSummaries.chapterNumber))
    .limit(50);

  if (summaries.length === 0) {
    log.info('no completed chapters in arc; noop');
    return { status: 'skipped' as const };
  }

  const { provider } = await buildLoggedWorkerProvider(db, data);
  const agent = new ArcSummaryCompactorAgent({ provider, logger: log as any });

  const out = await agent.compact({
    storyId,
    arcTitle: arc.title,
    perChapterSummaries: summaries.reverse().map((s) => ({
      chapterNumber: s.chapterNumber,
      detailedSummary: s.detailedSummary ?? '',
    })),
  });

  await db.update(arcs).set({
    rollingSummary: out.summary,
    summaryVersion: sql`${arcs.summaryVersion} + 1`,
    summaryUpdatedAt: new Date(),
  }).where(eq(arcs.id, arcId));

  if (arc.sagaId) {
    try {
      const sagaJobId = await enqueueRefreshSagaSummary({
        storyId,
        sagaId: arc.sagaId,
        traceId: data.traceId,
        llmProvider: data.llmProvider,
        modelRoutes: data.modelRoutes,
      });
      log.info({ sagaJobId }, 'enqueued saga summary refresh');
    } catch (enqueueErr) {
      log.warn({ err: enqueueErr }, 'failed to enqueue saga summary refresh');
    }
  }

  log.info({ costUsd: 0, tokens: out.usage.inputTokens + out.usage.outputTokens }, 'arc summary refreshed');
  return { status: 'refreshed' as const };
}
