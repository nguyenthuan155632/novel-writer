import type { FastifyPluginCallback } from 'fastify';
import { getDb } from '@novel/db';
import { AdminMetricsService } from '@novel/core';
import { z } from 'zod';
import { getProviderStatus, setActiveProvider } from '../lib/provider-switcher.ts';

const ProviderBodySchema = z.object({
  provider: z.enum(['opencode', 'openrouter']),
});

const adminRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/admin/metrics', async (_req, reply) => {
    const db = getDb();
    const service = new AdminMetricsService(db);
    const metrics = await service.snapshot();
    return reply.send(metrics);
  });

  app.get('/api/admin/provider', async () => getProviderStatus());

  app.put('/api/admin/provider', async (req) => {
    const body = ProviderBodySchema.parse(req.body);
    return setActiveProvider(body.provider);
  });

  done();
};

export default adminRoute;
