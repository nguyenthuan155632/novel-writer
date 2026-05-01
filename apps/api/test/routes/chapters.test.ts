import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildServer } from '../../src/server.ts';
import { getDb } from '@novel/db';
import {
  arcs,
  canonFacts,
  chapters,
  openThreads,
  sagas,
  stories,
  storyBibles,
  timelineEvents,
} from '@novel/db/schema';
import { eq } from 'drizzle-orm';
import {
  resetActiveProviderForTests,
  setActiveProvider,
  setModelRoutesForActiveProvider,
} from '../../src/lib/provider-switcher.ts';

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
beforeEach(async () => {
  mockEnqueue.mockReset();
  mockEnqueue.mockResolvedValue({ jobId: 'gen-story-1' });
  mockGetStatus.mockReset();
  mockGetStatus.mockResolvedValue(null);
  await resetActiveProviderForTests();
});

async function createPlannedStory(chapterNumber = 1): Promise<string> {
  const db = getDb(TEST_DB);
  const storyId = randomUUID();
  await db.insert(stories).values({
    id: storyId,
    title: `Story ${storyId}`,
    premise: 'A planned story premise for chapter generation route testing.',
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
    sagaNumber: 0,
    title: 'Main Saga',
    startChapter: 1,
    endChapter: 20,
  }).returning({ id: sagas.id });
  await db.insert(arcs).values({
    storyId,
    sagaId: saga!.id,
    arcNumber: 0,
    title: 'Opening Arc',
    startChapter: 1,
    endChapter: 10,
  });
  expect(chapterNumber).toBeGreaterThanOrEqual(1);
  return storyId;
}

