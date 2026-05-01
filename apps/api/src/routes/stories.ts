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

  done();
};

export default plugin;
