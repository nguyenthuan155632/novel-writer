import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { arcs, sagas } from '@novel/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { ArcPlannerAgent } from '@novel/ai';
import '@novel/ai/prompts/arc-planner.v1';
import { buildLoggedProvider } from '../lib/llm-provider.ts';

const SagaParam = z.object({ storyId: z.string().uuid(), sagaId: z.string().uuid() });
const ArcParam = z.object({ storyId: z.string().uuid(), arcId: z.string().uuid() });
const PlanBody = z.object({ currentState: z.string().min(1).max(4000) });

const arcsRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/sagas/:sagaId/arcs', async (req, reply) => {
    const db = getDb();
    const { storyId, sagaId } = SagaParam.parse(req.params);
    const rows = await db.select().from(arcs)
      .where(and(eq(arcs.storyId, storyId), eq(arcs.sagaId, sagaId)))
      .orderBy(asc(arcs.arcNumber));
    return reply.send({ arcs: rows });
  });

  app.get('/api/stories/:storyId/arcs/:arcId', async (req, reply) => {
    const db = getDb();
    const { storyId, arcId } = ArcParam.parse(req.params);
    const [row] = await db.select().from(arcs)
      .where(and(eq(arcs.storyId, storyId), eq(arcs.id, arcId))).limit(1);
    if (!row) return reply.code(404).send({ error: 'arc_not_found' });
    return reply.send({ arc: row });
  });

  app.post('/api/stories/:storyId/sagas/:sagaId/arcs/plan', async (req, reply) => {
    const db = getDb();
    const { storyId, sagaId } = SagaParam.parse(req.params);
    const { currentState } = PlanBody.parse(req.body ?? {});
    const [saga] = await db.select().from(sagas)
      .where(and(eq(sagas.storyId, storyId), eq(sagas.id, sagaId))).limit(1);
    if (!saga) return reply.code(404).send({ error: 'saga_not_found' });
    const provider = await buildLoggedProvider();
    const agent = new ArcPlannerAgent({ provider, logger: { child: () => ({ child: () => ({} as any), error: () => {}, info: () => {} } as any), error: () => {}, info: () => {} } as any });
    const planned = await agent.plan({ storyId, sagaId, currentState });
    const counts = await agent.persist(storyId, sagaId, planned.output);
    return reply.send({ promptVersion: planned.promptVersion, usage: planned.usage, ...counts });
  });

  done();
};

export default arcsRoute;
