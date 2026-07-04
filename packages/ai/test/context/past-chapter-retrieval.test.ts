import { describe, it, expect } from 'vitest';
import { getPastChapterSummariesByEmbedding } from '../../src/context/retrieval.ts';
import type { Db } from '@novel/db';

function mockDb(rows: { chapter_number: number; summary: string }[]) {
  const executed: string[] = [];
  const db = {
    execute: async (query: { queryChunks?: unknown }) => {
      executed.push(JSON.stringify(query));
      return rows;
    },
  } as unknown as Db;
  return { db, executed };
}

describe('getPastChapterSummariesByEmbedding', () => {
  it('returns compact summaries ordered by the DB (vector similarity)', async () => {
    const { db } = mockDb([
      { chapter_number: 42, summary: 'Lam Trạch gặp lão ăn mày' },
      { chapter_number: 7, summary: 'Bí mật huyết mạch hé lộ' },
    ]);
    const result = await getPastChapterSummariesByEmbedding(db, 'story-1', 300, 5, 3, [0.1, 0.2]);
    expect(result).toEqual([
      { chapterNumber: 42, summary: 'Lam Trạch gặp lão ăn mày' },
      { chapterNumber: 7, summary: 'Bí mật huyết mạch hé lộ' },
    ]);
  });

  it('returns [] for an empty embedding without querying', async () => {
    const { db, executed } = mockDb([]);
    const result = await getPastChapterSummariesByEmbedding(db, 'story-1', 300, 5, 3, []);
    expect(result).toEqual([]);
    expect(executed).toHaveLength(0);
  });
});
