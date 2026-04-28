import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { stories } from '@novel/db/schema';
import { eq, desc } from 'drizzle-orm';

const CreateStorySchema = z.object({
  title: z.string().min(1).max(200),
  premise: z.string().min(20).max(5000),
  genre: z.string().default('xianxia_fantasy'),
  tone: z.string().nullish(),
  targetChapterCount: z.number().int().min(1).max(10000).default(1000),
});

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.post('/api/stories', async (req, reply) => {
    const db = getDb();
    const body = CreateStorySchema.parse(req.body);
    const [row] = await db.insert(stories).values({
      title: body.title,
      premise: body.premise,
      genre: body.genre,
      tone: body.tone ?? null,
      targetChapterCount: body.targetChapterCount,
    }).returning();
    return reply.status(201).send(row);
  });

  app.get('/api/stories', async () => {
    const db = getDb();
    return db.select().from(stories).orderBy(desc(stories.createdAt)).limit(100);
  });

  app.get<{ Params: { id: string } }>('/api/stories/:id', async (req, reply) => {
    const db = getDb();
    const id = z.string().uuid().parse(req.params.id);
    const [row] = await db.select().from(stories).where(eq(stories.id, id));
    if (!row) return reply.status(404).send({ error: 'not_found' });
    return row;
  });

  done();
};

export default plugin;