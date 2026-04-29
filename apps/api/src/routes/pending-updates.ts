import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { pendingCanonUpdates } from '@novel/db/schema';
import { eq, and, asc } from 'drizzle-orm';

const StoryParams = z.object({
  storyId: z.string().uuid(),
});

const UpdateParams = z.object({
  storyId: z.string().uuid(),
  updateId: z.string().uuid(),
});

const ApproveBody = z.object({
  resolution: z.enum(['approved', 'edited']).default('approved'),
});

const RejectBody = z.object({
  reason: z.string().min(1).max(1000),
});

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/pending-updates', async (req, reply) => {
    const { storyId } = StoryParams.parse(req.params);
    const resolution = (req.query as { resolution?: string }).resolution ?? 'pending';
    const db = getDb();
    const rows = await db
      .select()
      .from(pendingCanonUpdates)
      .where(
        and(
          eq(pendingCanonUpdates.storyId, storyId),
          eq(pendingCanonUpdates.resolution, resolution),
        ),
      )
      .orderBy(asc(pendingCanonUpdates.createdAt));
    return reply.send({ pendingUpdates: rows });
  });

  app.post('/api/stories/:storyId/pending-updates/:updateId/approve', async (req, reply) => {
    const { storyId, updateId } = UpdateParams.parse(req.params);
    const body = ApproveBody.parse(req.body);
    const db = getDb();
    const [row] = await db
      .update(pendingCanonUpdates)
      .set({
        resolution: body.resolution,
        conflictStatus: 'resolved',
        reviewedBy: 'human',
        resolvedAt: new Date(),
      })
      .where(and(eq(pendingCanonUpdates.id, updateId), eq(pendingCanonUpdates.storyId, storyId)))
      .returning();
    if (!row) return reply.code(404).send({ error: 'pending_update_not_found' });
    return reply.send({ pendingUpdate: row });
  });

  app.post('/api/stories/:storyId/pending-updates/:updateId/reject', async (req, reply) => {
    const { storyId, updateId } = UpdateParams.parse(req.params);
    const body = RejectBody.parse(req.body);
    const db = getDb();
    const [row] = await db
      .update(pendingCanonUpdates)
      .set({
        resolution: 'rejected',
        conflictStatus: 'resolved',
        reviewedBy: 'human',
        resolvedAt: new Date(),
      })
      .where(and(eq(pendingCanonUpdates.id, updateId), eq(pendingCanonUpdates.storyId, storyId)))
      .returning();
    if (!row) return reply.code(404).send({ error: 'pending_update_not_found' });
    return reply.send({ pendingUpdate: row });
  });

  done();
};

export default plugin;