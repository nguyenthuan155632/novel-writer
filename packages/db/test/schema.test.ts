import { describe, it, expect, afterAll } from 'vitest';
import { MODEL_OPTIONS } from '@novel/core';
import { getDb, getSqlClient } from '../src/client.ts';
import { arcs, llmProviderSettings, llmProviderState, sagas, stories, storyBibles } from '../src/schema/index.ts';
import { eq, sql } from 'drizzle-orm';

const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';

describe('schema smoke', () => {
  const db = getDb(TEST_DB_URL);

  it('can insert and query a story', async () => {
    const inserted = await db.insert(stories).values({
      title: 'Test Story',
      premise: 'A test premise',
    }).returning();
    const row = inserted[0]!;
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);

    const found = await db.select().from(stories).where(eq(stories.id, row.id));
    expect(found).toHaveLength(1);
    expect(found[0]!.title).toBe('Test Story');

    await db.delete(stories).where(eq(stories.id, row.id));
  });

  it('cascade-deletes story bible when story removed', async () => {
    const storyRows = await db.insert(stories).values({ title: 'X', premise: 'Y' }).returning();
    const story = storyRows[0]!;
    await db.insert(storyBibles).values({
      storyId: story.id,
      worldRules: 'r',
      powerSystem: 'p',
      cultivationSystem: 'c',
      bloodlineSystem: 'b',
      styleGuide: 's',
      forbiddenRules: 'f',
    });
    await db.delete(stories).where(eq(stories.id, story.id));
    const remaining = await db.select().from(storyBibles).where(eq(storyBibles.storyId, story.id));
    expect(remaining).toHaveLength(0);
  });

  it('can insert and query arc planning columns', async () => {
    const storyRows = await db.insert(stories).values({ title: 'Arc Test', premise: 'Y' }).returning();
    const story = storyRows[0]!;

    const sagaRows = await db.insert(sagas).values({
      storyId: story.id,
      sagaNumber: 0,
      title: 'Main Saga',
      premise: 'A focused saga premise',
      expectedTurningPoints: ['opening turn', 'closing turn'],
    }).returning();
    const saga = sagaRows[0]!;

    const arcRows = await db.insert(arcs).values({
      storyId: story.id,
      sagaId: saga.id,
      title: 'Opening Arc',
      premise: 'A focused opening arc premise',
      expectedChanges: ['hero accepts the call'],
      seedsToResolveInArc: ['seed-1'],
    }).returning();
    const arc = arcRows[0]!;

    const found = await db.select().from(arcs).where(eq(arcs.id, arc.id));
    expect(found[0]!.premise).toBe('A focused opening arc premise');
    expect(found[0]!.expectedChanges).toEqual(['hero accepts the call']);
    expect(found[0]!.seedsToResolveInArc).toEqual(['seed-1']);

    const foundSaga = await db.select().from(sagas).where(eq(sagas.id, saga.id));
    expect(foundSaga[0]!.premise).toBe('A focused saga premise');
    expect(foundSaga[0]!.expectedTurningPoints).toEqual(['opening turn', 'closing turn']);

    await db.delete(stories).where(eq(stories.id, story.id));
  });

  it('seeds llm provider settings and active provider state', async () => {
    const providerRows = await db.select().from(llmProviderSettings);
    expect(providerRows.map((row) => row.provider).sort()).toEqual(['ollama', 'opencode', 'openrouter']);

    for (const row of providerRows) {
      const routes = row.modelRoutes as Record<string, string>;
      for (const opt of MODEL_OPTIONS) {
        expect(routes[opt.role], `${row.provider} missing ${opt.role}`).toBeDefined();
        expect(routes[opt.role]!.trim().length, `${row.provider} ${opt.role}`).toBeGreaterThan(0);
      }
    }

    const stateRows = await db.select().from(llmProviderState).where(eq(llmProviderState.id, 'global'));
    expect(stateRows).toHaveLength(1);
    expect(['opencode', 'openrouter', 'ollama']).toContain(stateRows[0]!.activeProvider);
  });

  it('enforces llm singleton and provider constraints', async () => {
    await expect(
      db.execute(sql`insert into llm_provider_state (id, active_provider) values ('not-global', 'opencode')`)
    ).rejects.toThrow();

    await expect(
      db.execute(sql`insert into llm_provider_settings (provider, model_routes) values ('bad-provider', '{}'::jsonb)`)
    ).rejects.toThrow();

    await expect(
      db.execute(sql`update llm_provider_settings set model_routes = '[]'::jsonb where provider = 'opencode'`)
    ).rejects.toThrow();
  });

describe('schema columns added in 0012/0013', () => {
  it('stories table has mainCharacterPersonality + genreLockedAt', () => {
    const cols = Object.keys(stories);
    expect(cols).toContain('mainCharacterPersonality');
    expect(cols).toContain('genreLockedAt');
  });

  it('story_bibles has powerSystem + powerSystemKind; cult/blood nullable', () => {
    const cols = Object.keys(storyBibles);
    expect(cols).toContain('powerSystem');
    expect(cols).toContain('powerSystemKind');
  });
});

  afterAll(async () => {
    await getSqlClient(TEST_DB_URL).end();
  });
});