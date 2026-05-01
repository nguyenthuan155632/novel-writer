// apps/api/test/bible.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;
process.env.OPENCODE_API_KEY = 'test-key';
process.env.NOVEL_FORCE_MOCK_LLM = '1';

const words = (count: number, prefix: string): string =>
  Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(' ') + '.';

const VALID_BIBLE_V2 = JSON.stringify({
  world_rules: words(200, 'world'),
  power_system: words(200, 'power'),
  power_system_kind: 'urban',
  style_guide: words(100, 'style'),
  forbidden_rules: 'E'.repeat(40),
  ending_direction: words(100, 'ending'),
  compact_summary: 'G'.repeat(120),
});
process.env.NOVEL_MOCK_LLM_RESPONSE = VALID_BIBLE_V2;

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });

describe('bible routes', () => {
  it('generates and persists v2 bible (urban, no cultivation fields)', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'BibleTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);

    const gen = await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });
    expect(gen.statusCode).toBe(201);
    const bible = JSON.parse(gen.body);
    expect(bible.worldRules).toMatch(/^world0/);
    expect(bible.powerSystem).toMatch(/^power0/);
    expect(bible.powerSystemKind).toBe('urban');
    expect(bible.cultivationSystem).toBeNull();
    expect(bible.bloodlineSystem).toBeNull();
  });

  it('sets genre_locked_at after successful bible insert', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'LockTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);
    expect(story.genreLockedAt).toBeNull();

    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });

    const refetched = await app.inject({ method: 'GET', url: `/api/stories/${story.id}` });
    const refetchedBody = JSON.parse(refetched.body);
    expect(refetchedBody.genreLockedAt).not.toBeNull();
  });

  it('POST regenerate bumps bible version and makes it the latest bible', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'RegenVersionTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);

    const first = await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });
    expect(first.statusCode).toBe(201);
    expect(JSON.parse(first.body).version).toBe(1);

    const second = await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });
    expect(second.statusCode).toBe(201);
    expect(JSON.parse(second.body).version).toBe(2);

    const latest = await app.inject({ method: 'GET', url: `/api/stories/${story.id}/bible` });
    expect(JSON.parse(latest.body).version).toBe(2);
  });

  it('PUT updates bible and bumps version', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'EditTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);
    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });

    const upd = await app.inject({
      method: 'PUT', url: `/api/stories/${story.id}/bible`,
      payload: { worldRules: 'EDITED'.repeat(20), styleGuide: 'edited-style'.repeat(10) },
    });
    expect(upd.statusCode).toBe(200);
    const updated = JSON.parse(upd.body);
    expect(updated.version).toBe(2);
    expect(updated.worldRules).toMatch(/^(EDITED)+$/);
  });

  it('PUT allows short manual bible field edits', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'ShortEditTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);
    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });

    const upd = await app.inject({
      method: 'PUT', url: `/api/stories/${story.id}/bible`,
      payload: { worldRules: 'short', powerSystem: 'short', styleGuide: 'short' },
    });

    expect(upd.statusCode).toBe(200);
    const updated = JSON.parse(upd.body);
    expect(updated.worldRules).toBe('short');
    expect(updated.powerSystem).toBe('short');
    expect(updated.styleGuide).toBe('short');
  });

  it('PUT treats empty optional legacy system fields as null', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'EmptyLegacyFieldsTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);
    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });

    const upd = await app.inject({
      method: 'PUT', url: `/api/stories/${story.id}/bible`,
      payload: { cultivationSystem: '', bloodlineSystem: '' },
    });

    expect(upd.statusCode).toBe(200);
    const updated = JSON.parse(upd.body);
    expect(updated.cultivationSystem).toBeNull();
    expect(updated.bloodlineSystem).toBeNull();
  });

  it('PUT allows long compactSummary content', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'LongCompactSummaryTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);
    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });

    const compactSummary = 'summary '.repeat(1000);
    const upd = await app.inject({
      method: 'PUT', url: `/api/stories/${story.id}/bible`,
      payload: { compactSummary },
    });

    expect(upd.statusCode).toBe(200);
    const updated = JSON.parse(upd.body);
    expect(updated.compactSummary).toBe(compactSummary);
  });

  it('style few-shots update bumps bible version and becomes the latest bible', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'FewShotVersionTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);
    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });
    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });

    const update = await app.inject({
      method: 'PUT',
      url: `/api/stories/${story.id}/bible/style-few-shots`,
      payload: { fewShots: ['A style example with enough text for the few-shot endpoint.'] },
    });
    expect(update.statusCode).toBe(200);

    const latest = await app.inject({ method: 'GET', url: `/api/stories/${story.id}/bible` });
    const body = JSON.parse(latest.body);
    expect(body.version).toBe(3);
    expect(body.styleFewShots).toEqual([
      { excerpt: 'A style example with enough text for the few-shot endpoint.' },
    ]);
  });
});
