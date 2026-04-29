import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import { ArcSummaryCompactorAgent } from '@novel/ai';
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
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

  const [arc] = await db.select().from(schema.arcs).where(eq(schema.arcs.id, arcId)).limit(1);
  if (!arc) {
    log.warn('arc not found; noop');
    return { status: 'skipped' as const };
  }

  const summaries = await db
    .select({ chapterNumber: schema.chapterSummaries.chapterNumber, detailedSummary: schema.chapterSummaries.detailedSummary })
    .from(schema.chapterSummaries)
    .innerJoin(schema.chapters, eq(schema.chapterSummaries.chapterId, schema.chapters.id))
    .where(and(
      eq(schema.chapters.storyId, storyId),
      gte(schema.chapters.chapterNumber, arc.startChapter ?? 0),
      lte(schema.chapters.chapterNumber, arc.endChapter ?? 999999),
      eq(schema.chapters.status, 'completed'),
    ))
    .orderBy(desc(schema.chapterSummaries.chapterNumber))
    .limit(50);

  if (summaries.length === 0) {
    log.info('no completed chapters in arc; noop');
    return { status: 'skipped' as const };
  }

  const baseProvider = new OpenRouterProvider({ apiKey: process.env.OPENROUTER_API_KEY ?? '' });
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

  await db.update(schema.arcs).set({
    rollingSummary: out.summary,
    summaryVersion: sql`${schema.arcs.summaryVersion} + 1`,
    summaryUpdatedAt: new Date(),
  }).where(eq(schema.arcs.id, arcId));

  log.info({ costUsd: 0, tokens: out.usage.inputTokens + out.usage.outputTokens }, 'arc summary refreshed');
  return { status: 'refreshed' as const };
}