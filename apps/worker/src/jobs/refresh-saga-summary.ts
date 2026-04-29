import { getDb } from '@novel/db';
import { sagas, arcs } from '@novel/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import { ArcSummaryCompactorAgent } from '@novel/ai';
import { OpenCodeProvider } from '@novel/ai/providers/opencode';
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

  const [saga] = await db.select().from(sagas).where(eq(sagas.id, sagaId)).limit(1);
  if (!saga) return { status: 'skipped' as const };

  const arcRows = await db.select({ id: arcs.id, title: arcs.title, rollingSummary: arcs.rollingSummary })
    .from(arcs)
    .where(and(eq(arcs.storyId, storyId), eq(arcs.sagaId, sagaId)))
    .orderBy(asc(arcs.arcNumber));

  const filled = arcRows.filter((a) => a.rollingSummary);
  if (filled.length === 0) {
    log.info('no arc summaries to roll up; noop');
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
    arcTitle: `[SAGA] ${saga.title}`,
    perChapterSummaries: filled.map((a, i) => ({
      chapterNumber: i + 1,
      detailedSummary: a.rollingSummary!,
    })),
  });

  await db.update(sagas).set({
    rollingSummary: out.summary,
    summaryVersion: sql`${sagas.summaryVersion} + 1`,
    summaryUpdatedAt: new Date(),
  }).where(eq(sagas.id, sagaId));

  log.info('saga summary refreshed');
  return { status: 'refreshed' as const };
}