async function createChapter(
  storyId: string,
  chapterNumber: number,
  overrides?: Partial<typeof chapters.$inferInsert>,
): Promise<string> {
  const db = getDb(TEST_DB);
  const [row] = await db
    .insert(chapters)
    .values({
      storyId,
      chapterNumber,
      title: `Chapter ${chapterNumber}`,
      content: `Content for chapter ${chapterNumber}`,
      status: 'draft',
      wordCount: 100,
      ...overrides,
    })
    .returning({ id: chapters.id });
  return row!.id;
}

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
    const storyId = await createPlannedStory();
    await setActiveProvider('openrouter');
    await setModelRoutesForActiveProvider({ writer: 'google/gemini-2.5-flash' });
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
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({
      storyId,
      chapterNumber: 1,
      mode: 'safe',
      traceId: expect.any(String),
      llmProvider: 'openrouter',
      modelRoutes: expect.objectContaining({ writer: 'google/gemini-2.5-flash' }),
    }));

    await getDb(TEST_DB).delete(stories).where(eq(stories.id, storyId));
  });

  it('POST /api/stories/:storyId/chapters/generate snapshots provider-specific routes', async () => {
    const storyId = await createPlannedStory();
    await setActiveProvider('openrouter');
    await setModelRoutesForActiveProvider({ writer: 'openrouter/writer-v1' });
    await setActiveProvider('ollama');
    await setModelRoutesForActiveProvider({ writer: 'ollama/writer-local' });

    await setActiveProvider('openrouter');
    const firstRun = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/chapters/generate`,
      payload: { chapterNumber: 1, mode: 'safe' },
    });
    expect(firstRun.statusCode).toBe(202);
    expect(mockEnqueue).toHaveBeenNthCalledWith(1, expect.objectContaining({
      storyId,
      chapterNumber: 1,
      traceId: expect.any(String),
      llmProvider: 'openrouter',
      modelRoutes: expect.objectContaining({ writer: 'openrouter/writer-v1' }),
    }));

    await setActiveProvider('ollama');
    const secondRun = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/chapters/generate`,
      payload: { chapterNumber: 2, mode: 'safe' },
    });
    expect(secondRun.statusCode).toBe(202);
    expect(mockEnqueue).toHaveBeenNthCalledWith(2, expect.objectContaining({
      storyId,
      chapterNumber: 2,
      traceId: expect.any(String),
      llmProvider: 'ollama',
      modelRoutes: expect.objectContaining({ writer: 'ollama/writer-local' }),
    }));

    await getDb(TEST_DB).delete(stories).where(eq(stories.id, storyId));
  });

  it('POST /api/stories/:storyId/chapters/generate returns planning_required before enqueueing when saga and arc are missing', async () => {
    const db = getDb(TEST_DB);
    const storyId = randomUUID();
    await db.insert(stories).values({
      id: storyId,
      title: 'Unplanned Story',
      premise: 'A story with a bible but no saga or arc planning yet.',
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

    const r = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/chapters/generate`,
      payload: { chapterNumber: 1, mode: 'safe' },
    });

    expect(r.statusCode).toBe(409);
    expect(JSON.parse(r.body)).toEqual(expect.objectContaining({
      error: 'planning_required',
      missing: ['saga', 'arc'],
    }));
    expect(mockEnqueue).not.toHaveBeenCalled();

    await db.delete(stories).where(eq(stories.id, storyId));
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

  it('DELETE /api/stories/:storyId/chapters/:chapterNumber deletes the latest chapter', async () => {
    const storyId = await createPlannedStory();
    await createChapter(storyId, 1);
    await createChapter(storyId, 2);

    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/2`,
    });

    expect(r.statusCode).toBe(204);

    const db = getDb(TEST_DB);
    const remaining = await db
      .select()
      .from(chapters)
      .where(eq(chapters.storyId, storyId));
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.chapterNumber).toBe(1);

    await db.delete(stories).where(eq(stories.id, storyId));
  });

  it('DELETE returns 400 when chapter is not the latest', async () => {
    const storyId = await createPlannedStory();
    await createChapter(storyId, 1);
    await createChapter(storyId, 2);

    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/1`,
    });

    expect(r.statusCode).toBe(400);
    expect(JSON.parse(r.body).error).toBe('only_latest_chapter_can_be_deleted');

    const db = getDb(TEST_DB);
    await db.delete(stories).where(eq(stories.id, storyId));
  });

  it('DELETE returns 404 for missing chapter', async () => {
    const storyId = '00000000-0000-0000-0000-000000000000';
    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/99`,
    });

    expect(r.statusCode).toBe(404);
    expect(JSON.parse(r.body).error).toBe('chapter_not_found');
  });

  it('DELETE returns 409 when chapter is generating', async () => {
    const storyId = await createPlannedStory();
    await createChapter(storyId, 1, { status: 'generating' });

    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/1`,
    });

    expect(r.statusCode).toBe(409);
    expect(JSON.parse(r.body).error).toBe('chapter_is_generating');

    const db = getDb(TEST_DB);
    await db.delete(stories).where(eq(stories.id, storyId));
  });

  it('DELETE cleans up timeline_events, open_threads, and canon_facts', async () => {
    const storyId = await createPlannedStory();
    await createChapter(storyId, 1);

    const db = getDb(TEST_DB);
    await db.insert(timelineEvents).values({
      storyId,
      chapterNumber: 1,
      eventText: 'An event',
    });
    await db.insert(openThreads).values({
      storyId,
      title: 'A thread',
      openedChapter: 1,
      plannedResolutionChapter: 1,
    });
    await db.insert(canonFacts).values({
      storyId,
      fact: 'A fact',
      sourceChapter: 1,
    });

    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/1`,
    });

    expect(r.statusCode).toBe(204);

    const events = await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.storyId, storyId));
    expect(events).toHaveLength(0);

    const threads = await db
      .select()
      .from(openThreads)
      .where(eq(openThreads.storyId, storyId));
    expect(threads).toHaveLength(1);
    expect(threads[0]!.openedChapter).toBeNull();
    expect(threads[0]!.plannedResolutionChapter).toBeNull();

    const facts = await db
      .select()
      .from(canonFacts)
      .where(eq(canonFacts.storyId, storyId));
    expect(facts).toHaveLength(0);

    await db.delete(stories).where(eq(stories.id, storyId));
  });
});
