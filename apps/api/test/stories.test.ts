import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '@novel/db';
import { stories } from '@novel/db/schema';
import { buildServer } from '../src/server.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });

describe('stories routes', () => {
  it('creates and lists stories', async () => {
    const create = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'T', premise: 'A'.repeat(50), genre: 'tien_hiep', targetChapterCount: 100 },
    });
    expect(create.statusCode).toBe(201);
    const created = JSON.parse(create.body);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);

    const list = await app.inject({ method: 'GET', url: '/api/stories' });
    expect(list.statusCode).toBe(200);
    const storiesList = JSON.parse(list.body);
    expect(storiesList.find((s: { id: string }) => s.id === created.id)).toBeDefined();

    const one = await app.inject({ method: 'GET', url: `/api/stories/${created.id}` });
    expect(one.statusCode).toBe(200);
    expect(JSON.parse(one.body).title).toBe('T');
  });

  it('rejects missing premise with 400', async () => {
    const r = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'X' },
    });
    expect(r.statusCode).toBe(400);
  });
});

describe('POST /api/stories with catalog validation', () => {
  it('rejects unknown genre slug', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 't', premise: 'p'.repeat(25), genre: 'xianxia_fantasy' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('defaults genre to tien_hiep and personality to tram_on', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 't', premise: 'p'.repeat(25) },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.genre).toBe('tien_hiep');
    expect(body.mainCharacterPersonality).toBe('tram_on');
  });

  it('persists storyOptions into story_settings.overrides', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: {
        title: 't', premise: 'p'.repeat(25),
        genre: 'do_thi', mainCharacterPersonality: 'cunning_pragmatic',
        storyOptions: { tone: 'serious', pov: 'first', worldEra: 'modern' },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    const settingsRes = await app.inject({ method: 'GET', url: `/api/stories/${body.id}/settings` });
    const settings = JSON.parse(settingsRes.body);
    expect(settings.overrides.storyOptions.tone).toBe('serious');
    expect(settings.overrides.storyOptions.pov).toBe('first');
  });
});

describe('PATCH /api/stories/:id', () => {
  async function createStoryHelper(payload: Record<string, unknown>): Promise<{ id: string }> {
    const res = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 't', premise: 'p'.repeat(25), ...payload },
    });
    return JSON.parse(res.body);
  }

  it('updates personality and storyOptions', async () => {
    const story = await createStoryHelper({ genre: 'do_thi' });
    const res = await app.inject({
      method: 'PATCH', url: `/api/stories/${story.id}`,
      payload: { mainCharacterPersonality: 'humorous_slick', storyOptions: { tone: 'humorous' } },
    });
    expect(res.statusCode).toBe(200);
    const refetched = await app.inject({ method: 'GET', url: `/api/stories/${story.id}` });
    expect(JSON.parse(refetched.body).mainCharacterPersonality).toBe('humorous_slick');
  });

  it('returns 409 when changing genre after bible is locked', async () => {
    const story = await createStoryHelper({ genre: 'tien_hiep' });
    await getDb().update(stories).set({ genreLockedAt: new Date() }).where(eq(stories.id, story.id));

    const res = await app.inject({
      method: 'PATCH', url: `/api/stories/${story.id}`,
      payload: { genre: 'do_thi' },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toBe('genre_locked');
  });

  it('allows genre change when not locked', async () => {
    const story = await createStoryHelper({ genre: 'tien_hiep' });
    const res = await app.inject({
      method: 'PATCH', url: `/api/stories/${story.id}`,
      payload: { genre: 'do_thi' },
    });
    expect(res.statusCode).toBe(200);
  });
});