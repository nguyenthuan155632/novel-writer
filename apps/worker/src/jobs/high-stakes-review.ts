import { getDb } from '@novel/db';
import { chapters, chapterSummaries, highStakesReviews } from '@novel/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { Logger } from 'pino';
import { HighStakesReviewerAgent } from '@novel/ai';
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';

export interface HighStakesReviewJobData {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  triggerReason: 'arc_end' | 'critical_severity' | 'manual';
  traceId: string;
}

export async function runHighStakesReviewJob(data: HighStakesReviewJobData, ctx: { logger: Logger }) {
  const db = getDb();
  const { storyId, chapterId, chapterNumber, triggerReason } = data;
  const log = ctx.logger.child({ chapterId, storyId, triggerReason });

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) {
    log.warn('chapter not found; noop');
    return { status: 'skipped' as const };
  }

  const summaries = await db
    .select({ rollingSummary: chapterSummaries.detailedSummary })
    .from(chapterSummaries)
    .innerJoin(chapters, eq(chapterSummaries.chapterId, chapters.id))
    .where(and(
      eq(chapters.storyId, storyId),
      eq(chapters.status, 'completed'),
    ))
    .orderBy(desc(chapterSummaries.chapterNumber))
    .limit(10);

  const arcSummary = summaries.map((s, i) => `Chapter ${chapterNumber - i}: ${s.rollingSummary ?? '(no summary)'}`).join('\n');

  const baseProvider = new OpenRouterProvider({ apiKey: process.env.OPENROUTER_API_KEY ?? '' });
  const provider = new LoggedLLMProvider({ inner: baseProvider, recordCall: makeDrizzleRecorder(db) });
  const agent = new HighStakesReviewerAgent({ provider, logger: log as any });

  const result = await agent.review({
    storyId,
    chapterId,
    chapterNumber,
    triggerReason,
    chapter: { title: chapter.title ?? `Chapter ${chapterNumber}`, content: chapter.content ?? '' },
    arcSummary,
    bibleCompact: '',
  });

  log.info({ approve: result.output.approve, reviewId: result.reviewId }, 'high-stakes review completed');
  return { status: 'reviewed' as const, reviewId: result.reviewId };
}