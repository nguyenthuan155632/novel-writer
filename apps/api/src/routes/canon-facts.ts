import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { canonFacts } from '@novel/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const StoryParam = z.object({ storyId: z.string().uuid() });
const FactParam = z.object({ storyId: z.string().uuid(), factId: z.string().uuid() });
const LockBody = z.object({ locked: z.boolean() });

const canonFactsRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/canon-facts', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(canonFacts)
      .where(eq(canonFacts.storyId, storyId))
      .orderBy(desc(canonFacts.importance));
    return reply.send({ facts: rows });
  });

  app.patch('/api/stories/:storyId/canon-facts/:factId/lock', async (req, reply) => {
    const db = getDb();
    const { storyId, factId } = FactParam.parse(req.params);
    const { locked } = LockBody.parse(req.body);
    const [row] = await db.update(canonFacts)
      .set({ importance: locked ? 'locked' : 'medium', locked })
      .where(and(eq(canonFacts.storyId, storyId), eq(canonFacts.id, factId)))
      .returning();
    if (!row) return reply.code(404).send({ error: 'fact_not_found' });
    return reply.send({ fact: row });
  });

  done();
};

export default canonFactsRoute;