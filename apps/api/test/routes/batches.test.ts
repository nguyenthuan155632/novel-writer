import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../src/server.ts';
import { getDb } from '@novel/db';
import { arcs, batches, sagas, stories, storyBibles } from '@novel/db/schema';
import { eq } from 'drizzle-orm';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;

const app = buildServer();

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => {});

async function createStoryWithPlan(): Promise<string> {
  const db = getDb(TEST_DB);
  const storyId = randomUUID();
  await db.insert(stories).values({
    id: storyId,
    title: `Story ${storyId}`,
    premise: 'Batch route test story.',
  });
  await db.insert(storyBibles).values({
    storyId,
    worldRules: 'world rules',
    powerSystem: 'cultivation system',
    powerSystemKind: 'cultivation',
    cultivationSystem: 'cultivation',
    bloodlineSystem: 'bloodline',
    styleGuide: 'style',
    forbiddenRules: 'forbidden',
  });
  const [saga] = await db.insert(sagas).values({
    storyId,
    sagaNumber: 1,
    title: 'Saga',
    startChapter: 1,
    endChapter: 20,
  }).returning({ id: sagas.id });
  await db.insert(arcs).values({
    storyId,
    sagaId: saga!.id,
    arcNumber: 1,
    title: 'Arc',
    startChapter: 1,
    endChapter: 10,
  });
  return storyId;
}

describe('batches routes', () => {
  it('POST /api/admin/batches/:batchId/resume resumes from checkpoint', async () => {
    const db = getDb(TEST_DB);
    const storyId = await createStoryWithPlan();
    const [batch] = await db.insert(batches).values({
      storyId,
      startChapter: 1,
      endChapter: 5,
      mode: 'semi_auto',
      status: 'paused',
      completedChapters: 2,
      checkpointChapter: 2,
    }).returning();

    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/batches/${batch!.id}/resume`,
    });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual(expect.objectContaining({
      resumeFromChapter: 3,
    }));

    await db.delete(stories).where(eq(stories.id, storyId));
  });
});
