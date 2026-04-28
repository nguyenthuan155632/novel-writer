import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { rootLogger } from '@novel/core/logger';
import { newTraceId, withTrace } from '@novel/core/trace';

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.addHook('onRequest', (req, _reply, hookDone) => {
    const traceId = (req.headers['x-trace-id'] as string | undefined) ?? newTraceId();
    (req as unknown as { traceId: string }).traceId = traceId;
    withTrace({ traceId }, () => {
      req.log = rootLogger.child({ traceId, method: req.method, url: req.url });
      hookDone();
    });
  });
  done();
};

export default fp(plugin, { name: 'logger' });