import { Worker } from 'bullmq';
import { createLogger } from '@novel/core/logger';
import { QUEUE_NAMES, createConnection, type GenerateChapterJob, type RefreshArcSummaryJob } from './queues.js';

const log = createLogger('worker');

const connection = createConnection();

const generateChapterWorker = new Worker<GenerateChapterJob>(
  QUEUE_NAMES.generateChapter,
  async (job) => {
    const { runGenerateChapterJob } = await import('./jobs/generate-chapter.js');
    return runGenerateChapterJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { connection, concurrency: 1 }
);

const refreshArcSummaryWorker = new Worker<RefreshArcSummaryJob>(
  QUEUE_NAMES.refreshArcSummary,
  async (job) => {
    const { runRefreshArcSummaryJob } = await import('./jobs/refresh-arc-summary.js');
    return runRefreshArcSummaryJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { connection, concurrency: 1 }
);

generateChapterWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'generate-chapter failed'));
refreshArcSummaryWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'refresh-arc-summary failed'));

log.info('worker started');

const shutdown = async () => {
  log.info('worker shutting down');
  await Promise.all([generateChapterWorker.close(), refreshArcSummaryWorker.close()]);
  await connection.quit();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);