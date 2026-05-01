import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { stories, storySettings } from '@novel/db/schema';
import { eq, desc } from 'drizzle-orm';
import { GenreSlugSchema, PersonalitySlugSchema, StoryOptionsSchema } from '@novel/core';

const CreateStorySchema = z.object({
  title: z.string().min(1).max(200),
  premise: z.string().min(20).max(5000),
  genre: GenreSlugSchema.default('tien_hiep'),
  mainCharacterPersonality: PersonalitySlugSchema.default('tram_on'),
  tone: z.string().nullish(),
  storyOptions: StoryOptionsSchema.default({}),
  targetChapterCount: z.number().int().min(1).max(10000).default(1000),
});

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.post('/api/stories', async (req, reply) => {
    const db = getDb();
    let body: z.infer<typeof CreateStorySchema>;
    try {
      body = CreateStorySchema.parse(req.body);
    } catch (e) {
      return reply.status(400).send({ error: 'validation_failed', details: (e as Error).message });
    }

    const [row] = await db.insert(stories).values({
      title: body.title,
      premise: body.premise,
      genre: body.genre,
      mainCharacterPersonality: body.mainCharacterPersonality,
      tone: body.tone ?? null,
      targetChapterCount: body.targetChapterCount,
    }).returning();

    if (!row) return reply.status(500).send({ error: 'insert_failed' });

    await db.insert(storySettings).values({
      storyId: row.id,
      overrides: { storyOptions: body.storyOptions },
      updatedAt: new Date(),
    });

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

  const PatchStorySchema = z.object({
    genre: GenreSlugSchema.optional(),
    mainCharacterPersonality: PersonalitySlugSchema.optional(),
    tone: z.string().nullish(),
    storyOptions: StoryOptionsSchema.partial().optional(),
  }).refine(o => Object.keys(o).length > 0, { message: 'at least one field required' });

  app.patch<{ Params: { id: string } }>('/api/stories/:id', async (req, reply) => {
    const db = getDb();
    const id = z.string().uuid().parse(req.params.id);

    let body: z.infer<typeof PatchStorySchema>;
    try {
      body = PatchStorySchema.parse(req.body);
    } catch (e) {
      return reply.status(400).send({ error: 'validation_failed', details: (e as Error).message });
    }

    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    if (!story) return reply.status(404).send({ error: 'not_found' });

    if (body.genre && body.genre !== story.genre && story.genreLockedAt) {
      return reply.status(409).send({
        error: 'genre_locked',
        message: 'Genre đã được khoá vì bible đã sinh. Không thể đổi.',
      });
    }

    const storyPatch: Partial<typeof stories.$inferInsert> = { updatedAt: new Date() };
    if (body.genre !== undefined) storyPatch.genre = body.genre;
    if (body.mainCharacterPersonality !== undefined) storyPatch.mainCharacterPersonality = body.mainCharacterPersonality;
    if (body.tone !== undefined) storyPatch.tone = body.tone;

    if (Object.keys(storyPatch).length > 1) {
      await db.update(stories).set(storyPatch).where(eq(stories.id, id));
    }

    if (body.storyOptions) {
      const [existing] = await db.select().from(storySettings).where(eq(storySettings.storyId, id));
      const prev = (existing?.overrides as Record<string, unknown> | undefined) ?? {};
      const prevOpts = (prev.storyOptions as Record<string, unknown> | undefined) ?? {};
      const merged = { ...prevOpts, ...body.storyOptions };
      const next = { ...prev, storyOptions: merged };
      await db.insert(storySettings).values({ storyId: id, overrides: next, updatedAt: new Date() })
        .onConflictDoUpdate({ target: storySettings.storyId, set: { overrides: next, updatedAt: new Date() } });
    }

    return reply.send({ ok: true });
  });

  done();
};

export default plugin;
