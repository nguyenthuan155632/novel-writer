import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      req.log.warn({ issues: err.issues }, 'validation error');
      return reply.status(400).send({ error: 'validation_error', issues: err.issues });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.status(500).send({ error: 'internal_error', message: err.message });
  });
  done();
};

export default fp(plugin, { name: 'error-handler' });