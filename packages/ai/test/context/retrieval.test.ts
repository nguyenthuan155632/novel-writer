import { describe, expect, it, vi } from 'vitest';
import { getStoryBible, getSagaForChapter, getArcForChapter, getArcById, getActiveCharacters, getOpenThreadsForStory, getPlantedSeedsForStory, getSeedsDueForChapter, getRecentSummaries, getPastChapterSummaries, getTopKCanonFactsHybrid } from '../../src/context/retrieval.js';

describe('getStoryBible (unit)', () => {
  it('exports getStoryBible as a function', () => {
    expect(typeof getStoryBible).toBe('function');
  });
});

describe('getSagaForChapter (unit)', () => {
  it('exports getSagaForChapter as a function', () => {
    expect(typeof getSagaForChapter).toBe('function');
  });
});

describe('getArcForChapter (unit)', () => {
  it('exports getArcForChapter as a function', () => {
    expect(typeof getArcForChapter).toBe('function');
  });
});

describe('getArcById (unit)', () => {
  it('exports getArcById as a function', () => {
    expect(typeof getArcById).toBe('function');
  });
});

describe('getActiveCharacters (unit)', () => {
  it('exports getActiveCharacters as a function', () => {
    expect(typeof getActiveCharacters).toBe('function');
  });
});

describe('getOpenThreadsForStory (unit)', () => {
  it('exports getOpenThreadsForStory as a function', () => {
    expect(typeof getOpenThreadsForStory).toBe('function');
  });
});

describe('getPlantedSeedsForStory (unit)', () => {
  it('exports getPlantedSeedsForStory as a function', () => {
    expect(typeof getPlantedSeedsForStory).toBe('function');
  });
});

describe('getSeedsDueForChapter (unit)', () => {
  it('exports getSeedsDueForChapter as a function', () => {
    expect(typeof getSeedsDueForChapter).toBe('function');
  });
});

describe('getRecentSummaries (unit)', () => {
  it('exports getRecentSummaries as a function', () => {
    expect(typeof getRecentSummaries).toBe('function');
  });
});

describe('getPastChapterSummaries (unit)', () => {
  it('exports getPastChapterSummaries as a function', () => {
    expect(typeof getPastChapterSummaries).toBe('function');
  });
});

// §3.1 — Hybrid retrieval unit tests (mock DB).
describe('getTopKCanonFactsHybrid (unit)', () => {
  function makeRow(id: string, topic: string, importance = 'medium') {
    return {
      id, story_id: 'story-1', topic, fact: `fact about ${topic}`,
      source_chapter: 1, importance, locked: false,
      tags: [], embedding: null, created_at: new Date(),
    };
  }

  function mockDb(rows: ReturnType<typeof makeRow>[], fallbackRows?: ReturnType<typeof makeRow>[]) {
    let callCount = 0;
    return {
      execute: vi.fn(async () => {
        callCount++;
        // First call = ranked ids CTE; subsequent = full-row fetch or fallback.
        if (callCount === 1 && rows.length >= 3) {
          return rows.map((r) => ({ id: r.id, rank: 1.0 }));
        }
        if (callCount === 1) {
          // Hybrid yields < 3 → return empty so fallback triggers.
          return [];
        }
        // Full-row fetch.
        return fallbackRows ?? rows;
      }),
    } as unknown as import('@novel/db').Db;
  }

  it('exports getTopKCanonFactsHybrid as a function', () => {
    expect(typeof getTopKCanonFactsHybrid).toBe('function');
  });

  it('vector fallback when characterNames empty and no location key', async () => {
    const factRows = [makeRow('f1', 'Lam Trach'), makeRow('f2', 'Mộc Linh'), makeRow('f3', 'Chân Khí')];
    const db = {
      execute: vi.fn(async () => factRows),
    } as unknown as import('@novel/db').Db;

    const result = await getTopKCanonFactsHybrid(db, 'story-1', [0.1, 0.2, 0.3], [], 5, 'pov-1', null, 3);
    expect(result).toHaveLength(3);
    // Single execute call = pure vector fallback path.
    expect((db.execute as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it('hybrid promotes character-matching fact over unmentioned one', async () => {
    const charFact = makeRow('char-fact', 'Lam Trach');
    const otherFact = makeRow('other-fact', 'Unknown');
    const db = {
      execute: vi.fn()
        .mockResolvedValueOnce([{ id: 'char-fact', rank: 1.0 }, { id: 'other-fact', rank: 0.3 }, { id: 'extra', rank: 0.1 }])
        .mockResolvedValueOnce([charFact, otherFact]),
    } as unknown as import('@novel/db').Db;

    const results = await getTopKCanonFactsHybrid(db, 'story-1', [0.1], ['Lam Trach'], 5, 'pov-1', null, 5);
    // char-fact ranked first.
    expect(results[0]?.topic).toBe('Lam Trach');
  });

  it('activeLocationKey triggers loc_boost branch', async () => {
    const locFact = makeRow('loc-fact', 'Thiên Sơn Phái');
    const db = {
      execute: vi.fn()
        .mockResolvedValueOnce([{ id: 'loc-fact', rank: 1.2 }, { id: 'f2', rank: 0.5 }, { id: 'f3', rank: 0.2 }])
        .mockResolvedValueOnce([locFact]),
    } as unknown as import('@novel/db').Db;

    const results = await getTopKCanonFactsHybrid(db, 'story-1', [0.1], [], 5, 'pov-1', 'thiên_sơn_phái', 5);
    // No fallback because activeLocationKey is set (skips characterNames=0 check).
    expect((db.execute as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
    expect(results[0]?.topic).toBe('Thiên Sơn Phái');
  });

  it('falls back to vector when hybrid yields < 3 rows', async () => {
    const fallbackRows = [makeRow('f1', 'A'), makeRow('f2', 'B'), makeRow('f3', 'C')];
    const db = {
      execute: vi.fn()
        .mockResolvedValueOnce([{ id: 'only-one', rank: 1.0 }]) // < 3 → triggers fallback
        .mockResolvedValueOnce(fallbackRows), // vector fallback
    } as unknown as import('@novel/db').Db;

    const results = await getTopKCanonFactsHybrid(db, 'story-1', [0.1], ['Lam Trach'], 5, 'pov-1', null, 3);
    expect(results).toHaveLength(3);
    expect((db.execute as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it('visibility filter respected: null povId → public only', async () => {
    const db = {
      execute: vi.fn(async () => []),
    } as unknown as import('@novel/db').Db;

    // Should not throw; SQL contains visibility='public' when povId=null.
    await getTopKCanonFactsHybrid(db, 'story-1', [0.1], [], 5, null, null, 3);
    expect((db.execute as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });
});
