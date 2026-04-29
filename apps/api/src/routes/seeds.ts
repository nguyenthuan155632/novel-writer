import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
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

const seedsRoute: FastifyPluginAsync = async (fastify) => {
  const db = getDb();

  fastify.get('/api/stories/:storyId/seeds', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(schema.plantedSeeds)
      .where(eq(schema.plantedSeeds.storyId, storyId))
      .orderBy(asc(schema.plantedSeeds.payoffChapter));
    return reply.send({ seeds: rows });
  });

  fastify.post('/api/stories/:storyId/seeds', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const body = SeedBody.parse(req.body);
    const [row] = await db.insert(schema.plantedSeeds).values({ storyId, ...body, status: body.status ?? 'pending', seedText: body.description, payoffDescription: `Payoff at ch ${body.payoffChapter}`, createdByAgent: 'manual' }).returning();
    return reply.code(201).send({ seed: row });
  });

  fastify.patch('/api/stories/:storyId/seeds/:seedId', async (req, reply) => {
    const { storyId, seedId } = SeedParam.parse(req.params);
    const body = SeedBody.partial().parse(req.body);
    const [row] = await db.update(schema.plantedSeeds).set(body)
      .where(and(eq(schema.plantedSeeds.storyId, storyId), eq(schema.plantedSeeds.id, seedId)))
      .returning();
    if (!row) return reply.code(404).send({ error: 'seed_not_found' });
    return reply.send({ seed: row });
  });

  fastify.delete('/api/stories/:storyId/seeds/:seedId', async (req, reply) => {
    const { storyId, seedId } = SeedParam.parse(req.params);
    const result = await db.delete(schema.plantedSeeds)
      .where(and(eq(schema.plantedSeeds.storyId, storyId), eq(schema.plantedSeeds.id, seedId)))
      .returning({ id: schema.plantedSeeds.id });
    if (result.length === 0) return reply.code(404).send({ error: 'seed_not_found' });
    return reply.send({ deleted: seedId });
  });
};

export default seedsRoute;