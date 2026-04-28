import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
      payload: { title: 'T', premise: 'A'.repeat(50), genre: 'xianxia_fantasy', targetChapterCount: 100 },
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