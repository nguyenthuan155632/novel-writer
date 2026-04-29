import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@novel/db';
import { chapters, stories } from '@novel/db/schema';
import { eq } from 'drizzle-orm';

const mockEnqueueGenerateExport = vi.fn().mockResolvedValue('export-job-1');

vi.mock('../../src/services/queue-client.ts', () => ({
  enqueueGenerateExport: (...args: unknown[]) => mockEnqueueGenerateExport(...args),
}));

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;

const { buildServer } = await import('../../src/server.ts');
const app = buildServer();

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });
beforeEach(() => {
  mockEnqueueGenerateExport.mockReset();
  mockEnqueueGenerateExport.mockResolvedValue('export-job-1');
});

describe('exports routes', () => {
  it('queues large exports instead of returning a placeholder response', async () => {
    const db = getDb(TEST_DB);
    const storyId = randomUUID();
    await db.insert(stories).values({
      id: storyId,
      title: 'Large Export Story',
      premise: 'A story with enough completed chapters to require async export.',
    });
    await db.insert(chapters).values(Array.from({ length: 201 }, (_, i) => ({
      storyId,
      chapterNumber: i + 1,
      title: `Chapter ${i + 1}`,
      content: `Content ${i + 1}`,
      status: 'completed',
    })));

    const r = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/exports`,
      payload: { format: 'epub' },
    });

    expect(r.statusCode).toBe(202);
    expect(JSON.parse(r.body)).toEqual({ status: 'queued', jobId: 'export-job-1' });
    expect(mockEnqueueGenerateExport).toHaveBeenCalledWith({ storyId, format: 'epub' });

    await db.delete(stories).where(eq(stories.id, storyId));
  });
});
