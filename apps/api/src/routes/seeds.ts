import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { plantedSeeds } from '@novel/db/schema';
import { eq, and, asc } from 'drizzle-orm';

const StoryParam = z.object({ storyId: z.string().uuid() });
const SeedParam = z.object({ storyId: z.string().uuid(), seedId: z.string().uuid() });
const SeedBody = z.object({
  seedKey: z.string().min(3).max(120),
  description: z.string().min(20).max(600),
  plantWindowStart: z.number().int().positive(),
  plantWindowEnd: z.number().int().positive(),
  payoffChapter: z.number().int().positive(),
  importance: z.enum(['minor', 'major', 'climax']),
  status: z.enum(['pending', 'planted', 'paid_off', 'abandoned']).optional(),
});

const seedsRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/seeds', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(plantedSeeds)
      .where(eq(plantedSeeds.storyId, storyId))
      .orderBy(asc(plantedSeeds.payoffChapter));
    return reply.send({ seeds: rows });
  });

  app.post('/api/stories/:storyId/seeds', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const body = SeedBody.parse(req.body);
    const [row] = await db.insert(plantedSeeds).values({ storyId, ...body, status: body.status ?? 'pending', seedText: body.description, payoffDescription: `Payoff at ch ${body.payoffChapter}`, createdByAgent: 'manual' }).returning();
    return reply.code(201).send({ seed: row });
  });

  app.patch('/api/stories/:storyId/seeds/:seedId', async (req, reply) => {
    const db = getDb();
    const { storyId, seedId } = SeedParam.parse(req.params);
    const body = SeedBody.partial().parse(req.body);
    const [row] = await db.update(plantedSeeds).set(body)
      .where(and(eq(plantedSeeds.storyId, storyId), eq(plantedSeeds.id, seedId)))
      .returning();
    if (!row) return reply.code(404).send({ error: 'seed_not_found' });
    return reply.send({ seed: row });
  });

  app.delete('/api/stories/:storyId/seeds/:seedId', async (req, reply) => {
    const db = getDb();
    const { storyId, seedId } = SeedParam.parse(req.params);
    const result = await db.delete(plantedSeeds)
      .where(and(eq(plantedSeeds.storyId, storyId), eq(plantedSeeds.id, seedId)))
      .returning({ id: plantedSeeds.id });
    if (result.length === 0) return reply.code(404).send({ error: 'seed_not_found' });
    return reply.send({ deleted: seedId });
  });

  done();
};

export default seedsRoute;