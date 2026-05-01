import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { sagas, stories, storyBibles } from '@novel/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { SagaPlannerAgent, loadStoryDomainContext } from '@novel/ai';
import '@novel/ai/prompts/saga-planner.v2';
import { buildLoggedProvider } from '../lib/llm-provider.ts';
import { getModelStatusForActiveProviderFromDb } from '../lib/llm-settings.ts';

const StoryParam = z.object({ storyId: z.string().uuid() });
const SagaParam = z.object({ storyId: z.string().uuid(), sagaId: z.string().uuid() });
const PlanBody = z.object({ resetSeeds: z.boolean().optional() });

const sagasRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/sagas', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(sagas)
      .where(eq(sagas.storyId, storyId))
      .orderBy(asc(sagas.sagaNumber));
    return reply.send({ sagas: rows });
  });

  app.get('/api/stories/:storyId/sagas/:sagaId', async (req, reply) => {
    const db = getDb();
    const { storyId, sagaId } = SagaParam.parse(req.params);
    const [row] = await db.select().from(sagas)
      .where(and(eq(sagas.storyId, storyId), eq(sagas.id, sagaId)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: 'saga_not_found' });
    return reply.send({ saga: row });
  });

  app.post('/api/stories/:storyId/sagas/plan', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const { resetSeeds = false } = PlanBody.parse(req.body ?? {});

    const [story] = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
    if (!story) return reply.code(404).send({ error: 'story_not_found' });
    const [bible] = await db.select().from(storyBibles)
      .where(eq(storyBibles.storyId, storyId))
      .orderBy(desc(storyBibles.version), desc(storyBibles.createdAt))
      .limit(1);
    if (!bible) return reply.code(409).send({ error: 'bible_required' });

    const domain = await loadStoryDomainContext(db, storyId);
    const provider = await buildLoggedProvider();
    const modelStatus = await getModelStatusForActiveProviderFromDb();
    const agent = new SagaPlannerAgent({
      provider,
      logger: { child: () => ({ child: () => ({}), error: () => {}, info: () => {} } as any), error: () => {}, info: () => {} } as any,
      model: modelStatus.routes.saga_planner,
    });
    const planned = await agent.plan({
      storyId,
      bibleCompact: bible.compactSummary ?? '',
      targetChapters: story.targetChapterCount,
      genreDef: domain.genreDef,
      storyOptions: domain.storyOptions,
    });
    const counts = await agent.persist(storyId, planned.output, { resetSeeds });
    return reply.send({
      promptVersion: planned.promptVersion,
      usage: planned.usage,
      ...counts,
    });
  });

  done();
};

export default sagasRoute;
