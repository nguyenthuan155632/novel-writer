import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../src/server.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });

describe('pending-updates routes', () => {
  const storyId = '00000000-0000-0000-0000-000000000000';

  it('GET list returns empty for unknown story', async () => {
    const r = await app.inject({ method: 'GET', url: `/api/stories/${storyId}/pending-updates` });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body).pendingUpdates).toEqual([]);
  });

  it('POST approve returns 404 for nonexistent update', async () => {
    const updateId = '00000000-0000-0000-0000-000000000000';
    const r = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/pending-updates/${updateId}/approve`,
      payload: {},
    });
    expect(r.statusCode).toBe(404);
  });

  it('POST reject returns 404 for nonexistent update', async () => {
    const updateId = '00000000-0000-0000-0000-000000000000';
    const r = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/pending-updates/${updateId}/reject`,
      payload: { reason: 'duplicate' },
    });
    expect(r.statusCode).toBe(404);
  });
});