import { Queue, QueueEvents, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

export type GenerateChapterJob = {
  storyId: string;
  chapterNumber: number;
  arcId: string;
  importance?: 'normal' | 'important';
  traceId: string;
  mode?: 'safe' | 'semi_auto' | 'full_auto';
  retryAttempt?: number;
};

export type RefreshArcSummaryJob = {
  storyId: string;
  arcId: string;
  traceId: string;
};

export const QUEUE_NAMES = {
  generateChapter: 'generate-chapter',
  refreshArcSummary: 'refresh-arc-summary',
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