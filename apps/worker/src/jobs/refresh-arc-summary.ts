import { getDb } from '@novel/db';
import { arcs, chapters, chapterSummaries } from '@novel/db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import { ArcSummaryCompactorAgent } from '@novel/ai';
import { OpenCodeProvider } from '@novel/ai/providers/opencode';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';

export interface RefreshArcSummaryJobData {
  storyId: string;
  arcId: string;
  traceId: string;
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
      eq(chapters.status, 'completed'),
    ))
    .orderBy(desc(chapterSummaries.chapterNumber))
    .limit(50);

  if (summaries.length === 0) {
    log.info('no completed chapters in arc; noop');
    return { status: 'skipped' as const };
  }

  const baseProvider = new OpenCodeProvider({
    apiKey: process.env.OPENCODE_API_KEY ?? '',
    baseUrl: process.env.OPENCODE_BASE_URL,
  });
  const provider = new LoggedLLMProvider({ inner: baseProvider, recordCall: makeDrizzleRecorder(db) });
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

  log.info({ costUsd: 0, tokens: out.usage.inputTokens + out.usage.outputTokens }, 'arc summary refreshed');
  return { status: 'refreshed' as const };
}
