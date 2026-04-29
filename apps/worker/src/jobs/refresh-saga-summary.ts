import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import { ArcSummaryCompactorAgent } from '@novel/ai';
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';

export interface RefreshSagaSummaryJobData {
  storyId: string;
  sagaId: string;
  traceId: string;
}

export async function runRefreshSagaSummaryJob(data: RefreshSagaSummaryJobData, ctx: { logger: Logger }) {
  const db = getDb();
  const { storyId, sagaId } = data;
  const log = ctx.logger.child({ sagaId, storyId });

  const [saga] = await db.select().from(schema.sagas).where(eq(schema.sagas.id, sagaId)).limit(1);
  if (!saga) return { status: 'skipped' as const };

  const arcRows = await db.select({ id: schema.arcs.id, title: schema.arcs.title, rollingSummary: schema.arcs.rollingSummary })
    .from(schema.arcs)
    .where(and(eq(schema.arcs.storyId, storyId), eq(schema.arcs.sagaId, sagaId)))
    .orderBy(asc(schema.arcs.arcNumber));

  const filled = arcRows.filter((a) => a.rollingSummary);
  if (filled.length === 0) {
    log.info('no arc summaries to roll up; noop');
    return { status: 'skipped' as const };
  }

  const baseProvider = new OpenRouterProvider({ apiKey: process.env.OPENROUTER_API_KEY ?? '' });
  const provider = new LoggedLLMProvider({ inner: baseProvider, recordCall: makeDrizzleRecorder(db) });
  const agent = new ArcSummaryCompactorAgent({ provider, logger: log as any });

  const out = await agent.compact({
    storyId,
    arcTitle: `[SAGA] ${saga.title}`,
    perChapterSummaries: filled.map((a, i) => ({
      chapterNumber: i + 1,
      detailedSummary: a.rollingSummary!,
    })),
  });

  await db.update(schema.sagas).set({
    rollingSummary: out.summary,
    summaryVersion: sql`${schema.sagas.summaryVersion} + 1`,
    summaryUpdatedAt: new Date(),
  }).where(eq(schema.sagas.id, sagaId));

  log.info('saga summary refreshed');
  return { status: 'refreshed' as const };
}