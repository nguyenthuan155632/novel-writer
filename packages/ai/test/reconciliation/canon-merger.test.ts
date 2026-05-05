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
        return { returning: async () => [{ id: 'mock-fact-id' }], onConflictDoNothing: async () => undefined };
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
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ knowledgeState: {}, plantedInChapter: 1 }],
        })
      })
    })
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
  factions: [],
};

describe('CanonMerger', () => {
  it('auto-applies clean rows in auto mode', async () => {
    const { db } = mockDb();
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
    const { db } = mockDb();
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
    const { db } = mockDb();
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
    const { db } = mockDb();
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

  it('auto-applies a faction create row in auto mode', async () => {
    const { db, inserts } = mockDb();
    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService() });

    const rows: CanonMergerRow[] = [
      {
        updateType: 'create',
        targetTable: 'factions',
        targetId: null,
        // Mirrors worker.extractorOutputToRows shape: top-level name + spread fields.
        payload: {
          name: 'Hỏa Vân Tông',
          type: 'sect',
          ideology: 'tôn sùng lửa',
          powerLevel: 'mid-tier',
          status: 'active',
          alliances: ['Thiên Kiếm Môn'],
          enemies: [],
        },
      },
    ];

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 7,
      rows,
      seedsResolvedIds: [],
      mode: 'auto',
      traceId: 'trace-faction-create',
    }, CLEAN_SNAPSHOT);

    expect(result.autoAppliedCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(inserts).toContainEqual(expect.objectContaining({
      vals: expect.objectContaining({
        name: 'Hỏa Vân Tông',
        type: 'sect',
        status: 'active',
      }),
    }));
  });

  it('queues a duplicate-faction create as pending with conflict', async () => {
    const { db } = mockDb();
    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService() });

    const snapshot: CanonSnapshot = {
      ...CLEAN_SNAPSHOT,
      factions: [{
        id: '66666666-6666-6666-6666-666666666666',
        name: 'Thiên Kiếm Môn',
        status: 'active',
        type: 'sect',
        lockedFields: [],
      }],
    };

    const rows: CanonMergerRow[] = [{
      updateType: 'create',
      targetTable: 'factions',
      targetId: null,
      payload: { name: 'Thiên Kiếm Môn', type: 'sect' },
    }];

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 8,
      rows,
      seedsResolvedIds: [],
      mode: 'auto',
      traceId: 'trace-faction-dup',
    }, snapshot);

    expect(result.conflicts.some(c => c.type === 'duplicate_fact')).toBe(true);
    expect(result.pendingCount).toBe(1);
    expect(result.autoAppliedCount).toBe(0);
  });

  it('applies a faction status update in auto mode', async () => {
    const { db, updates } = mockDb();
    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService() });

    const snapshot: CanonSnapshot = {
      ...CLEAN_SNAPSHOT,
      factions: [{
        id: '66666666-6666-6666-6666-666666666666',
        name: 'Thiên Kiếm Môn',
        status: 'active',
        type: 'sect',
        lockedFields: [],
      }],
    };

    const rows: CanonMergerRow[] = [{
      updateType: 'update',
      targetTable: 'factions',
      targetId: '66666666-6666-6666-6666-666666666666',
      payload: { name: 'Thiên Kiếm Môn', fields: { status: 'destroyed', notes: 'Bị Hỏa Vân Tông tiêu diệt.' } },
    }];

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 9,
      rows,
      seedsResolvedIds: [],
      mode: 'auto',
      traceId: 'trace-faction-update',
    }, snapshot);

    expect(result.autoAppliedCount).toBe(1);
    expect(result.conflicts).toHaveLength(0);
    expect(updates).toContainEqual(expect.objectContaining({
      vals: expect.objectContaining({ status: 'destroyed' }),
    }));
  });

  it('marks resolved planted seeds as paid off in auto mode', async () => {
    const { db, updates } = mockDb();
    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService() });

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 12,
      rows: [],
      seedsResolvedIds: ['55555555-5555-5555-5555-555555555555'],
      mode: 'auto',
      traceId: 'trace-5',
    }, CLEAN_SNAPSHOT);

    expect(result.autoAppliedCount).toBe(1);
    expect(updates).toContainEqual(expect.objectContaining({
      vals: expect.objectContaining({ status: 'paid_off', paidOffAtChapter: 12 }),
    }));
  });

  // §3.2 — auto-approve low-importance clean rows even in review mode.
  it('auto-applies low-importance clean rows in review mode', async () => {
    const { db } = mockDb();
    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService() });

    const rows: CanonMergerRow[] = [
      {
        updateType: 'create',
        targetTable: 'canon_facts',
        targetId: null,
        payload: { fact: 'Thông tin nhỏ nhặt', importance: 'low', topic: 'Misc' },
      },
      {
        updateType: 'create',
        targetTable: 'canon_facts',
        targetId: null,
        payload: { fact: 'Thông tin quan trọng', importance: 'medium', topic: 'Main' },
      },
    ];

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 6,
      rows,
      seedsResolvedIds: [],
      mode: 'review',
      traceId: 'trace-low',
    }, CLEAN_SNAPSHOT);

    // Low-importance row auto-approved; medium-importance goes to pending.
    expect(result.autoApprovedLowImportanceCount).toBe(1);
    expect(result.pendingCount).toBe(1);
    expect(result.autoAppliedCount).toBe(0);
  });

  // §3.3 — conflict rows get suggestedResolution when provider present.
  it('attaches suggestedResolution to conflict rows when provider present', async () => {
    const { db, inserts } = mockDb();
    const mockProvider = {
      complete: vi.fn(async () => ({
        content: '{"defer_to_chapter": 20}',
        usage: { inputTokens: 10, outputTokens: 5, cachedInputTokens: 0 },
      })),
    } as unknown as import('../../src/providers/types.ts').LLMProvider;

    const merger = new CanonMerger({ db, embeddingService: new MockEmbeddingService(), provider: mockProvider });

    // dead_character_action is easy to trigger: update a dead character's non-status field.
    const deadCharSnapshot: CanonSnapshot = {
      characters: [{
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Lam Trach',
        currentRealm: 'kim đan',
        status: 'dead',
        currentBloodlines: [],
        lockedFields: [],
      }],
      canonFacts: [],
      threads: [],
    };

    const rows: CanonMergerRow[] = [{
      updateType: 'update',
      targetTable: 'characters',
      targetId: '11111111-1111-1111-1111-111111111111',
      payload: { name: 'Lam Trach', fields: { currentRealm: 'kim đan sơ kỳ' }, importance: 'medium' },
    }];

    const result = await merger.submit({
      storyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      chapterId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterNumber: 5,
      rows,
      seedsResolvedIds: [],
      mode: 'auto',
      traceId: 'trace-resolver',
    }, deadCharSnapshot);

    // dead_character_action conflict → row queued to pending with suggestedResolution.
    expect(result.conflicts.some(c => c.type === 'dead_character_action')).toBe(true);
    expect(result.pendingCount).toBe(1);
    // inserts[0].vals is the array passed to .values(); pending rows array.
    const insertedRows = (inserts[0] as { vals: Record<string, unknown>[] })?.vals;
    const firstRow = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;
    expect(firstRow?.suggestedResolution).toEqual({ defer_to_chapter: 20 });
  });
});
