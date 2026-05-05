import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { LlmProviderId, ModelRoutes } from '@novel/core';

let connection: IORedis | null = null;
let generateChapterQueue: Queue | null = null;

export function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export function getGenerateChapterQueue(): Queue {
  if (!generateChapterQueue) {
    generateChapterQueue = new Queue('generate-chapter', {
      connection: getConnection(),
    });
  }
  return generateChapterQueue;
}

let generateBatchQueue: Queue | null = null;
let highStakesReviewQueue: Queue | null = null;
let generateExportQueue: Queue | null = null;

export function getGenerateBatchQueue(): Queue {
  if (!generateBatchQueue) {
    generateBatchQueue = new Queue('generate-batch', {
      connection: getConnection(),
    });
  }
  return generateBatchQueue;
}

export function getHighStakesReviewQueue(): Queue {
  if (!highStakesReviewQueue) {
    highStakesReviewQueue = new Queue('high-stakes-review', {
      connection: getConnection(),
    });
  }
  return highStakesReviewQueue;
}

export function getGenerateExportQueue(): Queue {
  if (!generateExportQueue) {
    generateExportQueue = new Queue('generate-export', {
      connection: getConnection(),
    });
  }
  return generateExportQueue;
}

export async function enqueueGenerateChapter(data: {
  storyId: string;
  chapterNumber: number;
  mode: string;
  traceId: string;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
}): Promise<{ jobId: string }> {
  const queue = getGenerateChapterQueue();
  const jobId = `gen-${data.storyId}-${data.chapterNumber}`;
  const existingJob = await queue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();
    if (state === 'failed' || state === 'completed') {
      await existingJob.remove();
    } else {
      // Keep generation idempotent while a run is still queued/running.
      return { jobId };
    }
  }

  const job = await queue.add('generate-chapter', data, {
    jobId,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 86400 * 7 },
  });
  return { jobId: job.id! };
}

export async function enqueueHighStakesReview(data: {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  triggerReason:
    | 'arc_boundary'
    | 'arc_climax'
    | 'critical_severity'
    | 'breakthrough_or_death'
    | 'packet_high_stakes'
    | 'manual';
  traceId: string;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
}): Promise<string> {
  const queue = getHighStakesReviewQueue();
  const jobId = `review-${data.chapterId}-${data.triggerReason}`;
  const job = await queue.add('high-stakes-review', data, {
    jobId,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 86400 * 7 },
  });
  return job.id!;
}

export async function enqueueGenerateExport(data: {
  storyId: string;
  format: 'markdown' | 'epub';
}): Promise<string> {
  const queue = getGenerateExportQueue();
  const jobId = `export-${data.storyId}-${data.format}`;
  const job = await queue.add('generate-export', data, {
    jobId,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 86400 * 7 },
  });
  return job.id!;
}

export async function getGenerateChapterStatus(
  storyId: string,
  chapterNumber: number,
): Promise<{ jobId: string; state: string; progress: unknown } | null> {
  const queue = getGenerateChapterQueue();
  const jobId = `gen-${storyId}-${chapterNumber}`;
  const job = await queue.getJob(jobId);
  if (!job) return null;
  return { jobId: job.id!, state: await job.getState(), progress: job.progress };
}
