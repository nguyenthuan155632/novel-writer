import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { buildServer } from '../src/server.ts';

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });

describe('GET /health', () => {
  it('returns ok', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body).status).toBe('ok');
  });
});