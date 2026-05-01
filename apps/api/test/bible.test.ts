// apps/api/test/bible.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;
process.env.OPENCODE_API_KEY = 'test-key';
process.env.NOVEL_FORCE_MOCK_LLM = '1';

const VALID_BIBLE_V2 = JSON.stringify({
  world_rules: 'A'.repeat(200),
  power_system: 'P'.repeat(200),
  power_system_kind: 'urban',
  style_guide: 'D'.repeat(120),
  forbidden_rules: 'E'.repeat(40),
  ending_direction: 'F'.repeat(60),
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
    expect(bible.worldRules).toMatch(/^A+$/);
    expect(bible.powerSystem).toMatch(/^P+$/);
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
});
