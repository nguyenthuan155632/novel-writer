import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getGenerateBatchQueue } from '@novel/worker/queues.js';

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
    const rows = await db.select().from(schema.batches)
      .where(eq(schema.batches.storyId, storyId))
      .orderBy(desc(schema.batches.startedAt));
    return reply.send({ batches: rows });
  });

  app.post('/api/stories/:storyId/batches', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const body = StartBody.parse(req.body);
    const [row] = await db.insert(schema.batches).values({
      storyId, startChapter: body.startChapter, endChapter: body.endChapter, mode: body.mode, status: 'running',
    }).returning();
    const queue = getGenerateBatchQueue();
    const job = await queue.add('generate-batch', {
      batchId: row.id, storyId, startChapter: body.startChapter, endChapter: body.endChapter, mode: body.mode,
    }, { jobId: `batch-${row.id}` });
    return reply.code(202).send({ batch: row, jobId: job.id });
  });

  app.post('/api/stories/:storyId/batches/:batchId/cancel', async (req, reply) => {
    const db = getDb();
    const { storyId, batchId } = BatchParam.parse(req.params);
    await db.update(schema.batches).set({ status: 'cancelled', finishedAt: new Date() })
      .where(and(eq(schema.batches.storyId, storyId), eq(schema.batches.id, batchId)));
    return reply.send({ status: 'cancelled' });
  });

  done();
};

export default batchesRoute;