import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { stories, storyBibles } from '@novel/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateBible } from '@novel/ai/agents/bible-generator';
import { loadStoryDomainContext } from '@novel/ai';
import { buildLoggedProvider } from '../lib/llm-provider.ts';
import { getModelStatusForActiveProviderFromDb } from '../lib/llm-settings.ts';
import { newTraceId } from '@novel/core/trace';

const UpdateBibleSchema = z.object({
  worldRules: z.string().min(50).optional(),
  cultivationSystem: z.string().min(50).optional(),
  bloodlineSystem: z.string().min(50).optional(),
  styleGuide: z.string().min(50).optional(),
  forbiddenRules: z.string().min(20).optional(),
  endingDirection: z.string().min(20).optional(),
  compactSummary: z.string().min(50).max(2000).optional(),
  styleFewShots: z.array(z.object({ excerpt: z.string(), sourceChapter: z.number().optional() })).optional(),
});

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.post<{ Params: { id: string } }>('/api/stories/:id/bible', async (req, reply) => {
    const db = getDb();
    const id = z.string().uuid().parse(req.params.id);
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    if (!story) return reply.status(404).send({ error: 'story_not_found' });

    const provider = await buildLoggedProvider();
    const modelStatus = await getModelStatusForActiveProviderFromDb();
    const traceId = (req as unknown as { traceId: string }).traceId ?? newTraceId();

    const domain = await loadStoryDomainContext(db, story.id);

    const { bible } = await generateBible({
      provider,
      model: modelStatus.routes.bible_generator,
      input: {
        premise: story.premise,
        target_chapter_count: story.targetChapterCount,
        genreDef: domain.genreDef,
        personalityDef: domain.personalityDef,
        storyOptions: domain.storyOptions,
      },
      traceId,
      storyId: story.id,
    });

    const [row] = await db.insert(storyBibles).values({
      storyId: story.id,
      worldRules: bible.world_rules,
      powerSystem: bible.power_system,
      powerSystemKind: bible.power_system_kind,
      cultivationSystem: bible.cultivation_system ?? null,
      bloodlineSystem: bible.bloodline_system ?? null,
      styleGuide: bible.style_guide,
      forbiddenRules: bible.forbidden_rules,
      endingDirection: bible.ending_direction,
      compactSummary: bible.compact_summary,
    }).returning();

    await db.update(stories)
      .set({ genreLockedAt: new Date() })
      .where(eq(stories.id, story.id));

    return reply.status(201).send(row);
  });

  app.get<{ Params: { id: string } }>('/api/stories/:id/bible', async (req, reply) => {
    const db = getDb();
    const id = z.string().uuid().parse(req.params.id);
    const [row] = await db.select()
      .from(storyBibles)
      .where(eq(storyBibles.storyId, id))
      .orderBy(desc(storyBibles.version))
      .limit(1);
    if (!row) return reply.status(404).send({ error: 'bible_not_found' });
    return row;
  });

  app.put<{ Params: { id: string } }>('/api/stories/:id/bible', async (req, reply) => {
    const db = getDb();
    const id = z.string().uuid().parse(req.params.id);
    const patch = UpdateBibleSchema.parse(req.body);
    const [current] = await db.select().from(storyBibles)
      .where(eq(storyBibles.storyId, id))
      .orderBy(desc(storyBibles.version))
      .limit(1);
    if (!current) return reply.status(404).send({ error: 'bible_not_found' });

    const [next] = await db.insert(storyBibles).values({
      storyId: id,
      version: current.version + 1,
      worldRules: patch.worldRules ?? current.worldRules,
      powerSystem: current.powerSystem,
      powerSystemKind: current.powerSystemKind,
      cultivationSystem: patch.cultivationSystem ?? current.cultivationSystem,
      bloodlineSystem: patch.bloodlineSystem ?? current.bloodlineSystem,
      styleGuide: patch.styleGuide ?? current.styleGuide,
      forbiddenRules: patch.forbiddenRules ?? current.forbiddenRules,
      endingDirection: patch.endingDirection ?? current.endingDirection,
      compactSummary: patch.compactSummary ?? current.compactSummary,
      styleFewShots: patch.styleFewShots ?? current.styleFewShots,
    }).returning();
    return next;
  });

  // PUT /api/stories/:storyId/bible/style-few-shots
  app.put<{ Params: { storyId: string } }>('/api/stories/:storyId/bible/style-few-shots', async (req, reply) => {
    const db = getDb();
    const storyId = z.string().uuid().parse(req.params.storyId);

    const FewShotsSchema = z.object({
      fewShots: z
        .array(z.string().min(20).max(2000))
        .max(5),
    });

    let parsed: { fewShots: string[] };
    try {
      parsed = FewShotsSchema.parse(req.body);
    } catch (e) {
      return reply.status(400).send({ error: 'validation_failed', details: (e as Error).message });
    }

    const [current] = await db.select().from(storyBibles)
      .where(eq(storyBibles.storyId, storyId))
      .orderBy(desc(storyBibles.version))
      .limit(1);
    if (!current) return reply.status(404).send({ error: 'bible_not_found' });

    const styleFewShots = parsed.fewShots.map((excerpt) => ({ excerpt }));

    await db.insert(storyBibles).values({
      storyId,
      version: current.version + 1,
      worldRules: current.worldRules,
      powerSystem: current.powerSystem,
      powerSystemKind: current.powerSystemKind,
      cultivationSystem: current.cultivationSystem,
      bloodlineSystem: current.bloodlineSystem,
      styleGuide: current.styleGuide,
      forbiddenRules: current.forbiddenRules,
      endingDirection: current.endingDirection,
      compactSummary: current.compactSummary,
      styleFewShots,
    });

    return reply.status(200).send({ ok: true });
  });

  done();
};

export default plugin;