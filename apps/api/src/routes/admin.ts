import type { FastifyPluginCallback } from 'fastify';
import { getDb } from '@novel/db';
import { AdminMetricsService, getModelStatus, MODEL_OPTIONS, setModelRoutes } from '@novel/core';
import { z } from 'zod';
import { getProviderStatus, setActiveProvider } from '../lib/provider-switcher.ts';

const ProviderBodySchema = z.object({
  provider: z.enum(['opencode', 'openrouter', 'ollama']),
});

const ModelRoutesSchema = z.object({
  routes: z.object(
    Object.fromEntries(
      MODEL_OPTIONS.map((option) => [option.role, z.string().trim().min(1).optional()]),
    ) as Record<(typeof MODEL_OPTIONS)[number]['role'], z.ZodOptional<z.ZodString>>,
  ).partial(),
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

  app.get('/api/admin/models', async () => getModelStatus());

  app.put('/api/admin/models', async (req) => {
    const body = ModelRoutesSchema.parse(req.body);
    return setModelRoutes(body.routes);
  });

  done();
};

export default adminRoute;
