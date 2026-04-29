import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';
import { SagaPlannerAgent } from '@novel/ai';
import '../../src/prompts/saga-planner.v1.ts';

const StoryParam = z.object({ storyId: z.string().uuid() });
const SagaParam = z.object({ storyId: z.string().uuid(), sagaId: z.string().uuid() });
const PlanBody = z.object({ resetSeeds: z.boolean().optional() });

function buildProvider() {
  const base = new OpenRouterProvider({ apiKey: process.env.OPENROUTER_API_KEY ?? '' });
  const db = getDb();
  return new LoggedLLMProvider({ inner: base, recordCall: makeDrizzleRecorder(db) });
}

const sagasRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/sagas', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db.select().from(schema.sagas)
      .where(eq(schema.sagas.storyId, storyId))
      .orderBy(asc(schema.sagas.sagaNumber));
    return reply.send({ sagas: rows });
  });

  app.get('/api/stories/:storyId/sagas/:sagaId', async (req, reply) => {
    const db = getDb();
    const { storyId, sagaId } = SagaParam.parse(req.params);
    const [row] = await db.select().from(schema.sagas)
      .where(and(eq(schema.sagas.storyId, storyId), eq(schema.sagas.id, sagaId)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: 'saga_not_found' });
    return reply.send({ saga: row });
  });

  app.post('/api/stories/:storyId/sagas/plan', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const { resetSeeds = false } = PlanBody.parse(req.body ?? {});

    const [story] = await db.select().from(schema.stories).where(eq(schema.stories.id, storyId)).limit(1);
    if (!story) return reply.code(404).send({ error: 'story_not_found' });
    const [bible] = await db.select().from(schema.storyBibles).where(eq(schema.storyBibles.storyId, storyId)).limit(1);
    if (!bible) return reply.code(409).send({ error: 'bible_required' });

    const provider = buildProvider();
    const agent = new SagaPlannerAgent({ provider, logger: { child: () => ({ child: () => ({}), error: () => {}, info: () => {} } as any), error: () => {}, info: () => {} } as any });
    const planned = await agent.plan({
      storyId,
      bibleCompact: bible.compactSummary ?? '',
      targetChapters: story.targetChapterCount,
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