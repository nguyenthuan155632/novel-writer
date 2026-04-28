import Fastify from 'fastify';
import logger from './plugins/logger.ts';
import errorHandler from './plugins/error-handler.ts';
import healthRoute from './routes/health.ts';

export function buildServer() {
  const app = Fastify({ logger: false });
  app.register(logger);
  app.register(errorHandler);
  app.register(healthRoute);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  const port = Number(process.env.API_PORT ?? 4000);
  app.listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`api listening on :${port}`);
  });
}