import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import {
  createConnection,
  createRefreshArcSummaryQueue,
  createRefreshSagaSummaryQueue,
  createHighStakesReviewQueue,
  type RefreshArcSummaryJob,
  type RefreshSagaSummaryJob,
  type HighStakesReviewJob,
} from '../queues.js';

let connection: ReturnType<typeof createConnection> | null = null;

function getConnection() {
  if (!connection) {
    connection = createConnection();
  }
  return connection;
}

let refreshArcSummaryQueue: Queue<RefreshArcSummaryJob> | null = null;
let refreshSagaSummaryQueue: Queue<RefreshSagaSummaryJob> | null = null;
let highStakesReviewQueue: Queue<HighStakesReviewJob> | null = null;

export function getRefreshArcSummaryQueue(): Queue<RefreshArcSummaryJob> {
  if (!refreshArcSummaryQueue) {
    refreshArcSummaryQueue = createRefreshArcSummaryQueue(getConnection());
  }
  return refreshArcSummaryQueue;
}

export function getRefreshSagaSummaryQueue(): Queue<RefreshSagaSummaryJob> {
  if (!refreshSagaSummaryQueue) {
    refreshSagaSummaryQueue = createRefreshSagaSummaryQueue(getConnection());
  }
  return refreshSagaSummaryQueue;
}

export function getHighStakesReviewQueue(): Queue<HighStakesReviewJob> {
  if (!highStakesReviewQueue) {
    highStakesReviewQueue = createHighStakesReviewQueue(getConnection());
  }
  return highStakesReviewQueue;
}

export async function enqueueRefreshArcSummary(data: RefreshArcSummaryJob): Promise<string> {
  const queue = getRefreshArcSummaryQueue();
  const jobId = `refresh-arc-${data.storyId}-${data.arcId}-${data.traceId}-${randomUUID()}`;
  const job = await queue.add('refresh-arc-summary', data, {
    jobId,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 86400 * 7 },
  });
  return job.id!;
}

export async function enqueueRefreshSagaSummary(data: RefreshSagaSummaryJob): Promise<string> {
  const queue = getRefreshSagaSummaryQueue();
  const jobId = `refresh-saga-${data.storyId}-${data.sagaId}-${data.traceId}-${randomUUID()}`;
  const job = await queue.add('refresh-saga-summary', data, {
    jobId,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 86400 * 7 },
  });
  return job.id!;
}

export async function enqueueHighStakesReview(data: HighStakesReviewJob): Promise<string> {
  const queue = getHighStakesReviewQueue();
  const jobId = `review-${data.chapterId}-${data.triggerReason}`;
  const job = await queue.add('high-stakes-review', data, {
    jobId,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 86400 * 7 },
  });
  return job.id!;
}
