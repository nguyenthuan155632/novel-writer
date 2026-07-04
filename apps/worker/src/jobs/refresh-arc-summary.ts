import { getDb } from '@novel/db';
import { arcs, chapters, chapterSummaries, sagas } from '@novel/db/schema';
import { eq, and, asc, gte, lte, sql, or } from 'drizzle-orm';
import type { Logger } from 'pino';
import { ArcSummaryCompactorAgent } from '@novel/ai';
import { CONTEXT_CONFIG, shouldRefreshRollingSummary, type LlmProviderId, type ModelRoutes } from '@novel/core';
import { buildLoggedWorkerProvider } from './provider.js';
import { enqueueRefreshSagaSummary } from '../services/queue-publisher.js';

export interface RefreshArcSummaryJobData {
  storyId: string;
  arcId: string;
  traceId: string;
  triggerChapterNumber?: number;
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

  const sinceChapter = arc.lastCompactedChapter ?? (arc.startChapter ?? 0) - 1;
  const summaries = await db
    .select({ chapterNumber: chapterSummaries.chapterNumber, summary: chapterSummaries.summary })
    .from(chapterSummaries)
    .innerJoin(chapters, eq(chapterSummaries.chapterId, chapters.id))
    .where(and(
      eq(chapters.storyId, storyId),
      gte(chapters.chapterNumber, Math.max(arc.startChapter ?? 0, sinceChapter + 1)),
      lte(chapters.chapterNumber, arc.endChapter ?? 999999),
      or(eq(chapters.status, 'completed'), eq(chapters.status, 'paused_pending_updates')),
    ))
    .orderBy(asc(chapterSummaries.chapterNumber))
    .limit(50);

  if (summaries.length === 0) {
    log.info('no new completed chapters since last compaction; noop');
    return { status: 'skipped' as const };
  }

  const { provider, modelRoutes } = await buildLoggedWorkerProvider(db, data);
  const agent = new ArcSummaryCompactorAgent({
    provider,
    logger: log as any,
    model: modelRoutes.arc_summary_compactor ?? modelRoutes.summary_compactor,
  });

  const out = await agent.compact({
    storyId,
    arcTitle: arc.title,
    previousRollingSummary: arc.rollingSummary ?? undefined,
    perChapterSummaries: summaries.map((s) => ({
      chapterNumber: s.chapterNumber,
      summary: s.summary ?? '',
    })),
  });

  const maxCompacted = summaries[summaries.length - 1]!.chapterNumber;
  await db.update(arcs).set({
    rollingSummary: out.summary,
    lastCompactedChapter: maxCompacted,
    summaryVersion: sql`${arcs.summaryVersion} + 1`,
    summaryUpdatedAt: new Date(),
  }).where(eq(arcs.id, arcId));

  const [sagaRow] = arc.sagaId
    ? await db.select({ startChapter: sagas.startChapter, endChapter: sagas.endChapter })
        .from(sagas).where(eq(sagas.id, arc.sagaId)).limit(1)
    : [];
  const sagaRefreshDue =
    arc.sagaId != null &&
    (data.triggerChapterNumber == null ||
      shouldRefreshRollingSummary({
        chapterNumber: data.triggerChapterNumber,
        startChapter: sagaRow?.startChapter ?? null,
        endChapter: sagaRow?.endChapter ?? null,
        everyN: CONTEXT_CONFIG.SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS,
      }));
  if (arc.sagaId && sagaRefreshDue) {
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
