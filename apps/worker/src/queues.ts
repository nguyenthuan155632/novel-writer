import { Queue, QueueEvents, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import type { LlmProviderId, ModelRoutes } from '@novel/core';

export type GenerateChapterJob = {
  storyId: string;
  chapterNumber: number;
  arcId?: string;
  importance?: 'normal' | 'important';
  traceId: string;
  mode?: 'safe' | 'semi_auto' | 'full_auto';
  retryAttempt?: number;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
};

export type RefreshArcSummaryJob = {
  storyId: string;
  arcId: string;
  traceId: string;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
};

export type GenerateBatchJob = {
  batchId: string;
  storyId: string;
  startChapter: number;
  endChapter: number;
  mode: 'safe' | 'semi_auto' | 'full_auto';
  traceId: string;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
};

export type RefreshSagaSummaryJob = {
  storyId: string;
  sagaId: string;
  traceId: string;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
};

export type HighStakesReviewJob = {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  triggerReason: 'arc_end' | 'critical_severity' | 'manual';
  traceId: string;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
};

export const QUEUE_NAMES = {
  generateChapter: 'generate-chapter',
  refreshArcSummary: 'refresh-arc-summary',
  refreshSagaSummary: 'refresh-saga-summary',
  generateBatch: 'generate-batch',
  highStakesReview: 'high-stakes-review',
} as const;

export function createConnection(): IORedis {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function createGenerateChapterQueue(connection: ConnectionOptions): Queue<GenerateChapterJob> {
  return new Queue<GenerateChapterJob>(QUEUE_NAMES.generateChapter, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });
}

export function createGenerateChapterEvents(connection: ConnectionOptions): QueueEvents {
  return new QueueEvents(QUEUE_NAMES.generateChapter, { connection });
}

export function createRefreshArcSummaryQueue(connection: ConnectionOptions): Queue<RefreshArcSummaryJob> {
  return new Queue<RefreshArcSummaryJob>(QUEUE_NAMES.refreshArcSummary, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });
}

export function createRefreshSagaSummaryQueue(connection: ConnectionOptions): Queue<RefreshSagaSummaryJob> {
  return new Queue<RefreshSagaSummaryJob>(QUEUE_NAMES.refreshSagaSummary, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });
}

export function createGenerateBatchQueue(connection: ConnectionOptions): Queue<GenerateBatchJob> {
  return new Queue<GenerateBatchJob>(QUEUE_NAMES.generateBatch, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });
}

export function createHighStakesReviewQueue(connection: ConnectionOptions): Queue<HighStakesReviewJob> {
  return new Queue<HighStakesReviewJob>(QUEUE_NAMES.highStakesReview, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });
}
