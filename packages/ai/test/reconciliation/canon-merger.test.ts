import { describe, it, expect, vi } from 'vitest';
import { CanonMerger, type CanonMergerRow } from '../../src/reconciliation/canon-merger.ts';
import type { CanonSnapshot } from '../../src/reconciliation/conflict-detector.ts';
import { MockEmbeddingService } from '../../src/embeddings/mock.ts';

function mockDb() {
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  const db = {
    insert: (table: unknown) => ({
      values: (vals: unknown) => {
        inserts.push({ table, vals });
        return { returning: async () => [], onConflictDoNothing: async () => undefined };
      },
    }),
    update: (table: unknown) => ({
      set: (vals: unknown) => ({
        where: (cond: unknown) => {
          updates.push({ table, vals, cond });
          return Promise.resolve(undefined);
        },
      }),
    }),
  } as unknown as import('drizzle-orm/node-postgres').NodePgDatabase<Record<string, never>>;
  return { db, inserts, updates };
}

const CLEAN_SNAPSHOT: CanonSnapshot = {
  characters: [{
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Lam Trach',
    currentRealm: 'kim đan',
    status: 'alive',
    currentBloodlines: ['Hỏa Long'],
    lockedFields: [],
  }],
  canonFacts: [],
  threads: [],
};

describe('CanonMerger', () => {
  it('auto-applies clean rows in auto mode', async () => {
    const { db, inserts, updates } = mockDb();
    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService() });

    const rows: CanonMergerRow[] = [
      {
        updateType: 'create',
        targetTable: 'characters',
        targetId: null,
        payload: { name: 'Mộc Linh', currentRealm: 'luyện khí', status: 'alive', bloodlines: [] },
      },
      {
        updateType: 'create',
        targetTable: 'canon_facts',
        targetId: null,
        payload: { fact: 'Mộc Linh sở hữu Mộc Linh thể', importance: 'medium', topic: 'Huyết mạch' },
      },
      {
        updateType: 'create',
        targetTable: 'timeline_events',
        targetId: null,
        payload: { description: 'Mộc Linh xuất hiện', significance: 'minor' },
      },
    ];

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 5,
      rows,
      seedsResolvedIds: [],
      mode: 'auto',
      traceId: 'trace-1',
    }, CLEAN_SNAPSHOT);

    expect(result.autoAppliedCount).toBe(3);
    expect(result.pendingCount).toBe(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('sends all rows to pending in review mode', async () => {
    const { db, inserts } = mockDb();
    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService() });

    const rows: CanonMergerRow[] = [
      {
        updateType: 'create',
        targetTable: 'characters',
        targetId: null,
        payload: { name: 'Mộc Linh', status: 'alive', bloodlines: [] },
      },
    ];

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 5,
      rows,
      seedsResolvedIds: [],
      mode: 'review',
      traceId: 'trace-2',
    }, CLEAN_SNAPSHOT);

    expect(result.pendingCount).toBe(1);
    expect(result.autoAppliedCount).toBe(0);
  });

  it('detects conflicts and marks rows as conflict', async () => {
    const { db, inserts } = mockDb();
    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService() });

    const lockedSnapshot: CanonSnapshot = {
      characters: [{
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Lam Trach',
        currentRealm: 'kim đan',
        status: 'alive',
        currentBloodlines: ['Hỏa Long'],
        lockedFields: ['currentRealm'],
      }],
      canonFacts: [],
      threads: [],
    };

    const rows: CanonMergerRow[] = [
      {
        updateType: 'update',
        targetTable: 'characters',
        targetId: '11111111-1111-1111-1111-111111111111',
        payload: { name: 'Lam Trach', fields: { currentRealm: 'trúc cơ' } },
      },
    ];

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 5,
      rows,
      seedsResolvedIds: [],
      mode: 'auto',
      traceId: 'trace-3',
    }, lockedSnapshot);

    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0]!.type).toBe('locked_field');
  });

  it('applies thread create and resolve', async () => {
    const { db, inserts, updates } = mockDb();
    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService() });

    const rows: CanonMergerRow[] = [
      {
        updateType: 'create',
        targetTable: 'open_threads',
        targetId: null,
        payload: { title: 'Bí ẩn Hỏa Long', plannedResolutionChapter: 10 },
      },
      {
        updateType: 'resolve',
        targetTable: 'open_threads',
        targetId: '44444444-4444-4444-4444-444444444444',
        payload: { title: 'Thread resolved', resolutionNotes: 'Cliffhanger resolved' },
      },
    ];

    const snapshotWithThread: CanonSnapshot = {
      ...CLEAN_SNAPSHOT,
      threads: [{
        id: '44444444-4444-4444-4444-444444444444',
        title: 'Open thread',
        status: 'open',
      }],
    };

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 5,
      rows,
      seedsResolvedIds: [],
      mode: 'auto',
      traceId: 'trace-4',
    }, snapshotWithThread);

    expect(result.autoAppliedCount).toBe(2);
    expect(result.conflicts).toHaveLength(0);
  });
});
