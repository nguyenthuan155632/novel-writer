import '@novel/core/load-env';
import { Worker } from 'bullmq';
import { createLogger } from '@novel/core/logger';
import { QUEUE_NAMES, createConnection, type GenerateChapterJob, type RefreshArcSummaryJob, type RefreshSagaSummaryJob, type GenerateBatchJob, type HighStakesReviewJob } from './queues.js';
import { GENERATE_EXPORT_QUEUE_NAME, type GenerateExportJobData } from './jobs/generate-export.js';

const log = createLogger('worker');

const connection = createConnection();

/** Default BullMQ lock is 30s and maxStalledCount is 1; long LLM pipelines + rate-limit retries can exceed that and trigger UnrecoverableError "job stalled more than allowable limit". */
const longJobWorkerSettings = {
  connection: connection as any,
  lockDuration: 600_000,
  maxStalledCount: 5,
} as const;

const generateChapterWorker = new Worker<GenerateChapterJob>(
  QUEUE_NAMES.generateChapter,
  async (job) => {
    const { runGenerateChapterJob } = await import('./jobs/generate-chapter.js');
    return runGenerateChapterJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { ...longJobWorkerSettings, concurrency: 1 }
);

const refreshArcSummaryWorker = new Worker<RefreshArcSummaryJob>(
  QUEUE_NAMES.refreshArcSummary,
  async (job) => {
    const { runRefreshArcSummaryJob } = await import('./jobs/refresh-arc-summary.js');
    return runRefreshArcSummaryJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { ...longJobWorkerSettings, concurrency: 1 }
);

const generateBatchWorker = new Worker<GenerateBatchJob>(
  QUEUE_NAMES.generateBatch,
  async (job) => {
    const { runGenerateBatchJob } = await import('./jobs/generate-batch.js');
    return runGenerateBatchJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { ...longJobWorkerSettings, concurrency: 1 }
);

const refreshSagaSummaryWorker = new Worker<RefreshSagaSummaryJob>(
  QUEUE_NAMES.refreshSagaSummary,
  async (job) => {
    const { runRefreshSagaSummaryJob } = await import('./jobs/refresh-saga-summary.js');
    return runRefreshSagaSummaryJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { ...longJobWorkerSettings, concurrency: 1 }
);

const highStakesReviewWorker = new Worker<HighStakesReviewJob>(
  QUEUE_NAMES.highStakesReview,
  async (job) => {
    const { runHighStakesReviewJob } = await import('./jobs/high-stakes-review.js');
    return runHighStakesReviewJob(job.data, { logger: log.child({ jobId: job.id, traceId: job.data.traceId }) });
  },
  { ...longJobWorkerSettings, concurrency: 1 }
);

const generateExportWorker = new Worker<GenerateExportJobData>(
  GENERATE_EXPORT_QUEUE_NAME,
  async (job) => {
    const { runGenerateExportJob } = await import('./jobs/generate-export.js');
    return runGenerateExportJob(job.data, { logger: log.child({ jobId: job.id, storyId: job.data.storyId, format: job.data.format }) });
  },
  { ...longJobWorkerSettings, concurrency: 2 }
);

generateChapterWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'generate-chapter failed'));
refreshArcSummaryWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'refresh-arc-summary failed'));
refreshSagaSummaryWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'refresh-saga-summary failed'));
generateBatchWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'generate-batch failed'));
highStakesReviewWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'high-stakes-review failed'));
generateExportWorker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'generate-export failed'));

log.info('worker started');

// Stale job detector: periodically reset chapters stuck in 'generating' to 'failed'
const STALE_DETECTOR_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const POST_FLIGHT_AUDIT_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
const staleDetectorInterval = setInterval(async () => {
  try {
    const { getDb } = await import('@novel/db');
    const { resetStaleGeneratingChapters } = await import('./services/stale-job-detector.js');
    const { recordStaleJobResets } = await import('./services/metrics.js');
    const resetCount = await resetStaleGeneratingChapters({ db: getDb(), logger: log });
    if (resetCount > 0) {
      recordStaleJobResets(resetCount, log);
      log.info({ resetCount }, 'stale job detector completed');
    }
  } catch (err) {
    log.error({ err }, 'stale job detector error');
  }
}, STALE_DETECTOR_INTERVAL_MS);

const postFlightAuditInterval = setInterval(async () => {
  const hour = new Date().getUTCHours();
  if (hour !== 4) return;
  try {
    const { getDb } = await import('@novel/db');
    const { runPostFlightAudit } = await import('./services/post-flight-audit.js');
    const result = await runPostFlightAudit({ db: getDb(), logger: log });
    log.info({ result }, 'post-flight audit completed');
  } catch (err) {
    log.error({ err }, 'post-flight audit error');
  }
}, POST_FLIGHT_AUDIT_INTERVAL_MS);

const shutdown = async () => {
  log.info('worker shutting down');
  clearInterval(staleDetectorInterval);
  clearInterval(postFlightAuditInterval);
  await Promise.all([generateChapterWorker.close(), refreshArcSummaryWorker.close(), refreshSagaSummaryWorker.close(), generateBatchWorker.close(), highStakesReviewWorker.close(), generateExportWorker.close()]);
  await connection.quit();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);