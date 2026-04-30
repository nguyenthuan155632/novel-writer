import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { chapters, highStakesReviews } from '@novel/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { newTraceId } from '@novel/core/trace';
import { enqueueHighStakesReview } from '../services/queue-client.ts';
import { getQueueLlmSnapshot } from '../lib/provider-switcher.ts';

const StoryParam = z.object({ storyId: z.string().uuid() });
const TriggerBody = z.object({ chapterId: z.string().uuid() });

const reviewsRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/reviews', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(highStakesReviews)
      .where(eq(highStakesReviews.storyId, storyId))
      .orderBy(desc(highStakesReviews.createdAt));
    return reply.send({ reviews: rows });
  });

  app.post('/api/stories/:storyId/reviews/trigger', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const { chapterId } = TriggerBody.parse(req.body);
    const [chapter] = await db.select({
      id: chapters.id,
      chapterNumber: chapters.chapterNumber,
    }).from(chapters)
      .where(and(eq(chapters.storyId, storyId), eq(chapters.id, chapterId)))
      .limit(1);
    if (!chapter) return reply.code(404).send({ error: 'chapter_not_found' });

    const traceId = (req as unknown as { traceId?: string }).traceId ?? newTraceId();
    const llmSnapshot = await getQueueLlmSnapshot();
    const jobId = await enqueueHighStakesReview({
      storyId,
      chapterId,
      chapterNumber: chapter.chapterNumber,
      triggerReason: 'manual',
      traceId,
      llmProvider: llmSnapshot.llmProvider,
      modelRoutes: llmSnapshot.modelRoutes,
    });
    return reply.code(202).send({ status: 'queued', jobId, storyId, chapterId, triggerReason: 'manual' });
  });

  done();
};

export default reviewsRoute;
