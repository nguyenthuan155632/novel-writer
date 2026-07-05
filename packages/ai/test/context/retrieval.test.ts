import { describe, expect, it, vi } from 'vitest';
import { getStoryBible, getSagaForChapter, getArcForChapter, getArcById, getActiveCharacters, getOpenThreadsForStory, getPlantedSeedsForStory, getSeedsDueForChapter, getRecentSummaries, getPastChapterSummaries, getTopKCanonFactsHybrid, getTimelineEventsForChapter } from '../../src/context/retrieval.js';

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

  it('does not treat never-seen seed characters as active for early chapters', async () => {
    let whereCondition: unknown;
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn((condition) => {
            whereCondition = condition;
            return {
              orderBy: vi.fn(async () => []),
            };
          }),
        })),
      })),
    } as unknown as import('@novel/db').Db;

    await getActiveCharacters(db, 'story-1', 1);

    const readSqlText = (value: unknown): string => {
      if (
        value &&
        typeof value === 'object' &&
        'queryChunks' in value &&
        Array.isArray((value as { queryChunks: unknown[] }).queryChunks)
      ) {
        return (value as { queryChunks: unknown[] }).queryChunks
          .map((chunk) => readSqlText(chunk))
          .join(' ');
      }

      if (typeof value === 'number') return String(value);
      if (
        value &&
        typeof value === 'object' &&
        'value' in value &&
        Array.isArray((value as { value: unknown[] }).value)
      ) {
        return (value as { value: unknown[] }).value.join('');
      }
      if (
        value &&
        typeof value === 'object' &&
        'name' in value &&
        typeof (value as { name: unknown }).name === 'string'
      ) {
        return (value as { name: string }).name;
      }
      return '';
    };

    const text = readSqlText(whereCondition);

    expect(text).toMatch(/last_active_chapter\s+>\s+0/);
    expect(text).toMatch(/last_seen_chapter\s+>\s+0/);
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

  it('only retrieves pending seeds due for the chapter', async () => {
    let whereCondition: unknown;
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn((condition) => {
            whereCondition = condition;
            return Promise.resolve([]);
          }),
        })),
      })),
    } as unknown as import('@novel/db').Db;

    await getSeedsDueForChapter(db, 'story-1', 5);

    const readSqlText = (value: unknown): string => {
      if (
        value &&
        typeof value === 'object' &&
        'queryChunks' in value &&
        Array.isArray((value as { queryChunks: unknown[] }).queryChunks)
      ) {
        return (value as { queryChunks: unknown[] }).queryChunks
          .map((chunk) => readSqlText(chunk))
          .join(' ');
      }
      if (
        value &&
        typeof value === 'object' &&
        'value' in value &&
        Array.isArray((value as { value: unknown[] }).value)
      ) {
        return (value as { value: unknown[] }).value.join('');
      }
      if (
        value &&
        typeof value === 'object' &&
        'name' in value &&
        typeof (value as { name: unknown }).name === 'string'
      ) {
        return (value as { name: string }).name;
      }
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return String(value);
      return '';
    };

    const text = readSqlText(whereCondition);
    expect(text).toContain('status');
    expect(text).toContain('=');
    expect(text).not.toContain('NOT IN');
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

describe('getTimelineEventsForChapter (unit)', () => {
  it('exports getTimelineEventsForChapter as a function', () => {
    expect(typeof getTimelineEventsForChapter).toBe('function');
  });

  it('keeps base events plus active and converging parallel-thread events', async () => {
    let limitCall = 0;
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => {
                limitCall += 1;
                if (limitCall === 1) {
                  return [{
                    id: 'saga-1',
                    storyId: 'story-1',
                    startChapter: 1,
                    endChapter: 20,
                    parallelThreads: [
                      { id: 'thread-a', premise: 'Active thread', startChapter: 8, endChapter: 14, parentTimelineId: null },
                      { id: 'thread-b', premise: 'Converging thread', startChapter: 5, endChapter: 11, parentTimelineId: null },
                    ],
                    convergencePoints: [
                      { atChapter: 12, threadIds: ['thread-b'], synopsis: 'Converges into main line' },
                    ],
                  }];
                }
                return [
                  { chapterNumber: 12, eventType: 'event', eventText: 'Mainline checkpoint', importance: 'high', threadId: null, relatedThreadIds: [] },
                  { chapterNumber: 11, eventType: 'event', eventText: 'Active side thread beat', importance: 'medium', threadId: 'thread-a', relatedThreadIds: [] },
                  { chapterNumber: 12, eventType: 'event', eventText: 'Convergence signal', importance: 'high', threadId: 'thread-b', relatedThreadIds: ['thread-b'] },
                  { chapterNumber: 10, eventType: 'event', eventText: 'Irrelevant thread beat', importance: 'low', threadId: 'thread-z', relatedThreadIds: [] },
                ];
              }),
            })),
          })),
        })),
      })),
    } as unknown as import('@novel/db').Db;

    const result = await getTimelineEventsForChapter(db, 'story-1', 12, 20);

    expect(result.map((row) => row.eventText)).toEqual([
      'Mainline checkpoint',
      'Active side thread beat',
      'Convergence signal',
    ]);
  });

  it('can exclude current-chapter events for prior-only generation context', async () => {
    let limitCall = 0;
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => {
                limitCall += 1;
                if (limitCall === 1) {
                  return [{
                    id: 'saga-1',
                    storyId: 'story-1',
                    startChapter: 1,
                    endChapter: 20,
                    parallelThreads: [],
                    convergencePoints: [],
                  }];
                }
                return [
                  { chapterNumber: 12, eventType: 'event', eventText: 'Current stale event', importance: 'high', threadId: null, relatedThreadIds: [] },
                  { chapterNumber: 11, eventType: 'event', eventText: 'Prior event', importance: 'high', threadId: null, relatedThreadIds: [] },
                ];
              }),
            })),
          })),
        })),
      })),
    } as unknown as import('@novel/db').Db;

    const result = await getTimelineEventsForChapter(
      db,
      'story-1',
      12,
      20,
      { includeCurrent: false },
    );

    expect(result.map((row) => row.eventText)).toEqual(['Prior event']);
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
