import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../src/server.ts';
import { getDb } from '@novel/db';
import { canonFacts, chapters, pendingCanonUpdates, stories } from '@novel/db/schema';
import { eq } from 'drizzle-orm';

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

  it('POST approve applies a pending canon fact before marking it resolved', async () => {
    const db = getDb(TEST_DB);
    const realStoryId = randomUUID();
    await db.insert(stories).values({
      id: realStoryId,
      title: 'Pending Apply Story',
      premise: 'A story used to verify pending canon approval applies changes.',
    });
    const [chapter] = await db.insert(chapters).values({
      storyId: realStoryId,
      chapterNumber: 1,
      status: 'paused_pending_updates',
    }).returning({ id: chapters.id });
    const [pending] = await db.insert(pendingCanonUpdates).values({
      storyId: realStoryId,
      chapterId: chapter!.id,
      updateType: 'create',
      targetTable: 'canon_facts',
      targetId: null,
      payload: { topic: 'bloodline', fact: 'Lam Trach owns the Azure Flame bloodline.', importance: 'high' },
      resolution: 'pending',
    }).returning({ id: pendingCanonUpdates.id });

    const r = await app.inject({
      method: 'POST',
      url: `/api/stories/${realStoryId}/pending-updates/${pending!.id}/approve`,
      payload: {},
    });

    expect(r.statusCode).toBe(200);
    const facts = await db.select().from(canonFacts).where(eq(canonFacts.storyId, realStoryId));
    expect(facts).toHaveLength(1);
    expect(facts[0]!.fact).toBe('Lam Trach owns the Azure Flame bloodline.');
    expect(JSON.parse(r.body).pendingUpdate.resolution).toBe('approved');

    await db.delete(stories).where(eq(stories.id, realStoryId));
  });
});
