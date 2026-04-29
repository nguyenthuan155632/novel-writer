import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { batches } from '@novel/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getGenerateBatchQueue } from '../services/queue-client.ts';
import { newTraceId } from '@novel/core/trace';
import { getModelStatus } from '@novel/core';

const StoryParam = z.object({ storyId: z.string().uuid() });
const BatchParam = z.object({ storyId: z.string().uuid(), batchId: z.string().uuid() });
const StartBody = z.object({
  startChapter: z.number().int().positive(),
  endChapter: z.number().int().positive(),
  mode: z.enum(['safe', 'semi_auto', 'full_auto']),
}).refine((b) => b.endChapter >= b.startChapter, { message: 'endChapter must be >= startChapter' });

const batchesRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/batches', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(batches)
      .where(eq(batches.storyId, storyId))
      .orderBy(desc(batches.startedAt));
    return reply.send({ batches: rows });
  });

  app.post('/api/stories/:storyId/batches', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const body = StartBody.parse(req.body);
    const [row] = await db.insert(batches).values({
      storyId, startChapter: body.startChapter, endChapter: body.endChapter, mode: body.mode, status: 'running',
    }).returning();
    if (!row) return reply.code(500).send({ error: 'insert_failed' });
    const queue = getGenerateBatchQueue();
    const traceId = (req as unknown as { traceId?: string }).traceId ?? newTraceId();
    const job = await queue.add('generate-batch', {
      batchId: row.id, storyId, startChapter: body.startChapter, endChapter: body.endChapter, mode: body.mode,
      traceId,
      modelRoutes: getModelStatus().routes,
    }, { jobId: `batch-${row.id}` });
    return reply.code(202).send({ batch: row, jobId: job.id });
  });

  app.post('/api/stories/:storyId/batches/:batchId/cancel', async (req, reply) => {
    const db = getDb();
    const { storyId, batchId } = BatchParam.parse(req.params);
    await db.update(batches).set({ status: 'cancelled', finishedAt: new Date() })
      .where(and(eq(batches.storyId, storyId), eq(batches.id, batchId)));
    return reply.send({ status: 'cancelled' });
  });

  done();
};

export default batchesRoute;
