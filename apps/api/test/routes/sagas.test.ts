import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildServer } from '../../src/server.ts';
import { getDb } from '@novel/db';
import { stories, storyBibles } from '@novel/db/schema';
import { eq } from 'drizzle-orm';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;
process.env.NOVEL_FORCE_MOCK_LLM = '1';

const mocks = vi.hoisted(() => ({
  plan: vi.fn(),
  persist: vi.fn(),
}));

vi.mock('@novel/ai', async () => {
  const actual = await vi.importActual<typeof import('@novel/ai')>('@novel/ai');
  return {
    ...actual,
    loadStoryDomainContext: vi.fn().mockResolvedValue({
      genreDef: { slug: 'do_thi', viLabel: 'Đô thị', viDescription: '', family: 'urban', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] },
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] },
      storyOptions: {},
      genreFamily: 'urban',
    }),
    SagaPlannerAgent: vi.fn().mockImplementation(() => ({
      plan: mocks.plan,
      persist: mocks.persist,
    })),
  };
});

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });
beforeEach(() => {
  mocks.plan.mockReset();
  mocks.plan.mockResolvedValue({
    output: { sagas: [], plantedSeeds: [] },
    promptVersion: 'test',
    usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
  });
  mocks.persist.mockReset();
  mocks.persist.mockResolvedValue({ sagasUpserted: 0, seedsUpserted: 0 });
});

describe('sagas routes', () => {
  it('plans sagas from the latest bible version', async () => {
    const db = getDb(TEST_DB);
    const storyId = randomUUID();
    await db.insert(stories).values({
      id: storyId,
      title: 'Latest Bible Saga Test',
      premise: 'A story premise for latest bible saga planning.',
    });
    await db.insert(storyBibles).values({
      storyId,
      version: 1,
      worldRules: 'old world',
      powerSystem: 'old power',
      powerSystemKind: 'urban',
      styleGuide: 'old style',
      forbiddenRules: 'old forbidden',
      compactSummary: 'old compact summary',
    });
    await db.insert(storyBibles).values({
      storyId,
      version: 2,
      worldRules: 'latest world',
      powerSystem: 'latest power',
      powerSystemKind: 'urban',
      styleGuide: 'latest style',
      forbiddenRules: 'latest forbidden',
      compactSummary: 'latest compact summary',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/sagas/plan`,
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(mocks.plan).toHaveBeenCalledWith(expect.objectContaining({
      storyId,
      bibleCompact: 'latest compact summary',
    }));

    await db.delete(stories).where(eq(stories.id, storyId));
  });
});
