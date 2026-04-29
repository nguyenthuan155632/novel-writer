import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@novel/db';
import { chapters, stories } from '@novel/db/schema';
import { eq } from 'drizzle-orm';

const mockEnqueueHighStakesReview = vi.fn().mockResolvedValue('review-job-1');

vi.mock('../../src/services/queue-client.ts', () => ({
  enqueueHighStakesReview: (...args: unknown[]) => mockEnqueueHighStakesReview(...args),
}));

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;

const { buildServer } = await import('../../src/server.ts');
const app = buildServer();

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });
beforeEach(() => {
  mockEnqueueHighStakesReview.mockReset();
  mockEnqueueHighStakesReview.mockResolvedValue('review-job-1');
});

describe('reviews routes', () => {
  it('POST trigger enqueues a high-stakes review job for the chapter', async () => {
    const db = getDb(TEST_DB);
    const storyId = randomUUID();
    await db.insert(stories).values({
      id: storyId,
      title: 'Review Story',
      premise: 'A story for high-stakes review route testing.',
    });
    const [chapter] = await db.insert(chapters).values({
      storyId,
      chapterNumber: 4,
      status: 'completed',
    }).returning({ id: chapters.id });

    const r = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/reviews/trigger`,
      payload: { chapterId: chapter!.id },
    });

    expect(r.statusCode).toBe(202);
    expect(JSON.parse(r.body)).toEqual(expect.objectContaining({ jobId: 'review-job-1' }));
    expect(mockEnqueueHighStakesReview).toHaveBeenCalledWith(expect.objectContaining({
      storyId,
      chapterId: chapter!.id,
      chapterNumber: 4,
      triggerReason: 'manual',
    }));

    await db.delete(stories).where(eq(stories.id, storyId));
  });
});
