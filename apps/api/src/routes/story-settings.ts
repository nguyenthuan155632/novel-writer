import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { storySettings } from '@novel/db/schema';
import { eq } from 'drizzle-orm';

const PutSettingsSchema = z.object({
  overrides: z
    .record(z.unknown())
    .refine((v) => !Array.isArray(v), { message: 'overrides must be an object, not an array' }),
});

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.get<{ Params: { storyId: string } }>(
    '/api/stories/:storyId/settings',
    async (req, reply) => {
      const db = getDb();
      const storyId = z.string().uuid().parse(req.params.storyId);
      const [row] = await db
        .select()
        .from(storySettings)
        .where(eq(storySettings.storyId, storyId));
      return reply.send({ overrides: row?.overrides ?? {} });
    },
  );

  app.put<{ Params: { storyId: string } }>(
    '/api/stories/:storyId/settings',
    async (req, reply) => {
      const db = getDb();
      const storyId = z.string().uuid().parse(req.params.storyId);

      let body: { overrides: Record<string, unknown> };
      try {
        body = PutSettingsSchema.parse(req.body);
      } catch (e) {
        return reply.status(400).send({ error: 'validation_failed', details: (e as Error).message });
      }

      await db
        .insert(storySettings)
        .values({
          storyId,
          overrides: body.overrides,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: storySettings.storyId,
          set: {
            overrides: body.overrides,
            updatedAt: new Date(),
          },
        });

      return reply.send({ ok: true });
    },
  );

  done();
};

export default plugin;
