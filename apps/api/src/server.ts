import '@novel/core/load-env';
import Fastify from 'fastify';
import logger from './plugins/logger.ts';
import errorHandler from './plugins/error-handler.ts';
import healthRoute from './routes/health.ts';
import storiesRoute from './routes/stories.ts';
import bibleRoute from './routes/bible.ts';
import chaptersRoute from './routes/chapters.ts';
import pendingUpdatesRoute from './routes/pending-updates.ts';
import seedsRoute from './routes/seeds.ts';
import sagasRoute from './routes/sagas.ts';
import arcsRoute from './routes/arcs.ts';
import costsRoute from './routes/costs.ts';
import reviewsRoute from './routes/reviews.ts';
import timelineRoute from './routes/timeline.ts';
import canonFactsRoute from './routes/canon-facts.ts';
import batchesRoute from './routes/batches.ts';

export function buildServer() {
  const app = Fastify({ logger: false });
  app.register(logger);
  app.register(errorHandler);
  app.register(healthRoute);
  app.register(storiesRoute);
  app.register(bibleRoute);
  app.register(chaptersRoute);
  app.register(pendingUpdatesRoute);
  app.register(seedsRoute);
  app.register(sagasRoute);
  app.register(arcsRoute);
  app.register(costsRoute);
  app.register(reviewsRoute);
  app.register(timelineRoute);
  app.register(canonFactsRoute);
  app.register(batchesRoute);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  const port = Number(process.env.API_PORT ?? 4000);
  app.listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`api listening on :${port}`);
  });
}