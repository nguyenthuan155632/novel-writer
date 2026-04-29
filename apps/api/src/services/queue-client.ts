import { Queue } from 'bullmq';
import IORedis from 'ioredis';

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

export async function enqueueGenerateChapter(data: {
  storyId: string;
  chapterNumber: number;
  mode: string;
}): Promise<{ jobId: string }> {
  const queue = getGenerateChapterQueue();
  const jobId = `gen-${data.storyId}-${data.chapterNumber}`;
  const job = await queue.add('generate-chapter', data, {
    jobId,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 86400 * 7 },
  });
  return { jobId: job.id! };
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