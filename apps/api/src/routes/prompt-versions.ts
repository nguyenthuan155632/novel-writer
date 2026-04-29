import type { FastifyPluginCallback } from 'fastify';
import { getDb } from '@novel/db';
import { promptVersions } from '@novel/db/schema';
import { eq, asc } from 'drizzle-orm';

const promptVersionsRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/admin/prompt-versions', async (_req, reply) => {
    const db = getDb();
    const rows = await db
      .select({
        id: promptVersions.id,
        agentRole: promptVersions.agentRole,
        version: promptVersions.version,
        active: promptVersions.active,
        createdAt: promptVersions.createdAt,
      })
      .from(promptVersions)
      .orderBy(asc(promptVersions.agentRole), asc(promptVersions.version));
    return reply.send(rows);
  });

  app.get<{ Params: { role: string } }>('/admin/prompt-versions/:role', async (req, reply) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.agentRole, req.params.role))
      .orderBy(asc(promptVersions.version));
    return reply.send(rows);
  });

  done();
};

export default promptVersionsRoute;