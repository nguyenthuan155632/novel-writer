import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildServer } from '../../src/server.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;

const mockEnqueue = vi.fn().mockResolvedValue({ jobId: 'gen-story-1' });
const mockGetStatus = vi.fn().mockResolvedValue(null);
vi.mock('../../src/services/queue-client.js', () => ({
  enqueueGenerateChapter: (...args: unknown[]) => mockEnqueue(...args),
  getGenerateChapterStatus: (...args: unknown[]) => mockGetStatus(...args),
}));

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });

describe('chapters routes', () => {
  it('GET /api/stories/:storyId/chapters returns empty list for unknown story', async () => {
    const storyId = '00000000-0000-0000-0000-000000000000';
    const r = await app.inject({ method: 'GET', url: `/api/stories/${storyId}/chapters` });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body).chapters).toEqual([]);
  });

  it('GET /api/stories/:storyId/chapters/:chapterNumber returns 404 for missing chapter', async () => {
    const storyId = '00000000-0000-0000-0000-000000000000';
    const r = await app.inject({ method: 'GET', url: `/api/stories/${storyId}/chapters/1` });
    expect(r.statusCode).toBe(404);
  });

  it('POST /api/stories/:storyId/chapters/generate enqueues job', async () => {
    const storyId = '00000000-0000-0000-0000-000000000000';
    mockEnqueue.mockResolvedValueOnce({ jobId: `gen-${storyId}-1` });
    const r = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/chapters/generate`,
      payload: { chapterNumber: 1, mode: 'safe' },
    });
    expect(r.statusCode).toBe(202);
    const body = JSON.parse(r.body);
    expect(body.jobId).toBe(`gen-${storyId}-1`);
    expect(body.storyId).toBe(storyId);
    expect(body.chapterNumber).toBe(1);
    expect(mockEnqueue).toHaveBeenCalledWith({
      storyId,
      chapterNumber: 1,
      mode: 'safe',
    });
  });

  it('POST /api/stories/:storyId/chapters/generate rejects invalid mode', async () => {
    const storyId = '00000000-0000-0000-0000-000000000000';
    const r = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/chapters/generate`,
      payload: { chapterNumber: 1, mode: 'invalid' },
    });
    expect(r.statusCode).toBe(400);
  });

  it('GET /api/stories/:storyId/chapters/:chapterNumber/status returns status', async () => {
    const storyId = '00000000-0000-0000-0000-000000000000';
    mockGetStatus.mockResolvedValueOnce({
      jobId: `gen-${storyId}-1`,
      state: 'waiting',
      progress: 0,
    });
    const r = await app.inject({ method: 'GET', url: `/api/stories/${storyId}/chapters/1/status` });
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.state).toBe('waiting');
    expect(body.jobId).toBe(`gen-${storyId}-1`);
  });

  it('GET /api/stories/:storyId/chapters/:chapterNumber/status returns 404 when no job', async () => {
    const storyId = '00000000-0000-0000-0000-000000000000';
    mockGetStatus.mockResolvedValueOnce(null);
    const r = await app.inject({ method: 'GET', url: `/api/stories/${storyId}/chapters/1/status` });
    expect(r.statusCode).toBe(404);
  });
});