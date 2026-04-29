import type { FastifyPluginCallback } from 'fastify';
import { getDb } from '@novel/db';
import { AdminMetricsService } from '@novel/core';

const adminRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/admin/metrics', async (_req, reply) => {
    const db = getDb();
    const service = new AdminMetricsService(db);
    const metrics = await service.snapshot();
    return reply.send(metrics);
  });

  done();
};

export default adminRoute;
