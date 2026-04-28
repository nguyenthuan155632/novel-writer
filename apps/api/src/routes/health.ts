import type { FastifyPluginCallback } from 'fastify';

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));
  done();
};

export default plugin;