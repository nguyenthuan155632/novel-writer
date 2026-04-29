import { Worker } from 'bullmq';
import { createLogger } from '@novel/core/logger';
import { QUEUE_NAMES, createConnection, type GenerateChapterJob, type RefreshArcSummaryJob, type RefreshSagaSummaryJob, type GenerateBatchJob, type HighStakesReviewJob } from './queues.js';

const log = createLogger('worker');

const connection = createConnection();

const generateChapterWorker = new Worker<GenerateChapterJob>(
  QUEUE_NAMES.generateChapter,
  async (job) => {
    const { runGenerateChapterJob } = await import('./jobs/generate-chapter.js');
    return runGenerateChapterJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { connection: connection as any, concurrency: 1 }
);

const refreshArcSummaryWorker = new Worker<RefreshArcSummaryJob>(
  QUEUE_NAMES.refreshArcSummary,
  async (job) => {
    const { runRefreshArcSummaryJob } = await import('./jobs/refresh-arc-summary.js');
    return runRefreshArcSummaryJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { connection: connection as any, concurrency: 1 }
);

const generateBatchWorker = new Worker<GenerateBatchJob>(
  QUEUE_NAMES.generateBatch,
  async (job) => {
    const { runGenerateBatchJob } = await import('./jobs/generate-batch.js');
    return runGenerateBatchJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { connection: connection as any, concurrency: 1 }
);

const refreshSagaSummaryWorker = new Worker<RefreshSagaSummaryJob>(
  QUEUE_NAMES.refreshSagaSummary,
  async (job) => {
    const { runRefreshSagaSummaryJob } = await import('./jobs/refresh-saga-summary.js');
    return runRefreshSagaSummaryJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { connection: connection as any, concurrency: 1 }
);

const highStakesReviewWorker = new Worker<HighStakesReviewJob>(
  QUEUE_NAMES.highStakesReview,
  async (job) => {
    log.info({ jobId: job.id, data: job.data }, 'high-stakes-review job received (placeholder)');
    return { status: 'queued' };
  },
  { connection: connection as any, concurrency: 1 }
);

generateChapterWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'generate-chapter failed'));
refreshArcSummaryWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'refresh-arc-summary failed'));
refreshSagaSummaryWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'refresh-saga-summary failed'));
generateBatchWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'generate-batch failed'));
highStakesReviewWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'high-stakes-review failed'));

log.info('worker started');

const shutdown = async () => {
  log.info('worker shutting down');
  await Promise.all([generateChapterWorker.close(), refreshArcSummaryWorker.close(), refreshSagaSummaryWorker.close(), generateBatchWorker.close(), highStakesReviewWorker.close()]);
  await connection.quit();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);