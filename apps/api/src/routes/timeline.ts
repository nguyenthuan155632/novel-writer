import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { eq, and, asc } from 'drizzle-orm';

const StoryParam = z.object({ storyId: z.string().uuid() });

const timelineRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/timeline', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db
      .select({
        number: schema.chapters.chapterNumber,
        title: schema.chapters.title,
        shortSummary: schema.chapterSummaries.shortSummary,
        completedAt: schema.chapters.updatedAt,
      })
      .from(schema.chapters)
      .innerJoin(schema.chapterSummaries, eq(schema.chapters.id, schema.chapterSummaries.chapterId))
      .where(and(eq(schema.chapters.storyId, storyId), eq(schema.chapters.status, 'completed')))
      .orderBy(asc(schema.chapters.chapterNumber));
    return reply.send({ timeline: rows });
  });

  done();
};

export default timelineRoute;