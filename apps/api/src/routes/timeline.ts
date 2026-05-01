import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { getDb } from "@novel/db";
import { chapters, chapterSummaries } from "@novel/db/schema";
import { eq, and, desc, or } from "drizzle-orm";

const StoryParam = z.object({ storyId: z.string().uuid() });

const timelineRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get("/api/stories/:storyId/timeline", async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db
      .select({
        number: chapters.chapterNumber,
        title: chapters.title,
        summary: chapterSummaries.summary,
        completedAt: chapters.updatedAt,
      })
      .from(chapters)
      .innerJoin(chapterSummaries, eq(chapters.id, chapterSummaries.chapterId))
      .where(
        and(
          eq(chapters.storyId, storyId),
          or(
            eq(chapters.status, "completed"),
            eq(chapters.status, "paused_pending_updates"),
          ),
        ),
      )
      .orderBy(desc(chapters.chapterNumber));
    return reply.send({ timeline: rows });
  });

  done();
};

export default timelineRoute;
