import Fastify from 'fastify';
import logger from './plugins/logger.ts';
import errorHandler from './plugins/error-handler.ts';
import healthRoute from './routes/health.ts';
import storiesRoute from './routes/stories.ts';
import bibleRoute from './routes/bible.ts';
import chaptersRoute from './routes/chapters.ts';
import pendingUpdatesRoute from './routes/pending-updates.ts';

export function buildServer() {
  const app = Fastify({ logger: false });
  app.register(logger);
  app.register(errorHandler);
  app.register(healthRoute);
  app.register(storiesRoute);
  app.register(bibleRoute);
  app.register(chaptersRoute);
  app.register(pendingUpdatesRoute);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  const port = Number(process.env.API_PORT ?? 4000);
  app.listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`api listening on :${port}`);
  });
}