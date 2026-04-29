import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { highStakesReviews } from '@novel/db/schema';
import { eq, desc } from 'drizzle-orm';

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
    const { storyId } = StoryParam.parse(req.params);
    const { chapterId } = TriggerBody.parse(req.body);
    return reply.code(202).send({ status: 'queued', storyId, chapterId, triggerReason: 'manual' });
  });

  done();
};

export default reviewsRoute;