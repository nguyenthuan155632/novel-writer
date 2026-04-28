import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { stories, storyBibles } from '@novel/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateBible } from '@novel/ai/agents/bible-generator';
import '@novel/ai/prompts/bible-generator.v1';
import { modelFor } from '@novel/core';
import { buildLoggedProvider } from '../lib/llm-provider.ts';
import { newTraceId } from '@novel/core/trace';

const UpdateBibleSchema = z.object({
  worldRules: z.string().min(50).optional(),
  cultivationSystem: z.string().min(50).optional(),
  bloodlineSystem: z.string().min(50).optional(),
  styleGuide: z.string().min(50).optional(),
  forbiddenRules: z.string().min(20).optional(),
  endingDirection: z.string().min(20).optional(),
  compactSummary: z.string().min(50).max(2000).optional(),
  styleFewShots: z.array(z.string()).optional(),
});

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.post<{ Params: { id: string } }>('/api/stories/:id/bible', async (req, reply) => {
    const db = getDb();
    const id = z.string().uuid().parse(req.params.id);
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    if (!story) return reply.status(404).send({ error: 'story_not_found' });

    const provider = buildLoggedProvider();
    const traceId = (req as unknown as { traceId: string }).traceId ?? newTraceId();

    const { bible } = await generateBible({
      provider,
      model: modelFor('bible_generator'),
      input: {
        premise: story.premise,
        genre: story.genre,
        tone: story.tone ?? null,
        target_chapter_count: story.targetChapterCount,
      },
      traceId,
      storyId: story.id,
    });

    const [row] = await db.insert(storyBibles).values({
      storyId: story.id,
      worldRules: bible.world_rules,
      cultivationSystem: bible.cultivation_system,
      bloodlineSystem: bible.bloodline_system,
      styleGuide: bible.style_guide,
      forbiddenRules: bible.forbidden_rules,
      endingDirection: bible.ending_direction,
      compactSummary: bible.compact_summary,
    }).returning();

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

  done();
};

export default plugin;